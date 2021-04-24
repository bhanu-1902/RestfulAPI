const { pathExists } = require( 'fs-extra' );
const { post } = require( 'superagent' );

// Support older CI code here
process.env.AW_PROXY_SERVER = process.env.AW_PROXY_SERVER || 'http://awc/50/wd1230';

const {
    backupUnitFiles,
    endJob,
    execute,
    executeUnit,
    getRefUnit,
    initData,
    outputFile,
    remove,
    unitCreateAndSeed,
    unitDelete
} = require( './js/common' );

const data = initData();
data.killFile = `..\\${process.env.MERGE_REQUEST_IID}.cmd`;

reportMR();

( async function() {
    try {
        if( await pathExists( data.killFile ).catch( data.logger.error ) ) {
            await execute( data.killFile ).catch( data.logger.error );
        }
        await outputFile( data.killFile, `curl -k -X POST ${process.env.BUILD_URL}stop` );

        await updateMergeResult( 'notes', `CI test started. ${process.env.BUILD_URL}console` );
        await getRefUnit();
        await unitCreateAndSeed( data, {
            afx: {
                url: process.env.SOURCE_PROJECT_URL || process.env.PROJECT_URL,
                branch: process.env.BRANCH_NAME
            }
        } );

        try {
            await executeUnit( data, [
                'CALL gulp cp_preintegration',
                'CALL cucumber submit'
            ] );
        } catch ( err ) {
            throw err;
        } finally {
            await backupUnitFiles( data );
        }

        // await executeUnit( data, [
        //     'SET CUCUMBER_NO_UPLOAD=true', // don't upload cucumber results
        //     'CALL gulp awGeneratorTest'
        // ] );
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
    data.prefix = 'Aborted. ';
    await wrapUp();
} );

async function wrapUp() {
    data.logger.verbose( 'wrapUp' );
    await backupUnitFiles( data );

    const promises = [];

    if( data.exitCode !== 2 ) {
        promises.push( remove( data.killFile ) );
    }

    // Update merge request
    if( data.prefix ) {
        promises.push( updateMergeResult( 'notes', `${data.prefix}${process.env.BUILD_URL}console` ) );
    } else if( data.exitCode ) {
        promises.push( updateMergeResult( 'discussions', `CI test failed. ${process.env.BUILD_URL}console` ) );
    } else {
        promises.push( updateMergeResult( 'notes', `CI test passed. ${process.env.BUILD_URL}console` ) );
    }

    // Post cleanup
    promises.push( unitDelete( data ).catch( data.logger.error ) );

    reportMR();
    await Promise.all( promises );

    await endJob( data );
}

function reportMR() {
    if( process.env.PROJECT_URL && process.env.MERGE_REQUEST_IID ) {
        data.logger.info( ` + Merge Request URL = ${process.env.PROJECT_URL}/merge_requests/${process.env.MERGE_REQUEST_IID}` );
    }
}
async function updateMergeResult( type, message ) {
    data.logger.verbose( 'updateMergeResult' );
    const response = await post( `${process.env.GitLabURL}/merge_requests/${process.env.MERGE_REQUEST_IID}/${type}?body=${message}` )
        .set( 'PRIVATE-TOKEN', 'sCWCcz3J5QmM7SS6xn1N' )
        .catch( data.logger.error );
    data.logger.info( `Updated merge request -- [${type}] ${message}\n`, response );
}
