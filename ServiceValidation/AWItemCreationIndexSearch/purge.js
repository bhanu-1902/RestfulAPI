// This script is used to delete a directories worth of leftover DMS/UDU units in batch.

const {
    initLogger,
    prettyTime,
    remove,
    unitDelete
} = require( './js/common' );

const logger = initLogger();
const fsPromises = require( 'fs' ).promises;
const hrstart = process.hrtime();

( async function() {
    const curDir = process.cwd();
    logger.info( `Reading ${curDir} content` );
    const children = await fsPromises.readdir( curDir );
    const promises = [];
    for( const child of children ) {
        const childDir = `${curDir}/${child}`;
        if( child === 'ci' ) {
            logger.info( `Skipping ${childDir}` );
            continue;
        } // skip
        logger.info( `Processing ${childDir}` );
        // TODO make this parallel so that all units are deleted together.
        // -- queue only 10 at a time?
        const stat = await fsPromises.stat( childDir );
        if( stat.isDirectory() ) {
            if( /^(\d|_)+$/.test( child ) ) { // make sure it's a # directory
                promises.push( unitDelete( { unitDir: childDir, logger: logger } ).catch( logger.error ) );
                promises.push( remove( `out(-|_)${child}` ).catch( logger.error ) );
                promises.push( remove( `temp_${child}` ).catch( logger.error ) );
            }
        }
    }
    await Promise.all( promises );

    logger.info( `Total runtime was ${prettyTime(hrstart)}` );
} )().catch( logger.error );
