
import assert from 'assert';
import ccxt from '../../../../ccxt.js';

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
}

export default testCoingecko;
