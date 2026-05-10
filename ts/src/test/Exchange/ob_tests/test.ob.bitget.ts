
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObBitget () {
    {
        const ex = new ccxt.ob_bitget ();
        assertObExchangeId (ex, 'ob_bitget');
    }
    {
        const ex = new ccxt.ob_bitget ();
        ex.fetchBalance = async () => ({ 'info': {} } as any);
        const rights = await ex.fetchPermissions ();
        assert (rights.indexOf ('futuresTrading') >= 0);
    }
    {
        const ex = new ccxt.ob_bitget ();
        assert.strictEqual (ex.options['broker'], 'Octobot');
        ex.uuid22 = () => 'abc1234567890123456789012';
        const out = ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['broker'], 'Octobot');
        assert.strictEqual (out['clientOrderId'], 'Octobot#abc1234567890123456789012');
    }
    // obAdaptAmountFromFilledOrCost branch A1: market+buy+filled -> amount=filled
    {
        const ex = new ccxt.ob_bitget ();
        const parsed: any = { 'type': 'market', 'side': 'buy', 'amount': 0, 'filled': 7, 'cost': undefined, 'price': undefined };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 7);
    }
    // obAdaptAmountFromFilledOrCost branch A2: !amount && cost && price -> amount=cost/price
    {
        const ex = new ccxt.ob_bitget ();
        const parsed: any = { 'type': 'limit', 'side': 'sell', 'amount': undefined, 'filled': 0, 'cost': 200, 'price': 50 };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 4);
    }
    // obAdaptAmountFromFilledOrCost branch A3: limit type with amount already set -> unchanged
    {
        const ex = new ccxt.ob_bitget ();
        const parsed: any = { 'type': 'limit', 'side': 'buy', 'amount': 5, 'filled': 0, 'cost': 200, 'price': 50 };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 5);
    }
    // parseTrade branch T1: fee with code, no currency -> currency=code
    {
        const ex = new ccxt.ob_bitget ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () { return { 'fee': { 'code': 'USDT', 'cost': 0.5 } }; };
        try {
            const parsed: any = ex.parseTrade ({});
            assert.strictEqual (parsed['fee']['currency'], 'USDT');
            assert.strictEqual (parsed['fee']['cost'], 0.5);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch T2: fee with currency already set -> unchanged
    {
        const ex = new ccxt.ob_bitget ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () { return { 'fee': { 'currency': 'USDC', 'code': 'USDT', 'cost': 0.5 } }; };
        try {
            const parsed: any = ex.parseTrade ({});
            assert.strictEqual (parsed['fee']['currency'], 'USDC');
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch T3: no fee -> no change
    {
        const ex = new ccxt.ob_bitget ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () { return { 'symbol': 'BTC/USDT' }; };
        try {
            const parsed: any = ex.parseTrade ({});
            assert.strictEqual (parsed['fee'], undefined);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
}

export default testObBitget;
