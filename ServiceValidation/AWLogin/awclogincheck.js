const { get, post } = require( 'superagent' );

const { pathExists, remove } = require( 'fs-extra' );

const prettyTime = function( startTime ) {
    let time = process.hrtime( startTime )[ 0 ];
    let out = '';
    const desc = [ 'h', 'min', 's' ];
    const convert = [ 3600, 60, 1 ];
    for( let ii = 0; ii < convert.length; ii++ ) {
        let value = parseInt( time / convert[ ii ] );
        if( value > 0 ) {
            out += ` ${value} ${desc[ii]}`;
            time = time % convert[ ii ];
        }
    }
    if( !out ) { out = `<0 ${desc[desc.length-1]}`; }
    return out.trim();
};

initLogger = function() {
    const {
        createLogger,
        format,
        transports
    } = require( 'winston' );
    const enumerateErrorFormat = format( info => {
        if( info.message instanceof Error ) {
            info.message = Object.assign( {
                message: info.message.message,
                stack: info.message.stack
            }, info.message );
        } else if( info instanceof Error ) {
            return Object.assign( {
                message: info.message,
                stack: info.stack
            }, info );
        }
        return info;
    } );
    const wlogger = createLogger( {
        format: format.combine(
            enumerateErrorFormat(),
            format.json()
        ),
        transports: [
            new transports.Console( {
                level: process.env.LOG_LEVEL || 'info',
                format: format.combine(
                    // winston.format.colorize(),
                    format.printf( info => {
                        return `${info.level}: ${info.message ? info.message.replace(/\n/g, `\n${info.level}: `) : info.message}`;
                    } )
                )
            } )
        ],
        exitOnError: false // do not exit on handled exceptions
    } );

    // Dump environment variables. useful for Jenkins debugging.
    const envVarNamesToReport = [
        'ASSETS_DIR',
        'AW_PROXY_SERVER',
        'AW_FMS_PROXY_SERVER',
        'AW_VIS_PROXY_SERVER',
        'DARSI_PROXY_SERVER',
        'BRANCH_NAME',
        'BROWSER',
        'BUILD_DISPLAY_NAME',
        'BUILD_NUMBER',
        'BUILD_URL',
        'BUILD_USER',
        'BUILD_USER_EMAIL',
        'BUILD_USER_ID',
        'CONCURRENT_TASKS_JSDOC',
        'CONCURRENT_TASKS_KARMA',
        'CONCURRENT_TASKS_KIT',
        'CP_NUMBER',
        'CUCUMBER_PROCESSES',
        'CUCUMBER_RESULTS_SERVER',
        'CUCUMBER_TEST_BROWSER',
        'DARSI_ENABLED',
        'EMAIL_TO',
        'ENDPOINT_DARSI',
        'ENDPOINT_FSC',
        'ENDPOINT_SERVICE_DISPATCHER',
        'ENDPOINT_TC',
        'ENDPOINT_TCQGL',
        'ENDPOINT_VIS',
        'GULP_TASKS',
        'JOB_NAME',
        'JOB_URL',
        'MERGE_REQUEST_IID',
        'NPM_INSTALL',
        'NUMBER_OF_PARALLEL_PROCESSES',
        'OVERRIDE_AW_PROXY_SERVER',
        'OVERRIDE_TAGS',
        'OVERRIDE_SVC_ZIP',
        'PERFORMANCE_LOG',
        'PLAT',
        'PROJECT_URL',
        'PROJECT_ID',
        'REF_LABEL',
        'REF_UNIT_DIR',
        'RELEASE',
        'RERUN_ID',
        'RUN_HISTORY',
        'SONAR_URL',
        'SOURCE_PROJECT_URL',
        'TAGS',
        'TC_TOOLBOX',
        'TEMP',
        'TEST_PATH',
        'TMP',
        'USER',
        'USERNAME',
        'USER_TAGS',
        'WORKSPACE'
    ];
    for( const [ key, value ] of Object.entries( process.env ) ) {
        if( envVarNamesToReport.includes( key ) ) {
//            wlogger.info( ` + ${key} = ${value}` );
        } else {
//            wlogger.verbose( `- ${key} = ${value}` );
        }
    }

    return wlogger;
};

const logger = initLogger();

let urls2Test = [];
let username = 'ed';
let password = 'ed';
let action = 'login';
let extrainfo = false;

const allargs = process.argv.join(' ');

if ( allargs.indexOf( '--url=' ) > -1 ){
	URIS = process.argv.find(el => el.indexOf( '--url=' ) > -1).replace('--url=','');
	urls2Test = URIS.split(',');
} else { logger.warn( 'AWC URI is missing, please supply --url=<AWC_URI>' ); process.exit(1); }

if (allargs.indexOf( '--username=' ) > -1){
	username = process.argv.find(el => el.indexOf( '--username=' ) > -1).replace('--username=','');
}

if (allargs.indexOf( '--password=' ) > -1){
	password = process.argv.find(el => el.indexOf( '--password=' ) > -1).replace('--password=','');
} 

if (allargs.indexOf( '--action=' ) > -1){
	action = process.argv.find(el => el.indexOf( '--action=' ) > -1).replace('--action=','');
}

if (allargs.indexOf( '--extrainfo' ) > -1){
	extrainfo = true;
}

( async function() {

    const promises = [];
    for( const url2Test of urls2Test ) {
		await get( url2Test ).timeout( {
            response: 5000, // Wait 5 seconds for the server to start sending,
            deadline: 15000, // but allow 15 secs for the file to finish loading.
        } ).then( function() {
			logger.info( `${url2Test} HTTP response is successfull.` );
			promises.push( processURL( url2Test ) );
		} ).catch( err => {
            logger.info( `${url2Test}/ FAILED [${err}]` );
        } )      
    }
	
    await Promise.all( promises );

    await wrapUp( 0 );
} )().catch( logger.error );

process.on( 'SIGINT', async () => {
    logger.warn( 'SIGINT' );
    await wrapUp( 1 );
} );

async function wrapUp( exitCode ) {
//  await iremove( process.env.TEMP );
    process.exit( exitCode );
}

async function processURL( url ) {
    try {
        logger.debug( `${url}: Started...` );

        // GET GW
        // GET GW/healthcheck
        // Login/Logout
        let failure = [];
        await Promise.allSettled( [
            
			get( `${url}/health/checkhealth` ).timeout( {
            response: 5000, // Wait 5 seconds for the server to start sending,
            deadline: 15000, // but allow 15 secs for the file to finish loading.
        } ).then( function() {
				logger.info( `${url}/health/checkhealth Gateway Web service response is successfull.` );
			} ).catch( err => {
                failure.push( `${url}/health/checkhealth FAILED [${err}]` );
            } ),
            
			get( `${url}/tc/controller/test` ).timeout( {
            response: 5000, // Wait 5 seconds for the server to start sending,
            deadline: 15000, // but allow 15 secs for the file to finish loading.
        } ).then( function() {
				logger.info( `${url}/tc/controller/test Presentation tier response is successfull.` );
			} ).catch( err => {
                failure.push( `${url}/tc/controller/test FAILED [${err}]` );
            } ),

//            get( `${url}/sd/svc_dispatcher/ping` ).catch( err => {
//                failure.push( `${url}/sd/svc_dispatcher/ping FAILED [${err}]` );
//            } ),
//            get( `${url}/fsc/Ping` ).catch( err => {
//                failure.push( `${url}/fsc/Ping FAILED [${err}]` );
//            } ),
            
			loginTest( `${url}` ).then( function(result) {
				logger.info( url +  ' ' + result);
			} )			
			.catch( err => {
                failure.push( `${url} FAILED login test [${err}]` );
            } )
        ] );

        if( failure.length > 0 ) {
            logger.error( `${url} down\n${failure.join( '\n' )}` );
		}
        logger.debug( `${url}: Completed testing` );
    } catch ( err ) {
        logger.error( `${url}: `, err );
    }
}

async function loginTest( url ) {
    const state = {
        url: url,
        header: {
            state: {
                clientVersion: '10000.1.2',
                logCorrelationID: Date.now(),
                stateless: true,
                unloadObjects: true,
                enableServerStateHeaders: true,
                formatProperties: true,
                clientID: 'ActiveWorkspaceClient'
            },
            policy: {}
        },
        cookie: ''
    };

    awlogin = await postSOA( state, 'Core-2011-06-Session/login', {
        credentials: {
            user: username,
            password: password,
            group: '',
            role: '',
            locale: 'en_US',
            descrimator: `AWC${Date.now()}`
        }
    } );
	if (awlogin.message){
		logger.info(awlogin.message);
		return 'AWC Login/Logout failed.';
	} else {
		if (extrainfo){
			sessioninforaw = await postSOA( state, 'Internal-AWS2-2017-12-DataManagement/getTCSessionAnalyticsInfo', {} );
			sessioninfo = JSON.parse(JSON.stringify(sessioninforaw));
			logger.info(`AWServerVersion: ${sessioninfo.extraInfoOut.AWServerVersion}`);
			logger.info(`TCServerVersion: ${sessioninfo.extraInfoOut.TCServerVersion}`);
			logger.info(`Extra Info: ${JSON.stringify(sessioninfo.analyticsData.analyticsExtraInfo, null, 2)}`);

		}
		await postSOA( state, 'Core-2006-03-Session/logout', {} );
		return 'AWC Login/Logout is successfull.';
	}
}

/**
 * @param {Object} state - state
 * @param {String} soaApi - SOA API
 * @param {Object} body - body
 */
async function postSOA( state, soaApi, body ) {
    const call = post( `${state.url}/tc/JsonRestServices/${soaApi}` ).timeout( {
            response: 15000, // Wait 15 seconds for the server to start sending,
            deadline: 30000, // but allow 30 secs for the file to finish loading.
        } );
    if( state.cookie ) { call.set( 'Cookie', state.cookie ); }
    const response = await call.send( {
        header: state.header,
        body: body
    } );
    if( response.headers[ 'set-cookie' ] ) {
        for( const cookieLp of response.headers[ 'set-cookie' ] ) {
            if( /^(JSESSIONID|ASP.NET_SessionId)=/i.test( cookieLp ) ) {
                state.cookie = cookieLp;
            }
        }
    }
//    logger.debug( `${soaApi}:\n${response.text}\n` );
	srvresponse = JSON.parse( response.text );
	return srvresponse;
}

async function iremove( filePath ) {
    const hrstart = process.hrtime();
    if( await pathExists( filePath ).catch( logger.error ) ) {
        logger.verbose( `Removing ${filePath}...` );
        await remove( filePath ).catch( logger.error );
        logger.info( `Removed ${filePath} after ${prettyTime(hrstart)}` );
    } else {
        logger.verbose( `Unable to remove ${filePath} which doesn't exist.` );
    }
};
