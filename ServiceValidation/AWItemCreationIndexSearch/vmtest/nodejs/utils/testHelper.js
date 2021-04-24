// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define process require */

var dateFormat = require( 'dateformat' ); // eslint-disable-line no-implicit-globals

/**
 * @module nodejs/utils/testHelper
 */
define( [
    'app', 'assert', 'lodash', 'js/logger', 'js/configurationService',
    'nodejs/adapters/nodejs/fmsService', 'soa/kernel/clientDataModel', 'soa/dataManagementService', 'soa/kernel/soaService', 'soa/preferenceService', 'soa/sessionService'
], function( app, assert, _, logger, cfgSvc ) {
    'use strict';

    cfgSvc.add( 'schema', require( '../../config/schema.json' ).schema );

    var injector = app.getInjector();

    var _fmSvc = injector.get( 'fmsService' );
    var _cdm = injector.get( 'soa_kernel_clientDataModel' );
    var _dms = injector.get( 'soa_dataManagementService' );
    var _soaSvc = injector.get( 'soa_kernel_soaService' );
    var _prefSvc = injector.get( 'soa_preferenceService' );
    var _sessionSvc = injector.get( 'soa_sessionService' );

    var exports = {};

    /**
     * Format to use when reporting date/time and for any object names created.
     */
    exports.DATE_TIME_FORMAT = "yyyy-mm-dd HH:MM Z";

    exports.formatDateTime = function( dateTimeValue ) {
        if( _.isNumber( dateTimeValue ) ) {
            return dateFormat( new Date( dateTimeValue ), exports.DATE_TIME_FORMAT );
        } else if( _.isDate( dateTimeValue ) ) {
            return dateFormat( dateTimeValue, exports.DATE_TIME_FORMAT );
        }

        return dateTimeValue;
    };

    /**
     * Sign into the Teamcenter server with the given username and password.
     *
     * @param {String} username - The user name to sign in with.
     * @param {String} password - The user password to sign in with.
     *
     * @return {Promise} A promise that will be resolved when the login is completed.
     */
	
	exports.setUserSessionState = function( state ) {
		var state = JSON.parse(JSON.stringify(state));
		return _sessionSvc.setUserSessionState( state ).then( function( response ) {
            logger.debug( 'Session state successfully set ... ' );
            return response;
        }, function( err ) {
            logger.error( 'Unable to set session state:\n' + JSON.stringify( err, null, 2 ) );
        } );		
	}
	 
    exports.signIn = function( username, password ) {
        var usernameFinal = username;
        var passwordFinal = password;

        if( !usernameFinal ) {
            if( process.argv.length > 2 ) {
                usernameFinal = process.argv[ 2 ];
            } else {
                usernameFinal = process.env.USERNAME;
            }
        }

        if( !passwordFinal && process.argv.length > 3 ) {
            passwordFinal = process.argv[ 3 ];
        }

        if( !passwordFinal ) {
            passwordFinal = usernameFinal;
        }
		
		var group = '';
        var role = '';
        var locale = 'en_US';
		
        return _sessionSvc.signIn( usernameFinal, passwordFinal, group, role, locale ).then( function( response ) {
            logger.debug( 'signIn success for ' + usernameFinal );
            return response;
        }, function( err ) {
            logger.error( 'Problem with signIn:\n' + JSON.stringify( err, null, 2 ) );
        } );
    };

    /**
     * Get current TCSessionInfo ModelObject.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.getTCSessionInfo = function() {
        return _dms.getTCSessionInfo().then( function( response ) {
            logger.success( 'getTCSessionInfo success' );
            logger.debug( '\tserver version = ' + response.extraInfoOut.TCServerVersion );
			//logger.info(response);
            return response;
        }, function( err ) {
            logger.error( 'Problem with getTCSessionInfo:\n\t' + err.message );
        } );
    };

    /**
     * Assure the given set of properties are loaded and up-to-date on the specified ModelObject.
     *
     * @param {ModelObject} modelObject - The ModelObject to load properties for.
     * @param {StringArray} propNames - Array of property name to load.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.getProperties = function( modelObject, propNames ) {
        return _dms.getProperties( [ modelObject.uid ], propNames ).then( function(result) {
            logger.success( 'getProperties success' );
//			logger.info(result);
			return result;
//            return true;
        }, function( err ) {
            logger.error( 'getProperties failed:\n\t' + err.message );
        } );
    };
	
//	exports.getUser = function() {
//		return _cdm.getUser();
//	}
	
	exports.getHomeFolder = function( homeFolderUID ) {
		return _cdm.getObject( homeFolderUID );
	}
	
	exports.getUProps = function() {
		var UProps = _cdm.getUser();
//		var homeFolder = user.props.home_folder;
//		logger.info(UProps);
//		logger.info(_.get( UProps, 'props.home_folder' ));

//		return user.props.home_folder;

//		var uprops = exports.getProperties( user, [ 'home_folder' ] );
//		logger.info(uprops);

		return UProps;
//		logger.info(JSON.stringify(user))
//		var homeFolderUID = user.props.home_folder.dbValues[ 0 ];
//		var homeFolder = _cdm.getObject( homeFolderUID );
//		return homeFolder;
	}

    /**
     * End the current user session.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.signOut = function() {
        return _sessionSvc.signOut().then( function( response ) {
            logger.success( 'signOut success' );
            return response;
        }, function( err ) {
            logger.error( 'signOut failed:\n\t' + err.message );
        } );
    };

    /**
     * Create an Item and attach it to the given ModelObject.
     *
     * @param {ModelObject} target - ModelObject to attach the new Item to.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.createFolder = function( target, pasteProp, folderName ) {
        var folderObj;

        return _dms.createRelateAndSubmitObjects( [ {
            createData: {
                boName: 'Folder',
                propertyNameValues: {
                    object_name: [ folderName ]
                }
            }
        } ] ).then( function( response ) {
            folderObj = _cdm.getObject( response.output[ 0 ].objects[ 0 ].uid );
            return _dms.createRelations( [ {
                relationType: pasteProp,
                primaryObject: target,
                secondaryObject: folderObj
            } ] );
        } ).then( function() {
            return folderObj;
        } );
    };

    /**
     * Create a 'source' Document and attach it to the given 'target' IModelObject.
     *
     * @param {IModelObject} target - ModelObject to attach the newly created Object to.
     * @param {String} pasteProp - Name of the relation to use when pasting the new 'source' object to the 'target'.
     * @param {String} objName - The 'object_name' to assign to the new 'source' object.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.createDocument = function( target, pasteProp, objName ) {
        return _dms.createItem( target, pasteProp, 'Document', objName ).then( function( docRevision ) {
            logger.success( 'Document created: ' + docRevision );
            return docRevision;
        }, function( err ) {
            logger.error( 'Document creation failed:\n\t' + err.message );
        } );
    };

    /**
     * Create an Item and attach it to the given ModelObject.
     *
     * @param {IModelObject} target - ModelObject to attach the newly created Object to.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.createItem = function( target, pasteProp, itemName ) {
        return _dms.createItem( target, pasteProp, 'Item', itemName ).then( function( itemRevision ) {
            //logger.success( 'item created: ' + itemRevision );
			logger.success( 'Item created');
            return itemRevision;
        }, function( err ) {
            logger.error( 'item creation failed:\n\t' + err.message );
        } );
    };

    /**
     * Create a DataSet and upload and attach the given local file.
     *
     * @param {ModelObject} target - ModelObject to attache the new DataSet to.
     *
     * @param {String} fileName - Name of the local file to upload and attach.
     *
     * @param {String} fileType - Type (content type) of the file (e.g. 'JPEG").
     *
     * @param {String} nameReferenceType - Relation type to use when attaching the file to the DataSet.
     *
     * @param {Boolean} isText - TRUE if the file should be treated as a plain text file.
     *
     * @param {String} relationType - Relation type to use when attaching the DataSet to the 'target' ModelObject.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.createDataset = function( target, fileName, filePath, fileType, nameReferenceType, isText, relationType ) {
        var isTextFinal = isText;

        if( !isTextFinal ) {
            isTextFinal = false;
        }

        var dataset = {};
        var ticket = null;

        return exports.createDatasets( [ {
            name: fileName + Date.now(),
            type: fileType,
            datasetFileInfos: [ {
                fileName: fileName,
                namedReferenceName: nameReferenceType,
                isText: isTextFinal
            } ]

        } ] ).then( function( response ) {
            // Create relation between target & newly created dataset
            assert( response.datasetOutput.length === 1 );
            assert( response.datasetOutput[ 0 ].commitInfo.length === 1 );
            assert( response.datasetOutput[ 0 ].commitInfo[ 0 ].datasetFileTicketInfos.length === 1 );

            dataset = _cdm.getObject( response.datasetOutput[ 0 ].dataset.uid );

            ticket = response.datasetOutput[ 0 ].commitInfo[ 0 ].datasetFileTicketInfos[ 0 ].ticket;

			process.env.oldTicket = ticket;
			
            return _dms.createRelations( [ {
                relationType: relationType,
                primaryObject: target,
                secondaryObject: dataset
            } ] );

//        } ).then( function() {
//            // Upload file via FMS
//			logger.info('Uploading ' + filePath + ' to ' + process.env.AW_PROXY_SERVER + ' ...');
//			//logger.info('Ticket: ' + ticket);
//           return _fmSvc.upload( filePath, ticket );
//		} ).then ( function(response) {
		} ).then ( function() {



/* 			
			var requests = [];
			
			var request = {};
			
			var oldTicket = ticket;
			
			logger.info('Old Ticket: ' + oldTicket);
			
            var clientId = 'ActiveWorkspaceClient';

            request.clientId = clientId;
            request.datasetTypeName = fileType;
            request.version = 1;
            request.fileInfos = [ {
                clientFileId: clientId,
                refName: nameReferenceType,
                isText: isTextFinal,
                fileName: fileName
            } ];

            requests.push( request );

			return _soaSvc.post( 'Internal-Core-2008-06-FileManagement', 'getWriteTickets', {
				inputs: requests
			} );
		
		} ).then ( function(response) {
			
			//logger.info('GetWriteTickets Response: '+JSON.stringify(response));
			
			var newTicket = response.tickets[process.env.ClientId][0].ticket
			
			logger.info('New Ticket: '+newTicket);
			
			return newTicket;
			
		} ).then ( function(newTicket) { */
		
		
		
			logger.info('Uploading ' + filePath + ' to ' + process.env.AW_PROXY_SERVER + ' ...');
			logger.info('Old Ticket: ' + process.env.oldTicket);
			logger.info('Cookie: '+ process.env.JSessionID);
			//var ticket = newTicket;
			var ticket = process.env.oldTicket;
			return _fmSvc.realupload( filePath, ticket, process.env.JSessionID, fileName);
			
        } ).then( function() {
            // Commit newly upload file to dataset
            return _soaSvc.post( 'Core-2006-03-FileManagement', 'commitDatasetFiles', {
                commitInput: [ {
                    dataset: dataset,
                    createNewVersion: true,
                    datasetFileTicketInfos: [ {
                        datasetFileInfo: {
                            fileName: fileName,
                            namedReferencedName: nameReferenceType
                        },
                        ticket: ticket
                    } ]
                } ]
            } );

        } ).then( function( response ) {

            // Commit newly upload file to dataset
            return response;
        } );
    };

    /**
     * @param {ObjectArray} inputs - Information defining the DataSet(s) to create.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.createDatasets = function( inputs ) {
        var request = {
            input: inputs
        };

        return _soaSvc.post( 'Core-2010-04-DataManagement', 'createDatasets', request ).then( function( response ) {
//            logger.success( 'Dataset created: ' + JSON.stringify(response.datasetOutput[ 0 ]) );
			//logger.success( 'Dataset created' );
            return response;
        }, function( err ) {
            logger.error( 'dataset creation failed:\n\t' + err.message );
        } );
    };

    /**
     * @param {ModelObjecxt} target -
     * @param {Object} pasteProp -
     * @param {String} itemName -
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.createPropertySupportItem = function( target, pasteProp, itemName ) {
        return _dms.createItem( target, pasteProp, 'AW2_Prop_Support', itemName ).then( function( itemRevision ) {
            logger.success( 'AW2_Prop_Support created: ' + itemRevision.props.object_string.uiValue );
            return itemRevision;
        }, function( err ) {
            logger.error( 'AW2_Prop_Support creation failed:\n\t' + err.message );
        } );
    };
	
//	exports.createPropertySupportItem = function( target, pasteProp, itemName ) {
//        return _dms.createItem( target, pasteProp, 'Item', itemName ).then( function( itemRevision ) {
//            //logger.success( 'Document created: ' + itemRevision.props.object_string.uiValue );
//			logger.success( 'Document created');
//			//logger.info(itemRevision);
//            return itemRevision;
//        }, function( err ) {
//            logger.error( 'Document creation failed:\n\t' + err.message );
//        } );
//    };

    /**
     * @param {String} prefName - Name of the preference to return a value for.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.getStringValue = function( prefName ) {
        return _prefSvc.getStringValue( prefName ).then( function( prefValue ) {
            logger.success( 'preference queried - ' + prefName + '=' + prefValue );
            return prefValue;
        }, function( err ) {
            logger.error( 'preference query failed:\n\t' + err.message );
        } );
    };

    /**
     * @param {String} prefName - Name of the preference to return a value for.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.getLogicalValue = function( prefName ) {
        return _prefSvc.getLogicalValue( prefName ).then( function( prefValue ) {
            logger.success( 'preference queried - ' + prefName + '=' + prefValue );
            return prefValue;
        }, function( err ) {
            logger.error( 'preference query failed:\n\t' + err.message );
        } );
    };

    /**
     * Get all preferences currently defined on the server.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.queryAll = function() {
        return _prefSvc.queryAll().then( function( prefName2pref ) {
            logger.success( 'all preferences queried' );
            return prefName2pref;
        }, function( err ) {
            logger.error( 'preference query failed:\n\t' + err.message );
        } );
    };

    /**
     * Get all preferences currently defined on the server.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.queryAllUserVisiblePreferences = function() {
        return _soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
            preferenceNames: [ '*' ],
            includePreferenceDescriptions: true
        }, function( err ) {
            logger.error( 'Query all user visible preferences failed:\n\t' + err.message );
        } );
    };

    /**
     * @param {StringArray} prefNames - Names of the preferences to return a value for.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.getMultiStringValues = function( prefNames ) {
        return _prefSvc.getMultiStringValues( prefNames ).then( function( response ) {
            logger.success( 'preferences queried' );
            return response;
        }, function( err ) {
            logger.error( 'preference query failed:\n\t' + err.message );
        } );
    };

    /**
     * @param {String} prefName - Name of the preference to set the value of.
     * @param {Object} value - Object that represents the value of the preference to be set.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.setPref = function( prefName, value ) {
        return _prefSvc.setStringValue( prefName, [ value ] ).then( function( response ) {
            logger.success( 'preference set - ' + prefName + '=' + value );
            return response;
        }, function( err ) {
            logger.error( 'preference set failed:\n\t' + err.message );
        } );
    };

    /**
     * @param {String} prefName - Name of the preference to set the value of.
     * @param {Array} values - Object that represents the value of the preference to be set.
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.setPrefs = function( prefName, values ) {
        return _prefSvc.setStringValue( prefName, values ).then( function() {
            logger.success( 'preference set - ' + prefName + '=' + values.join( ',' ) );
            return null;
        }, function( err ) {
            logger.error( 'preference set failed:\n\t' + err.message );
        } );
    };

    /**
     * @param {IModelObject} modelObj - Object to submite to a workflow.
     *
     * @param {String} templateName - Name of the workflow to submit the given object to.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.submitToWorkflow = function( modelObj, templateName ) {
        var request = {
            startImmediately: true,
            name: modelObj.toString(),
            contextData: {
                processTemplate: templateName,
                attachmentCount: 1,
                attachments: [ modelObj.uid ],
                attachmentTypes: [ 1 ],
                subscribeToEvents: false
            }
        };

        return _soaSvc.post( 'Workflow-2008-06-Workflow', 'createInstance', request ).then( function( response ) {
            logger.success( 'submitted to workflow: ' + templateName );
            return response;
        }, function( err ) {
            logger.error( 'submit to workflow failed for ' + templateName + ':\n\t' + err.message );
        } );
    };

    /**
     * @param {IModelObjectArray} modelObjs - Objects to add to favorites.
     *
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     */
    exports.addFavorites = function( modelObjs ) {
        var request = {
            shortcutInputs: {
                FavoritesSection: "My Favorites"
            }
        };

        return _soaSvc.post( 'Core-2010-04-Session', 'getShortcuts', request ).then( function( response ) {

            var newFavs = [];
            var mobj;
            var fav;

            if( response.favorites.objects ) {
                for( var j = 0; j < response.favorites.objects.length; j++ ) {
                    mobj = response.favorites.objects[ j ];

                    fav = {
                        clientId: "",
                        displayName: mobj.displayName,
                        objectTag: {
                            type: mobj.objectTag.type,
                            uid: mobj.objectTag.uid
                        },
                        parentId: "0000"
                    };

                    newFavs.push( fav );
                }
            }

            for( var i = 0; i < modelObjs.length; i++ ) {
                mobj = modelObjs[ i ];
                fav = {
                    clientId: "",
                    displayName: mobj.props.object_string.getDisplayValue(),
                    objectTag: {
                        type: mobj.type,
                        uid: mobj.uid
                    },
                    parentId: "0000"
                };

                newFavs.push( fav );
            }

            var request2 = {
                input: {
                    curFavorites: {
                        containers: [],
                        objects: []
                    },
                    newFavorites: {
                        containers: [],
                        objects: newFavs
                    }
                }
            };

            return _soaSvc.post( 'Core-2008-03-Session', 'setFavorites', request2 ).then( function( result ) {
                return result;
            } );
        } );
    };

    /**
     * @param {Object} searchCriteria - A map (string, string) used to perform the search. For full text search, the key
     *            is "searchString", the value is "*". For advanced search, the key can be "queryID" ,
     *            "quickSearchAttributeValue", "searchID", "typeOfSearch", "QUICK_SEARCH" or "ADVANCED_SEARCH", the
     *            value is unique identifier.
     *
     * @param {StringArray} attributesToInflate - A list of attributes to inflate (extract the details).
     */
    exports.performSearch = function( searchCriteria, attributesToInflate ) {
        var request = {
            searchInput: {
                attributesToInflate: attributesToInflate,
                providerName: "Awp0FullTextSearchProvider",
                maxToLoad: 50,
                maxToReturn: 50,
                searchCriteria: searchCriteria,
                searchFilterFieldSortType: "Priority",
                searchFilterMap: {},
                searchSortCriteria: [],
                startIndex: 0
            }
        };

        return _soaSvc.post( 'Internal-AWS2-2016-03-Finder', 'performSearch', request );
    };

    return exports;
} );
