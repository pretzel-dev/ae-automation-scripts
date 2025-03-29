// Apply Scale Expression with Padding Controls Script (Updated)
// This script adds a "Padding Value" slider (default 0) and a "Percent Based" checkbox to each selected layer,
// then applies a scale expression that adapts to either pixel or percentage-based padding.
(function() {
    // Ensure we have an active comp
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Please select or open a composition first.");
        return;
    }
    
    // Ensure layers are selected
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
        alert("Please select one or more layers.");
        return;
    }
    
    app.beginUndoGroup("Apply Scale Expression with Padding Controls");

    // The expression string to apply to the Scale property
    var expr = 
    'var pad = effect("Padding Value")("Slider");\n' +
    'var usePercent = effect("Percent Based")("Checkbox");\n\n' +
    'var comp = thisComp;\n' +
    'var effectiveWidth, effectiveHeight;\n\n' +
    'if (usePercent == 1) {\n' +
    '    // Percentage mode: pad is a percentage of the comp dimensions\n' +
    '    effectiveWidth = comp.width * (pad / 100);\n' +
    '    effectiveHeight = comp.height * (pad / 100);\n' +
    '} else {\n' +
    '    // Pixel mode: pad is the margin on each side\n' +
    '    effectiveWidth = comp.width - pad * 2;\n' +
    '    effectiveHeight = comp.height - pad * 2;\n' +
    '}\n\n' +
    'var compAspect = effectiveWidth / effectiveHeight;\n' +
    'var layerAspect = width / height;\n' +
    'var scaleRatio;\n\n' +
    'if (compAspect > layerAspect) {\n' +
    '    scaleRatio = (effectiveWidth / width) * 100;\n' +
    '} else {\n' +
    '    scaleRatio = (effectiveHeight / height) * 100;\n' +
    '}\n\n' +
    '[scaleRatio, scaleRatio];';
    
    // Loop through each selected layer
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        var effects = layer.property("ADBE Effect Parade");

        // Add or retrieve the "Padding Value" slider control, with default 0
        var paddingValue = effects.property("Padding Value");
        if (!paddingValue) {
            paddingValue = effects.addProperty("ADBE Slider Control");
            paddingValue.name = "Padding Value";
        }
        // Set default padding value to 0
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
    
    alert("Expression applied to selected layers.");
})();
