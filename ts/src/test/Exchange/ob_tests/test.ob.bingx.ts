
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OBIPWhitelistError, PermissionDenied } from '../../../base/errors.js';
import { AuthenticationError, ExchangeError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObBingx () {
    {
        const ex = new ccxt.ob_bingx ();
        assertObExchangeId (ex, 'ob_bingx');
    }
    {
        const ex = new ccxt.ob_bingx ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('incorrect apikey something');
        };
        await assert.rejects (async () => {
            await ex.fetchPermissions ();
        }, AuthenticationError);
    }
    {
        const ex = new ccxt.ob_bingx ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('not found');
        };
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'marginTrading', 'futuresTrading' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_bingx ();
        assert.strictEqual (ex.options['broker'], 'OctoBot');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['broker'], 'OctoBot');
    }
    {
        const ex = new ccxt.ob_bingx ();
        ex.accountV1PrivateGetUid = async () => ({ 'data': { 'uid': 'bingx-uid' } });
        assert.strictEqual (await ex.fetchAccountId (), 'bingx-uid');
    }
    {
        const ex = new ccxt.ob_bingx ();
        assert.strictEqual (
            ex.isAuthenticatedRequest ('https://h/signature=x', 'GET', {}, undefined),
            true,
        );
        assert.strictEqual (
            ex.isAuthenticatedRequest ('https://h', 'GET', { 'Signature': 'x' }, undefined),
            true,
        );
        assert.strictEqual (ex.isAuthenticatedRequest ('https://h', 'GET', {}, undefined), false);
    }
    {
        const ex = new ccxt.ob_bingx ();
        const response = { 'code': 100419, 'msg': 'your current request IP is 1.1.1.1 does not match IP whitelist' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":100419,"msg":"your current request IP is 1.1.1.1 does not match IP whitelist"}', response, {}, undefined);
        }, OBIPWhitelistError);
    }
    {
        const ex = new ccxt.ob_bingx ();
        const response = {
            'code': 999999,
            'msg': 'Permission denied as the API key was created without the permission, this api need Spot Trading permission',
        };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":999999,"msg":"Permission denied as the API key was created without the permission, this api need Spot Trading permission"}', response, {}, undefined);
        }, PermissionDenied);
    }
    // parseOrder branch P1: no stopLossPrice -> no override
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'price': '40000' }, 'type': 'limit', 'side': 'buy', 'price': 40000 };
        };
        try {
            const parsed = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['price'], 40000);
            assert.strictEqual (parsed['triggerAbove'], undefined);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch P2: take_stop_limit type with stopLossPrice -> 'unsupported'
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'price': '40000' }, 'type': 'take_stop_limit', 'side': 'sell', 'price': 40000, 'stopLossPrice': 39000 };
        };
        try {
            const parsed = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'unsupported');
            assert.strictEqual (parsed['price'], 39000);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch P3: stopPrice <= creation + sell -> stop_loss, triggerAbove=false
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'price': '40000' }, 'type': 'limit', 'side': 'sell', 'price': 40000, 'stopLossPrice': 39000 };
        };
        try {
            const parsed = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['price'], 39000);
            assert.strictEqual (parsed['stopPrice'], 39000);
            assert.strictEqual (parsed['triggerAbove'], false);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch P4: stopPrice <= creation + buy -> limit, triggerAbove=false
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'price': '40000' }, 'type': 'limit', 'side': 'buy', 'price': 40000, 'stopLossPrice': 39000 };
        };
        try {
            const parsed = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['price'], 39000);
            assert.strictEqual (parsed['triggerAbove'], false);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch P5: stopPrice > creation + sell -> limit, triggerAbove=true
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'price': '40000' }, 'type': 'limit', 'side': 'sell', 'price': 40000, 'stopLossPrice': 41000 };
        };
        try {
            const parsed = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['price'], 41000);
            assert.strictEqual (parsed['triggerAbove'], true);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch P6: stopPrice > creation + buy -> stop_loss, triggerAbove=true
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'price': '40000' }, 'type': 'limit', 'side': 'buy', 'price': 40000, 'stopLossPrice': 41000 };
        };
        try {
            const parsed = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['price'], 41000);
            assert.strictEqual (parsed['stopPrice'], 41000);
            assert.strictEqual (parsed['triggerAbove'], true);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseTrade branch T1: mirror P1 (no stopLossPrice -> no override)
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': { 'price': '40000' }, 'type': 'limit', 'side': 'buy', 'price': 40000 };
        };
        try {
            const parsed = ex.parseTrade ({}, undefined);
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['price'], 40000);
            assert.strictEqual (parsed['triggerAbove'], undefined);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch T2: mirror P2
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': { 'price': '40000' }, 'type': 'take_stop_limit', 'side': 'sell', 'price': 40000, 'stopLossPrice': 39000 };
        };
        try {
            const parsed = ex.parseTrade ({}, undefined);
            assert.strictEqual (parsed['type'], 'unsupported');
            assert.strictEqual (parsed['price'], 39000);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch T3: mirror P3
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': { 'price': '40000' }, 'type': 'limit', 'side': 'sell', 'price': 40000, 'stopLossPrice': 39000 };
        };
        try {
            const parsed = ex.parseTrade ({}, undefined);
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['price'], 39000);
            assert.strictEqual (parsed['stopPrice'], 39000);
            assert.strictEqual (parsed['triggerAbove'], false);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch T4: mirror P4
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': { 'price': '40000' }, 'type': 'limit', 'side': 'buy', 'price': 40000, 'stopLossPrice': 39000 };
        };
        try {
            const parsed = ex.parseTrade ({}, undefined);
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['price'], 39000);
            assert.strictEqual (parsed['triggerAbove'], false);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch T5: mirror P5
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': { 'price': '40000' }, 'type': 'limit', 'side': 'sell', 'price': 40000, 'stopLossPrice': 41000 };
        };
        try {
            const parsed = ex.parseTrade ({}, undefined);
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['price'], 41000);
            assert.strictEqual (parsed['triggerAbove'], true);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch T6: mirror P6
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': { 'price': '40000' }, 'type': 'limit', 'side': 'buy', 'price': 40000, 'stopLossPrice': 41000 };
        };
        try {
            const parsed = ex.parseTrade ({}, undefined);
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['price'], 41000);
            assert.strictEqual (parsed['stopPrice'], 41000);
            assert.strictEqual (parsed['triggerAbove'], true);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseMarket branch M1: amount limits are nulled out (min=0, max=undefined)
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseMarket;
        parentProto.parseMarket = function () {
            return { 'symbol': 'BTC/USDT', 'limits': { 'amount': { 'min': 0.001, 'max': 1000 }, 'price': { 'min': 1 } } };
        };
        try {
            const parsed = ex.parseMarket ({});
            assert.strictEqual (parsed['limits']['amount']['min'], 0);
            assert.strictEqual (parsed['limits']['amount']['max'], undefined);
            assert.strictEqual (parsed['limits']['price']['min'], 1);
        } finally {
            parentProto.parseMarket = orig;
        }
    }
}

export default testObBingx;
