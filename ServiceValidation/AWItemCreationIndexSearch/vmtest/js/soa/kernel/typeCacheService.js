// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define location */

/**
 * This is the typeCacheService.
 *
 * The purpose of this service is to store commonly used types in localStorage.
 *
 * @module soa/kernel/typeCacheService
 */
define( [
    'app',
    'lodash',
    'js/localStorage',
    'lzstring',
    'js/localeService'
], function( app, _, localStrg, lzstring ) {
    'use strict';

    /**
     * Object used to place all the exported API of this module upon.
     */
    var exports = {};

    /**
     * localStorage type cache.
     *
     * @private
     */
    var _localPropTypes = "propertyTypes";

    /**
     * localeService
     *
     * @private
     */
    var _localeSvc;

    /**
     * Key used to determine the validity of a previously stored cache.
     * Used to store an object with typeCacheLMD and locale properties
     * If the typeCacheLMD or Locale change we must flush the cache.
     *
     * @private
     */
    var _localPropTypesKey = "propertyTypesKey";

    /**
     * Timer variable.
     *
     * @private
     */
    var _storageTimer;

    /**
     * Types to cache.
     *
     * @private
     */
    var _typesToCache = [];

    /**
     * SaveToLocalStorage delay time in milliseconds .
     *
     * @private
     */
    var _saveToLSTime = 60000;

    /**
     * Types cache timestamp
     *
     * @private
     */
    var _typeCacheLMD;

    /**
     * Checks to see if an object with the same name already exists.
     *
     * @param {StringArray} typeArray - Modeltypes to check.
     * @param {String} name - Name of the type to check.
     *
     * @returns {Boolean} TRUE if an object with the same name already exists.
     */
    function containsTypeDesc( typeArray, name ) {
        var found = false;
        for( var i = 0; i < typeArray.length; i++ ) {
            if( typeArray[ i ].name === name ) {
                found = true;
                break;
            }
        }
        return found;
    }

    /**
     * Saves any valid types added to _typesToCache to localStorage.
     */
    function saveToLocalStorage() {
        _storageTimer = null;
        var locale = _localeSvc.getLocale();
        var localTypes = [];
        if( localStrg.get( _localPropTypes ) ) {
            var decompressedStr = lzstring.decompressFromUTF16( localStrg.get( _localPropTypes ) );
            localTypes = JSON.parse( decompressedStr );
        }
        for( var i = 0, len = _typesToCache.length; i < len; i++ ) {
            if( !containsTypeDesc( localTypes, _typesToCache[ i ].name ) ) {
                localTypes.push( _typesToCache[ i ] );
            }
        }

        var typesKey = {
            "locale": locale,
            "typeCacheLMD": _typeCacheLMD
        };

        var compressedStr = lzstring.compressToUTF16( JSON.stringify( localTypes ) );
        localStrg.publish( _localPropTypes, compressedStr );
        localStrg.publish( _localPropTypesKey, JSON.stringify( typesKey ) );

        //Clear out array of types to cache.
        _typesToCache = [];
    }

    /**
     * Returns any typeDescriptions stored in localStorage
     *
     * @param {Number} typeCacheLMD - Last modified date of the cached local storage data.
     *
     * @return {ObjectArray} Type Descriptors.
     */
    exports.getLocalTypes = function( typeCacheLMD ) {
        var localTypes = [];
        var locale = _localeSvc.getLocale();
        if( localStrg.get( _localPropTypesKey ) ) {
            var currentKey = JSON.parse( localStrg.get( _localPropTypesKey ) );
            //If the typeCacheLMD or the locale have changed we need to flush cached properties.
            if( currentKey && ( ( currentKey.locale !== locale ) || ( currentKey.typeCacheLMD !== typeCacheLMD ) ) ) {
                localStrg.removeItem( _localPropTypes );
                localStrg.removeItem( _localPropTypesKey );
                return localTypes;
            }
        }
        if( localStrg.get( _localPropTypes ) ) {
            var decompressedStr = lzstring.decompressFromUTF16( localStrg.get( _localPropTypes ) );
            localTypes = JSON.parse( decompressedStr );
        }
        return localTypes;
    };

    /**
     * Adds type descriptors to _typesToCache if they are included
     * in the awStartupPreferences.
     * If delayed storage is set to true as soon as the first type descriptor is added
     * a 60 second timer will begin before calling saveToLocalStorage.
     * Add subsequent calls during this 60 seconds will add types to
     * the _typesToCache.
     * After the timer has finished and the saveToLocalStorage is made
     * everything is reset.
     * If delayedStorage is not set, the saveToLocalStorage will be immediate.
     *
     * @param {Array} modelTypes - An array of type descriptors to potentially cache.
     *
     * @param {StringArray} awStartupPreferences - A string array of type descriptors to cache.
     *
     * @param {String} typeCacheLMD - A string with typeCacheLMD timestamp.
     *
     * @param {boolean} delayedStorage - A boolean to set delayed storage on or off.
     */
    exports.setLocalTypes = function( modelTypes, awStartupPreferences, typeCacheLMD, delayedStorage ) {
        _typeCacheLMD = typeCacheLMD;
        modelTypes.forEach( function( element ) {
            if( _.includes( awStartupPreferences, element.name ) ) {
                if( !containsTypeDesc( _typesToCache, element.name ) ) {
                    _typesToCache.push( element );
                }
            }
        } );

        if( delayedStorage ) {
            if( ( _typesToCache && _typesToCache.length > 0 ) && !_storageTimer ) {
                //We are using setTimeout instead of $timeout
                //as we do not care about the digest cycle.
                _storageTimer = setTimeout( saveToLocalStorage, _saveToLSTime );
            }
        } else {
            saveToLocalStorage();
        }
    };

    /**
     * service factory method
     *
     * @memberof NgServices
     * @member typeCacheService
     *
     * @param {localeService} localeSvc - Service to use.
     *
     * @returns {typeCacheService} Reference to this service.
     */
    app.factory( 'typeCacheService', [ 'localeService', function( localeSvc ) {
        _localeSvc = localeSvc;
        return exports;
    } ] );

    return exports;
} );
