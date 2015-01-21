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
