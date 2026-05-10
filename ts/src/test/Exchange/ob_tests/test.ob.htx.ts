
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObHtx () {
    {
        const ex = new ccxt.ob_htx ();
        assertObExchangeId (ex, 'ob_htx');
    }
    {
        const ex = new ccxt.ob_htx ();
        ex.fetchBalance = async () => ({ 'info': {} } as any);
        const rights = await ex.fetchPermissions ();
        assert (rights.indexOf ('futuresTrading') >= 0);
    }
    {
        const ex = new ccxt.ob_htx ();
        assert.strictEqual (ex.options['broker']['id'], 'AAc4ccb049');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['broker']['id'], 'AAc4ccb049');
    }
    // obAdaptAmountFromFilledOrCost branch A1: market+buy+filled -> amount=filled
    {
        const ex = new ccxt.ob_htx ();
        const parsed: any = { 'type': 'market', 'side': 'buy', 'amount': 0, 'filled': 4 };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 4);
    }
    // obAdaptAmountFromFilledOrCost branch A2: !amount && cost && price -> amount=cost/price
    {
        const ex = new ccxt.ob_htx ();
        const parsed: any = { 'type': 'limit', 'side': 'sell', 'amount': undefined, 'filled': 0, 'cost': 100, 'price': 25 };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 4);
    }
    // obAdaptAmountFromFilledOrCost branch A3: amount already set -> unchanged
    {
        const ex = new ccxt.ob_htx ();
        const parsed: any = { 'type': 'limit', 'side': 'buy', 'amount': 9, 'filled': 0, 'cost': 100, 'price': 25 };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 9);
    }
    // parseOrder integration: market+buy+filled goes through obAdaptAmountFromFilledOrCost
    {
        const ex = new ccxt.ob_htx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'type': 'market', 'side': 'buy', 'amount': 0, 'filled': 4 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['amount'], 4);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
}

export default testObHtx;
