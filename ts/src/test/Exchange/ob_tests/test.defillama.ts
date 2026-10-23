
import assert from 'assert';
import ccxt from '../../../../ccxt.js';

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const NETWORK_SUFFIX = '@ETH!*';
const NETWORK_SUFFIX_NO_DEX = '@ETH';
const WETH_USDC_ADDR = WETH.toLowerCase () + '/' + USDC.toLowerCase () + NETWORK_SUFFIX;
const WETH_USDC_NO_DEX = WETH.toLowerCase () + '/' + USDC.toLowerCase () + NETWORK_SUFFIX_NO_DEX;
const WETH_USDT_ADDR = WETH.toLowerCase () + '/' + USDT.toLowerCase () + NETWORK_SUFFIX;
const WETH_USDC_UNISWAP = WETH.toLowerCase () + '/' + USDC.toLowerCase () + '@ETH!UNISWAP';

function createExchange () {
    return new ccxt.defillama ();
}

function sampleCoinsResponse () {
    return {
        'coins': {
            ['ethereum:' + WETH.toLowerCase ()]: {
                'decimals': 18,
                'symbol': 'WETH',
                'price': 2000,
                'timestamp': 1781423945,
                'confidence': 0.99,
            },
            ['ethereum:' + USDT.toLowerCase ()]: {
                'decimals': 6,
                'symbol': 'USDT',
                'price': 1,
                'timestamp': 1781426524,
                'confidence': 0.99,
            },
            ['ethereum:' + USDC.toLowerCase ()]: {
                'decimals': 6,
                'symbol': 'USDC',
                'price': 1,
                'timestamp': 1781426524,
                'confidence': 0.99,
            },
        },
    };
}

async function testDefillama () {
    // NM1: network code mapping
    {
        const exchange = createExchange ();
        assert.strictEqual (exchange.networkCodeToId ('ETH'), 'ethereum');
        assert.strictEqual (exchange.networkCodeToId ('BASE'), 'base');
        assert.strictEqual (exchange.networkIdToCode ('ethereum'), 'ETH');
        assert.strictEqual (exchange.networkIdToCode ('base'), 'BASE');
    }
    // DX1: non-wildcard dex raises NotSupported
    {
        const exchange = createExchange ();
        assert.throws (
            () => exchange.obParseDexPairSymbolInput (WETH_USDC_UNISWAP),
            (error: any) => error instanceof ccxt.NotSupported
        );
    }
    // DX2: missing @network raises BadSymbol
    {
        const exchange = createExchange ();
        assert.throws (
            () => exchange.obParseDexPairSymbolInput ('WETH/USDC'),
            (error: any) => error instanceof ccxt.BadSymbol
        );
    }
    // SY1: @network without !dex leaves dexCode unset; effective dex is wildcard
    {
        const exchange = createExchange ();
        const parsed: any = exchange.obParseDexPairSymbolInput (WETH_USDC_NO_DEX);
        assert.strictEqual (parsed['dexCode'], undefined);
        assert.strictEqual (parsed['networkCode'], 'ETH');
        assert.strictEqual (exchange.getEffectiveDexCode (parsed['dexCode']), '*');
    }
    // CP1: computePairPrice
    {
        const exchange = createExchange ();
        assert.strictEqual (exchange.computePairPrice (2000, 1), 2000);
    }
    // PP1: parseCoinPrices
    {
        const exchange = createExchange ();
        const coins: any = exchange.parseCoinPrices (sampleCoinsResponse ());
        assert.strictEqual (Object.keys (coins).length, 3);
    }
    // MR1: resolveMarket builds synthetic market (no HTTP)
    {
        const exchange = createExchange ();
        exchange.publicGetPricesCurrentCoins = async () => {
            throw new Error ('prices should not be called during resolveMarket');
        };
        const market: any = await exchange.resolveMarket (WETH_USDC_ADDR);
        assert.strictEqual (market['baseId'], WETH.toLowerCase ());
        assert.strictEqual (market['quoteId'], USDC.toLowerCase ());
        assert.strictEqual (market['symbol'], WETH_USDC_ADDR);
    }
    // MR2: resolveMarket accepts @network without !dex
    {
        const exchange = createExchange ();
        exchange.publicGetPricesCurrentCoins = async () => {
            throw new Error ('prices should not be called during resolveMarket');
        };
        const market: any = await exchange.resolveMarket (WETH_USDC_NO_DEX);
        assert.strictEqual (market['baseId'], WETH.toLowerCase ());
        assert.strictEqual (market['quoteId'], USDC.toLowerCase ());
        assert.strictEqual (market['symbol'], WETH_USDC_NO_DEX);
    }
    // FT1: fetchTicker computes last from USD prices
    {
        const exchange = createExchange ();
        exchange.publicGetPricesCurrentCoins = async (params: any) => {
            assert.ok (params['coins'].indexOf ('ethereum:' + WETH.toLowerCase ()) >= 0);
            assert.ok (params['coins'].indexOf ('ethereum:' + USDT.toLowerCase ()) >= 0);
            return sampleCoinsResponse ();
        };
        const ticker: any = await exchange.fetchTicker (WETH_USDT_ADDR);
        assert.strictEqual (ticker['symbol'], WETH_USDT_ADDR);
        assert.strictEqual (parseFloat (ticker['last']), 2000);
        assert.strictEqual (ticker['baseVolume'], undefined);
        assert.strictEqual (ticker['quoteVolume'], undefined);
    }
    // FT4: fetchTicker preserves @network!* input symbol
    {
        const exchange = createExchange ();
        exchange.publicGetPricesCurrentCoins = async () => sampleCoinsResponse ();
        const ticker: any = await exchange.fetchTicker (WETH_USDC_ADDR);
        assert.strictEqual (ticker['symbol'], WETH_USDC_ADDR);
        assert.strictEqual (parseFloat (ticker['last']), 2000);
    }
    // FT3: fetchTicker preserves @network-only input symbol
    {
        const exchange = createExchange ();
        exchange.publicGetPricesCurrentCoins = async () => sampleCoinsResponse ();
        const ticker: any = await exchange.fetchTicker (WETH_USDC_NO_DEX);
        assert.strictEqual (ticker['symbol'], WETH_USDC_NO_DEX);
        assert.strictEqual (parseFloat (ticker['last']), 2000);
    }
    // FTS1: fetchTickers batches one request
    {
        const exchange = createExchange ();
        let requestCount = 0;
        exchange.publicGetPricesCurrentCoins = async () => {
            requestCount = requestCount + 1;
            return sampleCoinsResponse ();
        };
        const tickers: any = await exchange.fetchTickers ([ WETH_USDC_ADDR, WETH_USDT_ADDR ]);
        assert.strictEqual (requestCount, 1);
        assert.strictEqual (parseFloat (tickers[WETH_USDC_ADDR]['last']), 2000);
        assert.strictEqual (parseFloat (tickers[WETH_USDT_ADDR]['last']), 2000);
    }
    // DP1: obFetchDexPairs returns wildcard dex venue
    {
        const exchange = createExchange ();
        exchange.publicGetPricesCurrentCoins = async () => sampleCoinsResponse ();
        const dexPairs: any = await exchange.obFetchDexPairs ([ WETH_USDC_ADDR, WETH_USDT_ADDR ]);
        assert.strictEqual (dexPairs.length, 2);
        const symbols = dexPairs.map ((dexPair: any) => dexPair['symbol']).sort ();
        assert.deepStrictEqual (symbols, [ 'WETH/USDC', 'WETH/USDT' ]);
        assert.strictEqual (dexPairs[0]['dex'], '*');
        assert.strictEqual (dexPairs[0]['network'], 'ETH');
        assert.strictEqual (dexPairs[0]['quoteLiquidity'], 1);
    }
    // DP2: obFetchDexPairs accepts @network-only input
    {
        const exchange = createExchange ();
        exchange.publicGetPricesCurrentCoins = async () => sampleCoinsResponse ();
        const dexPairs: any = await exchange.obFetchDexPairs ([ WETH_USDC_NO_DEX ]);
        assert.strictEqual (dexPairs.length, 1);
        assert.strictEqual (dexPairs[0]['symbol'], 'WETH/USDC');
        assert.strictEqual (dexPairs[0]['dex'], '*');
        assert.strictEqual (dexPairs[0]['network'], 'ETH');
    }
}

export default testDefillama;
