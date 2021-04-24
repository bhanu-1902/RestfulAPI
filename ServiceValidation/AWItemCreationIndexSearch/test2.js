const {
    initData,
    querySCMData,
    prettyTime
    // processCheck
    // npm
} = require( './js/common' );

process.env.EMAIL_TO = 'denny.chitwood@siemens.com';
// process.env.RUN_HISTORY = 'CP MR';
process.env.WORKSPACE = `C:/udu/dev/aw43`;
process.env.JOB_NAME = 'CI Test Job';
process.env.BUILD_NUMBER = '311';
process.env.REF_LABEL = 'aw5.0.0.0.2020012100';
process.env.JOB_URL = 'https://cii6s073:8080/job/aw42%20Sonar/';
process.env.BUILD_URL = `${process.env.JOB_URL}${process.env.BUILD_NUMBER}/`;

const data = initData();

( async function() {
    try {
        data.unitDir = `C:/udu/dev/aw43b`;
        data.outDirTemp = 'C:/Users/gedenny/Downloads/archive/out';
        data.versions = {};
        await querySCMData( data );
        // require('./js/generateFailTable').failureTable(data);
        await require( './js/email' ).send( data );
    } catch ( err ) {
        data.logger.error( err );
    } finally {
        data.logger.info( `Total runtime was ${prettyTime(data.hrstart)}` );
        process.exit( 0 );
    }
} )().catch( data.logger.error );
