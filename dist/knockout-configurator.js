define([
        'knockout',
        'knockout-validation',
        'knockout-mapping',
        'app/ko/knockout-binding-handlers',
        'app/ko/knockout-validation-rules',
        'app/ko/knockout-extenders',
        'bower_components/rc.framework.js/dist/ko/binding-handlers/form-group-validation-css-class',
        'bower_components/rc.framework.js/dist/ko/binding-handlers/help-block-validation-message',
        'bower_components/rc.framework.js/dist/ko/extenders/bootstrap-validation',
        'bower_components/rc.framework.js/dist/ko/extenders/success-validating-message'
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