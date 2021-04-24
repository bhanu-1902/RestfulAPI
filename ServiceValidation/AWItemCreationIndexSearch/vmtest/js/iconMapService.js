// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/iconMapService
 */
define( [
    'app', 'lodash',
    'js/configurationService'
], function( app, _ ) {
    'use strict';

    /**
     * This service allows site specific model types (and other icons) to be mapped to actual icon file definitions.
     *
     * @memberof NgServices
     * @member iconMapService
     *
     * @param {configurationService} cfgSvc - Service to use.
     *
     * @returns {iconMapService} Reference to service API Object.
     */
    app.factory( 'iconMapService', [
        'configurationService',
        function( cfgSvc ) {
            var exports = {};

            var _aliasRegistry;
            cfgSvc.getCfg( 'aliasRegistry' ).then( function( aliasRegistry ) {
                _aliasRegistry = aliasRegistry;
            } );

            var _typeFiles;
            cfgSvc.getCfg( 'typeFiles' ).then( function( typeFiles ) {
                _typeFiles = typeFiles;
            } );

            /**
             * Check if the given iconName is an alias name for the actual icon filename.
             *
             * @param {String} iconName - The name of the icon to any final iconName for.
             * @return {String} Final icon file name.
             */
            exports.resolveIconName = function( iconName ) {
                var key = iconName;
                if( iconName && _aliasRegistry ) {
                    key = _aliasRegistry[ iconName ];
                    if( !key ) {
                        key = iconName;
                    }
                }
                return key;
            };

            /**
             * Return the name of the (SVG) file associated with the given type name (or NULL if the file is not cached).
             *
             * @param {String} typeName - Name of the type to return an icon filename for.
             * @return {String} The filename that contains the description of the icon defined for the given type.
             */
            exports.getTypeFileName = function( typeName ) {
                if( _typeFiles ) {
                    var key = exports.resolveIconName( 'type' + typeName );
                    if( _.indexOf( _typeFiles, key, true ) > -1 ) {
                        return key + '.svg';
                    }

                    // If alias doesn't indicate the number try adding it.
                    key += '48';
                    if( _.indexOf( _typeFiles, key, true ) > -1 ) {
                        return key + '.svg';
                    }
                }
                return null;
            };

            return exports;
        }
    ] );

    /**
     * Since this module can be loaded GWT-side by the ModuleLoader class we need to return an object indicating
     * which service should be injected to provide the API for this module.
     */
    return {
        moduleServiceNameToInject: 'iconMapService'
    };
} );
