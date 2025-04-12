(function(){
    // Define your unique ID in one place.
    var id = "[AS1]";
    
    // Ensure an active comp and selected layers exist.
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return;
    
    app.beginUndoGroup("Apply " + id + " Pin Position Expression");

    // Embed the configuration in a comment.
    // Here we specify that:
    //   • "Pin Position" is a dropdown with options,
    //   • "Padding X" and "Padding Y" are sliders (min 0 and max 100),
    //   • "Percent Based" is a checkbox.
    var configJSON = '{"controls": {' +
      '"Pin Position": {"type": "dropdown", "options": [' +
           '"Top Left", "Top Center", "Top Right", ' +
           '"Middle Left", "Middle Center", "Middle Right", ' +
           '"Bottom Left", "Bottom Center", "Bottom Right"]},' +
      '"Padding X": {"type": "slider", "min": 0, "max": 100},' +
      '"Padding Y": {"type": "slider", "min": 0, "max": 100},' +
      '"Percent Based": {"type": "checkbox"}' +
    '}}';

    var expr = 
    '/* ' + id + ' config: ' + configJSON + ' */\n' +
    'var pinPoint = effect("' + id + ' Pin Position")("Menu").value;\n' +
    'var padX = effect("' + id + ' Padding X")("Slider").value;\n' +
    'var padY = effect("' + id + ' Padding Y")("Slider").value;\n' +
    'var usePercent = effect("' + id + ' Percent Based")("Checkbox").value;\n' +
    'var compSize = [thisComp.width, thisComp.height];\n' +
    'var rect = thisLayer.sourceRectAtTime(time, false);\n' +
    'var layerSize = [rect.width, rect.height];\n' +
    'var scaleArr = thisLayer.scale/100;\n' +
    'var scaledLayerSize = [layerSize[0]*scaleArr[0], layerSize[1]*scaleArr[1]];\n' +
    'var anchorOffset = [(thisLayer.anchorPoint[0]-rect.left)*scaleArr[0], (thisLayer.anchorPoint[1]-rect.top)*scaleArr[1]];\n' +
    'var paddingCalc = (usePercent==1) ? [compSize[0]*(padX/100), compSize[1]*(padY/100)] : [padX, padY];\n' +
    'var hAlignIndex = (pinPoint-1) % 3;\n' +
    'var vAlignIndex = Math.floor((pinPoint-1)/3);\n' +
    'var alignFactors = [hAlignIndex/2, vAlignIndex/2];\n' +
    'var desiredPos = [ alignFactors[0]*(compSize[0]-scaledLayerSize[0]) + (1-2*alignFactors[0])*paddingCalc[0],\n' +
    '                   alignFactors[1]*(compSize[1]-scaledLayerSize[1]) + (1-2*alignFactors[1])*paddingCalc[1] ];\n' +
    '[desiredPos[0]+anchorOffset[0], desiredPos[1]+anchorOffset[1]];';

    for (var i = 0; i < selectedLayers.length; i++){
        var layer = selectedLayers[i];
        var effects = layer.property("ADBE Effect Parade");
        
        // Remove any existing controls with the same ID.
        var ppNames = [id + " Pin Position", id + " Padding X", id + " Padding Y", id + " Percent Based"];
        for (var k = 0; k < ppNames.length; k++){
            var ctrl = effects.property(ppNames[k]);
            if (ctrl) { ctrl.remove(); }
        }
        
        // Add a Dropdown Control for Pin Position.
        var pinPos = effects.addProperty("ADBE Dropdown Control");
        // Set the menu items using setPropertyParameters.
        var dp = pinPos.property(1).setPropertyParameters([
            "Top Left", "Top Center", "Top Right",
            "Middle Left", "Middle Center", "Middle Right",
            "Bottom Left", "Bottom Center", "Bottom Right"
        ]);
        // Set the control's display name.
        dp.propertyGroup(1).name = id + " Pin Position";

        // Add Slider Controls for Padding X and Padding Y.
        var padXCtrl = effects.addProperty("ADBE Slider Control");
        padXCtrl.name = id + " Padding X";
        padXCtrl.property("Slider").setValue(0);
        
        var padYCtrl = effects.addProperty("ADBE Slider Control");
        padYCtrl.name = id + " Padding Y";
        padYCtrl.property("Slider").setValue(0);
        
        // Add a Checkbox Control for Percent Based.
        var pctCtrl = effects.addProperty("ADBE Checkbox Control");
        pctCtrl.name = id + " Percent Based";
        pctCtrl.property("Checkbox").setValue(0);
        
        // Apply the expression (with the embedded config comment) to the Position property.
        layer.property("ADBE Transform Group").property("ADBE Position").expression = expr;
    }

    app.endUndoGroup();
})();
