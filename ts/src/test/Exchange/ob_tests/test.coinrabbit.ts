
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { AuthenticationError, ExchangeError, NotSupported, OrderNotFound } from '../../../base/errors.js';

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
    // handleErrors: result false with NOT FOUND throws OrderNotFound
    {
        const exchange = new ccxt.coinrabbit ();
        const body = '{"result":false,"message":"Order 123 not found","code":"NOT FOUND"}';
        const response = { 'result': false, 'message': 'Order 123 not found', 'code': 'NOT FOUND' };
        assert.throws (
            () => exchange.handleErrors (200, 'OK', 'https://exchange.coinrabbit.io/v2/trading/order/123', 'GET', {}, body, response, {}, undefined),
            OrderNotFound,
        );
    }
    // handleErrors: result false with generic error still throws ExchangeError
    {
        const exchange = new ccxt.coinrabbit ();
        const body = '{"result":false,"error":"failed"}';
        const response = { 'result': false, 'error': 'failed' };
        assert.throws (
            () => exchange.handleErrors (200, 'OK', 'https://exchange.coinrabbit.io/v2/trading/orders', 'GET', {}, body, response, {}, undefined),
            ExchangeError,
        );
    }
    // handleErrors: invalid api key throws AuthenticationError
    {
        const exchange = new ccxt.coinrabbit ();
        const body = '{"result":false,"message":"Invalid api key","code":"UNAUTHORIZED"}';
        const response = { 'result': false, 'message': 'Invalid api key', 'code': 'UNAUTHORIZED' };
        assert.throws (
            () => exchange.handleErrors (401, 'Unauthorized', 'https://exchange.coinrabbit.io/v2/account/balance', 'GET', {}, body, response, {}, undefined),
            AuthenticationError,
        );
    }
    // handleErrors: limit order rejection throws NotSupported
    {
        const exchange = new ccxt.coinrabbit ();
        const body = '{"result":false,"message":"\\"Type\\" must be equal to \\"market\\"","code":"BAD_REQUEST"}';
        const response = { 'result': false, 'message': '"Type" must be equal to "market"', 'code': 'BAD_REQUEST' };
        assert.throws (
            () => exchange.handleErrors (400, 'Bad Request', 'https://exchange.coinrabbit.io/v2/trading/order', 'POST', {}, body, response, {}, undefined),
            NotSupported,
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
    // parseMarket: null API price precision defaults to hardcoded 2
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
            'precision': { 'amount': 6, 'price': null },
        });
        assert.strictEqual (market['precision']['price'], 2);
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
    // coinrabbitNetworkQualifiedSymbol: ticker-wise market symbol
    {
        const exchange = new ccxt.coinrabbit ();
        assert.strictEqual (exchange.coinrabbitNetworkQualifiedSymbol ('BTC/USDT', 'btc', 'eth'), 'BTC@BTC/USDT@ETH');
    }
    // coinrabbitParseTickerWiseSymbol: parse ticker-wise market symbol
    {
        const exchange = new ccxt.coinrabbit ();
        const parsed = exchange.coinrabbitParseTickerWiseSymbol ('BTC@BTC/USDT@ETH');
        assert.strictEqual (parsed['base'], 'BTC');
        assert.strictEqual (parsed['quote'], 'USDT');
        assert.strictEqual (parsed['baseNetwork'], 'btc');
        assert.strictEqual (parsed['quoteNetwork'], 'eth');
    }
    // coinrabbitResolveMarket: ticker-wise symbol lookup
    {
        const exchange = new ccxt.coinrabbit ();
        const tickerWiseMarket = {
            'symbol': 'BTC@BTC/USDT@ETH',
            'id': 'btc:eth:BTC/USDT',
            'precision': { 'amount': 8, 'price': 8 },
            'info': {
                'symbol': 'BTC/USDT',
                'base_network': 'btc',
                'quote_network': 'eth',
            },
        };
        exchange.markets = {
            'BTC@BTC/USDT@ETH': tickerWiseMarket,
        };
        const market = exchange.coinrabbitResolveMarket ('BTC@BTC/USDT@ETH');
        assert.strictEqual (market['symbol'], 'BTC@BTC/USDT@ETH');
    }
    // coinrabbitResolveMarket: plain symbol + network params
    {
        const exchange = new ccxt.coinrabbit ();
        const tickerWiseMarket = {
            'symbol': 'BTC@BTC/USDT@ETH',
            'id': 'btc:eth:BTC/USDT',
            'precision': { 'amount': 8, 'price': 8 },
            'info': {
                'symbol': 'BTC/USDT',
                'base_network': 'btc',
                'quote_network': 'eth',
            },
        };
        exchange.markets = {
            'BTC@BTC/USDT@ETH': tickerWiseMarket,
        };
        const market = exchange.coinrabbitResolveMarket ('BTC/USDT', { 'base_network': 'btc', 'quote_network': 'eth' });
        assert.strictEqual (market['symbol'], 'BTC@BTC/USDT@ETH');
    }
    // parseOrder: API plain symbol + ticker-wise market → unified symbol
    {
        const exchange = new ccxt.coinrabbit ();
        const tickerWiseMarket = {
            'symbol': 'BTC@BTC/USDT@ETH',
            'id': 'btc:eth:BTC/USDT',
            'base': 'BTC',
            'quote': 'USDT',
            'info': {
                'symbol': 'BTC/USDT',
                'base_network': 'btc',
                'quote_network': 'eth',
            },
        };
        const order = exchange.parseOrder ({
            'id': '1',
            'symbol': 'BTC/USDT',
            'side': 'sell',
            'type': 'market',
            'amount': '0.1',
            'status': 'open',
            'created_at': '2025-01-01T00:00:00Z',
        }, tickerWiseMarket as any);
        assert.strictEqual (order['symbol'], 'BTC@BTC/USDT@ETH');
    }
    // parseOrder: buy market API amount is quote cost, not base quantity
    {
        const exchange = new ccxt.coinrabbit ();
        const tickerWiseMarket = {
            'symbol': 'BTC@BTC/USDT@ETH',
            'id': 'btc:eth:BTC/USDT',
            'base': 'BTC',
            'quote': 'USDT',
            'precision': { 'amount': 6, 'price': 2 },
            'info': {
                'symbol': 'BTC/USDT',
                'base_network': 'btc',
                'quote_network': 'eth',
            },
        };
        exchange.markets = {
            'BTC@BTC/USDT@ETH': tickerWiseMarket,
        };
        const order = exchange.parseOrder ({
            'id': '6',
            'symbol': 'BTC/USDT',
            'side': 'buy',
            'type': 'market',
            'amount': '2.41',
            'price': '77775.8',
            'fee': '0.0723',
            'status': 'open',
            'created_at': '2025-01-01T00:00:00Z',
        }, tickerWiseMarket as any);
        const expectedAmount = exchange.amountToPrecision ('BTC@BTC/USDT@ETH', 2.41 / 77775.8);
        assert.strictEqual (Number (order['amount']), Number (expectedAmount));
        assert.strictEqual (Number (order['cost']), 2.41);
        assert.strictEqual (order['status'], 'closed');
    }
    // parseOrder: buy market closed-list API uses amount=quote spent, quote_amount=base received, inverted price
    {
        const exchange = new ccxt.coinrabbit ();
        const tickerWiseMarket = {
            'symbol': 'BTC@BTC/USDT@ETH',
            'id': 'btc:eth:BTC/USDT',
            'base': 'BTC',
            'quote': 'USDT',
            'precision': { 'amount': 6, 'price': 2 },
            'info': {
                'symbol': 'BTC/USDT',
                'base_network': 'btc',
                'quote_network': 'eth',
            },
        };
        exchange.markets = {
            'BTC@BTC/USDT@ETH': tickerWiseMarket,
        };
        const order = exchange.parseOrder ({
            'id': '5',
            'symbol': 'BTC/USDT',
            'side': 'buy',
            'type': 'market',
            'amount': '4.98',
            'quote_amount': '0.00006368333835984944',
            'price': '0.00001278781894776093',
            'fee': '0.1494',
            'status': 'closed',
            'created_at': '2026-09-01T13:21:23.740Z',
        }, tickerWiseMarket as any);
        const expectedAmount = exchange.amountToPrecision ('BTC@BTC/USDT@ETH', 0.00006368333835984944);
        assert.strictEqual (Number (order['amount']), Number (expectedAmount));
        assert.strictEqual (Number (order['cost']), 4.98);
        assert.ok (Math.abs (Number (order['amount']) * Number (order['price']) - Number (order['cost'])) < 1);
    }
    // parseOrder: buy limit API amount is quote cost, not base quantity
    {
        const exchange = new ccxt.coinrabbit ();
        const tickerWiseMarket = {
            'symbol': 'BTC@BTC/USDT@ETH',
            'id': 'btc:eth:BTC/USDT',
            'base': 'BTC',
            'quote': 'USDT',
            'precision': { 'amount': 6, 'price': 2 },
            'info': {
                'symbol': 'BTC/USDT',
                'base_network': 'btc',
                'quote_network': 'eth',
            },
        };
        exchange.markets = {
            'BTC@BTC/USDT@ETH': tickerWiseMarket,
        };
        const order = exchange.parseOrder ({
            'id': '7',
            'symbol': 'BTC/USDT',
            'side': 'buy',
            'type': 'limit',
            'amount': '5',
            'price': '50000',
            'status': 'open',
            'created_at': '2025-01-01T00:00:00Z',
        }, tickerWiseMarket as any);
        assert.strictEqual (Number (order['amount']), 0.0001);
        assert.strictEqual (Number (order['cost']), 5);
    }
    // parseOrder: sell API amount stays base quantity
    {
        const exchange = new ccxt.coinrabbit ();
        const tickerWiseMarket = {
            'symbol': 'BTC@BTC/USDT@ETH',
            'id': 'btc:eth:BTC/USDT',
            'base': 'BTC',
            'quote': 'USDT',
            'precision': { 'amount': 6, 'price': 2 },
            'info': {
                'symbol': 'BTC/USDT',
                'base_network': 'btc',
                'quote_network': 'eth',
            },
        };
        exchange.markets = {
            'BTC@BTC/USDT@ETH': tickerWiseMarket,
        };
        const order = exchange.parseOrder ({
            'id': '8',
            'symbol': 'BTC/USDT',
            'side': 'sell',
            'type': 'market',
            'amount': '0.000007',
            'price': '77804.28',
            'status': 'open',
            'created_at': '2025-01-01T00:00:00Z',
        }, tickerWiseMarket as any);
        assert.strictEqual (Number (order['amount']), 0.000007);
    }
    // coinrabbitExpandNetworkBalances: network-nested live API shape
    {
        const exchange = new ccxt.coinrabbit ();
        const expanded = exchange.coinrabbitExpandNetworkBalances ({
            'USDT': { 'ETH': { 'free': '1', 'used': '0', 'total': '1' } },
        });
        const balance = exchange.parseBalance (expanded);
        assert.strictEqual (balance['USDT@ETH']['free'], 1);
        assert.strictEqual (balance['USDT@ETH']['used'], 0);
        assert.strictEqual (balance['USDT@ETH']['total'], 1);
    }
    // coinrabbitExpandNetworkBalances: multi-network yields separate keys
    {
        const exchange = new ccxt.coinrabbit ();
        const expanded = exchange.coinrabbitExpandNetworkBalances ({
            'USDT': {
                'ETH': { 'free': '2', 'used': '0', 'total': '2' },
                'TRX': { 'free': '1', 'used': '0', 'total': '1' },
            },
        });
        const balance = exchange.parseBalance (expanded);
        assert.strictEqual (balance['USDT@ETH']['total'], 2);
        assert.strictEqual (balance['USDT@TRX']['total'], 1);
        assert.strictEqual (balance['USDT'], undefined);
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
    // createOrder: sell maps amount and source via ticker-wise symbol
    {
        const exchange = new ccxt.coinrabbit ();
        exchange.apiKey = 'key';
        exchange.secret = 'secret';
        const tickerWiseMarket = {
            'symbol': 'BTC@BTC/USDT@ETH',
            'id': 'btc:eth:BTC/USDT',
            'precision': { 'amount': 8, 'price': 8 },
            'info': {
                'symbol': 'BTC/USDT',
                'base_network': 'btc',
                'quote_network': 'eth',
            },
        };
        exchange.markets = {
            'BTC@BTC/USDT@ETH': tickerWiseMarket,
        };
        exchange.loadMarkets = async () => exchange.markets;
        let capturedRequest: any = undefined;
        exchange.privatePostTradingOrder = async (request) => {
            capturedRequest = request;
            return { 'result': true, 'response': { 'id': 1, 'symbol': 'BTC/USDT', 'side': 'sell', 'type': 'market', 'amount': '0.1', 'status': 'open' } };
        };
        await exchange.createOrder ('BTC@BTC/USDT@ETH', 'market', 'sell', 0.1);
        assert.strictEqual (capturedRequest['symbol'], 'BTC/USDT');
        assert.strictEqual (capturedRequest['side'], 'sell');
        assert.strictEqual (capturedRequest['type'], 'market');
        assert.strictEqual (capturedRequest['amount'], '0.1');
        assert.strictEqual (capturedRequest['source'], 'octobot');
        assert.strictEqual (capturedRequest['base_network'], 'btc');
        assert.strictEqual (capturedRequest['quote_network'], 'eth');
    }
    // createMarketBuyOrderWithCost: buy market maps quote_amount from cost
    {
        const exchange = new ccxt.coinrabbit ();
        exchange.apiKey = 'key';
        exchange.secret = 'secret';
        const tickerWiseMarket = {
            'symbol': 'BTC@BTC/USDT@ETH',
            'id': 'btc:eth:BTC/USDT',
            'precision': { 'amount': 6, 'price': 2 },
            'info': {
                'symbol': 'BTC/USDT',
                'base_network': 'btc',
                'quote_network': 'eth',
            },
        };
        exchange.markets = {
            'BTC@BTC/USDT@ETH': tickerWiseMarket,
        };
        exchange.loadMarkets = async () => exchange.markets;
        let capturedRequest: any = undefined;
        exchange.privatePostTradingOrder = async (request) => {
            capturedRequest = request;
            return { 'result': true, 'response': { 'id': 1, 'symbol': 'BTC/USDT', 'side': 'buy', 'type': 'market', 'quote_amount': '5', 'status': 'open' } };
        };
        await exchange.createMarketBuyOrderWithCost ('BTC@BTC/USDT@ETH', 5);
        assert.strictEqual (capturedRequest['symbol'], 'BTC/USDT');
        assert.strictEqual (capturedRequest['side'], 'buy');
        assert.strictEqual (capturedRequest['type'], 'market');
        assert.strictEqual (capturedRequest['quote_amount'], '5');
        assert.strictEqual (capturedRequest['amount'], undefined);
        assert.strictEqual (capturedRequest['source'], 'octobot');
        assert.strictEqual (capturedRequest['base_network'], 'btc');
        assert.strictEqual (capturedRequest['quote_network'], 'eth');
    }
    // createOrder: buy limit maps quote_amount from amount * price
    {
        const exchange = new ccxt.coinrabbit ();
        exchange.apiKey = 'key';
        exchange.secret = 'secret';
        const tickerWiseMarket = {
            'symbol': 'BTC@BTC/USDT@ETH',
            'id': 'btc:eth:BTC/USDT',
            'precision': { 'amount': 6, 'price': 2 },
            'info': {
                'symbol': 'BTC/USDT',
                'base_network': 'btc',
                'quote_network': 'eth',
            },
        };
        exchange.markets = {
            'BTC@BTC/USDT@ETH': tickerWiseMarket,
        };
        exchange.loadMarkets = async () => exchange.markets;
        let capturedRequest: any = undefined;
        exchange.privatePostTradingOrder = async (request) => {
            capturedRequest = request;
            return { 'result': true, 'response': { 'id': 1, 'symbol': 'BTC/USDT', 'side': 'buy', 'type': 'limit', 'amount': '0.00008', 'status': 'open' } };
        };
        await exchange.createOrder ('BTC@BTC/USDT@ETH', 'limit', 'buy', 0.00008, 50000);
        assert.strictEqual (capturedRequest['symbol'], 'BTC/USDT');
        assert.strictEqual (capturedRequest['side'], 'buy');
        assert.strictEqual (capturedRequest['type'], 'limit');
        assert.strictEqual (capturedRequest['quote_amount'], '4');
        assert.strictEqual (capturedRequest['price'], '50000');
        assert.strictEqual (capturedRequest['source'], 'octobot');
        assert.strictEqual (capturedRequest['base_network'], 'btc');
        assert.strictEqual (capturedRequest['quote_network'], 'eth');
    }
}

export default testCoinrabbit;
