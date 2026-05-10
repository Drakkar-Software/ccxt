
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObPhemex () {
    {
        const ex = new ccxt.ob_phemex ();
        assertObExchangeId (ex, 'ob_phemex');
    }
    {
        const ex = new ccxt.ob_phemex ();
        ex.fetchBalance = async () => ({ 'info': {} } as any);
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'futuresTrading', 'marginTrading' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_phemex ();
        assert.strictEqual (ex.options['brokerId'], 'Octobot');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['brokerId'], 'Octobot');
    }
    // parseOrder branch O1: closed + missing fee.currency + info.feeCurrency -> currency=info.feeCurrency
    {
        const ex = new ccxt.ob_phemex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'feeCurrency': 'USDT' }, 'status': 'closed', 'fee': { 'cost': 0.5 }, 'amount': 10, 'remaining': 0 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['fee']['currency'], 'USDT');
            assert.strictEqual (parsed['fee']['cost'], 0.5);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O2: closed -> amount = amount - remaining (filled-equivalent)
    {
        const ex = new ccxt.ob_phemex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'status': 'closed', 'fee': undefined, 'amount': 10, 'remaining': 3 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['amount'], 7);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O3: closed + existing fee.currency -> currency preserved (no override)
    {
        const ex = new ccxt.ob_phemex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'feeCurrency': 'USDT' }, 'status': 'closed', 'fee': { 'currency': 'USDC', 'cost': 0.5 }, 'amount': 10, 'remaining': 0 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['fee']['currency'], 'USDC');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O4: status 'open' -> amount + fee untouched
    {
        const ex = new ccxt.ob_phemex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'feeCurrency': 'USDT' }, 'status': 'open', 'fee': { 'cost': 0.5 }, 'amount': 10, 'remaining': 3 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['amount'], 10);
            assert.strictEqual (parsed['fee']['currency'], undefined);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
}

export default testObPhemex;
