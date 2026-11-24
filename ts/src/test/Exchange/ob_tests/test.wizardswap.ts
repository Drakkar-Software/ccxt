
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { InvalidOrder, NetworkError, NotSupported, OrderNotFound } from '../../../base/errors.js';

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
    const FORM_OPTS = { 'websiteFormBackup': true };
    const PAGE_HTML = (orderId: string) => (
        '<h5>Exchange ID: ' + orderId + '</h5>' +
        '<h2 id="status">Waiting for deposit.</h2>' +
        '<span id="amount_a">0.1</span>' +
        '<input id="deposit_address" value="depositAddressFromWebsiteForm01" />' +
        '<input id="receiver_address" value="1BitcoinAddress" />' +
        '<div>Minimum XMR to send: 0.003</div>' +
        '<strong>Amount to be sent: 0.0004 BTC</strong>'
    );
    const STATUS_JSON = { 'status': 'waiting', 'status_text': 'Waiting for deposit.' };
    // website W1: create via redirect NetworkError
    {
        const exchange = createExchange (FORM_OPTS);
        const origFetch = exchange.fetch;
        const origEstimate = exchange.publicPostEstimate;
        const origExchange = exchange.publicPostExchange;
        let fetchCalls = 0;
        exchange.publicPostExchange = async () => {
            throw new Error ('API must not be used for website create');
        };
        exchange.publicPostEstimate = async () => ({ 'estimated_amount': '0.0004' });
        exchange.fetch = async (url: string, method: string) => {
            fetchCalls += 1;
            const urlText = String (url);
            if (method === 'GET' && urlText.indexOf ('id=FORMID01') >= 0) {
                return PAGE_HTML ('FORMID01');
            }
            if (method === 'POST' && urlText.indexOf ('action=get_status') >= 0) {
                return STATUS_JSON;
            }
            if (method === 'GET') {
                return '<input type="hidden" name="token" value="csrfTokenValue">';
            }
            if (method === 'POST') {
                throw new NetworkError ('wizardswap POST https://www.wizardswap.io/ redirect to id=FORMID01 was not followed (HTTP 302)');
            }
            return '';
        };
        try {
            const order: any = await exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                'address_to': '1BitcoinAddress',
            });
            assert.strictEqual (order['id'], 'FORMID01');
            assert.strictEqual (order['status'], 'open');
            assert.ok (order['timestamp'] !== undefined && order['timestamp'] !== null);
            assert.ok (order['datetime'] !== undefined && order['datetime'] !== null);
            assert.strictEqual (order['info']['address_from'], 'depositAddressFromWebsiteForm01');
            assert.strictEqual (order['amount'], 0.1);
            assert.strictEqual (exchange.numberToString (order['price']), '0.0004');
        } finally {
            exchange.fetch = origFetch;
            exchange.publicPostEstimate = origEstimate;
            exchange.publicPostExchange = origExchange;
        }
    }
    // website W2: create via HTML redirect body (Python-like)
    {
        const exchange = createExchange (FORM_OPTS);
        const origFetch = exchange.fetch;
        const origEstimate = exchange.publicPostEstimate;
        exchange.publicPostEstimate = async () => ({ 'estimated_amount': '0.0004' });
        exchange.fetch = async (url: string, method: string) => {
            const urlText = String (url);
            if (method === 'GET' && urlText.indexOf ('id=FORMID02') >= 0) {
                return PAGE_HTML ('FORMID02');
            }
            if (method === 'POST' && urlText.indexOf ('action=get_status') >= 0) {
                return STATUS_JSON;
            }
            if (method === 'GET') {
                return '<input type="hidden" name="token" value="csrfTokenValue">';
            }
            if (method === 'POST') {
                return PAGE_HTML ('FORMID02');
            }
            return '';
        };
        try {
            const order: any = await exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                'address_to': '1BitcoinAddress',
            });
            assert.strictEqual (order['id'], 'FORMID02');
        } finally {
            exchange.fetch = origFetch;
            exchange.publicPostEstimate = origEstimate;
        }
    }
    // website W3: homepage without id -> InvalidOrder
    {
        const exchange = createExchange (FORM_OPTS);
        const origFetch = exchange.fetch;
        const origEstimate = exchange.publicPostEstimate;
        exchange.publicPostEstimate = async () => ({ 'estimated_amount': '0.0004' });
        exchange.fetch = async (url: string, method: string) => {
            if (method === 'GET') {
                return '<input type="hidden" name="token" value="csrfTokenValue">';
            }
            if (method === 'POST') {
                return '<html><body>homepage without id</body></html>';
            }
            return '';
        };
        try {
            await assert.rejects (
                async () => exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                    'address_to': '1BitcoinAddress',
                }),
                (error: any) => error instanceof InvalidOrder
            );
        } finally {
            exchange.fetch = origFetch;
            exchange.publicPostEstimate = origEstimate;
        }
    }
    // website W4: extra_id_to -> NotSupported
    {
        const exchange = createExchange (FORM_OPTS);
        try {
            await assert.rejects (
                async () => exchange.createOrder (SYMBOL, 'market', 'sell', 0.1, undefined, {
                    'address_to': '1BitcoinAddress',
                    'extra_id_to': 'memo',
                }),
                (error: any) => error instanceof NotSupported
            );
        } finally {
            // noop
        }
    }
    // website W5: fetch status+page merge
    {
        const exchange = createExchange (FORM_OPTS);
        const origFetch = exchange.fetch;
        const origExchange = exchange.publicPostExchange;
        exchange.publicPostExchange = async () => {
            throw new Error ('API fallback must not run');
        };
        exchange.fetch = async (url: string, method: string) => {
            const urlText = String (url);
            if (method === 'POST' && urlText.indexOf ('action=get_status') >= 0) {
                return STATUS_JSON;
            }
            if (method === 'GET') {
                return PAGE_HTML ('FORMID03');
            }
            return '';
        };
        try {
            const order: any = await exchange.fetchOrder ('FORMID03');
            assert.strictEqual (order['id'], 'FORMID03');
            assert.strictEqual (order['status'], 'open');
            assert.strictEqual (order['info']['currency_from'], 'xmr');
            assert.strictEqual (order['info']['currency_to'], 'btc');
            assert.strictEqual (order['info']['address_from'], 'depositAddressFromWebsiteForm01');
        } finally {
            exchange.fetch = origFetch;
            exchange.publicPostExchange = origExchange;
        }
    }
    // website W6: fetch status fails, page alone
    {
        const exchange = createExchange (FORM_OPTS);
        const origFetch = exchange.fetch;
        exchange.fetch = async (url: string, method: string) => {
            if (method === 'POST') {
                throw new Error ('status down');
            }
            return PAGE_HTML ('FORMID04');
        };
        try {
            const order: any = await exchange.fetchOrder ('FORMID04');
            assert.strictEqual (order['status'], 'open');
            assert.strictEqual (order['info']['address_from'], 'depositAddressFromWebsiteForm01');
        } finally {
            exchange.fetch = origFetch;
        }
    }
    // website W7: website legs fail -> API fallback
    {
        const exchange = createExchange (FORM_OPTS);
        const origFetch = exchange.fetch;
        const origExchange = exchange.publicPostExchange;
        exchange.fetch = async () => {
            throw new Error ('website down');
        };
        exchange.publicPostExchange = async () => ({
            'id': 'APIFALL01',
            'status': 'waiting',
            'currency_from': 'xmr',
            'currency_to': 'btc',
            'address_from': 'fromApi',
        });
        try {
            const order: any = await exchange.fetchOrder ('APIFALL01');
            assert.strictEqual (order['id'], 'APIFALL01');
        } finally {
            exchange.fetch = origFetch;
            exchange.publicPostExchange = origExchange;
        }
    }
}

export default testWizardswap;
