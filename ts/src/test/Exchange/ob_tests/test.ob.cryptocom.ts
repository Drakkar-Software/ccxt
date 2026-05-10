
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObCryptocom () {
    {
        const ex = new ccxt.ob_cryptocom ();
        assertObExchangeId (ex, 'ob_cryptocom');
    }
    {
        const ex = new ccxt.ob_cryptocom ();
        ex.fetchBalance = async () => ({ 'info': {} } as any);
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'futuresTrading', 'marginTrading' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_cryptocom ();
        assert.strictEqual (ex.options['broker'], 'OCTBT');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['broker'], 'OCTBT');
    }
}

export default testObCryptocom;
