// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/kernel/clientMetaModel
 */
define( [
    'app', 'lodash',
    'js/iconMapService'
], function( app, _ ) {
    'use strict';

    /**
     * Object used to implement a typeName-to-PropertyType cache map.
     */
    var _name2modelType = {};

    /**
     * Reference to the 'iconService' set into this module and used to reuse type file information.
     * <P>
     * Note: We are trying to avoid a cyclic reference since 'iconService' required CMM to do its work.
     */
    var _iconMapSvc;

    /**
     * @type {Object} map of property descriptors for reuse; property name to PropertyDescriptor or PropertyDescriptor[]
     */
    var _propertyDescriptors = {};

    var exports = {};

    /**
     * Get the resolved filename of the SVG icon.
     *
     * @param {Object} modelType - The Teamcenter ModelObject's 'modelType' object which
     * @return {String} type icon file name
     */
    exports.getTypeIconFileName = function( modelType ) {
        for( var ii = 0; ii < modelType.typeHierarchyArray.length; ii++ ) {
            var typeName = modelType.typeHierarchyArray[ ii ];
            var typeFileName = _iconMapSvc.getTypeFileName( typeName );
            if( typeFileName ) {
                return typeFileName;
            }
        }

        return _iconMapSvc.getTypeFileName( 'MissingImage' );
    };

    /**
     * @param {Object} modelTypeSOA - model type object returned from SOA
     */
    var ModelType = function( modelTypeSOA ) {
        this.abstract = modelTypeSOA.abstract;
        this.children = modelTypeSOA.children;
        this.displayName = modelTypeSOA.displayName;
        this.name = modelTypeSOA.name;
        this.owningType = modelTypeSOA.owningType;
        this.parentTypeName = modelTypeSOA.parentTypeName;
        this.primary = modelTypeSOA.primary ? true : undefined;
        this.references = modelTypeSOA.references;
        this.typeHierarchyArray = modelTypeSOA.typeHierarchy ? modelTypeSOA.typeHierarchy.split( ',' ) : null;
        this.typeUid = modelTypeSOA.typeUid;
        this.uid = modelTypeSOA.uid;

        this.constantsMap = {};
        this.propertyDescriptorsMap = {};

        // To support property processing in CDM during model object caching, create a map of the property descriptors.
        if( modelTypeSOA.propertyDescriptors ) {
            for( var jj = modelTypeSOA.propertyDescriptors.length - 1; jj >= 0; jj-- ) {
                var propertyDescriptorSOA = modelTypeSOA.propertyDescriptors[ jj ];
                var propName = propertyDescriptorSOA.name;
                var pd = new PropertyDescriptor( propertyDescriptorSOA );

                var cachedPD = _propertyDescriptors[ propName ];
                if( cachedPD ) {
                    if( _.isArray( cachedPD ) ) {
                        // is array
                        var foundPD = false;
                        _.forEach( cachedPD, function( pd2 ) {
                            if( _.isEqual( pd, pd2 ) ) {
                                pd = pd2;
                                foundPD = true;
                                return false; // break
                            }
                        } );
                        if( !foundPD ) {
                            // not in array already, add new one
                            cachedPD.push( pd );
                        }
                    } else if( _.isEqual( pd, cachedPD ) ) {
                        // not array & equal to cached pd
                        pd = cachedPD;
                    } else {
                        // not equal to cached PD, so we create array to track both
                        _propertyDescriptors[ propName ] = [ cachedPD, pd ];
                    }
                } else {
                    // first encounter of this property descriptor, so cache it
                    _propertyDescriptors[ propName ] = pd;
                }

                this.propertyDescriptorsMap[ propName ] = pd;
            }
        }

        if( modelTypeSOA.constants ) {
            for( jj = modelTypeSOA.constants.length - 1; jj >= 0; jj-- ) {
                var constant = modelTypeSOA.constants[ jj ];
                this.constantsMap[ constant.name ] = constant.value;
            }
        }

        if( !this.constantsMap.IconFileName && this.typeHierarchyArray ) {
            this.constantsMap.IconFileName = exports.getTypeIconFileName( this );
        }
    };

    /**
     * @param {Object} propertyDescriptorSOA - property descriptor object returned from SOA
     */
    var PropertyDescriptor = function( propertyDescriptorSOA ) {
        this.anArray = propertyDescriptorSOA.anArray ? true : undefined;
        this.basedOn = propertyDescriptorSOA.basedOn;
        this.compoundObjType = propertyDescriptorSOA.compoundObjType;
        this.displayName = propertyDescriptorSOA.displayName;
        this.fieldType = propertyDescriptorSOA.fieldType;
        this.lovCategory = propertyDescriptorSOA.lovCategory;
        this.maxArraySize = propertyDescriptorSOA.maxArraySize;
        this.maxLength = propertyDescriptorSOA.maxLength;
        this.minValue = propertyDescriptorSOA.minValue;
        this.name = propertyDescriptorSOA.name;
        this.propertyType = propertyDescriptorSOA.propertyType;
        this.propertyType2 = propertyDescriptorSOA.propertyType2;
        this.valueType = propertyDescriptorSOA.valueType;

        this.constantsMap = {};

        if( propertyDescriptorSOA.constants ) {
            for( var kk = propertyDescriptorSOA.constants.length - 1; kk >= 0; kk-- ) {
                var constant = propertyDescriptorSOA.constants[ kk ];
                this.constantsMap[ constant.name ] = constant.value;
            }
        }
    };

    /**
     * Does client meta model contain type?
     *
     * @param {String} name - property type name.
     * @return {Boolean} true if model type is contained within the CMM
     */
    exports.containsType = function( name ) {
        return _name2modelType.hasOwnProperty( name );
    };

    /**
     * Get model type by type name.
     *
     * @param {String} name - type name (or UID)
     * @return {ModelType|null} model type if contained within CMM
     */
    exports.getType = function( name ) {
        if( exports.containsType( name ) ) {
            return _name2modelType[ name ];
        }
        if( exports.isTypeUid( name ) ) {
            return exports.getType( exports.extractTypeNameFromUID( name ) );
        }
        return null;
    };

    /**
     * @param {ModelObject} modelObject - ModelObject to test.
     * @return {Boolean} TRUE if the given ModelObject represents a 'type' object.
     */
    exports.isTypeObject = function( modelObject ) {
        /**
         * Note: We do not want to cache 'types' in the model object cache.
         */
        return exports.isTypeUid( modelObject.uid );
    };

    /**
     * Returns True if this type is child of the give type.
     *
     * @param {String} typeName - name of class
     * @param {ModelType} modelType - view model object's model type.
     * @return {Boolean} true if this type is child of the give type.
     */
    exports.isInstanceOf = function( typeName, modelType ) {
        if( typeName && modelType ) {
            if( typeName === modelType.name ||
                ( modelType.typeHierarchyArray && modelType.typeHierarchyArray.indexOf( typeName ) > -1 ) ) {
                return true;
            }
        }
        return false;
    };

    /**
     * @param {String} uid - UID of a ModelObject to test.
     * @return {Boolean} TRUE if the given ModelObject UID represents a 'type' object.
     */
    exports.isTypeUid = function( uid ) {
        /**
         * Note: We do not want to cache 'types' in the model object cache.
         */
        return uid && /^TYPE::/i.test( uid );
    };

    /**
     * @param {String} uid - UID of a ModelObject to test.
     * @return {String} type name extracted from UID
     */
    exports.extractTypeNameFromUID = function( uid ) {
        return uid.split( '::' )[ 1 ];
    };

    /**
     * Cache model types into client meta model.
     *
     * @param {ModelType[]} modelTypes - Array of {ModelType} objects.
     */
    exports.cacheTypes = function( modelTypes ) {
        for( var ii = modelTypes.length - 1; ii >= 0; ii-- ) {
            var modelType = modelTypes[ ii ];
            // Don't update cache if a model type comes across again
            if( !exports.containsType( modelType.name ) ) {
                _name2modelType[ modelType.name ] = new ModelType( modelType );
            }
        }
    };

    /**
     * This service provides access to the 'meta data' associated with model objects (e.g. the hierarchy super types
     * of a given type).
     *
     * @memberof NgServices
     * @member soa_kernel_clientMetaModel
     *
     * @param {iconMapService} iconMapSvc - Service to use.
     *
     * @returns {soa_kernel_clientMetaModel} Instance of the service.
     */
    app.factory( 'soa_kernel_clientMetaModel', [
        'iconMapService',
        function( iconMapSvc ) {
            _iconMapSvc = iconMapSvc;
            return exports;
        }
    ] );

    return {
        moduleServiceNameToInject: 'soa_kernel_clientMetaModel'
    };
} );
