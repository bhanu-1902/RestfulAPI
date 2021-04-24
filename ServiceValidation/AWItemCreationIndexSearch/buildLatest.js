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
        await getRefUnit();
        await unitCreateAndSeed( data );

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

        // await executeUnit( data, [ `CALL gulp clean awGeneratorTest` ] );
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
    await backupUnitFiles( data );
    await wrapUp();
} );

async function wrapUp() {
    data.logger.verbose( 'wrapUp' );

    if( !data.prefix && data.exitCode ) { data.prefix = 'FAILED! '; }
    await Promise.all( [
        email.send( data ).catch( data.logger.error ),
        unitDelete( data ).catch( data.logger.error )
    ] );
    await endJob( data );
}
