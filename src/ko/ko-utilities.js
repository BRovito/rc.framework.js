define(['knockout'], function(ko) {
    "use strict";

    return {
        mapAsObservableValueObjects: mapAsObservableValueObjects,
        mapAsObservableValueObject: mapAsObservableValueObject,
        removeKoMappingProperties: removeKoMappingProperties,
        toJS: toJS
    };

    function mapAsObservableValueObjects(mapping, complexAttributeNames) {
        for (var i = 0; i < complexAttributeNames.length; i++) {
            mapAsObservableValueObject(mapping, complexAttributeNames[i]);
        }
    }

    function mapAsObservableValueObject(mapping, complexAttributeName) {
        mapping[complexAttributeName] = {
            update: asObservableValueObject
        };
    }

    function asObservableValueObject(options) {
        if (!options.data) {
            return null;
        }

        return ko.observable(options.data);
    }

    function removeKoMappingProperties(obj) {
        for (var property in obj) {
            if (obj.hasOwnProperty(property)) {
                if (property == '__ko_mapping__') {
                    delete obj[property];
                } else {
                    var type = typeof obj[property];

                    if (type === 'object' || type === 'function') {
                        removeKoMappingProperties(obj[property]);
                    }
                }
            }
        }
    };

    //TODO: Ne pas utiliser cette méthode - trop lourde...
    //mieux connaitre/identifier les observables des viewmodels
    function toJS(obj) {
        var result = ko.toJS(obj);

        removeKoMappingProperties(result);

        return result;
    };
});