
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
const USDT_USD_ADDR = USDT.toLowerCase () + '/USD@ETH';

function createExchange () {
    return new ccxt.coingecko ();
}

function onchainTokenResponse (address: string, symbol: string, name: string, priceUsd: string) {
    return {
        'data': {
            'id': 'eth_' + address,
            'type': 'token',
            'attributes': {
                'address': address,
                'name': name,
                'symbol': symbol,
                'price_usd': priceUsd,
                'image_url': 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
                'last_trade_timestamp': '1779897731',
                'volume_usd': {
                    'h24': '572433180.559528',
                },
            },
        },
    };
}

function stubOnchainTokenFetcher (exchange: any) {
    exchange.publicGetOnchainNetworksNetworkTokensAddress = async function (request: any) {
        const address = request['address'];
        if (address === WETH.toLowerCase ()) {
            return onchainTokenResponse (address, 'WETH', 'Wrapped Ether', '2000');
        }
        if (address === USDC.toLowerCase ()) {
            return onchainTokenResponse (address, 'USDC', 'USD Coin', '1');
        }
        if (address === USDT.toLowerCase ()) {
            return onchainTokenResponse (address, 'USDT', 'Tether USD', '1');
        }
        throw new Error ('unexpected onchain token address ' + address);
    };
}

async function testCoingecko () {
    // parseMarket M1: coin list entry -> unified BTC/USD market
    {
        const exchange = new ccxt.coingecko ();
        const market: any = exchange.parseMarket ({
            'id': 'bitcoin',
            'symbol': 'btc',
            'name': 'Bitcoin',
            'platforms': {
                'ethereum': '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
            },
        });
        assert.strictEqual (market['id'], 'bitcoin');
        assert.strictEqual (market['symbol'], 'BTC/USD');
        assert.strictEqual (market['base'], 'BTC');
        assert.strictEqual (market['quote'], 'USD');
        assert.strictEqual (market['baseId'], 'bitcoin');
        assert.strictEqual (market['quoteId'], 'usd');
        assert.strictEqual (market['info']['platforms']['ethereum'], '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599');
    }
    // parseMarket M2: null symbol -> BadSymbol
    {
        const exchange = new ccxt.coingecko ();
        let threw = false;
        try {
            exchange.parseMarket ({
                'id': 'broken-coin',
                'symbol': null,
                'name': 'Broken Coin',
            });
        } catch (error) {
            threw = true;
            assert (error instanceof ccxt.BadSymbol);
        }
        assert.strictEqual (threw, true);
    }
    // fetchMarkets F1: coins list with null-symbol entry -> skip incomplete row
    {
        const exchange: any = new ccxt.coingecko ();
        const origPublicGetCoinsList = exchange.publicGetCoinsList;
        exchange.publicGetCoinsList = async function () {
            return [
                {
                    'id': 'bitcoin',
                    'symbol': 'btc',
                    'name': 'Bitcoin',
                },
                {
                    'id': 'broken-coin',
                    'symbol': null,
                    'name': 'Broken Coin',
                },
            ];
        };
        try {
            const markets: any = await exchange.fetchMarkets ();
            assert.strictEqual (markets.length, 1);
            assert.strictEqual (markets[0]['id'], 'bitcoin');
            assert.strictEqual (markets[0]['symbol'], 'BTC/USD');
            assert.strictEqual (markets[0]['base'], 'BTC');
        } finally {
            exchange.publicGetCoinsList = origPublicGetCoinsList;
        }
    }
    // parseTicker T1: markets row -> price, change, extra name/logoUrl
    {
        const exchange = new ccxt.coingecko ();
        const market: any = {
            'symbol': 'BTC/USD',
            'baseId': 'bitcoin',
        };
        const ticker: any = exchange.parseTicker ({
            'id': 'bitcoin',
            'symbol': 'btc',
            'name': 'Bitcoin',
            'image': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
            'current_price': 70187,
            'high_24h': 70215,
            'low_24h': 68060,
            'price_change_24h': 2126.88,
            'price_change_percentage_24h': 3.12502,
            'total_volume': 20154184933,
            'last_updated': '2024-04-07T16:49:31.736Z',
        }, market);
        assert.strictEqual (ticker['symbol'], 'BTC/USD');
        assert.strictEqual (String (ticker['last']), '70187');
        assert.strictEqual (String (ticker['close']), '70187');
        assert.strictEqual (ticker['open'], undefined);
        assert.strictEqual (String (ticker['extra']['change']), '2126.88');
        assert.strictEqual (String (ticker['extra']['percentage']), '3.12502');
        assert.strictEqual (ticker['high'], undefined);
        assert.strictEqual (ticker['low'], undefined);
        assert.strictEqual (ticker['quoteVolume'], undefined);
        assert.strictEqual (ticker['extra']['name'], 'Bitcoin');
        assert.strictEqual (ticker['extra']['logoUrl'], 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png');
        assert.strictEqual (typeof ticker['timestamp'], 'number');
    }
    // fetchTicker F1: single markets row -> parseTicker
    {
        const exchange: any = new ccxt.coingecko ();
        const market = {
            'id': 'bitcoin',
            'symbol': 'BTC/USD',
            'base': 'BTC',
            'quote': 'USD',
            'baseId': 'bitcoin',
            'quoteId': 'usd',
        };
        exchange.markets = { 'BTC/USD': market };
        exchange.markets_by_id = { 'bitcoin': [ market ] };
        exchange.symbols = [ 'BTC/USD' ];
        const origLoadMarkets = exchange.loadMarkets;
        const origPublicGetCoinsMarkets = exchange.publicGetCoinsMarkets;
        exchange.loadMarkets = async function () {};
        exchange.publicGetCoinsMarkets = async function () {
            return [ {
                'id': 'bitcoin',
                'symbol': 'btc',
                'name': 'Bitcoin',
                'image': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
                'current_price': 70187,
                'price_change_24h': 2126.88,
                'price_change_percentage_24h': 3.12502,
                'last_updated': '2024-04-07T16:49:31.736Z',
            } ];
        };
        try {
            const ticker: any = await exchange.fetchTicker ('BTC/USD');
            assert.strictEqual (ticker['symbol'], 'BTC/USD');
            assert.strictEqual (String (ticker['last']), '70187');
            assert.strictEqual (ticker['extra']['name'], 'Bitcoin');
        } finally {
            exchange.loadMarkets = origLoadMarkets;
            exchange.publicGetCoinsMarkets = origPublicGetCoinsMarkets;
        }
    }
    // fetchTickers F1: no symbols -> first page via coins/markets
    {
        const exchange: any = new ccxt.coingecko ();
        const origLoadMarkets = exchange.loadMarkets;
        const origPublicGetCoinsMarkets = exchange.publicGetCoinsMarkets;
        exchange.loadMarkets = async function () {};
        exchange.publicGetCoinsMarkets = async function (request) {
            assert.strictEqual (request['vs_currency'], 'usd');
            assert.strictEqual (request['page'], 1);
            assert.strictEqual (request['per_page'], 250);
            assert.strictEqual (request['ids'], undefined);
            return [ {
                'id': 'bitcoin',
                'symbol': 'btc',
                'name': 'Bitcoin',
                'image': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
                'current_price': 70187,
                'last_updated': '2024-04-07T16:49:31.736Z',
            } ];
        };
        try {
            const tickers: any = await exchange.fetchTickers ();
            assert.strictEqual (Object.keys (tickers).length, 1);
            assert.strictEqual (tickers['BTC/USD']['symbol'], 'BTC/USD');
            assert.strictEqual (String (tickers['BTC/USD']['last']), '70187');
        } finally {
            exchange.loadMarkets = origLoadMarkets;
            exchange.publicGetCoinsMarkets = origPublicGetCoinsMarkets;
        }
    }
    // sign S1: undefined headers with apiKey -> demo api key header
    {
        const exchange: any = new ccxt.coingecko ({ 'apiKey': 'test-demo-key' });
        const signed: any = exchange.sign ('coins/list');
        assert.strictEqual (signed['headers']['x-cg-demo-api-key'], 'test-demo-key');
        assert.strictEqual (signed['url'], exchange.urls['api']['rest'] + '/coins/list');
    }
    // sign S2: no apiKey -> headers stay undefined
    {
        const exchange: any = new ccxt.coingecko ();
        const signed: any = exchange.sign ('coins/list');
        assert.strictEqual (signed['headers'], undefined);
    }
    // ON-NM1: network code mapping
    {
        const exchange = createExchange ();
        assert.strictEqual (exchange.networkCodeToId ('ETH'), 'eth');
        assert.strictEqual (exchange.networkCodeToId ('BASE'), 'base');
        assert.strictEqual (exchange.networkIdToCode ('eth'), 'ETH');
        assert.strictEqual (exchange.networkIdToCode ('base'), 'BASE');
    }
    // ON-DX1: non-wildcard dex raises NotSupported
    {
        const exchange = createExchange ();
        assert.throws (
            () => exchange.obParseDexPairSymbolInput (WETH_USDC_UNISWAP),
            (error: any) => error instanceof ccxt.NotSupported
        );
    }
    // ON-DX2: missing @network raises BadSymbol
    {
        const exchange = createExchange ();
        assert.throws (
            () => exchange.obParseDexPairSymbolInput ('WETH/USDC'),
            (error: any) => error instanceof ccxt.BadSymbol
        );
    }
    // ON-PA1: parseOnchainTokenAttributes
    {
        const exchange = createExchange ();
        const tokenData: any = exchange.parseOnchainTokenAttributes (onchainTokenResponse (USDT.toLowerCase (), 'USDT', 'Tether USD', '0.99'));
        assert.strictEqual (tokenData['symbol'], 'USDT');
        assert.strictEqual (tokenData['priceUsd'], '0.99');
        assert.strictEqual (tokenData['name'], 'Tether USD');
    }
    // ON-CP1: computePairPrice
    {
        const exchange = createExchange ();
        assert.strictEqual (exchange.computePairPrice (2000, 1), 2000);
    }
    // ON-MR1: resolveMarkets builds synthetic market (no HTTP)
    {
        const exchange: any = createExchange ();
        exchange.publicGetOnchainNetworksNetworkTokensAddress = async () => {
            throw new Error ('onchain token should not be called during resolveMarkets');
        };
        const resolveResult: any = await exchange.resolveMarkets ([ WETH_USDC_ADDR ]);
        const market = resolveResult['marketsBySymbol'][WETH_USDC_ADDR];
        assert.strictEqual (market['baseId'], WETH.toLowerCase ());
        assert.strictEqual (market['quoteId'], USDC.toLowerCase ());
        assert.strictEqual (market['symbol'], WETH_USDC_ADDR);
    }
    // ON-FT1: fetchTicker address pair computes last from USD prices
    {
        const exchange: any = createExchange ();
        exchange.loadMarkets = async function () {};
        stubOnchainTokenFetcher (exchange);
        const ticker: any = await exchange.fetchTicker (WETH_USDT_ADDR);
        assert.strictEqual (ticker['symbol'], WETH_USDT_ADDR);
        assert.strictEqual (parseFloat (ticker['last']), 2000);
        assert.strictEqual (ticker['extra']['name'], 'Wrapped Ether');
        assert.strictEqual (ticker['extra']['logoUrl'], 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png');
    }
    // ON-FT2: fetchTicker single token / USD uses price_usd directly
    {
        const exchange: any = createExchange ();
        exchange.loadMarkets = async function () {};
        stubOnchainTokenFetcher (exchange);
        const ticker: any = await exchange.fetchTicker (USDT_USD_ADDR);
        assert.strictEqual (ticker['symbol'], USDT_USD_ADDR);
        assert.strictEqual (parseFloat (ticker['last']), 1);
        assert.strictEqual (ticker['extra']['name'], 'Tether USD');
    }
    // ON-FT3: fetchTicker preserves @network-only input symbol
    {
        const exchange: any = createExchange ();
        exchange.loadMarkets = async function () {};
        stubOnchainTokenFetcher (exchange);
        const ticker: any = await exchange.fetchTicker (WETH_USDC_NO_DEX);
        assert.strictEqual (ticker['symbol'], WETH_USDC_NO_DEX);
        assert.strictEqual (parseFloat (ticker['last']), 2000);
    }
    // ON-FTS1: fetchTickers batches onchain token requests with deduplication
    {
        const exchange: any = createExchange ();
        exchange.loadMarkets = async function () {};
        let requestCount = 0;
        exchange.publicGetOnchainNetworksNetworkTokensAddress = async function (request: any) {
            requestCount = requestCount + 1;
            const address = request['address'];
            if (address === WETH.toLowerCase ()) {
                return onchainTokenResponse (address, 'WETH', 'Wrapped Ether', '2000');
            }
            if (address === USDC.toLowerCase ()) {
                return onchainTokenResponse (address, 'USDC', 'USD Coin', '1');
            }
            if (address === USDT.toLowerCase ()) {
                return onchainTokenResponse (address, 'USDT', 'Tether USD', '1');
            }
            throw new Error ('unexpected onchain token address ' + address);
        };
        const tickers: any = await exchange.fetchTickers ([ WETH_USDC_ADDR, WETH_USDT_ADDR ]);
        assert.strictEqual (requestCount, 3);
        assert.strictEqual (parseFloat (tickers[WETH_USDC_ADDR]['last']), 2000);
        assert.strictEqual (parseFloat (tickers[WETH_USDT_ADDR]['last']), 2000);
    }
}

export default testCoingecko;
