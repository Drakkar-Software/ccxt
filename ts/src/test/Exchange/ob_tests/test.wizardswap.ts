
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { InvalidOrder, OrderNotFound } from '../../../base/errors.js';

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
    const rejectedMessage = (error: any) => error instanceof InvalidOrder
        && error.message.includes ('exchange returned False');
    // createOrder M6: boolean false -> InvalidOrder (rejected)
    {
        const exchange = createExchange ();
        const orig = exchange.publicPostExchange;
        exchange.publicPostExchange = async () => false;
        try {
            await assert.rejects (
                async () => exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                    'address_to': '1BitcoinAddress',
                }),
                rejectedMessage
            );
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // createOrder M7: string 'False' -> InvalidOrder (rejected)
    {
        const exchange = createExchange ();
        const orig = exchange.publicPostExchange;
        exchange.publicPostExchange = async () => 'False';
        try {
            await assert.rejects (
                async () => exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                    'address_to': '1BitcoinAddress',
                }),
                rejectedMessage
            );
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // createOrder M8: string 'false' -> InvalidOrder (rejected)
    {
        const exchange = createExchange ();
        const orig = exchange.publicPostExchange;
        exchange.publicPostExchange = async () => 'false';
        try {
            await assert.rejects (
                async () => exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                    'address_to': '1BitcoinAddress',
                }),
                rejectedMessage
            );
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // createOrder M9: boolean false with retries -> InvalidOrder immediately (no retry)
    {
        const exchange = createExchange ({ 'maxRetriesOnFailure': 2 });
        const orig = exchange.publicPostExchange;
        let attemptCount = 0;
        exchange.publicPostExchange = async () => {
            attemptCount += 1;
            return false;
        };
        try {
            await assert.rejects (
                async () => exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                    'address_to': '1BitcoinAddress',
                }),
                rejectedMessage
            );
            assert.strictEqual (attemptCount, 1);
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // createOrder M10: extra_id_to forwarded in request
    {
        const exchange = createExchange ();
        const orig = exchange.publicPostExchange;
        let capturedRequest: any;
        exchange.publicPostExchange = async (request: any) => {
            capturedRequest = request;
            return {
                'id': 'EXTRAID01',
                'status': 'waiting',
                'currency_from': 'xmr',
                'currency_to': 'btc',
            };
        };
        try {
            await exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                'address_to': '1BitcoinAddress',
                'extra_id_to': 'memo123',
            });
            assert.strictEqual (capturedRequest['extra_id_to'], 'memo123');
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    const orderNotFound = (error: any) => error instanceof OrderNotFound;
    // fetchOrder F1: valid status -> order returned
    {
        const exchange = createExchange ();
        const orig = exchange.publicPostExchange;
        exchange.publicPostExchange = async () => ({
            'id': '08A75WA1',
            'status': 'waiting',
            'currency_from': 'xmr',
            'currency_to': 'btc',
        });
        try {
            const order: any = await exchange.fetchOrder ('08A75WA1');
            assert.strictEqual (order['id'], '08A75WA1');
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // fetchOrder F2: string error body -> OrderNotFound
    {
        const exchange = createExchange ();
        const orig = exchange.publicPostExchange;
        exchange.publicPostExchange = async () => 'Invalid exchange ID';
        try {
            await assert.rejects (
                async () => exchange.fetchOrder ('BADID'),
                orderNotFound
            );
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // fetchOrder F3: missing status -> OrderNotFound
    {
        const exchange = createExchange ();
        const orig = exchange.publicPostExchange;
        exchange.publicPostExchange = async () => ({ 'id': '08A75WA1' });
        try {
            await assert.rejects (
                async () => exchange.fetchOrder ('08A75WA1'),
                orderNotFound
            );
        } finally {
            exchange.publicPostExchange = orig;
        }
    }
    // parseTicker T1: estimated_amount
    {
        const exchange = createExchange ();
        const ticker: any = exchange.parseTicker ({ 'estimated_amount': '0.00476907' }, MARKET as any);
        assert.strictEqual (exchange.numberToString (ticker['last']), '0.00476907');
    }
    // parseTicker T2: amount_to (docs field name)
    {
        const exchange = createExchange ();
        const ticker: any = exchange.parseTicker ({ 'amount_to': '0.99' }, MARKET as any);
        assert.strictEqual (exchange.numberToString (ticker['last']), '0.99');
    }
    // sign S1: POST injects api_key when exchange.apiKey is set
    {
        const exchange = createExchange ();
        exchange.apiKey = 'referral-key';
        const signed: any = exchange.sign ('estimate', 'public', 'POST', {
            'currency_from': 'xmr',
            'currency_to': 'btc',
            'amount_from': '1',
        });
        const body = JSON.parse (signed['body']);
        assert.strictEqual (body['api_key'], 'referral-key');
    }
}

export default testWizardswap;
