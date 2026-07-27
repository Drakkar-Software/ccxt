
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const WETH_USDC_NO_DEX = WETH.toLowerCase () + '/' + USDC.toLowerCase () + '@ETH';

function onchainTokenResponseWithoutTimestamp (address: string, symbol: string, name: string, priceUsd: string) {
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
                'volume_usd': {
                    'h24': '572433180.559528',
                },
            },
        },
    };
}

async function testObCoingecko () {
    {
        const exchange = new ccxt.ob_coingecko ();
        assertObExchangeId (exchange, 'ob_coingecko');
        const octobotOptions = exchange.options['octobot'];
        assert.deepStrictEqual (octobotOptions['supportedElements']['spot']['orders'], []);
        assert.deepStrictEqual (octobotOptions['supportedElements']['futures']['orders'], []);
    }
    // parseTicker T1: missing timestamp falls back to current time on ob_coingecko
    {
        const exchange = new ccxt.ob_coingecko ();
        const market = {
            'symbol': 'BTC/USD',
        };
        const parsed: any = exchange.parseTicker ({
            'current_price': 70187,
            'name': 'Bitcoin',
            'image': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        }, market);
        assert.strictEqual (typeof parsed['timestamp'], 'number');
        assert.strictEqual (typeof parsed['datetime'], 'string');
    }
    // parseOnchainTicker T2: missing last_trade_timestamp falls back on ob_coingecko
    {
        const exchange: any = new ccxt.ob_coingecko ();
        exchange.publicGetOnchainNetworksNetworkTokensAddress = async function (request: any) {
            const address = request['address'];
            if (address === WETH.toLowerCase ()) {
                return onchainTokenResponseWithoutTimestamp (address, 'WETH', 'Wrapped Ether', '2000');
            }
            if (address === USDC.toLowerCase ()) {
                return onchainTokenResponseWithoutTimestamp (address, 'USDC', 'USD Coin', '1');
            }
            throw new Error ('unexpected onchain token address ' + address);
        };
        const ticker = await exchange.fetchTicker (WETH_USDC_NO_DEX);
        assert.strictEqual (typeof ticker['timestamp'], 'number');
        assert.strictEqual (typeof ticker['datetime'], 'string');
    }
    // parseOnchainTicker T3: base coingecko leaves timestamp unset without last_trade_timestamp
    {
        const exchange: any = new ccxt.coingecko ();
        const market = {
            'symbol': WETH_USDC_NO_DEX,
            'baseId': WETH.toLowerCase (),
            'quoteId': USDC.toLowerCase (),
        };
        const parsed: any = exchange.parseOnchainTicker (market, '2000', {
            'name': 'Wrapped Ether',
            'imageUrl': 'https://example.com/weth.png',
        });
        assert.strictEqual (parsed['timestamp'], undefined);
    }
    // resolveApiKey K1: defaultAPIKey is returned when apiKey is unset
    {
        const exchange = new ccxt.coingecko ();
        exchange.apiKey = undefined;
        exchange.options['defaultAPIKey'] = 'default-api-key';
        assert.strictEqual (exchange.resolveApiKey (), 'default-api-key');
    }
    // resolveApiKey K2: no keys configured returns undefined
    {
        const exchange = new ccxt.coingecko ();
        exchange.apiKey = undefined;
        exchange.options['defaultAPIKey'] = '';
        assert.strictEqual (exchange.resolveApiKey (), undefined);
    }
    // resolveApiKey K3: explicit apiKey takes precedence over defaultAPIKey
    {
        const exchange = new ccxt.coingecko ();
        exchange.apiKey = 'user-api-key';
        exchange.options['defaultAPIKey'] = 'default-api-key';
        assert.strictEqual (exchange.resolveApiKey (), 'user-api-key');
    }
    // resolveApiKey K4: forceDefaultAPIKey ignores explicit apiKey
    {
        const exchange = new ccxt.coingecko ();
        exchange.apiKey = 'user-api-key';
        exchange.options['defaultAPIKey'] = 'default-api-key';
        exchange.options['forceDefaultAPIKey'] = true;
        assert.strictEqual (exchange.resolveApiKey (), 'default-api-key');
    }
    // resolveApiKey K5: sign() sends resolved defaultAPIKey when apiKey is unset
    {
        const exchange = new ccxt.coingecko ();
        exchange.apiKey = undefined;
        exchange.options['defaultAPIKey'] = 'default-api-key';
        const signed: any = exchange.sign ('coins/list');
        assert.strictEqual (signed['headers']['x-cg-demo-api-key'], 'default-api-key');
    }
}

export default testObCoingecko;
