define(['jquery', 'bootstrap', 'knockout', 'lodash', 'crossroads', 'hasher', 'framework-utilities', 'knockout-configurator'],
    function($, bootstrap, ko, _, crossroads, hasher, frameworkUtilities, knockoutConfigurator) {
        'use strict';

        function Framework() {
            var self = this;

            self.$document = $(document);

            self.routes = [];
            self.dialogConfigs = [];
            self.modalConfigs = [];
            self.currentRoute = ko.observable(null);
            self.loadedDialogs = ko.observableArray([]);
            self.currentModal = ko.observable(null);

            self.currentDialog = ko.computed(function() {
                var loadedDialogs = self.loadedDialogs();

                if (loadedDialogs.length) {
                    return loadedDialogs[loadedDialogs.length - 1];
                }

                return null;
            });

            self.currentDialog = ko.computed(function() {
                var loadedDialogs = self.loadedDialogs();

                if (loadedDialogs.length) {
                    return loadedDialogs[loadedDialogs.length - 1];
                }

                return null;
            });

            self.isDialogOpen = ko.computed(function() {
                return !!self.currentDialog();
            });

            self.isModalOpen = ko.computed(function() {
                return !!self.currentModal();
            });

            self.isDialogOpen.subscribe(function(isDialogOpen) {
                registerOrUnregisterHideDialogKeyboardShortcut(self, isDialogOpen);
            });

            self.currentRouteTitle = ko.computed(function() {
                var currentRoute = self.currentRoute();

                if (currentRoute) {
                    return currentRoute.title;
                }

                return '';
            });

            self.currentDialogTitle = ko.computed(function() {
                var currentDialog = self.currentDialog();

                if (currentDialog) {
                    return currentDialog.title;
                }

                return '';
            });

            self.currentModalTitle = ko.computed(function() {
                var currentModal = self.currentModal();

                if (currentModal) {
                    return currentModal.title;
                }

                return '';
            });


            //TODO: ?
            //Permet d'afficher un dialog si ?dialog=dialog_name
            // self.currentRoute.subscribe(function(route) {
            //     if (route.dialog) {
            //         self.showDialog(route.dialog);
            //     }
            // });

            configureRouting(self);
        }

        Framework.prototype.init = function( /*config*/ ) {
            var self = this;


            self.$modalElement = getModalElement();
            self.$dialogElement = getDialogElement();

            self.$modalElement.modal({
                show: false
            });

            self.registerComponent('dialogs', {
                basePath: 'bower_components/rc.framework.js/dist/components/'
            });

            self.registerComponent('modal', {
                basePath: 'bower_components/rc.framework.js/dist/components/'
            });

            knockoutConfigurator.configure();

            ko.applyBindings({
                framework: self
            });

            hasher.init();
        };

        Framework.prototype.showDialog = function(name, params) {
            var deferred = new $.Deferred();
            var self = this;

            var dialogConfigToShow = findByName(self.dialogConfigs, name);

            if (!dialogConfigToShow) {
                throw new Error('Framework.showDialog - Unregistered dialog: ' + name);
            }

            var dialog = {
                settings: {
                    close: function(data) {
                        self.loadedDialogs.remove(dialog);

                        if (self.currentDialog()) {
                            self.currentDialog().visible(true);
                        }

                        //todo: attendre apres dialog removed from html...
                        //important de le faire apres que le dialog soit enlever car
                        //la position peut ne pas etre disponible dans le dialog
                        //ceci dit... ca pourrait causer des problemes avec le paging...
                        //il faudrit bloquer le paging tant que le scroll position n'a pas été rétabli
                        self.$document.scrollTop(dialog.previousScrollPosition);


                        deferred.resolve(data);
                    },
                    params: params,
                    title: dialogConfigToShow.title
                },
                componentName: dialogConfigToShow.componentName,
                visible: ko.observable(true),
                previousScrollPosition: self.$document.scrollTop()
            };

            if (self.currentDialog()) {
                self.currentDialog().visible(false);
            }

            self.loadedDialogs.push(dialog);

            return deferred.promise();
        };

        Framework.prototype.showModal = function(name, params) {
            var deferred = new $.Deferred();
            var self = this;

            var modalConfigToShow = findByName(self.modalConfigs, name);

            if (!modalConfigToShow) {
                throw new Error('Framework.showModal - Unregistered modal: ' + name);
            }

            var modal = {
                settings: {
                    close: function(data) {
                        modal.data = data;
                        return hideModal(self);
                    },
                    params: params,
                    title: modalConfigToShow.title
                },
                componentName: modalConfigToShow.componentName,
                //TODO: On pourrait permettre d'overrider les settings de base (du registerModal) pour chaque affichage en passant backdrop & keyboard en plus a Framework.prototype.showModal
                backdrop: modalConfigToShow.backdrop,
                keyboard: modalConfigToShow.keyboard
            };

            var currentModal = self.currentModal();

            if (currentModal) {
                currentModal.settings.close().then(function() {
                    showModal(self, deferred, modal);
                });
            } else {
                showModal(self, deferred, modal);
            }

            return deferred.promise();
        };

        Framework.prototype.hideCurrentModal = function() {
            var deferred = new $.Deferred();

            var currentModal = this.currentModal();

            if (currentModal) {
                currentModal.settings.close().then(function() {
                    deferred.resolve();
                });
            } else {
                deferred.resolve();
            }

            return deferred.promise();
        };

        Framework.prototype.hideCurrentDialog = function() {
            var currentDialog = this.currentDialog();

            if (currentDialog) {
                currentDialog.settings.close();
            }
        };

        Framework.prototype.registerPage = function(name, pageConfig) {
            var self = this;

            if (!name) {
                throw new Error('Framework.registerPage - Argument missing exception: name');
            }

            var componentConfig = buildComponentConfigFromPageConfig(name, pageConfig);
            this.registerComponent(componentConfig.name, componentConfig);

            var route = buildRoute(name, pageConfig, componentConfig);

            //il pourrait y avoir 2 urls identiques - une requireAuthentication et l'autre pas...
            if (_.any(self.routes,
                    function(r) {
                        return r.url == route.url && r.requireAuthentication == route.requireAuthentication;
                    })) {
                throw new Error('Framework.registerPage - Duplicate url: ' + route.url);
            }

            crossroads.addRoute(route.url + ':?query:', function(requestParams) {
                navigate(self, route.url, requestParams);
            });

            this.routes.push(route);
        };

        Framework.prototype.registerModal = function(name, modalConfig) {
            if (!modalConfig.name) {
                throw new Error('Framework.registerModal - Argument missing exception: name');
            }

            var componentConfig = buildComponentConfigFromModalConfig(modalConfig);
            this.registerComponent(componentConfig.name, componentConfig);

            var finalModalConfig = applyModalConventions(name, modalConfig, componentConfig);

            this.modalConfigs.push(finalModalConfig);
        };

        Framework.prototype.registerDialog = function(name, dialogConfig) {
            if (!dialogConfig.name) {
                throw new Error('Framework.registerDialog - Argument missing exception: name');
            }

            var componentConfig = buildComponentConfigFromDialogConfig(dialogConfig);
            this.registerComponent(componentConfig.name, componentConfig);

            var finalDialogConfig = applyDialogConventions(name, dialogConfig, componentConfig);

            this.dialogConfigs.push(finalDialogConfig);
        };

        //Registers a ko component with Radio-Canada conventions
        Framework.prototype.registerComponent = function(name, componentConfig) {
            if (!name) {
                throw new Error('Framework.registerComponent - Argument missing exception: name');
            }

            if (ko.components.isRegistered(name)) {
                throw new Error('Framework.registerComponent - Already registered component: ' + name);
            }

            var basePath = componentConfig.basePath || 'components/';

            if (componentConfig.isBower) {
                if (!componentConfig.type) {
                    componentConfig.type = "component";
                }

                basePath = "bower_components/rc." + componentConfig.type + "." + name + "/dist/";
            }

            var requirePath = basePath + name + '/' + name;

            if (componentConfig.htmlOnly) {
                requirePath = 'text!' + requirePath + '.html';
            }

            var koComponentConfig = {
                require: requirePath
            };

            if (componentConfig.htmlOnly) {
                koComponentConfig = {
                    template: koComponentConfig
                };
            }

            ko.components.register(name, koComponentConfig);
        };

        Framework.prototype.isComponentRegistered = function(name) {
            return ko.components.isRegistered(name);
        };

        Framework.prototype.changeHashSilently = function(destination) {
            hasher.changed.active = false;
            hasher.setHash(destination);
            hasher.changed.active = true;
        };

        //Cette méthode peut être overrided au besoin par le end user! (on est en javascript...)
        Framework.prototype.unknownRouteHandler = function() {
            var self = this;

            //TODO: Bon format d'url - ou ca prend le #/ ???
            self.navigate('page-non-trouvee');
        };

        Framework.prototype.navigate = function(url) {
            var self = this;

            if (url == hasher.getHash().toLowerCase()) { //reload
                navigate(self, url);
            } else {
                hasher.setHash(url);
            }
        };

        function configureRouting(self) {
            //TODO: Utile?
            crossroads.normalizeFn = crossroads.NORM_AS_OBJECT;

            crossroads.bypassed.add(function(){
                self.unknownRouteHandler();
            });

            hasher.initialized.add(function(newHash /*, oldHash*/ ) {
                parseHash(self, newHash);
            });

            hasher.changed.add(function(newHash /*, oldHash*/ ) {
                parseHash(self, newHash);
            });
        }

        function navigate(self, url, queryParams) {

            var filteredRoutes = _.filter(self.routes,
                function(r) {
                    return r.url === url.toLowerCase();
                });

            //TODO: Supporter signedIn!
            var signedIn = false;

            var route = filteredRoutes[0];

            if (!route) {
                throw "No route has been found. Did you add one yet?";
            }

            if (filteredRoutes.length > 1) {
                route = _.first(filteredRoutes,
                    function(r) {
                        return r.requireAuthentication === signedIn;
                    });
            }

            if (route.requireAuthentication && !signedIn) {
                //todo: handle not authorized
                throw new Error('Framework.navigate - TODO: (FrameworkJS) not authorized');
            } else {
                route.params.queryParams = queryParams;
                route.params.parsedQueryString = frameworkUtilities.chrissRogersJQqueryDeparam(queryParams["?query_"], true);
                route.params.request = queryParams["request_"];
                route.params.queryString = queryParams["?query_"];

                //todo: si la route à un "loader" (funciton qui retourne une promesse - nom a déterminer (ex. activate)), lancer l'inititalisation... ;-) (durandal activate...)
                //afficher un loader jusqu'à la fin de l'activate
                //ou pas... la page peut afficher un loader et s'auto-initaliser...

                self.currentRoute(route);
            }
        }

        function parseHash(self, newHash) {
            self.hideCurrentDialog();

            crossroads.parse(newHash);
        }

        //var KEYCODE_ENTER = 13;
        var KEYCODE_ESC = 27;

        function registerOrUnregisterHideDialogKeyboardShortcut(self, isDialogOpen) {

            var hideCurrentDialog = function(e) {
                switch (e.keyCode) {
                    case KEYCODE_ESC:
                        self.hideCurrentDialog();
                        break;
                }
            };

            if (isDialogOpen) {
                self.$document.on('keydown', hideCurrentDialog);
            } else {
                self.$document.off('keydown', hideCurrentDialog);
            }
        }

        function buildComponentConfigFromPageConfig(name, pageConfig) {
            return {
                name: name + '-page',
                htmlOnly: pageConfig.htmlOnly,
                basePath: pageConfig.basePath,
                isBower: pageConfig.isBower,
                type: "page"
            };
        }

        function buildComponentConfigFromDialogConfig(name, dialogConfig) {
            return {
                name: name + '-dialog',
                htmlOnly: dialogConfig.htmlOnly,
                basePath: dialogConfig.basePath,
                isBower: dialogConfig.isBower,
                type: 'dialog'
            };
        }

        function buildComponentConfigFromModalConfig(name, modalConfig) {
            return {
                name: name + '-modal',
                htmlOnly: modalConfig.htmlOnly,
                basePath: modalConfig.basePath,
                isBower: modalConfig.isBower,
                type: 'modal'
            };
        }

        function applyDialogConventions(name, dialogConfig, componentConfig) {
            var finalDialogConfig = $.extend({}, dialogConfig);

            if (!finalDialogConfig.title) {
                finalDialogConfig.title = name;
            }

            finalDialogConfig.componentName = componentConfig.name;

            return finalDialogConfig;
        }

        function applyModalConventions(name, modalConfig, componentConfig) {
            var finalModalConfig = $.extend({}, modalConfig);

            if (!finalModalConfig.title) {
                finalModalConfig.title = name;
            }

            finalModalConfig.componentName = componentConfig.name;

            return finalModalConfig;
        }

        function buildRoute(name, pageConfig, componentConfig) {
            var route = {
                url: name,
                params: {},
                componentName: componentConfig.name,
                name: name,
                title: name,
                excludedFromNav: false,
                hideNav: false
            };

            if (pageConfig.hasOwnProperty('url') &&
                (typeof pageConfig.url === 'string' || pageConfig.url instanceof String)) {
                route.url = pageConfig.url.toLowerCase();
            }

            if (pageConfig.hasOwnProperty('title') &&
                (typeof pageConfig.title === 'string' || pageConfig.title instanceof String)) {
                route.title = pageConfig.title;
            }

            if (pageConfig.hasOwnProperty('params') &&
                (typeof pageConfig.params === 'object' ||
                    pageConfig.params instanceof Object)) {
                route.params = pageConfig.params;
            }

            if (pageConfig.hasOwnProperty('requireAuthentication') &&
                (typeof pageConfig.requireAuthentication === 'boolean' ||
                    pageConfig.requireAuthentication instanceof Boolean)) {
                route.requireAuthentication = pageConfig.requireAuthentication;
            }

            if (pageConfig.hasOwnProperty('excludedFromNav') &&
                (typeof pageConfig.excludedFromNav === 'boolean' ||
                    pageConfig.excludedFromNav instanceof Boolean)) {
                route.excludedFromNav = pageConfig.excludedFromNav;
            }

            if (pageConfig.hasOwnProperty('hideNav') &&
                (typeof pageConfig.hideNav === 'boolean' ||
                    pageConfig.hideNav instanceof Boolean)) {
                route.hideNav = pageConfig.hideNav;
            }

            route.hash = '#/' + route.url;

            return route;
        }

        function findByName(collection, name) {
            var result = _.find(collection, function(obj) {
                return obj.name === name;
            });

            return result || null;
        }

        function showModal(self, deferred, modal) {
            self.$modalElement.on('hidden.bs.modal', function( /*e*/ ) {
                self.currentModal(null);
                deferred.resolve(modal.data);
            });

            self.currentModal(modal);

            self.$modalElement.removeData('bs.modal').modal({
                backdrop: modal.backdrop,
                keyboard: modal.keyboard,
                show: true
            });

            var def = new $.Deferred();

            if (!self.$modalElement.hasClass('in')) {
                self.$modalElement.modal('show')
                    .on('shown.bs.modal', function( /*e*/ ) {
                        def.resolve(self.$modalElement);
                    });
            } else {
                def.resolve(self.$modalElement);
            }

            return def.promise();
        }

        function hideModal(self) {
            var deferred = new $.Deferred();

            // self.$modalElement.modal({
            //     show: false
            // });

            if (self.$modalElement.hasClass('in')) {
                self.$modalElement.modal('hide')
                    .on('hidden.bs.modal', function( /*e*/ ) {
                        deferred.resolve(self.$modalElement);
                    });
            } else {
                deferred.resolve(self.$modalElement);
            }

            return deferred.promise();
        }

        function getModalElement() {
            var $modalElement = $('modal');

            if ($modalElement.length < 1) {
                throw new Error('Framework.showModal - The modal component is missing in the page.');
            }

            if ($modalElement.length > 1) {
                throw new Error('Framework.showModal - There must be only one instance of the modal component in the page.');
            }

            return $modalElement;
        }

        function getDialogElement() {
            var $dialogsElement = $('dialogs');

            if ($dialogsElement.length < 1) {
                throw new Error('Framework.showDialog - Cannot show dialog if dialogs component is not part of the page.');
            }

            if ($dialogsElement.length > 1) {
                throw new Error('Framework.showDialog - Cannot show dialog if more than one dialogs component is part of the page.');
            }

            return $dialogsElement;
        }

        return new Framework();
    });
