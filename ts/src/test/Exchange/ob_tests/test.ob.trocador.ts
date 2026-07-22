
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObTrocador () {
    {
        const ex = new ccxt.ob_trocador ();
        assertObExchangeId (ex, 'ob_trocador');
        assert.strictEqual (ex.userAgent, 'Dart/3.5 (dart:io)');
        const octobotOptions = ex.options['octobot'];
        assert.strictEqual (octobotOptions['lazyLoadMarkets'], true);
        assert.strictEqual (ex.has['obLoadMarketsForSymbols'], true);
        assert.strictEqual (ex.has['obGetExchangeTradingProviders'], true);
    }
    // parseSymbolPart S1: valid TICKER@NETWORK
    {
        const ex = new ccxt.trocador ();
        const parsed: any = ex.parseSymbolPart ('BTC@Mainnet');
        assert.strictEqual (parsed['ticker'], 'btc');
        assert.strictEqual (parsed['network'], 'Mainnet');
        assert.strictEqual (parsed['code'], 'BTC');
    }
    // parseSymbolPart S2: missing @ throws BadSymbol
    {
        const ex = new ccxt.trocador ();
        let thrown = false;
        try {
            ex.parseSymbolPart ('BTC');
        } catch (error: any) {
            thrown = true;
            assert (error instanceof ccxt.BadSymbol);
        }
        assert.strictEqual (thrown, true);
    }
    // parseMarketSymbol S3: unified swap symbol parsing
    {
        const ex = new ccxt.trocador ();
        const parsed: any = ex.parseMarketSymbol ('BTC@Mainnet/XMR@Mainnet');
        assert.strictEqual (parsed['tickerFrom'], 'btc');
        assert.strictEqual (parsed['networkFrom'], 'Mainnet');
        assert.strictEqual (parsed['tickerTo'], 'xmr');
        assert.strictEqual (parsed['networkTo'], 'Mainnet');
        assert.strictEqual (parsed['unifiedSymbol'], 'BTC@Mainnet/XMR@Mainnet');
    }
    // parseOrder O1: info.address_provider -> esov.address_from
    {
        const ex = new ccxt.ob_trocador ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'address_provider': 'bc1qprovider' }, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov']['address_from'], 'bc1qprovider');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder O2: missing fee -> synthesized empty fee dict
    {
        const ex = new ccxt.ob_trocador ();
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
        const ex = new ccxt.ob_trocador ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () {
            return { 'symbol': 'BTC@Mainnet/XMR@Mainnet', 'timestamp': undefined, 'datetime': undefined, 'info': {} };
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
        const ex = new ccxt.trocador ();
        ex.apiKey = 'user-api-key';
        ex.options['defaultAPIKey'] = 'default-api-key';
        ex.options['forceDefaultAPIKey'] = true;
        assert.strictEqual (ex.resolveApiKey (), 'default-api-key');
    }
    // sign H1: API-Key header is injected
    {
        const ex = new ccxt.trocador ();
        ex.apiKey = 'test-api-key';
        const signed: any = ex.sign ('new_rate', 'public', 'GET', { 'ticker_from': 'btc' });
        assert.strictEqual (signed['headers']['API-Key'], 'test-api-key');
        assert (signed['url'].indexOf ('new_rate') >= 0);
    }
    // createOrder C1: maps address_to and cached quote fields to new_trade request
    {
        const ex = new ccxt.trocador ();
        ex.apiKey = 'test-api-key';
        ex.options['cachedRateBySymbol'] = {
            'BTC@Mainnet/XMR@Mainnet': {
                'trade_id': 'rate-123',
                'provider': 'changenow',
                'fixed': false,
                'amount_to': '1.5',
            },
        };
        ex.markets = {
            'BTC@Mainnet/XMR@Mainnet': ex.parseMarketFromSymbol ('BTC@Mainnet/XMR@Mainnet'),
        };
        ex.loadMarkets = async () => ex.markets;
        let capturedRequest: any = undefined;
        const orig = ex.publicPostNewTrade;
        ex.publicPostNewTrade = async (request) => {
            capturedRequest = request;
            return {
                'trade_id': 'trade-456',
                'status': 'waiting',
                'address_provider': 'bc1qprovider',
                'ticker_from': 'btc',
                'ticker_to': 'xmr',
                'network_from': 'Mainnet',
                'network_to': 'Mainnet',
                'amount_from': '0.01',
                'amount_to': '1.5',
                'fixed': false,
            };
        };
        try {
            await ex.createOrder ('BTC@Mainnet/XMR@Mainnet', 'market', 'sell', 0.01, undefined, {
                'address_to': '4AbC',
            });
            assert.strictEqual (capturedRequest['address'], '4AbC');
            assert.strictEqual (capturedRequest['provider'], 'changenow');
            assert.strictEqual (capturedRequest['fixed'], false);
            assert.strictEqual (capturedRequest['id'], 'rate-123');
            assert.strictEqual (capturedRequest['address_memo'], '0');
        } finally {
            ex.publicPostNewTrade = orig;
        }
    }
    // createOrder C2: missing address_to throws ArgumentsRequired
    {
        const ex = new ccxt.trocador ();
        ex.apiKey = 'test-api-key';
        ex.markets = {
            'BTC@Mainnet/XMR@Mainnet': ex.parseMarketFromSymbol ('BTC@Mainnet/XMR@Mainnet'),
        };
        ex.loadMarkets = async () => ex.markets;
        let thrown = false;
        try {
            await ex.createOrder ('BTC@Mainnet/XMR@Mainnet', 'market', 'sell', 0.01);
        } catch (error: any) {
            thrown = true;
            assert.match (error.message, /params\.address_to/);
        }
        assert.strictEqual (thrown, true);
    }
    // lazy markets L1: fetchMarkets returns []
    {
        const ex = new ccxt.trocador ();
        ex.apiKey = 'test-api-key';
        let apiCallCount = 0;
        const orig = ex.publicGetNewRate;
        ex.publicGetNewRate = async () => {
            apiCallCount++;
            return { 'amount_to': '1.5', 'trade_id': 'rate-1', 'provider': 'fixedfloat', 'fixed': false };
        };
        try {
            const markets: any = await ex.fetchMarkets ();
            assert.deepStrictEqual (markets, []);
            assert.strictEqual (apiCallCount, 0);
        } finally {
            ex.publicGetNewRate = orig;
        }
    }
    // lazy markets L2: resolveMarkets probes pair via new_rate
    {
        const ex = new ccxt.trocador ();
        ex.apiKey = 'test-api-key';
        ex.markets = {};
        let capturedRequest: any = undefined;
        const orig = ex.publicGetNewRate;
        ex.publicGetNewRate = async (request) => {
            capturedRequest = request;
            return { 'amount_to': '1.5', 'trade_id': 'rate-1', 'provider': 'fixedfloat', 'fixed': false };
        };
        try {
            const resolveResult: any = await ex.resolveMarkets ([ 'BTC@Mainnet/XMR@Mainnet' ]);
            const market = resolveResult['marketsBySymbol']['BTC@Mainnet/XMR@Mainnet'];
            assert.strictEqual (capturedRequest['ticker_from'], 'btc');
            assert.strictEqual (capturedRequest['network_from'], 'Mainnet');
            assert.strictEqual (capturedRequest['ticker_to'], 'xmr');
            assert.strictEqual (capturedRequest['network_to'], 'Mainnet');
            assert.strictEqual (capturedRequest['best_only'], true);
            assert.strictEqual (market['symbol'], 'BTC@Mainnet/XMR@Mainnet');
        } finally {
            ex.publicGetNewRate = orig;
        }
    }
    // lazy markets L3: missing amount_to from new_rate throws BadSymbol
    {
        const ex = new ccxt.trocador ();
        ex.apiKey = 'test-api-key';
        ex.markets = {};
        const orig = ex.publicGetNewRate;
        ex.publicGetNewRate = async () => ({});
        let thrown = false;
        try {
            await ex.resolveMarkets ([ 'BTC@Mainnet/XMR@Mainnet' ]);
        } catch (error: any) {
            thrown = true;
            assert (error instanceof ccxt.BadSymbol);
        } finally {
            ex.publicGetNewRate = orig;
        }
        assert.strictEqual (thrown, true);
    }
    // lazy markets L4: obLoadMarketsForSymbols returns fixed market status
    {
        const ex = new ccxt.ob_trocador ();
        ex.apiKey = 'test-api-key';
        ex.markets = {};
        ex.loadMarkets = async () => ex.markets;
        const orig = ex.publicGetNewRate;
        ex.publicGetNewRate = async () => ({ 'amount_to': '1.5', 'trade_id': 'rate-1', 'provider': 'fixedfloat', 'fixed': false });
        try {
            const markets: any = await ex.obLoadMarketsForSymbols ([ 'BTC@Mainnet/XMR@Mainnet' ]);
            assert.strictEqual (markets.length, 1);
            assert.strictEqual (markets[0]['symbol'], 'BTC@Mainnet/XMR@Mainnet');
            assert.strictEqual (markets[0]['spot'], true);
        } finally {
            ex.publicGetNewRate = orig;
        }
    }
    // fetchOrder F1: missing status throws OrderNotFound
    {
        const ex = new ccxt.trocador ();
        ex.apiKey = 'test-api-key';
        const orig = ex.publicGetTrade;
        ex.publicGetTrade = async () => ({ 'trade_id': 'missing-status' });
        let thrown = false;
        try {
            await ex.fetchOrder ('missing-status');
        } catch (error: any) {
            thrown = true;
            assert (error instanceof ccxt.OrderNotFound);
        } finally {
            ex.publicGetTrade = orig;
        }
        assert.strictEqual (thrown, true);
    }
    // fetchOrder F2: full trade response parses to open order
    {
        const ex = new ccxt.trocador ();
        ex.apiKey = 'test-api-key';
        const orig = ex.publicGetTrade;
        ex.publicGetTrade = async () => ({
            'trade_id': 'trade-456',
            'status': 'waiting',
            'ticker_from': 'btc',
            'ticker_to': 'xmr',
            'network_from': 'Mainnet',
            'network_to': 'Mainnet',
            'amount_from': '0.01',
            'amount_to': '1.5',
            'date': '2026-07-18T21:12:40.149837Z',
        });
        try {
            const fetched: any = await ex.fetchOrder ('trade-456');
            assert.strictEqual (fetched['id'], 'trade-456');
            assert.strictEqual (fetched['symbol'], 'BTC@Mainnet/XMR@Mainnet');
            assert.strictEqual (fetched['status'], 'open');
        } finally {
            ex.publicGetTrade = orig;
        }
    }
    // obGetExchangeTradingProviders E1: delegates to publicGetExchanges
    {
        const ex = new ccxt.ob_trocador ();
        ex.apiKey = 'test-api-key';
        const orig = ex.publicGetExchanges;
        let called = false;
        ex.publicGetExchanges = async (params = {}) => {
            called = true;
            return { 'list': [ { 'name': 'Exolix', 'rating': 'A' } ] };
        };
        try {
            const response: any = await ex.obGetExchangeTradingProviders ();
            assert.strictEqual (called, true);
            assert.strictEqual (response['list'][0]['name'], 'Exolix');
        } finally {
            ex.publicGetExchanges = orig;
        }
    }
}

export default testObTrocador;
