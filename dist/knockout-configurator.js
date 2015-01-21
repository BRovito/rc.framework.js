define([
        'knockout',
        'knockout-validation',
        'knockout-mapping',
        'app/ko/knockout-binding-handlers',
        'app/ko/knockout-validation-rules',
        'app/ko/knockout-extenders'
    ],
    function(ko, knockoutValidation, koMapping, knockoutBindingHandlers, knockoutValidationRules, knockoutExtenders) {
        'use strict';

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