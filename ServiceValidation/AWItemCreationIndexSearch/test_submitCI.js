const {
    initData,
    execute
} = require( './js/common' );

const data = initData();

( async function() {
    const cps = 'PLM597076 PLM596213 PLM593705 PLM597650 PLM598342 PLM598582 PLM598677 PLM598485 PLM598364 PLM598418 PLM598147 PLM598565 PLM598371 PLM598346 PLM598564 PLM598608 PLM598154 PLM598454 PLM598212 PLM598716'.split( ' ' );
    const promises = [];
    let waitTime = 0;
    for( const cpNum of cps ) {
        let url = `http://cii6s107:8080/job/Cucumber/buildWithParameters`;
        url += '?EMAIL_TO=' + encodeURIComponent( 'denny.chitwood@siemens.com' );
        url += '&CP_NUMBER=' + encodeURIComponent( cpNum );
        url += '&OVERRIDE_TAGS=' + encodeURIComponent( '--tags @ci,@CV' );
        url += '&OVERRIDE_AW_PROXY_SERVER=' + encodeURIComponent( 'http://awc/50/123/t3' );
        url += '&GULP_TASKS=' + encodeURIComponent( 'all kit_test' );

        promises.push( new Promise( resolve => {
            setTimeout( async () => {
                data.logger.info( `>>> ${url}` );
                await execute( 'curl', [
                    '-X', 'POST', // Specify request command to use
                    '-k', // Allow insecure server connections when using SSL
                    url
                ] );
                resolve();
            }, waitTime );
        } ) );

        waitTime += 60 * 1000; // 1 minute
    }
    await Promise.all( promises );
} )().catch( data.logger.error );
