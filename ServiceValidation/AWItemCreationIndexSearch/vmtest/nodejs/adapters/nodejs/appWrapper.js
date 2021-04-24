// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define require requirejs */

'use strict';

/**
 * @module js/adapters/nodejs/appWrapper
 */
define( [ 'lodash', 'js/logger' ], function( _, logger ) {
    var exports = {};

    var _ngModules = {};

    /**
     * Singleton injector for this appWrapper.
     */
    var injector = {
        get: function( ngModuleName ) {
            return _ngModules[ ngModuleName ];
        }
    };

    /**
     * NG Module injector
     */
    exports.getInjector = function() {
        return injector;
    };

    /**
     * Adds an AngularJS injectable 'service' definition to this application.
     *
     * @param {String} ngModuleName - Name of the 'factory' being registered.
     * @param {Function} args - Function that implements the 'service'.
     */
    exports.factory = function( ngModuleName, args ) {
        if( _.isFunction( args ) ) {
            _ngModules[ ngModuleName ] = args();
        } else if( _.isArray( args ) ) {
            var argsLp = [];
            _.forEach( args, function( implLp ) {
                if( _.isString( implLp ) ) {
                    if( !_ngModules[ implLp ] ) {
                        switch( implLp ) {
                            case '$q':
                                _ngModules[ implLp ] = require( 'q' );
                                break;
                            case '$http':
                                _ngModules[ implLp ] = requirejs( 'nodejs/adapters/nodejs/httpWrapper' );
                                break;
                            case '$rootScope':
                                _ngModules[ implLp ] = {
                                    $on: function() {
                                        // do nothing
                                    }
                                };
                                break;
                            case '$state':
                                _ngModules[ implLp ] = {
                                    params: []
                                };
                                break;
                            case '$filter':
                                _ngModules[ implLp ] = function() {
                                    return function() {
                                        // do nothing
                                    };
                                };
                                break;
                            case '$injector':
                            case '$locale':
                                // ignore
                                break;
                            default:
                                logger.error( 'NG Module not registered - ' + implLp );
                                return;
                        }
                    }
                    argsLp.push( _ngModules[ implLp ] );
                } else if( _.isFunction( implLp ) ) {
                    _ngModules[ ngModuleName ] = implLp.apply( this, argsLp );
                    return true; // break out
                } else {
                    logger.error( 'Invalid entry in NG module registration for ' + ngModuleName );
                }
            } );
        }
    };

    /**
     * Adds an AngularJS 'controller' definition to this application.
     *
     * @param {String} name - Name of the 'controller' being registered.
     * @param {Function} impl - Function that implements the 'controller'.
     */
    exports.controller = exports.factory;

    /**
     * Adds an AngularJS 'directive' definition to this application.
     *
     * @param {String} name - Name of the 'directive' being registered.
     * @param {Function} impl - Function that returns the 'directive' definition object.
     */
    exports.directive = exports.factory;

    /**
     * Adds an AngularJS 'filter' definition to this application.
     *
     * @param {String} name - Name of the 'filter' being registered.
     * @param {Function} impl - Function that implements the 'filter'.
     */
    exports.filter = exports.factory;

    /**
     * Adds an AngularJS injectable 'service' for this application.
     *
     * @param {String} name - Name of the 'service' being registered.
     * @param {Function} impl - Function that implements the 'service'.
     */
    exports.service = exports.factory;

    /**
     * Adds an AngularJS injectable 'constant' for this application.
     *
     * @param {String} name - Name of the 'constant' being registered.
     * @param {Object} impl - The constant object.
     */
    exports.constant = exports.factory;

    /**
     * @returns {Boolean} TRUE if the application is being run in a 'hosted' mode.
     */
    exports.isHostingEnabled = function() {
        return false;
    };

    /**
     * @returns {Object} A reference to the optional 'hostSupportService' module loaded when the application is being
     *          run in a 'hosted' mode.
     */
    exports.getHostSupportService = function() {
        return null;
    };

    exports.getBaseUrlPath = function() {
        return 'http://localhost';
    };

    return exports;
} );
