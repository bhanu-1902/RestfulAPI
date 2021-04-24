// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/adapters/nodejs/browserUtils
 */
define( [], function() {
    'use strict';

    var exports = {};

    /**
     * @returns {String} Base URL for the current application's root 'document' without any query or location attributes
     *          and (if otherwise valid) with a trailing '/' assured (e.g. 'http://100.100.100.100:8888/awc/').
     */
    exports.getBaseURL = function() {
        return '/';
    };

    /**
     * {Boolean} TRUE if browser is IE?
     */
    exports.isIE = false;

    /**
     * {Boolean} TRUE if browser is non Edge IE?
     */
    exports.isNonEdgeIE = false;

    /**
     * {Boolean} TRUE if we're currently running on a mobile OS
     */
    exports.isMobileOS = false;

    /**
     * @return {Object} An object who's properties represent the attributes of the current window's URL.
     */
    exports.getUrlAttributes = function() {
        return {};
    };

    /**
     */
    exports.getWindowNavigator = function() {};

    /**
     */
    exports.removeUrlAttribute = function() {};

    return exports;
} );
