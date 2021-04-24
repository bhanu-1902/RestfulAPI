// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Please refer {@link https://gitlab.industrysoftware.automation.siemens.com/Apollo/afx/wikis/configuration#adding-new-configuration-point|Adding new configuration point}
 *
 * @module js/configurationService
 * @publishedApolloService
 */
define( [
    'app',
    'lodash',
    'config/configurationMap'
], function( app, _, configMap ) {
    'use strict';

    /**
     * Map of base config file to promise for retrieving JSON file.
     *
     * @type {Object}
     * @private
     */
    var _ongoing = {};

    var exports = {
        config: {},
        map: configMap
    };

    /**
     * @param {Path} path - path
     * @param {Object} data - Value to set at the 'path' location in the configuration.
     * @ignore
     */
    exports.add = function( path, data ) {
        _.set( exports.config, path, data );
    };

    /**
     * Get cached configuration data.
     * This is only intended to be used by the bootstrap prior to NG module initialization.
     *
     * @param {String} path - path
     * @return {Object} request value if already cached
     * @ignore
     */
    exports.getCfgCached = function( path ) {
        return _.get( exports.config, path );
    };

    /**
     * @memberof NgServices
     * @member configurationService
     *
     * @param {$rootScope} $rootScope - Service to use.
     * @param {$q} $q - Service to use.
     * @param {$http} $http - Service to use.
     *
     * @returns {configurationService} Reference to the service API object.
     */
    app.factory( 'configurationService', [
        '$q', '$http', '$interpolate',
        function( $q, $http, $interpolate ) {

            /**
             * @param {Object} obj1 - base object
             * @param {Object} obj2 - object merge into base object
             */
            function merge( obj1, obj2 ) {
                _.forEach( obj2, function( value, key ) {
                    if( !obj1[ key ] ) {
                        obj1[ key ] = value;
                    } else {
                        merge( obj1[ key ], value );
                    }
                } );
            }

            return {
                /**
                 * Get configuration data for specified configuration path.
                 *
                 * @param {String} path Name of the Configuration (e.g. 'solutionDef')
                 * @return {Promise} promise This would resolve to configuration json
                 * @static
                 */
                getCfg: function( path ) {
                    var ndx = path.indexOf( '.' );
                    var basePath = ndx > -1 ? path.substring( 0, ndx ) : path;
                    if( _.has( exports.config, path ) ||
                        !( exports.map.bundle[ basePath ] ||
                            exports.map.default[ basePath ] ) &&
                        _.has( exports.config, basePath ) ) {
                        return $q.resolve( exports.getCfgCached( path ) );
                    }
                    var assetsPath = 'config/' + basePath;
                    var mergePath;
                    if( _.has( exports.map.bundle, path ) ) {
                        assetsPath = 'config/' + _.get( exports.map.bundle, path );
                        mergePath = basePath;
                    } else if( exports.map.default[ basePath ] ) {
                        mergePath = path;
                        assetsPath = exports.map.default[ basePath ].replace( /\*/, path.replace( /\./g, '/' ) );
                    }
                    if( !_ongoing[ assetsPath ] ) {
                        var context = {
                            relPath: path.split( '.' ).slice( 1 )
                        };
                        var httpGetPath = configMap.dynamicConfigRepoConfiguration && configMap.dynamicConfigRepoConfiguration[ basePath ] ?
                            $interpolate( configMap.dynamicConfigRepoConfiguration[ basePath ] )( context ) :
                            app.getBaseUrlPath() + '/' + assetsPath + '.json';
                        httpGetPath = app.getBaseUrlPath() + '/' + assetsPath + '.json';
                        _ongoing[ assetsPath ] = $http.get( httpGetPath ).then( function( response ) {
                            if( response && response.data ) {
                                var mergePoint = exports.config;
                                if( mergePath ) {
                                    mergePath.split( '.' ).forEach( function( elem ) {
                                        if( !mergePoint[ elem ] ) { mergePoint[ elem ] = {}; }
                                        mergePoint = mergePoint[ elem ];
                                    } );
                                }
                                merge( mergePoint, response.data );
                            }
                            delete _ongoing[ assetsPath ]; // not needed any more
                            return exports.getCfgCached( path );
                        } );
                    }
                    return $q( function( resolve, reject ) {
                        _ongoing[ assetsPath ].then( function() {
                            resolve( exports.getCfgCached( path ) );
                        }, reject );
                    } );
                }
            };
        }
    ] );

    return exports;
} );
