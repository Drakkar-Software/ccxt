
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
    // createOrder: spot Market strips price passed to underlying (phemex_exchange.py parity)
    {
        const ex = new ccxt.ob_phemex ({});
        ex.loadMarkets = async () => ({});
        ex.markets = {
            'BTC/USDT': {
                id: 's',
                symbol: 'BTC/USDT',
                spot: true,
                swap: false,
                base: 'BTC',
                quote: 'USDT',
            },
            'BTC/USDT:USDT': {
                id: 'c',
                symbol: 'BTC/USDT:USDT',
                spot: false,
                swap: true,
                base: 'BTC',
                quote: 'USDT',
                settle: 'USDT',
            },
        };
        const forwarded: { symbol: string; type: string; price: unknown }[] = [];
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.createOrder;
        parentProto.createOrder = async function (sym: string, typ: string, side: string, amt: number, prc: any, prms: any) {
            forwarded.push ({ symbol: sym, type: typ, price: prc });
            return {} as any;
        };
        try {
            await ex.createOrder ('BTC/USDT', 'market', 'buy', 1, 50, {});
            await ex.createOrder ('BTC/USDT:USDT', 'market', 'buy', 1, 77, {});
            await ex.createOrder ('BTC/USDT', 'limit', 'buy', 1, 88, {});
            assert.strictEqual (forwarded[0]['symbol'], 'BTC/USDT');
            assert.strictEqual (forwarded[0]['type'], 'market');
            assert.strictEqual (forwarded[0]['price'], undefined);
            assert.strictEqual (forwarded[1]['symbol'], 'BTC/USDT:USDT');
            assert.strictEqual (forwarded[1]['price'], 77);
            assert.strictEqual (forwarded[2]['symbol'], 'BTC/USDT');
            assert.strictEqual (forwarded[2]['type'], 'limit');
            assert.strictEqual (forwarded[2]['price'], 88);
        } finally {
            parentProto.createOrder = orig;
        }
    }
    // cancelOrder: unified canceling -> canceled (phemex_exchange.py PENDING_CANCEL workaround at CCXT layer)
    {
        const ex = new ccxt.ob_phemex ({});
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const origCancel = parentProto.cancelOrder;
        parentProto.cancelOrder = async () => ({
            'id': 'oid1',
            'symbol': 'BTC/USDT',
            'status': 'canceling',
            'info': {},
        });
        try {
            const got: any = await ex.cancelOrder ('oid1', 'BTC/USDT');
            assert.strictEqual (got['status'], 'canceled');
        } finally {
            parentProto.cancelOrder = origCancel;
        }
    }
    // cancelOrder: other statuses pass through unchanged
    {
        const ex = new ccxt.ob_phemex ({});
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const origCancel = parentProto.cancelOrder;
        parentProto.cancelOrder = async () => ({
            'id': 'oid2',
            'symbol': 'BTC/USDT',
            'status': 'open',
            'info': {},
        });
        try {
            const got: any = await ex.cancelOrder ('oid2', 'BTC/USDT');
            assert.strictEqual (got['status'], 'open');
        } finally {
            parentProto.cancelOrder = origCancel;
        }
    }
}

export default testObPhemex;
