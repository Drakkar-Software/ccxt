
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObChangenow () {
    {
        const ex = new ccxt.ob_changenow ();
        assertObExchangeId (ex, 'ob_changenow');
        const octobotOptions = ex.options['octobot'];
        assert.strictEqual (octobotOptions['lazyLoadMarkets'], true);
        assert.strictEqual (ex.has['obLoadMarketsForSymbols'], true);
    }
    // parseOrder O1: info.payinAddress -> esov.address_from
    {
        const ex = new ccxt.ob_changenow ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'payinAddress': '3NWnMcW31' }, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov']['address_from'], '3NWnMcW31');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder O2: no payinAddress -> no esov
    {
        const ex = new ccxt.ob_changenow ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov'], undefined);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder O3: missing fee -> synthesized empty fee dict
    {
        const ex = new ccxt.ob_changenow ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'fee': undefined };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.deepStrictEqual (parsed['fee'], { 'cost': 0, 'currency': undefined, 'rate': undefined });
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder O4: extend existing esov with address_from from payinAddress
    {
        const ex = new ccxt.ob_changenow ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'payinAddress': '0xpayin' }, 'esov': { 'other': 1 }, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov']['other'], 1);
            assert.strictEqual (parsed['esov']['address_from'], '0xpayin');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseTicker T1: missing timestamp -> filled with ms + datetime
    {
        const ex = new ccxt.ob_changenow ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () {
            return { 'symbol': 'BTC/ETH', 'timestamp': undefined, 'datetime': undefined, 'info': {} };
        };
        try {
            const parsed: any = ex.parseTicker ({});
            assert.strictEqual (typeof parsed['timestamp'], 'number');
            assert.strictEqual (parsed['datetime'], ex.iso8601 (parsed['timestamp']));
        } finally {
            parentProto.parseTicker = orig;
        }
    }
    // parseTicker T2: explicit timestamp preserved
    {
        const ex = new ccxt.ob_changenow ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () {
            return { 'symbol': 'BTC/ETH', 'timestamp': 1700000000000, 'datetime': ex.iso8601 (1700000000000), 'info': {} };
        };
        try {
            const parsed: any = ex.parseTicker ({});
            assert.strictEqual (parsed['timestamp'], 1700000000000);
            assert.strictEqual (parsed['datetime'], ex.iso8601 (1700000000000));
        } finally {
            parentProto.parseTicker = orig;
        }
    }
    // resolveApiKey K1: ob_changenow defaultAPIKey satisfies credential check without apiKey
    {
        const ex = new ccxt.ob_changenow ();
        ex.apiKey = undefined;
        assert.strictEqual (ex.checkRequiredCredentials (false), true);
        assert.strictEqual (ex.resolveApiKey (), '5f7dc0622f06ed2256261edd51a062c551cb93b799909f02dcaf695c40493c6c');
    }
    // resolveApiKey K2: changenow with no apiKey and empty defaultAPIKey fails credential check
    {
        const ex = new ccxt.changenow ();
        ex.apiKey = undefined;
        assert.strictEqual (ex.checkRequiredCredentials (false), false);
    }
    // resolveApiKey K3: explicit apiKey takes precedence over defaultAPIKey
    {
        const ex = new ccxt.changenow ();
        ex.apiKey = 'user-api-key';
        ex.options['defaultAPIKey'] = 'default-api-key';
        assert.strictEqual (ex.resolveApiKey (), 'user-api-key');
    }
    // resolveApiKey K5: forceDefaultAPIKey ignores explicit apiKey
    {
        const ex = new ccxt.changenow ();
        ex.apiKey = 'user-api-key';
        ex.options['defaultAPIKey'] = 'default-api-key';
        ex.options['forceDefaultAPIKey'] = true;
        assert.strictEqual (ex.resolveApiKey (), 'default-api-key');
    }
    // createOrder C1: address_to / refund_address params map to API address / refundAddress
    {
        const ex = new ccxt.changenow ();
        ex.apiKey = 'test-api-key';
        ex.markets = {
            'BTC/ETH': {
                'symbol': 'BTC/ETH',
                'baseId': 'btc',
                'quoteId': 'eth',
            },
        };
        ex.loadMarkets = async () => ex.markets;
        let capturedRequest: any = undefined;
        const orig = ex.privatePostTransactionsApiKey;
        ex.privatePostTransactionsApiKey = async (request) => {
            capturedRequest = request;
            return { 'id': 'order-id', 'payinAddress': '3NWnMcW31' };
        };
        try {
            await ex.createOrder ('BTC/ETH', 'market', 'sell', 0.01, undefined, {
                'address_to': '0xdest',
                'refund_address': '0xrefund',
            });
            assert.strictEqual (capturedRequest['address'], '0xdest');
            assert.strictEqual (capturedRequest['refundAddress'], '0xrefund');
            assert.strictEqual (capturedRequest['address_to'], undefined);
            assert.strictEqual (capturedRequest['refund_address'], undefined);
        } finally {
            ex.privatePostTransactionsApiKey = orig;
        }
    }
    // createOrder C2: missing address_to throws ArgumentsRequired
    {
        const ex = new ccxt.changenow ();
        ex.apiKey = 'test-api-key';
        ex.markets = {
            'BTC/ETH': {
                'symbol': 'BTC/ETH',
                'baseId': 'btc',
                'quoteId': 'eth',
            },
        };
        ex.loadMarkets = async () => ex.markets;
        let thrown = false;
        try {
            await ex.createOrder ('BTC/ETH', 'market', 'sell', 0.01);
        } catch (error: any) {
            thrown = true;
            assert.match (error.message, /params\.address_to/);
        }
        assert.strictEqual (thrown, true);
    }
    // resolveApiKey K4: fetchOrder sends resolved defaultAPIKey when apiKey is unset
    {
        const ex = new ccxt.ob_changenow ();
        ex.apiKey = undefined;
        let capturedRequest: any = undefined;
        const orig = ex.privateGetTransactionsIdApiKey;
        ex.privateGetTransactionsIdApiKey = async (request) => {
            capturedRequest = request;
            return { 'id': 'order-id', 'status': 'finished' };
        };
        try {
            await ex.fetchOrder ('order-id');
            assert.strictEqual (capturedRequest['apiKey'], '5f7dc0622f06ed2256261edd51a062c551cb93b799909f02dcaf695c40493c6c');
        } finally {
            ex.privateGetTransactionsIdApiKey = orig;
        }
    }
    // fetchMyTrades MT1: symbol maps to from/to and apiKey is resolved
    {
        const ex = new ccxt.changenow ();
        ex.apiKey = 'test-api-key';
        ex.markets = {
            'BTC/ETH': {
                'symbol': 'BTC/ETH',
                'baseId': 'btc',
                'quoteId': 'eth',
            },
        };
        ex.loadMarkets = async () => ex.markets;
        let capturedRequest: any = undefined;
        const orig = ex.privateGetTransactionsApiKey;
        ex.privateGetTransactionsApiKey = async (request) => {
            capturedRequest = request;
            return [];
        };
        try {
            await ex.fetchMyTrades ('BTC/ETH');
            assert.strictEqual (capturedRequest['apiKey'], 'test-api-key');
            assert.strictEqual (capturedRequest['from'], 'btc');
            assert.strictEqual (capturedRequest['to'], 'eth');
        } finally {
            ex.privateGetTransactionsApiKey = orig;
        }
    }
    // fetchMyTrades MT2: parseTrade maps finished transaction fields
    {
        const ex = new ccxt.changenow ();
        const parsed: any = ex.parseTrade ({
            'id': 'tx-id-1',
            'fromCurrency': 'btc',
            'toCurrency': 'eth',
            'amountSend': '0.01',
            'amountReceive': '0.32',
            'networkFee': '0.0005',
            'updatedAt': '2023-01-15T12:34:56.789Z',
            'status': 'finished',
        });
        assert.strictEqual (parsed['id'], 'tx-id-1');
        assert.strictEqual (parsed['order'], 'tx-id-1');
        assert.strictEqual (parsed['symbol'], 'BTC/ETH');
        assert.strictEqual (parsed['side'], 'sell');
        assert.strictEqual (parsed['amount'], 0.01);
        assert.strictEqual (parsed['cost'], 0.32);
        assert.strictEqual (parsed['price'], 32);
        assert.strictEqual (parsed['type'], 'market');
        assert.strictEqual (parsed['timestamp'], ex.parse8601 ('2023-01-15T12:34:56.789Z'));
    }
    // fetchMyTrades MT3: since maps to dateFrom
    {
        const ex = new ccxt.changenow ();
        ex.apiKey = 'test-api-key';
        ex.loadMarkets = async () => ({});
        let capturedRequest: any = undefined;
        const orig = ex.privateGetTransactionsApiKey;
        ex.privateGetTransactionsApiKey = async (request) => {
            capturedRequest = request;
            return [];
        };
        try {
            const since = 1700000000000;
            await ex.fetchMyTrades (undefined, since);
            assert.strictEqual (capturedRequest['dateFrom'], ex.iso8601 (since));
        } finally {
            ex.privateGetTransactionsApiKey = orig;
        }
    }
    // handleErrors E1: out_of_range -> InvalidOrder
    {
        const ex = new ccxt.changenow ();
        const body = '{"error":"out_of_range","message":"Amount is less then minimal: 0.0223925 XMR"}';
        const response = { 'error': 'out_of_range', 'message': 'Amount is less then minimal: 0.0223925 XMR' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, body, response, {}, undefined);
        }, ccxt.InvalidOrder);
    }
    // handleErrors E2: deposit_too_small -> InvalidOrder
    {
        const ex = new ccxt.changenow ();
        const body = '{"error":"deposit_too_small","message":"Deposit amount is less than minimum"}';
        const response = { 'error': 'deposit_too_small', 'message': 'Deposit amount is less than minimum' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, body, response, {}, undefined);
        }, ccxt.InvalidOrder);
    }
    // handleErrors E3: invalid_api_key -> PermissionDenied
    {
        const ex = new ccxt.changenow ();
        const body = '{"error":"invalid_api_key","message":"Use private key for this endpoint"}';
        const response = { 'error': 'invalid_api_key', 'message': 'Use private key for this endpoint' };
        assert.throws (() => {
            ex.handleErrors (403, 'Forbidden', '', 'GET', {}, body, response, {}, undefined);
        }, ccxt.PermissionDenied);
    }
    // lazy markets L1: fetchMarkets returns [] without warming available pairs
    {
        const ex = new ccxt.changenow ();
        let apiCallCount = 0;
        const orig = ex.publicGetMarketInfoAvailablePairs;
        ex.publicGetMarketInfoAvailablePairs = async () => {
            apiCallCount++;
            return [ 'btc_eth', 'eth_btc', 'ltc_btc' ];
        };
        try {
            const markets: any = await ex.fetchMarkets ();
            assert.deepStrictEqual (markets, []);
            assert.strictEqual (apiCallCount, 0);
            assert.deepStrictEqual (ex.safeList (ex.options, 'cachedAvailablePairs', []), []);
            assert.deepStrictEqual (ex.safeList (ex.options, 'availablePairSymbols', []), []);
            await ex.fetchAvailablePairs ();
            assert.strictEqual (apiCallCount, 1);
            assert.deepStrictEqual (ex.options['cachedAvailablePairs'], [ 'btc_eth', 'eth_btc', 'ltc_btc' ]);
            assert.deepStrictEqual (ex.options['availablePairSymbols'], [ 'BTC/ETH', 'ETH/BTC', 'LTC/BTC' ]);
            await ex.fetchAvailablePairs ();
            assert.strictEqual (apiCallCount, 1);
        } finally {
            ex.publicGetMarketInfoAvailablePairs = orig;
        }
    }
    // lazy markets L1b: resolveMarkets builds market without available-pairs fetch
    {
        const ex = new ccxt.changenow ();
        let apiCallCount = 0;
        const orig = ex.publicGetMarketInfoAvailablePairs;
        ex.publicGetMarketInfoAvailablePairs = async () => {
            apiCallCount++;
            return [ 'btc_eth' ];
        };
        ex.markets = {};
        try {
            const resolveResult: any = await ex.resolveMarkets ([ 'BTC/ETH' ]);
            assert.strictEqual (apiCallCount, 0);
            const market = resolveResult['marketsBySymbol']['BTC/ETH'];
            assert.strictEqual (market['id'], 'btc_eth');
            assert.strictEqual (market['symbol'], 'BTC/ETH');
        } finally {
            ex.publicGetMarketInfoAvailablePairs = orig;
        }
    }
    // lazy markets L2: resolveMarkets creates market from cached pair
    {
        const ex = new ccxt.changenow ();
        ex.options['cachedAvailablePairs'] = [ 'btc_eth' ];
        ex.options['cachedAvailablePairsLookup'] = { 'btc_eth': true };
        ex.options['availablePairSymbols'] = [ 'BTC/ETH' ];
        ex.markets = {};
        const resolveResult: any = await ex.resolveMarkets ([ 'BTC/ETH' ]);
        const market = resolveResult['marketsBySymbol']['BTC/ETH'];
        assert.strictEqual (market['id'], 'btc_eth');
        assert.strictEqual (market['symbol'], 'BTC/ETH');
        assert.strictEqual (market['baseId'], 'btc');
        assert.strictEqual (market['quoteId'], 'eth');
        assert.strictEqual (market['spot'], true);
        assert.strictEqual (market['taker'], 0.005);
    }
    // lazy markets L3: unknown symbol throws BadSymbol when pairs cache is warm
    {
        const ex = new ccxt.changenow ();
        ex.options['cachedAvailablePairs'] = [ 'btc_eth' ];
        ex.options['cachedAvailablePairsLookup'] = { 'btc_eth': true };
        ex.markets = {};
        let thrown = false;
        try {
            await ex.resolveMarkets ([ 'DOGE/SHIB' ]);
        } catch (error: any) {
            thrown = true;
            assert (error instanceof ccxt.BadSymbol);
        }
        assert.strictEqual (thrown, true);
    }
    // lazy markets L3b: unknown symbol parses without pairs cache until API validates
    {
        const ex = new ccxt.changenow ();
        ex.markets = {};
        const resolveResult: any = await ex.resolveMarkets ([ 'DOGE/SHIB' ]);
        const market = resolveResult['marketsBySymbol']['DOGE/SHIB'];
        assert.strictEqual (market['id'], 'doge_shib');
        assert.strictEqual (market['symbol'], 'DOGE/SHIB');
    }
    // lazy markets L4: obLoadMarketsForSymbols returns fixed market status
    {
        const ex = new ccxt.ob_changenow ();
        ex.options['cachedAvailablePairs'] = [ 'btc_eth' ];
        ex.options['cachedAvailablePairsLookup'] = { 'btc_eth': true };
        ex.options['availablePairSymbols'] = [ 'BTC/ETH' ];
        ex.markets = {};
        ex.loadMarkets = async () => ex.markets;
        const markets: any = await ex.obLoadMarketsForSymbols ([ 'BTC/ETH' ]);
        assert.strictEqual (markets.length, 1);
        assert.strictEqual (markets[0]['symbol'], 'BTC/ETH');
        assert.strictEqual (markets[0]['id'], 'btc_eth');
        assert.strictEqual (markets[0]['spot'], true);
    }
    // lazy markets L5: obLoadMarketsForSymbols resolves without pre-seeded pairs cache
    {
        const ex = new ccxt.ob_changenow ();
        ex.markets = {};
        ex.loadMarkets = async () => ex.markets;
        const markets: any = await ex.obLoadMarketsForSymbols ([ 'BTC/ETH' ]);
        assert.strictEqual (markets.length, 1);
        assert.strictEqual (markets[0]['symbol'], 'BTC/ETH');
        assert.strictEqual (markets[0]['id'], 'btc_eth');
    }
}

export default testObChangenow;
