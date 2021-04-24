// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/sessionService
 */
define( [
    'app', 'js/eventBus', 'js/logger',
    'soa/kernel/soaService', 'soa/kernel/clientDataModel', 'js/appCtxService'
], function( app, eventBus, logger) {
    'use strict';

    var _soaSvc;

    var exports = {};

    /**
     * Sign In to server
     *
     * @param {String} username - The username to sing in with.
     *
     * @param {String} password - The password for the given username (if not supplied, username assumed as password)
     *
     * @param {String} group - The user's group to sign into (if undefined, empty string assumed)
     *
     * @param {String} role - The user's role to sign into (if undefined, empty string assumed)
     *
     * @param {String} locale -
     *
     * @param {String} sessionDiscriminator -
     *
     * @param {Bool} ignoreHosting - Flag to say ignore hosting when making soa call.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.signIn = function( username, password, group, role, locale, sessionDiscriminator, ignoreHosting ) {
        var body = {
            credentials: {
                user: username,
                password: password,
                group: group,
                role: role,
                locale: locale,
                //descrimator: sessionDiscriminator ? sessionDiscriminator : 'AWJSK3'
				descrimator: sessionDiscriminator ? sessionDiscriminator : `AWC${Date.now()}`
            }
        };
		
		//logger.info('Username: '+body.username+' Password: '+body.password +' Descriminator: '+body.descrimator);
		
        return _soaSvc.postUnchecked( 'Core-2011-06-Session', 'login', body, {}, ignoreHosting );
    };

    /**
     * Sign out from server
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.signOut = function() {
        return _soaSvc.postUnchecked( 'Core-2006-03-Session', 'logout', {}, {} ).then( function( response ) {
            _soaSvc.setSessionInfo( true );
            // both SSO and UserPw call this, so fire the event here.
            eventBus.publish( "session.signOut", {} );
            return response;
        } );
    };

    /**
     * Set User Session State.
     *
     * @param {Array} pairs - Array of Name-Value pair objects
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.setUserSessionState = function( pairs ) {
        return _soaSvc.post( 'Core-2015-10-Session', 'setUserSessionStateAndUpdateDefaults', {
            pairs: pairs
        } ).then( function( response ) {
            _soaSvc.setSessionInfo();
            // With a successful change in session, we force a reload for security concerns & memory leaks.
            location.reload( false );
            return response;
        } );
    };

    /**
     * @memberof NgServices
     * @member soa_sessionService
     */
    app.factory( 'soa_sessionService', [
        'soa_kernel_soaService', 'soa_kernel_clientDataModel', 'appCtxService',
        function( soaSvc, cdm, appCtxSvc ) {
            _soaSvc = soaSvc;

            /**
             * registering the context when app context is getting initialize by GWT or by any module
             */
            var awUser = cdm.getUser();
            var awUserSession = cdm.getUserSession();

            appCtxSvc.registerCtx( "user", awUser );
            appCtxSvc.registerCtx( "userSession", awUserSession );
            appCtxSvc.registerCtx( "defaultRoutePath", app.getInjector().get( 'defaultRoutePath' ) );

            /**
             * updating the context for sign out and sign in with other user
             */
            eventBus.subscribe( 'session.updated', function() {
                var awUser = cdm.getUser();
                var awUserSession = cdm.getUserSession();

                appCtxSvc.registerCtx( "user", awUser );
                appCtxSvc.registerCtx( "userSession", awUserSession );
            }, 'soa_sessionService' );

            return exports;
        }
    ] );

    return {
        moduleServiceNameToInject: 'soa_sessionService'
    };
} );
