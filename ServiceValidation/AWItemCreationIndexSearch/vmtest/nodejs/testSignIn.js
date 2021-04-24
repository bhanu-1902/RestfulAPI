// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* eslint-disable no-implicit-globals */
/* global require __dirname process */

var requirejs = require( 'requirejs' );
require( __dirname + '/utils/testBootstrap' ).initialize( requirejs );

/**
 * We are done with the NodeJS specific code. Load and execute the modules compatible with NodeJS or AngularJS.
 */
requirejs( [
	'app', 'lodash', 'js/logger', 'nodejs/utils/testHelper'
], function( app, _, logger, testHelper ) {
	'use strict';

//		var policyString = "MyPolicy";

        /**
         * Perform the sequence of steps for this test.
         */
        // var policyId = propPolicySvc.register( {
            // types: [ {
                // name: 'BusinessObject',
                // properties: [ {
                    // name: 'object_string'
                // } ]
            // }, {
                // name: 'User',
                // properties: [ {
                    // name: 'home_folder'
                // } ]
            // }, {
                // name: 'Fnd0HomeFolder',
                // properties: [ {
                    // name: 'contents'
                // } ]
            // } ]
        // } );
	
	var homeFolder = null;
	var itemRev = null;
	
	var startTime = _.now();

//		var policyId2registrationTimeStamp = {};

//        policyId2registrationTimeStamp[ policyId ] = testHelper.formatDateTime( startTime ) + policyString;


	logger.info( 'Start: ' + testHelper.formatDateTime( startTime ) );
	
//	var injector = app.getInjector();
//	var cdm = injector.get( 'soa_kernel_clientDataModel' );

//	const state = {
//        //url: url,
//        header: {
//            state: {
//                clientVersion: '10000.1.2',
//                logCorrelationID: Date.now(),
//                stateless: true,
//                unloadObjects: true,
//                enableServerStateHeaders: true,
//                formatProperties: true,
//                clientID: 'ActiveWorkspaceClient'
//            },
//            policy: {}
//        },
//        cookie: ''
//    };
	
	testHelper.signIn().then( function() {
		logger.info( 'Login In: ' + ( _.now() - startTime ) / 1000 + " secs" );
		//var sessioninfo = testHelper.getTCSessionInfo();
//		return testHelper.setUserSessionState(state);
		
		//return sessioninfo;
		//return testHelper.getProperties();
		//logger.info( JSON.stringify(sessioninfo));
		//logger.info(sessioninfo)
		//return testHelper.getProperties(sessioninfo.ServiceData.modelObjects[0],["group_name", "user_id", "user"]);
//	} ).then( function() {
//		var user = testHelper.getUser();
//		var props = testHelper.getProperties(user, [ 'home_folder' ]);
//		logger.info( JSON.stringify(props) );
//		return props;
//		return testHelper.getProperties( user, [ 'home_folder' ] );
		
//	} ).then( function() {
//		return testHelper.setPref( 'ActiveWorkspaceHosting.URL', process.env.AW_PROXY_SERVER );

//	} ).then( function() {
//		logger.info('JSessionID After SIGNIN: '+process.env.JSessionID);
		return testHelper.getTCSessionInfo();
//		logger.info('JSessionID After GetTCSessionInfo: '+process.env.JSessionID);
		
	} ).then( function(response) {
		//logger.info(response)
		//logger.info('COOKIE XSRF'+response.header[ 'set-cookie' ]);
//		testHelper.getUser().then( function(result) {
//			var user = result;
//		});

//		var user = testHelper.getUser();
//		var user = cdm.getUser();
		
//		var homeFolderUID = user.props.home_folder.dbValues[ 0 ];

		var uprops = testHelper.getUProps();
//		logger.info(homeFolder)
//		homeFolder = cdm.getObject( homeFolderUID );
		
//		logger.info(testHelper.getProperties( homeFolder, [ 'home_folder' ] ));

		var ttt = testHelper.getProperties( uprops, [ 'home_folder' ] );
//		logger.info(ttt);
		
		//logger.info(ttt.modelObjects[1].uid)
		
		//return testHelper.getProperties( homeFolder, [ 'home_folder' ] );
//		logger.info('JSessionID Before GetProperties: '+process.env.JSessionID);
		return ttt;
		
	} ).then( function( result ) {
		//var fff = JSON.parse(JSON.stringify(result.modelObjects));
		
		//obj[Object.keys(obj)[1]]
		
		//logger.info(fff[Object.keys(fff)[1]].uid);
		
		//--------------logger.info(result.modelObjects[Object.keys(result.modelObjects)[1]].uid);
		
		//homeFolder = testHelper.getHomeFolder(result.modelObjects[Object.keys(result.modelObjects)[1]].uid);
//		logger.info('JSessionID Before getHomeFolder: '+process.env.JSessionID);
		return testHelper.getHomeFolder(result.modelObjects[Object.keys(result.modelObjects)[1]].uid);
		
		//return testHelper.getProperties(result.modelObjects[Object.keys(result.modelObjects)[1]], [ 'home_folder' ] );
		//return testHelper.getProperties(homeFolder, [ 'home_folder' ] );
		
		//logger.info(fff);
		//var ttt = _.get(result, 'modelObjects.SucceededCount[0]')
		//logger.info(ttt);
		
		
	} ).then( function( HomeFolderObj ) {
		//logger.info(result);
		homeFolder = HomeFolderObj;
//		logger.info('JSessionID Before SecondGetPropeties: '+process.env.JSessionID);
		return testHelper.getProperties( HomeFolderObj, [ 'home_folder' ] );
		
	} ).then( function( result ) {
		//logger.info(result);
		// List content of home folder
		//logger.info(homeFolder);
		//var contents = homeFolder.props.contents.uiValues;
		var contents = [];
		for( var ii = 0; ii < contents.length; ii++ ) {
			logger.debug( '\t' + contents[ ii ] );
		}
		return result;

	} ).then( function() {
		//return testHelper.createPropertySupportItem( homeFolder, 'contents', 'Property Support' );
//		logger.info('JSessionID Before CreateItem: '+process.env.JSessionID);
		return testHelper.createItem( homeFolder, 'contents', 'TestItemWithJPEG' );
		
	} ).then( function( itemRevision ) {
		//logger.info(itemRevision);
		//logger.info(process.env.JPGPATH)
//		logger.info('JSessionID Before CreateDataSet: '+process.env.JSessionID);
		return testHelper.createDataset( itemRevision, "test.jpg", process.env.JPGPATH + "test.jpg", "JPEG", "JPEG_Reference", false, "TC_Attaches" );
		
	} ).then( function() {
		// Remove stale property from cache
		//delete homeFolder.props.contents;
//		logger.info('JSessionID Before ThirdGetProperties: '+process.env.JSessionID);
		return testHelper.getProperties( homeFolder, [ 'contents' ] );
		
	} ).then( function( result ) {
		// List content of home folder
		//var contents = homeFolder.props.contents.uiValues;
		//logger.info(result);
		var contents = [];
		for( var ii = 0; ii < contents.length; ii++ ) {
			logger.debug( '\t' + contents[ ii ] );
		}
		return result;

//		} ).then( function() {
//			return testHelper.getLogicalValue( 'Tracelink_Edit_enabled' );

//		} ).then( function() {
//			return testHelper.setPref( 'Tracelink_Edit_enabled', 'true' );

//		} ).then( function() {
//			return testHelper.setPref( 'Tracelink_Edit_enabled', 'false' );


//	} ).then( function( resultFromGetHomeFolderContents ) {
//		// List content of home folder
//		var contents = homeFolder.props.contents.uiValues;

//		for( var ii = 0; ii < contents.length; ii++ ) {
//			logger.debug( '\t' + contents[ ii ] );
//		}

//		return resultFromGetHomeFolderContents;

//	} ).then( function() {
//		return testHelper.createItem( homeFolder, 'contents', 'My Item_' + testHelper.formatDateTime( new Date() ) );
	} ).then( function() {
		const searchKeyword = process.argv[4] || '*';
		var searchCriteria = {
			searchString: searchKeyword
		}; 
        var attributesToInflate = [ 'object_name' ];
		return testHelper.performSearch( searchCriteria,attributesToInflate );
	} ).then( function(resultFromPerformSearch) {
		if( resultFromPerformSearch ) {
				const searchKeyword = process.argv[4] || '*';
                //logger.info( JSON.stringify( resultFromPerformSearch ) );
				logger.info('-----------------------------------------------------------------------------------------------------------')
				logger.info( searchKeyword + ' - keyword search performed - Total Objects Found: ' + resultFromPerformSearch.totalFound );
				logger.info('-----------------------------------------------------------------------------------------------------------')
				//logger.info(resultFromPerformSearch)
				//logger.info('-----------------------------------------------------------------------------------------------------------')
        }
	} ).then( function() {
		//propPolicySvc.unregister( policyId );
//		logger.info('JSessionID Before SIGNOUT: '+process.env.JSessionID);
		return testHelper.signOut();
		
	} ).then( function() {
		logger.info( 'Run Time: ' + ( _.now() - startTime ) / 1000 + " secs" );
		process.exit( 0 );
	} ).catch( function( err ) {
		logger.error( 'ERROR:\n\t' + err.message );
		process.exit( 1 );
	} );
} );
