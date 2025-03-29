(function(){
    // Ensure an active comp and selected layers exist.
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return;
    var selectedLayers = comp.selectedLayers;
    if(selectedLayers.length === 0) return;
    
    app.beginUndoGroup("Apply Scale Expression with Max Width Control");

    // Expression: scales the text so that its effective width (its natural width × (Base Scale/100) × parent factor)
    // does not exceed the "Max Width" slider value.
    // If it does exceed, the scale is reduced to exactly meet maxWidth.
    // "Continuous" (checkbox) lets the user decide if the expression is updated continuously (time) or at a set "Sample Time".
    var expr = 
    'var maxWidth = effect("Max Width")("Slider").value;\n' +
    'var baseScale = effect("Base Scale")("Slider").value;\n' +
    'var continuous = effect("Continuous")("Checkbox").value;\n' +
    'var sampleTime = effect("Sample Time")("Slider").value;\n' +
    'var t = (continuous==1) ? time : sampleTime;\n' +
    'var textRect = thisLayer.sourceRectAtTime(t, false);\n' +
    'var textWidth = textRect.width;\n' +
    'function getParentFactor(){\n' +
    '    try{\n' +
    '        return thisLayer.parent.transform.scale.value[0] / 100;\n' +
    '    } catch(e){\n' +
    '        return 1;\n' +
    '    }\n' +
    '}\n' +
    'var parentFactor = getParentFactor();\n' +
    'var effectiveWidth = textWidth * (baseScale / 100) * parentFactor;\n' +
    'if(effectiveWidth > maxWidth){\n' +
    '    var newScale = (maxWidth / (textWidth * parentFactor)) * 100;\n' +
    '    [newScale, newScale];\n' +
    '} else {\n' +
    '    [baseScale, baseScale];\n' +
    '}';

    for (var i = 0; i < selectedLayers.length; i++){
        var layer = selectedLayers[i];
        var effects = layer.property("ADBE Effect Parade");
        
        // Calculate the layer's current effective width.
        // (Natural text width * (current scale/100) * parent factor)
        var textRect = layer.sourceRectAtTime(comp.time, false);
        var textWidth = textRect.width;
        var parentFactor = 1;
        if(layer.parent){
            parentFactor = layer.parent.transform.scale.value[0] / 100;
        }
        var currentScale = layer.property("ADBE Transform Group").property("ADBE Scale").value[0];
        var currentEffectiveWidth = textWidth * (currentScale / 100) * parentFactor;
        
        // Add "Max Width" slider control. Set default to the layer's current effective width.
        var maxWidthCtrl = effects.property("Max Width");
        if(!maxWidthCtrl){
            maxWidthCtrl = effects.addProperty("ADBE Slider Control");
            maxWidthCtrl.name = "Max Width";
        }
        maxWidthCtrl.property("Slider").setValue(currentEffectiveWidth);
        
        // Add "Base Scale" slider control. Set default to the layer's current scale.
        var baseScaleCtrl = effects.property("Base Scale");
        if(!baseScaleCtrl){
            baseScaleCtrl = effects.addProperty("ADBE Slider Control");
            baseScaleCtrl.name = "Base Scale";
        }
        baseScaleCtrl.property("Slider").setValue(currentScale);
        
        // Add "Continuous" checkbox control (default: checked, i.e. update continuously).
        var contCtrl = effects.property("Continuous");
        if(!contCtrl){
            contCtrl = effects.addProperty("ADBE Checkbox Control");
            contCtrl.name = "Continuous";
        }
        contCtrl.property("Checkbox").setValue(1);
        
        // Add "Sample Time" slider control (default: 0).
        var sampleTimeCtrl = effects.property("Sample Time");
        if(!sampleTimeCtrl){
            sampleTimeCtrl = effects.addProperty("ADBE Slider Control");
            sampleTimeCtrl.name = "Sample Time";
        }
        sampleTimeCtrl.property("Slider").setValue(0);
        
        // Apply the expression to the Scale property.
        layer.property("ADBE Transform Group").property("ADBE Scale").expression = expr;
    }
    
    app.endUndoGroup();
})();
