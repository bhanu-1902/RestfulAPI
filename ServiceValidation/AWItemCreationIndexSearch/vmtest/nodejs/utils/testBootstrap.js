// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global global module require */

/**
 * Initialize the NodeJS based testing environment.
 *
 * @module nodejs/utils/testBootstrap
 * @param {Object} requirejs - requirejs
 */
module.exports.initialize = function( requirejs ) {
    'use strict';

    global.angular = undefined;

    global.window = undefined;

    /**
     * Path (relative to the 'src' directory in a dev unit) to the 'assets' directory of the most recent build in that
     * dev unit.
     */
    global.location = {
        reload: function() {
            // do nothing
        }
    };

    /**
     * Setup RequireJS based to allow loading of SOAJS modules.
     */
    requirejs.config( {
        baseUrl: '.',
        paths: {
            // adapters for nodejs
            app: 'nodejs/adapters/nodejs/appWrapper',
            'js/browserUtils': 'nodejs/adapters/nodejs/browserUtils',
            'js/localStorage': 'nodejs/adapters/nodejs/localStorage',
            jquery: 'nodejs/adapters/nodejs/jquery',
            lzstring: 'lib/lz-string/lz-string.min',
            // 3rd party direct reference
            postal: 'lib/postal/postal',
            // Test helper
            testHelper: 'nodejs/utils/testHelper',
            // general path resolution
            config: 'config',
            soa: 'js/soa'
        },
        nodeRequire: require
    } );
};
