const { mkdirs } = require( 'fs-extra' );
const {
    backupUnitFiles,
    cloneData,
    endJob,
    executeUnit,
    getRefUnit,
    initData,
    outputFile,
    prettyTime,
    remove,
    unitCreateAndSeed,
    unitDelete
} = require( './js/common' );
const email = require( "./js/email" );

// ALL tags
// --tags @tcsim,@retail,@cpg --tags ~@ci --tags ~@aceindexmodeCI
// --tags @cfx,@search,@workflow --tags ~@ci --tags ~@aceindexmodeCI
// --tags @ace,@requirements,@classification,@libraryMgmt --tags ~@ci --tags ~@NAForAceDeclarativeSublocation --tags ~@acedefaultmode --tags ~@nonproduction --tags ~@aceindexmodeCI
// --tags @architecture,@attrtargetmgmt,@analysisrequest,@branchversioning,@systemsynthesismodeling,@occmgmt4gd,@incontextchange,@configurator,@systemModeler,@relations,@suppliercollab --tags ~@ci --tags ~@viewer --tags ~@aceindexmodeCI --tags ~@uxrefresh
// --tags ~@ci --tags ~@ewi --tags ~@gctest --tags ~@tcrs --tags ~@ngth --tags ~@tcsim --tags ~@retail --tags ~@cpg --tags ~@cfx --tags ~@search --tags ~@workflow --tags ~@ace --tags ~@requirements --tags ~@classification --tags ~@libraryMgmt --tags ~@architecture --tags ~@attrtargetmgmt --tags ~@analysisrequest --tags ~@branchversioning --tags ~@systemsynthesismodeling --tags ~@occmgmt4gd --tags ~@incontextchange --tags ~@adsfoundation --tags ~@adschangemgmt --tags ~@servicemanager --tags ~@ldfrm --tags ~@ldfesm --tags ~@ldf --tags ~@viewer --tags ~@configurator --tags ~@systemModeler --tags ~@ldf_ci_check --tags ~@uxrefresh --tags ~@relations --tags ~@aceindexmodeCI --tags ~@suppliercollab

const data = initData();

( async function() {
    try {
        // test support
        await mkdirs( process.env.TEMP );
        await remove( data.outDirTemp ).catch( data.logger.error );

        await getRefUnit();

        const gitRefs = {};
        if( process.env.BRANCH_NAME ) {
            gitRefs.afx = {
                url: process.env.SOURCE_PROJECT_URL || process.env.PROJECT_URL,
                branch: process.env.BRANCH_NAME
            };
        }

        if( process.env.TAGS === 'ALL' || process.env.OVERRIDE_TAGS === 'ALL' ) {
            const allTags = [
                // '--tags @vmValidation', // test options
                // '--tags @locale', // test options
                '--tags @tcsim,@retail,@cpg --tags ~@ci --tags ~@aceindexmodeCI',
                '--tags @cfx,@search,@workflow --tags ~@ci --tags ~@aceindexmodeCI',
                '--tags @ace,@requirements,@classification,@libraryMgmt --tags ~@ci --tags ~@NAForAceDeclarativeSublocation --tags ~@acedefaultmode --tags ~@nonproduction --tags ~@aceindexmodeCI',
                '--tags @architecture,@attrtargetmgmt,@analysisrequest,@branchversioning,@systemsynthesismodeling,@occmgmt4gd,@incontextchange,@configurator,@systemModeler,@relations,@suppliercollab --tags ~@ci --tags ~@viewer --tags ~@aceindexmodeCI --tags ~@uxrefresh',
                '--tags ~@ci --tags ~@ewi --tags ~@gctest --tags ~@tcrs --tags ~@ngth --tags ~@tcsim --tags ~@retail --tags ~@cpg --tags ~@cfx --tags ~@search --tags ~@workflow --tags ~@ace --tags ~@requirements --tags ~@classification --tags ~@libraryMgmt --tags ~@architecture --tags ~@attrtargetmgmt --tags ~@analysisrequest --tags ~@branchversioning --tags ~@systemsynthesismodeling --tags ~@occmgmt4gd --tags ~@incontextchange --tags ~@adsfoundation --tags ~@adschangemgmt --tags ~@servicemanager --tags ~@ldfrm --tags ~@ldfesm --tags ~@ldf --tags ~@viewer --tags ~@configurator --tags ~@systemModeler --tags ~@ldf_ci_check --tags ~@uxrefresh --tags ~@relations --tags ~@aceindexmodeCI --tags ~@suppliercollab'
            ];
            process.env.CUCUMBER_PROCESSES = parseInt( require( 'os' ).cpus().length / allTags.length ); // limit parallel process to avoid overloading system
            const promises = [];
            for( const tags of allTags ) {
                promises.push( asyncUnit( cloneData( data ), gitRefs, tags ).catch( err => {
                    data.exitCode++;
                    data.logger.error( err );
                } ) );
            }
            await Promise.all( promises );
        } else {
            await asyncUnit( data, gitRefs );
        }
    } catch ( err ) {
        data.exitCode = 1;
        data.logger.error( err );
    } finally {
        await wrapUp();
    }
} )().catch( data.logger.error );

process.on( 'SIGINT', async () => {
    data.logger.warn( 'SIGINT' );
    data.exitCode = 2;
    data.sendEmail = false;
    data.prefix = 'Aborted. ';
    await wrapUp();
} );

async function asyncUnit( data, gitRefs, tags ) {
    // test support
    await unitDelete( data ).catch( data.logger.error );

    if( tags ) { data.logger.info( `Starting run for ${tags}...` ); }

    // wait 60 seconds for the previous unit to be built up
    await new Promise( resolve => setTimeout( resolve, 6e4 * data.id ) );

    await unitCreateAndSeed( data, gitRefs );
    const cucumberOptions = await getCucumberOptions( data, tags );

    // if( process.env.RUN_HISTORY &&
    //     data.CPs && data.CPs.length === 0 &&
    //     data.mergeRequests && data.mergeRequests.length === 0 ) {
    //     data.logger.info( 'No Change Packages or Merge Requests since last run. Skipping...' );
    //     data.sendEmail = false;
    // } else {
    const gulpTags = process.env.GULP_TASKS || 'war';
    if( /^aw5/.test( process.env.RELEASE || process.env.REF_LABEL ) ) {
        await executeUnit( data, [
            `CALL gulp ${gulpTags}`,
            `CALL cucumber --path ${cucumberOptions}`
        ] );
    } else {
        const sdUrl = process.env.ENDPOINT_SERVICE_DISPATCHER || process.env.AW_PROXY_SERVER && `${process.env.AW_PROXY_SERVER}/sd/` || '';
        await executeUnit( data, [
            `CALL gulp ${gulpTags}`,
            `SET SERVICE_DISPATCHER=${sdUrl}`,
            `SET CUCUMBER_OPTIONS=${cucumberOptions}`,
            'CALL cucumber'
        ] );
    }
    // }

    if( tags ) { data.logger.info( `Cucumber #${data.id} completed after ${prettyTime(data.hrstart)}\n\t${tags}` ); }
}

async function getCucumberOptions( { logger, unitDir }, tags ) {
    logger.verbose( 'getCucumberOptions' );

    if( !tags ) {
        if( process.env.OVERRIDE_TAGS && !/--tags/.test( process.env.OVERRIDE_TAGS ) ) {
            throw new Error( `Invalid OVERRIDE_TAGS. No '--tags' indicated. [${process.env.OVERRIDE_TAGS}]` );
        }
        if( process.env.USER_TAGS && !/--tags/.test( process.env.USER_TAGS ) ) {
            throw new Error( `Invalid USER_TAGS. No '--tags' indicated. [${process.env.USER_TAGS}]` );
        }
    }

    tags = tags || process.env.OVERRIDE_TAGS || process.env.USER_TAGS || process.env.TAGS || '';
    tags += ' --tags ~@ignore --tags ~@scp --tags ~@universalviewer';

    if( /^aw4\.1\./.test( process.env.RELEASE || process.env.REF_LABEL ) ) {
        if( process.env.AW_DEFAULT_WAR === 'war_classic' ) {
            tags += ' --tags ~@uxrefresh';
        } else {
            tags += ' --tags ~@classic';
        }
    }

    if( process.env.RERUN_ID ) {
        logger.info( 'Retrieving ImpactedFiles.txt from Mandolin...' );
        const rerunTxt = await require( 'superagent' ).post( `${process.env.CUCUMBER_RESULTS_SERVER}/rerun/${process.env.RERUN_ID}` );

        const rerunPath = `${unitDir}/ImpactedFiles.txt`;
        logger.debug( rerunTxt );
        await outputFile( rerunPath, rerunTxt );

        return `@ImpactedFiles.txt --tags @cov`;
    }

    return `${process.env.TEST_PATH} ${tags}`;
}

async function wrapUp() {
    data.logger.verbose( 'wrapUp' );
    await backupUnitFiles( data );
    if( !data.prefix && data.exitCode ) { data.prefix = 'FAILED! '; }
    await email.send( data ).catch( data.logger.error );
    await unitDelete( data ).catch( data.logger.error );
    await endJob( data );
}
