// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/constantsService
 */
define( [ 'app', 'lodash', //
        'soa/kernel/soaService'
    ], //
    function( app, _ ) {
        'use strict';

        var _soaSvc;

        var exports = {};

        /**
         * @private
         */
        exports._cache = {
            globalConstant: {},
            typeConstant: {}
        };

        /**
         * @param {String} typeName - type name
         * @param {String} constantName - constant name
         * @return {String} type constant value
         */
        exports.getConstantValue = function( typeName, constantName ) {
            if( exports._cache.typeConstant.hasOwnProperty( typeName ) ) {
                var typeConstants = exports._cache.typeConstant[ typeName ];
                if( typeConstants.hasOwnProperty( constantName ) ) {
                    return typeConstants[ constantName ];
                }
            }
            return null;
        };

        /**
         * @param {StringArray} keys - array of global constant names
         * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
         *          data is available.
         */
        exports.getGlobalConstantValues2 = function( keys ) {
            return _soaSvc.post( 'BusinessModeler-2011-06-Constants', 'getGlobalConstantValues2', {
                keys: keys
            } ).then( function( response ) {
                if( response.constantValues ) {
                    _.forEach( response.constantValues, function( constantValue ) {
                        exports._cache.globalConstant[ constantValue.key ] = constantValue.value;
                    } );
                }
                return response;
            } );
        };

        /**
         * @param {StringArray} keys - array of type constant keys
         * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
         *          data is available.
         */
        exports.getTypeConstantValues = function( keys ) {
            return _soaSvc.post( 'BusinessModeler-2007-06-Constants', 'getTypeConstantValues', {
                keys: keys
            } ).then( function( response ) {
                if( response.constantValues ) {
                    _.forEach( response.constantValues, function( constantValue ) {
                        var typeName = constantValue.key.typeName;
                        if( !exports._cache.typeConstant.hasOwnProperty( typeName ) ) {
                            exports._cache.typeConstant[ typeName ] = {};
                        }
                        var typeConstants = exports._cache.typeConstant[ typeName ];
                        typeConstants[ constantValue.key.constantName ] = constantValue.value;
                    } );
                }
                return response;
            } );
        };

        /**
         * TODO
         *
         * @memberof NgServices
         * @member soa_constantsService
         */
        app.factory( 'soa_constantsService', //
            [ 'soa_kernel_soaService', //
                function( soaSvc ) {
                    _soaSvc = soaSvc;

                    return exports;
                }
            ] );

        return {
            moduleServiceNameToInject: 'soa_constantsService'
        };
    } );
