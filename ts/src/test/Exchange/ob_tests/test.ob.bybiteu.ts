
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObBybiteu () {
    {
        const ex = new ccxt.ob_bybiteu ();
        assertObExchangeId (ex, 'ob_bybiteu');
    }
    {
        const ex = new ccxt.ob_bybiteu ();
        assert.strictEqual (ex.options.octobot.myTradesFetchUseCcxtPaginate, true);
        assert.strictEqual (ex.options.octobot.hasBroker, true);
        assert.strictEqual (ex.options.octobot.enableSpotBuyMarketWithCost, true);
    }
    {
        const ex = new ccxt.ob_bybiteu ();
        ex.fetchBalance = async () => ({ 'info': {} } as any);
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'marginTrading' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_bybiteu ();
        assert.strictEqual (ex.options['brokerId'], 'octobot');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['brokerId'], 'octobot');
    }
}

export default testObBybiteu;
