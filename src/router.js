define(["knockout", 'jquery', "crossroads", "hasher", "lodash", 'app/modal-utilities'],
    function(ko, $, crossroads, hasher, _, modalUtilities) {

        function Router(appContext) {
            var self = this;

            self.appContext = appContext;

            var uniqueUrls = _.uniq(_.map(appContext.routes, function(route) {
                return route.url.toLowerCase();
            }));

            ko.utils.arrayForEach(uniqueUrls, function(url) {
                crossroads.addRoute(url + ':?query:', function(requestParams) {
                    navigate(self, url, requestParams);
                });
            });

            return self;
        }

        Router.prototype.navigate = function(url) {
            var self = this;

            modalUtilities.hideAll().then(function() {
                if (url == hasher.getHash()) { //reload
                    navigate(self, url);
                } else {
                    hasher.setHash(url);
                }
            });
        };

        function navigate(self, url, queryParams) {
            var filteredRoutes = _.filter(self.appContext.routes,
                function(route) {
                    return route.url.toLowerCase() == url.toLowerCase();
                });

            //todo: handle 404
            var route = filteredRoutes[0];

            var signedIn = false;

            if (filteredRoutes.length > 1) {
                var okRoutes = _.filter(filteredRoutes,
                    function(currentRoute) {
                        return !!currentRoute.requireAuthentication == signedIn;
                    });

                //todo: handle 404
                if (okRoutes && okRoutes.length && okRoutes.length > 1) {
                    //todo: multiple ok routes

                    alert('multiple ok routes');
                    route = null;
                } else {
                    route = okRoutes[0];
                }
            }

            if (route.requireAuthentication && !signedIn) {
                //todo: handle not authorized

                alert('not authorized');
            } else {
                route.params.queryParams = queryParams;
                route.params.parsedQueryString = self.parseQueryString(queryParams["?query_"]);
                route.params.request = queryParams["request_"];
                route.params.queryString = queryParams["?query_"];

                //todo: si la route à un "loader" (funciton qui retourne une promesse - nom a déterminer), lancer l'inititalisation... ;-) (durandal activate...)
                //afficher un loader jusqu'à la fin de l'activate
                //ou pas... la page peut afficher un loader et s'auto-initaliser...

                self.appContext.currentRoute(route);
            }
        }

        /**
         * Parses a query string into an object.
         * @method parseQueryString
         * @param {string} queryString The query string to parse.
         * @return {object} An object keyed according to the query string parameters.
         */
        Router.prototype.parseQueryString = function(queryString) {
            return chrissRogersJQqueryDeparam(queryString, true);
        };

        //https://github.com/chrissrogers/jquery-deparam/blob/master/jquery-deparam.js
        function chrissRogersJQqueryDeparam(params, coerce) {
            var obj = {},
                coerce_types = {
                    'true': !0,
                    'false': !1,
                    'null': null
                };

            if (params) {
                // Iterate over all name=value pairs.
                $.each(params.replace(/\+/g, ' ').split('&'), function(j, v) {
                    var param = v.split('='),
                        key = decodeURIComponent(param[0]),
                        val,
                        cur = obj,
                        i = 0,
                        // If key is more complex than 'foo', like 'a[]' or 'a[b][c]', split it
                        // into its component parts.
                        keys = key.split(']['),
                        keys_last = keys.length - 1;

                    // If the first keys part contains [ and the last ends with ], then []
                    // are correctly balanced.
                    if (/\[/.test(keys[0]) && /\]$/.test(keys[keys_last])) {
                        // Remove the trailing ] from the last keys part.
                        keys[keys_last] = keys[keys_last].replace(/\]$/, '');

                        // Split first keys part into two parts on the [ and add them back onto
                        // the beginning of the keys array.
                        keys = keys.shift().split('[').concat(keys);

                        keys_last = keys.length - 1;
                    } else {
                        // Basic 'foo' style key.
                        keys_last = 0;
                    }

                    // Are we dealing with a name=value pair, or just a name?
                    if (param.length === 2) {
                        val = decodeURIComponent(param[1]);

                        // Coerce values.
                        if (coerce) {
                            val = val && !isNaN(val) ? +val // number
                                : val === 'undefined' ? undefined // undefined
                                : coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
                                : val; // string
                        }

                        if (keys_last) {
                            // Complex key, build deep object structure based on a few rules:
                            // * The 'cur' pointer starts at the object top-level.
                            // * [] = array push (n is set to array length), [n] = array if n is 
                            //   numeric, otherwise object.
                            // * If at the last keys part, set the value.
                            // * For each keys part, if the current level is undefined create an
                            //   object or array based on the type of the next keys part.
                            // * Move the 'cur' pointer to the next level.
                            // * Rinse & repeat.
                            for (; i <= keys_last; i++) {
                                key = keys[i] === '' ? cur.length : keys[i];
                                cur = cur[key] = i < keys_last ? cur[key] || (keys[i + 1] && isNaN(keys[i + 1]) ? {} : []) : val;
                            }

                        } else {
                            // Simple key, even simpler rules, since only scalars and shallow
                            // arrays are allowed.

                            if ($.isArray(obj[key])) {
                                // val is already an array, so push on the next value.
                                obj[key].push(val);

                            } else if (obj[key] !== undefined) {
                                // val isn't an array, but since a second value has been specified,
                                // convert val into an array.
                                obj[key] = [obj[key], val];

                            } else {
                                // val is a scalar.
                                obj[key] = val;
                            }
                        }

                    } else if (key) {
                        // No value was defined, so set something meaningful.
                        obj[key] = coerce ? undefined : '';
                    }
                });
            }

            return obj;
        };


        Router.prototype.navigate = function(destination) {
            hasher.setHash(destination);
        };

        Router.prototype.changeHashSilently = function(destination) {
            hasher.changed.active = false;
            hasher.setHash(destination);
            hasher.changed.active = true;
        };

        Router.prototype.addUnknownRouteHandler = function(handler) {
            crossroads.bypassed.add(handler);
            return this;
        };

        Router.prototype.init = function(appContext) {
            function parseHash(newHash, oldHash) {
                if (appContext.isDialogOpen()) {
                    appContext.hideCurrentDialog();
                }

                //     hasher.changed.active = false; //disable changed signal
                //     hasher.setHash(oldHash); //set hash without dispatching changed signal
                //     hasher.changed.active = true; //re-enable signal
                // } else {
                crossroads.parse(newHash);
                // }
            }

            crossroads.normalizeFn = crossroads.NORM_AS_OBJECT;
            hasher.initialized.add(parseHash);
            hasher.changed.add(parseHash);
            hasher.init();

            return this;
        }

        return Router;
    });
