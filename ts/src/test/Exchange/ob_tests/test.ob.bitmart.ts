
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { ExchangeError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

async function testObBitmart () {
    {
        const ex = new ccxt.ob_bitmart ();
        assertObExchangeId (ex, 'ob_bitmart');
    }
    {
        const ex = new ccxt.ob_bitmart ();
        assert.strictEqual (ex.options.octobot.myTradesFetchUseCcxtPaginate, true);
    }
    {
        const ex = new ccxt.ob_bitmart ();
        ex.cancelOrder = async () => ({} as any);
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_bitmart ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('unknown failure');
        };
        const rights = await ex.fetchPermissions ();
        assert (rights.indexOf ('spotTrading') >= 0);
    }
    {
        const ex = new ccxt.ob_bitmart ();
        assert.strictEqual (ex.options['brokerId'], 'OCTOBOTBROKER01');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['brokerId'], 'OCTOBOTBROKER01');
    }
    {
        const ex = new ccxt.ob_bitmart ();
        assert.strictEqual (await ex.fetchAccountId (), 'default_account_id');
    }
    // obAdaptAmountFromFilledOrCost branch A1: market+buy+filled -> amount=filled
    {
        const ex = new ccxt.ob_bitmart ();
        const parsed: any = { 'type': 'market', 'side': 'buy', 'amount': 0, 'filled': 3, 'cost': undefined, 'price': undefined };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 3);
    }
    // parseOrder branch P1: market + canceled + filled -> status='closed' (Bitmart sometimes mis-tags filled market orders)
    {
        const ex = new ccxt.ob_bitmart ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'type': 'market', 'side': 'buy', 'status': 'canceled', 'amount': 0, 'filled': 3, 'cost': undefined, 'price': undefined };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['status'], 'closed');
            assert.strictEqual (parsed['amount'], 3);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch P2: limit + canceled -> status preserved
    {
        const ex = new ccxt.ob_bitmart ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'type': 'limit', 'side': 'buy', 'status': 'canceled', 'amount': 5, 'filled': 1, 'cost': undefined, 'price': 100 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['status'], 'canceled');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch P3: market + canceled + no filled -> status preserved (no synthetic close)
    {
        const ex = new ccxt.ob_bitmart ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'type': 'market', 'side': 'buy', 'status': 'canceled', 'amount': 1, 'filled': 0 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['status'], 'canceled');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
}

export default testObBitmart;
