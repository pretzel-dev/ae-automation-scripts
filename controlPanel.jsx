(function dynamicPPPanel(){
    // ===== Polyfill for Array.indexOf =====
    if (typeof Array.prototype.indexOf !== "function") {
        Array.prototype.indexOf = function(searchElement) {
            for (var i = 0, len = this.length; i < len; i++) {
                if (this[i] === searchElement) {
                    return i;
                }
            }
            return -1;
        };
    }

    // ===== Set your ID prefix here =====
    // This is the only hard–coded part.
    var idPrefix = "PP"; // Change to "AS" (etc.) to match your naming scheme.

    // ===== UI Setup =====
    var win = new Window("palette", "[" + idPrefix + "] Dynamic Control Panel", undefined, {resizeable:true});
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];

    // Buttons for Refresh and Remove All
    var refreshBtn = win.add("button", undefined, "Refresh Controls");
    var removeAllBtn = win.add("button", undefined, "Remove All " + idPrefix + " Effects");

    // Group for selective removal (drop-down)
    var removalGroup = win.add("group");
    removalGroup.orientation = "row";
    removalGroup.alignChildren = ["fill", "center"];
    removalGroup.add("statictext", undefined, "Remove Marker:");
    var removalDropdown = removalGroup.add("dropdownlist", undefined, []);
    removalDropdown.preferredSize.width = 100;
    var removeSelectedBtn = removalGroup.add("button", undefined, "Remove Selected Marker");

    // Group for dynamic UI panels for each configuration group
    var uiGroup = win.add("group");
    uiGroup.orientation = "column";
    uiGroup.alignChildren = ["fill", "top"];
    uiGroup.margins = 10;
    
    // ===== Helper Functions for Config Retrieval =====
    // This function recursively searches a property for any expression
    // that includes a configuration comment. It collects any found configuration
    // in an object keyed by marker.
    function findConfigsInProp(prop, resultObj) {
        // Check if this property can have an expression and if it does…
        if (prop.canSetExpression && prop.expression && prop.expression.indexOf(" config:") !== -1) {
            var exprText = prop.expression;
            var commentStart = exprText.indexOf("/* ");
            var markerEnd = exprText.indexOf(" config:", commentStart);
            if (commentStart !== -1 && markerEnd !== -1) {
                var marker = exprText.substring(commentStart + 3, markerEnd);
                // Only care about markers that start with "["+idPrefix
                var expectedPrefix = "[" + idPrefix;
                if (marker.indexOf(expectedPrefix) === 0) {
                    var configStart = markerEnd + " config:".length;
                    var commentEnd = exprText.indexOf("*/", configStart);
                    if (commentEnd !== -1) {
                        var jsonText = exprText.substring(configStart, commentEnd).replace(/^\s+|\s+$/g, '');
                        try {
                            var config = JSON.parse(jsonText);
                            // Save if not already in the result.
                            if (!resultObj[marker]) {
                                resultObj[marker] = { marker: marker, config: config };
                            }
                        } catch (e) {
                            // JSON parse error; ignore.
                        }
                    }
                }
            }
        }
        // If property is a group, recursively search its children.
        if (prop.propertyType === PropertyType.NAMED_GROUP || prop.propertyType === PropertyType.INDEXED_GROUP) {
            for (var i = 1; i <= prop.numProperties; i++) {
                try {
                    var childProp = prop.property(i);
                    findConfigsInProp(childProp, resultObj);
                } catch(e) {
                    // Skip properties that throw errors.
                }
            }
        }
    }
    
    // For a given layer, find all configuration objects (unique by marker)
    function getConfigsFromLayer(layer) {
        var results = {};
        // Start recursion from the layer itself.
        findConfigsInProp(layer, results);
        var arr = [];
        for (var key in results) {
            if (results.hasOwnProperty(key)) {
                arr.push(results[key]);
            }
        }
        return arr;
    }
    
    // Aggregate unique configuration objects from all selected layers.
    function getAllConfigsFromSelectedLayers() {
        var comp = app.project.activeItem;
        var configMap = {};
        if (!(comp && comp instanceof CompItem)) return [];
        for (var i = 0; i < comp.selectedLayers.length; i++){
            var layer = comp.selectedLayers[i];
            var configs = getConfigsFromLayer(layer);
            for (var j = 0; j < configs.length; j++){
                var marker = configs[j].marker;
                if (!configMap[marker]) {
                    configMap[marker] = configs[j];
                }
            }
        }
        var arr = [];
        for (var key in configMap) {
            if (configMap.hasOwnProperty(key)) {
                arr.push(configMap[key]);
            }
        }
        return arr;
    }
    
    // ===== Update Functions =====
    // Update a particular control in all selected layers that match a given marker.
    // The effect control is assumed to be named as: marker + " " + controlName.
    function updatePPControlForMarker(marker, controlName, newValue) {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) return;
        for (var i = 0; i < comp.selectedLayers.length; i++){
            var layer = comp.selectedLayers[i];
            var effects = layer.property("ADBE Effect Parade");
            var effectProp = effects.property(marker + " " + controlName);
            if (effectProp) {
                // Determine control type from the configuration.
                // (We assume all layers with this marker share the same config.)
                var controlType = currentConfigs[marker].config.controls[controlName].type;
                if (controlType === "slider") {
                    effectProp.property("Slider").setValue(newValue);
                } else if (controlType === "checkbox") {
                    effectProp.property("Checkbox").setValue(newValue ? 1 : 0);
                } else if (controlType === "dropdown") {
                    effectProp.property("Menu").setValue(newValue);
                }
            }
        }
    }
    
    // ===== Removal Functions =====
    // Recursively remove expressions containing a given marker from any property.
    function removePPExpressionsFromGroupByMarker(propGroup, marker) {
        for (var i = 1; i <= propGroup.numProperties; i++) {
            var prop = propGroup.property(i);
            if (prop.propertyType === PropertyType.NAMED_GROUP || prop.propertyType === PropertyType.INDEXED_GROUP) {
                removePPExpressionsFromGroupByMarker(prop, marker);
            } else {
                if (prop.canSetExpression && prop.expression && prop.expression.indexOf(marker) !== -1) {
                    prop.expression = "";
                }
            }
        }
    }
    
    // Remove effects (and expressions) whose names start with the given marker.
    // If marker is null, remove all effects whose name starts with "[" + idPrefix.
    function removePPFromSelectedLayersByMarker(marker) {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) return;
        app.beginUndoGroup("Remove " + idPrefix + " Effects & Expressions" + (marker ? (" for Marker " + marker) : ""));
        for (var i = 0; i < comp.selectedLayers.length; i++){
            var layer = comp.selectedLayers[i];
            var effects = layer.property("ADBE Effect Parade");
            if (effects) {
                for (var j = effects.numProperties; j >= 1; j--) {
                    var eff = effects.property(j);
                    if (eff && typeof eff.name === "string") {
                        if (marker) {
                            if (eff.name.indexOf(marker) === 0) {
                                eff.remove();
                            }
                        } else {
                            if (eff.name.indexOf("[" + idPrefix) === 0) {
                                eff.remove();
                            }
                        }
                    }
                }
            }
            // Remove expressions containing marker(s)
            if (marker) {
                removePPExpressionsFromGroupByMarker(layer, marker);
            } else {
                function removeAllPPExpressionsFromGroup(pg) {
                    for (var k = 1; k <= pg.numProperties; k++) {
                        var p = pg.property(k);
                        if (p.propertyType === PropertyType.NAMED_GROUP || p.propertyType === PropertyType.INDEXED_GROUP) {
                            removeAllPPExpressionsFromGroup(p);
                        } else {
                            if (p.canSetExpression && p.expression && p.expression.indexOf("[" + idPrefix) !== -1) {
                                p.expression = "";
                            }
                        }
                    }
                }
                removeAllPPExpressionsFromGroup(layer);
            }
        }
        app.endUndoGroup();
        alert(marker ? idPrefix + " effects and expressions for marker " + marker + " removed." : "All " + idPrefix + " effects and expressions removed from selected layers.");
    }
    
    // ===== Build Dynamic UI =====
    // This function scans the selected layers and builds a panel for each configuration group found.
    // Each panel will show the controls defined in its configuration.
    function buildDynamicUI() {
        // Clear existing UI.
        while(uiGroup.children.length > 0){
            uiGroup.remove(uiGroup.children[0]);
        }
        
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("Please select an active comp.");
            return;
        }
        if (comp.selectedLayers.length === 0) {
            alert("Please select one or more layers.");
            return;
        }
        
        // Get an array of all configuration objects from selected layers.
        var configArray = getAllConfigsFromSelectedLayers();
        if (configArray.length === 0) {
            alert("No " + idPrefix + " configuration found on the selected layers.");
            return;
        }
        
        // To let our update function know the configuration for each marker,
        // we'll build a global map (currentConfigs) keyed by marker.
        currentConfigs = {};
        for (var i = 0; i < configArray.length; i++) {
            currentConfigs[configArray[i].marker] = configArray[i];
        }
        
        // For each configuration object, create a UI panel.
        for (var i = 0; i < configArray.length; i++) {
            var configObj = configArray[i];
            var marker = configObj.marker;
            var controls = configObj.config.controls;
            
            var groupPanel = uiGroup.add("panel", undefined, marker);
            groupPanel.orientation = "column";
            groupPanel.alignChildren = ["fill", "top"];
            groupPanel.margins = 5;
            
            // For each control defined in the configuration, create UI widgets.
            for (var ctrlName in controls) {
                if (!controls.hasOwnProperty(ctrlName)) continue;
                var ctrlDef = controls[ctrlName];
                (function(cn, def, marker) {
                    var ctrlGroup = groupPanel.add("group");
                    ctrlGroup.orientation = "row";
                    ctrlGroup.alignChildren = ["left", "center"];
                    ctrlGroup.spacing = 10;
                    
                    // Label for the control.
                    ctrlGroup.add("statictext", undefined, cn + ":");
                    
                    if (def.type === "slider") {
                        // Read the current value from the first selected layer.
                        var firstLayer = comp.selectedLayers[0];
                        var eff = firstLayer.property("ADBE Effect Parade").property(marker + " " + cn);
                        var currentVal = eff ? eff.property("Slider").value : def.min;
                        var slider = ctrlGroup.add("slider", undefined, currentVal, def.min, def.max);
                        slider.preferredSize.width = 150;
                        var valueInput = ctrlGroup.add("edittext", undefined, currentVal.toFixed(1));
                        valueInput.characters = 5;
                        slider.onChanging = function() {
                            valueInput.text = Math.round(slider.value).toString();
                        };
                        slider.onChange = function() {
                            app.beginUndoGroup("Update " + marker + " " + cn);
                            updatePPControlForMarker(marker, cn, slider.value);
                            app.endUndoGroup();
                        };
                        valueInput.onChange = function() {
                            var numVal = parseFloat(valueInput.text);
                            if (!isNaN(numVal)) {
                                slider.value = numVal;
                                app.beginUndoGroup("Update " + marker + " " + cn);
                                updatePPControlForMarker(marker, cn, numVal);
                                app.endUndoGroup();
                            }
                        };
                    }
                    else if (def.type === "checkbox") {
                        var firstLayer = comp.selectedLayers[0];
                        var eff = firstLayer.property("ADBE Effect Parade").property(marker + " " + cn);
                        var currentVal = (eff && eff.property("Checkbox").value === 1) ? true : false;
                        var checkbox = ctrlGroup.add("checkbox", undefined, "Enabled");
                        checkbox.value = currentVal;
                        checkbox.onClick = function(){
                            app.beginUndoGroup("Update " + marker + " " + cn);
                            updatePPControlForMarker(marker, cn, checkbox.value);
                            app.endUndoGroup();
                        };
                    }
                    else if (def.type === "dropdown") {
                        var firstLayer = comp.selectedLayers[0];
                        var eff = firstLayer.property("ADBE Effect Parade").property(marker + " " + cn);
                        var currentIdx = eff ? (eff.property("Menu").value - 1) : 0;
                        var dropdown = ctrlGroup.add("dropdownlist", undefined, def.options);
                        dropdown.selection = currentIdx;
                        dropdown.onChange = function(){
                            app.beginUndoGroup("Update " + marker + " " + cn);
                            // AE dropdowns are 1-indexed
                            updatePPControlForMarker(marker, cn, dropdown.selection.index + 1);
                            app.endUndoGroup();
                        };
                    }
                    else {
                        ctrlGroup.add("statictext", undefined, "Unsupported control type: " + def.type);
                    }
                })(ctrlName, controls[ctrlName], marker);
            }
        }
        
        // Update the removal marker dropdown based on all found markers.
        var markers = [];
        for (var key in currentConfigs) {
            if (currentConfigs.hasOwnProperty(key)) {
                markers.push(key);
            }
        }
        removalDropdown.removeAll();
        for (var m = 0; m < markers.length; m++){
            removalDropdown.add("item", markers[m]);
        }
        if (removalDropdown.items.length > 0) {
            removalDropdown.selection = removalDropdown.items[0];
        }
        
        win.layout.layout(true);
    }
    
    // ===== Hook Up Buttons =====
    refreshBtn.onClick = function(){
        buildDynamicUI();
    };
    
    removeAllBtn.onClick = function(){
        if (confirm("Are you sure you want to remove ALL " + idPrefix + " effects and expressions from the selected layers?")) {
            removePPFromSelectedLayersByMarker(null);
            buildDynamicUI();
        }
    };
    
    removeSelectedBtn.onClick = function(){
        if (removalDropdown.selection) {
            var markerToRemove = removalDropdown.selection.text;
            if (confirm("Remove all " + idPrefix + " effects and expressions for marker " + markerToRemove + " from the selected layers?")) {
                removePPFromSelectedLayersByMarker(markerToRemove);
                buildDynamicUI();
            }
        }
    };
    
    // ===== Initialize the UI =====
    buildDynamicUI();
    win.center();
    win.show();
})();
