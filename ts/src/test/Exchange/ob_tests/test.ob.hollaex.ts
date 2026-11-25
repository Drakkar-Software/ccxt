
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OBMaxOpenOrdersReached } from '../../../base/errors.js';
import { ExchangeError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

async function testObHollaex () {
    {
        const ex = new ccxt.ob_hollaex ();
        assertObExchangeId (ex, 'ob_hollaex');
        assert.strictEqual (ex.options['octobot']['computeMarketStatusCostLimits'], true);
        assert.strictEqual (ex.options.octobot.myTradesFetchUseCcxtPaginate, true);
    }
    {
        const ex = new ccxt.ob_hollaex ();
        ex.cancelOrder = async () => ({} as any);
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_hollaex ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('fail');
        };
        const rights = await ex.fetchPermissions ();
        assert (rights.indexOf ('spotTrading') >= 0);
    }
    {
        const ex = new ccxt.ob_hollaex ();
        assert.strictEqual (ex.getMaxOpenOrdersCount ('BTC/USDT'), 50);
    }
    {
        const ex = new ccxt.ob_hollaex ();
        ex.privateGetUser = async () => ({ 'id': 'u42' });
        assert.strictEqual (await ex.fetchAccountId (), 'u42');
    }
    {
        const ex = new ccxt.ob_hollaex ();
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', { 'api-signature': 'x' }, undefined), true);
    }
    {
        const ex = new ccxt.ob_hollaex ();
        const response = { 'message': 'You are only allowed to have maximum 50 active orders per market' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"message":"You are only allowed to have maximum 50 active orders per market"}', response, {}, undefined);
        }, OBMaxOpenOrdersReached);
    }
    // parseOrder branch O1: missing price + info.average -> price=info.average
    {
        const ex = new ccxt.ob_hollaex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'average': 49500 }, 'price': undefined, 'type': 'limit', 'side': 'buy' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['price'], 49500);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O2: triggerPrice set -> type='stop_loss'
    {
        const ex = new ccxt.ob_hollaex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'price': 100, 'type': 'limit', 'side': 'sell', 'triggerPrice': 90 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O3: info.fee_coin + fee dict -> fee.currency = fee_coin.toUpperCase()
    {
        const ex = new ccxt.ob_hollaex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'fee_coin': 'usdt' }, 'fee': { 'currency': 'XYZ', 'cost': 0.1 }, 'price': 100, 'type': 'limit', 'side': 'buy' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['fee']['currency'], 'USDT');
            assert.strictEqual (parsed['fee']['cost'], 0.1);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O4: info.fee_coin without fee dict -> no override
    {
        const ex = new ccxt.ob_hollaex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'fee_coin': 'usdt' }, 'fee': undefined, 'price': 100, 'type': 'limit', 'side': 'buy' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['fee'], undefined);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseTicker branch K1: super returns no timestamp -> milliseconds() fallback applied
    {
        const ex = new ccxt.ob_hollaex ();
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
        const ex = new ccxt.ob_hollaex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () { return { 'symbol': 'BTC/USDT', 'timestamp': 6666 }; };
        try {
            ex.milliseconds = () => 1700000000000;
            const parsed: any = ex.parseTicker ({});
            assert.strictEqual (parsed['timestamp'], 6666);
        } finally {
            parentProto.parseTicker = orig;
        }
    }
}

export default testObHollaex;
