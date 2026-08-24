
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { ExchangeError } from '../../../base/errors.js';
import assertObExchangeId from './obTestUtil.js';
import type { Dict } from '../../../base/types.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

function setupWeexMarkets (ex: { markets: Dict }) {
    ex.markets = {
        'BTC/USDT': {
            'id': 'BTCUSDT',
            'symbol': 'BTC/USDT',
            'base': 'BTC',
            'quote': 'USDT',
            'spot': true,
            'swap': false,
            'precision': { 'amount': 0.00001, 'price': 0.01 },
        },
        'BTC/USDT:USDT': {
            'id': 'BTCUSDT',
            'symbol': 'BTC/USDT:USDT',
            'base': 'BTC',
            'quote': 'USDT',
            'settle': 'USDT',
            'spot': false,
            'swap': true,
            'precision': { 'amount': 0.00001, 'price': 0.01 },
        },
    };
}

const FIXED_UUID22 = 'fixeduuid22chars0000000000';
const DEFAULT_PARTNER = 'b-WEEX111174';

async function testObWeex () {
    {
        const exchange = new ccxt.ob_weex ();
        assertObExchangeId (exchange, 'ob_weex');
        const octobotOptions = exchange.options['octobot'];
        assert.strictEqual (octobotOptions['fixMarketStatus'], true);
        assert.deepStrictEqual (octobotOptions['supportedElements']['spot']['orders'], [ 'market', 'limit' ]);
        assert.deepStrictEqual (octobotOptions['supportedElements']['futures']['orders'], [ 'market', 'limit' ]);
        assert.strictEqual (exchange.has['fetchAccountId'], true);
        assert.strictEqual (exchange.has['fetchPermissions'], true);
        assert.strictEqual (exchange.has['isAuthenticatedRequest'], true);
        assert.strictEqual (exchange.options['partner'], DEFAULT_PARTNER);
    }
    {
        const ex = new ccxt.ob_weex ();
        ex.obFetchSpotAccount = async () => ({ 'uid': 8886281669 });
        assert.strictEqual (await ex.fetchAccountId (), '8886281669');
    }
    {
        const ex = new ccxt.ob_weex ();
        ex.obFetchSpotAccount = async () => ({});
        await assert.rejects (async () => await ex.fetchAccountId (), ExchangeError);
    }
    {
        const ex = new ccxt.ob_weex ();
        ex.obFetchSpotAccount = async () => ({ 'permissions': [ 'SPOT_TRADING' ] });
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings ([ 'reading', 'spotTrading' ]));
    }
    {
        const ex = new ccxt.ob_weex ();
        ex.obFetchSpotAccount = async () => ({ 'permissions': [ 'READONLY' ] });
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_weex ();
        ex.obFetchSpotAccount = async () => ({ 'permissions': [], 'canWithdraw': true });
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings ([ 'reading', 'withdrawals' ]));
    }
    {
        const ex = new ccxt.ob_weex ();
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', { 'ACCESS-SIGN': 'x' }, undefined), true);
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', {}, undefined), false);
    }
    {
        const ex = new ccxt.ob_weex ();
        setupWeexMarkets (ex);
        ex.uuid22 = () => FIXED_UUID22;
        const request = ex.createSpotOrderRequest ('BTC/USDT', 'limit', 'buy', 1, 50000, {});
        assert.strictEqual (request['newClientOrderId'], DEFAULT_PARTNER + '-' + FIXED_UUID22);
        assert.strictEqual (request['partner'], undefined);
    }
    {
        const ex = new ccxt.ob_weex ();
        setupWeexMarkets (ex);
        ex.uuid22 = () => FIXED_UUID22;
        const request = ex.createContractOrderRequest ('BTC/USDT:USDT', 'limit', 'buy', 1, 50000, {});
        assert.strictEqual (request['newClientOrderId'], DEFAULT_PARTNER + '-' + FIXED_UUID22);
        assert.strictEqual (request['partner'], undefined);
    }
    {
        const ex = new ccxt.ob_weex ();
        setupWeexMarkets (ex);
        ex.uuid22 = () => FIXED_UUID22;
        const request = ex.createSpotOrderRequest ('BTC/USDT', 'limit', 'buy', 1, 50000, { 'partner': 'custom-partner' });
        assert.strictEqual (request['newClientOrderId'], 'custom-partner-' + FIXED_UUID22);
    }
}

export default testObWeex;
