const { readJSON } = require( 'fs-extra' );
const { prettyTime } = require( './common' );

async function processDeps( deps, versionInfo, data, logger ) {
    if( deps ) {
        for( const pkgName of Object.keys( deps ) ) {
            try {
                const pkgJson = await readJSON( `${data.unitDir}/node_modules/${pkgName}/package.json` );
                versionInfo.push( `${pkgName} @ ${pkgJson.version}` );
            } catch ( err ) {
                logger.warn( err );
            }
        }
    }
}

// https://www.npmjs.com/package/sendmail
exports.send = async function( data ) {
    const logger = data.logger;

    logger.silly( 'email' );
    if( !process.env.EMAIL_TO || !data.sendEmail ) return;

    const table = {};
    if( process.env.BUILD_URL ) {
        table.Results = `<a href="${process.env.BUILD_URL}cucumber-html-reports">CUCUMBER REPORT</a> - <a href="${process.env.BUILD_URL}">Build ${process.env.BUILD_NUMBER}</a> - <a href="${process.env.BUILD_URL}console">Console</a> (<a href="${process.env.BUILD_URL}consoleFull">Full</a>) - <a href="${process.env.BUILD_URL}parameters">Parameters</a><br>${process.env.JOB_URL}`;
    }
    if( process.env.CP_NUMBER ) table.CP_NUMBER = `<b><font color="green">${process.env.CP_NUMBER}</font></b>`;
    if( process.env.PROJECT_URL && process.env.BRANCH_NAME ) {
        table.PROJECT_URL = `<b><font color="green">${process.env.PROJECT_URL}</font></b>`;
        table.BRANCH_NAME = `<b><font color="green">${process.env.BRANCH_NAME}</font></b>`;
    }

    // Don't try to query the afx version until after it's been loaded. Used for email.
    const versionInfo = [ `${data.release} @ ${data.baseline}` ];
    const awPkgJson = require( `${data.unitDir}/src/package.json` );
    await processDeps( awPkgJson.dependencies, versionInfo, data, logger );
    await processDeps( awPkgJson.optionalDependencies, versionInfo, data, logger );
    await processDeps( awPkgJson.devDependencies, versionInfo, data, logger );
    table[ `Versions` ] = versionInfo.join( '<br>' );

    if( process.env.TAGS || process.env.OVERRIDE_TAGS ) table.TAGS = process.env.OVERRIDE_TAGS || process.env.TAGS;
    for( const envVarName of [
            'TEST_PATH',
            'ENDPOINT_FSC',
            'ENDPOINT_SERVICE_DISPATCHER',
            'ENDPOINT_TC',
            'ENDPOINT_VIS',
            'AW_PROXY_SERVER',
            'BROWSER'
        ] ) {
        if( data[ envVarName ] ) {
            table[ envVarName ] = data[ envVarName ];
        } else if( process.env[ envVarName ] ) {
            table[ envVarName ] = process.env[ envVarName ];
        }
    }
    if( process.env.CUCUMBER_PROCESSES ) table[ 'Number of parallel processes' ] = process.env.CUCUMBER_PROCESSES;
    table[ 'Duration' ] = prettyTime( data.hrstart );
    if( process.env.BUILD_USER_ID || process.env.BUILD_USER ) table.USER = `${process.env.BUILD_USER_ID} - ${process.env.BUILD_USER}`;

    data.subject = process.env.JOB_NAME;
    if( data.release ) data.subject += ` ${data.release}`;

    data.subject += ` - BUILD#: ${process.env.BUILD_NUMBER}`;

    let msg = `<html><style>
    table, th, td {
        border: 1px solid black;
        font-family:calibri;
    }
    table {
        border-collapse: collapse;
        width: 100%;
    }
    th {
        background-color: #BFDFEB;
        color: black;
        text-align: left;
        height: 40px;
        font-size:16pt;
    }
    td {
        height: 20px;
        text-align: left;
        font-size:12pt;
    }
    </style><body><table><tr><th colspan="2">${data.subject}</th></tr>`;
    for( const [ key, value ] of Object.entries( table ) ) {
        msg += `<tr><td>${key}</td><td>${value}</td></tr>`;
    }
    msg += `</table>`;

    try {
        msg += require( './generateFailTable' ).failureTable( data );
    } catch ( err ) {
        logger.error( `Problem generating failure table\n`, err );
    }

    try {
        if( data.CPs || data.mergeRequests ) {
            msg += `<table><tr><th colspan="2">Changes since previous run</th></tr>`;
            if( data.CPs ) {
                msg += `<tr><td>${data.CPs.length} <b>${data.release}</b> change packages</td><td>`;
                let first = true;
                for( const cp of data.CPs ) {
                    if( !first ) { msg += '<br>'; } else { first = false; }
                    // http://cipgweb/do/dms:tips_links_to_change_package
                    msg += `<a href="http://cipgdms1/dms/cp/viewChangePackage.jsf?cpLink=${cp.id}&prName=PLM">${cp.id}</a> - <b>${cp.owner}</b>`;
                }
            }
            if( data.mergeRequests ) {
                for( const [ key, mergeRequests ] of Object.entries( data.mergeRequests ) ) {
                    // Add table entries for all the mergeRequests involved since the last run
                    msg += `<tr><td>${mergeRequests.length} <b>${key}</b> merge requests</td><td>`;
                    let first = true;
                    for( const mergeRequest of mergeRequests ) {
                        if( !first ) { msg += '<br>'; } else { first = false; }
                        // https://docs.gitlab.com/ee/api/merge_requests.html
                        msg += `<a href="${mergeRequest.web_url}">${mergeRequest.iid}</a> - <b>${mergeRequest.author.name}</b> - ${mergeRequest.title}`;
                    }
                    msg += `</td></tr>`;
                }
            }
            msg += '</table>';
        }
    } catch ( err ) {
        logger.error( `Error generating CP & MR delta report.\n`, err );
    }
    msg += `</body></html>`;

    const hrstart = process.hrtime();
    logger.info( `Sending email to "${process.env.EMAIL_TO}" with subject "${data.subject}"` );

    return new Promise( ( resolve, reject ) => {
        const sendmail = require( 'sendmail' )( {
            // logger: {
            //     debug: console.debug,
            //     info: console.info,
            //     warn: console.warn,
            //     error: console.error
            // },
            silent: true,
            // smtpPort: 25, // Default: 25
            smtpHost: 'cismtp.ugs.com' // Default: -1 - extra smtp host after resolveMX
        } );
        sendmail( {
            from: 'tc_hudson@siemens.com',
            to: process.env.EMAIL_TO,
            subject: data.subject,
            html: msg,
            // attachments: [ {
            //     path: `${data.outDirTemp}/build.log`
            // } ]
        }, function( err, reply ) {
            if( err ) {
                logger.error( `Error sending email after ${prettyTime(hrstart)}\n`, err );
                reject( err );
            } else {
                logger.verbose( reply );
                logger.info( `Email sent after ${prettyTime(hrstart)}` );
                resolve( reply );
            }
        } );
    } );
};
