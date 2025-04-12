(function(){
    // Ensure an active comp and selected layers exist.
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return;
    
    app.beginUndoGroup("Apply Pin Position Expression");

    // Updated expression using two sliders instead of a point control.
    var expr = 
    'var pinPoint = effect("Pin Position")("Menu").value;\n' +
    'var padX = effect("Padding X")("Slider").value;\n' +
    'var padY = effect("Padding Y")("Slider").value;\n' +
    'var usePercent = effect("Percent Based")("Checkbox").value;\n' +
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
        
        // Remove any existing "Pin Position" control.
        var pinPos = effects.property("Pin Position");
        if (pinPos) pinPos.remove();
        
        // Add a new Dropdown Control for Pin Position.
        pinPos = effects.addProperty("ADBE Dropdown Control");
        var dp = pinPos.property(1).setPropertyParameters([
            "Top Left", "Top Center", "Top Right",
            "Middle Left", "Middle Center", "Middle Right",
            "Bottom Left", "Bottom Center", "Bottom Right"
        ]);
        dp.propertyGroup(1).name = "Pin Position";

        // Remove the old Padding point control and add two slider controls instead.
        var padXCtrl = effects.property("Padding X");
        if (!padXCtrl){
            padXCtrl = effects.addProperty("ADBE Slider Control");
            padXCtrl.name = "Padding X";
        }
        padXCtrl.property("Slider").setValue(0);
        
        var padYCtrl = effects.property("Padding Y");
        if (!padYCtrl){
            padYCtrl = effects.addProperty("ADBE Slider Control");
            padYCtrl.name = "Padding Y";
        }
        padYCtrl.property("Slider").setValue(0);
        
        // Add or update the Percent Based checkbox.
        var pctCtrl = effects.property("Percent Based");
        if (!pctCtrl){
            pctCtrl = effects.addProperty("ADBE Checkbox Control");
            pctCtrl.name = "Percent Based";
        }
        pctCtrl.property("Checkbox").setValue(0);
        
        // Apply the expression to the Position property.
        layer.property("ADBE Transform Group").property("ADBE Position").expression = expr;
    }

    app.endUndoGroup();
})();
