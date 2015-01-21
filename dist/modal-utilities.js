define(['jquery', 'framework-utilities'],
    function($, frameworkUtilities) {
        'use strict';

        var modalHelper = {};

        modalHelper.init = function() {
            var $body = $('body');
            var loadingGifUrl = '/images/loading.gif';

            modalHelper.$savingModalWindow = addGenericModalWindow($body, loadingGifUrl, 'Enregistrement, veuillez patienter...');
            modalHelper.$loadingModalWindow = addGenericModalWindow($body, loadingGifUrl, 'Chargement, veuillez patienter...');
        };

        modalHelper.showSavingModalWindow = function() {
            return show(modalHelper.$savingModalWindow, modalHelper.$loadingModalWindow);
        };

        modalHelper.hideSavingModalWindow = function() {
            return hide(modalHelper.$savingModalWindow);
        };

        modalHelper.showLoadingModalWindow = function() {
            return show(modalHelper.$loadingModalWindow, modalHelper.$savingModalWindow);
        };

        modalHelper.hideLoadingModalWindow = function() {
            return hide(modalHelper.$loadingModalWindow);
        };

        modalHelper.hideAll = function() {
            return $.when(
                hide(modalHelper.$loadingModalWindow),
                hide(modalHelper.$savingModalWindow)
            );
        };

        function show($elementToShow, $elementToHide){
            var deferred = new $.Deferred();

            hide($elementToHide).then(function() {
                if (!$elementToShow.hasClass('in')) {
                    $elementToShow.modal('show')
                        .on('shown.bs.modal', function(/*e*/) {
                            deferred.resolve($elementToShow);
                        });
                } else {
                    deferred.resolve($elementToShow);
                }
            });

            return deferred.promise();
        }

        function hide($elementToHide){
            var deferred = new $.Deferred();

            if ($elementToHide.hasClass('in')) {
                $elementToHide.modal('hide')
                    .on('hidden.bs.modal', function(/*e*/) {
                        deferred.resolve($elementToHide);
                    });
            } else {
                deferred.resolve($elementToHide);
            }

            return deferred.promise();
        }

        function addGenericModalWindow($body, loadingGifUrl, message) {
            var uniqueId = frameworkUtilities.generateUniqueElementId();

            var $window = $('<div class="modal fade" id="' + uniqueId + '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">' +
                '<div class="modal-dialog">' +
                '<div class="modal-content">' +
                '<img src="' + loadingGifUrl + '" alt="Chargement en cours...">' +
                '<p>' + message + '</p>' +
                '</div></div></div>');

            $body.append($window);

            $window.modal({
                backdrop: 'static',
                keyboard: false,
                show: false
            });

            return $window;
        }

        return modalHelper;
    });
