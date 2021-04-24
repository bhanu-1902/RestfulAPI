// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This service provides helpful APIs to register/unregister/update context variables used to hold application state.
 *
 * @module js/appCtxService
 *
 * @publishedApolloService
 */
define( [
    'app', 'lodash', 'js/eventBus'
], function( app, _, eventBus ) {
    'use strict';

    var exports = {
        ctx: {}
    };

    /**
     * Register application context variable
     *
     * @param {String} name - The name of context variable
     * @param {Object} value - The value of context variable
     */
    exports.registerCtx = function( name, value ) {
        exports.ctx[ name ] = value;

        // Announce app context registration
        eventBus.publish( "appCtx.register", {
            "name": name,
            "value": value
        } );
    };

    /**
     * Register part of a context
     *
     * @param {String} path - Path to the context
     * @param {Object} value - The value of context variable
     * @ignore
     */
    exports.registerPartialCtx = function( path, value ) {
        var splitPath = path.split( '.' );
        var context = splitPath.shift();

        _.set( exports.ctx, path, value );

        // Announce app context registration
        eventBus.publish( "appCtx.register", {
            "name": context,
            "target": splitPath.join( '.' ),
            "value": value
        } );
    };

    /**
     * Unregister application context variable
     *
     * @param {String} name - The name of context variable
     */
    exports.unRegisterCtx = function( name ) {
        delete exports.ctx[ name ];
        // Announce app context un-registration
        eventBus.publish( "appCtx.register", {
            "name": name
        } );
    };

    /**
     * Update application context and Announce app context update by publishing an {@link module:js/eventBus|event}
     * 'appCtx.update' with eventData as {"name": ctxVariableName, "value": ctxVariableValue}
     *
     * @param {String} name - The name of context variable
     * @param {Object} value - The value of context variable
     */
    exports.updateCtx = function( name, value ) {
        exports.ctx[ name ] = value;

        // Announce app context update
        eventBus.publish( "appCtx.update", {
            "name": name,
            "value": value
        } );
    };

    /**
     * Get application context variable value
     *
     * @param {String} path - Path to the context
     * @returns {Object} Value (if any) at the indicated context path location.
     */
    exports.getCtx = function( path ) {
        return _.get( exports.ctx, path );
    };

    /**
     * Update part of a context
     *
     * @param {String} path - Path to the context
     * @param {Object} value - The value of context variable
     * @ignore
     */
    exports.updatePartialCtx = function( path, value ) {
        var splitPath = path.split( '.' );
        var context = splitPath.shift();
        var currentCtx = _.get( exports.ctx, path );
        //This will typically be done using angular binding, so we don't want an event potentially every $digest
        if( value !== currentCtx ) {
            var newCtx = _.set( exports.ctx, path, value );

            // Announce update
            eventBus.publish( "appCtx.update", {
                "name": context,
                "value": newCtx,
                "target": splitPath.join( '.' )
            } );
        }
    };

    /**
     * This service provides helpful APIs to register/unregister/update variables used to hold application state.
     *
     * @memberof NgServices
     * @member appCtxService
     *
     * @param {$rootScope} $rootScope - Service to use.
     * @param {$state} $state - Service to use.
     *
     * @returns {appCtxService} Reference to service's API object.
     */
    app.factory( 'appCtxService', [
        '$rootScope',
        '$state',
        function( $rootScope, $state ) {
            //Put the state parameters into the context
            exports.registerCtx( 'state', $state.params );

            var processParameters = function( stateParams ) {
                return Object.keys( stateParams )
                    //Filter parameters that are not set
                    .filter( function( param ) {
                        return stateParams[ param ];
                    } )
                    //Build the new object
                    .reduce( function( acc, nxt ) {
                        acc[ nxt ] = stateParams[ nxt ];
                        return acc;
                    }, {} );
            };

            //When the state parameters change
            $rootScope.$on( '$locationChangeSuccess', function() {
                //Update the context
                exports.registerCtx( 'state', {
                    params: $state.params,
                    processed: processParameters( $state.params )
                } );
                eventBus.publish( "LOCATION_CHANGE_COMPLETE" );
            } );

            //When the state parameters change
            $rootScope.$on( '$stateChangeSuccess', function() {
                //Update the context
                exports.registerCtx( 'state', {
                    params: $state.params,
                    processed: processParameters( $state.params )
                } );
            } );

            return exports;
        }
    ] );

    /**
     * Since this module can be loaded as a dependent DUI module we need to return an object indicating which service
     * should be injected to provide the API for this module.
     */
    return {
        moduleServiceNameToInject: 'appCtxService'
    };
} );
