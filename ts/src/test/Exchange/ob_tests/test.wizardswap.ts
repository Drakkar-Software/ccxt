
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { InvalidOrder } from '../../../base/errors.js';

const SYMBOL = 'XMR/BTC';
const MARKET = {
    'symbol': SYMBOL,
    'baseId': 'xmr',
    'quoteId': 'btc',
};

function createExchange (options: Record<string, unknown> = {}) {
    const exchange = new ccxt.wizardswap ({
        'options': options,
    });
    exchange.markets = { [SYMBOL]: MARKET };
    exchange.loadMarkets = async () => exchange.markets;
    return exchange;
}

async function testWizardswap () {
    // createOrder M1: empty response -> InvalidOrder (missing id)
    {
        const exchange = createExchange ();
        const orig = exchange.publicPostExchange;
        exchange.publicPostExchange = async () => ({});
        try {
            await assert.rejects (
                async () => exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                    'address_to': '1BitcoinAddress',
                }),
                (error: any) => error instanceof InvalidOrder
                    && error.message.includes ('exchange response has no order id')
            );
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // createOrder M2: null id -> InvalidOrder (missing id)
    {
        const exchange = createExchange ();
        const orig = exchange.publicPostExchange;
        exchange.publicPostExchange = async () => ({ 'id': null });
        try {
            await assert.rejects (
                async () => exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                    'address_to': '1BitcoinAddress',
                }),
                (error: any) => error instanceof InvalidOrder
                    && error.message.includes ('exchange response has no order id')
            );
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // createOrder M3: valid id -> order returned
    {
        const exchange = createExchange ();
        const orig = exchange.publicPostExchange;
        exchange.publicPostExchange = async () => ({
            'id': '08A75WA1',
            'status': 'waiting',
            'currency_from': 'xmr',
            'amount_from': '0.1',
            'amount_to': '0.0004',
            'address_from': '88hsysd',
            'address_to': '1BitcoinAddress',
        });
        try {
            const order: any = await exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                'address_to': '1BitcoinAddress',
            });
            assert.strictEqual (order['id'], '08A75WA1');
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // createOrder M4: missing id then success on retry
    {
        const exchange = createExchange ({ 'maxRetriesOnFailure': 2 });
        const orig = exchange.publicPostExchange;
        let attemptCount = 0;
        exchange.publicPostExchange = async () => {
            attemptCount += 1;
            if (attemptCount < 3) {
                return {};
            }
            return {
                'id': 'RETRYOK01',
                'status': 'waiting',
                'currency_from': 'xmr',
                'amount_from': '0.1',
                'amount_to': '0.0004',
                'address_from': '88hsysd',
                'address_to': '1BitcoinAddress',
            };
        };
        try {
            const order: any = await exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                'address_to': '1BitcoinAddress',
            });
            assert.strictEqual (order['id'], 'RETRYOK01');
            assert.strictEqual (attemptCount, 3);
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // createOrder M5: all attempts missing id -> InvalidOrder after retries
    {
        const exchange = createExchange ({ 'maxRetriesOnFailure': 2 });
        const orig = exchange.publicPostExchange;
        let attemptCount = 0;
        exchange.publicPostExchange = async () => {
            attemptCount += 1;
            return {};
        };
        try {
            await assert.rejects (
                async () => exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                    'address_to': '1BitcoinAddress',
                }),
                (error: any) => error instanceof InvalidOrder
                    && error.message.includes ('exchange response has no order id')
            );
            assert.strictEqual (attemptCount, 3);
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
}

export default testWizardswap;
