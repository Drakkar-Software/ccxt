
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OrderNotFound, PermissionDenied } from '../../../base/errors.js';
import { AuthenticationError, ExchangeError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

async function testObCoinbase () {
    {
        const ex = new ccxt.ob_coinbase ();
        assertObExchangeId (ex, 'ob_coinbase');
    }
    {
        const ex = new ccxt.ob_coinbase ();
        ex.cancelOrder = async () => ({} as any);
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_coinbase ();
        ex.cancelOrder = async () => {
            throw new AuthenticationError ('permission denied');
        };
        await assert.rejects (async () => {
            await ex.fetchPermissions ();
        }, AuthenticationError);
    }
    {
        const ex = new ccxt.ob_coinbase ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('some failure');
        };
        const rights = await ex.fetchPermissions ();
        assert (rights.indexOf ('spotTrading') >= 0);
    }
    {
        const ex = new ccxt.ob_coinbase ();
        assert.strictEqual (ex.supportsNativeEditOrder ('STOP_LOSS', 'BTC/USDT'), false);
        assert.strictEqual (ex.supportsNativeEditOrder ('STOP_LOSS_LIMIT', 'BTC/USDT'), false);
        assert.strictEqual (ex.supportsNativeEditOrder ('LIMIT', 'BTC/USDT'), true);
    }
    {
        const ex = new ccxt.ob_coinbase ();
        assert.strictEqual (ex.options['brokerId'], 'octobot');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['brokerId'], 'octobot');
    }
    {
        const ex = new ccxt.ob_coinbase ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.fetchBalance;
        let capturedParams: any = undefined;
        parentProto.fetchBalance = async function (params = {}) {
            capturedParams = params;
            return {};
        };
        try {
            await ex.fetchBalance ({});
            assert.strictEqual (capturedParams['v3'], true);
            await ex.fetchBalance ({ 'v3': false });
            assert.strictEqual (capturedParams['v3'], false);
        } finally {
            parentProto.fetchBalance = orig;
        }
    }
    {
        const ex = new ccxt.ob_coinbase ();
        const accounts = [
            { 'info': { 'retail_portfolio_id': 'rp1', 'created_at': '2020-01-01T00:00:00Z' } },
        ];
        ex.fetchAccounts = async () => (accounts as any);
        assert.strictEqual (await ex.fetchAccountId (), 'rp1');
    }
    {
        const ex = new ccxt.ob_coinbase ();
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', { 'CB-ACCESS-SIGN': 'x' }, undefined), true);
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', { 'Authorization': 'Bearer x' }, undefined), true);
    }
    {
        const ex = new ccxt.ob_coinbase ();
        const response = { 'error': 'unknown', 'error_description': 'Missing required scopes' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"error":"unknown","error_description":"Missing required scopes"}', response, {}, undefined);
        }, PermissionDenied);
    }
    {
        const ex = new ccxt.ob_coinbase ();
        const response = { 'errors': [{ 'id': 'not_found', 'message': 'order with this orderID was not found' }] };
        assert.throws (() => {
            ex.handleErrors (404, 'Not Found', '', 'GET', {}, '{"errors":[{"id":"not_found","message":"order with this orderID was not found"}]}', response, {}, undefined);
        }, OrderNotFound);
    }
    // obQuoteFromSymbol branch Q1: spot symbol 'BTC/USDT' -> 'USDT'
    {
        const ex = new ccxt.ob_coinbase ();
        assert.strictEqual (ex.obQuoteFromSymbol ('BTC/USDT'), 'USDT');
    }
    // obQuoteFromSymbol branch Q2: futures symbol 'BTC/USDT:USDT' -> 'USDT' (settle suffix stripped)
    {
        const ex = new ccxt.ob_coinbase ();
        assert.strictEqual (ex.obQuoteFromSymbol ('BTC/USDT:USDT'), 'USDT');
    }
    // obQuoteFromSymbol branch Q3: empty / no slash -> ''
    {
        const ex = new ccxt.ob_coinbase ();
        assert.strictEqual (ex.obQuoteFromSymbol (''), '');
        assert.strictEqual (ex.obQuoteFromSymbol ('BTCUSDT'), '');
    }
    // adaptStopOrderTypeAndPrice branch S1: no stopPrice -> no change
    {
        const ex = new ccxt.ob_coinbase ();
        const parsed: any = { 'type': 'limit', 'side': 'buy', 'price': 100 };
        ex.adaptStopOrderTypeAndPrice (parsed);
        assert.strictEqual (parsed['type'], 'limit');
        assert.strictEqual (parsed['price'], 100);
        assert.strictEqual (parsed['triggerAbove'], undefined);
    }
    // adaptStopOrderTypeAndPrice branch S2: stopPrice + sell + STOP_DIRECTION_STOP_DOWN -> stop_loss, triggerAbove=false
    {
        const ex = new ccxt.ob_coinbase ();
        const parsed: any = {
            'info': { 'order_configuration': { 'stop_limit_stop_limit_gtc': { 'stop_direction': 'STOP_DIRECTION_STOP_DOWN' } } },
            'type': undefined,
            'side': 'sell',
            'stopPrice': 50000,
            'price': 49000,
        };
        ex.adaptStopOrderTypeAndPrice (parsed);
        assert.strictEqual (parsed['type'], 'stop_loss');
        assert.strictEqual (parsed['price'], 50000);
        assert.strictEqual (parsed['triggerAbove'], false);
    }
    // adaptStopOrderTypeAndPrice branch S3: stopPrice + sell + STOP_DIRECTION_STOP_UP -> limit (TP), triggerAbove=true
    {
        const ex = new ccxt.ob_coinbase ();
        const parsed: any = {
            'info': { 'order_configuration': { 'stop_limit_stop_limit_gtc': { 'stop_direction': 'STOP_DIRECTION_STOP_UP' } } },
            'type': undefined,
            'side': 'sell',
            'stopPrice': 50000,
            'price': 49000,
        };
        ex.adaptStopOrderTypeAndPrice (parsed);
        assert.strictEqual (parsed['type'], 'limit');
        assert.strictEqual (parsed['price'], 50000);
        assert.strictEqual (parsed['triggerAbove'], true);
    }
    // adaptStopOrderTypeAndPrice branch S4: stopPrice + buy + STOP_DIRECTION_STOP_UP -> stop_loss, triggerAbove=true
    {
        const ex = new ccxt.ob_coinbase ();
        const parsed: any = {
            'info': { 'order_configuration': { 'stop_limit_stop_limit_gtd': { 'stop_direction': 'STOP_DIRECTION_STOP_UP' } } },
            'type': undefined,
            'side': 'buy',
            'stopPrice': 50000,
            'price': 49000,
        };
        ex.adaptStopOrderTypeAndPrice (parsed);
        assert.strictEqual (parsed['type'], 'stop_loss');
        assert.strictEqual (parsed['price'], 50000);
        assert.strictEqual (parsed['triggerAbove'], true);
    }
    // adaptStopOrderTypeAndPrice branch S5: stopPrice + buy + STOP_DIRECTION_STOP_DOWN -> limit (TP), triggerAbove=false
    {
        const ex = new ccxt.ob_coinbase ();
        const parsed: any = {
            'info': { 'order_configuration': { 'stop_limit_stop_limit_gtc': { 'stop_direction': 'STOP_DIRECTION_STOP_DOWN' } } },
            'type': undefined,
            'side': 'buy',
            'stopPrice': 50000,
            'price': 49000,
        };
        ex.adaptStopOrderTypeAndPrice (parsed);
        assert.strictEqual (parsed['type'], 'limit');
        assert.strictEqual (parsed['price'], 50000);
        assert.strictEqual (parsed['triggerAbove'], false);
    }
    // parseOrder branch O1: type undefined + stopPrice -> 'stop_loss'
    {
        const ex = new ccxt.ob_coinbase ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': 'BTC/USDT', 'type': undefined, 'side': 'sell', 'price': 49000, 'stopPrice': 50000, 'status': 'open',
                'info': { 'order_configuration': { 'stop_limit_stop_limit_gtc': { 'stop_direction': 'STOP_DIRECTION_STOP_DOWN' } } } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O2: type undefined + price=undefined + no stopPrice -> 'market'
    {
        const ex = new ccxt.ob_coinbase ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': 'BTC/USDT', 'type': undefined, 'side': 'buy', 'price': undefined, 'status': 'open' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'market');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O3: type undefined + price set + no stopPrice -> 'limit'
    {
        const ex = new ccxt.ob_coinbase ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': 'BTC/USDT', 'type': undefined, 'side': 'buy', 'price': 100, 'status': 'open' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'limit');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O4: status 'PENDING' -> 'pending_creation'
    {
        const ex = new ccxt.ob_coinbase ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': 'BTC/USDT', 'type': 'limit', 'side': 'buy', 'price': 100, 'status': 'PENDING' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['status'], 'pending_creation');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O5: status 'CANCEL_QUEUED' -> 'pending_cancel'
    {
        const ex = new ccxt.ob_coinbase ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': 'BTC/USDT', 'type': 'limit', 'side': 'buy', 'price': 100, 'status': 'CANCEL_QUEUED' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['status'], 'pending_cancel');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O6: amount undefined + filled -> amount=filled
    {
        const ex = new ccxt.ob_coinbase ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': 'BTC/USDT', 'type': 'limit', 'side': 'buy', 'price': 100, 'status': 'open', 'amount': undefined, 'filled': 7 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['amount'], 7);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O7: fee with no currency + symbol with quote -> fee.currency = quote
    {
        const ex = new ccxt.ob_coinbase ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': 'BTC/USDT', 'type': 'limit', 'side': 'buy', 'price': 100, 'status': 'open', 'fee': { 'cost': 0.5 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['fee']['currency'], 'USDT');
            assert.strictEqual (parsed['fee']['cost'], 0.5);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseTrade branch T1: adapt stop type, force closed status, amount fallback from cost / price
    {
        const ex = new ccxt.ob_coinbase ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return {
                'info': { 'order_configuration': { 'stop_limit_stop_limit_gtc': { 'stop_direction': 'STOP_DIRECTION_STOP_DOWN' } } },
                'symbol': 'BTC/USDT',
                'type': undefined,
                'side': 'sell',
                'price': 49000,
                'stopPrice': 50000,
                'amount': undefined,
                'cost': 100000,
            };
        };
        try {
            const parsed: any = ex.parseTrade ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['price'], 50000);
            assert.strictEqual (parsed['status'], 'closed');
            assert.strictEqual (parsed['amount'], 2);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
}

export default testObCoinbase;
