// WizardSwap — estimate a swap rate
// No API key needed
//
// Usage:  npx tsx examples/ts/wizardswap-estimate-swap.ts [BASE/QUOTE] [amount]
// E.g.:   npx tsx examples/ts/wizardswap-estimate-swap.ts XMR/BTC 1

import ccxt from '../../ts/ccxt.js';

async function main () {
    const symbol = process.argv[2] || 'XMR/BTC';
    const amountFrom = process.argv[3] || '1';

    const exchange = new ccxt.wizardswap ();

    // WizardSwap has no predefined markets —
    // dynamically load currencies and build a market on the fly.
    await exchange.loadMarkets ();

    console.log (`Estimating ${amountFrom} ${symbol} swap on WizardSwap…`);

    const ticker = await exchange.fetchTicker (symbol, { 'amount_from': amountFrom });

    const [ base, quote ] = symbol.split ('/');
    console.log (`  Estimated receive: ~${ticker['last']} ${quote}`);
    console.log (`  Fee:               2.2 % (included in estimate)`);
    console.log (`  Full response:`, ticker['info']);
}

main ().catch (console.error);
