
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OrderNotFound } from '../../../base/errors.js';
import { ExchangeError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

async function testObCoinex () {
    {
        const ex = new ccxt.ob_coinex ();
        assertObExchangeId (ex, 'ob_coinex');
    }
    {
        const ex = new ccxt.ob_coinex ();
        ex.cancelOrder = async () => ({} as any);
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_coinex ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('x');
        };
        const rights = await ex.fetchPermissions ();
        assert (rights.indexOf ('spotTrading') >= 0);
    }
    {
        const ex = new ccxt.ob_coinex ();
        assert.strictEqual (ex.options['brokerId'], 'x-124998316');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['brokerId'], 'x-124998316');
    }
    {
        const ex = new ccxt.ob_coinex ();
        assert.strictEqual (await ex.fetchAccountId (), 'default_account_id');
    }
    {
        const ex = new ccxt.ob_coinex ();
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', { 'Authorization': 'x' }, undefined), true);
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', { 'X-COINEX-SIGN': 'x' }, undefined), true);
    }
    {
        const ex = new ccxt.ob_coinex ();
        const response = { 'code': 999999, 'message': 'Order not found', 'data': undefined };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":999999,"message":"Order not found"}', response, {}, undefined);
        }, OrderNotFound);
    }
    // obAdaptAmountFromFilledOrCost branch A1: market+buy+filled -> amount=filled
    {
        const ex = new ccxt.ob_coinex ();
        const parsed: any = { 'type': 'market', 'side': 'buy', 'amount': 0, 'filled': 9, 'cost': undefined, 'price': undefined };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 9);
    }
    // parseOrder branch O1: status undefined -> 'closed'
    {
        const ex = new ccxt.ob_coinex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'type': 'limit', 'side': 'buy', 'status': undefined, 'amount': 1 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['status'], 'closed');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O2: status 'part_filled' -> 'open'
    {
        const ex = new ccxt.ob_coinex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'type': 'limit', 'side': 'buy', 'status': 'part_filled', 'amount': 1 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['status'], 'open');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O3: status 'part_canceled' -> 'canceled'
    {
        const ex = new ccxt.ob_coinex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'type': 'limit', 'side': 'buy', 'status': 'part_canceled', 'amount': 1 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['status'], 'canceled');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O4: type 'maker_only' -> 'limit_maker'
    {
        const ex = new ccxt.ob_coinex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'type': 'maker_only', 'side': 'buy', 'status': 'open', 'amount': 1 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'limit_maker');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O5: status 'open' + non-maker_only type -> unchanged
    {
        const ex = new ccxt.ob_coinex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'type': 'limit', 'side': 'buy', 'status': 'open', 'amount': 1 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['status'], 'open');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseTrade branch T1: missing fee.currency / fee.cost -> filled from info.fee_ccy / info.fee
    {
        const ex = new ccxt.ob_coinex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': { 'fee_ccy': 'USDT', 'fee': '0.123' }, 'fee': undefined };
        };
        try {
            const parsed: any = ex.parseTrade ({});
            assert.strictEqual (parsed['fee']['currency'], 'USDT');
            assert.strictEqual (parsed['fee']['cost'], 0.123);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch T2: existing fee.currency / fee.cost preserved
    {
        const ex = new ccxt.ob_coinex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': { 'fee_ccy': 'USDT', 'fee': '0.123' }, 'fee': { 'currency': 'USDC', 'cost': 0.5 } };
        };
        try {
            const parsed: any = ex.parseTrade ({});
            assert.strictEqual (parsed['fee']['currency'], 'USDC');
            assert.strictEqual (parsed['fee']['cost'], 0.5);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTicker branch K1: super returns no timestamp -> milliseconds() fallback applied
    {
        const ex = new ccxt.ob_coinex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () { return { 'symbol': 'BTC/USDT' }; };
        try {
            ex.milliseconds = () => 1700000000000;
            const parsed: any = ex.parseTicker ({});
            assert.strictEqual (parsed['timestamp'], 1700000000000);
        } finally {
            parentProto.parseTicker = orig;
        }
    }
    // parseTicker branch K2: super returns timestamp -> preserved
    {
        const ex = new ccxt.ob_coinex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () { return { 'symbol': 'BTC/USDT', 'timestamp': 8888 }; };
        try {
            ex.milliseconds = () => 1700000000000;
            const parsed: any = ex.parseTicker ({});
            assert.strictEqual (parsed['timestamp'], 8888);
        } finally {
            parentProto.parseTicker = orig;
        }
    }
}

export default testObCoinex;
