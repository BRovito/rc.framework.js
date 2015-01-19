define([
        'knockout',
        'knockoutValidation',
        './knockoutBindingHandlers',
        './knockoutValidationRules',
        './knockoutExtenders',
        'knockout-mapping'
    ],
    function(ko, knockoutValidation, knockoutBindingHandlers, knockoutValidationRules, knockoutExtenders, koMapping) {
        "use strict";

        ko.mapping = koMapping;

        return {
            configure: function() {
                ko.validation.registerExtenders();

                ko.validation.init({
                    insertMessages: false
                });
            }
        };
    });