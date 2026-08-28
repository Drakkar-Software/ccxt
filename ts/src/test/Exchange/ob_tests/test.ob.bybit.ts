
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObBybit () {
    {
        const ex = new ccxt.ob_bybit ();
        assertObExchangeId (ex, 'ob_bybit');
    }
    {
        const ex = new ccxt.ob_bybit ();
        assert.strictEqual (ex.options.octobot.myTradesFetchUseCcxtPaginate, true);
    }
    {
        const ex = new ccxt.ob_bybit ();
        ex.fetchBalance = async () => ({ 'info': {} } as any);
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'futuresTrading', 'marginTrading' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_bybit ();
        assert.strictEqual (ex.options['brokerId'], 'octobot');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['brokerId'], 'octobot');
    }
}

export default testObBybit;
