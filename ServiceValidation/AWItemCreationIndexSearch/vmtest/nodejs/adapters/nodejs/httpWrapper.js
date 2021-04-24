// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define process Promise */

/**
 * This is the HTTP wrapper.
 *
 * There should be zero Teamcenter logic in this file.
 *
 * @module nodejs/adapters/nodejs/httpWrapper
 */
define( [
    'assert', 'q', 'lodash', 'superagent', 'js/logger', 'fs', 'http'
], function( assert, Q, _, superagent, logger, fs, http) {
    'use strict';

    /**
     * The ID of the session used to indicate the user is currently NOT logged in.
     */
    var defaultJSessionID = 'JSESSION=LOGGED_OFF';

    /**
     * ID of the current session.
     */
    var _JSessionID = process.env.JSessionID;

    var exports = {};

    /**
     * Invoke a service on the HTTP service via a 'GET' to the given URL.
     *
     * @param {String} url - (Not used) URL to the HTTP service to 'POST' to.
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
     *          data is available.
     *          <P>
     *          Note: The caller should provide callback functions to the 'then' methods of this promise object (e.g.
     *          successCallback, [errorCallback, [notifyCallback]]). These methods will be invoked when the associated
     *          service result is known.
     */
    exports.get = function( url ) {
        var response = {
            data: {}
        };

        if( /^http:\/\/localhost\/config\/.*\.json/.test( url ) ) {
            var fileToRead = './' + url.substring( 17 );
            try {
                var fileContent = fs.readFileSync( fileToRead );
                response.data = JSON.parse( fileContent );
            } catch ( err ) {
                logger.severe( err );
            }
        }

        // This API is invoked to get JSON files. Since we don't have a way to get this data yet, just return an empty object.
        return Promise.resolve( response );
    };

    /**
     * Invoke a service on the HTTP service via a 'POST' to the given URL.
     *
     * @param {String} url - URL to the HTTP service to 'POST' to.
     * @param {Object} jsonData - JSON payload data to provide to the service.
     * @param {Object} config - Any additional HTTP headers to add to the request
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the given service is invoked and its
     *          response data is available.
     *          <P>
     *          Note: The caller should provide callback functions to the 'then' and/or 'fail' methods of this promise
     *          object. These methods will be invoked when the associated service result is known.
     */
    exports.post = function( url, jsonData, config ) {
        assert( url, 'url must be provided!' );
        //assert( jsonData, 'Caller must provide jsonData!' );
        //assert( config, 'Caller must provide config!' );

		



		var URI = process.env.AW_PROXY_SERVER;
		var soaApi = 'Internal-AWS2-2017-12-DataManagement/getTCSessionAnalyticsInfo';
		var tcjsonurl = '/tc/JsonRestServices/';
		
        let urlFinal = URI + url;
        if( !/^http/.test( urlFinal ) ) {
            urlFinal = process.env.AW_PROXY_SERVER + urlFinal;
        }
		
		const state = {
			url: URI,
			header: {
				state: {
					clientVersion: '10000.1.2',
					logCorrelationID: Date.now(),
					stateless: true,
					unloadObjects: true,
					enableServerStateHeaders: true,
					formatProperties: true,
//					clientID: 'ActiveWorkspaceClient'
					clientId: 'ActiveWorkspaceClient'
				},
				policy: {}
			},
			cookie: process.env.JSessionID
		};
		
		  
		
		const dummydata = {
			header: state.header,
			body: {},
			cookie: process.env.JSessionID
		}
		
		
		var setcookie = true;
			
		if (_JSessionID !== defaultJSessionID) { var setcookie = false }
		
        //return superagent.post( urlFinal )
		return superagent.post( `${state.url}${tcjsonurl}${soaApi}` )
            .set( 'Cookie', process.env.JSessionID )
            //.send( jsonData )
			.send( dummydata )
            .then( function( response ) {
               // const body = response && response.text && JSON.parse( response.text );
               // if( body && body[ '.QName' ] && body.code && body.level && body.message ) {
               //     throw body;
               // }

//                _.forEach( response.headers[ 'set-cookie' ], function( cookie ) {
//                    if( cookie && cookie.trim().indexOf( 'JSESSIONID=' ) === 0 ) {
//                        var _JSessionID = cookie.trim();
//                    }
//                } );
				
				if (setcookie) {
//					_JSessionID = response.header[ 'set-cookie' ];
//					_JSessionID = process.env.JSessionID || response.header[ 'set-cookie' ];
					_JSessionID = process.env.JSessionID
				}
				
				
				return _JSessionID;
                //if( /\/logout$/.test( url ) ) {
                //    _JSessionID = defaultJSessionID;
                //}

                //return {
                //    data: body
                //};

//			} ).then( function( ) {	
//				//return exports.postWithFormData(urlFinal, jsonData, _JSessionID);
//				return exports.postWithFormData(urlFinal, jsonData, _JSessionID);
								
            } );
    };



	exports.postttt = function( url, jsonData, formData, headers ) {
        assert( url, 'url must be provided!' );
        assert( jsonData || formData, 'Caller must provide either jsonData or formData!' );

        var urlFinal = url;

        if( !urlFinal || urlFinal.indexOf( 'http' ) !== 0 ) {
            urlFinal = process.env.AW_PROXY_SERVER + urlFinal;
        }

        var options = {
            method: 'POST',
            uri: urlFinal,
            headers: headers ? headers : {},
            resolveWithFullResponse: true
        };

        options.headers.Cookie = _JSessionID;

        if( jsonData ) {
            options.body = jsonData;
            options.json = true;
        } else if( formData ) {
            options.formData = formData;
        }

        // return rp( options ).then( function( response ) {
            // if( response.body.code && response.body.level && response.body.message ) {
                // throw response.body;
            // }

            // _.forEach( response.headers[ 'set-cookie' ], function( cookie ) {
                // if( cookie && cookie.trim().indexOf( 'JSESSIONID=' ) === 0 ) {
                    // _JSessionID = cookie.trim();
                // }
            // } );

            // return response.body;
        // } );
    };

    /**
     * Invoke a service on the HTTP service via a 'POST' to the given URL.
     *
     * @param {String} url - URL to the HTTP service to 'POST' to.
     * @param {FormData} formData - Form Data to provide to the service (used for file upload support)
     * @returns {Promise} This promise will be 'resolved' or 'rejected' when the given service is invoked and its
     *          response data is available.
     *          <P>
     *          Note: The caller should provide callback functions to the 'then' and/or 'fail' methods of this promise
     *          object. These methods will be invoked when the associated service result is known.
     */
    //exports.postWithFormData = function( url, formData, ticket ) {
	exports.postWithFormData = async function( url, filePath, sessionID ) {
        assert( url, 'url must be provided!' );
        //assert( formData, 'Caller must provide formData!' );

        var urlFinal = url;

/////////        if( !/^http/.test( urlFinal ) ) {
//            urlFinal = process.env.AW_PROXY_SERVER + urlFinal+'?';
/////////			urlFinal = process.env.AW_PROXY_SERVER + urlFinal;
        /////////}
		
//		urlFinal = process.env.AW_PROXY_SERVER + '/fms/fmsdownload/hdd_055_ug__g0p09608fuirm.qaf';

//////		urlFinal = 'http://10.134.64.167:4544' + '/fms/fmsdownload/';
		
		const newheaders = {
//				"Content-Type":"application/json",
//				"Accept":"application/json",
				"X-Ticket": process.env.oldTicket,
				"ticket": process.env.oldTicket,
				"fmsTicket": process.env.oldTicket,
				"Cookie": sessionID,
				"XSRF-TOKEN": sessionID,
				"X-XSRF-TOKEN": sessionID
				};
			
		
//		if ( url == '/fms/fmsupload/') {
//			superagent.post(process.env.AW_PROXY_SERVER+'/')
//				.set("X-Ticket", process.env.oldTicket)
//				.set("ticket", process.env.oldTicket)
//				.set("fmsTicket", process.env.oldTicket)
//				.set("Cookie", process.env.JSessionID)
//				.set("XSRF-TOKEN", process.env.JSessionID)
//				.set("X-XSRF-TOKEN", process.env.JSessionID)
//		}
		
		//.set({"Content-Type":"application/json","Accept":"application/json","Margle":"Bargle"})
		
		//urlFinal = 'http://10.134.64.224:3000/fms/fmsupload/';
		// const headers = {
            // state: {
                // clientVersion: '10000.1.2',
                // logCorrelationID: Date.now(),
                // stateless: true,
                // unloadObjects: true,
                // enableServerStateHeaders: true,
                // formatProperties: true,
                // clientID: 'ActiveWorkspaceClient'
            // },
			//'X-CSRF-Token': '3697260710235209760972309092736097',
			//'x-csrf-token': '3697260710235209760972309092736097',
            // policy: {}
        // }
		
		
//		return superagent.post( urlFinal )
//			.attach( 'fmsFile', 'test.jpg' )
//            .field( 'fmsTicket', formData.fmsTicket )
//            .set( 'Cookie', sessionID )

//		var superFileStream = fs.createReadStream(filePath);
//		var superFile = fs.readFileSync(filePath);
		
//		var jsonSuperFile = JSON.parse(fs.readFileSync(filePath));
	
	
	
	class FSCError extends Error {
        constructor( statusCode, statusMessage, errorCode ) {
            super( statusMessage );
            this.statusMessage = statusMessage;
            this.statusCode = statusCode;
            this.errorCode = errorCode;
        }

        shouldFailOver() {
            if( this.statusCode === 503 ) {
                return true;
            }

            if( this.errorCode <= -9000 ) {
                //the FSC responded but apparently had an issue with the request
                //don't failover, assume this is a critical failure
                return false;
            }

            //failover on all other errors
            return true;
        }
    }
	
		const urlmodule = require( 'url' );
	
		var jsonSuperFile = fs.readFileSync(filePath);
		
		var file = jsonSuperFile;
		
		
//		var stats = fs.statSync(filePath)
//		var fileSizeInBytes = stats["size"]

 		const boundary = '----3141592653589793238462643383279502884197169399';
					
					
		let formdata = null;
        const crlf = '\r\n';
        const contentDisposition = 'form-data; name="FMS_FORMPART_TICKET"';
        const fileContentDisposition = 'form-data; name="FMS_FORMPART_FILEDATA"; filename=';

        //form part header:
        formdata += crlf + '--' + boundary + crlf;
        formdata += 'Content-Disposition: ' + contentDisposition + crlf;
        formdata += 'Content-Type: text/plain; ';
        formdata += 'charset=US-ASCII' + crlf;
        formdata += 'Content-Transfer-Encoding: 8bit' + crlf + crlf;
        formdata += process.env.oldTicket + crlf;
        //form part content begning:
        formdata += '--' + boundary + crlf;
        formdata += 'Content-Disposition: ' + fileContentDisposition + '"' + 'test.jpg' + '"' + crlf;
        formdata += 'Content-Type:  application/octet-stream; ';
        formdata += 'charset=ISO-8859-1' + crlf;
        formdata += 'Content-Transfer-Encoding: binary' + crlf + crlf; 


		const formdataBytes = Buffer.from( formdata );
        const endBoundary = Buffer.from( '\r\n--' + boundary + '--\r\n' );

 function request( options, callback ) {
        return http.request( options, callback );
    }


async function singleUpload( urlFinal, ticket, file ) {
        return new Promise( ( resolve, reject ) => {

			const targetURL = urlFinal.endsWith( '/' ) ? urlFinal : urlFinal + '/';
            const urlParts = urlmodule.parse( targetURL );

//			var CorpServer = process.env.CorpServer || urlParts.hostname;
//			var FSCPort = process.env.FSCPort || ;

			
//            const boundary = '----3141592653589793238462643383279502884197169399';
           // const formdata = buildMultiPartFormDataTemplate( 'streamfile', ticket, boundary );
//            const formdataBytes = Buffer.from( formdata );
//            const endBoundary = Buffer.from( '\r\n--' + boundary + '--\r\n' );

            const options = {
                hostname: urlParts.hostname,
                port: urlParts.port,
                pathname: urlParts.pathname,
                method: 'POST',
                headers: {
                    'User-Agent': 'FMS-FSCJavaClientProxy/11.4.0 (bd:20171115)',
                    'X-Policy': 'IMD',
                    'X-Ticket': process.env.oldTicket,
//                    'Content-Length': fileSizeInBytes + formdataBytes.length + endBoundary.length,
                    'Content-Length': file.length + formdataBytes.length + endBoundary.length,
                    'Content-Type': 'multipart/form-data; boundary=' + boundary
                },
                timeout: 30000
            };

            const req = request( options, ( response ) => {
                if( response.statusCode === 200 ) {
                    resolve();
                } else {
//					logger.info(response);
                    reject( generateFSCError( null, urlFinal, response ) );
                }
            } ).on( 'error', err => {
//				logger.info(err);
                reject( generateFSCError( err ) );
            } );
            req.write( formdataBytes );
//            req.write( file.buffer );
            req.write( file );
            req.write( endBoundary );
            req.end();
} );
    }


function generateFSCError( err, response ) {
        let statusCode = 500;
        let statusMessage = 'ERROR_NO_STATUS_0';
        let errorCode = -1;
        if( response !== null && response !== undefined ) {
            statusCode = response.statusCode;
            statusMessage = response.statusMessage;
            const httpErrorCodes = [ 400, 404, 405, 416, 503 ];
            if( httpErrorCodes.includes( statusCode ) ) {
                errorCode = response.headers[ 'x-fsc-error-code' ] ? response.headers[ 'x-fsc-error-code' ] : response.headers[ 'x-fsc-error-index' ];
            }
        } else if( err ) {
            statusMessage = err.message;
        }

        return new FSCError( statusCode, statusMessage, errorCode );
    }	

return await singleUpload( urlFinal, process.env.oldTicket, file );

/* 			try {
                await singleUpload( urlFinal, process.env.oldTicket, file ); // eslint-disable-line
                success = true;
            } catch ( e ) {
                lastError = e;
                if( !( e instanceof FSCError ) ||
                    !e.shouldFailOver() ) {
                }
            } */

//var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

//var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

//var FormData = require('form-data');

//var Blob = require("cross-blob");


//					var readStream = fs.createReadStream(filePath);

//                    formData.append( 'fmsFile', readStream, fileName );
//                    formData.append( 'fmsTicket', ticket );
					
/////					var formData = {
/////                        fmsFile: fs.createReadStream( filePath ),
//                        fmsFile: [readStream, fileName],
//                        fmsFile: readStream,
/////                        fmsTicket: process.env.oldTicket
						//'X-Ticket': ticket
/////					};
					
					


			
					//fs.createReadStream
					
//					var superFileStream = fs.createReadStream(filePath);
//					var superFile = fs.readFileSync(filePath);
					
//					var file = superFileStream;
					
//////					var formData = new FormData();
					
//////					formData.append( 'fmsFile', superFile, {filename: 'test.jpg', contentType: 'image/jpeg', knownLength: 22131} );
//////					formData.append( 'fmsTicket', process.env.oldTicket );
					
					//var newFormData = Buffer.from( formData );
					
					//var newFormData = _.flattenJSON(formData)
					
//////					var newFormData = formData.getBuffer();
					
//					await new Promise( ( resolve, reject ) => {
//						var newFormData = formData.getBuffer();
//					});
					
const _fmsUpload = function ( baseURL, fmsTicket, formData, callback ) {
//                var fmsURL = baseURL + '/fms/fmsupload/';
				var fmsURL = baseURL;
                var XHR = new XMLHttpRequest();
                XHR.open( 'POST', fmsURL, false );
//                var formData = new FormData();
//                formData.append( 'fmsFile', new Blob( [ fileData ], { type: 'text/plain' } ) );

//				formData.append( 'fmsFile', new Blob( [fs.createReadStream(fileData)], { type: 'application/octet-stream' }));
//                formData.append( 'fmsTicket', fmsTicket );
				XHR.setDisableHeaderCheck(true);
				XHR.setRequestHeader('Cookie', process.env.JSessionID);
				XHR.setRequestHeader('User-Agent', 'FMS-FSCJavaClientProxy/11.4.0 (bd:20171115)');
				XHR.setRequestHeader('X-Policy', 'IMD');
				XHR.setRequestHeader('X-Ticket', process.env.oldTicket);
				XHR.withCredentials = true;
                XHR.onreadystatechange = function () {
                    if ( XHR.status == 200 ) {
                        if ( typeof callback === 'function' ) {
                            callback.apply( XHR );
                        }
                    }
                };
                XHR.send( JSON.stringify(formData) );
            };

//var $q = app.getInjector().get( '$q' );
//            var deferred = $q.defer();


////            _fmsUpload( urlFinal, process.env.oldTicket, formData, function (response) {
////                return response;
////            }, function ( err ) {
////                return err ;
////            } );
            

//		var formData = JSON.stringify(filePath);

/* 

//		return _fmsUpload ( urlFinal, ticket, formData )
        return superagent.post( urlFinal )
//		return superagent.get( urlFinal )
//			.set( 'Cookie', sessionID )
//			.type( 'form' )
//			.type( 'text/plain' )
            //.set( 'Cookie', _JSessionID )
//			.set( 'X-Ticket', ticket)
				.set( 'X-Ticket', process.env.oldTicket)
//				.set("ticket", process.env.oldTicket)
				.set( 'User-Agent', 'FMS-FSCJavaClientProxy/11.4.0 (bd:20171115)')
				.set( 'X-Policy', 'IMD')
//				.set("fmsTicket", process.env.oldTicket)
				.set( 'Cookie', process.env.JSessionID )
				.set( 'Accept', 'application/json')
//				.set( 'Content-Length', Buffer.byteLength(newFormData))

//				.set( 'Content-Length', Buffer.byteLength(formData))
				.set('Content-Length', file.size + formdataBytes.length + endBoundary.length)

//				.field( 'fmsTicket', process.env.oldTicket )
//				.field( 'ticket', process.env.oldTicket )
//				.field( 'fmsFile', formData.fmsFile )
//				.set("XSRF-TOKEN", process.env.JSessionID)
//				.set("X-XSRF-TOKEN", process.env.JSessionID)
			//.set('Header', {'X-CSRF-Token': '3697260710235209760972309092736097'})
			//.set('Header', headers)
//            .send( Buffer.from( formData ) )

//            .send( formData )
            .send( formData )
//			.attach( 'fmsFile', superFile )
			.then( function( response ) {
                const body = response && response.text && JSON.parse( response.text );
                if( body && body[ '.QName' ] && body.code && body.level && body.message ) {
                    throw body;
                }

               // _.forEach( response.headers[ 'set-cookie' ], function( cookie ) {
                    // if( cookie && cookie.trim().indexOf( 'JSESSIONID=' ) === 0 ) {
                        // _JSessionID = cookie.trim();
                    // }
                // } );

                // if( /\/logout$/.test( url ) ) {
                    // _JSessionID = defaultJSessionID;
                // }

                // align response to match $http.post
                return {
                    data: body
                };
			} ); 
			
			*/
    };

    return exports;
} );
