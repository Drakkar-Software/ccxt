
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { ExchangeError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObKucoinEu () {
    {
        const ex = new ccxt.ob_kucoineu ();
        assertObExchangeId (ex, 'ob_kucoineu');
    }
    {
        const ex = new ccxt.ob_kucoineu ();
        assert.strictEqual (ex.options.octobot.myTradesFetchUseCcxtPaginate, true);
        assert.strictEqual (ex.options.octobot.hasBroker, true);
        assert.strictEqual (ex.has['swap'], false);
        assert.strictEqual (ex.has['future'], false);
        assert.strictEqual (ex.options.octobot.supportedElements['futures'], undefined);
    }
    {
        const ex = new ccxt.ob_kucoineu ();
        ex.cancelOrder = async () => ({} as any);
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_kucoineu ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('permission denied trading');
        };
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_kucoineu ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('some other exchange failure');
        };
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'marginTrading' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_kucoineu ();
        assert.strictEqual (ex.options['partner']['spot']['id'], 'NewOctobot');
        assert.strictEqual (ex.options['partner']['spot']['key'], '7672011a-e927-4cd4-972c-b58b37c989f7');
        assert.strictEqual (ex.options['partner']['spot']['name'], 'NewOctobot');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['partner']['spot']['id'], 'NewOctobot');
        assert.strictEqual (ex.options['partner']['spot']['key'], '7672011a-e927-4cd4-972c-b58b37c989f7');
        assert.strictEqual (ex.options['partner']['spot']['name'], 'NewOctobot');
    }
    {
        const ex = new ccxt.ob_kucoineu ();
        assert.strictEqual (ex.getMaxOpenOrdersCount ('BTC/USDC'), 100);
    }
}

export default testObKucoinEu;
