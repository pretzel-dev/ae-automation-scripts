(function(){
    // Helper function for indexOf (for older ExtendScript versions)
    function arrayIndexOf(arr, item) {
        for (var i = 0; i < arr.length; i++){
            if (arr[i] === item) return i;
        }
        return -1;
    }
    
    // Get active comp.
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Please select an active comp.");
        return;
    }
    
    // Get selected properties.
    var selProps = comp.selectedProperties;
    if (selProps.length === 0) {
        alert("Please select one or more properties with keyframes.");
        return;
    }
    
    app.beginUndoGroup("Apply Combined Retiming Expression");

    // Combined retiming expression with four modes:
    // 1: Comp End
    // 2: Comp Stretched
    // 3: Layer End
    // 4: Layer Stretched
    var expr = 
    'var mode = effect("Retiming Mode")("Menu").value;\n' +
    'if (mode == 1) {\n' +
    '    // Comp End: Animation always plays at the end of the comp\n' +
    '    var dur = thisComp.duration;\n' +
    '    var lastKeyTime = thisProperty.key(thisProperty.numKeys).time;\n' +
    '    valueAtTime(time - dur + lastKeyTime);\n' +
    '} else if (mode == 2) {\n' +
    '    // Comp Stretched: Remap time over the comp duration\n' +
    '    var firstKeyTime = thisProperty.key(1).time;\n' +
    '    var lastKeyTime = thisProperty.key(thisProperty.numKeys).time;\n' +
    '    var t = linear(time, 0, thisComp.duration, firstKeyTime, lastKeyTime);\n' +
    '    valueAtTime(t);\n' +
    '} else if (mode == 3) {\n' +
    '    // Layer End: Animation always plays at the end of the layer\n' +
    '    var dur = thisLayer.outPoint - thisLayer.inPoint;\n' +
    '    var lastKeyTime = thisProperty.key(thisProperty.numKeys).time;\n' +
    '    valueAtTime(time - dur + lastKeyTime);\n' +
    '} else if (mode == 4) {\n' +
    '    // Layer Stretched: Remap time over the layer duration\n' +
    '    var firstKeyTime = thisProperty.key(1).time;\n' +
    '    var lastKeyTime = thisProperty.key(thisProperty.numKeys).time;\n' +
    '    var t = linear(time, thisLayer.inPoint, thisLayer.outPoint, firstKeyTime, lastKeyTime);\n' +
    '    valueAtTime(t);\n' +
    '} else {\n' +
    '    value;\n' +
    '}';
    
    // Array to track processed layers so we add the control only once per layer.
    var processedLayers = [];
    
    // Loop through selected properties.
    for (var i = 0; i < selProps.length; i++){
        var prop = selProps[i];
        if (!prop.canSetExpression) continue;
        if (prop.numKeys < 1) continue;
        
        // Get owning layer (top-level property group).
        var layer = prop.propertyGroup(prop.propertyDepth);
        if (!layer) continue;
        
        // Add the "Retiming Mode" control only once per layer.
        if (arrayIndexOf(processedLayers, layer) === -1) {
            var effects = layer.property("ADBE Effect Parade");
            if (effects) {
                var retimeCtrl = effects.property("Retiming Mode");
                if (!retimeCtrl) {
                    retimeCtrl = effects.addProperty("ADBE Dropdown Control");
                    // Set dropdown items to 4 options.
                    var temp = retimeCtrl.property(1).setPropertyParameters(["Comp End", "Comp Stretched", "Layer End", "Layer Stretched"]);
                    // Rename parameter group to "Retiming Mode" so that the expression can reference it.
                    temp.propertyGroup(1).name = "Retiming Mode";
                    // Optionally set default value; default to option 1.
                    try {
                        var dm = retimeCtrl.property("Menu") || retimeCtrl.property(1);
                        dm.setValue(1);
                    } catch(e){}
                }
            }
            processedLayers.push(layer);
        }
        
        // If the property already has an expression, prepend our retiming expression.
        if (prop.expression !== "") {
            prop.expression = expr + "\n" + prop.expression;
        } else {
            prop.expression = expr;
        }
    }
    
    app.endUndoGroup();
})();
