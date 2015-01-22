define(['knockout'], function(ko) {
    "use strict";

    ko.extenders.successValidingMessage = function(target, options) {
    	target.validatingMessage = options.validatingMessage;
    	target.validMessage = options.validMessage;
    };
});
