
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObExolix () {
    {
        const ex = new ccxt.ob_exolix ();
        assertObExchangeId (ex, 'ob_exolix');
        const octobotOptions = ex.options['octobot'];
        assert.strictEqual (octobotOptions['lazyLoadMarkets'], true);
        assert.strictEqual (ex.has['obLoadMarketsForSymbols'], true);
    }
    // parseAtNetworkCode S1: TICKER@NETWORK parsing
    {
        const ex = new ccxt.exolix ();
        const parsed: any = ex.parseAtNetworkCode ('btc@btc');
        assert.strictEqual (parsed['ticker'], 'BTC');
        assert.strictEqual (parsed['network'], 'BTC');
        assert.strictEqual (parsed['code'], 'BTC@BTC');
    }
    // parseAtNetworkCode S2: invalid code returns empty dict
    {
        const ex = new ccxt.exolix ();
        const parsed: any = ex.parseAtNetworkCode ('btc');
        assert.deepStrictEqual (parsed, {});
    }
    // buildMarketId S3: lowercase id from parts
    {
        const ex = new ccxt.exolix ();
        const baseParts = { 'ticker': 'XMR', 'network': 'XMR' };
        const quoteParts = { 'ticker': 'BTC', 'network': 'BTC' };
        assert.strictEqual (ex.buildMarketId (baseParts, quoteParts), 'xmr@xmr_btc@btc');
    }
    // parseOrderStatus ST1: wait -> open, success -> closed
    {
        const ex = new ccxt.exolix ();
        assert.strictEqual (ex.parseOrderStatus ('wait'), 'open');
        assert.strictEqual (ex.parseOrderStatus ('success'), 'closed');
        assert.strictEqual (ex.parseOrderStatus ('overdue'), 'expired');
        assert.strictEqual (ex.parseOrderStatus ('refunded'), 'canceled');
    }
    // parseOrder O1: info.depositAddress -> esov.address_from
    {
        const ex = new ccxt.ob_exolix ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'depositAddress': 'bc1qdeposit' }, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov']['address_from'], 'bc1qdeposit');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder O2: no depositAddress -> no esov
    {
        const ex = new ccxt.ob_exolix ();
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
        const ex = new ccxt.ob_exolix ();
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
    // parseTicker T1: missing timestamp -> filled with ms + datetime
    {
        const ex = new ccxt.ob_exolix ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () {
            return { 'symbol': 'BTC@BTC/ETH@ETH', 'timestamp': undefined, 'datetime': undefined, 'info': {} };
        };
        try {
            const parsed: any = ex.parseTicker ({});
            assert.strictEqual (typeof parsed['timestamp'], 'number');
            assert.strictEqual (parsed['datetime'], ex.iso8601 (parsed['timestamp']));
        } finally {
            parentProto.parseTicker = orig;
        }
    }
    // resolveApiKey K1: forceDefaultAPIKey uses defaultAPIKey
    {
        const ex = new ccxt.exolix ();
        ex.apiKey = 'user-key';
        ex.options['defaultAPIKey'] = 'default-key';
        ex.options['forceDefaultAPIKey'] = true;
        assert.strictEqual (ex.resolveApiKey (), 'default-key');
    }
    // resolveApiKey K2: explicit apiKey takes precedence
    {
        const ex = new ccxt.exolix ();
        ex.apiKey = 'user-key';
        ex.options['defaultAPIKey'] = 'default-key';
        assert.strictEqual (ex.resolveApiKey (), 'user-key');
    }
    // createOrder C1: address_to maps to withdrawalAddress
    {
        const ex = new ccxt.exolix ();
        ex.markets = {
            'XMR@XMR/BTC@BTC': {
                'symbol': 'XMR@XMR/BTC@BTC',
                'info': {
                    'coinFrom': 'XMR',
                    'networkFrom': 'XMR',
                    'coinTo': 'BTC',
                    'networkTo': 'BTC',
                },
            },
        };
        ex.loadMarkets = async () => ex.markets;
        let capturedRequest: any = undefined;
        const origResolve = ex.resolveMarkets;
        ex.resolveMarkets = async () => ({
            'marketsBySymbol': { 'XMR@XMR/BTC@BTC': ex.markets['XMR@XMR/BTC@BTC'] },
        });
        const origPost = ex.publicPostTransactions;
        ex.publicPostTransactions = async (request) => {
            capturedRequest = request;
            return { 'id': 'tx-id', 'status': 'wait', 'depositAddress': 'addr' };
        };
        try {
            await ex.createOrder ('XMR@XMR/BTC@BTC', 'market', 'sell', 0.1, undefined, {
                'address_to': 'bc1qdest',
                'refund_address': 'bc1qrefund',
            });
            assert.strictEqual (capturedRequest['withdrawalAddress'], 'bc1qdest');
            assert.strictEqual (capturedRequest['refundAddress'], 'bc1qrefund');
            assert.strictEqual (capturedRequest['coinFrom'], 'XMR');
            assert.strictEqual (capturedRequest['networkFrom'], 'XMR');
            assert.strictEqual (capturedRequest['rateType'], 'float');
            assert.strictEqual (capturedRequest['address_to'], undefined);
        } finally {
            ex.resolveMarkets = origResolve;
            ex.publicPostTransactions = origPost;
        }
    }
    // createOrder C2: missing address_to throws ArgumentsRequired
    {
        const ex = new ccxt.exolix ();
        ex.markets = {
            'XMR@XMR/BTC@BTC': {
                'symbol': 'XMR@XMR/BTC@BTC',
                'info': { 'coinFrom': 'XMR', 'networkFrom': 'XMR', 'coinTo': 'BTC', 'networkTo': 'BTC' },
            },
        };
        ex.loadMarkets = async () => ex.markets;
        ex.resolveMarkets = async () => ({
            'marketsBySymbol': { 'XMR@XMR/BTC@BTC': ex.markets['XMR@XMR/BTC@BTC'] },
        });
        let thrown = false;
        try {
            await ex.createOrder ('XMR@XMR/BTC@BTC', 'market', 'sell', 0.1);
        } catch (error: any) {
            thrown = true;
            assert.match (error.message, /params\.address_to/);
        }
        assert.strictEqual (thrown, true);
    }
    // handleErrors E1: pair not available -> BadSymbol
    {
        const ex = new ccxt.exolix ();
        const body = '{"error":"Such exchange pair is not available"}';
        const response = { 'error': 'Such exchange pair is not available' };
        assert.throws (() => {
            ex.handleErrors (422, 'Unprocessable Entity', '', 'GET', {}, body, response, {}, undefined);
        }, ccxt.BadSymbol);
    }
    // handleErrors E2: min amount -> InvalidOrder
    {
        const ex = new ccxt.exolix ();
        const body = '{"error":"Amount is less than minimum"}';
        const response = { 'error': 'Amount is less than minimum' };
        assert.throws (() => {
            ex.handleErrors (422, 'Unprocessable Entity', '', 'GET', {}, body, response, {}, undefined);
        }, ccxt.InvalidOrder);
    }
    // handleErrors E3: 404 transaction -> OrderNotFound
    {
        const ex = new ccxt.exolix ();
        assert.throws (() => {
            ex.handleErrors (404, 'Not Found', 'https://exolix.com/api/v2/transactions/abc', 'GET', {}, '', undefined, {}, undefined);
        }, ccxt.OrderNotFound);
    }
    // lazy markets L1: fetchMarkets returns [] without API calls
    {
        const ex = new ccxt.exolix ();
        let apiCallCount = 0;
        const orig = ex.publicGetRate;
        ex.publicGetRate = async () => {
            apiCallCount++;
            return { 'toAmount': 1, 'minAmount': 0.01, 'maxAmount': 100 };
        };
        try {
            const markets: any = await ex.fetchMarkets ();
            assert.deepStrictEqual (markets, []);
            assert.strictEqual (apiCallCount, 0);
        } finally {
            ex.publicGetRate = orig;
        }
    }
    // lazy markets L2: resolveMarkets probes rate and registers market
    {
        const ex = new ccxt.exolix ();
        ex.options['defaultNetworks'] = { 'XMR': 'XMR', 'BTC': 'BTC' };
        let apiCallCount = 0;
        const orig = ex.publicGetRate;
        ex.publicGetRate = async (request) => {
            apiCallCount++;
            assert.strictEqual (request['coinFrom'], 'XMR');
            assert.strictEqual (request['networkFrom'], 'XMR');
            assert.strictEqual (request['coinTo'], 'BTC');
            assert.strictEqual (request['networkTo'], 'BTC');
            return { 'toAmount': 0.003, 'minAmount': 0.01, 'maxAmount': 100 };
        };
        ex.markets = {};
        try {
            const resolveResult: any = await ex.resolveMarkets ([ 'XMR@XMR/BTC@BTC' ]);
            assert.strictEqual (apiCallCount, 1);
            const market = resolveResult['marketsBySymbol']['XMR@XMR/BTC@BTC'];
            assert.strictEqual (market['symbol'], 'XMR@XMR/BTC@BTC');
            assert.strictEqual (market['info']['coinFrom'], 'XMR');
            assert.strictEqual (market['limits']['amount']['min'], 0.01);
        } finally {
            ex.publicGetRate = orig;
        }
    }
    // lazy markets L3: rate probe BadSymbol on unavailable pair
    {
        const ex = new ccxt.exolix ();
        ex.options['defaultNetworks'] = { 'LLD': 'LIBERLAND', 'ETH': 'ETH' };
        const orig = ex.publicGetRate;
        ex.publicGetRate = async () => {
            throw new ccxt.BadSymbol (ex.id + ' Such exchange pair is not available');
        };
        ex.markets = {};
        let thrown = false;
        try {
            await ex.resolveMarkets ([ 'LLD@LIBERLAND/ETH@ETH' ]);
        } catch (error: any) {
            thrown = true;
            assert (error instanceof ccxt.BadSymbol);
        } finally {
            ex.publicGetRate = orig;
        }
        assert.strictEqual (thrown, true);
    }
    // lazy markets L4: obLoadMarketsForSymbols returns fixed market status
    {
        const ex = new ccxt.ob_exolix ();
        ex.options['defaultNetworks'] = { 'XMR': 'XMR', 'BTC': 'BTC' };
        ex.markets = {};
        ex.loadMarkets = async () => ex.markets;
        const orig = ex.publicGetRate;
        ex.publicGetRate = async () => ({ 'toAmount': 0.003, 'minAmount': 0.01, 'maxAmount': 100 });
        try {
            const markets: any = await ex.obLoadMarketsForSymbols ([ 'XMR@XMR/BTC@BTC' ]);
            assert.strictEqual (markets.length, 1);
            assert.strictEqual (markets[0]['symbol'], 'XMR@XMR/BTC@BTC');
            assert.strictEqual (markets[0]['spot'], true);
        } finally {
            ex.publicGetRate = orig;
        }
    }
    // parseOrder P1: coinFrom/coinTo objects build symbol
    {
        const ex = new ccxt.exolix ();
        const order = {
            'id': 'tx-1',
            'status': 'wait',
            'amount': 1,
            'amountTo': 0.003,
            'createdAt': '2022-06-02T05:56:59.719Z',
            'coinFrom': { 'coinCode': 'XMR', 'network': 'XMR' },
            'coinTo': { 'coinCode': 'BTC', 'network': 'BTC' },
        };
        const parsed: any = ex.parseOrder (order);
        assert.strictEqual (parsed['symbol'], 'XMR@XMR/BTC@BTC');
        assert.strictEqual (parsed['status'], 'open');
        assert.strictEqual (parsed['amount'], 1);
        assert.strictEqual (parsed['price'], 0.003);
    }
}

export default testObExolix;
