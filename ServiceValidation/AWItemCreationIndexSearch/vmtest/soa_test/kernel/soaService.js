// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define location */

/**
 * This is the Teamcenter SOA Service. It's the central pipeline for invoking JSON SOA APIs & FMS APIs from the client.
 *
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/kernel/soaService
 */
define( [
    'app',
    'lodash',
    'assert',
    'Debug',
    'js/logger',
    'js/eventBus',
    'js/browserUtils',
    'js/localStorage',
    'soa/kernel/clientDataModel',
    'soa/kernel/clientMetaModel',
    'soa/kernel/propertyPolicyService',
    'js/appCtxService',
    'soa/kernel/typeCacheService',
    'js/configurationService'
], function( app, _, assert, Debug, logger, eventBus, browserUtils, localStrg ) {
    'use strict';

    var _$injector;
    var _cdm;
    var _cmm;
    var _propPolicySvc;
    var _typeCacheSvc;
    var _configSvc;

    /**
     * Object used to place all the exported API of this module upon.
     */
    var exports = {};

    /**
     * Boolean to indicate if we're signed into the server. This is just an observer state. True signin state is
     * managed by the Session Manager.
     *
     * @private
     */
    var _signedIn = false;

    /**
     * Date/Time of the last progress 'start'. This is used to compute the amount of time a single SOA post takes.
     *
     * @private
     */
    var _lastStartDate = {};

    /**
     * List of type names which have been deemed invalid based upon the previous server responses.
     *
     * @private
     */
    var _invalidTypeNames = [ 'contents' ];

    /**
     * Types that need loaded if available.
     * On AW startup.
     * @private
     */
    var _awStartupPreferences;

    /**
     * Types cache timestamp
     *
     * @private
     */
    var _typeCacheLMD;

    /**
     * Regular expression used to test if a string ends with "[]"
     */
    var REGEX_ARRAY_SUFFIX = /\[\]$/i;

    /**
     * Constant for operation name used for get TC Session Info
     *
     * @type {string}
     */
    var GET_SESSION_INFO = {
        serviceName: 'Internal-AWS2-2017-12-DataManagement',
        operationName: 'getTCSessionAnalyticsInfo'
    };

    /**
     * @property {Object} Cached reference to the injected AngularJS service.
     * @private
     */
    var _$q;

    /**
     * @property {Object} Cached reference to the injected AngularJS service.
     * @private
     */
    var _$http;

    /**
     * @property {appCtxService} Cached reference to the injected AngularJS service.
     * @private
     */
    var _appCtxSvc;

    /**
     * {Boolean} TRUE if hosted SOA is supported.
     */
    var _hostedSoa;

    /**
     * {hostSoa_2014_02} Reference to service API object (if hosted SOA is supported).
     */
    var _hostSoaSvc;

    /**
     * Debug trace function
     */
    var trace = new Debug( 'soaService' );

    /**
     * Initialize 'bodyElement[key]' based on given information.
     *
     * @private
     *
     * @param {Object} state - state object
     * @param {String} typeName - type name
     * @param {Object} bodyElement - body element
     * @param {String} key - key
     * @param {Boolean} deleted - was the key just deleted?
     */
    function initializeField( state, typeName, bodyElement, key, deleted ) {
        switch ( typeName ) {
            case 'String':
            case 'Date':
                bodyElement[ key ] = '';
                break;
            case 'int':
            case 'float':
            case 'double':
                bodyElement[ key ] = 0;
                break;
            case 'boolean':
                bodyElement[ key ] = false;
                break;
            case 'ModelObj':
            case 'ModelObject':
                bodyElement[ key ] = {
                    uid: deleted ? _cdm.NULL_UID : '',
                    type: deleted ? 'unknownType' : ''
                };
                break;
            default:
                if( REGEX_ARRAY_SUFFIX.test( typeName ) ) {
                    // Array
                    bodyElement[ key ] = [];
                } else if( state.schemaService.hasOwnProperty( typeName ) && _.isArray( state.schemaService[ typeName ] ) ) {
                    // Enum support... default to first entry
                    bodyElement[ key ] = state.schemaService[ typeName ][ 0 ];
                } else {
                    // Object or map
                    bodyElement[ key ] = {};
                }
        }
    }

    /**
     * TRUE if the given element is in the schema.
     *
     * @private
     *
     * @param {Object} state - state object
     * @param {Object} schemaElement - schema element to evaluate to determine if element should be a map
     *
     * @returns {Boolean} TRUE if the given element is in the schema.
     */
    function isMap( state, schemaElement ) {
        if( Object.keys( schemaElement ).length === 2 ) {
            if( schemaElement.hasOwnProperty( 'key' ) &&
                schemaElement.hasOwnProperty( 'value' ) &&
                !state.schemaService.hasOwnProperty( schemaElement.key ) ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Validate element type & recurse if non-trivial type.
     *
     * @private
     *
     * @param {Object} state - state object
     * @param {String} typeName - type name
     * @param {Object} bodyElement - body element
     * @returns {Object} ...
     */
    function validateElementType( state, typeName, bodyElement ) { // eslint-disable-line complexity
        switch ( typeName ) {
            case 'String':
            case 'Date':
                if( !_.isString( bodyElement ) ) {
                    state.issues.push( 'INVALID FIELD: Expected string, not ' + typeof bodyElement + ' --' +
                        state.stack.join( '.' ) );
                }
                break;
            case 'int':
            case 'float':
            case 'double':
                if( !_.isNumber( bodyElement ) ) {
                    state.issues.push( 'INVALID FIELD: Expected number, not ' + typeof bodyElement + ' --' +
                        state.stack.join( '.' ) );
                }
                break;
            case 'boolean':
                if( !_.isBoolean( bodyElement ) ) {
                    state.issues.push( 'INVALID FIELD: Expected boolean, not ' + typeof bodyElement + ' --' +
                        state.stack.join( '.' ) );
                }
                break;
            case 'ModelObj':
            case 'ModelObject':
                if( !bodyElement || !bodyElement.uid || !bodyElement.type ) {
                    return {
                        uid: !bodyElement || !bodyElement.uid ? _cdm.NULL_UID : bodyElement.uid,
                        type: !bodyElement || !bodyElement.type ? 'unknownType' : bodyElement.type
                    };
                }
                if( Object.keys( bodyElement ).length !== 2 ) {
                    // replace with new object if it's not already uid & type only
                    return {
                        uid: bodyElement.uid,
                        type: bodyElement.type
                    };
                }
                break;
            default:
                var typeName2 = null;
                if( state.schemaService.hasOwnProperty( typeName ) ) {
                    if( _.isArray( state.schemaService[ typeName ] ) ) {
                        // Enum
                        if( state.schemaService[ typeName ].indexOf( bodyElement ) === -1 ) {
                            state.issues.push( 'INVALID FIELD VALUE: Not valid enum value ' + typeName + ' expected ' +
                                state.schemaService[ typeName ].toString() + ' --' + state.stack.join( '.' ) );
                        }
                    } else {
                        // Object processing
                        defaultAndValidateElementRecurse( state, state.schemaService[ typeName ], bodyElement );
                    }
                } else if( REGEX_ARRAY_SUFFIX.test( typeName ) ) {
                    // Array processing
                    if( !_.isArray( bodyElement ) ) {
                        state.issues.push( 'INVALID FIELD: Expected array, not ' + typeof bodyElement + ' --' +
                            state.stack.join( '.' ) );
                        return;
                    }
                    typeName2 = typeName.substring( 0, typeName.length - 2 );
                    var replacementArray = null;
                    for( var ii = bodyElement.length - 1; ii >= 0; ii-- ) {
                        state.stack.push( ii );
                        var replacement = validateElementType( state, typeName2, bodyElement[ ii ] );
                        if( replacement ) {
                            if( !replacementArray ) {
                                // we should probably replace the array in case caller is using for something else...
                                replacementArray = bodyElement.slice( 0 );
                            }
                            replacementArray[ ii ] = replacement;
                        }
                        state.stack.pop();
                    }
                    if( replacementArray ) {
                        return replacementArray;
                    }
                } else if( /^(String|Int|Bool|Double|Float|Date|Tag)(|Vector)Map/.test( typeName ) ) {
                    // Map processing
                    typeName2 = null;
                    if( typeName.indexOf( 'String' ) === 0 ) {
                        typeName2 = 'String';
                    } else if( typeName.indexOf( 'Date' ) === 0 ) {
                        typeName2 = 'Date';
                    } else if( typeName.indexOf( 'Int' ) === 0 ) {
                        typeName2 = 'int';
                    } else if( typeName.indexOf( 'Float' ) === 0 ) {
                        typeName2 = 'float';
                    } else if( typeName.indexOf( 'Double' ) === 0 ) {
                        typeName2 = 'double';
                    } else if( typeName.indexOf( 'Bool' ) === 0 ) {
                        typeName2 = 'boolean';
                    } else if( typeName.indexOf( 'Tag' ) === 0 ) {
                        typeName2 = 'ModelObject';
                    }
                    if( /VectorMap/g.test( typeName ) ) {
                        typeName2 += '[]';
                    }
                    _.forEach( bodyElement, function( value, key ) {
                        var valueFinal = value;

                        if( !_.isString( key ) ) {
                            state.issues.push( 'INVALID FIELD: Expected string, not ' + typeof key + ' --' +
                                state.stack.join( '.' ) );
                            return;
                        }
                        if( typeName2 ) {
                            if( !bodyElement[ key ] ) {
                                initializeField( state, typeName2, bodyElement, key, false );
                                valueFinal = bodyElement[ key ];
                            }
                            state.stack.push( key );
                            var replacement = validateElementType( state, typeName2, valueFinal );
                            if( replacement ) {
                                bodyElement[ key ] = replacement;
                            }
                            state.stack.pop();
                        } else {
                            state.issues.push( 'INVALID FIELD: Unsupported map type of ' + typeName + ' --' +
                                state.stack.join( '.' ) );
                        }
                    } );
                } else {
                    state.issues.push( 'INVALID FIELD: Unsupported type of ' + typeName + ' --' +
                        state.stack.join( '.' ) );
                }
        }
    }

    /**
     * Recursive method for default & validate SOA operation body.
     *
     * @param {Object} state - state object
     * @param {Object} schemaElement - schema element/cursor for the walk
     * @param {Object} bodyElement - body element/cursor for the walk
     * @private
     */
    function defaultAndValidateElementRecurse( state, schemaElement, bodyElement ) {

        // Walk schema to add any missing fields
        var isMapLcl = isMap( state, schemaElement );

        if( !isMapLcl ) {
            _.forEach( schemaElement, function( typeName, key2 ) {
                var deleted = false;
                if( bodyElement.hasOwnProperty( key2 ) ) {
                    if( bodyElement[ key2 ] === null ) {
                        delete bodyElement[ key2 ];
                        deleted = true;
                    }
                }

                if( !bodyElement.hasOwnProperty( key2 ) || !bodyElement[ key2 ] ) {
                    initializeField( state, typeName, bodyElement, key2, deleted );
                }
            } );
        }

        // Walk body element to validate against schema & recurse
        var replacement = null;

        _.forEach( bodyElement, function forEachdefaultAndValidateElementRecurse( value, key2 ) {
            if( isMapLcl ) {
                if( _.isArray( bodyElement ) ) {
                    for( var ii = 0; ii < bodyElement[ 0 ].length; ii++ ) {
                        state.stack.push( ii );
                        replacement = validateElementType( state, schemaElement.key, bodyElement[ 0 ][ ii ] );
                        if( replacement ) {
                            bodyElement[ 0 ][ ii ] = replacement;
                        }
                        replacement = validateElementType( state, schemaElement.value, bodyElement[ 1 ][ ii ] );
                        if( replacement ) {
                            bodyElement[ 1 ][ ii ] = replacement;
                        }
                        state.stack.pop();
                    }
                } else {
                    for( var mapKey in bodyElement ) {
                        if( bodyElement.hasOwnProperty( key2 ) ) {
                            state.stack.push( key2 );
                            replacement = validateElementType( state, schemaElement.key, mapKey );
                            if( replacement ) {
                                var oldValue = bodyElement[ mapKey ];
                                delete bodyElement[ mapKey ];
                                bodyElement[ replacement ] = oldValue;
                            }
                            replacement = validateElementType( state, schemaElement.value, bodyElement[ mapKey ] );
                            if( replacement ) {
                                bodyElement[ mapKey ] = replacement;
                            }
                            state.stack.pop();
                        }
                    }
                }
            } else if( schemaElement.hasOwnProperty( key2 ) ) {
                state.stack.push( key2 );
                replacement = validateElementType( state, schemaElement[ key2 ], value );
                if( replacement ) {
                    bodyElement[ key2 ] = replacement;
                }
                state.stack.pop();
            } else {
                state.issues.push( 'INVALID FIELD: Unexpected type of ' + state.stack.join( '.' ) + '.' + key2 );
                delete bodyElement[ key2 ];
            }
        } );
    }

    /**
     * Default & validate SOA operation body.
     *
     * @param {Object} schemaService - schema for service
     * @param {String} serviceName - service name
     * @param {String} operationName - operation name
     * @param {Object} body - request body
     * @returns {Object} request body with defaulting & validation complete
     * @private
     */
    function defaultAndValidateElement( schemaService, serviceName, operationName, body ) {
        var state = {
            // If caller has passed null, they've indicated that there's an empty body.
            body: body ? body : {},
            serviceName: serviceName,
            operationName: operationName,
            schemaService: schemaService,
            issues: [],
            stack: []
        };

        if( state.schemaService ) {
            state.operation = state.schemaService[ state.operationName ];
            if( state.operation ) {
                // Walk body make sure it aligns to the schema
                defaultAndValidateElementRecurse( state, state.operation, state.body );

                if( state.issues.length > 0 ) {
                    logger.error( 'Invalid SOA request body!\n' + state.issues.join( '\n' ) + '\n\nInput body:',
                        state.body );
                }
            } else {
                logger.error( 'No SOA operation for ' + state.serviceName + ' ' + state.operationName +
                    '! Skipping validation & default of SOA input.' );
            }
        } else {
            logger.error( 'No SOA service for ' + state.serviceName +
                '! Skipping validation & default of SOA input.' );
        }
        return state.body;
    }

    // Response processing

    /**
     * Process an array of objects to create a single string of messages.
     *
     * @param {Object} messages - array of objects containing message fields
     * @param {Object} msgObj - message object with message value & level
     */
    function getMessageString( messages, msgObj ) {
        _.forEach( messages, function( object ) {
            if( msgObj.msg.length > 0 ) {
                msgObj.msg += '\n';
            }
            msgObj.msg += object.message;
            msgObj.level = _.max( [ msgObj.level, object.level ] );
        } );
    }

    /**
     * Return a reference to a new 'error' object set with the given error information.
     *
     * @param {Object} errIn - error in
     *
     * @returns {Object} - JavaScript Error object
     */
    exports.createError = function( errIn ) {
        var msgObj = {
            msg: '',
            level: 0
        };
        if( errIn.message ) {
            msgObj.msg = errIn.message;
        } else if( errIn.status || errIn.statusText ) {
            msgObj.msg = errIn.status + ' ' + errIn.statusText;
        } else if( errIn.PartialErrors ) {
            _.forEach( errIn.PartialErrors, function( partialError ) {
                getMessageString( partialError.errorValues, msgObj );
            } );
        } else if( errIn.partialErrors ) {
            _.forEach( errIn.partialErrors, function( partialError ) {
                getMessageString( partialError.errorValues, msgObj );
            } );
        } else if( errIn.messages ) {
            getMessageString( errIn.messages, msgObj );

        } else {
            msgObj.msg = errIn.toString();
        }
        if( errIn.data && errIn.data.messages ) {
            getMessageString( errIn.data.messages, msgObj );
        }
        var error = new Error( msgObj.msg );
        error.cause = errIn;
        error.level = msgObj.level;
        return error;
    };

    /**
     * Process SOA partial exceptions in response.
     *
     * @param {Object} response JSON response data
     * @param {String} serviceName - service name
     * @param {String} operationName - operation name
     * @return {Object} response JSON response data
     */
    function processExceptions( response, serviceName, operationName ) {

        if( response.ServiceData && response.ServiceData.partialErrors ) {
            // Publish SAN event to log the SOA errors to analytics
            var qName = "unknown";
            if( response.hasOwnProperty( '.QName' ) ) {
                qName = response[ '.QName' ];
            }

            eventBus.publishOnChannel( {
                channel: 'SAN_Events',
                topic: 'aw-command-logErrros',
                data: {
                    sanQName: qName,
                    sanPartialErrors: response.ServiceData.partialErrors,
                    sanServiceName: serviceName,
                    sanOperationName: operationName,
                    sanLogCorrelationID: logger.getCorrelationID()
                }
            } );
        }

        // Should we search for 'Exception' in QName?
        if( response && response.hasOwnProperty( '.QName' ) ) {
            if( /InvalidUserException$/.test( response[ '.QName' ] ) ) {
                if( operationName === GET_SESSION_INFO.operationName ) {
                    // This is the trivial case of initial connection to the server.
                    throw exports.createError( response );
                }

                // hit the InvalidUserException during a non-login related SOA call.
                // this is a session time-out situation.
                eventBus.publish( "session.stale", {} );

                console.log( 'Encountered Session timeout. SOA Request for service: ' + serviceName + ', ' + // eslint-disable-line no-console
                    operationName + '  Will refresh the page in order to re-Authenticate.' );
                // assumption is that we've timed out, so need to "reAuthenticate".
                // Legacy GWT logic would call the session manager to reauthenticate(), but that
                // pattern is no longer used.  In general we just will reload the page and
                // that will update the authentication state and trigger reauthentication.
                location.reload( false ); // trigger a page refresh, that will reload and authenticate again.
            }
            // FIXME this should be conditioned with a QName check...
            if( /Exception$/.test( response[ '.QName' ] ) ) {
                throw exports.createError( response );
            }
        }

        return response;
    }

    /**
     * ...
     *
     * @private
     * @param {Object} parent - parent element
     * @param {Array} modelObjs - Array of {ModelObject} found in response
     * @param {Object} typeNames - array of referenced type names
     */
    function extractModelObjAndTypeFromResponse( parent, modelObjs, typeNames ) {
        _.forEach( parent, function( child, key ) {
            if( _.isPlainObject( child ) ) {
                if( child.hasOwnProperty( 'uid' ) && child.hasOwnProperty( 'type' ) ) {
                    if( child.uid && child.uid !== _cdm.NULL_UID ) {
                        if( modelObjs ) {
                            modelObjs.push( child );
                        } else {
                            var modelObj = _cdm.getObject( child.uid );
                            if( modelObj ) {
                                parent[ key ] = modelObj;
                            }
                        }
                    }
                    if( typeNames && child.type && child.type !== 'unknownType' ) {
                        typeNames[ child.type.toString() ] = null;
                    }
                } else {
                    extractModelObjAndTypeFromResponse( child, modelObjs, typeNames );
                }
            } else if( _.isArray( child ) ) {
                extractModelObjAndTypeFromResponse( child, modelObjs, typeNames );
            }
        } );
    }

    /**
     * ...
     *
     * @private
     * @param {Object} response - Response from SOA service.
     * @param {Array} modelObjs - Array of {ModelObject} from SOA service.
     * @returns {Object} Response from SOA service.
     */
    function processResponseObjects( response, modelObjs ) {
        var serviceData = null;
        if( response ) {
            if( response.hasOwnProperty( '.QName' ) && /\.ServiceData$/.test( response[ '.QName' ] ) ) {
                serviceData = response;
            } else if( response.ServiceData ) {
                // If the service data is a member field, update the service data reference
                serviceData = response.ServiceData;
            }
        }
        if( modelObjs && modelObjs.length > 0 ) {
            // Add objects to CDM
            _cdm.cacheObjects( modelObjs );

            // To support the anti-pattern of code pulling the modelObject from the response, we need to update the response serviceData.
            extractModelObjAndTypeFromResponse( response );
        }
        if( serviceData ) {
            if( serviceData.created ) {
                var createdObjects = [];
                _.forEach( serviceData.created, function( uid ) {
                    var createdObject = _cdm.getObject( uid );
                    if( createdObject ) {
                        createdObjects.push( createdObject );
                    }
                } );
                if( createdObjects.length ) {
                    eventBus.publish( "cdm.created", {
                        createdObjects: createdObjects
                    } );
                }
            }
            if( serviceData.updated ) {
                var updatedObjects = [];
                _.forEach( serviceData.updated, function( uid ) {
                    if( !_cmm.isTypeUid( uid ) ) {
                        var updatedObject = _cdm.getObject( uid );
                        if( updatedObject ) {
                            updatedObjects.push( updatedObject );
                        }
                    }
                } );
                if( updatedObjects.length ) {
                    eventBus.publish( "cdm.updated", {
                        updatedObjects: updatedObjects
                    } );
                }
            }
            if( serviceData.deleted ) {
                // Remove objects from CDM
                _cdm.removeObjects( serviceData.deleted );
            }
        }
        return response;
    }

    /**
     * Process service data in HTTP response.
     *
     * @param {Object} response - JSON response data
     * @param {String} operationName - operation name
     * @return {Promise} Promise resolved once types are loaded
     */
    function processResponseTypes( response, operationName ) {
        if( response ) {
            var modelObjs = [];
            var typeNamesObj = {};

            var qName = response[ '.QName' ];
            if( qName !== 'http://teamcenter.com/Schemas/Soa/2011-06/MetaModel.TypeSchema' ) {
                extractModelObjAndTypeFromResponse( response, modelObjs, typeNamesObj );
            }

            var typeNames = Object.keys( typeNamesObj );

            if( operationName === GET_SESSION_INFO.operationName && response.extraInfoOut ) {
                if( response.extraInfoOut.AWC_StartupTypes ) {
                    _typeCacheLMD = response.extraInfoOut.typeCacheLMD;
                    _awStartupPreferences = response.extraInfoOut.AWC_StartupTypes.split( ',' );

                    // Always include TC_Project even if not in the start up preference
                    if( !_.includes( _awStartupPreferences, 'TC_Project' ) ) {
                        _awStartupPreferences.push( 'TC_Project' );
                    }

                    // Always include ListOfValuesString even if not in the start up preference
                    if( !_.includes( _awStartupPreferences, 'ListOfValuesString' ) ) {
                        _awStartupPreferences.push( 'ListOfValuesString' );
                    }
                }
                var loadedTypes = _typeCacheSvc.getLocalTypes( _typeCacheLMD );
                _cmm.cacheTypes( loadedTypes );
            }

            return exports.ensureModelTypesLoaded( typeNames ).then( function() {
                // Just in case we have more types, let's go get them...
                return processResponseObjects( response, modelObjs );
            } );
        }

        return _$q.resolve();
    }

    /**
     *
     * Gets the effective property policy
     *
     * @param {Object|String} propertyPolicyOverride - SOA property policy override (or NULL)
     * @param {boolean} isSelectedPropertyPolicy - boolean which indicates whether the selected property is required
     *            or not.
     * @returns {Object} request body with defaulting & validation complete
     * @private
     */
    function getEffectivePropertyPolicy( propertyPolicyOverride, isSelectedPropertyPolicy ) {
        if( _.isString( propertyPolicyOverride ) ) {
            return JSON.parse( propertyPolicyOverride );
        }
        if( _.isObject( propertyPolicyOverride ) ) {
            // No need to pass a property policy for this call.
            return propertyPolicyOverride;
        }
        return _propPolicySvc.getEffectivePolicy( exports, isSelectedPropertyPolicy );
    }

    /**
     * SOA post unchecked.
     *
     * @param {String} serviceName - SOA service name
     * @param {String} operationName - SOA operation name
     * @param {String} body - JSON body
     * @param {Object|String} propertyPolicyOverride - SOA property policy override (or NULL)
     * @param {Bool} ignoreHost - Flag to say ignore hosting when making soa call.
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.postUnchecked = function( serviceName, operationName, body, propertyPolicyOverride, ignoreHost ) {
        assert( serviceName, 'Service name not provided!' );
        assert( operationName, 'Operation name not provided!' );
		
		logger.info('ServiceName: ' + serviceName +' OperationName: '+ operationName);
		
        var isSelectedPropertyPolicy = false;

        var endPt;

        var promise;
        if( GET_SESSION_INFO.serviceName === serviceName && GET_SESSION_INFO.operationName === operationName ) {
            // avoid loading schema for get session info call
            var schemaService = {};
            schemaService[ GET_SESSION_INFO.operationName ] = {}; // extraInfoIn: "String[]"
            promise = _$q.resolve( schemaService );
        } else {
            promise = _configSvc.getCfg( 'schema.' + serviceName ).then( function( schemaService ) {
                return schemaService;
            }, function() {
                // none found
                logger.warn( 'No SOA schema definition found!' );
                return {};
            } );
        }

        return promise.then( function( schemaService ) {
            if( _appCtxSvc.ctx.aw_hosting_enabled && !_appCtxSvc.ctx.aw_hosting_soa_support_checked ) {
                _appCtxSvc.ctx.aw_hosting_soa_checked = true;

                _hostedSoa = _$injector.get( 'hostSupportService' ).isSoaEnabled();
            }

            if( body ) {
                isSelectedPropertyPolicy = _propPolicySvc.checkForSelectedObject( body );
            }

            var jsonData = {
                header: {
                    state: {
                        clientVersion: '10000.1.2',
                        /**
                         * Correlation ID for logging purposes (debug).
                         */
                        logCorrelationID: logger.getCorrelationID(),
                        /**
                         * Permanent ID/recipes are used for the runtime business object’s (BOMLine objects) opaque UIDs
                         * in requests/responses.
                         * <p>
                         * If the unloadObjects key is not in the request headers, all business objects are unloaded at
                         * the top of each request; see the processTagManager ITK for more information.
                         */
                        stateless: true,
                        /**
                         * If true, All business objects are unloaded at the top of each request; see the
                         * processTagManager ITK for more information. Previously controlled through the stateless flag.
                         * <p>
                         * When is stateless=true mode this value must be explicitly set to false to keep objects
                         * loaded.
                         */
                        unloadObjects: true,
                        /**
                         * If true, process server-session state key/value pairs found in the request headers. This
                         * turns all session state into client-session data. The standalone AW client should set this to
                         * true, while the hosted AW client should set it false (or not send it at all).
                         */
                        enableServerStateHeaders: !_hostedSoa,
						//enableServerStateHeaders: true,
                        /**
                         */
                        formatProperties: true
                    },
					//X-CSRF-TOKEN: '2388y432grvugr86t54thvt4928847743t',
					//x-csrf-token: '3697260710235209760972309092736097',
					//X-CSRF-Token: '3697260710235209760972309092736097',
                    policy: getEffectivePropertyPolicy( propertyPolicyOverride, isSelectedPropertyPolicy )
                },
                body: defaultAndValidateElement( schemaService, serviceName, operationName, body )
            };

            if( _appCtxSvc && _appCtxSvc.getCtx( "objectQuotaContext.useObjectQuota" ) ) {
                /**
                 * If true, All business objects are unloaded at the top of each request. Applications might want to
                 * rely on object quota based unload. In such cases they can use "objectQuotaContext" to override this
                 * behavior and reset this flag to avail this feature
                 */
                jsonData.header.state.unloadObjects = false;
            }

            if( !_hostedSoa ) {
                /**
                 * The ID used for identification of this client
                 *
                 * D-30368 This value must be kept in sync in all instances where it is used. See defect if change is
                 * required.
                 */
                jsonData.header.state.clientID = 'ActiveWorkspaceClient';
            }

            var headers = {
                //Only US-ASCII characters are allowed in HTTP headers
                //http://stackoverflow.com/questions/34670413/regexp-to-validate-a-http-header-value/34710882#34710882
                'Log-Correlation-ID': jsonData.header.state.logCorrelationID.replace( /[^\x20-\x7E]+/g, '' )
            };

            var userSession = _cdm.getUserSession();
            var groupMember = _cdm.getGroupMember();

            if( groupMember ) {
                jsonData.header.state.groupMember = groupMember.uid;
            }

            if( userSession && userSession.props ) {
                if( userSession.props.role_name ) {
                    jsonData.header.state.role = userSession.props.role_name.dbValues[ 0 ];
                }
                if( userSession.props.fnd0locale ) {
                    jsonData.header.state.locale = userSession.props.fnd0locale.dbValues[ 0 ];
                }
            }

            endPt = serviceName + '/' + operationName;

            if( logger.isTraceEnabled() ) {
                logger.trace( '\n' + 'soaService.post to ' + endPt, jsonData );
            }

            eventBus.publish( 'progress.start', {
                endPoint: endPt
            } );

            /**
             * Check if there is a 'host' process that is handling SOA processing<BR>
             * If so: Send the 'endPt' and data to that service.
             */

            // The only case the client will make its own login call when hosted would be when it needs credentials.
            // If such a call is made, we should not make it through the host. This is the only case when AW talks directly to the server.
            // This will allow Viewer to show up in hosts.
            if( _hostedSoa && !ignoreHost ) {
                if( !_hostSoaSvc ) {
                    _hostSoaSvc = _$injector.get( 'hostSoa_2014_02' );
                }

                return _hostSoaSvc.post( serviceName, operationName, jsonData );
            }

            var $http = _$http || _$injector.get( '$http' );

            trace( 'HTTP call start', serviceName, operationName );
            return $http.post( browserUtils.getBaseURL() + 'tc/JsonRestServices/' + endPt, jsonData, {
                headers: headers
            } ).then( function( response ) {
                trace( 'HTTP call complete', serviceName, operationName );
                assert( response, 'No response given for ' + endPt );

                //AW-66303 - report Teamcenter Web App Server info.
                // The Web App server info. is sent in header of the SOA response.
                var body = response.data;

                try {
                    if( body.analyticsData !== null ) {
                        var wasInfo = response.headers( 'WebAppServerInfo' );
                        if( !wasInfo ) {
                            wasInfo = 'unknown';
                        }
                        _.set( body, 'analyticsData.analyticsExtraInfo.was', wasInfo );
                    }
                } catch ( err ) {
                    // Do nothing.
                }

                assert( typeof body !== 'string' || body.indexOf( '<?xml version' ) === -1,
                    'Unexpected response body for: ' + endPt );

                return body;
            } );
        } ).then( function( response ) {
            eventBus.publish( 'progress.end', {
                endPoint: endPt
            } );
            if( logger.isTraceEnabled() ) {
                logger.trace( 'endPt=' + endPt, response );
            }
            return processExceptions( response, serviceName, operationName );
        }, function( err ) {
            eventBus.publish( 'progress.end', {
                endPoint: endPt
            } );
            throw exports.createError( err );
        } ).then( function( response ) {
            if( !propertyPolicyOverride && !isSelectedPropertyPolicy ) {
                loadPropertiesIfRequired( response );
            }
            return processResponseTypes( response, operationName );
        } );
    };

    /**
     * Calls getProperties Soa to load additional properties if required.
     *
     * @param {Object} response - JSON response data
     */
    function loadPropertiesIfRequired( response ) {
        if( response ) {
            var serviceData = null;
            if( response ) {
                if( response.hasOwnProperty( '.QName' ) && /\.ServiceData$/.test( response[ '.QName' ] ) ) {
                    serviceData = response;
                } else if( response.ServiceData ) {
                    // If the service data is a member field, update the service data reference
                    serviceData = response.ServiceData;
                }
            }

            if( serviceData ) {
                var responseObjects = [];
                if( serviceData.updated ) {
                    for( var ii2 = 0; ii2 < serviceData.updated.length; ii2++ ) {
                        var updatedUid = serviceData.updated[ ii2 ];
                        if( !_cmm.isTypeUid( updatedUid ) ) {
                            var updatedObject = _cdm.getObject( updatedUid );
                            if( updatedObject ) {
                                responseObjects.push( updatedObject );
                            }
                        }
                    }
                }
                if( serviceData.created ) {
                    for( var ii = 0; ii < serviceData.created.length; ii++ ) {
                        var createdObject = _cdm.getObject( serviceData.created[ ii ] );
                        if( createdObject ) {
                            responseObjects.push( createdObject );
                        }
                    }
                }

                if( responseObjects.length > 0 ) {
                    var responseObjectUids = [];
                    for( var i = 0; i < responseObjects.length; i++ ) {
                        responseObjectUids.push( responseObjects[ i ].uid );
                    }

                    if( _propPolicySvc.checkForSelectedObject( null, responseObjects ) ) {
                        var propertyPolicyOverride = _propPolicySvc.getEffectivePolicy( null, true );
                        var input = {
                            objects: responseObjects,
                            attributes: []
                        };
                        exports.postUnchecked( 'Core-2006-03-DataManagement', 'getProperties', input,
                            propertyPolicyOverride );
                    }
                }
            }
        }
    }

    /**
     * SOA post.
     *
     * If the response contains partial errors, it will be treated as an exception & thrown. If this isn't desired,
     * use postUnchecked.
     *
     * @param {String} serviceName - SOA service name
     * @param {String} operationName - SOA operation name
     * @param {String} body - JSON body
     * @param {Object|String} propertyPolicyOverride - SOA property policy override (or NULL)
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.post = function( serviceName, operationName, body, propertyPolicyOverride ) {
        return exports.postUnchecked( serviceName, operationName, body, propertyPolicyOverride ).then( function( response ) {
            if( response ) {
                if( response.partialErrors || response.PartialErrors ) {
                    throw exports.createError( response );
                }
                if( response.ServiceData && response.ServiceData.partialErrors ) {
                    throw exports.createError( response.ServiceData );
                }
            }
            return response;
        } );
    };

    /**
     * Constructor for Operation class.
     *
     * @param {String} serviceName - SOA service name
     * @param {String} operationName - SOA operation name.
     * @param {Object} body - The object that represents the operation request. It is optional and may be partial.
     * @param {Object|String} propertyPolicyOverride - SOA property policy override (or NULL)
     *
     * @return {Operation} Refereance to this new Operation instance.
     */
    exports.Operation = function( serviceName, operationName, body, propertyPolicyOverride ) {
        /**
         * SOA service name
         *
         * @private
         */
        this._serviceName = serviceName;

        /**
         * SOA operation name
         *
         * @private
         */
        this._operationName = operationName;

        /**
         * SOA property policy text
         *
         * @private
         */
        this._propertyPolicyOverride = propertyPolicyOverride;

        /**
         * The object that represents the operation request body.
         *
         * @private
         */
        this._body = body ? body : {};

        /**
         * Async execute this Operation with eception checking of the result.
         *
         * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its
         *          response data is available.
         */
        this.execute = function() {
            return exports.post( this._serviceName, this._operationName, this._body, this._propertyPolicyOverride );
        };

        /**
         * Async execute this Operation without eception checking of the result.
         *
         * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its
         *          response data is available.
         */
        this.executeUnchecked = function() {
            return exports.postUnchecked( this._serviceName, this._operationName, this._body,
                this._propertyPolicyOverride );
        };

        return this;
    };
    /**
     * Set session information into local storage (if needed)
     *
     * @param {Boolean} signOut - sign out
     */
    exports.setSessionInfo = function( signOut ) {
        var userSession = signOut ? null : _cdm.getUserSession();

        if( userSession && userSession.props ) {
            var awSession = userSession.props.group_name.dbValues[ 0 ] + ',' +
                userSession.props.role_name.dbValues[ 0 ] + ',' +
                userSession.props.fnd0locale.dbValues[ 0 ];

            localStrg.publish( 'awSession', awSession );
        } else {
            localStrg.publish( 'awSession' );
        }
    };

    /**
     * Perform an async get of current Teamcenter session information.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.getTCSessionInfo = function() {
        // Ensure we have the required properties for the UserSession.
        var policyId = _propPolicySvc.register( {
            types: [ {
                name: 'UserSession',
                properties: [ {
                    name: 'awp0RevRule',
                    modifiers: [ {
                        name: "includeIsModifiable",
                        Value: "true"
                    } ]
                }, {
                    name: 'user',
                    modifiers: [ {
                        name: "withProperties",
                        Value: "true"
                    } ]
                }, {
                    name: 'user_id'
                }, {
                    name: 'group'
                }, {
                    name: 'group_name'
                }, {
                    name: 'project'
                }, {
                    name: 'role'
                }, {
                    name: 'role_name'
                }, {
                    name: 'fnd0locale'
                }, {
                    name: 'fnd0LocationCode'
                }, {
                    name: 'fnd0groupmember'
                } ]
            } ]
        } );
        return exports.post( GET_SESSION_INFO.serviceName, GET_SESSION_INFO.operationName ).then(
            function( response ) {
                _propPolicySvc.unregister( policyId );
                exports.setSessionInfo();
                return response;
            },
            function( err ) {
                _propPolicySvc.unregister( policyId );
                throw err;
            } );
    };

    /**
     * Get Type Descriptions from server.
     *
     * Note, this is hidden in this file to avoid anyone else directly calling this.
     *
     * @private
     *
     * @param {StringArray} typeNames - Array of type names
     *
     * @return {Promise} Promise who's resolution is the result of the SOA 'getTypeDescriptions2' operation.
     */
    function getTypeDescriptions( typeNames ) {
        assert( typeNames && typeNames.length > 0, 'No type names provided!' );
        typeNames.sort();
        var typeNamesFinal = _.uniq( typeNames, true );
        return exports.post( 'Core-2015-10-Session', 'getTypeDescriptions2', {
            typeNames: typeNamesFinal,
            options: {
                PropertyExclusions: [
                    "LovReferences",
                    "NamingRules",
                    "RendererReferences"
                ],
                TypeExclusions: [
                    "DirectChildTypesInfo",
                    "RevisionNamingRules",
                    "ToolInfo"
                ]
            }
        }, {} );
    }

    /**
     * Verify async that the given model types are loaded into the client's meta model.
     *
     * @param {StringArray} typeNames - An array of type names to ensure are cached.
     *
     * @return {Promise} Promise who's resolution is a 'null' value since the types are now loaded into the cache.
     *         This 'null' result is required because the GWT-side wrapper requires an AsyncCallback<Void> callback
     *         (not AsyncCallback<IJsAarray>).
     */
    exports.ensureModelTypesLoaded = function( typeNames ) {
        /**
         * Handle trivial case
         */
        if( !typeNames ) {
            return _$q.reject( 'Invalid type name array specified' );
        }

        /**
         * From the input list of type names, get a list of unique type names not in the CMM already.
         */
        var missingTypeNames = [];

        _.forEach( typeNames, function( typeName ) {
            if( !_cmm.containsType( typeName ) && _invalidTypeNames.indexOf( typeName ) === -1 ) {
                missingTypeNames.push( typeName );
            }
        } );

        /**
         * Check if we have any missing.
         */
        if( missingTypeNames.length > 0 ) {
            // logger.info( "Missing Types: " + JSON.stringify( missingTypeNames ) );

            return getTypeDescriptions( missingTypeNames ).then( function( responseGetTypeDescriptions ) {
                if( responseGetTypeDescriptions && responseGetTypeDescriptions.types ) {
                    var modelTypes = responseGetTypeDescriptions.types;
                    _cmm.cacheTypes( modelTypes );
                    // Cache the types in localStorage.
                    _typeCacheSvc.setLocalTypes( modelTypes, _awStartupPreferences, _typeCacheLMD, true );
                }

                // Capture invalid type names
                _.forEach( missingTypeNames, function( typeName ) {
                    if( !_cmm.containsType( typeName ) ) {
                        // add empty type to avoid future server calls
                        _invalidTypeNames.push( typeName );
                        _invalidTypeNames.sort();
                        _invalidTypeNames = _.uniq( _invalidTypeNames, true );
                    }
                } );

                return null;
            } );
        }

        return _$q.resolve();
    };

    /**
     * Setup to log all events fired on the 'soajs' eventBus event channel.
     */
    if( logger && logger.isTraceEnabled() ) {
        eventBus.subscribe( '#', function( data, envelope ) {
            var msg = 'eventBus: ' + envelope.topic + ' @ ' + envelope.timeStamp;

            if( data && data.endPoint ) {
                if( envelope.topic === 'progress.start' ) {
                    _lastStartDate[ data.endPoint ] = envelope.timeStamp;
                } else if( envelope.topic === 'progress.end' && _lastStartDate[ data.endPoint ] ) {
                    var msDelta = envelope.timeStamp.getTime() - _lastStartDate[ data.endPoint ].getTime();

                    msg = msg + '\n' + '          Time: ' + msDelta + 'ms' + '    ' + data.endPoint;

                    _lastStartDate[ data.endPoint ] = null;
                }
            }

            if( logger.isTraceEnabled() ) {
                //Just print, using logger.trace causes infinite recursion
                console.debug( msg, envelope ); // eslint-disable-line no-console
            }
        }, 'soa_kernel_soaService' );
    }

    /**
     * Determine if the user is currently signed in.
     *
     * @return {boolean} is signed in?
     */
    exports.isSignedIn = function() {
        return _signedIn;
    };

    /**
     * Service factory method
     *
     * @memberof NgServices
     * @member soa_kernel_soaService
     *
     * @param {$q} $q - Service to use.
     * @param {$http} $http - Service to use.
     * @param {$injector} $injector - Service to use.
     * @param {soa_kernel_clientDataModel} cdm - Service to use.
     * @param {soa_kernel_clientMetaModel} cmm - Service to use.
     * @param {soa_kernel_propertyPolicyService} propPolicySvc - Service to use.
     * @param {appCtxService} appCtxSvc - Service to use.
     * @param {typeCacheService} typeCacheSvc - Service to use.
     * @param {configurationService} configSvc - Service to use.
     *
     * @returns {soa_kernel_soaService} Reference to service's API object.
     */
    app.factory( 'soa_kernel_soaService', [ //
        '$q', //
        '$http', //
        '$injector', //
        'soa_kernel_clientDataModel', //
        'soa_kernel_clientMetaModel', //
        'soa_kernel_propertyPolicyService', //
        'appCtxService', //
        'typeCacheService', //
        'configurationService', //
        function( $q, $http, $injector, cdm, cmm, propPolicySvc, appCtxSvc, typeCacheSvc, configSvc ) {
            _$q = $q;
            _$http = $http;
            _$injector = $injector;
            _cdm = cdm;
            _cmm = cmm;
            _propPolicySvc = propPolicySvc;
            _appCtxSvc = appCtxSvc;
            _typeCacheSvc = typeCacheSvc;
            _configSvc = configSvc;

            /**
             * Subscribe to listen when we are signed in/out. Just tracking state locally. NOTE - for non User/PW
             * authentication, this state may not be 100% accurate.
             */
            eventBus.subscribe( 'session.signIn', function() {
                _signedIn = true;
            }, 'soa_kernel_soaService' );

            eventBus.subscribe( 'session.signOut', function() {
                _signedIn = false;
            }, 'soa_kernel_soaService' );

            return exports;
        }
    ] );

    return {
        moduleServiceNameToInject: 'soa_kernel_soaService'
    };
} );
