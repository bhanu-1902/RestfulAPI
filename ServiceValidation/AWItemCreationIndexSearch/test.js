const {
    initData,
    // querySCMData,
    prettyTime,
    // execute,
    // npm
} = require( './js/common' );
// const email = require( './js/email' );
const superagent = require( 'superagent' );

process.env.EMAIL_TO = 'denny.chitwood@siemens.com';
// process.env.RUN_HISTORY = 'CP MR';
process.env.WORKSPACE = `C:/udu/dev/aw42`;
process.env.JOB_NAME = 'aw42 Sonar';
process.env.BUILD_NUMBER = '311';
process.env.JOB_URL = 'https://cii6s073:8080/job/aw42%20Sonar/';
process.env.BUILD_URL = `${process.env.JOB_URL}${process.env.BUILD_NUMBER}/`;

const data = initData();

( async function() {
    try {
        // GET https://cii6s073:8080/job/aw4.2_GitLab_CI/2277/api/json
        // POST https://cii6s073:8080/job/aw4.2_GitLab_CI/2277/api/json

        process.env[ 'NODE_TLS_REJECT_UNAUTHORIZED' ] = 0;
        const resp = await superagent.get( `${process.env.BUILD_URL}/api/json` )
            // .set( 'Accept', 'application/json' )
            .set( 'PRIVATE-TOKEN', 'sCWCcz3J5QmM7SS6xn1N' );
        const conf = JSON.parse( resp.text );
        conf.displayName += conf.displayName;
        conf.description += conf.description;
        // const resp2 = await superagent.put( `${process.env.BUILD_URL}/api/json` )
        //     .send( conf )
        //     .set( 'Accept', 'application/json' )
        //     .set( 'PRIVATE-TOKEN', 'sCWCcz3J5QmM7SS6xn1N' );
        const data2 = {
            'description': conf.description,
            'displayName': conf.displayName
        };
        // const data2 = {
        //     json: {
        //         parameters: [
        //             { name: 'description', value: conf.description },
        //             { name: 'displayName', value: conf.displayName }
        //         ]
        //     }
        // };
        const resp2 = await superagent.post( `${process.env.BUILD_URL}/api/json` )
            // const resp2 = await superagent.post( `${process.env.BUILD_URL}configSubmit` )
            .send( data2 )
            // .send( {
            //     json: {
            //         description: conf.description,
            //         displayName: conf.displayName
            //     }
            // } )
            .set( 'Accept', 'application/json' )
            .set( 'PRIVATE-TOKEN', 'sCWCcz3J5QmM7SS6xn1N' );
        data.logger.info( 'hi' );

        // data.logger.info( JSON.stringify( conf, null, 4 ) );

        // await execute( npm, [ 'view', 'afx' ] );

        // await querySCMData( data );
        // data.logger.info( data.baseline );
        // data.logger.info( data.release );
        // data.logger.debug( 'CP:\n' + JSON.stringify( data.CPs, null, 4 ) );
        // data.logger.debug( 'MR:\n' + JSON.stringify( data.mergeRequests, null, 4 ) );

        // await email.send( data );
    } catch ( err ) {
        data.logger.error( err );
    } finally {
        data.logger.info( `Total runtime was ${prettyTime(data.hrstart)}` );
    }
} )().catch( data.logger.error );
