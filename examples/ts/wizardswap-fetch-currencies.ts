// WizardSwap — fetch all supported currencies
// No API key needed

import ccxt from '../../ts/ccxt.js';

async function main () {
    const exchange = new ccxt.wizardswap ();

    console.log ('Fetching WizardSwap supported currencies…');
    const currencies = await exchange.fetchCurrencies ();

    const codes = Object.keys (currencies);
    console.log (`Found ${codes.length} currencies:`);
    console.log (codes.join (', '));
}

main ().catch (console.error);
