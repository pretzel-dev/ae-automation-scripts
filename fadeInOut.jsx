(function(){
    // Define your unique ID here.
    var id = "[PP2]";
    
    // Ensure an active comp and that layers are selected.
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
    
    app.beginUndoGroup("Apply " + id + " Opacity Fade Expression");

    // Define a configuration object for your fade controls.
    // In this example, the fade in/out durations are defined (in seconds).
    var configJSON = '{"controls": {' +
        '"Fade In": {"type": "slider", "min": 0, "max": 10},' +
        '"Fade Out": {"type": "slider", "min": 0, "max": 10}' +
    '}}';

    // Embed the configuration into the expression comment.
    // This comment is what the dynamic panel will search for.
    var expr =
    '/* ' + id + ' config: ' + configJSON + ' */\n' +
    'var fadeIn = effect("' + id + ' Fade In")("Slider").value;\n' +
    'var fadeOut = effect("' + id + ' Fade Out")("Slider").value;\n' +
    'if (time < inPoint + fadeIn) {\n' +
    '    ease((time - inPoint) / fadeIn, 0, 1) * value;\n' +
    '} else if (time > outPoint - fadeOut) {\n' +
    '    ease((outPoint - time) / fadeOut, 0, 1) * value;\n' +
    '} else {\n' +
    '    value;\n' +
    '}';

    // Loop through each selected layer.
    for(var i = 0; i < selectedLayers.length; i++){
        var layer = selectedLayers[i];
        var effects = layer.property("ADBE Effect Parade");
        
        // Add the "Fade In" slider control (named with your id)
        var fadeInCtrl = effects.property(id + " Fade In");
        if(!fadeInCtrl){
            fadeInCtrl = effects.addProperty("ADBE Slider Control");
            fadeInCtrl.name = id + " Fade In";
            fadeInCtrl.property("Slider").setValue(1);
        }
        
        // Add the "Fade Out" slider control (named with your id)
        var fadeOutCtrl = effects.property(id + " Fade Out");
        if(!fadeOutCtrl){
            fadeOutCtrl = effects.addProperty("ADBE Slider Control");
            fadeOutCtrl.name = id + " Fade Out";
            fadeOutCtrl.property("Slider").setValue(1);
        }
        
        // Apply the expression to the Opacity property.
        var opacityProp = layer.property("ADBE Transform Group").property("ADBE Opacity");
        opacityProp.expression = expr;
    }
    
    app.endUndoGroup();
})();
