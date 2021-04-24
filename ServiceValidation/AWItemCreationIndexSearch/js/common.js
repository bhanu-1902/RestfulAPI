const { copy, ensureDir, mkdirs, move, outputFile, pathExists, remove, writeJson } = require( 'fs-extra' );
const { hostname } = require( 'os' );
const { basename, dirname, sep } = require( 'path' );

process.env.BROWSER = process.env.BROWSER || 'Chrome_headless';
process.env.CUCUMBER_PROCESSES = process.env.CUCUMBER_PROCESSES || process.env.NUMBER_OF_PARALLEL_PROCESSES || '15';
process.env.CUCUMBER_RESULTS_SERVER = process.env.CUCUMBER_RESULTS_SERVER || 'http://awc/cucumberHistory';
process.env.DEVOPS_ROOT = process.env.DEVOPS_ROOT || 'C:\\apps\\devop_tools';

// parsing project Id from project url temporarily, until we pass the project Id as part of env variable
const projectUrl = process.env.SOURCE_PROJECT_URL || process.env.PROJECT_URL;
let projectId = 160;
if( projectUrl ) {
    const projectName = projectUrl.split( '/' ).pop();
    projectId = projectName === 'afx-gateway' ? 3885 : ( projectName === 'darsi' ? 1896 : 160 );
}

process.env.PROJECT_ID = process.env.PROJECT_ID || projectId;
process.env.GitLabURL = `https://gitlab.industrysoftware.automation.siemens.com/api/v4/projects/${process.env.PROJECT_ID}`;

process.env.AW_PROXY_SERVER = process.env.OVERRIDE_AW_PROXY_SERVER || process.env.AW_PROXY_SERVER;

// process.env.CUC_ADMIN = 'true'; // Used to junitUtils.js to override the 5 processor limit for Cucumber
process.env.JENKINS = 'false'; // Used by BasePage.java to force specific browser window size
process.env.TERM = 'dumb'; // disable console coloring

process.env.DRAFT = process.env.DRAFT || 'false';

delete process.env.AW_EXPRESS_PORT; // ensure that we allow cucumber to use available port
delete process.env.MSDEVDONE; // require to make sure MSVS is initialized

const dt = 'dt.CMD';
const git = exports.git = 'git.EXE';
exports.npm = 'npm.cmd';
exports.node = 'node.exe';
const unit = exports.unit = 'unit.CMD';
const udistrib = `${process.env.DEVOPS_ROOT}/UDU/tools/bin/wnt/udistrib.bat`;
process.env.REF_UNIT_DIR = process.env.REF_UNIT_DIR || 'D:/udu/ref';

process.env.AW_CACHE_BUST = 'true';
process.env.ASSETS_DIR = `assets${Date.now()}`;

if( !process.env.BUILD_NUMBER ) {
    const today = new Date();
    process.env.BUILD_NUMBER = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
}

let logger;

exports.initData = function() {
    const data = {
        baseline: '',
        exitCode: 0,
        hrstart: process.hrtime(),
        logger: exports.initLogger(),
        // temporary out directory used for moving out the stuff we're saving before deleting the unit
        outDirTemp: `${process.env.WORKSPACE}/out_${process.env.BUILD_NUMBER}`,
        prefix: '',
        sendEmail: true,
        release: process.env.RELEASE || process.env.REF_LABEL.split( /\.20[1-9][0-9]/ )[ 0 ],

        // UDU unit root directory
        unitDir: `${process.env.WORKSPACE}\\${process.env.BUILD_NUMBER}`
    };
    for( const envVarName of [
            'ENDPOINT_FSC',
            'ENDPOINT_SERVICE_DISPATCHER',
            'ENDPOINT_TC',
            'ENDPOINT_VIS',
            'AW_PROXY_SERVER'
        ] ) {
        if( process.env[ envVarName ] ) {
            data[ envVarName ] = process.env[ envVarName ];

            if( !/^http/.test( process.env[ envVarName ] ) ) {
                throw new Error( `${envVarName} is not a valid URL. It must start with http:// or https:// [${process.env[ envVarName ]}]` );
            }
        }
    }
    if( process.env.AW_PROXY_SERVER && !/^http:\/\/awc/.test( process.env.AW_PROXY_SERVER ) ) {
        throw new Error( `AW_PROXY_SERVER is not a valid proxy URL. It must start with http://awc/ [${process.env.AW_PROXY_SERVER}]` );
    }
    if( process.env.ENDPOINT_FSC || process.env.ENDPOINT_TC || process.env.ENDPOINT_SERVICE_DISPATCHER || process.env.ENDPOINT_VIS ) {
        if( !( process.env.ENDPOINT_FSC && process.env.ENDPOINT_TC && process.env.ENDPOINT_SERVICE_DISPATCHER ) ) {
            throw new Error( `If you provide any ENDPOINT_* variable, you must provide ENDPOINT_FSC, ENDPOINT_SERVICE_DISPATCHER & ENDPOINT_TC!` );
        }
    }
    if( /^aw4/.test( process.env.RELEASE || process.env.REF_LABEL ) ) {
        data.chromeDriver = `${data.unitDir}/chromedriver${Date.now()}.exe`;
    }
    return data;
};

exports.cloneData = function( data ) {
    if( !data.datas ) { data.datas = []; }

    const dataLp = {
        hrstart: process.hrtime(),
        id: data.datas.length + 1,
        logger: data.logger,
        outDirTemp: data.outDirTemp,
        unitDir: `${data.unitDir}_${data.datas.length+1}`
    };

    data.datas.push( dataLp );

    return dataLp;
};

exports.initLogger = function() {
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

    logger = wlogger;
    return wlogger;
};

exports.getRefUnit = async function() {
    logger.silly( 'getRefUnit' );

    if( !process.env.REF_LABEL && process.env.RELEASE ) {
        const lines = await exports.execute( dt, [ 'bl', 'lst', '-e', process.env.RELEASE, '-L', '-h', '-n' ] );
        process.env.REF_LABEL = lines[ 0 ];
    }

    if( !await pathExists( `${process.env.REF_UNIT_DIR}/${process.env.REF_LABEL}` ).catch( logger.error ) ) {
        try {
            await exports.execute( dt, [ 'bl', 'lst', process.env.REF_LABEL ] );
            await exports.execute( udistrib, [
                '-v', `@${process.env.REF_LABEL}`, // Specify a specific version to synchronize
                '-p', 'common src', // Specify the platforms to synchronize or a Custom View File
                '-A', // Autoindex reference structure when unpacking
                '-s', //  Synchronize/copy the specified zip file save sets
                '-t', process.env.REF_UNIT_DIR, // The top directory for reference structure you are populating.
                '-u', // Unpack save sets and create the reference structure
                '-L', '1', //Register baseline instance that can be locally accessed from current host.
                '-a', // Platform amnesia - don't remember previously synchronized platforms
                '-b', // Batch mode
                '-W', // Run UDULocator Synchronously
                '-C' // Turn off the character count and diskspace checking
            ] );
        } catch ( err ) {
            logger.error( `Failure downloading baseline!` );
            throw err;
        }
    } else {
        logger.verbose( 'getRefUnit:skipping ref unit download' );
    }
};

exports.unitCreateAndSeed = async function( data, gitRefs ) {
    logger.silly( 'unitCreateAndSeed' );

    await exports.execute( unit, [
        'add',
        '-b', // batch mode; won't open command prompt for unit
        '-p', `@${process.env.REF_LABEL}`, // "pathToRefUnit" -- parent unit root directory
        '-w', 'SUB', // DMS node relationship (SUB, PEER, NONE)
        '-n', `${process.env.USERNAME}_${process.env.JOB_NAME}_${basename(data.unitDir)}_${hostname()}`, // unit or group branch name (default - the name of last root subdirectory)
        '-t', 'DEV', // unit type
        '-l', 'y', // later than baseline
        data.unitDir // unit root directory
    ] );

    let cmds = [
        // Load latest source baseline + later
        'CALL dt load -b -l'
    ];
    if( process.env.CP_NUMBER && !/^NONE$/i.test( process.env.CP_NUMBER ) ) {
        // Load any required CPs into DMS client
        cmds.push( `call dt cli set -C -A ${process.env.CP_NUMBER}` );
    } else {
        logger.verbose( 'unitCreateAndSeed:skipping CP add' );
    }
    cmds = cmds.concat( [
        // Update toolbox (must be after all def files are loaded)
        'CALL toolbox -u',
        // DEBUG output of DMS client information
        'CALL dt cli lst -C'
    ] );
    const promises = [
        exports.executeUnit( data, cmds ),
        exports.querySCMData( data )
    ];

    let buildNodeModulesSuffix = '';
    if( gitRefs ) {
        process.env.NPM_STRICT = 'false';
        for( const [ name, value ] of Object.entries( gitRefs ) ) {
            logger.info( `unitCreateAndSeed:git clone ${name}` );
            promises.push( exports.execute( git, [
                'clone',
                '--quiet',
                '-b', value.branch || 'master',
                value.url
            ], { cwd: data.unitDir } ) );
            buildNodeModulesSuffix += ` ${data.unitDir}\\${name}`;
        }
    }
    await Promise.all( promises );

    logger.silly( 'unitCreateAndSeed:buildNodeModules' );
    if( data.chromeDriver ) {
        let srcChromeDriver = `${process.env.APPDATA}/npm/node_modules/chromedriver/lib/chromedriver/chromedriver.exe`;
        await exports.copy( srcChromeDriver, data.chromeDriver );
    }

    cmds = [
        `CALL updateNPM.cmd${buildNodeModulesSuffix}`
    ];
    if( process.env.NPM_INSTALL ) {
        process.env.NPM_STRICT = 'false';
        cmds.push( `CALL npm install ${process.env.NPM_INSTALL.replace(',', ' ')}` );
    }
    await exports.executeUnit( data, cmds );

    logger.verbose( `${data.unitDir} successfully created` );
};

exports.querySCMData = async function( data ) {
    logger.verbose( 'querySCMData' );

    const previousRunPath = `${process.env.WORKSPACE}/previousRun.json`;
    let previousRun;

    if( process.env.RUN_HISTORY ) {
        if( await pathExists( previousRunPath ).catch( logger.error ) ) {
            logger.info( `Reading ${previousRunPath}...` );
            previousRun = require( previousRunPath );
            logger.info( JSON.stringify( previousRun, null, 4 ) );
        } else {
            previousRun = {
                baseline: 'aw5.0.0.0.2020012100',
                mergeRequestLastTime: '2020-01-01T00:00:00.000Z'
            };
        }
    }

    logger.info( `Querying latest baseline...` );
    const lines = await exports.execute( dt, [ 'bl', 'lst', '-e', data.release, '-L', '-n' ] );
    data.baseline = lines[ 0 ];

    if( /CP/.test( process.env.RUN_HISTORY ) ) {
        data.CPs = [];
        if( previousRun.baseline && previousRun.baseline !== data.baseline ) {
            try {
                logger.info( `Querying recent change packages...` );
                const lines2 = await exports.execute( dt, [ 'cp', 'qry', '-b', `${previousRun.baseline},${data.baseline}`, '-F', 'o,cp' ] );
                let cp = {};
                for( const line of exports.extractLines( lines2 ) ) {
                    if( /OWNER:/.test( line ) ) {
                        cp.owner = line.replace( 'OWNER:', '' ).trim().replace( /\s\s+/g, ' ' );
                    }
                    if( /CHANGE PACKAGE:/.test( line ) ) {
                        cp.id = line.replace( 'CHANGE PACKAGE:', '' ).trim();
                    }
                    if( cp.owner && cp.id ) {
                        data.CPs.push( cp );
                        cp = {};
                    }
                }
                logger.debug( JSON.stringify( data.CPs, null, 4 ) );
            } catch ( err ) {
                logger.error( `ERROR query new CPs\n`, err );
            }
        }
        previousRun.baseline = data.baseline;
    }

    if( /MR/.test( process.env.RUN_HISTORY ) ) {
        logger.info( `Querying recent merge requests...` );
        data.mergeRequests = {
            afx: await queryMRs( 160, previousRun ),
            'afx-gateway': await queryMRs( 3885, previousRun ),
            'afx-darsi': await queryMRs( 1896, previousRun )
        };
    }

    if( previousRun ) {
        await exports.writeJson( previousRunPath, previousRun );
    }
};

async function queryMRs( projectID, previousRun ) {
    const merged_at_baseline = previousRun.mergeRequestLastTime;
    const response = await require( 'superagent' ).get( `https://gitlab.industrysoftware.automation.siemens.com/api/v4/projects/${projectID}/merge_requests?per_page=50&state=merged&target_branch=master&order_by=updated_at` );
    const mergeRequests = [];
    for( const mergeRequest of response.body ) {
        if( mergeRequest.iid && mergeRequest.merged_at ) {
            if( merged_at_baseline < mergeRequest.merged_at ) {
                mergeRequests.push( mergeRequest );
            }
            if( previousRun.mergeRequestLastTime < mergeRequest.merged_at ) {
                previousRun.mergeRequestLastTime = mergeRequest.merged_at;
            }
        }
    }
    return mergeRequests;
}

exports.executeUnit = async function( { unitDir, chromeDriver }, cmds ) {
    logger.verbose( `executeUnit ${unitDir} ${cmds.join( )} ${process.cwd()}` );

    const scriptPath = `${unitDir}/script.cmd`;

    const echoOn = '@ECHO ON';
    const errorCheck = '\n@IF %ERRORLEVEL% NEQ 0 ECHO ERRORLEVEL=%ERRORLEVEL% && EXIT %ERRORLEVEL%\n';

    cmds.unshift( echoOn ); // add to front of command

    // Set environment variables which are set in RTE.def
    for( const envVarName of [
            'ENDPOINT_FSC',
            'ENDPOINT_SERVICE_DISPATCHER',
            'ENDPOINT_TC',
            'ENDPOINT_VIS',
            'AW_PROXY_SERVER'
        ] ) {
        if( process.env[ envVarName ] ) {
            cmds.unshift( `SET ${envVarName}=${process.env[envVarName]}` );
        }
    }
    if( process.env.BROWSER ) cmds.unshift( `SET CUCUMBER_TEST_BROWSER=${process.env.BROWSER}` ); // clear environment so we don't open up the results in a browser

    if( chromeDriver ) {
        cmds.unshift( `SET CHROMEDRIVER=${chromeDriver.replace(/\//g, sep)}` );
    }

    cmds.unshift( 'SET CUCUMBER_AUTO_OPEN=' ); // clear environment so we don't open up the results in a browser
    cmds.unshift( `SET DRAFT=${process.env.DRAFT}` );
    cmds.unshift( 'SET TERM=dumb' );
    cmds.unshift( 'SET LOG_LEVEL=' );

    // Join commands but make sure echo is on & we check error level after each statement
    await outputFile( scriptPath, cmds.join( `\n${echoOn}${errorCheck}` ) ).catch( logger.error );

    // Run the new script
    await exports.execute( unit, [
        'run', unitDir, scriptPath
    ], { cwd: unitDir } );

    // No point in deleting the temporary script file (overwrite or unit delete)
};

exports.backupUnitFiles = async function( data ) {
    if( data.backedUpUnitFiles ) { return; }
    data.backedUpUnitFiles = true;

    if( data.chromeDriver ) {
        await exports.execute( 'taskkill', [
            '/im', basename( data.chromeDriver ), '/f', '/t'
        ], { cwd: data.unitDir } ).catch( err => { data.logger.warn( err ); } );
    }

    if( process.env.CHROME_TASKKILL === 'true' ) {
        await exports.execute( 'taskkill', [
            '/im', 'chrome.exe', '/f', '/t'
        ], { cwd: data.unitDir } ).catch( err => { data.logger.warn( err ); } );
    }

    await mkdirs( data.outDirTemp );

    const suffix = data.id ? `/${data.id}` : '';
    const promises = [
        exports.move( `${data.unitDir}/build.log`, `${data.outDirTemp}${suffix}/build.log`, data ),
        exports.move( `${data.unitDir}/server_darsi.log`, `${data.outDirTemp}${suffix}/server_darsi.log`, data ),
        exports.move( `${data.unitDir}/server_gateway.log`, `${data.outDirTemp}${suffix}/server_gateway.log`, data ),
        exports.move( `${data.unitDir}/rerun.txt`, `${data.outDirTemp}${suffix}/rerun.txt`, data ),
        exports.move( `${data.unitDir}/out/log`, `${data.outDirTemp}/log${suffix}`, data ),
        exports.move( `${data.unitDir}/out/cucumber`, `${data.outDirTemp}/cucumber${suffix}`, data ),
        exports.move( `${data.unitDir}/out/cucumber_parallel`, `${data.outDirTemp}/cucumber_parallel${suffix}`, data ),
        exports.move( `${data.unitDir}/target`, `${data.outDirTemp}/target${suffix}`, data )
    ];
    if( data.datas ) {
        for( const dataLp of data.datas ) {
            promises.push( exports.backupUnitFiles( dataLp ) );
        }
    }
    await Promise.all( promises ).catch( data.logger.warn );
};

exports.endJob = async function( data ) {
    // rename the target & cucumber_parallel directory as the last task before complete to minimize collisions with other Jenkin jobs
    await Promise.all( [
        exports.move( data.outDirTemp, `${process.env.WORKSPACE}/out`, data ),
        exports.move( process.env.TEMP, `${process.env.WORKSPACE}/temp`, data )
    ] );
    logger.info( `${data.prefix}Total runtime was ${exports.prettyTime(data.hrstart)}` );
    logger.verbose( `exitCode=${data.exitCode}` );
    process.exit( data.exitCode );
};

/**
 * @param {String} cmd - command
 * @param {String[]} args - array of arguments
 * @param {Object} options - options
 * @return {Promise} promise
 */
exports.execute = async function( cmd, args = [], options ) {
    if( !options || !options.suppressOutput ) logger.verbose( `execute ${cmd} ${args.join(' ')}` );

    return new Promise( ( resolve, reject ) => {
        const cmdFull = cmd + ' ' + args.join( ' ' );
        if( !options || !options.suppressOutput ) logger.info( `Executing ${cmdFull}` );
        const {
            spawn
        } = require( 'child_process' );
        const child = spawn( cmd, args, options );
        const lines = []; // batch up lines for non-error scenario for readability
        child.on( 'exit', code => {
            flushBuffer( code ? logger.error : logger.info );
            const output = 'Executed ' + cmdFull +
                '\n  | ' + lines.join( '\n' ).replace( /\r?\n/g, '\n  | ' ) + '\n  + ' +
                cmdFull;
            if( code || /(Failed with exit code=|Failed with code=)/i.test( output ) ) {
                if( /Perforce password \(P4PASSWD\) invalid or unset\./.test( output ) ) {
                    // Stop everything since Peforce isn't working.
                    process.exit( 333 );
                }
                // reject(code);
                reject( new Error( `Executing ${cmdFull}` ) );
            } else {
                resolve( lines );
            }
        } );

        let buffer = '';

        /**
         * @param {Function} logFunc - logging function
         */
        function flushBuffer( logFunc ) {
            if( buffer ) {
                // for( const line of exports.extractLines( buffer ) ) { lines.push( line ); }
                lines.push( buffer );
                if( !options || !options.suppressOutput ) logFunc( buffer );
                buffer = '';
            }
        }

        /**
         * @param {*} data - data to output
         * @param {Function} logFunc - logging function
         */
        function log( data, logFunc ) {
            buffer += data.toString();
            if( /\r?\n$/.test( buffer ) ) {
                // remove trailing newline character which is added automatically
                buffer = buffer.replace( /\r?\n$/, '' );
                flushBuffer( logFunc );
            }
        }

        child.stdout.on( 'data', data => log( data, logger.info ) );
        child.stderr.on( 'data', data => log( data, logger.error ) );
    } );
};

exports.unitDelete = async function( { logger, unitDir, datas } ) {
    if( datas ) {
        const promises = [];
        for( const dataLp of datas ) {
            promises.push( exports.unitDelete( dataLp ).catch( logger.error ) );
        }
        await Promise.all( promises );
    } else {
        if( await pathExists( unitDir ).catch( logger.error ) ) {
            const hrstart = process.hrtime();
            logger.verbose( `Deleting unit ${unitDir}...` );
            if( await pathExists( `${unitDir}/init.def` ).catch( logger.error ) ) {
                const promises = [];
                promises.push( exports.execute( unit, [ 'delete', unitDir ] ).catch( logger.error ) );
                // Delete the bigger directories in parallel to the DMS work
                for( const child of [ '.vscode', 'afx', 'node_modules', 'out', 'services', 'target' ] ) {
                    promises.push( exports.remove( `${unitDir}/${child}` ) );
                }
                await Promise.all( promises );
            } else {
                await exports.remove( unitDir );
            }
            logger.info( `Deleted unit ${unitDir} after ${exports.prettyTime(hrstart)}` );
        } else {
            logger.verbose( `Skipping delete of unit ${unitDir} which doesn't exist.` );
        }
    }
};

exports.remove = async function( filePath ) {
    const hrstart = process.hrtime();
    if( await pathExists( filePath ).catch( logger.error ) ) {
        logger.verbose( `Removing ${filePath}...` );
        await remove( filePath ).catch( logger.error );
        logger.info( `Removed ${filePath} after ${exports.prettyTime(hrstart)}` );
    } else {
        logger.verbose( `Unable to remove ${filePath} which doesn't exist.` );
    }
};

exports.move = async function( from, to, data ) {
    const hrstart = process.hrtime();
    if( await pathExists( `${from}` ).catch( logger.error ) ) {
        await exports.remove( to ).catch( logger.error );
        logger.verbose( `Moving ${from} to ${to}...` );
        await ensureDir( dirname( to ) ).catch( logger.error );
        let attempts = 0;
        while( await pathExists( `${from}` ) && attempts < 15 ) {
            if( data && attempts > 0 ) {
                await exports.processCheck( data ).catch( logger.warn );
            }
            await move( from, to ).catch( logger.error );
            attempts++;
        }
        if( !await pathExists( `${from}` ) ) {
            logger.info( `Moved ${from} to ${to} after ${exports.prettyTime(hrstart)}` );
        } else {
            logger.warn( `Unable to move ${from}!` );
        }
    } else {
        logger.verbose( `Unable to move ${from} which doesn't exist.` );
    }
};

exports.copy = async function( from, to ) {
    const hrstart = process.hrtime();
    if( await pathExists( `${from}` ).catch( logger.error ) ) {
        logger.verbose( `Copying ${from} to ${to}...` );
        await ensureDir( dirname( to ) ).catch( logger.error );
        await copy( from, to ).catch( logger.error );
        logger.info( `Copied ${from} to ${to} after ${exports.prettyTime(hrstart)}` );
    } else {
        logger.warn( `Unable to copy ${from} which doesn't exist.` );
    }
};

exports.outputFile = async function( file, content ) {
    const hrstart = process.hrtime();
    logger.verbose( `Writing ${file}...` );
    await outputFile( file, content ).catch( logger.error );
    logger.info( `Wrote ${file} after ${exports.prettyTime(hrstart)}` );
};

exports.writeJson = async function( file, content ) {
    const hrstart = process.hrtime();
    logger.verbose( `Writing ${file}...` );
    await writeJson( file, content ).catch( logger.error );
    logger.info( `Wrote ${file} after ${exports.prettyTime(hrstart)}` );
};

exports.zip = async function( zipFile, zipDir ) {
    const hrstart = process.hrtime();
    await exports.remove( zipFile ).catch( logger.error );
    logger.verbose( `Zipping ${zipFile}...` );
    await new Promise( ( resolve, reject ) => {
        const gulp = require( 'gulp' );
        const zip = require( 'gulp-zip' );
        const path = require( 'path' );
        gulp.src( `${zipDir}/**`, { dot: true } )
            .pipe( zip( path.basename( zipFile ) ) )
            .pipe( gulp.dest( path.dirname( zipFile ) ) )
            .on( 'error', reject )
            .on( 'end', resolve )
            .on( 'close', resolve );
    } );
    logger.info( `Archived ${zipDir} to ${zipFile} after ${exports.prettyTime(hrstart)}` );
};

exports.extractLines = contents => {
    return contents.toString().split( /\r?\n/ );
};

/**
 * @param {Number} startTime - start time
 * @return {String} formatted elapsed time
 */
exports.prettyTime = function( startTime ) {
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

exports.processCheck = async function( { logger, unitDir } ) {
    logger.warn( `Current process is ${process.pid}` );

    await exports.execute( 'pslist.exe', [
        '-t' // Show process tree.
        // process.pid
    ], { cwd: unitDir } ).catch( err => { logger.warn( err ); } );
};
