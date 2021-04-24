// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global console define */
/* eslint-disable no-console */

/**
 * This service is used to announce various level logging events to the console.
 * <p>
 * Expected URL patterns:<br>
 * (1) http://localhost:3000?logLevel=ERROR<br>
 * (2) http://localhost:3000?logLevel=ERROR&locale=fr<br>
 * (3) http://localhost:8080/?logLevel=ERROR#/Declarative%20Building%20Blocks/Elements/aw-autofocus
 *
 * APIs :
 * (1) isDebugEnabled(): Checks whether this Logger is enabled for the DEBUG Level. Returns: true if debug output is enabled.
 * (2) isErrorEnabled(): Checks whether this Logger is enabled for the ERROR Level. Returns: true if error output is enabled.
 * (3) isInfoEnabled(): Checks whether this Logger is enabled for the INFO Level. Returns: true if info output is enabled.
 * (4) isTraceEnabled(): Checks whether this Logger is enabled for the TRACE Level. Returns: true if trace output is enabled.
 * (5) isWarnEnabled(): Checks whether this Logger is enabled for the WARN Level. Returns: true if warning output is enabled.
 * (6) debug(): Displays a message in the console. You pass one or more objects to this method, each of which are evaluated and concatenated into a space-delimited string.
 * The first parameter you pass may contain format specifiers, a string token composed of the percent sign (%) followed by a letter that indicates the formatting to be applied.
 * (7) info(): Identical to debug()
 * (8) error(): Similar to info() but also includes a stack trace from where the method was called.
 * (9) warn(): This API is like info() but also displays a yellow warning icon along with the logged message.
 * (10) trace(): Prints a stack trace from the point where the method was called, including links to the specific lines in the JavaScript source.
 *
 * @module js/logger
 * @publishedApolloService
 */
define( [ 'lodash', 'js/browserUtils' ], function( _, browserUtils ) {
    'use strict';

    var exports = {};

    /** Log correlation ID. */
    var _logCorrelationID = '';

    /** How many times the log correlation id has been updated */
    var _logCorrelationIDUpdates = 0;

    /** Random base for log correlation id to help prevent collisions */
    var _logCorrelationBase = Math.random().toString( 36 ).substring( 2 );

    /** Event Bus */
    var _eventBus = null;

    /** Logger output level. */
    var _level;

    switch ( browserUtils.getUrlAttributes().logLevel ) {
        case 'OFF': // log4j - MAX Integer
            _level = 0;
            break;
        case 'ERROR':
        case 'SEVERE': // log4j - 1000
            _level = 1;
            break;
        case 'WARN':
        case 'WARNING': // log4j - 900
            _level = 2;
            break;
        case 'INFO': // log4j - 800
        case 'CONFIG': // log4j - 700
            _level = 3;
            break;
        case 'DEBUG':
        case 'FINE': // log4j - 500
            _level = 4;
            break;
        case 'TRACE':
        case 'FINER': // log4j - 400
        case 'FINEST': // log4j - 300
            _level = 5;
            break;
        case 'ALL': // log4j - MIN Integer
            _level = 6;
            break;
        default:
            _level = 3; // Default value of INFO/CONFIG
            break;
    }

    /**
     * Support Node.js usage of this service. window isn't defined & it's missing console.debug & console.warn.
     */
    if( !console.error ) {
        console.error = console.log;
    }
    if( !console.warn ) {
        console.warn = console.log;
    }
    if( !console.info ) {
        console.info = console.log;
    }
    if( !console.debug ) {
        console.debug = console.log;
    }
    if( !console.trace ) {
        console.trace = console.log;
    }

    /**
     * @param {String} levelIn - log level (log4j)
     * @param {output} output string
     */
    var postLog = function( levelIn, output ) {
        if( _eventBus && _eventBus.publish ) {
            _eventBus.publish( 'log', {
                level: levelIn,
                output: output
            } );
        }
    };

    /**
     * @return {String} log correlation ID
     */
    exports.getCorrelationID = function() {
        return _logCorrelationID + ':' + _logCorrelationBase + '-' + _.now();
    };

    /**
     * @return {String} log correlation ID
     */
    function getCorrelationIDPrefix() {
        return _logCorrelationID ? _logCorrelationID + '\n' : '';
    }

    /**
     * @param {String} prefix log correlation ID prefix
     */
    exports.updateCorrelationID = function( prefix ) {
        if( prefix ) {
            _logCorrelationIDUpdates++;
            _logCorrelationID = prefix + '/' + _logCorrelationIDUpdates;
            if( exports.isTraceEnabled() ) {
                exports.trace( 'CorrelationID changed: ' + _logCorrelationID );
            }
        } else {
            _logCorrelationID = _.now().toString();
        }
    };

    /**
     * Checks whether this Logger is enabled for the ERROR Level.
     *
     * @returns {boolean} true if error output is enabled.
     */
    exports.isErrorEnabled = function() {
        return _level >= 1;
    };

    /**
     * Checks whether this Logger is enabled for the WARN Level.
     *
     * @returns {boolean} true if warning output is enabled.
     */
    exports.isWarnEnabled = function() {
        return _level >= 2;
    };

    /**
     * Checks whether this Logger is enabled for the INFO Level.
     *
     * @returns {boolean} true if info output is enabled.
     */
    exports.isInfoEnabled = function() {
        return _level >= 3;
    };

    /**
     * Checks whether this Logger is enabled for the DEBUG Level.
     *
     * @returns {boolean} true if debug output is enabled.
     */
    exports.isDebugEnabled = function() {
        return _level >= 4;
    };

    /**
     * Checks whether this Logger is enabled for the TRACE Level.
     *
     * @returns {boolean} true if trace output is enabled.
     */
    exports.isTraceEnabled = function() {
        return _level >= 5;
    };

    /**
     * Handle argument processing to support IE short coming.
     *
     * @return {Array} arguments to console function
     */
    function handleArg() {
        var args = [ getCorrelationIDPrefix() ];
        for( var ii = 0; ii < arguments.length; ii++ ) {
            args.push( arguments[ ii ] );
        }
        return args;
    }

    /**
     * Similar to info() but also includes a stack trace from where the method was called.
     */
    exports.error = function() {
        if( exports.isErrorEnabled() ) {
            console.error.apply( console, handleArg.apply( this, arguments ) );
            postLog( 'SEVERE', Array.prototype.join.call( arguments, ' ' ) );
        }
    };

    /**
     * This method is like info() but also displays a yellow warning icon along with the logged message.
     */
    exports.warn = function() {
        if( exports.isWarnEnabled() ) {
            console.warn.apply( console, handleArg.apply( this, arguments ) );
            postLog( 'WARNING', Array.prototype.join.call( arguments, ' ' ) );
        }
    };

    /**
     * This method is identical to debug() except for log level = 'CONFIG'.
     */
    exports.info = function() {
        if( exports.isInfoEnabled() ) {
            console.info.apply( console, handleArg.apply( this, arguments ) );
            postLog( 'CONFIG', Array.prototype.join.call( arguments, ' ' ) );
        }
    };

    exports.success = exports.info;

    /**
     * Displays a message in the console. You pass one or more objects to this method, each of which are evaluated and
     * concatenated into a space-delimited string. The first parameter you pass may contain format specifiers, a string
     * token composed of the percent sign (%) followed by a letter that indicates the formatting to be applied.
     */
    exports.debug = function() {
        if( exports.isDebugEnabled() ) {
            console.debug.apply( console, handleArg.apply( this, arguments ) );
            postLog( 'FINE', Array.prototype.join.call( arguments, ' ' ) );
        }
    };

    /**
     * Prints a stack trace from the point where the method was called, including links to the specific lines in the
     * JavaScript source.
     */
    exports.trace = function() {
        if( exports.isTraceEnabled() ) {
            console.debug.apply( console, handleArg.apply( this, arguments ) );
            postLog( 'FINER', Array.prototype.join.call( arguments, ' ' ) );
        }
    };

    /**
     * The method assumes there would be a 'declarativeLog' method on console and it routes logs to the method.
     * 'console.declarativeLog' can be used by devTools to record the logs. The method takes one parameter as a 'string'.
     */
    exports.declarativeLog = function() {
        if( console.declarativeLog ) {
            console.declarativeLog.apply( console, handleArg.apply( this, arguments ) );
        }
    };

    /**
     * Check if 'declarative logging' is enabled.
     *
     * @return {Boolean} TRUE if declarative debug logging is curently enabled.
     */
    exports.isDeclarativeLogEnabled = function() {
        return console.declarativeLog ? true : false; // eslint-disable-line no-unneeded-ternary
    };

    /**
     * Set event bus.
     *
     * @param {Object} eventBus - The event bus API object.
     */
    exports.setEventBus = function( eventBus ) {
        _eventBus = eventBus;
    };

    return exports;
} );
