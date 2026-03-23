// WizardSwap — create a swap order and poll until finished
// No API key needed
//
// ⚠ This example actually creates a real swap.
//   You must send the exact deposit amount within 15 minutes.
//
// Usage:
//   npx tsx examples/ts/wizardswap-create-swap.ts <BTC_ADDRESS> [XMR_AMOUNT]
//
// Example:
//   npx tsx examples/ts/wizardswap-create-swap.ts bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh 0.5

import ccxt from '../../ts/ccxt.js';

async function main () {
    const btcAddress = process.argv[2];
    const xmrAmount = parseFloat (process.argv[3] || '0.1');

    if (!btcAddress) {
        console.error ('Usage: npx tsx examples/ts/wizardswap-create-swap.ts <BTC_ADDRESS> [XMR_AMOUNT]');
        process.exit (1);
    }

    const exchange = new ccxt.wizardswap ();
    await exchange.loadMarkets ();

    // ── 1. Estimate ──────────────────────────────────────────────────
    console.log (`Estimating ${xmrAmount} XMR → BTC …`);
    const ticker = await exchange.fetchTicker ('XMR/BTC', { 'amount_from': String (xmrAmount) });
    console.log (`  Estimated receive: ~${ticker['last']} BTC (2.2 % fee included)\n`);

    // ── 2. Create exchange ───────────────────────────────────────────
    console.log ('Creating swap order…');
    const order = await exchange.createOrder ('XMR/BTC', 'market', 'sell', xmrAmount, undefined, {
        'address_to': btcAddress,
    });

    console.log (`  Order ID:         ${order['id']}`);
    console.log (`  Deposit address:  ${order['info']['address_from']}`);
    if (order['info']['extra_id_from']) {
        console.log (`  Extra ID / Memo:  ${order['info']['extra_id_from']}`);
    }
    console.log (`  Send exactly:     ${xmrAmount} XMR`);
    console.log (`  Expected receive: ~${order['price']} BTC → ${btcAddress}`);
    console.log (`  ⏱  You have 15 minutes to send the deposit!\n`);

    // ── 3. Poll for status ───────────────────────────────────────────
    console.log ('Polling for status (Ctrl+C to stop)…');
    const terminal = new Set ([ 'closed', 'canceled' ]);
    const pollInterval = 20000; // 20 seconds

    while (true) {
        const status = await exchange.fetchOrder (order['id']);
        const rawStatus = status['info']['status'];
        console.log (`  [status] ${rawStatus}  (unified: ${status['status']})`);

        if (terminal.has (status['status'])) {
            if (rawStatus === 'finished') {
                console.log (`\n✅ Swap finished!`);
                console.log (`  BTC received: ${status['info']['amount_to']}`);
                console.log (`  Payout tx:    ${status['info']['tx_to']}`);
            } else {
                console.log (`\n❌ Swap ended with status: ${rawStatus}`);
            }
            break;
        }

        await new Promise ((resolve) => setTimeout (resolve, pollInterval));
    }
}

main ().catch (console.error);
