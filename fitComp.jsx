// Apply Scale Expression with Fit Logic using sourceRectAtTime (No Alerts)
// This script adds a "Padding Value" slider (default 0) and a "Percent Based" checkbox to each selected layer,
// then applies a scale expression that fits the layer's content (using sourceRectAtTime) within the comp
// with the specified padding.
(function() {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        return;
    }
    
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
        return;
    }
    
    app.beginUndoGroup("Apply Scale Expression with Fit Logic");

    // Expression string using the fit logic and sourceRectAtTime
    var expr =
    'var pad = effect("Padding Value")("Slider");\n' +
    'var usePercent = effect("Percent Based")("Checkbox");\n\n' +
    'var compWidth = thisComp.width;\n' +
    'var compHeight = thisComp.height;\n\n' +
    'var targetWidth, targetHeight;\n\n' +
    'if (usePercent == 1) {\n' +
    '    // In percent mode, pad is the percentage fill (100 fills the comp, 50 fills half the comp)\n' +
    '    targetWidth = compWidth * (pad / 100);\n' +
    '    targetHeight = compHeight * (pad / 100);\n' +
    '} else {\n' +
    '    // In pixel mode, pad is the margin on each side\n' +
    '    targetWidth = compWidth - pad * 2;\n' +
    '    targetHeight = compHeight - pad * 2;\n' +
    '}\n\n' +
    'var rect = thisLayer.sourceRectAtTime(time, false);\n' +
    'var layerWidth = rect.width;\n' +
    'var layerHeight = rect.height;\n\n' +
    'var scaleX = targetWidth / layerWidth;\n' +
    'var scaleY = targetHeight / layerHeight;\n' +
    'var scaleRatio = Math.min(scaleX, scaleY) * 100;\n\n' +
    '[scaleRatio, scaleRatio];';
    
    // Loop through each selected layer
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        var effects = layer.property("ADBE Effect Parade");

        // Add or retrieve the "Padding Value" slider control, with default value 0
        var paddingValue = effects.property("Padding Value");
        if (!paddingValue) {
            paddingValue = effects.addProperty("ADBE Slider Control");
            paddingValue.name = "Padding Value";
        }
        paddingValue.property("Slider").setValue(0);
        
        // Add or retrieve the "Percent Based" checkbox control
        var percentBased = effects.property("Percent Based");
        if (!percentBased) {
            percentBased = effects.addProperty("ADBE Checkbox Control");
            percentBased.name = "Percent Based";
        }
        // Default to pixel mode (unchecked)
        percentBased.property("Checkbox").setValue(0);
        
        // Apply the expression to the layer's Scale property
        layer.property("ADBE Transform Group").property("ADBE Scale").expression = expr;
    }
    
    app.endUndoGroup();
})();
