define(['knockout', 'jquery'],
    function(ko, $) {
        "use strict";

        //todo: remove when this https://github.com/knockout/knockout/issues/1475
        var ATTEMPTS = 400;

        function doTest(attempt, element, dfd, childElementCount) {
            if (attempt >= ATTEMPTS) {
                dfd.reject('timeout');
                return;
            }

            // console.info('attempt', attempt, element.childElementCount);
            var bindingDone = element.childElementCount > 0;

            if (childElementCount) {
                bindingDone = element.childElementCount === childElementCount;
            }

            if (bindingDone) {
                dfd.resolve(element);
                return;
            }

            setTimeout(function(){
            	doTest(attempt + 1, element, dfd, childElementCount);
            }, 1);
        }

        return {
            bindingDone: function(element, childElementCount) {
                var dfd = $.Deferred();

                doTest(1, element, dfd, childElementCount);

                return dfd.promise();
            }
        };
    });
