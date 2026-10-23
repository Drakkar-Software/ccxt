
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OBIPWhitelistError, PermissionDenied, InvalidNonce, BadSymbol } from '../../../base/errors.js';
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
        assert.strictEqual (ex.options.octobot.closedOrdersFetchUseCcxtPaginate, true);
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
    // parseOrder branch P7: take_stop_market + sell -> stop_loss, triggerAbove=false (no creation price required)
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'type': 'take_stop_market', 'side': 'sell', 'price': 40000, 'stopLossPrice': 39000 };
        };
        try {
            const parsed = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['price'], 39000);
            assert.strictEqual (parsed['triggerAbove'], false);
            assert.strictEqual (parsed['stopPrice'], undefined);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch P8: take_stop_market + buy -> stop_loss, triggerAbove=true (no creation price required)
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'type': 'take_stop_market', 'side': 'buy', 'price': 40000, 'stopLossPrice': 41000 };
        };
        try {
            const parsed = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['price'], 41000);
            assert.strictEqual (parsed['triggerAbove'], true);
            assert.strictEqual (parsed['stopPrice'], undefined);
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
    // parseTrade branch T7: mirror P7
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': {}, 'type': 'take_stop_market', 'side': 'sell', 'price': 40000, 'stopLossPrice': 39000 };
        };
        try {
            const parsed = ex.parseTrade ({}, undefined);
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['price'], 39000);
            assert.strictEqual (parsed['triggerAbove'], false);
            assert.strictEqual (parsed['stopPrice'], undefined);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch T8: mirror P8
    {
        const ex = new ccxt.ob_bingx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': {}, 'type': 'take_stop_market', 'side': 'buy', 'price': 40000, 'stopLossPrice': 41000 };
        };
        try {
            const parsed = ex.parseTrade ({}, undefined);
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['price'], 41000);
            assert.strictEqual (parsed['triggerAbove'], true);
            assert.strictEqual (parsed['stopPrice'], undefined);
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
    // fetchClosedOrders paginate delegates to fetchPaginatedCallDynamic for spot
    {
        const ex = new ccxt.bingx ({ 'options': { 'defaultType': 'spot' } });
        const parentProto = Object.getPrototypeOf (ex);
        const orig = parentProto.fetchPaginatedCallDynamic;
        let paginateDelegated = false;
        parentProto.fetchPaginatedCallDynamic = async function (method, symbol, since, limit, params, maxLimit) {
            paginateDelegated = true;
            assert.strictEqual (method, 'fetchClosedOrders');
            assert.strictEqual (symbol, 'SOL/USDT');
            return [
                {
                    'symbol': 'SOL/USDT',
                    'id': '1',
                    'timestamp': 1700000000000,
                    'datetime': ex.iso8601 (1700000000000),
                    'type': 'limit',
                    'side': 'buy',
                    'amount': 1,
                    'price': 50,
                    'cost': 50,
                    'status': 'closed',
                    'info': {},
                },
                {
                    'symbol': 'SOL/USDT',
                    'id': '2',
                    'timestamp': 1700000000001,
                    'datetime': ex.iso8601 (1700000000001),
                    'type': 'limit',
                    'side': 'sell',
                    'amount': 1,
                    'price': 55,
                    'cost': 55,
                    'status': 'closed',
                    'info': {},
                },
            ];
        };
        try {
            const orders = await ex.fetchClosedOrders ('SOL/USDT', undefined, 100, { paginate: true });
            assert.strictEqual (paginateDelegated, true);
            assert.strictEqual (orders.length, 2);
        } finally {
            parentProto.fetchPaginatedCallDynamic = orig;
        }
    }
    // fetchClosedOrders paginate merges two spot API pages
    {
        const ex = new ccxt.bingx ({ 'options': { 'defaultType': 'spot' } });
        ex.loadMarkets = async () => ({});
        ex.markets = {
            'SOL/USDT': {
                'id': 'SOL-USDT',
                'symbol': 'SOL/USDT',
                'base': 'SOL',
                'quote': 'USDT',
                'type': 'spot',
                'spot': true,
                'swap': false,
            },
        };
        ex.symbols = [ 'SOL/USDT' ];
        let callCount = 0;
        ex.spotV1PrivateGetTradeHistoryOrders = async (request) => {
            callCount++;
            if (callCount === 2) {
                assert (request['endTime'] !== undefined);
            }
            const orderCount = callCount === 1 ? 100 : 30;
            const orders = [];
            for (let orderIndex = 0; orderIndex < orderCount; orderIndex++) {
                const time = 1700000000000 - (callCount * 100000 + orderIndex * 1000);
                orders.push ({
                    'symbol': 'SOL-USDT',
                    'orderId': callCount * 100000 + orderIndex,
                    'price': '50',
                    'origQty': '1',
                    'executedQty': '1',
                    'cummulativeQuoteQty': '50',
                    'status': 'FILLED',
                    'type': 'LIMIT',
                    'side': 'BUY',
                    'time': time,
                    'updateTime': time,
                });
            }
            return {
                'code': 0,
                'msg': '',
                'data': {
                    'orders': orders,
                    'total': orderCount,
                },
            };
        };
        const orders = await ex.fetchClosedOrders ('SOL/USDT', undefined, 130, {
            'paginate': true,
            'paginationCalls': 2,
        });
        assert.strictEqual (callCount, 2);
        assert (orders.length > 100);
        assert.strictEqual (orders[0].status, 'closed');
    }
    // adjustForTimeDifference: octobot option enabled for connector time sync
    {
        const ex = new ccxt.ob_bingx ();
        assert.strictEqual (ex.options['octobot']['adjustForTimeDifference'], true);
    }
    // nonce: default timeDifference 0 -> raw milliseconds
    {
        const ex = new ccxt.ob_bingx ();
        ex.milliseconds = () => 2000;
        assert.strictEqual (ex.nonce (), 2000);
    }
    // nonce: subtracts options.timeDifference
    {
        const ex = new ccxt.ob_bingx ();
        ex.milliseconds = () => 2000;
        ex.options['timeDifference'] = 500;
        assert.strictEqual (ex.nonce (), 1500);
    }
    // handleErrors: 100421 timestamp mismatch -> InvalidNonce
    {
        const ex = new ccxt.ob_bingx ();
        const body = '{"code":100421,"msg":"Null timestamp or timestamp mismatch","timestamp":1787900738376}';
        const response = { 'code': 100421, 'msg': 'Null timestamp or timestamp mismatch', 'timestamp': 1787900738376 };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', 'https://api.bingx.com', 'GET', {}, body, response, {}, undefined);
        }, InvalidNonce);
    }
    // handleErrors: 100421 pair restriction -> BadSymbol
    {
        const ex = new ccxt.ob_bingx ();
        const body = '{"code":100421,"msg":"This pair is currently restricted from API trading","debugMsg":""}';
        const response = { 'code': 100421, 'msg': 'This pair is currently restricted from API trading', 'debugMsg': '' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', 'https://api.bingx.com', 'GET', {}, body, response, {}, undefined);
        }, BadSymbol);
    }
}

export default testObBingx;
