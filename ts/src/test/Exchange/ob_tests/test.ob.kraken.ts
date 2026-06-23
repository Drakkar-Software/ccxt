
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { AuthenticationError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObKraken () {
    {
        const ex = new ccxt.ob_kraken ();
        assertObExchangeId (ex, 'ob_kraken');
    }
    {
        const ex = new ccxt.ob_kraken ();
        assert.strictEqual (await ex.fetchAccountId (), 'default_account_id');
    }
    {
        const ex = new ccxt.ob_kraken ();
        const response = {
            'error': [],
            'result': {
                'permissions': [ 'query-funds', 'modify-trades', 'withdraw-funds' ],
            },
        };
        ex.privatePostGetApiKeyInfo = async () => response;
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'marginTrading', 'withdrawals' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_kraken ();
        const response = {
            'error': [],
            'result': {
                'permissions': [ 'query-funds' ],
            },
        };
        ex.privatePostGetApiKeyInfo = async () => response;
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_kraken ();
        ex.privatePostGetApiKeyInfo = async () => {
            throw new Error ('EAPI:Invalid key');
        };
        await assert.rejects (async () => {
            await ex.fetchPermissions ();
        }, AuthenticationError);
    }
}

export default testObKraken;
