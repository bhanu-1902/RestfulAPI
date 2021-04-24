// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * http://uncorkedstudios.com/blog/multipartformdata-file-upload-with-angularjs
 *
 * @module js/adapters/nodejs/fmsService
 */
 
 
define( [ 'app', 'assert', 'fs', 'nodejs/adapters/nodejs/httpWrapper', 'js/logger', //
    'soa/preferenceService'
], function( app, assert, fs, httpWrapper, logger ) {
    'use strict';

    /**
     * @memberof NgServices
     * @member fmsService
     */
    app.factory( 'fmsService', //
        [ 'soa_preferenceService', //
            function( prefSvc ) {
                var exports = {};

                /**
                 * FMS Upload
                 *
                 * @param {String} filePath - Absolute path to the file to be uploaded.
                 * @param {String} ticket - File 'ticket' previously generated to allow the uploaded file to be tracked.
                 * @return {Promise} completion promise
                 */
                exports.upload = function( filePath, ticket ) {
                    assert( ticket, 'Invalid ticket!' );
                    assert( filePath, 'Invalid file!' );

                    var formData = {
//                        fmsFile: fs.createReadStream( filePath ),
                        fmsTicket: ticket
						//'X-Ticket': ticket
                    };

					//var URI = process.env.AW_PROXY_SERVER;
					//var URI = 'http://10.134.64.167:4544';  // SHOULD NOT POINT TO FMS directly...

//                    return prefSvc.getStringValue( 'ActiveWorkspaceHosting.URL' ).then( function( url ) {
//						//var URI = url || process.env.AW_PROXY_SERVER;
//						var URI = process.env.AW_PROXY_SERVER;
//                       //assert( URI, 'No ActiveWorkspaceHosting.URL preference found!' );
                        //return httpWrapper.postWithFormData( URI + '/fms/fmsupload/?', formData );
						//return httpWrapper.postWithFormData( URI + '/fms/fmsupload/', formData, ticket );
						// httpWrapper.post( url, '/fms/fmsupload/', null, formData ).then( function( response ) {
							// return response;
						// }, function( err ) {
							// logSvc.error( 'file upload failed:\n\t' + err.message );
						// } );
						
						// httpWrapper.post( URI, '/fms/fmsupload/', null, formData ).then( function( response ) {
							// return response;
						// }, function( err ) {
							// logSvc.error( 'file upload failed:\n\t' + err.message );
						// } );
						
						//httpWrapper.post( URI + '/fms/fmsupload/', formData ).then( function( response ) {
						//httpWrapper.post( '/fms/fmsupload/', formData ).then( function( response ) {
						//	return response;
						//	return httpWrapper.postWithFormData( URI + '/fms/fmsupload/', formData );
						//}, function( err ) {
						//	logSvc.error( 'file upload failed:\n\t' + err.message );
						//} );
						
						return httpWrapper.post( '/fms/fmsupload/', formData );

						//return httpWrapper.postWithFormData( URI + '/fms/fmsupload/', formData );
//					  } );


//					httpWrapper.post( URI, '/fms/fmsupload/', null, formData ).then( function( response ) {
//						return response;
//					});

						

                };
				
				//var fms = require('nodejs/adapters/nodejs/fms.js');
				
				exports.realupload = function( filePath, ticket, sessionID, fileName ) {
					
//					var formData = new FormData();
					
//					var readStream = fs.createReadStream(filePath);

                    //formData.append( 'fmsFile', readStream );
                    //formData.append( 'fmsTicket', ticket );
					
////					var formData = {
////                        fmsFile: fs.createReadStream( filePath ),
//                        fmsFile: [readStream, fileName],
//                        fmsFile: readStream,
////                        fmsTicket: ticket
						//'X-Ticket': ticket
////                    };
					
					//logger.info(JSON.stringify(formData));
					
					return prefSvc.getStringValue( 'Default_Transient_Server', true ).then( function( FSCurl ) {
						logger.info('FSC: '+FSCurl);
                        assert( FSCurl, 'No Default_Transient_Server DB preference found!' );
                        return httpWrapper.postWithFormData( FSCurl + '/fms/fmsupload/', filePath, sessionID );
                    } );
					
					
///////////////					return httpWrapper.postWithFormData( '/fms/fmsupload/', filePath, sessionID );

//					return httpWrapper.postWithFormData( '/fms/fmsupload/', formData, sessionID );

//					const fscURI = '10.134.64.167:4544';

//					const fmsGateway = process.env.AW_PROXY_SERVER + '/fms/fmsupload/';
					
//					return fms().singleUpload( fmsGateway, ticket, readStream );
					//logger.info(fms(singleUpload( fmsGateway, ticket, readStream )));
//					fms.singleUpload( fmsGateway, ticket, readStream );
//					logger.info(fms);
				}

                return exports;
            }
        ] );
} );
