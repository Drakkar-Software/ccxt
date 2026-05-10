
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObLbank () {
    {
        const ex = new ccxt.ob_lbank ();
        assertObExchangeId (ex, 'ob_lbank');
    }
    {
        const ex = new ccxt.ob_lbank ();
        const payload = {
            'data': {
                'enableReading': true,
                'enableSpotTrading': true,
                'enableFuturesTrading': true,
                'enableWithdrawals': true,
            },
        };
        ex.spotPrivatePostSupplementApiRestrictions = async () => payload;
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'marginTrading', 'futuresTrading', 'withdrawals' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_lbank ();
        assert.strictEqual (await ex.fetchAccountId (), 'default_account_id');
    }
    {
        const ex = new ccxt.ob_lbank ();
        const headers = { 'signature_method': 'RSA' };
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', headers, ''), true);
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', {}, 'sign=abc'), true);
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', {}, ''), false);
    }
    {
        const ex = new ccxt.ob_lbank ();
        assert.strictEqual (
            ex.isAuthenticatedRequest ('', 'POST', { 'signature_method': 'RSA' }, 'sign=abc'),
            true,
        );
    }
}

export default testObLbank;
