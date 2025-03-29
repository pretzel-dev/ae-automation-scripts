(function(){
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
    
    app.beginUndoGroup("Apply Opacity Fade Expression");

    // Expression that uses two sliders: "Fade In" and "Fade Out"
    // It applies a fade-in from the layer's inPoint and a fade-out at the layer's outPoint.
    // "Fade In" and "Fade Out" are in seconds.
    var expr =
    'var fadeIn = effect("Fade In")("Slider").value;\n' +
    'var fadeOut = effect("Fade Out")("Slider").value;\n' +
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
        
        // Add "Fade In" slider control if it doesn't exist.
        var fadeInCtrl = effects.property("Fade In");
        if(!fadeInCtrl){
            fadeInCtrl = effects.addProperty("ADBE Slider Control");
            fadeInCtrl.name = "Fade In";
            fadeInCtrl.property("Slider").setValue(1);
        }
        
        // Add "Fade Out" slider control if it doesn't exist.
        var fadeOutCtrl = effects.property("Fade Out");
        if(!fadeOutCtrl){
            fadeOutCtrl = effects.addProperty("ADBE Slider Control");
            fadeOutCtrl.name = "Fade Out";
            fadeOutCtrl.property("Slider").setValue(1);
        }
        
        // Apply the expression to the Opacity property.
        var opacityProp = layer.property("ADBE Transform Group").property("ADBE Opacity");
        opacityProp.expression = expr;
    }
    
    app.endUndoGroup();
})();
