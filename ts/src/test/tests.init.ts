

import { getCliArgValue, argvExchange, argvSymbol, argvMethod } from './tests.helpers.js';
import testMainClass from './tests.js';
import baseTestsInitRest from './base/tests.init.js';
import baseTestsInitWs from '../pro/test/base/tests.init.js';
import obTestsInit from './Exchange/ob_tests/ob_tests.init.js';


// ########### args ###########
const isWs = getCliArgValue ('--ws');
const isBaseTests = getCliArgValue ('--baseTests');
const isObTests = getCliArgValue ('--obTests');
const runAll = getCliArgValue ('--all');

// ####### base tests #######
async function main () {
    if (isBaseTests) {
        if (isWs) {
            await baseTestsInitWs ();
            console.log ('base WS tests passed!');
        } else {
            await baseTestsInitRest ();
            console.log ('base REST tests passed!');
        }
        if (!runAll) {
            process.exit (0);
        }
    }
    if (isObTests) {
        await obTestsInit ();
        console.log ('ob REST tests passed!');
        if (!runAll) {
            process.exit (0);
        }
    }
    (new testMainClass ()).init (argvExchange, argvSymbol, argvMethod);
}

main ();

