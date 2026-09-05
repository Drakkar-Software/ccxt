
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { ArgumentsRequired } from '../../../base/errors.js';
import assertObExchangeId from './obTestUtil.js';

async function testObCoinrabbit () {
    {
        const exchange = new ccxt.ob_coinrabbit ();
        assertObExchangeId (exchange, 'ob_coinrabbit');
        const octobotOptions = exchange.options['octobot'];
        assert.strictEqual (octobotOptions['fixMarketStatus'], false);
        assert.strictEqual (octobotOptions['enableSpotBuyMarketWithCost'], true);
        assert.deepStrictEqual (octobotOptions['supportedElements']['spot']['orders'], [ 'market' ]);
        assert.strictEqual (exchange.options['orderSource'], 'octobot');
    }
    // obTopUpTradingCell: builds wallet top-up request with JWT + api key headers
    {
        const exchange = new ccxt.ob_coinrabbit () as any;
        exchange.apiKey = 'trading-cell-key';
        let capturedUrl: string = '';
        let capturedMethod: string = '';
        let capturedHeaders: Record<string, string> = {};
        let capturedBody: string = '';
        exchange.fetch = async (url: string, method: string, headers: Record<string, string>, body: string) => {
            capturedUrl = url;
            capturedMethod = method;
            capturedHeaders = headers;
            capturedBody = body;
            return { 'result': true, 'response': { 'status': 'ok' } };
        };
        const response = await exchange.obTopUpTradingCell ('USDT', 100, 'eth', { 'userToken': 'jwt-token', 'xApiKey': 'octobot-settings-key' });
        assert.strictEqual (capturedUrl, 'https://api.coinrabbit.io/v2/trading/top-up');
        assert.strictEqual (capturedMethod, 'POST');
        assert.strictEqual (capturedHeaders['Content-Type'], 'application/json');
        assert.strictEqual (capturedHeaders['x-user-token'], 'jwt-token');
        assert.strictEqual (capturedHeaders['x-api-key'], 'octobot-settings-key');
        assert.strictEqual (capturedHeaders['X-SIGNATURE'], undefined);
        assert.strictEqual (capturedHeaders['X-TIMESTAMP'], undefined);
        const parsedBody = JSON.parse (capturedBody);
        assert.strictEqual (parsedBody['code'], 'usdt');
        assert.strictEqual (parsedBody['network'], 'eth');
        assert.strictEqual (parsedBody['amount'], '100');
        assert.strictEqual (parsedBody['apiKey'], 'trading-cell-key');
        assert.deepStrictEqual (response, { 'status': 'ok' });
    }
    // obTopUpTradingCell: ArgumentsRequired when xApiKey missing
    {
        const exchange = new ccxt.ob_coinrabbit () as any;
        exchange.apiKey = 'trading-cell-key';
        await assert.rejects (
            async () => await exchange.obTopUpTradingCell ('usdt', 1, 'eth', { 'userToken': 'jwt-token' }),
            ArgumentsRequired,
        );
    }
    // obTopUpTradingCell: ArgumentsRequired when userToken missing
    {
        const exchange = new ccxt.ob_coinrabbit () as any;
        exchange.apiKey = 'trading-cell-key';
        await assert.rejects (
            async () => await exchange.obTopUpTradingCell ('usdt', 1, 'eth', { 'xApiKey': 'octobot-settings-key' }),
            ArgumentsRequired,
        );
    }
    // parseOrder: buy market API amount is quote cost via ob_coinrabbit wrapper
    {
        const exchange = new ccxt.ob_coinrabbit ();
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
}

export default testObCoinrabbit;
