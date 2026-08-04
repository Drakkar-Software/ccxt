
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { ExchangeError } from '../../../base/errors.js';

async function testCoinrabbit () {
    // unwrap: success extracts response payload
    {
        const exchange = new ccxt.coinrabbit ();
        const payload = exchange.coinrabbitUnwrapResponse ({ 'result': true, 'response': [ { 'symbol': 'BTC/USDT' } ] });
        assert.strictEqual (payload.length, 1);
    }
    // unwrap: result false throws
    {
        const exchange = new ccxt.coinrabbit ();
        assert.throws (
            () => exchange.coinrabbitUnwrapResponse ({ 'result': false, 'error': 'failed' }),
            ExchangeError,
        );
    }
    // parseMarket: composite id and network info
    {
        const exchange = new ccxt.coinrabbit ();
        const market = exchange.parseMarket ({
            'symbol': 'BTC/USDT',
            'base': 'BTC',
            'quote': 'USDT',
            'base_network': 'btc',
            'quote_network': 'eth',
            'active': true,
            'min_amount': 0.000001,
            'precision': { 'amount': 6, 'price': 2 },
        });
        assert.strictEqual (market['id'], 'btc:eth:BTC/USDT');
        assert.strictEqual (market['symbol'], 'BTC/USDT');
        assert.strictEqual (market['info']['base_network'], 'btc');
        assert.strictEqual (market['info']['quote_network'], 'eth');
    }
    // parseOrderStatus mapping
    {
        const exchange = new ccxt.coinrabbit ();
        assert.strictEqual (exchange.parseOrderStatus ('OPEN'), 'open');
        assert.strictEqual (exchange.parseOrderStatus ('CLOSED'), 'closed');
        assert.strictEqual (exchange.parseOrderStatus ('CANCELED'), 'canceled');
        assert.strictEqual (exchange.parseOrderStatus ('open'), 'open');
    }
    // parseBalance: flat currency balances from array envelope
    {
        const exchange = new ccxt.coinrabbit ();
        const balanceDict = exchange.coinrabbitFlattenBalanceArray ([
            { 'USDT': { 'free': '1500.25', 'used': '500.00', 'total': '2000.25' } },
        ]);
        const balance = exchange.parseBalance (balanceDict);
        assert.strictEqual (balance['USDT']['free'], 1500.25);
        assert.strictEqual (balance['USDT']['used'], 500);
        assert.strictEqual (balance['USDT']['total'], 2000.25);
    }
    // sign: private GET includes v2 auth headers over METHOD\nPATH\nBODY\nTIMESTAMP
    {
        const exchangeAny = new ccxt.coinrabbit () as any;
        exchangeAny.apiKey = 'api-key';
        exchangeAny.secret = 'secret';
        exchangeAny.milliseconds = () => 1710000000000;
        let capturedPayload: string = '';
        exchangeAny.hmac = (payload: Uint8Array) => {
            capturedPayload = exchangeAny.binaryToString (payload);
            return 'HMACSTUB';
        };
        const signed = exchangeAny.sign ('trading/orders', 'private', 'GET', { 'symbol': 'BTC/USDT', 'limit': 10 });
        assert.strictEqual (signed['headers']['X-API-KEY'], 'api-key');
        assert.strictEqual (signed['headers']['X-TIMESTAMP'], '1710000000000');
        assert.strictEqual (signed['headers']['X-SIGNATURE'], 'HMACSTUB');
        assert.match (signed['url'], /\/v2\/trading\/orders\?/);
        assert.match (signed['url'], /symbol=/);
        assert.strictEqual (capturedPayload, 'GET\n/v2/trading/orders?symbol=BTC%2FUSDT&limit=10\n\n1710000000000');
    }
    // createOrder: sell maps amount and source
    {
        const exchange = new ccxt.coinrabbit ();
        exchange.apiKey = 'key';
        exchange.secret = 'secret';
        exchange.markets = {
            'BTC/USDT': {
                'symbol': 'BTC/USDT',
                'precision': { 'amount': 8, 'price': 8 },
                'info': {
                    'symbol': 'BTC/USDT',
                    'base_network': 'btc',
                    'quote_network': 'eth',
                },
            },
        };
        exchange.markets_by_id = {
            'btc:eth:BTC/USDT': exchange.markets['BTC/USDT'],
        };
        exchange.loadMarkets = async () => exchange.markets;
        let capturedRequest: any = undefined;
        exchange.privatePostTradingOrder = async (request) => {
            capturedRequest = request;
            return { 'result': true, 'response': { 'id': 1, 'symbol': 'BTC/USDT', 'side': 'sell', 'type': 'market', 'amount': '0.1', 'status': 'open' } };
        };
        await exchange.createOrder ('BTC/USDT', 'market', 'sell', 0.1);
        assert.strictEqual (capturedRequest['side'], 'sell');
        assert.strictEqual (capturedRequest['type'], 'market');
        assert.strictEqual (capturedRequest['amount'], '0.1');
        assert.strictEqual (capturedRequest['source'], 'octobot');
        assert.strictEqual (capturedRequest['base_network'], 'btc');
        assert.strictEqual (capturedRequest['quote_network'], 'eth');
    }
}

export default testCoinrabbit;
