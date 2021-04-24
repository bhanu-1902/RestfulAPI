var { existsSync, readFileSync } = require( 'fs' );
//https://www.npmjs.com/package/find
var find = require( 'find' );

exports.failureTable = function( data ) {
    data.logger.info( 'Generating fail table' );

    const results = {
        features: {
            total: 0,
            passed: 0,
            failed: 0
        },
        scenarios: {
            total: 0,
            passed: 0,
            failed: 0
        },
        steps: {
            total: 0,
            passed: 0,
            skipped: 0,
            failed: [],
            pending: 0,
            undefed: 0
        }
    };

    function createFailed( failure, scenario, feature ) {
        var position = results.steps.failed.map( function( x ) { return x.name; } ).indexOf( failure );
        if( position >= 0 ) {
            results.steps.failed[ position ].count++;
            results.steps.failed[ position ].scenarios.push( scenario );
            results.steps.failed[ position ].features.push( feature );
        } else {
            results.steps.failed.push( { name: failure, count: 1, scenarios: [ scenario ], features: [ feature ] } );
        }
    }

    function sortFailed( array ) {
        array.sort( function compare( a, b ) {
            var comparison = 0;
            if( a.count >= b.count ) {
                comparison = -1;
            } else {
                comparison = 1;
            }
            return comparison;
        } );
    }

    const targets = [];
    for( const dir of find.dirSync( data.outDirTemp ) ) {
        targets.push( find.dirSync( dir ) );
    }

    for( const target of targets ) {
        if( !existsSync( `${target}/cucumber-json-report.json` ) ) {
            continue;
        }

        const objs = JSON.parse( readFileSync( `${target}/cucumber-json-report.json` ) );
        if( !objs ) {
            continue;
        }

        for( const obj of objs ) {
            if( !obj.elements ) {
                continue;
            }

            let scenarioPassedCount = 0;
            let scenarioFailedCount = 0;
            for( const element of obj.elements ) {
                if( !element.steps ) {
                    continue;
                }

                let stepPassedCount = 0;
                let stepFailedCount = 0;
                for( const step of element.steps ) {
                    if( !step || !step.result || !step.result.status ) {
                        continue;
                    }

                    results.steps.total++;
                    switch ( step.result.status ) {
                        case 'failed':
                            if( obj.name && step.name && element.name ) {
                                createFailed( step.name, element.name, obj.name );
                            } else {
                                data.logger.info( `huh?` );
                            }
                            stepFailedCount++;
                            break;
                        case 'passed':
                            results.steps.passed++;
                            stepPassedCount++;
                            break;
                        case 'skipped':
                            results.steps.skipped++;
                            break;
                        default:
                            data.logger.error( `step status = ${step.result.status}` );
                    }
                }

                // maintain scenario counts
                results.scenarios.total++;
                if( stepFailedCount > 0 ) {
                    results.scenarios.failed++;
                    scenarioFailedCount++;
                } else if( stepPassedCount > 0 ) {
                    results.scenarios.passed++;
                    scenarioPassedCount++;
                }
            }

            // maintain feature counts
            results.features.total++;
            if( scenarioFailedCount > 0 ) {
                results.features.failed++;
            } else if( scenarioPassedCount > 0 ) {
                results.features.passed++;
            }
        }
    }

    //Creating Details Tab
    function detailsTab() {
        data.logger.info( `generateFailTable:detailsTab: scenarios ${results.scenarios.total} steps ${results.steps.total}` );
        if( results.scenarios.total > 0 ) {
            const passPercentage = Math.trunc( results.scenarios.passed / results.scenarios.total * 100 );
            data.subject += ` - ${results.scenarios.passed} passed`;
            if( results.scenarios.failed > 0 ) { data.subject += ` ${results.scenarios.failed} failed`; }
            data.subject += ` of ${results.scenarios.total} (${passPercentage}%)`;
            return `<table>
            <tr><th colspan="4">Details</th></tr>
            <tr>
              <td></td>
              <td><b><font color="green">PASS</font></b></td>
              <td><b><font color="red">FAIL</font></b></td>
              <td><b><font color="orange">SKIP</font></b></td>
            </tr>
            <tr>
              <td><b>${results.features.total} features</b></td>
              <td><b><font color="green">${results.features.passed}</font></b> (${Math.trunc( results.features.passed / results.features.total * 100 )}%)</td>
              <td><b><font color="red">${results.features.failed}</font></b> (${Math.trunc(results.features.failed / results.features.total * 100)}%)</td>
              <td></td>
            </tr>
            <tr>
              <td><b>${results.scenarios.total} scenarios</b></td>
              <td><b><font color="green">${results.scenarios.passed}</font></b> (${passPercentage}%)</td>
              <td><b><font color="red">${results.scenarios.failed}</font></b> (${Math.trunc(results.scenarios.failed / results.scenarios.total * 100)}%)</td>
              <td></td>
            </tr>
            <tr>
              <td><b>${results.steps.total} steps</b></td>
              <td><b><font color="green">${results.steps.passed}</font></b> (${Math.trunc( results.steps.passed / results.steps.total * 100 )}%)</td>
              <td><b><font color="red">${results.steps.failed.length}</font></b> (${Math.trunc(results.steps.failed.length / results.steps.total * 100)}%)</td>
              <td><b><font color="orange">${results.steps.skipped}</font></b> (${Math.trunc( results.steps.skipped / results.steps.total * 100 )}%)</td>
            </tr>
            </table>`;
        }
    }

    if( results.steps.failed.length ) {
        sortFailed( results.steps.failed );

        var failTable = detailsTab();
        failTable += `<table><tr><th>Failed Step</th><th>Fail Count</th><th>Scenarios Failed In</th></tr>`;
        var scenarioUrl;

        results.steps.failed.forEach( function( fail ) {
            failTable += `<tr><td>` + fail.name + `</td><td>` + fail.count + `</td><td>`;
            for( var x = 0; x < fail.features.length; x++ ) {
                failTable += `<li><a href="${process.env.JOB_URL}${process.env.BUILD_NUMBER}/testReport/(root)/${fail.features[ x ]}/`;
                scenarioUrl = fail.scenarios[ x ].replace( / /g, '_' );
                scenarioUrl = scenarioUrl.replace( /\./g, '_' );
                scenarioUrl = scenarioUrl.replace( /-/g, '_' );
                scenarioUrl = scenarioUrl.replace( /,/g, '_' );
                failTable += scenarioUrl + '/">' + fail.scenarios[ x ] + '</a></li>';
            }
        } );

        failTable += `</tr></table>`;
        return failTable;
    }
    if( results.scenarios.total || results.scenarios.failed ) {
        var detailsTable = detailsTab( results.scenarios.total, results.scenarios.failed.length );
        return `${detailsTable}`;
    }
    return ''; // no test results
};
