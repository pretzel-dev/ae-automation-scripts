(function(){
    // Check for an active comp and selected layers.
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) { alert("Please select a comp."); return; }
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) { alert("Please select one or more text layers."); return; }
    
    app.beginUndoGroup("Animate Number with Prefix & Suffix (No Self)");
    
    // Expression that animates the number from Start Value to the final number in the source text.
    // It formats the number with commas and fixed decimals,
    // then prepends the prefix and appends the suffix if those layer controls point to a layer
    // other than the current layer.
    var expr =
    'var endValue = parseFloat(value);\n' +
    'var startValue = effect("Start Value")("Slider").value;\n' +
    'var animDuration = effect("Animation Duration")("Slider").value;\n' +
    'var decimalPlaces = effect("Decimal Places")("Slider").value;\n' +
    'var animT = time - inPoint;\n' +
    'var currentValue = ease(animT, 0, animDuration, startValue, endValue);\n' +
    'var formattedValue = currentValue.toFixed(decimalPlaces);\n' +
    'formattedValue = formattedValue.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");\n' +
    'var prefixLayer = effect("Prefix")("Layer");\n' +
    'var suffixLayer = effect("Suffix")("Layer");\n' +
    'var prefix = "";\n' +
    'var suffix = "";\n' +
    'if (prefixLayer != null && prefixLayer.index != thisLayer.index) {\n' +
    '    prefix = prefixLayer.text.sourceText.value;\n' +
    '}\n' +
    'if (suffixLayer != null && suffixLayer.index != thisLayer.index) {\n' +
    '    suffix = suffixLayer.text.sourceText.value;\n' +
    '}\n' +
    'prefix + formattedValue + suffix;';
    
    for (var i = 0; i < selectedLayers.length; i++){
        var layer = selectedLayers[i];
        // Only process text layers.
        if (!layer.property("ADBE Text Properties")) continue;
        var effects = layer.property("ADBE Effect Parade");
        
        // Add or retrieve the "Start Value" slider control.
        var startValCtrl = effects.property("Start Value");
        if (!startValCtrl){
            startValCtrl = effects.addProperty("ADBE Slider Control");
            startValCtrl.name = "Start Value";
            startValCtrl.property("Slider").setValue(0);
        }
        
        // Add or retrieve the "Animation Duration" slider control.
        var animDurCtrl = effects.property("Animation Duration");
        if (!animDurCtrl){
            animDurCtrl = effects.addProperty("ADBE Slider Control");
            animDurCtrl.name = "Animation Duration";
            animDurCtrl.property("Slider").setValue(1);
        }
        
        // Add or retrieve the "Decimal Places" slider control.
        var decPlacesCtrl = effects.property("Decimal Places");
        if (!decPlacesCtrl){
            decPlacesCtrl = effects.addProperty("ADBE Slider Control");
            decPlacesCtrl.name = "Decimal Places";
            decPlacesCtrl.property("Slider").setValue(0);
        }
        
        // Add or retrieve the "Prefix" layer control.
        var prefixCtrl = effects.property("Prefix");
        if (!prefixCtrl){
            prefixCtrl = effects.addProperty("ADBE Layer Control");
            prefixCtrl.name = "Prefix";
        }
        
        // Add or retrieve the "Suffix" layer control.
        var suffixCtrl = effects.property("Suffix");
        if (!suffixCtrl){
            suffixCtrl = effects.addProperty("ADBE Layer Control");
            suffixCtrl.name = "Suffix";
        }
        
        // Apply the expression to the text layer's Source Text property.
        var textDoc = layer.property("ADBE Text Properties").property("ADBE Text Document");
        textDoc.expression = expr;
    }
    
    app.endUndoGroup();
})();
