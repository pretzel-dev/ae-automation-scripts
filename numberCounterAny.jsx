(function(){
    // Check for an active comp and selected layers.
    var comp = app.project.activeItem;
    if(!(comp && comp instanceof CompItem)){
        alert("Please select a composition.");
        return;
    }
    var selectedLayers = comp.selectedLayers;
    if(selectedLayers.length === 0){
        alert("Please select one or more layers.");
        return;
    }
    
    app.beginUndoGroup("Animate Numbers in Text");
    
    // Expression: Animates all numbers in the text from "Start Value" to their final value,
    // over the duration defined by "Animation Duration". Uses the layer's inPoint as the start time.
    var expr =
    'var startValue = effect("Start Value")("Slider").value;\n' +
    'var animTime = effect("Animation Duration")("Slider").value;\n' +
    'var animT = time - inPoint;\n' +
    'var targetText = value;\n' +
    '\n' +
    '// Animate a single number from startValue to finalValue using ease\n' +
    'function animateNumber(finalValue, decimals) {\n' +
    '    var eased = ease(animT, 0, animTime, startValue, finalValue);\n' +
    '    var rounded = Math.round(eased * Math.pow(10, decimals)) / Math.pow(10, decimals);\n' +
    '    return rounded.toFixed(decimals);\n' +
    '}\n' +
    '\n' +
    '// Replace each number in the text with its animated counterpart\n' +
    'function animateNumbersInText(txt) {\n' +
    '    var re = /(\\d+(\\.\\d+)?)/g;\n' +
    '    var matches = txt.match(re);\n' +
    '    if(matches == null){\n' +
    '        return txt;\n' +
    '    }\n' +
    '    var animatedTxt = txt;\n' +
    '    for(var i = 0; i < matches.length; i++){\n' +
    '        var m = matches[i];\n' +
    '        var decimals = (m.indexOf(".") !== -1) ? m.split(".")[1].length : 0;\n' +
    '        var finalValue = parseFloat(m);\n' +
    '        var animatedValue = animateNumber(finalValue, decimals);\n' +
    '        animatedTxt = animatedTxt.replace(m, animatedValue);\n' +
    '    }\n' +
    '    return animatedTxt;\n' +
    '}\n' +
    '\n' +
    'animateNumbersInText(targetText);';
    
    // Loop through each selected layer.
    for(var i = 0; i < selectedLayers.length; i++){
        var layer = selectedLayers[i];
        var effects = layer.property("ADBE Effect Parade");
        
        // Add or retrieve the "Start Value" slider control.
        var startValueCtrl = effects.property("Start Value");
        if(!startValueCtrl){
            startValueCtrl = effects.addProperty("ADBE Slider Control");
            startValueCtrl.name = "Start Value";
            startValueCtrl.property("Slider").setValue(0);
        }
        
        // Add or retrieve the "Animation Duration" slider control.
        var animTimeCtrl = effects.property("Animation Duration");
        if(!animTimeCtrl){
            animTimeCtrl = effects.addProperty("ADBE Slider Control");
            animTimeCtrl.name = "Animation Duration";
            animTimeCtrl.property("Slider").setValue(1);
        }
        
        // Apply the expression to the Source Text property.
        var sourceTextProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
        sourceTextProp.expression = expr;
    }
    
    app.endUndoGroup();
})();
