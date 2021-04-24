// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/fileManagementService
 */
define( [ //
        'app', //
        'soa/kernel/soaService'
    ], //
    function( app ) {
        'use strict';

        /**
         * @private
         *
         * @property {soa_kernel_soaService} Cached reference to the injected AngularJS service.
         */
        var _soaSvc = null;

        var exports = {};

        /**
         * This operation obtains File Management System (FMS) read tickets for a set of supplied ImanFile objects. The
         * supplied tickets are used to transfer files from a Teamcenter volume to local storage. The files input parameter
         * contains a list of the ImanFile objects to be read from the Teamcenter volume and transferred to local storage.
         * FMS requires tickets for all file transfers An FMS read ticket is required to obtain a file from a Teamcenter
         * volume. It is often times more expedient to request several tickets at one time, especially if it is known ahead
         * of time that many files will need to be moved. For this reason, the caller may supply multiple ImanFile objects,
         * for which FMS tickets are desired, in the input vector.
         *
         * @param {ObjectArray} files - array of ImanFile object
         *
         * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
         *          data is available.
         */
        exports.getFileReadTickets = function( files ) {
            return _soaSvc.post( 'Core-2006-03-FileManagement', 'getFileReadTickets', {
                'files': files
            } );
        };

        /**
         * The 'soa_fileManagementService' exposes FMS related operations to be used from native/declarative framework
         * storage'.
         *
         * @memberof NgServices
         * @member soa_fileManagementService
         */
        app.factory( 'soa_fileManagementService', //
            [ 'soa_kernel_soaService', //
                function( soaSvc ) {
                    _soaSvc = soaSvc;
                    return exports;
                }
            ] );

        /**
         * Since this module can be loaded GWT-side by the ModuleLoader class we need to return an object indicating which
         * service should be injected to provide the API for this module.
         */
        return {
            moduleServiceNameToInject: 'soa_fileManagementService'
        };
    } );
