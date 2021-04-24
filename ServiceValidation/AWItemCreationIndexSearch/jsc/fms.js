// Copyright (c) 2019 Siemens
	
const _ = require( 'lodash' );
const http = require( 'http' );
const https = require( 'https' );
const url = require( 'url' );
const { lookup } = require( 'mime-types' );

/**
 * @param {Object} app - express application
 * @param {Object} logger - logger
 * @param {Object} auth - authentication service
 * @param {Object} options - FMS options
 * @param {Object} mime - mime options
 * @return {Object} ping support data
 */
module.exports = async function( app, logger, auth, {
    bootstrapFSCURLs = [],
    bootstrapClientIP = '',
    assignedFSCURLs = [],
    maxUploadFileSizeLimit = 134217728
}, mime = {
    //Mime type overrides
    mp4: 'video/mp4',
    oai: 'application/msword',
    prt: 'application/ug',
    svg: 'image/svg+xml',
    svgz: 'image/svg+xml',
    vvi: 'application/x-visnetwork',
    xlsm: 'application/vnd.ms-excel.sheet.macroEnabled'
} ) {
    if( _.isEmpty( bootstrapFSCURLs ) &&
        _.isEmpty( assignedFSCURLs ) &&
        process.env.ENDPOINT_FSC ) {
        // Internal development support code
        bootstrapFSCURLs.push( process.env.ENDPOINT_FSC );
    }

    if( logger.isSillyEnabled() ) {
        logger.silly( `fms: bootstrapFSCURLs=${JSON.stringify( bootstrapFSCURLs, null, 2 )}
bootstrapClientIP=${bootstrapClientIP}
assignedFSCURLs=${JSON.stringify( assignedFSCURLs, null, 2 )}
maxUploadFileSizeLimit=${maxUploadFileSizeLimit}
mime=${JSON.stringify( mime, null, 2 )}` );
    }
    let allFSCs = [];
    await init( bootstrapFSCURLs, bootstrapClientIP, assignedFSCURLs );
    if( allFSCs.length === 0 ) {
        return; // nothing to do
    }

    app.get( '/fms/fmsdownload/*', download );

    const multer = require( 'multer' )();
    app.post( '/fms/fmsupload/?', multer.single( 'fmsFile' ), upload );

    logger.info( `+ ${bootstrapFSCURLs.join( ',' )} to be used for FMS/FSC routing` );

    /**
     * @param {Object} req - request
     * @param {Object} res - response
     */
    async function download( req, res ) {
        const ticket = decodeURIComponent( req.query.ticket.replace( /\+/g, '%20' ) );
        const userId = ticket.substring( 153, 183 ).trim();
        const loggedInUserId = auth.getUserId( req.headers.cookie );
        if( userId !== loggedInUserId ) {
            res.status( 401 ).send( 'User authorization failure' );
        } else {
            const urlParts = url.parse( req.url );
            const fileName = getFilenameFromUrl( urlParts.pathname );
            res.setHeader( 'Content-Disposition', getContentDisposition( fileName ) );
            res.setHeader( 'Content-Type', getMimeType( fileName ) );

            let success = false;
            let lastError;
            for( const fsc of allFSCs ) {
                try {
                    await singleDownload( fsc, req.query.ticket, res ); // eslint-disable-line
                    success = true;
                    break;
                } catch ( e ) {
                    lastError = e;
                    if( !( e instanceof FSCError ) ||
                        !e.shouldFailOver() ) {
                        break;
                    }
                }
            }

            if( !success ) {
                logger.error( 'All servers failed with errors.' );
                res.status( lastError && lastError.statusCode || 500 )
                    .send( lastError && lastError.statusMessage || lastError || 'All servers failed with errors.' );
            }
        }
    }

    /**
     * @param {Object} req - HTTP request
     * @param {Object} res - HTTP response
     */
    async function upload( req, res ) {
        let success = false;
        let lastError;
        for( const fsc of allFSCs ) {
            try {
                await singleUpload( fsc, req.body.fmsTicket, req.file ); // eslint-disable-line
                success = true;
                break;
            } catch ( e ) {
                lastError = e;
                if( !( e instanceof FSCError ) ||
                    !e.shouldFailOver() ) {
                    break;
                }
            }
        }

        if( success ) {
            res.status( 200 )
                .end();
        } else {
            logger.error( 'All servers failed with errors.' );
            res.status( lastError && lastError.statusCode || 500 )
                .send( lastError && lastError.statusMessage || lastError || 'All servers failed with errors.' );
        }
    }

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

    /**
     * Initialize FSC
     *
     * @param {Array} bootstrapFSCURLs - bootstrap FSC URLs
     * @param {String} bootstrapClientIP - bootstrap client IP
     * @param {Array} assignedFSCURLs - assigned FSC URLs
     */
    async function init( bootstrapFSCURLs, bootstrapClientIP, assignedFSCURLs ) {
        if( !_.isEmpty( bootstrapFSCURLs ) ) {
            await initViaBootstrap( bootstrapClientIP, bootstrapFSCURLs );
        } else if( !_.isEmpty( assignedFSCURLs ) ) {
            for( const fscURL of assignedFSCURLs ) {
                if( !allFSCs.includes( fscURL ) ) {
                    allFSCs.push( fscURL );
                }
            }
        }
    }

    /**
     * Initialize FSC using Bootstrap FSC URLs
     * @param {*} clientIPAddress Client IP address
     * @param {*} bootstrapFSCURLs Boostrap FSC URLs
     */
    async function initViaBootstrap( clientIPAddress, bootstrapFSCURLs ) {
        let clientAddressParameter;
        let clientDisplayAddress;
        if( clientIPAddress === null || clientIPAddress === undefined ) {
            clientDisplayAddress = '-null-';
            clientAddressParameter = '';
        } else if( clientIPAddress.length === 0 ) {
            clientDisplayAddress = '-emptystring-';
            clientAddressParameter = '';
        } else {
            clientDisplayAddress = clientIPAddress;
            clientAddressParameter = clientIPAddress;
        }

        for( const bootstrapFSC of bootstrapFSCURLs ) {
            try {
                //pass clientIP to the server
                const bootstrapURL = `${bootstrapFSC}/mapClientIPToFSCs?client=${clientAddressParameter}`;
                // eslint-disable-next-line no-await-in-loop
                let result = await getFSCURLs( bootstrapURL );
                if( !result || result.length === 0 || result[ 0 ] === '' ) {
                    logger.warn( 'NULL bootstrap reply from ' + bootstrapFSC );
                    //same config is shared between all FSCs, so there
                    //is no need to check other bootstrap servers.
                } else {
                    for( const fscURL of result ) {
                        if( !allFSCs.includes( fscURL ) ) {
                            allFSCs.push( fscURL );
                        }
                    }
                }
            } catch ( ex ) {
                logger.error( `Exception requesting assignment from: ${bootstrapFSC}, for client: ${clientDisplayAddress},${JSON.stringify( ex, null, 2 )}` );
                continue;
            }
        }
    }

    /**
     * Get FSC
     * @param {String} bootstrapURL Bootstrap URL
     * @returns {Promise} Promise
     */
    async function getFSCURLs( bootstrapURL ) {
        return new Promise( ( resolve, reject ) => {
            get( bootstrapURL, function( response ) {
                // parse the FSC list
                let result = '';
                if( response.statusCode === 200 ) {
                    response.on( 'data', chunk => {
                        result += chunk;
                    } );
                    response.on( 'end', () => {
                        resolve( result.split( ',' ) );
                    } );
                    response.on( 'error', reject );
                } else {
                    reject( new Error( `Exception getting FSC URLs from: ${bootstrapURL}, statusCode: ${response.statusCode}` ) );
                }
            } ).on( 'error', ( ex ) => {
                logger.error( `Exception getting FSC URLs from: ${bootstrapURL},${JSON.stringify( ex, null, 2 )}` );
                reject( ex );
            } );
        } );
    }

    /**
     * Make http or https get according to protocol
     * @param {String} url
     * @param {Function} callback Callback function
     * @returns {Object} Request
     */
    function get( url, callback ) {
        if( url.startsWith( 'https:' ) ) {
            return https.get( url, callback );
        }
        return http.get( url, callback );
    }

    /**
     * Download from single fsc
     * @param {String} fscURI FSC URI
     * @param {String} ticket Ticket
     * @param {Object} res response
     * @returns {Object} HTTP response
     */
    async function singleDownload( fscURI, ticket, res ) {
        return new Promise( ( resolve, reject ) => {
            const targetURL = fscURI.endsWith( '/' ) ? fscURI : fscURI + '/';
            const urlParts = url.parse( targetURL );
            const options = {
                hostname: urlParts.hostname,
                port: urlParts.port,
                method: 'GET',
                pathname: urlParts.pathname,
                headers: {
                    'X-Ticket': ticket,
                    'User-Agent': 'Mozilla/4.0 (Compatible; MSIE 6.0; Windows NT 5.0; Q312461; .NET CLR 1.0.3705)'
                }
            };
            let req = request( urlParts.protocol, options, ( response ) => {
                response.on( 'data', chunk => {
                    res.write( chunk );
                } );
                response.on( 'end', () => {
                    if( response.statusCode === 200 || response.statusCode === 204 ) {
                        res.status( response.statusCode );
                        res.end();
                        resolve();
                    } else {
                        reject( generateFSCError( null, response ) );
                    }
                } );
                response.on( 'error', err => {
                    reject( generateFSCError( err ) );
                } );
            } ).on( 'error', err => {
                reject( generateFSCError( err ) );
            } );
            req.end();
        } );
    }

    /**
     * Make http or https request according to protocol
     * @param {String} protocol Protocol
     * @param {Object} options Options
     * @param {Function} callback Callback function
     * @returns {Object} Request
     */
    function request( protocol, options, callback ) {
        if( protocol === 'https:' ) {
            return https.request( options, callback );
        }
        return http.request( options, callback );
    }

    /**
     * Upload file to single fsc
     * @param {String} fscURI FSC URI
     * @param {String} ticket Ticket
     * @param {Object} file Fle object
     */
    async function singleUpload( fscURI, ticket, file ) {
        return new Promise( ( resolve, reject ) => {
            if( file && file.size && file.size > maxUploadFileSizeLimit ) {
                reject( new FSCError( '416', 'Upload file size exceeded maximum limit', -1 ) );
                return;
            }
            const targetURL = fscURI.endsWith( '/' ) ? fscURI : fscURI + '/';
            const urlParts = url.parse( targetURL );
            const boundary = '----3141592653589793238462643383279502884197169399';
            const formdata = buildMultiPartFormDataTemplate( 'streamfile', ticket, boundary );
            const formdataBytes = Buffer.from( formdata );
            const endBoundary = Buffer.from( '\r\n--' + boundary + '--\r\n' );

            const options = {
                hostname: urlParts.hostname,
                port: urlParts.port,
                pathname: urlParts.pathname,
                method: 'POST',
                headers: {
                    'User-Agent': 'FMS-FSCJavaClientProxy/11.4.0 (bd:20171115)',
                    'X-Policy': 'IMD',
                    'X-Ticket': ticket,
                    'Content-Length': file.size + formdataBytes.length + endBoundary.length,
                    'Content-Type': 'multipart/form-data; boundary=' + boundary
                },
                timeout: 30000
            };

            const req = request( urlParts.protocol, options, ( response ) => {
                if( response.statusCode === 200 ) {
                    resolve();
                } else {
                    reject( generateFSCError( null, fscURI, response ) );
                }
            } ).on( 'error', err => {
                reject( generateFSCError( err ) );
            } );
            req.write( formdataBytes );
            req.write( file.buffer );
            req.write( endBoundary );
            req.end();
        } );
    }

    /**
     * Generate FSC error
     * @param {Error} err Error
     * @param {Object} response HTTP response
     * @returns {FSCError} FSC error
     */
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

    /**
     * @param {String} url The client URL
     * @returns {String} The filename as found in the url
     */
    function getFilenameFromUrl( url ) {
        const slashIndex = url.lastIndexOf( '/' );
        if( slashIndex === -1 ) {
            return url;
        }
        return url.substring( slashIndex + 1 );
    }

    /**
     * Get Mime type from file name extension
     *
     * Order of precedence is:
     * 1. Mime mappings in config.json
     * 2. Mime type detected from lookup library
     * 3. Default mime type
     *
     * @param {String} fileName File name
     * @returns {String} MimeType
     */
    function getMimeType( fileName ) {
        const defaultMime = 'application/octet-stream';
        if( fileName && fileName.length >= 3 && fileName.includes( '.' ) ) {
            const fileExtension = fileName.split( '.' ).slice( -1 );
            const type = mime[ fileExtension ];
            return type || lookup( fileName ) || defaultMime;
        }
        return defaultMime;
    }

    /**
     * Get content disposition header value
     *
     * @param {String} fileName File name
     * @returns {String} MimeType
     */
    function getContentDisposition( fileName ) {
        return `attachment; filename*="${encodeURIComponent( fileName )}"`;
    }

    /**
     * Build form data
     * @param {String} fileName File name
     * @param {String} ticket Ticket
     * @param {String} boundary Boundary
     * @returns {String} formdata
     */
    function buildMultiPartFormDataTemplate( fileName, ticket, boundary ) {
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
        formdata += ticket + crlf;
        //form part content begning:
        formdata += '--' + boundary + crlf;
        formdata += 'Content-Disposition: ' + fileContentDisposition + '"' + fileName + '"' + crlf;
        formdata += 'Content-Type:  application/octet-stream; ';
        formdata += 'charset=ISO-8859-1' + crlf;
        formdata += 'Content-Transfer-Encoding: binary' + crlf + crlf;

        return formdata;
    }

    // Return to support ping page
    return {
        bootstrapFSCURLs: bootstrapFSCURLs,
        bootstrapClientIP: bootstrapClientIP,
        assignedFSCURLs: assignedFSCURLs
    };
};