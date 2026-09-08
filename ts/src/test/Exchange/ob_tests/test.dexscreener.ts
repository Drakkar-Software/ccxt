
import assert from 'assert';
import ccxt from '../../../../ccxt.js';

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const UNI = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
const NETWORK_SUFFIX = '@ETH!UNISWAP';
const WETH_USDC = 'WETH/USDC' + NETWORK_SUFFIX;
const WETH_USDT = 'WETH/USDT' + NETWORK_SUFFIX;
const WETH_USDT_WILDCARD = WETH.toLowerCase () + '/' + USDT.toLowerCase () + '@ETH!*';
const WETH_USDC_ALIAS = WETH.toLowerCase () + '/' + USDC.toLowerCase () + NETWORK_SUFFIX;
const WETH_USDC_CHECKSUM = WETH + '/' + USDC + NETWORK_SUFFIX;

function createExchange () {
    return new ccxt.dexscreener ();
}

function createObExchange () {
    return new ccxt.ob_dexscreener ();
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
    const markets = [];
    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
        markets.push (exchange.parseMarket (pairs[pairIndex]));
    }
    exchange.setMarkets (markets);
}

async function testDexscreener () {
    // PT1: parseTicker maps volume.h24 to quoteVolume
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        const market: any = exchange.market (WETH_USDC);
        const ticker: any = exchange.parseTicker (samplePair (), market);
        assert.strictEqual (String (ticker['quoteVolume']), '32204203.35');
        assert.strictEqual (ticker['baseVolume'], undefined);
    }
    // OB1: obParseNetworkDexSymbol parses suffix
    {
        const exchange = createExchange ();
        const parsed: any = exchange.obParseNetworkDexSymbol (WETH_USDC);
        assert.strictEqual (parsed['tradingSymbol'], 'WETH/USDC');
        assert.strictEqual (parsed['networkCode'], 'ETH');
        assert.strictEqual (parsed['dexCode'], 'UNISWAP');
    }
    // OB1b: network code mapping
    {
        const exchange = createExchange ();
        assert.strictEqual (exchange.networkCodeToId ('BEP20'), 'bsc');
        assert.strictEqual (exchange.networkIdToCode ('bsc'), 'BEP20');
        assert.strictEqual (exchange.networkCodeToId ('ERC20'), 'ethereum');
        assert.strictEqual (exchange.networkIdToCode ('ethereum'), 'ETH');
        assert.strictEqual (exchange.networkCodeToId ('TRC20'), 'tron');
        assert.strictEqual (exchange.networkIdToCode ('tron'), 'TRX');
    }
    // OB2: obDexCodeToId and obDexIdToCode round-trip
    {
        const exchange = createExchange ();
        assert.strictEqual (exchange.obDexCodeToId ('UNISWAP'), 'uniswap');
        assert.strictEqual (exchange.obDexIdToCode ('uniswap'), 'UNISWAP');
    }
    // PM1: parseMarket id includes unified network and dex
    {
        const exchange = createExchange ();
        const market: any = exchange.parseMarket (samplePair ());
        assert.strictEqual (market['symbol'], WETH_USDC);
        assert.strictEqual (market['id'], 'ETH:UNISWAP:ethereum:0x88e6a0c2ddd26feeb8f836aee05b92bbb0cf0e1e');
        const parsedId: any = exchange.parseMarketId (market['id']);
        assert.strictEqual (parsedId['networkCode'], 'ETH');
        assert.strictEqual (parsedId['dexCode'], 'UNISWAP');
        assert.strictEqual (parsedId['chainId'], 'ethereum');
    }
    // MR1: unified symbol from preloaded markets (no HTTP)
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        const searchStub = async () => {
            throw new Error ('search should not be called');
        };
        exchange.publicGetLatestDexSearch = searchStub;
        const market: any = await exchange.resolveMarket (WETH_USDC);
        assert.strictEqual (market['symbol'], WETH_USDC);
    }
    // MR2: address alias already in markets (normalization path)
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        assert.strictEqual (WETH_USDC_ALIAS in exchange.markets, true);
        assert.strictEqual (exchange.symbols.includes (WETH_USDC), true);
        assert.strictEqual (exchange.symbols.includes (WETH_USDC_ALIAS), false);
        exchange.publicGetLatestDexSearch = async () => {
            throw new Error ('search should not be called');
        };
        const market: any = await exchange.resolveMarket (WETH_USDC_CHECKSUM);
        assert.strictEqual (market['symbol'], WETH_USDC);
    }
    // M1: market() unified symbol from preloaded markets (no HTTP)
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        const market: any = exchange.market (WETH_USDC);
        assert.strictEqual (market['symbol'], WETH_USDC);
    }
    // M2: market() checksum address pair resolves to lowercase alias
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [ samplePair () ]);
        const market: any = exchange.market (WETH_USDC_CHECKSUM);
        assert.strictEqual (market['symbol'], WETH_USDC);
    }
    // FM1: fetchMarketsForSymbol filters irrelevant search results
    {
        const exchange = createExchange ();
        exchange.publicGetLatestDexSearch = async () => {
            return {
                'pairs': [
                    samplePair (),
                    samplePair ({
                        'baseToken': { 'address': WETH, 'symbol': 'WETH' },
                        'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                    }),
                    samplePair ({
                        'baseToken': { 'address': WETH, 'symbol': 'BTC' },
                        'quoteToken': { 'address': USDC, 'symbol': 'USDC' },
                    }),
                ],
            };
        };
        const markets: any = await exchange.fetchMarketsForSymbol ('WETH/USDC');
        assert.strictEqual (markets.length, 1);
        assert.strictEqual (markets[0]['symbol'], WETH_USDC);
    }
    // FM2: fetchMarketsForSymbol supports token address pairs
    {
        const exchange = createExchange ();
        exchange.publicGetLatestDexSearch = async (params) => {
            assert.strictEqual (params['q'], WETH.toLowerCase () + '/' + USDC.toLowerCase ());
            return {
                'pairs': [
                    samplePair ({
                        'baseToken': { 'address': WETH, 'symbol': 'WETH' },
                        'quoteToken': { 'address': USDC, 'symbol': 'USDC' },
                    }),
                    samplePair ({
                        'baseToken': { 'address': WETH, 'symbol': 'WETH' },
                        'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                    }),
                ],
            };
        };
        const markets: any = await exchange.fetchMarketsForSymbol (WETH + '/' + USDC);
        assert.strictEqual (markets.length, 1);
        assert.strictEqual (markets[0]['baseId'], WETH);
        assert.strictEqual (markets[0]['quoteId'], USDC);
    }
    // MR3: token address pair not cached (tokens/v1 batch + merge)
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        exchange.fetchPairsForTokensV1 = async (tokenAddresses: string[], chainId: string) => {
            assert.strictEqual (chainId, 'ethereum');
            assert.strictEqual (tokenAddresses.length, 1);
            assert.strictEqual (tokenAddresses[0], WETH.toLowerCase ());
            return [ samplePair () ];
        };
        exchange.publicGetLatestDexSearch = async () => {
            throw new Error ('search should not be called when tokens/v1 batch succeeds');
        };
        const market: any = await exchange.resolveMarket (WETH_USDC_ALIAS);
        assert.strictEqual (market['symbol'], WETH_USDC_ALIAS);
        assert.strictEqual (WETH_USDC_ALIAS in exchange.markets, true);
        assert.strictEqual (WETH_USDC in exchange.markets, true);
    }
    // MR3b: token address pair falls back to search when tokens/v1 batch misses
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        exchange.fetchPairsForTokensV1 = async () => {
            return [];
        };
        exchange.publicGetLatestDexSearch = async (params) => {
            assert.strictEqual (params['q'], WETH.toLowerCase () + '/' + USDC.toLowerCase ());
            return {
                'pairs': [ samplePair () ],
            };
        };
        const market: any = await exchange.resolveMarket (WETH_USDC_ALIAS);
        assert.strictEqual (market['symbol'], WETH_USDC_ALIAS);
        assert.strictEqual (WETH_USDC in exchange.markets, true);
    }
    // MR4: unknown unified symbol resolves via search but no matching pair
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        exchange.publicGetLatestDexSearch = async () => {
            return { 'pairs': [ samplePair () ] };
        };
        let threw = false;
        try {
            await exchange.resolveMarket ('BTC/USD@ETH!UNISWAP');
        } catch (error: any) {
            threw = true;
            assert.strictEqual (error.constructor.name, 'BadSymbol');
            assert.strictEqual (error.message.includes ('tokens are not supported'), true);
            assert.strictEqual (error.message.includes ('network unified=ETH'), true);
            assert.strictEqual (error.message.includes ('local=ethereum'), true);
            assert.strictEqual (error.message.includes ('dex unified=UNISWAP'), true);
        }
        assert.strictEqual (threw, true);
    }
    // MR5: suffix required
    {
        const exchange = createExchange ();
        let threw = false;
        try {
            exchange.obParseNetworkDexSymbol ('WETH/USDC');
        } catch (error: any) {
            threw = true;
            assert.strictEqual (error.constructor.name, 'BadSymbol');
        }
        assert.strictEqual (threw, true);
    }
    // MR6: resolveMarkets batches search for multiple ticker symbols
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        let searchCallCount = 0;
        exchange.publicGetLatestDexSearch = async () => {
            searchCallCount++;
            return {
                'pairs': [
                    samplePair (),
                    samplePair ({
                        'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                    }),
                ],
            };
        };
        const resolveResult: any = await exchange.resolveMarkets ([ WETH_USDC, WETH_USDT ]);
        assert.strictEqual (searchCallCount, 2);
        assert.strictEqual (resolveResult['marketsBySymbol'][WETH_USDC]['symbol'], WETH_USDC);
        assert.strictEqual (resolveResult['marketsBySymbol'][WETH_USDT]['symbol'], WETH_USDT);
    }
    // MR7: resolveMarkets batches tokens/v1 by chain for address-pair symbols
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        const wethUsdtAlias = WETH.toLowerCase () + '/' + USDT.toLowerCase () + NETWORK_SUFFIX;
        const uniUsdcAlias = UNI.toLowerCase () + '/' + USDC.toLowerCase () + NETWORK_SUFFIX;
        const uniWethAlias = UNI.toLowerCase () + '/' + WETH.toLowerCase () + NETWORK_SUFFIX;
        let tokensV1CallCount = 0;
        exchange.fetchPairsForTokensV1 = async (tokenAddresses: string[], chainId: string) => {
            tokensV1CallCount++;
            assert.strictEqual (chainId, 'ethereum');
            assert.strictEqual (tokenAddresses.length, 2);
            assert.strictEqual (tokenAddresses.includes (WETH.toLowerCase ()), true);
            assert.strictEqual (tokenAddresses.includes (UNI.toLowerCase ()), true);
            return [
                samplePair (),
                samplePair ({
                    'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                }),
                samplePair ({
                    'baseToken': { 'address': UNI, 'symbol': 'UNI' },
                    'quoteToken': { 'address': USDC, 'symbol': 'USDC' },
                    'pairAddress': '0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd802',
                }),
                samplePair ({
                    'baseToken': { 'address': UNI, 'symbol': 'UNI' },
                    'quoteToken': { 'address': WETH, 'symbol': 'WETH' },
                    'pairAddress': '0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd803',
                    'priceNative': '0.001516',
                }),
            ];
        };
        exchange.publicGetLatestDexSearch = async () => {
            throw new Error ('search should not be called when batched tokens/v1 covers all symbols');
        };
        const resolveResult: any = await exchange.resolveMarkets ([ WETH_USDC_ALIAS, wethUsdtAlias, uniUsdcAlias, uniWethAlias ]);
        assert.strictEqual (tokensV1CallCount, 1);
        assert.strictEqual (resolveResult['marketsBySymbol'][WETH_USDC_ALIAS]['symbol'], WETH_USDC_ALIAS);
        assert.strictEqual (resolveResult['marketsBySymbol'][wethUsdtAlias]['symbol'], wethUsdtAlias);
        assert.strictEqual (resolveResult['marketsBySymbol'][uniUsdcAlias]['symbol'], uniUsdcAlias);
        assert.strictEqual (resolveResult['marketsBySymbol'][uniWethAlias]['symbol'], uniWethAlias);
    }
    // MR7b: batched tokens/v1 miss per symbol still falls back to search
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        const wethUsdtAlias = WETH.toLowerCase () + '/' + USDT.toLowerCase () + NETWORK_SUFFIX;
        const uniUsdcAlias = UNI.toLowerCase () + '/' + USDC.toLowerCase () + NETWORK_SUFFIX;
        const uniWethAlias = UNI.toLowerCase () + '/' + WETH.toLowerCase () + NETWORK_SUFFIX;
        exchange.fetchPairsForTokensV1 = async () => {
            return [
                samplePair (),
                samplePair ({
                    'baseToken': { 'address': UNI, 'symbol': 'UNI' },
                    'quoteToken': { 'address': WETH, 'symbol': 'WETH' },
                    'pairAddress': '0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd803',
                    'priceNative': '0.001516',
                }),
            ];
        };
        let searchCallCount = 0;
        exchange.publicGetLatestDexSearch = async (params) => {
            searchCallCount++;
            const query = params['q'];
            if (query === (WETH.toLowerCase () + '/' + USDT.toLowerCase ())) {
                return {
                    'pairs': [
                        samplePair ({
                            'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                        }),
                    ],
                };
            }
            if (query === (UNI.toLowerCase () + '/' + USDC.toLowerCase ())) {
                return {
                    'pairs': [
                        samplePair ({
                            'baseToken': { 'address': UNI, 'symbol': 'UNI' },
                            'quoteToken': { 'address': USDC, 'symbol': 'USDC' },
                            'pairAddress': '0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd802',
                        }),
                    ],
                };
            }
            throw new Error ('unexpected search query: ' + query);
        };
        const resolveResult: any = await exchange.resolveMarkets ([ WETH_USDC_ALIAS, wethUsdtAlias, uniUsdcAlias, uniWethAlias ]);
        assert.strictEqual (searchCallCount, 2);
        assert.strictEqual (resolveResult['marketsBySymbol'][WETH_USDC_ALIAS]['symbol'], WETH_USDC_ALIAS);
        assert.strictEqual (resolveResult['marketsBySymbol'][wethUsdtAlias]['symbol'], wethUsdtAlias);
        assert.strictEqual (resolveResult['marketsBySymbol'][uniUsdcAlias]['symbol'], uniUsdcAlias);
        assert.strictEqual (resolveResult['marketsBySymbol'][uniWethAlias]['symbol'], uniWethAlias);
    }
    // MR8: resolveMarkets picks concrete dex by quote liquidity for wildcard address pair
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        exchange.fetchPairsForTokensV1 = async () => {
            return [
                samplePair ({
                    'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                    'liquidity': { 'usd': 5000000, 'quote': 100 },
                    'dexId': 'uniswap',
                }),
                samplePair ({
                    'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                    'liquidity': { 'usd': 100, 'quote': 5000000 },
                    'dexId': 'sushiswap',
                    'pairAddress': '0xsushi',
                }),
            ];
        };
        exchange.publicGetLatestDexSearch = async () => {
            throw new Error ('search should not be called when tokens/v1 covers wildcard resolve');
        };
        const resolveResult: any = await exchange.resolveMarkets ([ WETH_USDT_WILDCARD ]);
        const concreteSymbol = resolveResult['marketsBySymbol'][WETH_USDT_WILDCARD]['symbol'];
        assert.strictEqual (concreteSymbol.endsWith ('!SUSHISWAP'), true);
        assert.strictEqual (exchange.market (WETH_USDT_WILDCARD) !== undefined, true);
        assert.strictEqual (exchange.market (WETH_USDT_WILDCARD)['symbol'], concreteSymbol);
    }
    // MR8b: wildcard and concrete WETH/USDT resolve to same pool in batch
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        const wethUsdtAlias = WETH.toLowerCase () + '/' + USDT.toLowerCase () + NETWORK_SUFFIX;
        exchange.fetchPairsForTokensV1 = async () => {
            return [
                samplePair ({
                    'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                    'liquidity': { 'usd': 5000000, 'quote': 5000000 },
                    'dexId': 'uniswap',
                    'pairAddress': '0xuniswap-weth-usdt',
                }),
                samplePair ({
                    'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                    'liquidity': { 'usd': 100, 'quote': 100 },
                    'dexId': 'sushiswap',
                    'pairAddress': '0xsushi',
                }),
            ];
        };
        exchange.publicGetLatestDexSearch = async () => {
            throw new Error ('search should not be called when batched tokens/v1 covers wildcard and concrete');
        };
        const resolveResult: any = await exchange.resolveMarkets ([ wethUsdtAlias, WETH_USDT_WILDCARD ]);
        const concreteMarket = resolveResult['marketsBySymbol'][wethUsdtAlias];
        const wildcardMarket = resolveResult['marketsBySymbol'][WETH_USDT_WILDCARD];
        assert.strictEqual (concreteMarket['info']['pairAddress'], wildcardMarket['info']['pairAddress']);
        assert.strictEqual (wildcardMarket['symbol'], concreteMarket['symbol']);
    }
    // FT1: fetchTickersFromTokensV1 batches by chain
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [
            samplePair (),
            samplePair ({
                'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
            }),
        ]);
        const marketsBySymbol: any = {
            [WETH_USDC]: exchange.market (WETH_USDC),
            [WETH_USDT]: exchange.market (WETH_USDT),
        };
        let batchCallCount = 0;
        exchange.fetchPairsForTokensV1 = async (tokenAddresses: string[], chainId: string) => {
            batchCallCount++;
            assert.strictEqual (chainId, 'ethereum');
            assert.strictEqual (tokenAddresses.length, 1);
            assert.strictEqual (tokenAddresses[0], WETH);
            return [
                samplePair (),
                samplePair ({
                    'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                }),
            ];
        };
        const tickers: any = await exchange.fetchTickersFromTokensV1 ([ WETH_USDC, WETH_USDT ], marketsBySymbol);
        assert.strictEqual (batchCallCount, 1);
        assert.strictEqual (tickers[WETH_USDC]['symbol'], WETH_USDC);
        assert.strictEqual (String (tickers[WETH_USDC]['last']), '3000');
    }
    // FT3: fetchTickersFromTokensV1 falls back to search when batch misses a symbol
    {
        const exchange = createExchange ();
        loadMarketsFromPairs (exchange, [
            samplePair (),
            samplePair ({
                'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
            }),
        ]);
        const marketsBySymbol: any = {
            [WETH_USDC]: exchange.market (WETH_USDC),
            [WETH_USDT]: exchange.market (WETH_USDT),
        };
        let batchCallCount = 0;
        exchange.fetchPairsForTokensV1 = async (tokenAddresses: string[], chainId: string) => {
            batchCallCount++;
            assert.strictEqual (chainId, 'ethereum');
            return [
                samplePair (),
            ];
        };
        let searchCallCount = 0;
        let pairsApiCallCount = 0;
        exchange.publicGetLatestDexSearch = async (params) => {
            searchCallCount++;
            assert.strictEqual (params['q'], 'WETH/USDT');
            return {
                'pairs': [
                    samplePair ({
                        'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                        'priceNative': '2500',
                    }),
                ],
            };
        };
        exchange.publicGetLatestDexPairsChainIdPairId = async () => {
            pairsApiCallCount++;
            throw new Error ('latest/dex/pairs should not be called');
        };
        const tickers: any = await exchange.fetchTickersFromTokensV1 ([ WETH_USDC, WETH_USDT ], marketsBySymbol);
        assert.strictEqual (batchCallCount, 1);
        assert.strictEqual (searchCallCount, 1);
        assert.strictEqual (pairsApiCallCount, 0);
        assert.strictEqual (tickers[WETH_USDC]['symbol'], WETH_USDC);
        assert.strictEqual (String (tickers[WETH_USDC]['last']), '3000');
        assert.strictEqual (tickers[WETH_USDT]['symbol'], WETH_USDT);
        assert.strictEqual (String (tickers[WETH_USDT]['last']), '2500');
    }
    // FT4: fetchTickersFromTokensV1 reuses market.info when symbol was just resolved
    {
        const exchange = createExchange ();
        const wethUsdtAlias = WETH.toLowerCase () + '/' + USDT.toLowerCase () + NETWORK_SUFFIX;
        exchange.setMarkets ([]);
        const searchPair = samplePair ({
            'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
            'priceNative': '2500',
        });
        let searchCallCount = 0;
        exchange.fetchPairsForTokensV1 = async () => {
            return [];
        };
        exchange.publicGetLatestDexSearch = async () => {
            searchCallCount++;
            return {
                'pairs': [ searchPair ],
            };
        };
        const resolveResult: any = await exchange.resolveMarkets ([ wethUsdtAlias ]);
        assert.strictEqual (searchCallCount, 1);
        assert.strictEqual (resolveResult['justResolvedSymbols'][wethUsdtAlias], true);
        searchCallCount = 0;
        exchange.fetchPairsForTokensV1 = async () => {
            throw new Error ('tokens/v1 batch should not be called when market.info is still fresh');
        };
        exchange.publicGetLatestDexSearch = async () => {
            searchCallCount++;
            throw new Error ('search should not be called when market.info is still fresh');
        };
        const tickers: any = await exchange.fetchTickersFromTokensV1 (
            [ wethUsdtAlias ],
            resolveResult['marketsBySymbol'],
            resolveResult['justResolvedSymbols'],
        );
        assert.strictEqual (searchCallCount, 0);
        assert.strictEqual (tickers[wethUsdtAlias]['symbol'], wethUsdtAlias);
        assert.strictEqual (String (tickers[wethUsdtAlias]['last']), '2500');
    }
    // FT5: fetchTickersFromTokensV1 skips tokens/v1 batch when symbol was just resolved via tokens/v1
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        const tokensV1Pair = samplePair ();
        let tokensV1CallCount = 0;
        exchange.fetchPairsForTokensV1 = async (tokenAddresses: string[], chainId: string) => {
            tokensV1CallCount++;
            assert.strictEqual (chainId, 'ethereum');
            assert.strictEqual (tokenAddresses.length, 1);
            assert.strictEqual (tokenAddresses[0], WETH.toLowerCase ());
            return [ tokensV1Pair ];
        };
        exchange.publicGetLatestDexSearch = async () => {
            throw new Error ('search should not be called when tokens/v1 batch succeeds');
        };
        const resolveResult: any = await exchange.resolveMarkets ([ WETH_USDC_ALIAS ]);
        assert.strictEqual (tokensV1CallCount, 1);
        assert.strictEqual (resolveResult['justResolvedSymbols'][WETH_USDC_ALIAS], true);
        tokensV1CallCount = 0;
        exchange.fetchPairsForTokensV1 = async () => {
            tokensV1CallCount++;
            throw new Error ('tokens/v1 batch should not be called when market.info is still fresh');
        };
        const tickers: any = await exchange.fetchTickersFromTokensV1 (
            [ WETH_USDC_ALIAS ],
            resolveResult['marketsBySymbol'],
            resolveResult['justResolvedSymbols'],
        );
        assert.strictEqual (tokensV1CallCount, 0);
        assert.strictEqual (tickers[WETH_USDC_ALIAS]['symbol'], WETH_USDC_ALIAS);
        assert.strictEqual (String (tickers[WETH_USDC_ALIAS]['last']), '3000');
    }
    // FT2: wildcard dex picks highest quote liquidity
    {
        const exchange = createExchange ();
        const wildcardSuffix = '@ETH!*';
        const market: any = exchange.parseMarket (samplePair ({ 'liquidity': { 'usd': 100 } }));
        market['symbol'] = 'WETH/USDC' + wildcardSuffix;
        market['id'] = 'ETH:*:ethereum:0xlow';
        const pairs = [
            samplePair ({ 'liquidity': { 'usd': 5000000, 'quote': 100 }, 'dexId': 'uniswap' }),
            samplePair ({ 'liquidity': { 'usd': 100, 'quote': 5000000 }, 'dexId': 'sushiswap', 'pairAddress': '0xsushi' }),
        ];
        const selected: any = exchange.selectBestPairForMarket (pairs, market, '*');
        assert.strictEqual (selected['dexId'], 'sushiswap');
    }
    // FM2: fetchMarkets returns empty
    {
        const exchange = createExchange ();
        const markets: any = await exchange.fetchMarkets ();
        assert.strictEqual (markets.length, 0);
    }
    // DM1: single plain WETH/USDC returns multiple venues
    {
        const exchange = createExchange ();
        exchange.publicGetLatestDexSearch = async () => {
            return {
                'pairs': [
                    samplePair ({ 'liquidity': { 'usd': 100, 'quote': 100 } }),
                    samplePair ({
                        'dexId': 'sushiswap',
                        'pairAddress': '0xsushi',
                        'liquidity': { 'usd': 200, 'quote': 200 },
                    }),
                    samplePair ({
                        'chainId': 'bsc',
                        'dexId': 'pancakeswap',
                        'pairAddress': '0xbsc',
                        'liquidity': { 'usd': 300, 'quote': 300 },
                    }),
                ],
            };
        };
        const dexPairs: any = await exchange.obFetchDexPairs ([ 'WETH/USDC' ]);
        assert.strictEqual (dexPairs.length, 3);
        const venues = new Set (dexPairs.map ((dexPair: any) => dexPair['network'] + ':' + dexPair['dex']));
        assert.strictEqual (venues.has ('ETH:UNISWAP'), true);
        assert.strictEqual (venues.has ('ETH:SUSHISWAP'), true);
        assert.strictEqual (venues.has ('BEP20:PANCAKESWAP'), true);
    }
    // DM2: two symbols — only venues listing both are returned
    {
        const exchange = createExchange ();
        exchange.publicGetLatestDexSearch = async (params: any) => {
            if (params['q'] === 'WETH/USDC') {
                return {
                    'pairs': [
                        samplePair ({ 'liquidity': { 'quote': 100 } }),
                        samplePair ({
                            'dexId': 'sushiswap',
                            'pairAddress': '0xsushi',
                            'liquidity': { 'quote': 100 },
                        }),
                    ],
                };
            }
            return {
                'pairs': [
                    samplePair ({
                        'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                        'liquidity': { 'quote': 100 },
                    }),
                ],
            };
        };
        const dexPairs: any = await exchange.obFetchDexPairs ([ 'WETH/USDC', 'WETH/USDT' ]);
        assert.strictEqual (dexPairs.length, 2);
        assert.strictEqual (dexPairs.every ((dexPair: any) => dexPair['dex'] === 'UNISWAP'), true);
        const symbols = new Set (dexPairs.map ((dexPair: any) => dexPair['symbol']));
        assert.strictEqual (symbols.has ('WETH/USDC'), true);
        assert.strictEqual (symbols.has ('WETH/USDT'), true);
    }
    // DM3: duplicate pools on same venue — highest quote liquidity wins
    {
        const exchange = createExchange ();
        exchange.publicGetLatestDexSearch = async () => {
            return {
                'pairs': [
                    samplePair ({
                        'pairAddress': '0xlow',
                        'priceNative': '2900',
                        'liquidity': { 'quote': 100 },
                    }),
                    samplePair ({
                        'pairAddress': '0xhigh',
                        'priceNative': '3100',
                        'liquidity': { 'quote': 5000000 },
                    }),
                ],
            };
        };
        const dexPairs: any = await exchange.obFetchDexPairs ([ 'WETH/USDC' ]);
        assert.strictEqual (dexPairs.length, 1);
        assert.strictEqual (String (dexPairs[0]['price']), '3100');
        assert.strictEqual (dexPairs[0]['quoteLiquidity'], 5000000);
    }
    // DM4: wildcard dex returns concrete dex codes on ETH
    {
        const exchange = createExchange ();
        exchange.publicGetLatestDexSearch = async () => {
            return {
                'pairs': [
                    samplePair ({
                        'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                        'dexId': 'uniswap',
                        'liquidity': { 'quote': 100 },
                    }),
                    samplePair ({
                        'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                        'dexId': 'sushiswap',
                        'pairAddress': '0xsushi',
                        'liquidity': { 'quote': 200 },
                    }),
                ],
            };
        };
        const dexPairs: any = await exchange.obFetchDexPairs ([ 'WETH/USDT@ETH!*' ]);
        assert.strictEqual (dexPairs.length, 2);
        const dexes = new Set (dexPairs.map ((dexPair: any) => dexPair['dex']));
        assert.strictEqual (dexes.has ('UNISWAP'), true);
        assert.strictEqual (dexes.has ('SUSHISWAP'), true);
        assert.strictEqual (dexPairs.every ((dexPair: any) => dexPair['network'] === 'ETH'), true);
    }
    // DM5: constrained symbol plus plain symbol — only matching venue with both pairs
    {
        const exchange = createExchange ();
        exchange.publicGetLatestDexSearch = async (params: any) => {
            if (params['q'] === 'WETH/USDC') {
                return {
                    'pairs': [
                        samplePair ({ 'liquidity': { 'quote': 100 } }),
                        samplePair ({
                            'dexId': 'sushiswap',
                            'pairAddress': '0xsushi',
                            'liquidity': { 'quote': 100 },
                        }),
                    ],
                };
            }
            return {
                'pairs': [
                    samplePair ({
                        'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                        'liquidity': { 'quote': 100 },
                    }),
                ],
            };
        };
        const dexPairs: any = await exchange.obFetchDexPairs ([ 'WETH/USDC@ETH!UNISWAP', 'WETH/USDT' ]);
        assert.strictEqual (dexPairs.length, 2);
        assert.strictEqual (dexPairs.every ((dexPair: any) => dexPair['network'] === 'ETH' && dexPair['dex'] === 'UNISWAP'), true);
    }
    // DM6: no common venue returns empty list
    {
        const exchange = createExchange ();
        exchange.publicGetLatestDexSearch = async (params: any) => {
            if (params['q'] === 'WETH/USDC') {
                return {
                    'pairs': [
                        samplePair ({ 'liquidity': { 'quote': 100 } }),
                    ],
                };
            }
            return {
                'pairs': [
                    samplePair ({
                        'dexId': 'sushiswap',
                        'pairAddress': '0xsushi-usdt',
                        'quoteToken': { 'address': USDT, 'symbol': 'USDT' },
                        'liquidity': { 'quote': 100 },
                    }),
                ],
            };
        };
        const dexPairs: any = await exchange.obFetchDexPairs ([ 'WETH/USDC', 'WETH/USDT' ]);
        assert.strictEqual (dexPairs.length, 0);
    }
    // MR9: plain ticker WETH/USDC resolves via search without network suffix
    {
        const exchange = createExchange ();
        exchange.setMarkets ([]);
        exchange.publicGetLatestDexSearch = async () => {
            return {
                'pairs': [ samplePair () ],
            };
        };
        const resolveResult: any = await exchange.resolveMarkets ([ 'WETH/USDC' ]);
        assert.strictEqual (resolveResult['marketsBySymbol']['WETH/USDC']['symbol'], WETH_USDC);
        assert.strictEqual (exchange.market ('WETH/USDC')['symbol'], WETH_USDC);
    }
    // MF1: plain WETH/USDC populates markets and returns fixed status
    {
        const exchange = createObExchange ();
        exchange.setMarkets ([]);
        let searchCallCount = 0;
        exchange.publicGetLatestDexSearch = async () => {
            searchCallCount++;
            return {
                'pairs': [ samplePair () ],
            };
        };
        const plainWethUsdc = 'WETH/USDC';
        const markets: any = await exchange.obLoadMarketsForSymbols ([ plainWethUsdc ]);
        assert.strictEqual (searchCallCount, 1);
        assert.strictEqual (markets.length, 1);
        assert.strictEqual (markets[0]['symbol'], WETH_USDC);
        assert.strictEqual (exchange.market (plainWethUsdc)['symbol'], WETH_USDC);
    }
    // MF2: reload=false skips HTTP for cached symbol
    {
        const exchange = createObExchange ();
        exchange.setMarkets ([]);
        const wethUsdcAlias = WETH.toLowerCase () + '/' + USDC.toLowerCase () + NETWORK_SUFFIX;
        let tokensV1CallCount = 0;
        exchange.fetchPairsForTokensV1 = async () => {
            tokensV1CallCount++;
            return [ samplePair () ];
        };
        exchange.publicGetLatestDexSearch = async () => {
            throw new Error ('search should not be called for address pair resolve');
        };
        await exchange.obLoadMarketsForSymbols ([ wethUsdcAlias ]);
        const firstCallCount = tokensV1CallCount;
        await exchange.obLoadMarketsForSymbols ([ wethUsdcAlias ]);
        assert.strictEqual (tokensV1CallCount, firstCallCount);
    }
    // MF3: reload=true evicts cache and re-fetches
    {
        const exchange = createObExchange ();
        exchange.setMarkets ([]);
        let searchCallCount = 0;
        exchange.publicGetLatestDexSearch = async () => {
            searchCallCount++;
            return {
                'pairs': [ samplePair () ],
            };
        };
        const plainWethUsdc = 'WETH/USDC';
        await exchange.obLoadMarketsForSymbols ([ plainWethUsdc ]);
        await exchange.obLoadMarketsForSymbols ([ plainWethUsdc ], true);
        assert.strictEqual (searchCallCount, 2);
    }
    // MF4: multiple pools on same venue — highest liquidity wins
    {
        const exchange = createObExchange ();
        exchange.setMarkets ([]);
        exchange.publicGetLatestDexSearch = async () => {
            return {
                'pairs': [
                    samplePair ({
                        'pairAddress': '0xlow',
                        'liquidity': { 'usd': 100 },
                    }),
                    samplePair ({
                        'pairAddress': '0xhigh',
                        'liquidity': { 'usd': 5000000 },
                    }),
                ],
            };
        };
        const markets: any = await exchange.obLoadMarketsForSymbols ([ WETH_USDC ]);
        assert.strictEqual (markets.length, 1);
        assert.strictEqual (markets[0]['id'], 'ETH:UNISWAP:ethereum:0xhigh');
    }
}

export default testDexscreener;
