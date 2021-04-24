// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/kernel/propertyPolicyService
 */
define( [
    'app', 'lodash', 'js/eventBus', 'js/logger',
    'js/dateTimeService', 'soa/kernel/clientMetaModel'
], function( app, _, eventBus, logger ) {
    'use strict';

    /**
     * Angular services
     */
    var _$http;
    var _$q;
    var _dateTimeSvc;
    var _cmm;

    var exports = {};

    /**
     * Map of policy id to registered policy.
     *
     * @private
     */
    exports._policyId2policy = {};

    /**
     * Registration of time stamp for property policies.
     *
     * @private
     */
    exports._policyId2registrationTimeStamp = {};

    /**
     * Registration counter for property policies.
     *
     * @private
     */
    exports._policyCount = 0;

    /**
     * Effective property policy for subsequent server calls.
     *
     * @private
     */
    exports._effectivePolicy = {};

    /**
     * Cache of last SOA service used by getEffectivePolicy()
     *
     * @private
     */
    exports._soaSvc = null;

    /**
     * Parent selections.
     *
     * @private
     */
    exports._parentSelections = [];

    /**
     * Current selections.
     *
     * @private
     */
    exports._currentSelections = [];

    /**
     * List of selected policy Id's.
     *
     * @private
     */
    exports._selectedPolicyIds = [];

    /**
     * List of generic policy Id's.
     *
     * @private
     */
    exports._genericPolicyIds = [];

    /**
     * boolean to indicate whether the last effective policy was build from selected property policy or not.
     *
     * @private
     */
    exports._selectedPropertyUsed = false;
    // /**
    //  * Sort input array by name field of elements.
    //  *
    //  * @param array array to sort
    //  * @private
    //  */
    // function sort( array ) {
    //     if( array ) {
    //         array.sort( function( a, b ) {
    //             return a.name.localeCompare( b.name );
    //         } );
    //     }
    // }

    /**
     * @param {String} typeName - type name
     * @param {String} propName - property name
     * @return {String} defining type name (whether on this type or one of it's parents)
     */
    function getParentType( typeName, propName ) {
        var modelType = _cmm.getType( typeName );
        if( modelType && modelType.propertyDescriptorsMap.hasOwnProperty( propName ) ) {
            var parentModelType = _cmm.getType( modelType.parentTypeName );
            if( parentModelType && parentModelType.propertyDescriptorsMap.hasOwnProperty( propName ) ) {
                return getParentType( parentModelType.name, propName );
            }
            return modelType.name;
        }
        return null;
    }

    /**
     * Merge modifier into modifier array.
     *
     * @param {Array} modifiers - array of modifiers
     * @param {Object} modifierToMerge - modifier to merge into array
     * @private
     */
    function mergeModifier( modifiers, modifierToMerge ) {
        var modifier = _.find( modifiers, _.matchesProperty( 'name', modifierToMerge.name ) );
        if( !modifier ) {
            modifier = {
                name: modifierToMerge.name,
                Value: modifierToMerge.Value
            };
            modifiers.push( modifier );
        } else if( modifier.Value !== modifierToMerge.Value ) {
            logger.error( 'Modifier conflict!' );
        }
    }

    /**
     * Merge property into property array.
     *
     * @param {Array} properties - array of properties
     * @param {Object} propertyToMerge - property to merge into array
     * @private
     */
    function mergeProperty( properties, propertyToMerge ) {
        var property = _.find( properties, _.matchesProperty( 'name', propertyToMerge.name ) );
        if( !property ) {
            property = {
                name: propertyToMerge.name
            };
            properties.push( property );
        }
        if( propertyToMerge.modifiers && propertyToMerge.modifiers.length > 0 ) {
            if( !property.modifiers ) {
                property.modifiers = [];
            }
            _.forEach( propertyToMerge.modifiers, function( modifier ) {
                mergeModifier( property.modifiers, modifier );
            } );
        }
    }

    /**
     * Merge type into type array.
     *
     * @param {Array} types - array of types
     * @param {Object} typeToMerge - type to merge into array
     * @private
     */
    function mergeType( types, typeToMerge ) {
        var type = _.find( types, _.matchesProperty( 'name', typeToMerge.name ) );
        if( !type ) {
            type = {
                name: typeToMerge.name
            };
            types.push( type );
        }
        if( typeToMerge.properties && typeToMerge.properties.length > 0 ) {
            if( !type.properties ) {
                type.properties = [];
            }
            _.forEach( typeToMerge.properties, function( property ) {
                mergeProperty( type.properties, property );
            } );
        }
        if( typeToMerge.modifiers && typeToMerge.modifiers.length > 0 ) {
            if( !type.modifiers ) {
                type.modifiers = [];
            }
            _.forEach( typeToMerge.modifiers, function( modifier ) {
                mergeModifier( type.modifiers, modifier );
            } );
        }
    }

    /**
     * Effective property policy for use by Teamcenter SOA server call header.
     *
     * @param {Object} soaSvc - SOA service to avoid cyclic reference
     * @param {boolean} isSelectedProperty - flag indicating the policy type to use.
     * @return {Object} effective property policy
     */
    exports.getEffectivePolicy = function( soaSvc, isSelectedProperty ) {
        if( soaSvc ) {
            exports._soaSvc = soaSvc;
        }

        var policyIdsForEffectPolicy = exports._genericPolicyIds;
        if( isSelectedProperty ) {
            policyIdsForEffectPolicy = exports._selectedPolicyIds;
        }
        // we need to check which policy type (selected or generic ) was used to build the effective property policy
        if( !exports._effectivePolicy || isSelectedProperty !== exports._selectedPropertyUsed ) {
            var effectivePolicy = {
                useRefCount: false
                // do we need to set this? ie does the server default to zero anyway?
            };
            exports._selectedPropertyUsed = isSelectedProperty;
            _.forEach( policyIdsForEffectPolicy, function( policyId ) {
                var policy = exports._policyId2policy[ policyId ];
                if( policy.types ) {
                    if( !effectivePolicy.types ) {
                        effectivePolicy.types = [];
                    }
                    _.forEach( policy.types, function( type ) {
                        mergeType( effectivePolicy.types, type );
                    } );
                }

                if( policy.modifiers && policy.modifiers.length > 0 ) {
                    if( !effectivePolicy.modifiers ) {
                        effectivePolicy.modifiers = [];
                    }
                    _.forEach( policy.modifiers, function( modifier ) {
                        mergeModifier( effectivePolicy.modifiers, modifier );
                    } );
                }
            } );

            //            // Sort the effective policy for debug purposes
            //            sort( effectivePolicy.types );
            //            if( effectivePolicy.types ) {
            //                _.forEach( effectivePolicy.types, function( type ) {
            //                    sort( type.modifiers );
            //                    if( type.properties ) {
            //                        sort( type.properties );
            //                        _.forEach( type.properties, function( property ) {
            //                            sort( property.modifiers );
            //                        } );
            //                    }
            //                } );
            //            }
            //            sort( effectivePolicy.modifiers );

            exports._effectivePolicy = effectivePolicy;
        }
        return exports._effectivePolicy;
    };

    /**
     * Returns true if at least one selected object is present in the input body.
     *
     * @param {Object} body - input body
     * @param {StringArray} modelObjectUidList - model object uid's
     * @return {Boolean} true if at least one selected object is present in the input body.
     */
    exports.checkForSelectedObject = function( body, modelObjectUidList ) {
        var isFound = false;
        var modelObjectUids = modelObjectUidList;
        if( !modelObjectUidList ) {
            modelObjectUids = [];
            extractModelObjects( body, modelObjectUids );
        }
        if( modelObjectUids.length > 0 ) {
            var totalSelectedModelObject = getSelectedModelObjects();
            for( var i = 0; i < totalSelectedModelObject.length; i++ ) {
                if( modelObjectUids.indexOf( totalSelectedModelObject[ i ] ) > -1 ) {
                    isFound = true;
                    break;
                }
            }
        }
        return isFound;
    };

    /**
     * Returns a list of all the selected model objects. This list includes the parent and the child selections.
     *
     * @private
     * @return {IModelObjectArray} An array of total selected model objects uid's list.
     */
    function getSelectedModelObjects() {
        var selectedModelObjects = [];

        // add current selected objects to the selected objects list .
        for( var i = 0; i < exports._currentSelections.length; i++ ) {
            if( selectedModelObjects.indexOf( exports._currentSelections[ i ] ) === -1 ) {
                selectedModelObjects.push( exports._currentSelections[ i ] );
            }
        }

        // add parent selected objects to the selected objects list .
        for( var ii = 0; ii < exports._parentSelections.length; ii++ ) {
            if( selectedModelObjects.indexOf( exports._parentSelections[ ii ] ) === -1 ) {
                selectedModelObjects.push( exports._parentSelections[ ii ] );
            }
        }

        return selectedModelObjects;
    }

    /**
     * Extracts model object uid's from the body
     *
     * @private
     * @param {Object} body - input body
     * @param {StringArray} uids - Array of {ModelObject} uid's found in body
     */
    function extractModelObjects( body, uids ) {
        _.forEach( body, function( child ) {
            if( _.isPlainObject( child ) ) {
                if( child.hasOwnProperty( 'uid' ) && child.hasOwnProperty( 'type' ) ) {
                    if( child.uid && child.uid !== 'AAAAAAAAAAAAAA' ) {
                        uids.push( child.uid );
                    }
                } else {
                    extractModelObjects( child, uids );
                }
            } else if( _.isArray( child ) ) {
                extractModelObjects( child, uids );
            }
        } );
    }

    /**
     * Set's the selected model objects.
     *
     * @param {StringArray} selectedObectuids selected object uid's
     */
    exports.setSelectedObjects = function( selectedObectuids ) {
        if( selectedObectuids ) {
            exports._currentSelections = selectedObectuids;
        } else {
            exports._currentSelections = [];
        }
    };

    /**
     * Add's the selected model object to parent selection.
     *
     * @param {String} selectedObectuid selected object uid's
     */
    exports.addToParentSelection = function( selectedObectuid ) {
        if( !exports._parentSelections ) {
            exports._parentSelections = [];
        } else {
            exports._parentSelections.push( selectedObectuid );
        }
    };

    /**
     * removes the model object from parent selection.
     *
     * @param {String} selectedObectuid selected object uid's
     */
    exports.removeFromParentSelection = function( selectedObectuid ) {
        // Remove the selected object
        if( exports._parentSelections.lastIndexOf( selectedObectuid ) > -1 ) {
            exports._parentSelections.splice( exports._parentSelections.lastIndexOf( selectedObectuid ), 1 );
        }
    };

    /**
     * Register property policy.
     *
     * @param {Object} policy - property policy
     * @param {String} policyString - property policy string
     * @param {String} policyType - property type
     * @return {String} property policy ID
     */
    exports.register = function( policy, policyString, policyType ) {
        var policyFinal = policy;

        var timeS = _.now();

        if( !policyFinal ) {
            policyFinal = JSON.parse( policyString );
        }

        var nextId = ++exports._policyCount;

        // Create policy id
        var policyId = 'policy' + nextId;

        // Cache policy
        exports._policyId2policy[ policyId ] = policyFinal;

        // depending upon the policy type add the policy to generic list
        if( !policyType ) {

            exports._genericPolicyIds.push( policyId );
        }

        exports._selectedPolicyIds.push( policyId );

        // Clear cache of effective policy
        exports._effectivePolicy = null;

        var currentTime = _dateTimeSvc.formatTime( timeS );

        if( logger.isTraceEnabled() ) {
            logger.trace( 'Register Property Policy Id: ' + policyId + ' TimeStamp: ' + currentTime + ' Policy data:',
                policyFinal );
        }

        if( policyString ) {
            exports._policyId2registrationTimeStamp[ policyId ] = {
                time: currentTime,
                policy: policyFinal
            };
        }

        // Return new cached policy id
        return policyId;
    };

    /**
     * Register property policy.
     *
     * @param {String} policyId - cached property policy ID
     */
    exports.unregister = function( policyId ) {
        // Remove the policy id from selected property policy id list
        if( exports._selectedPolicyIds.indexOf( policyId ) > -1 ) {
            exports._selectedPolicyIds.splice( exports._selectedPolicyIds.indexOf( policyId ), 1 );
        }
        // Remove the policy id from generic property policy id list
        if( exports._genericPolicyIds.indexOf( policyId ) > -1 ) {
            exports._genericPolicyIds.splice( exports._genericPolicyIds.indexOf( policyId ), 1 );
        }

        if( exports._policyId2policy.hasOwnProperty( policyId ) ) {
            delete exports._policyId2policy[ policyId ];

            if( logger.isTraceEnabled() ) {
                logger.trace( 'Unregister Property Policy Id: ' + policyId + ' TimeStamp: ' +
                    _dateTimeSvc.formatTime( _.now() ) );
            }

            delete exports._policyId2registrationTimeStamp[ policyId ];
            // Clear cache of effective policy
            exports._effectivePolicy = null;
        }
    };

    /**
     * Register property policy.
     *
     * @param {String} policyId - existing registered property policy ID
     * @param {Object} policy - property policy
     * @param {String} policyString - property policy string
     */
    exports.addToObjectPropertyPolicy = function( policyId, policy, policyString ) {
        var policyFinal = policy;

        if( !policyFinal ) {
            policyFinal = JSON.parse( policyString );
        }

        if( exports._policyId2policy.hasOwnProperty( policyId ) ) {
            var existingPolicy = exports._policyId2policy[ policyId ];

            if( policyFinal.types ) {
                if( !existingPolicy.types ) {
                    existingPolicy.types = [];
                }

                _.forEach( policyFinal.types, function( type ) {
                    mergeType( existingPolicy.types, type );
                } );
            }

            if( policyFinal.modifiers ) {
                if( !existingPolicy.modifiers ) {
                    existingPolicy.modifiers = [];
                }

                _.forEach( policyFinal.modifiers, function( modifier ) {
                    mergeModifier( existingPolicy.modifiers, modifier );
                } );
            }

            // Clear cache of effective policy
            exports._effectivePolicy = null;
        }
    };
    /**
     * Remove content from cached object property policy.
     *
     * @param {String} policyId - cached property policy ID
     * @param {Object} policy - property policy to modify cached property policy
     */
    exports.removeFromObjectPropertyPolicy = function( policyId, policy ) {
        if( exports._policyId2policy.hasOwnProperty( policyId ) ) {
            var existingPolicy = exports._policyId2policy[ policyId ];
            if( policy.types ) {
                _.forEach( policy.types, function( type ) {
                    var existingType = _.find( existingPolicy.types, _.matchesProperty( 'name', type.name ) );
                    if( existingType ) {
                        if( type.properties ) {
                            _.forEach( type.properties, function( property ) {
                                if( property ) {
                                    var existingProp = _.find( existingType.properties, _.matchesProperty( 'name',
                                        property.name ) );
                                    if( existingProp ) {
                                        if( property.modifiers ) {
                                            _.forEach( property.modifiers, function( modifier ) {
                                                _.remove( existingProp.modifiers, _.matchesProperty( 'name',
                                                    modifier.name ) );
                                            } );
                                        } else {
                                            _.remove( existingType.properties, _.matchesProperty( 'name',
                                                existingProp.name ) );
                                        }
                                    }
                                }
                            } );
                        }
                        if( type.modifiers ) {
                            _.forEach( type.modifiers, function( modifier ) {
                                _.remove( existingType.modifiers, _.matchesProperty( 'name', modifier.name ) );
                            } );
                        }
                    } else {
                        logger.error( 'Attempt to remove modifiers from a missing type: ' + type.name );
                    }
                } );
            }
            if( policy.modifiers ) {
                _.forEach( policy.modifiers, function( modifier ) {
                    _.remove( existingPolicy.modifiers, _.matchesProperty( 'name', modifier.name ) );
                } );
            }
            // Clear cache of effective policy
            exports._effectivePolicy = null;
        }
    };

    /**
     * @param {Object} policy - property policy to validate
     * @param {number} callCount - call count to avoid infinite loop if a type name is invalid & can't be loaded
     */
    function validatePolicy( policy, callCount ) {
        if( policy.types ) {
            var prefix = ' + ';

            if( callCount < 5 && exports._soaSvc ) {
                var typeNames = [];
                _.forEach( policy.types, function( type ) {
                    var modelType = _cmm.getType( type.name );
                    if( !modelType ) {
                        typeNames.push( type.name );
                    } else {
                        _.forEach( modelType.typeHierarchyArray, function( name2 ) {
                            if( !_cmm.containsType( name2 ) ) {
                                typeNames.push( name2 );
                            }
                        } );
                    }
                } );
                typeNames = _.uniq( typeNames.sort(), true );
                if( typeNames ) {
                    var promise = exports._soaSvc.ensureModelTypesLoaded( typeNames );
                    if( promise ) {
                        promise.then( function() {
                            return validatePolicy( policy, ++callCount );
                        } );
                        return;
                    }
                }
            }

            var output = [];
            _.forEach( policy.types, function( type ) {
                var modelType = _cmm.getType( type.name );
                if( modelType ) {
                    if( type.properties ) {
                        var parentModelType = _cmm.getType( modelType.parentTypeName );
                        _.forEach( type.properties, function( property ) {
                            if( property ) {
                                if( !modelType.propertyDescriptorsMap.hasOwnProperty( property.name ) ) {
                                    output.push(  'Invalid property [' + property.name + '] on type [' +
                                        type.name + ']' );
                                } else if( parentModelType &&
                                    parentModelType.propertyDescriptorsMap.hasOwnProperty( property.name ) ) {
                                    output.push(  'Wrong type for property [' + property.name + '] on type [' +
                                        type.name + '], should be on type [' +
                                        getParentType( parentModelType.name, property.name ) + ']' );
                                } else{
                                    output.push(  'Effective property [' + property.name + '] on type [' +
                                        type.name + ']' );

                                }
                            } else {
                                output.push(  'Empty property on type [' + type.name + ']' );
                            }
                        } );
                    }
                } else {
                    output.push(  'Invalid type [' + type.name + ']' );
                }
                if( !type.properties && !type.modifiers ) {
                    output.push( 'Missing properties for type [' + type.name + ']' );
                }
            } );

            if( output.length > 0 ) {
                output.sort();
                logger.info( output.join( '\n' ) );
            }
        }
    }

    /**
     * @param {Array} modelObjects array of model objects
     * @param {Array} propNames array of property names
     */
    exports.validatePropertyRegistration = function( modelObjects, propNames ) {
        var policy = exports.getEffectivePolicy();
        var msg = '';
        _.forEach( modelObjects, function( modelObject ) {
            if( modelObject ) {
                var modelType = modelObject.modelType;
                _.forEach( propNames, function( propName ) {
                    if( modelType.propertyDescriptorsMap.hasOwnProperty( propName ) && policy.types ) {
                        var found = false;
                        for( var kk = 0; kk < policy.types.length && !found; kk++ ) {
                            var type = policy.types[ kk ];
                            if( type.properties && modelType.typeHierarchyArray.indexOf( type.name ) > -1 ) {
                                for( var ll = 0; ll < type.properties.length && !found; ll++ ) {
                                    var property = type.properties[ ll ];
                                    if( property.name === propName ) {
                                        found = true;
                                    }
                                }
                            }
                        }
                        if( !found ) {
                            msg += '\n\tType [' + modelType.displayName + '] PropertyName [' + propName + ']';
                        }
                    }
                } );
            }
        } );

        if( msg ) {
            logger.debug( 'Property Policy registration is missing for the following:' + msg );
        }
    };

    /**
     * Register a policy which may need to be loaded from a separate json file.
     *
     * @param {Object|String} propertyPolicy - A property policy object or a path to the file containing the policy
     *
     * @return {Promise} A promise that will be resolved with the new policy id
     */
    exports.registerPolicyAsync = function( propertyPolicy ) {
        //If it's a string it's a path to a policy file that needs to be loaded
        if( typeof propertyPolicy === 'string' ) {
            return _$http.get( app.getBaseUrlPath() + propertyPolicy, {
                cache: true
            } ).then( function( response ) {
                return exports.register( response.data );
            } );
        }
        //Otherwise it must be the actual policy object
        return _$q.when( exports.register( propertyPolicy ) );
    };

    /**
     * Property policy service
     *
     * @memberof NgServices
     * @member soa_kernel_propertyPolicyService
     *
     * @param {$q} $q - Service to use.
     * @param {$http} $http - Service to use.
     * @param {dateTimeService} dateTimeSvc - Service to use.
     * @param {soa_kernel_clientMetaModel} cmm - Service to use.
     *
     * @returns {soa_kernel_propertyPolicyService} Instance of this service.
     */
    app.factory( 'soa_kernel_propertyPolicyService', [
        '$q', '$http', 'dateTimeService', 'soa_kernel_clientMetaModel',
        function( $q, $http, dateTimeSvc, cmm ) {

            _$http = $http;
            _$q = $q;
            _dateTimeSvc = dateTimeSvc;
            _cmm = cmm;

            /**
             * Catch the event for logging all registered policies in the current session and logging the effective policy
             * in the session
             */
            eventBus.subscribe( "cdm.logDiagnostics", function() {
                var policy = exports.getEffectivePolicy();
                logger.info( 'Property Policy Audit Console Logging :' );

                _.forEach( exports._policyId2registrationTimeStamp, function( times, policyId ) {
                    logger.debug( 'Registered Property Policy Id "' + policyId + '" @ ' + times.time + ':', times.policy );
                } );

                logger.debug( 'Effective Property Policy in session:', policy );

                validatePolicy( policy, 1 );
            }, 'soa_kernel_propertyPolicyService' );

            return exports;
        }
    ] );

    return {
        moduleServiceNameToInject: 'soa_kernel_propertyPolicyService'
    };
} );
