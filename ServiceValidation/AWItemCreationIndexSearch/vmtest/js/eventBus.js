// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * This service manages the subscription and publishing of the events. It is based on the 'PostalJS' API.
 * <P>
 * For more details, see: {@link https://github.com/postaljs/postal.js|PostalJS}
 * <P>
 *
 * @module js/eventBus
 *
 * @publishedApolloService
 *
 */
define( [ //
    'lodash', //
    'postal', //
    'js/browserUtils', //
    'js/logger' //
], function( _, postal, browserUtils, logger ) {
    'use strict';

    /**
     * {Boolean} TRUE if subscribe/unsubscribe activity should be logged to the console.
     * <P>
     * Note: This flag is controlled by the existence of the 'logEventBusActivity' attribute in the current document's
     * URL.
     */
    var _logActivity = false;

    /**
     * {Boolean} TRUE if the 'soa.getVisibleCommands' topic (a particularly high volume of subscribe/unsubscribe events)
     * should be logged to the console. FALSE if they should not be logged to allow lower volume issues to be more
     * easily traced.
     * <P>
     * Note: This flag is controlled by the existence of the 'logEventBusCommandVisibility' attribute in the current
     * document's URL.
     */
    var _logCommandVisibility = false;

    /**
     * {Boolean} TRUE if 'publish' activity should be logged to the console.
     * <P>
     * Note: This flag is controlled by the existence of the 'logPublishActivity' attribute in the current document's
     * URL.
     * <P>
     * Note: If the attribute has NO value, all publish event topic will be logged. If it has a value it is interpreted
     * as a comma separated list of topics to limit logging to.
     */
    var _logPublishActivity;

    /**
     * {Boolean} TRUE if 'publish' activity from the client data model (cdm) should be logged to the console.
     * <P>
     * Note: This flag is controlled by the existence of the 'logCdmPublishActivity' attribute in the current document's
     * URL.
     */
    var _logCdmPublishActivity;

    /**
     * {StringArray} Topic names to limit logging to.
     */
    var _logPublishActivityKeys;

    /**
     * {Map} Map of topic-to-active-topic-subcription-count (used only when _logActivity is TRUE).
     */
    var _topic2CountMap = {};

    /**
     * {Map} Map of topic-to-published-count (used only when _logActivity is TRUE).
     */
    var _topic2PublishCountMap = {};

    /**
     * Set debug options based on URL attributes.
     */
    var urlAttrs = browserUtils.getUrlAttributes();

    _logActivity = urlAttrs.logEventBusActivity !== undefined;

    _logCommandVisibility = urlAttrs.logEventBusCommandVisibility !== undefined;

    if( urlAttrs.logPublishActivity !== undefined ) {
        _logPublishActivity = true;

        if( !_.isEmpty( urlAttrs.logPublishActivity ) ) {
            _logPublishActivityKeys = urlAttrs.logPublishActivity.split( ',' );
        }
    }

    _logCdmPublishActivity = urlAttrs.logCdmPublishActivity !== undefined;

    /**
     * Add modeule objects to the given array.
     *
     * @param {String} msg - Message to append information to.
     * @param {ViewModelObjectArray} modelObjects - Array of modelObjects to append info for.
     *
     * @returns {String} A message string with new information lines appended.
     */
    function _appendModelObjects( msg, modelObjects ) {
        if( !_.isEmpty( modelObjects ) ) {

            _.forEach( modelObjects, function( mo, ndx ) {
                var begLength = msg.length;

                msg += '\n';
                msg += '  [';
                msg += ndx;
                msg += ']: type: ';
                msg += mo.type;

                for( var char = msg.length - begLength; char < 40; char++ ) {
                    msg += ' ';
                }

                msg += ' uid: ';
                msg += mo.uid;
            } );
        } else {
            msg += '  (empty)';
        }

        return msg;

    } // _appendModelObjects

    /**
     * Increment/decrement count of subsriptions to the given topic.
     *
     * @param {String} topic -
     * @param {Number} increment -
     *
     * @returns {Number} Updated count for the given topic.
     */
    function _changeTopicSubscriptionCount( topic, increment ) {
        var count = _topic2CountMap[ topic ];

        if( !count ) {
            count = 0;
        }

        var newCount = count + increment;

        _topic2CountMap[ topic ] = newCount;

        return newCount;
    }

    /**
     * Define public API
     * @ignore
     */
    var exports = {};

    /**
     * This function wraps the 'subscribe' function in the underlying 'postal' API. The 'options' allows listeneing for
     * a given 'topic' on the given event 'channel'. When the event is published the given function will be invoked and
     * passed the 'eventData'.
     *
     * @param {Object} options - Option object specifying the 'topic' channel' and call back function (see 'postal' API
     *            for more details).
     *
     * <pre>
     * options - An object that contains:
     *     channel - (optional) the channel name (string)
     *     topic - (required!) the topic name (string)
     *     callback - (required!) the callback to be fired when the subscription receives a message.
     *     This callback can take up to two arguments (in this order):
     *          data - just the data published as the message body
     *          envelope - the full envelope which includes (at a minimum):
     *              channel - the channel on which the message was published
     *              topic - the topic used when the message was published
     *              timeStamp - the date/time the message was published
     *              data - same as the first argument, the data published with the message
     * </pre>
     *
     * @return {Object} A 'PostalJS' SubscriptionDefinition object.
     * @ignore
     */
    exports.subscribePostal = function( options ) {
        return exports.subscribeOnChannel( options );
    };

    /**
     * This function wraps the 'subscribe' function in the underlying 'postal' API. The 'options' allows listening for
     * a given 'topic' on the given event 'channel'. When the event is published the given function will be invoked and
     * passed the 'eventData'.
     *
     * @param {Object} options - Option object specifying the 'topic' channel' and call back function (see 'postal' API
     *            for more details).
     *
     * <pre>
     * options - An object that contains:
     *     channel - (optional) the channel name (string)
     *     topic - (required!) the topic name (string)
     *     callback - (required!) the callback to be fired when the subscription receives a message.
     *     This callback can take up to two arguments (in this order):
     *          data - just the data published as the message body
     *          envelope - the full envelope which includes (at a minimum):
     *              channel - the channel on which the message was published
     *              topic - the topic used when the message was published
     *              timeStamp - the date/time the message was published
     *              data - same as the first argument, the data published with the message
     * </pre>
     *
     * @return {Object} A 'PostalJS' SubscriptionDefinition object.
     * @ignore
     */
    exports.subscribeOnChannel = function( options ) {
        return postal.subscribe( options );
    };

    /**
     * This function wraps the 'publish' function in the underlying 'postal' API.
     *
     * @param {Object} envelope - Option object specifying the 'topic' channel' and call back function (see 'postal' API
     *            for more details).
     *
     * <pre>
     * envelope - an object that contains:
     *     channel - (optional) channel name (string). Uses DEFAULT_CHANNEL if no channel is provided.
     *     topic - (required!) the topic string
     *     data - (optional) value of any type. This is effectively the message body.
     * </pre>
     *
     * @param {Function} cb - Function invoked when the publish is complete and is passed information about the status
     *            of the publish operation.
     * @ignore
     */
    exports.publishPostal = function( envelope, cb ) {
        exports.publishOnChannel( envelope, cb );
    };

    /**
     * This function wraps the 'publish' function in the underlying 'postal' API.
     *
     * @param {Object} envelope - Option object specifying the 'topic' channel' and call back function (see 'postal' API
     *            for more details).
     *
     * <pre>
     * envelope - an object that contains:
     *     channel - (optional) channel name (string). Uses DEFAULT_CHANNEL if no channel is provided.
     *     topic - (required!) the topic string
     *     data - (optional) value of any type. This is effectively the message body.
     * </pre>
     *
     * @param {Function} cb - Function invoked when the publish is complete and is passed information about the status
     *            of the publish operation.
     * @ignore
     */
    exports.publishOnChannel = function( envelope, cb ) {
        postal.publish( envelope, cb );
    };

    /**
     * Subscribe to the given 'topic' on the event channel. When the event is published, the given function will
     * be invoked and passed the 'eventData'.
     *
     * @param {String} topic - Topic to subscribe to. A '#' character is interpreted as a wildcard.
     *
     * @param {Function} callbackFn - Function to be invoked and passed 'eventData' when the event is published.
     *
     * @param {String} subId - An optional ID to associate with this subscription.
     *
     * @return {Object} A 'PostalJS' SubscriptionDefinition object. Needed while unsuscribing the event topic using {@link module:js/eventBus.unsubscribe|unsubscribe}.
     */
    exports.subscribe = function( topic, callbackFn, subId ) {
        var subDef = postal.subscribe( {
            channel: "soajs",
            topic: topic,
            callback: callbackFn
        } );

        if( _logActivity || _logPublishActivity ) {
            var count = _changeTopicSubscriptionCount( subDef.topic, 1 );

            if( _logActivity && ( _logCommandVisibility || topic !== 'soa.getVisibleCommands' ) ) {

                if( subId ) {
                    console.log( 'Subscribe Topic: "' + topic + '" count: ' + count + ' id: ' + subId ); // eslint-disable-line no-console
                    subDef.id = subId;
                } else {
                    console.log( 'Subscribe Topic: "' + topic + '" count: ' + count ); // eslint-disable-line no-console
                }
            }
        }

        return subDef;
    };

    /**
     * Publish the given 'topic' on the event channel. The given 'eventData' will be passed to each subscribers
     * callback function.
     *
     * @param {String} topic - Topic to publish.
     * @param {Object} eventData - Optional data to pass to the subscribed callback functions.
     */
    exports.publish = function( topic, eventData ) {
        var doLogging = false;

        if( _logPublishActivity ) {
            if( _logCommandVisibility ) {
                doLogging = !/^(log|progress.start|progress.end|StartSaveAutoBookmarkEvent)$/.test( topic );
            } else {
                doLogging = !/^(log|progress.start|progress.end|soa.getVisibleCommands|StartSaveAutoBookmarkEvent)$/.test( topic );
            }
        }

        /**
         * Check if we are listing ALL or just a select few topics (and this topic is one)
         */
        if( doLogging && ( !_logPublishActivityKeys || _.indexOf( _logPublishActivityKeys, topic ) !== -1 ) ) {
            var msg = 'Publish Topic: ';

            var nListeners = _topic2CountMap[ topic ] ? _topic2CountMap[ topic ] : 0;

            if( nListeners === 0 ) {
                msg += ' (!) ';
            }

            msg += topic;

            if( eventData ) {
                if( eventData.name === 'state' ) {
                    msg += '  event: ';
                    msg += JSON.stringify( eventData, [ 'name', 'target' ] );

                    msg += ' value: ';

                    _.forEach( eventData.value.params, function( value, name ) {
                        if( value ) {
                            var msg2 = '';

                            msg2 += '\n';
                            msg2 += name;

                            while( msg2.length < 15 ) {
                                msg2 += ' ';
                            }

                            msg2 += ' = ';

                            msg2 += '"';
                            msg2 += value;
                            msg2 += '"';

                            msg += msg2;
                        }
                    } );

                    msg += '\n';

                } else if( eventData.name === 'selected' || eventData.name === 'pselected' ) {
                    msg += '  event: ';
                    msg += JSON.stringify( eventData, [ 'name', 'target' ] );

                    msg += '  selected: ';
                    msg += eventData.value;

                } else if( _logCdmPublishActivity ) {
                    if( topic === 'cdm.new' ) {
                        msg = _appendModelObjects( msg, eventData.newObjects );
                    } else if( topic === 'cdm.modified' ) {
                        msg = _appendModelObjects( msg, eventData.modifiedObjects );
                    } else if( topic === 'cdm.updated' || topic === 'cdm.modified' ) {
                        msg = _appendModelObjects( msg, eventData.updatedObjects );
                    }
                } else if( topic === 'primaryWorkArea.selectionChangeEvent' ) {
                    msg += '  selection: ';
                    msg += JSON.stringify( eventData.selectionModel.getSelection() );
                } else {
                    msg += '  event: ';
                    msg += JSON.stringify( eventData, [ 'name', 'target' ] );
                }
            }

            if( nListeners > 0 ) {
                msg += '  nListeners: ';
                msg += nListeners;
            }

            if( _topic2PublishCountMap[ topic ] ) {
                _topic2PublishCountMap[ topic ]++;
            } else {
                _topic2PublishCountMap[ topic ] = 1;
            }

            msg += '  totalCount: ';
            msg += _topic2PublishCountMap[ topic ];

            console.log( msg ); // eslint-disable-line no-console
        }

        postal.publish( {
            channel: "soajs",
            topic: topic,
            data: eventData
        } );
    };

    /**
     * Removes the given subscription from the event channel so that the callback will no longer be invoked.
     *
     * @param {Object} subDef - A 'PostalJS' SubscriptionDefinition object returned by {@link module:js/eventBus.subscribe|subscribe}
     */
    exports.unsubscribe = function( subDef ) {
        if( _logActivity || _logPublishActivity ) {
            var count = _changeTopicSubscriptionCount( subDef.topic, -1 );

            if( _logActivity && ( _logCommandVisibility || subDef.topic !== 'soa.getVisibleCommands' ) ) {
                if( subDef.id ) {
                    console.log( '   Unsubscribe Topic: "' + subDef.topic + '" count: ' + count + // eslint-disable-line no-console
                        ' id: ' + subDef.id );
                } else {
                    console.log( '   Unsubscribe Topic: "' + subDef.topic + '" count: ' + count ); // eslint-disable-line no-console
                }
            }
        }

        postal.unsubscribe( subDef );
    };

    logger.setEventBus( exports );

    return exports;
} );
