(function(){
    // Ensure an active comp and selected layers exist.
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) { 
        alert("Please select an active comp."); 
        return; 
    }
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) { 
        alert("Please select one or more layers."); 
        return; 
    }
    
    app.beginUndoGroup("Apply Pin-to-Target Expression (Target Scale Included)");

    // Expression:
    // This expression pins the current layer's position to a chosen corner of a target layer.
    // It uses target.toComp() on the corners of the target's sourceRectAtTime, which automatically
    // takes into account the target layer's transform (including scaling, rotation, etc.).
    // Controls:
    //   "Pin Position" (Dropdown Menu): selects which corner (1-9).
    //   "Padding" (Point Control): separate X and Y offsets.
    //   "Percent Based" (Checkbox): if 1, padding is interpreted as a percentage of the target's dimensions.
    //   "Target Layer" (Layer Control): the layer to which the current layer is pinned.
    var expr =
    'var pinPoint = effect("Pin Position")("Menu").value;\n' +
    'var pad = effect("Padding")("Point").value;\n' +
    'var usePercent = effect("Percent Based")("Checkbox").value;\n' +
    'var target = effect("Target Layer")("Layer");\n' +
    'if (target == null) { value; } else {\n' +
    '    var tRect = target.sourceRectAtTime(time, false);\n' +
    '    var topLeft = target.toComp([tRect.left, tRect.top]);\n' +
    '    var topCenter = target.toComp([tRect.left + tRect.width/2, tRect.top]);\n' +
    '    var topRight = target.toComp([tRect.left + tRect.width, tRect.top]);\n' +
    '    var middleLeft = target.toComp([tRect.left, tRect.top + tRect.height/2]);\n' +
    '    var middleCenter = target.toComp([tRect.left + tRect.width/2, tRect.top + tRect.height/2]);\n' +
    '    var middleRight = target.toComp([tRect.left + tRect.width, tRect.top + tRect.height/2]);\n' +
    '    var bottomLeft = target.toComp([tRect.left, tRect.top + tRect.height]);\n' +
    '    var bottomCenter = target.toComp([tRect.left + tRect.width/2, tRect.top + tRect.height]);\n' +
    '    var bottomRight = target.toComp([tRect.left + tRect.width, tRect.top + tRect.height]);\n' +
    '    var corners = [topLeft, topCenter, topRight, middleLeft, middleCenter, middleRight, bottomLeft, bottomCenter, bottomRight];\n' +
    '    var basePos = corners[Math.round(pinPoint)-1];\n' +
    '    var paddingCalc = (usePercent==1) ? [ tRect.width*(pad[0]/100), tRect.height*(pad[1]/100) ] : pad;\n' +
    '    basePos + paddingCalc;\n' +
    '}';

    for (var i = 0; i < selectedLayers.length; i++){
        var layer = selectedLayers[i];
        var effects = layer.property("ADBE Effect Parade");
        
        // Remove any existing "Pin Position" control.
        var pinPosCtrl = effects.property("Pin Position");
        if (pinPosCtrl) { pinPosCtrl.remove(); }
        // Add new Dropdown Control for "Pin Position".
        pinPosCtrl = effects.addProperty("ADBE Dropdown Control");
        // Rename its parameter group to "Pin Position" using a workaround.
        var dp = pinPosCtrl.property(1).setPropertyParameters([
            "Top Left", "Top Center", "Top Right",
            "Middle Left", "Middle Center", "Middle Right",
            "Bottom Left", "Bottom Center", "Bottom Right"
        ]);
        dp.propertyGroup(1).name = "Pin Position";
        
        // Add or retrieve the "Padding" point control.
        var padCtrl = effects.property("Padding");
        if (!padCtrl){
            padCtrl = effects.addProperty("ADBE Point Control");
            padCtrl.name = "Padding";
        }
        padCtrl.property("Point").setValue([0, 0]);
        
        // Add or retrieve the "Percent Based" checkbox control.
        var percentCtrl = effects.property("Percent Based");
        if (!percentCtrl){
            percentCtrl = effects.addProperty("ADBE Checkbox Control");
            percentCtrl.name = "Percent Based";
        }
        percentCtrl.property("Checkbox").setValue(0);
        
        // Add or retrieve the "Target Layer" layer control.
        var targetCtrl = effects.property("Target Layer");
        if (!targetCtrl){
            targetCtrl = effects.addProperty("ADBE Layer Control");
            targetCtrl.name = "Target Layer";
        }
        
        // Apply the expression to the Position property.
        var posProp = layer.property("ADBE Transform Group").property("ADBE Position");
        posProp.expression = expr;
    }
    
    app.endUndoGroup();
})();
