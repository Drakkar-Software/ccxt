
import assert from 'assert';
import ccxt from '../../../../ccxt.js';

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const WETH_USDC_ALIAS = WETH.toLowerCase () + '/' + USDC.toLowerCase ();
const WETH_USDT_ALIAS = WETH.toLowerCase () + '/' + USDT.toLowerCase ();
const WETH_USDC_CHECKSUM = WETH + '/' + USDC;

function createExchange () {
    return new ccxt.dexscreener ({
        'options': {
            'chainId': 'ethereum',
            'dexId': 'uniswap',
            'baseTokenAddresses': [ WETH ],
            'quoteTokenAddresses': [ USDC, USDT ],
        },
    });
}

function samplePair (overrides: any = {}) {
    return {
        'chainId': 'ethereum',
        'dexId': 'uniswap',
        'pairAddress': '0x88e6a0c2ddd26feeb8f836aee05b92bbb0cf0e1e',
        'baseToken': {
            'address': WETH,
            'symbol': 'WETH',
        },
        'quoteToken': {
            'address': USDC,
            'symbol': 'USDC',
        },
        'liquidity': {
            'usd': 1000000,
        },
        'priceUsd': '3000',
        'priceNative': '3000',
        'volume': {
            'h24': 32204203.35,
        },
        ...overrides,
    };
}

function loadMarketsFromPairs (exchange: any, pairs: any[]) {
    exchange.setMarkets (exchange.buildMarketsFromPairs (pairs));
}

function stubFetchDiscovery (exchange: any, impl: (params?: any, extraTokenAddresses?: string[]) => Promise<any[]>) {
    const original = exchange.fetchDiscoveryPairs.bind (exchange);
    let callCount = 0;
    exchange.fetchDiscoveryPairs = async function (params = {}, extraTokenAddresses: string[] = []) {
        callCount++;
        return await impl (params, extraTokenAddresses);
    };
    return {
        getCallCount: () => callCount,
        restore: () => {
            exchange.fetchDiscoveryPairs = original;
        },
    };
}

async function testDexscreener () {
    // PT1: parseTicker maps volume.h24 to quoteVolume
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        const market: any = exchange.market ('WETH/USDC');
        const ticker: any = exchange.parseTicker (samplePair (), market);
        assert.strictEqual (String (ticker['quoteVolume']), '32204203.35');
        assert.strictEqual (ticker['baseVolume'], undefined);
    }
    // MR1: unified symbol from preloaded markets (no HTTP)
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        const stub = stubFetchDiscovery (exchange, async () => {
            throw new Error ('fetchDiscoveryPairs should not be called');
        });
        try {
            const market: any = await exchange.resolveMarket ('WETH/USDC');
            assert.strictEqual (market['symbol'], 'WETH/USDC');
            assert.strictEqual (stub.getCallCount (), 0);
        } finally {
            stub.restore ();
        }
    }
    // MR2: address alias already in markets (normalization path)
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        assert.strictEqual (WETH_USDC_ALIAS in exchange.markets, true);
        assert.strictEqual (exchange.symbols.includes ('WETH/USDC'), true);
        assert.strictEqual (exchange.symbols.includes (WETH_USDC_ALIAS), false);
        const stub = stubFetchDiscovery (exchange, async () => {
            throw new Error ('fetchDiscoveryPairs should not be called');
        });
        try {
            const market: any = await exchange.resolveMarket (WETH_USDC_CHECKSUM);
            assert.strictEqual (market['symbol'], 'WETH/USDC');
            assert.strictEqual (stub.getCallCount (), 0);
        } finally {
            stub.restore ();
        }
    }
    // M1: market() unified symbol from preloaded markets (no HTTP)
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        const market: any = exchange.market ('WETH/USDC');
        assert.strictEqual (market['symbol'], 'WETH/USDC');
    }
    // M2: market() checksum address pair resolves to lowercase alias
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        const market: any = exchange.market (WETH_USDC_CHECKSUM);
        assert.strictEqual (market['symbol'], 'WETH/USDC');
    }
    // M3: market() lowercase address alias from preloaded markets
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        const market: any = exchange.market (WETH_USDC_ALIAS);
        assert.strictEqual (market['symbol'], 'WETH/USDC');
    }
    // MR3: token address pair not cached (fetch + merge)
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        const stub = stubFetchDiscovery (exchange, async () => {
            return [ samplePair () ];
        });
        try {
            const market: any = await exchange.resolveMarket (WETH_USDC_ALIAS);
            assert.strictEqual (market['symbol'], 'WETH/USDC');
            assert.strictEqual (stub.getCallCount (), 1);
            assert.strictEqual (WETH_USDC_ALIAS in exchange.markets, true);
            assert.strictEqual ('WETH/USDC' in exchange.markets, true);
        } finally {
            stub.restore ();
        }
    }
    // MR4: unknown unified symbol resolves via configured addresses but no matching pair
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        const stub = stubFetchDiscovery (exchange, async () => {
            return [ samplePair () ];
        });
        let threw = false;
        try {
            try {
                await exchange.resolveMarket ('BTC/USD');
            } catch (error: any) {
                threw = true;
                assert.strictEqual (error.constructor.name, 'BadSymbol');
                assert.strictEqual (error.message.includes ('tokens are not supported'), true);
            }
            assert.strictEqual (threw, true);
            assert.strictEqual (stub.getCallCount (), 1);
        } finally {
            stub.restore ();
        }
    }
    // MR6: resolveMarkets batches token-pairs discovery for multiple address symbols
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        const stub = stubFetchDiscovery (exchange, async () => {
            return [
                samplePair (),
                samplePair ({
                    'quoteToken': {
                        'address': USDT,
                        'symbol': 'USDT',
                    },
                }),
            ];
        });
        try {
            const marketsBySymbol: any = await exchange.resolveMarkets ([ WETH_USDC_ALIAS, WETH_USDT_ALIAS ]);
            assert.strictEqual (stub.getCallCount (), 1);
            assert.strictEqual (marketsBySymbol[WETH_USDC_ALIAS]['symbol'], 'WETH/USDC');
            assert.strictEqual (marketsBySymbol[WETH_USDT_ALIAS]['symbol'], 'WETH/USDT');
        } finally {
            stub.restore ();
        }
    }
    // FD1: fetchDiscoveryPairs uses batched tokens/v1, then token-pairs only for discovery addresses
    {
        const exchange = createExchange ();
        const tokensV1Calls: string[][] = [];
        const tokenPairsCalls: string[][] = [];
        const originalTokensV1 = exchange.fetchPairsForTokensV1Batch.bind (exchange);
        const originalTokenPairs = exchange.fetchPairsForTokenAddressBatch.bind (exchange);
        exchange.fetchPairsForTokensV1Batch = async function (tokenAddresses: string[], params = {}) {
            tokensV1Calls.push (tokenAddresses.slice ());
            return [];
        };
        exchange.fetchPairsForTokenAddressBatch = async function (tokenAddresses: string[], params = {}) {
            tokenPairsCalls.push (tokenAddresses.slice ());
            return [ samplePair () ];
        };
        try {
            await exchange.fetchDiscoveryPairs ();
            assert.strictEqual (tokensV1Calls.length, 1);
            assert.strictEqual (tokensV1Calls[0].length, 3);
            assert.strictEqual (tokenPairsCalls.length, 1);
            assert.strictEqual (tokenPairsCalls[0].length, 1);
            assert.strictEqual (tokenPairsCalls[0][0], WETH);
        } finally {
            exchange.fetchPairsForTokensV1Batch = originalTokensV1;
            exchange.fetchPairsForTokenAddressBatch = originalTokenPairs;
        }
    }
    // FT1: fetchTickersFromTokensV1 always refreshes via batched tokens/v1 (ignores market info)
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair ({ 'priceUsd': '1', 'priceNative': '1' }) ]);
        const marketsBySymbol: any = {
            'WETH/USDC': exchange.market ('WETH/USDC'),
        };
        const batchCalls: string[][] = [];
        const original = exchange.fetchPairsForTokensV1Batch.bind (exchange);
        exchange.fetchPairsForTokensV1Batch = async function (tokenAddresses: string[], params = {}) {
            batchCalls.push (tokenAddresses.slice ());
            return [ samplePair () ];
        };
        try {
            const tickers: any = await exchange.fetchTickersFromTokensV1 ([ 'WETH/USDC' ], marketsBySymbol);
            assert.strictEqual (batchCalls.length, 1);
            assert.strictEqual (batchCalls[0].length, 2);
            assert.strictEqual (tickers['WETH/USDC']['symbol'], 'WETH/USDC');
            assert.strictEqual (String (tickers['WETH/USDC']['last']), '3000');
        } finally {
            exchange.fetchPairsForTokensV1Batch = original;
        }
    }
    // FT2: fetchTickersFromTokensV1 does not use stale prices from market info
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair ({ 'priceUsd': '1', 'priceNative': '1' }) ]);
        const marketsBySymbol: any = {
            'WETH/USDC': exchange.market ('WETH/USDC'),
        };
        const original = exchange.fetchPairsForTokensV1Batch.bind (exchange);
        exchange.fetchPairsForTokensV1Batch = async function (tokenAddresses: string[], params = {}) {
            return [ samplePair ({ 'priceUsd': '3000', 'priceNative': '3000' }) ];
        };
        try {
            const tickers: any = await exchange.fetchTickersFromTokensV1 ([ 'WETH/USDC' ], marketsBySymbol);
            assert.strictEqual (String (tickers['WETH/USDC']['last']), '3000');
        } finally {
            exchange.fetchPairsForTokensV1Batch = original;
        }
    }
    // MB1: fetchPairsForTokenAddresses batches comma-separated token addresses (max 30 per request)
    {
        const exchange = createExchange ();
        const batchCalls: string[][] = [];
        const original = exchange.fetchPairsForTokenAddressBatch.bind (exchange);
        exchange.fetchPairsForTokenAddressBatch = async function (tokenAddresses: string[], params = {}) {
            batchCalls.push (tokenAddresses.slice ());
            return [];
        };
        try {
            const tokenAddresses: string[] = [];
            for (let index = 0; index < 31; index++) {
                tokenAddresses.push ('0x' + index.toString (16).padStart (40, '0'));
            }
            await exchange.fetchPairsForTokenAddresses (tokenAddresses);
            assert.strictEqual (batchCalls.length, 2);
            assert.strictEqual (batchCalls[0].length, 30);
            assert.strictEqual (batchCalls[1].length, 1);
        } finally {
            exchange.fetchPairsForTokenAddressBatch = original;
        }
    }
    // MR5: address pair fetch yields no match
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        const stub = stubFetchDiscovery (exchange, async () => {
            return [];
        });
        let threw = false;
        try {
            try {
                await exchange.resolveMarket (WETH_USDC_ALIAS);
            } catch (error: any) {
                threw = true;
                assert.strictEqual (error.constructor.name, 'BadSymbol');
                assert.strictEqual (error.message.includes ('tokens are not supported'), true);
            }
            assert.strictEqual (threw, true);
            assert.strictEqual (stub.getCallCount (), 1);
        } finally {
            stub.restore ();
        }
    }
}

export default testDexscreener;
