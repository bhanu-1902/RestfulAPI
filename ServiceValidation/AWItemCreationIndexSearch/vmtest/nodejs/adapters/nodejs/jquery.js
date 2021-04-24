// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * 
 * @module js/adapters/nodejs/jquery
 */
define( [], function() {
    'use strict';
    var jquery = function() {
        //
    };
    jquery.html = function( value ) {
        return {
            val: function() {
                return value;
            }
        };
    };
    return jquery;
} );
