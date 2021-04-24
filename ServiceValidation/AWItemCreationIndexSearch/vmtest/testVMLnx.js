const {
    execute,
    initLogger,
    node,
    prettyTime,
    remove,
    writeJson
} = require( '../js/common' );
const agent = require( 'superagent' );
const fse = require( 'fs-extra' );

const logger = initLogger();

const workingDir = __dirname;
process.env.CUCUMBER_RESULTS_SERVER = process.env.CUCUMBER_RESULTS_SERVER || 'http://awc/cucumberHistory';

process.env.WORKSPACE = process.env.WORKSPACE || 'D:/GitLab/ci';

process.env.JOB_URL = process.env.JOB_URL || 'NON_JENKINS';

process.env.EMAIL_TO = process.env.EMAIL_TO || 'QA_All_Admins@ugs.com';

//process.env.JPGPATH = process.argv[1];

process.env.JPGPATH = workingDir+'\\';

//process.env.JPGPATH = 'https://civ6s130:9955/NA/';

process.env.ClientId = 'ActiveWorkspaceClient';

process.env.JSessionID = 'JSESSION=LOGGED_OFF';

( async function() {
    const VMs2Test = [
		process.argv[2]
        // 'http://awc/50/w_p_1230_ci_j2ee_ora',
        // 'http://awc/50/wd1230',
        // 'http://awc/50/121/t',
        // 'http://awc/50/122/t',
        // 'http://awc/50/123/t',
        // 'http://awc/50/123/t2',
        // 'http://awc/50/123/t3',
        // 'http://awc/50/123/t4',
        // 'http://awc/50/130/t',
        // 'http://awc/43/w_p_1220_ci_j2ee_ora',
        // 'http://awc/43/wd1220',
        // 'http://awc/43/wd1160'
        // 'http://awc/43/115/t',
        // 'http://awc/43/116/t',
        // 'http://awc/43/121/t',
        // 'http://awc/43/122/t',
        // 'http://awc/43/122/t2',
        // 'http://awc/43/122/t3',
        // 'http://awc/43/122/t4',
        // 'http://awc/43/123/t',
        // 'http://awc/42/w_p_1210_ci_j2ee_ora',
        // 'http://awc/42/wd1160',
        // 'http://awc/42/ld1160',
        // 'http://awc/42/wd1210',
        // 'http://awc/42/wd1220',
        // 'http://awc/42/ld1220',
        // 'http://awc/42/114/t',
        // 'http://awc/42/115/t',
        // 'http://awc/42/116/t',
        // 'http://awc/42/121/t',
        // 'http://awc/42/121/t2',
        // 'http://awc/42/121/t3',
        // 'http://awc/42/121/t4',
        // 'http://awc/41/w_p_1150_ci_j2ee_ora',
        // 'http://awc/41/wd1160/aw',
        // 'http://awc/41/wd1150/aw',
        // 'http://awc/40/wd1150/aw',
        // 'http://awc/34/wd1140/aw'
    ];

    const previousRunPath = `${process.env.WORKSPACE}/previousRun.json`;
    let previousRun;

    if( await fse.pathExists( previousRunPath ) ) {
        logger.info( `Reading ${previousRunPath}...` );
        previousRun = require( previousRunPath );
        logger.info( JSON.stringify( previousRun, null, 2 ) );

        for( const data of Object.values( previousRun.failing ) ) {
            data.stale = true;
        }
    } else {
        previousRun = {
            emailSent: 0,
            failing: {}
        };
    }

    const promises = [];
//    for( const url of VMs2Test ) {
//        promises.push( processURL( url, previousRun ) );
//    }
	const url = process.argv[2];
	const username = process.argv[3] || 'ed';
	const password = process.argv[4] || 'ed';
	const searchKeyword = process.argv[5] || '*';
	promises.push( processURL( url, previousRun, username, password, searchKeyword ) );
	
    await Promise.all( promises );

    if( Object.keys( previousRun.failing ).length > 0 ) {
        // check if new failures since last run or email was sent over an hour previous
        let html = '';
        let sendEmail = Date.now() - previousRun.emailSent > 3600000; // more than an hour
        for( const [ url, data ] of Object.entries( previousRun.failing ) ) {
            if( !data.stale ) {
                html += `${url} failing since ${new Date(data.downSince).toUTCString()}<br>`;
                if( data.downSince > previousRun.emailSent ) { sendEmail = true; }
            } else {
                delete previousRun.failing[ url ];
            }
        }
        if( sendEmail ) {
            html += `<br>Visit <a href="http://awc/cucumberHistory/status">http://awc/cucumberHistory/status</a> for current status`;
            html += `<br>Visit <a href="${process.env.JOB_URL}">${process.env.JOB_URL}</a> for Jenkins job console`;
            const hrstart = process.hrtime();
            //logger.info( `Email being sent` );
			logger.info( `Email SKIPPED` );
           /*  await new Promise( ( resolve, reject ) => {
                const sendmail = require( 'sendmail' )( {
                    silent: true,
                    smtpHost: 'cismtp.ugs.com'
                } );
                sendmail( {
                    from: 'tc_hudson@siemens.com',
                    to: process.env.EMAIL_TO,
                    subject: `VMs down: ${Object.keys(previousRun.failing).length} down`,
                    html: html,
                }, function( err, reply ) {
                    if( err ) {
                        logger.error( err );
                        reject( err );
                    } else {
                        logger.verbose( reply );
                        resolve( reply );
                    }
                } );
            } ); */
            previousRun.emailSent = Date.now();
            logger.info( `Email sent after ${prettyTime(hrstart)}` );
        }
    } else {
        previousRun.emailSent = 0;
    }
    await writeJson( previousRunPath, previousRun );

    await wrapUp( 0 );
} )().catch( logger.error );

process.on( 'SIGINT', async () => {
    logger.warn( 'SIGINT' );
    await wrapUp( 1 );
} );

async function wrapUp( exitCode ) {
//    await remove( process.env.TEMP );
    process.exit( exitCode );
}

async function processURL( url, previousRun, username, password, searchKeyword ) {
    try {
        logger.info( `${url}: Started...` );
        const env = Object.create( process.env );
        env.AW_PROXY_SERVER = url;
        const lines = await execute( "/apps/nodejs/node-v14.8.0-linux-x64/bin/node", [
            `${workingDir}/nodejs/testSignInLnx.js`,
//            `ed`,
//            `ed`
			`${username}`,
			`${password}`,
			`${searchKeyword}`
        ], {
            cwd: workingDir,
            env: env,
            PATH: process.env.PATH
        } );

        let failure = false;
        for( const line of lines ) { if( /Problem/.test( line ) ) { failure = true; } }
        logger.info( `${url}: ${(failure ? `down` : `up`)}` );

        if( failure ) {
            let failing = previousRun.failing[ url ];
            if( !failing ) {
                previousRun.failing[ url ] = failing = {
                    downSince: Date.now()
                };
            } else {
                delete failing.stale;
            }
        } else if( previousRun.failing[ url ] ) {
            delete previousRun.failing[ url ];
        }

        if( process.argv.indexOf( `--upload` ) > -1 ) {
            await upload( url, failure );
        }
        logger.info( `${url}: Completed testing` );
    } catch ( err ) {
        logger.error( `${url}: `, err );
    }
}

//Upload the data to the server and then callback with possible errors and the response
async function upload( url, failure ) {
    await agent.post( `${process.env.CUCUMBER_RESULTS_SERVER}/status` )
        .send( {
            url: url,
            failure: failure
        } ).timeout( {
            response: 5000, // Wait 5 seconds for the server to start sending,
            deadline: 30000, // but allow 30 secs for the file to finish loading.
        } );
    logger.info( `${url}: Uploaded result` );
}
