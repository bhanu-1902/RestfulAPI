// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * The methods provided by this module enable access, control and maintenance of a cache of ModelObjects as well as
 * their member PropertyObjects.
 *
 * @module soa/kernel/clientDataModel
 */
define( [
    'app',
    'lodash',
    'js/logger',
    'js/eventBus',
    //
    'soa/kernel/clientMetaModel',
    'js/dateTimeService',
    'js/localeService',
    'js/sanitizer'
], function( app, _, logger, eventBus ) {
    'use strict';

    /**
     * Marker text within a value used to indicate when a property contains a UTC date/time that needs to be converted
     * to to local time zone and session specfici format.
     *
     * @private
     */
    var UTC_DATE_TIME_MARKER = '{__UTC_DATE_TIME}'; //$NON-NLS-1$

    /**
     * UID to indicate the identity of an object is 'unknown'.
     */
    var _NULL_UID = 'AAAAAAAAAAAAAA';

    /**
     * A reference to service.
     */
    var _cmm;

    /**
     * A reference to sanitizer.
     */
    var _sanitizer;

    /**
     * Note: We are holding on to the resolved module now for when we are running NodeJS. However, this variable will be
     * set again when this service is created using AngularJS injection. The reason is that the 'dateTimeService' needs
     * some other AngularJS services injected to do all its work. It will use fallback values when running in NodeJS.
     *
     * @private
     */
    var _dateTimeSvc;

    /**
     * Object used to implement a UID-to-ModelObject cache map.
     *
     * @private
     */
    var _uid2modelObject = {};

    /**
     * The array of none flushable object types.
     *
     * @private
     */
    var _noFlushableTypes = [
        'Awb0ProductContextInfo',
        'Awp0GatewayTileRel',
        'Awp0Tile',
        'Fnd0ClientScope',
        'Fnd0Command',
        'Fnd0CommandCollection',
        'Fnd0ConditionHelper',
        'Fnd0HomeFolder',
        'Fnd0Icon',
        'Fnd0UIConfigCollectionRel',
        'Group',
        'GroupMember',
        'ImanVolume',
        'POM_imc',
        'Role',
        'User',
        'UserSession'
    ];

    /**
     * UID of the current 'User' ModelObject.
     *
     * @private
     */
    var _userUID = '';

    /**
     * UID of the current 'Session' ModelObject.
     *
     * @private
     */
    var _userSessionUID = '';

    /**
     * UID of the current user's 'Group' ModelObject.
     *
     * @private
     */
    var _groupMemberUID = '';

    /**
     * @param {Object} modelObjectSOA - model object returned from SOA
     */
    function ModelObject( modelObjectSOA ) {
        this.props = modelObjectSOA.props || {};
        this.type = modelObjectSOA.type;
        this.uid = modelObjectSOA.uid;

        // add meta model link
        this.modelType = _cmm.getType( modelObjectSOA.type );

        _updateProps( this.props, this.modelType );
    }

    /**
     * This method is set on (augments) all {ModelObject} instance returned by SOA so that it is available for general
     * application use.
     *
     * @return {String} Text value that represents a common way to identify the function's context object (i.e. The
     *         'object_string' property) or the JSON 'stringify' version of the content object if the specific common
     *         property if not defined.
     */
    ModelObject.prototype.toString = function() {
        if( this.props && this.props.object_string ) {
            return this.props.object_string.uiValues[ 0 ];
        }
        return JSON.stringify( this, null, 2 );
    };

    /**
     * This method is set on (augments) all {PropertyObject} instances returned by SOA so that it is available for
     * general application use.
     *
     * @return {String[]} the name of all property's display value. If this property has multiple values, this method
     *         will return the first display value.
     */
    ModelObject.prototype.getPropertyNames = function() {
        return _.keys( this.props );
    };

    /**
     * Add reference count for model object.
     */
    ModelObject.prototype.addReference = function() {
        if( !this.reference ) { this.reference = 0; }
        this.reference++;
    };

    /**
     * Remove reference count from model object.
     */
    ModelObject.prototype.removeReference = function() {
        this.reference--;
        if( this.reference < 1 ) { delete this.reference; }
    };

    /**
     * @param {Object} propSOA - property object returned from SOA
     * @param {PropertyDescriptor} propertyDescriptor - property descriptor
     */
    function Property( propSOA, propertyDescriptor ) {
        _conditionSoaPropValue( propSOA, propertyDescriptor, this );

        this.propertyDescriptor = propertyDescriptor;
    }

    /**
     * Apply some common data value transformations on the 'propToUpdate' based on the values in the 'propSOA'.
     *
     * @param {Object} propSOA - Property object returned from SOA
     * @param {PropertyDescriptor} propertyDescriptor - Property descriptor.
     * @param {Object} propToUpdate - Property object to be updated.
     */
    function _conditionSoaPropValue( propSOA, propertyDescriptor, propToUpdate ) {
        propToUpdate.dbValues = propSOA.dbValues || [];
        propToUpdate.isNulls = propSOA.isNulls;
        propToUpdate.modifiable = propSOA.modifiable;
        propToUpdate.uiValues = propSOA.uiValues || [];

        /**
         * Assure certain properties are never 'null' or 'undefined'
         */
        if( propSOA.isNulls ) {
            /**
             * We want to make sure the 'dbValues' match the SOA supplied definition of 'null'.
             */
            for( var ndx = propSOA.isNulls.length - 1; ndx >= 0; ndx-- ) {
                if( propSOA.isNulls[ ndx ] && propToUpdate.dbValues.length > ndx ) {
                    propToUpdate.dbValues[ ndx ] = null;
                }
            }
        }

        /**
         * Perform some type specific post processing of the property values.
         */
        switch( propertyDescriptor.valueType ) {
            case 2: // Date
                /**
                 * Date processing...Reformat UI value based upon DB value.
                 * <P>
                 * Note: This also makes the UI value be for the local time zone instead of the server's time zone.
                 */
                // Only set if server gave the client a non-empty UI values array
                if( propSOA.uiValues && propSOA.uiValues.length > 0 && propSOA.uiValues[ 0 ] ) {
                    // Only attempt if we have a DB value...
                    if( propSOA.dbValues.length > 0 ) {
                        _.forEach( propSOA.dbValues, function( dbValue, dbNdx ) {
                            var jqDate = new Date( dbValue );

                            propToUpdate.uiValues[ dbNdx ] = _dateTimeSvc.formatSessionDateTime( jqDate );
                        } );
                    } else {
                        propToUpdate.uiValues[ 0 ] = '';
                    }
                }
                break;
            case 8: // String
                if( propertyDescriptor.name !== 'fnd0SVG' ) {
                    // Sanitize the String DB values
                    propToUpdate.dbValues = _sanitizer.sanitizeHtmlValues( propToUpdate.dbValues );
                    // Sanitize the String UI values
                    propToUpdate.uiValues = _sanitizer.sanitizeHtmlValues( propToUpdate.uiValues );
                }

                if( propertyDescriptor.name === 'awp0CellProperties' ) {
                    propToUpdate.dbValues = _convertUTCTimeValues( propToUpdate.dbValues );
                    propToUpdate.uiValues = _convertUTCTimeValues( propToUpdate.uiValues );
                }
                break;
        }
    }

    /**
     * This method is set on (augments) all {PropertyObject} instances returned by SOA so that it is available for
     * general application use.
     *
     * @return {String} Gets the property's display value. If this property has multiple values, this method will return
     *         the first display value.
     */
    Property.prototype.getDisplayValue = function() {
        if( this.uiValues && this.uiValues.length > 0 ) {
            return this.uiValues[ 0 ];
        }
        return '';
    };

    /**
     * This method is set on (augments) all {PropertyObject} instances returned by SOA so that it is available for
     * general application use.
     *
     * @return {Boolean} TRUE if ALL the internal values (aka 'dbValues') of the function's context object are to be
     *         considered 'null' or 'unset'.
     *         <P>
     *         If the 'isNulls' array is present, all its values will be used to determine the result. If any are
     *         'false' this function will return 'false' (i.e. property is NOT null).
     *         <P>
     *         If 'isNulls' is not present, we assume the 'dbValues' are NOT null.
     *         <P>
     *         Note: The intrinsic data types (boolean, int, double) can have a value (i.e. 'false' or 'zero') but still
     *         be 'unset'. In this case, the SOA server will send back an optional array of booleans named 'isNulls',
     *         the 'true/false' values in this array indicate while elements in the 'dbValues' array should be
     *         considered 'unset'.
     */
    Property.prototype.evaluateIsNull = function() {
        /**
         * Check if the server told us this context object (property) dbValue was to be considered 'null' or 'unset'.
         */
        if( this.isNulls ) {
            for( var ndx = 0; ndx < this.isNulls.length; ndx++ ) {
                if( !this.isNulls[ ndx ] ) {
                    return false;
                }
            }
            return true;
        }
        return false;
    };

    /**
     * Replace any occurrences of UTC date/time values with the {@link #UTC_DATE_TIME_MARKER} with the date/time in the
     * local time zone.
     *
     * @private
     *
     * @param {String[]} values - Array of values to consider.
     * @return {String[]} Array if values after replacement of any strings.
     */
    var _convertUTCTimeValues = function( values ) {
        if( !_dateTimeSvc ) {
            _dateTimeSvc = app.getInjector().get( 'dateTimeService' );
        }

        for( var iNdx = 0; iNdx < values.length; iNdx++ ) {
            var value = values[ iNdx ];

            var markerNdx = value.indexOf( UTC_DATE_TIME_MARKER );

            if( markerNdx !== -1 ) {
                var prefix = value.substring( 0, markerNdx );
                var utc = value.substring( markerNdx + UTC_DATE_TIME_MARKER.length );

                var date = new Date( utc );

                values[ iNdx ] = prefix + _dateTimeSvc.formatSessionDateTime( date );
            }
        }

        return values;
    };

    /**
     * Update properties. This includes adding references to meta model & dealing with date conversions.
     *
     * @param {Object} props - model object properties
     * @param {ModelType} modelType - model type from meta model
     */
    var _updateProps = function( props, modelType ) {
        if( !_dateTimeSvc ) {
            _dateTimeSvc = app.getInjector().get( 'dateTimeService' );
        }

        _.forEach( props, function( value, propName ) {
            props[ propName ] = new Property( value, modelType.propertyDescriptorsMap[ propName ] );
        } );
    };

    /**
     * Define the base object used to provide all of this module's external API on.
     *
     * @private
     */
    var exports = {};

    /**
     * @param {String} uid - UID of ModelObject to test for.
     *
     * @return {boolean} TRUE if client data model contains the given ModelObject
     */
    exports.containsObject = function( uid ) {
        return _uid2modelObject.hasOwnProperty( uid );
    };

    /**
     * Get model object.
     *
     * @param {String} uid - UID of ModelObject
     * @return {ModelObject} The ModelObject; null if not cached
     */
    exports.getObject = function( uid ) {
        if( exports.containsObject( uid ) ) {
            return _uid2modelObject[ uid ];
        }
        return null;
    };

    /**
     * Get model objects.
     *
     * @param {String[]} uids - array of ModelObject UIDs
     * @return {ModelObject} The ModelObject; null if not cached
     */
    exports.getObjects = function( uids ) {
        var objects = [];
        _.forEach( uids, function( uid ) {
            objects.push( exports.getObject( uid ) );
        } );
        return objects;
    };

    /**
     * Remove the ModelObject from the cache that have the given UIDs. Publishes the UIDs to the 'soajs/cdm.deleted'
     * eventBus channel/topic.
     *
     * @param {String[]} deletedUIDs - Array of UIDs to be removed from the cache.
     */
    exports.removeObjects = function( deletedUIDs ) {
        var uids = [];
        _.forEach( deletedUIDs, function( deletedUID ) {
            if( exports.containsObject( deletedUID ) ) {
                delete _uid2modelObject[ deletedUID ];
                uids.push( deletedUID );
            }
        } );

        if( uids.length > 0 ) {
            eventBus.publish( 'cdm.deleted', {
                deletedObjectUids: uids
            } );
        }
    };

    /**
     * @param {ModelObject} userSession - user session
     */
    var setUserSession = function( userSession ) {
        _userSessionUID = userSession.uid;

        // For refresh scenario, signin isn't call & these 2 fields need to be set.
        if( userSession.props ) {
            if( userSession.props.user ) {
                _userUID = userSession.props.user.dbValues[ 0 ];
            }
            if( userSession.props.fnd0groupmember ) {
                _groupMemberUID = userSession.props.fnd0groupmember.dbValues[ 0 ];
            }
        }
    };

    /**
     * Add or replace the given ModelObjects to the cache. Publishes the modelObjects to the 'soajs/cdm.modified'
     * eventBus channel/topic.
     *
     * @param {ModelObject[]} modelObjects - Array of 'wire' ModelObject to be added to the cache.
     */
    exports.cacheObjects = function( modelObjects ) {
        var newObjects = [];
        var modifiedObjects = [];

        _.forEach( modelObjects, function( modelObject ) {
            var existing = exports.containsObject( modelObject.uid ) && exports.getObject( modelObject.uid );

            if( !existing ) {
                modelObject = new ModelObject( modelObject );

                // Add model object to cache
                _uid2modelObject[ modelObject.uid ] = modelObject;

                newObjects.push( modelObject );
            } else if( !_.isEmpty( modelObject.props ) ) {
                /**
                 * Special Case: Check if existing is empty
                 */
                if( _.isEmpty( existing.props ) ) {
                    existing.props = modelObject.props;

                    _updateProps( existing.props, existing.modelType );

                    /**
                     * Before we add this to the 'modified' list, check if it is already in the 'new' list. We do not
                     * want to double report these.
                     */
                    if( newObjects.indexOf( existing ) === -1 && modifiedObjects.indexOf( existing ) === -1 ) {
                        modifiedObjects.push( existing );
                    }
                } else {
                    /**
                     * Foreach of the incoming 'props'
                     */
                    var propertyDescriptorsMap = existing.modelType.propertyDescriptorsMap;

                    var changedExisting = false;

                    _.forEach( modelObject.props, function( soaPropValue, soaPropName ) {
                        var propertyDescriptor = propertyDescriptorsMap[ soaPropName ];
                        var existingProp = existing.props[ soaPropName ];

                        if( !existingProp ) {
                            existing.props[ soaPropName ] = new Property( soaPropValue, propertyDescriptor );
                            changedExisting = true;
                        } else {
                            _conditionSoaPropValue( soaPropValue, propertyDescriptor, soaPropValue );

                            _.forEach( soaPropValue, function( subPropValue, subPropName ) {
                                var existingSubPropValue = existingProp[ subPropName ];

                                if( !_.isEqual( subPropValue, existingSubPropValue ) ) {
                                    existing.props[ soaPropName ] = new Property( soaPropValue, propertyDescriptor );
                                    changedExisting = true;
                                    return false;
                                }
                            } );
                        }
                    } );

                    if( changedExisting ) {
                        /**
                         * Before we add this to the 'modified' list, check if it is already in the 'new' list. We do not
                         * want to double report these.
                         */
                        if( newObjects.indexOf( existing ) === -1 && modifiedObjects.indexOf( existing ) === -1 ) {
                            modifiedObjects.push( existing );
                        }
                    }
                }
            }

            // Set the cache of the UserSession object
            if( modelObject.type === 'UserSession' ) {
                setUserSession( modelObject );
            }
        } );

        if( newObjects.length > 0 ) {
            eventBus.publish( 'cdm.new', {
                newObjects: newObjects
            } );
        }

        if( modifiedObjects.length > 0 ) {
            eventBus.publish( 'cdm.modified', {
                modifiedObjects: modifiedObjects
            } );
        }
    };

    /**
     * @return {ModelObject} The ModelObject of the current user 'Session'.
     */
    exports.getUserSession = function() {
        return exports.getObject( _userSessionUID );
    };

    /**
     * @return {ModelObject} The ModelObject of the current user's 'Group'.
     */
    exports.getGroupMember = function() {
        return exports.getObject( _groupMemberUID );
    };

    /**
     * @return {ModelObject} The ModelObject of the current 'User'.
     */
    exports.getUser = function() {
        return exports.getObject( _userUID );
    };

    /**
     * HTML-escapes a string, but does not double-escape HTML-entities already present in the string.
     *
     * @param {String} value - HTML String which needs to be escaped.
     * @return {String} Returns escaped and safe HTML.
     */
    exports.htmlEscapeAllowEntities = function( value ) {
        return _sanitizer.htmlEscapeAllowEntities( value );
    };

    /**
     * Simple and inexpensive HTML Sanitizer which accepts the subset of TAG_WHITELIST array of HTML white list tags.
     *
     * @param {String[]} values - Array of HTML Strings which needs to be sanitized.
     * @return {String[]} Returns sanitized HTML string array.
     */
    exports.sanitizeHtmlValues = function( values ) {
        if( !_sanitizer ) {
            _sanitizer = app.getInjector().get( 'sanitizer' );
        }

        return _sanitizer.sanitizeHtmlValues( values );
    };

    /**
     * Simple and inexpensive HTML Sanitizer which detects and/or eliniates HTML that can cause potential cross-site
     * scripting and other UI issues.
     *
     * @param {String} rawValue - HTML String which needs to be sanitized.
     * @return {String} Returns sanitized HTML or Invalid HTML string when there is malicious string.
     */
    exports.sanitizeHtmlValue = function( rawValue ) {
        return _sanitizer.sanitizeHtmlValue( rawValue );
    };

    /**
     * Return an array of all IModelObjects currently in the cache that match the given model type.
     *
     * @param {String} typeName - Name of the model type to search for.
     * @return {ModelObject[]} An array of all IModelObjects currently in the cache that match the given model type.
     */
    exports.getObjectsOfType = function( typeName ) {
        var objs = [];
        _.forEach( _uid2modelObject, function( modelObject ) {
            if( modelObject.type && modelObject.type === typeName ) {
                objs.push( modelObject );
            }
        } );
        return objs;
    };

    /**
     * @param {String} uid - UID to test
     * @return {Boolean} TRUE if the given UID is NOT null and does NOT match the patterns used to indicate 'no object'.
     */
    exports.isValidObjectUid = function( uid ) {
        return !_.isEmpty( uid ) && !_.isEqual( uid, _NULL_UID );
    };

    /**
     * Determine if the given object is a ModelObject constructed by this service.
     *
     * @param {Object} objectToTest - The object to test.
     *
     * @returns {Boolean} TRUE if input object is an instance of an CDM ModelObject.
     */
    exports.isModelObject = function( objectToTest ) {
        return objectToTest instanceof ModelObject;
    };

    /**
     * {String} Module constant UID used to indicate the identity of an object is 'unknown'.
     */
    exports.NULL_UID = _NULL_UID;

    /**
     * @memberof NgServices
     * @member soa_kernel_clientDataModel
     *
     * @param {soa_kernel_clientMetaModel} cmm - Service to use.
     * @param {dateTimeService} dateTimeSvc - Service to use.
     * @param {sanitizer} sanitizer - Service to use.
     *
     * @returns {soa_kernel_clientDataModel} Ref to this service.
     */
    app.factory( 'soa_kernel_clientDataModel', [
        'soa_kernel_clientMetaModel',
        'dateTimeService',
        'sanitizer',
        function( cmm, dateTimeSvc, sanitizer ) {
            _cmm = cmm;
            _dateTimeSvc = dateTimeSvc;
            _sanitizer = sanitizer;

            /**
             * ------------------------------------------------<BR>
             * Definition complete...Now do some initialization<BR>
             * ------------------------------------------------<BR>
             *
             * @param data
             * @param envelope
             */
            eventBus.subscribe( 'cdm.cleanCache', function() {
                // collect the flushable objects, keep the escaped objects in cache
                _.forEach( _uid2modelObject, function( modelObject, uid ) {
                    if( !modelObject.type ) {
                        return;
                    }

                    if( cmm.isTypeUid( uid ) ) {
                        // Remove meta data from the cache
                        delete _uid2modelObject[ uid ];
                    } else if( _noFlushableTypes.indexOf( modelObject.type ) === -1 && !modelObject.reference ) {
                        modelObject.props = {};
                    }
                } );
            }, 'soa_kernel_clientDataModel' );

            return exports;
        }
    ] );

    return {
        moduleServiceNameToInject: 'soa_kernel_clientDataModel'
    };
} );
