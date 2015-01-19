define(['jquery', 'knockout', 'lodash', './ko/missingFeatures'],
    function($, ko, _, koMissingFeatures) {

        var KEYCODE_ENTER = 13;
        var KEYCODE_ESC = 27;

        function AppContext() {
            var self = this;

            //TODO: Attention : document may not be ready?
            var $document = $(document);

            $document.ready(function() {
                //TODO: NE pas enregistrer cet event ici... 
                //l'enregistrer seulement si y'a un dialog d'ouvert
                $document.keydown(function(e) {
                    switch (e.keyCode) {
                        case KEYCODE_ESC:
                            self.hideCurrentDialog();
                            break;
                    }
                });
            });

            self.routes = [];
            self.dialogConfigs = [];
            self.currentRoute = ko.observable(null);
            self.displayedDialogs = ko.observableArray([]);

            self.currentDialog = ko.computed(function() {
                var displayedDialogs = self.displayedDialogs();

                if (displayedDialogs.length) {
                    return displayedDialogs[displayedDialogs.length - 1];
                }

                return null;
            });

            self.isDialogOpen = ko.computed(function() {
                return !!self.currentDialog();
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


            //TODO: ?
            //Permet d'afficher un dialog si ?dialog=dialog_name
            // self.currentRoute.subscribe(function(route) {
            //     if (route.dialog) {
            //         self.showDialog(route.dialog);
            //     }
            // });
        }

        AppContext.prototype.showDialog = function(name, params) {
            var deferred = new $.Deferred();
            var self = this;

            var dialogConfigToShow = findByName(self.dialogConfigs, name);

            if (!dialogConfigToShow) {
                throw new Error('AppContext.showDialog - Unregistered dialog: ' + name);
            }

            var dialog = {
                settings: {
                    close: function(data) {
                        self.displayedDialogs.remove(dialog);

                        if (self.currentDialog()) {
                            self.currentDialog().visible(true);
                        }

                        //todo: attendre apres dialog removed from html...
                        //important de le faire apres que le dialog soit enlever car
                        //la position peut ne pas etre disponible dans le dialog
                        //ceci dit... ca pourrait causer des problemes avec le paging...
                        //il faudrit bloquer le paging tant que le scroll position n'a pas été rétabli
                        $(document).scrollTop(dialog.previousScrollPosition);


                        deferred.resolve(data);
                    },
                    params: params,
                    title: dialogConfigToShow.title
                },
                componentName: dialogConfigToShow.componentName,
                visible: ko.observable(true),
                previousScrollPosition: $(document).scrollTop()
            };

            if (self.currentDialog()) {
                self.currentDialog().visible(false);
            }

            self.displayedDialogs.push(dialog);

            return deferred.promise();
        };

        AppContext.prototype.hideCurrentDialog = function() {
            var currentDialog = this.currentDialog();

            if (currentDialog) {
                currentDialog.close();
            }
        };

        AppContext.prototype.registerPage = function(pageConfig) {
            if (!pageConfig.name) {
                throw new Error('AppContext.registerPage - Argument missing exception: name');
            }

            var componentConfig = buildComponentConfigFromPageConfig(pageConfig);
            this.registerComponent(componentConfig);

            var route = buildRoute(pageConfig, componentConfig);
            this.routes.push(route);
        };

        AppContext.prototype.registerDialog = function(dialogConfig) {
            if (!dialogConfig.name) {
                throw new Error('AppContext.registerDialog - Argument missing exception: name');
            }

            var componentConfig = buildComponentConfigFromDialogConfig(dialogConfig);
            this.registerComponent(componentConfig);

            var finalDialogConfig = applyDialogConventions(dialogConfig, componentConfig);

            this.dialogConfigs.push(finalDialogConfig);
        };

        //Registers a ko component with Radio-Canada conventions
        AppContext.prototype.registerComponent = function(componentConfig) {
            if (!componentConfig.name) {
                throw new Error('AppContext.registerComponent - Argument missing exception: name');
            }

            if (ko.components.isRegistered(componentConfig.name)) {
                throw new Error('AppContext.registerComponent - Already registered component: ' + componentConfig.name);
            }

            var requirePath = 'components/' + componentConfig.name + '/' + componentConfig.name;

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

            ko.components.register(componentConfig.name, koComponentConfig);
        };

        function buildComponentConfigFromPageConfig(pageConfig) {
            return {
                name: pageConfig.name + '-page'
            };
        }

        function buildComponentConfigFromDialogConfig(dialogConfig) {
            return {
                name: dialogConfig.name + '-dialog'
            };
        }

        function applyDialogConventions(dialogConfig, componentConfig) {
            var finalDialogConfig = $.extend({}, dialogConfig);

            if (!finalDialogConfig.title) {
                finalDialogConfig.title = finalDialogConfig.name;
            }

            finalDialogConfig.componentName = componentConfig.name;

            return finalDialogConfig;
        }

        function buildRoute(pageConfig, componentConfig) {
            var route = {
                url: pageConfig.name,
                params: {},
                componentName: componentConfig.name,
                name: pageConfig.name,
                title: pageConfig.name,
                excludedFromNav: false,
                hideNav: false
            };

            if (pageConfig.hasOwnProperty('url') &&
                (typeof pageConfig.url === 'string' || pageConfig.url instanceof String)) {
                route.url = pageConfig.url;
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

        return new AppContext();
    });
