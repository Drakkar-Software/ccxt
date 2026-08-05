
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { ExchangeError } from '../../../base/errors.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

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
}

export default testObWeex;
