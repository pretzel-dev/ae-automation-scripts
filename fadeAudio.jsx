(function(){
    // Check for an active comp and selected layers.
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) { alert("Please select an active comp."); return; }
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) { alert("Please select one or more layers."); return; }
    
    app.beginUndoGroup("Audio Level Fade (Layer or Comp End)");

    // Combined expression for fading audio levels.
    // Fade Mode options (dropdown):
    //   Option 1: "Layer End" – fade from the layer's outPoint.
    //   Option 2: "Comp End" – fade from the comp's duration.
    var expr =
    'var fadeDuration = effect("Fade Duration")("Slider").value;\n' +
    'var fadeMode = effect("Fade Mode")("Menu").value;\n' +
    'var currentLevel = value[0];\n' +
    'if (fadeMode == 1) {\n' +
    '    var layerEnd = thisLayer.outPoint;\n' +
    '    if (time > layerEnd - fadeDuration) {\n' +
    '        var fadeValue = linear(time, layerEnd - fadeDuration, layerEnd, currentLevel, -48);\n' +
    '        [fadeValue, fadeValue];\n' +
    '    } else {\n' +
    '        value;\n' +
    '    }\n' +
    '} else if (fadeMode == 2) {\n' +
    '    var compEnd = thisComp.duration;\n' +
    '    var fadeValue = (time > compEnd - fadeDuration) ? linear(time, compEnd - fadeDuration, compEnd, currentLevel, -48) : currentLevel;\n' +
    '    [fadeValue, fadeValue];\n' +
    '} else {\n' +
    '    value;\n' +
    '}';

    for (var i = 0; i < selectedLayers.length; i++){
        var layer = selectedLayers[i];
        // Access the audio group and then the audio levels property.
        var audioGroup = layer.property("ADBE Audio Group");
        if (!audioGroup) continue;
        var audioLevels = audioGroup.property("ADBE Audio Levels");
        if (!audioLevels) continue;
        
        var effects = layer.property("ADBE Effect Parade");
        
        // Add or retrieve the "Fade Duration" slider control.
        var fadeDurCtrl = effects.property("Fade Duration");
        if (!fadeDurCtrl){
            fadeDurCtrl = effects.addProperty("ADBE Slider Control");
            fadeDurCtrl.name = "Fade Duration";
            fadeDurCtrl.property("Slider").setValue(5);
        }
        
        // Add or retrieve the "Fade Mode" dropdown control.
        var fadeModeCtrl = effects.property("Fade Mode");
        if (!fadeModeCtrl){
            fadeModeCtrl = effects.addProperty("ADBE Dropdown Control");
            // Set the menu items for fade mode and rename the parameter group.
            var temp = fadeModeCtrl.property(1).setPropertyParameters(["Layer End", "Comp End"]);
            temp.propertyGroup(1).name = "Fade Mode";
            // Set default to option 1 ("Layer End").
            try {
                var dm = fadeModeCtrl.property("Menu") || fadeModeCtrl.property(1);
                dm.setValue(1);
            } catch(e){}
        }
        
        // Apply the expression to the Audio Levels property.
        audioLevels.expression = expr;
    }
    
    app.endUndoGroup();
})();
