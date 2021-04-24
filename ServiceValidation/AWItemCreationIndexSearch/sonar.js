const {
    backupUnitFiles,
    endJob,
    executeUnit,
    getRefUnit,
    initData,
    unitCreateAndSeed,
    unitDelete
} = require( './js/common' );
const email = require( "./js/email" );

const data = initData();

( async function() {
    try {
        await unitDelete( data ).catch( data.logger.error );
        await getRefUnit();
        await unitCreateAndSeed( data );
        await executeUnit( data, [ `CALL gulp sonar` ] );
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
    if( !data.prefix && data.exitCode ) { data.prefix = 'FAILED! '; }
    await Promise.all( [
        email.send( data ).catch( data.logger.error ),
        unitDelete( data ).catch( data.logger.error )
    ] );
    await endJob( data );
}
