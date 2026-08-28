
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OBClosedPositionError, OBIPWhitelistError, OBOrderUncancellableError, PermissionDenied } from '../../../base/errors.js';
import { ExchangeError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObKucoin () {
    {
        const ex = new ccxt.ob_kucoin ();
        assertObExchangeId (ex, 'ob_kucoin');
    }
    {
        const ex = new ccxt.ob_kucoin ();
        assert.strictEqual (ex.options.octobot.myTradesFetchUseCcxtPaginate, true);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        ex.cancelOrder = async () => ({} as any);
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('permission denied trading');
        };
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('some other exchange failure');
        };
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'marginTrading', 'futuresTrading' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_kucoin ();
        assert.strictEqual (ex.options['partner']['spot']['id'], 'Octobot');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['partner']['spot']['id'], 'Octobot');
    }
    {
        const ex = new ccxt.ob_kucoin ();
        assert.strictEqual (ex.getMaxOpenOrdersCount ('BTC/USDT'), 100);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.fetchOpenOrders;
        let capturedLimit: number | undefined = undefined;
        parentProto.fetchOpenOrders = async function (_symbol, _since, limit, _params) {
            capturedLimit = limit;
            return [];
        };
        try {
            await ex.fetchOpenOrders ('BTC/USDT');
            assert.strictEqual (capturedLimit, 200);
        } finally {
            parentProto.fetchOpenOrders = orig;
        }
    }
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.fetchOpenOrders;
        let capturedLimit: number | undefined = undefined;
        parentProto.fetchOpenOrders = async function (_symbol, _since, limit, _params) {
            capturedLimit = limit;
            return [];
        };
        try {
            await ex.fetchOpenOrders ('BTC/USDT', undefined, 333);
            assert.strictEqual (capturedLimit, 333);
        } finally {
            parentProto.fetchOpenOrders = orig;
        }
    }
    {
        const ex = new ccxt.ob_kucoin ();
        assert.strictEqual (ex.supportsNativeEditOrder ('STOP_LOSS', 'BTC/USDT'), false);
        assert.strictEqual (ex.supportsNativeEditOrder ('LIMIT', 'BTC/USDT'), false);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        assert.strictEqual (ex.has['fetchStopOrderInDifferentRequest'], true);
        ex.market = () => ({}) as any;
        assert.strictEqual (ex.fetchStopOrderInDifferentRequest ('BTC/USDT'), true);
        assert.strictEqual (ex.fetchStopOrderInDifferentRequest ('ETH/USDT'), true);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', { 'KC-API-SIGN': 'x' }, undefined), true);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        ex.privateGetSubAccounts = async () => ({ 'data': { 'items': [] } });
        const aid = await ex.fetchAccountId ();
        assert.strictEqual (aid, 'default_account_id');
    }
    {
        const ex = new ccxt.ob_kucoin ();
        const response = { 'code': '400100', 'msg': 'order_not_exist_or_not_allow_to_cancel' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":"400100","msg":"order_not_exist_or_not_allow_to_cancel"}', response, {}, undefined);
        }, OBOrderUncancellableError);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        const response = { 'code': '300009', 'msg': 'No open positions to close.' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":"300009","msg":"No open positions to close."}', response, {}, undefined);
        }, OBClosedPositionError);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        const response = { 'code': '600004', 'msg': 'Unfortunately, trading is currently unavailable in your location due to country, region, or IP restrictions.' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":"600004","msg":"Unfortunately, trading is currently unavailable in your location due to country, region, or IP restrictions."}', response, {}, undefined);
        }, PermissionDenied);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        const response = { 'code': '999999', 'msg': 'Invalid request ip, the current clientIp is:1.1.1.1' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":"999999","msg":"Invalid request ip, the current clientIp is:1.1.1.1"}', response, {}, undefined);
        }, OBIPWhitelistError);
    }
    {
        const ex = new ccxt.ob_kucoin ();
        const response = { 'code': '999998', 'msg': 'Access denied, require more permission' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":"999998","msg":"Access denied, require more permission"}', response, {}, undefined);
        }, PermissionDenied);
    }
    // parseOrder branch O1: type 'liquid' -> 'market' (no info.stop)
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'type': 'liquid', 'side': 'buy', 'fee': { 'cost': 0.1, 'currency': 'USDT' } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'market');
            assert.strictEqual (parsed['triggerAbove'], undefined);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O2: info.stop='loss' + buy -> stop_loss + triggerAbove=true
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'stop': 'loss' }, 'type': 'limit', 'side': 'buy', 'price': 100, 'stopPrice': 50000, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['triggerAbove'], true);
            assert.strictEqual (parsed['price'], 100);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O3: info.stop='loss' + sell -> stop_loss + triggerAbove=false
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'stop': 'loss' }, 'type': 'limit', 'side': 'sell', 'price': 100, 'stopPrice': 50000, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['triggerAbove'], false);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O4: info.stop='entry' + buy -> isStopEntry path, falls into side=buy + triggerAbove=false -> 'limit'
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'stop': 'entry' }, 'type': 'limit', 'side': 'buy', 'price': 100, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['triggerAbove'], false);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O5: info.stop='up' + buy -> stop_loss (triggerAbove=true)
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'stop': 'up' }, 'type': 'limit', 'side': 'buy', 'price': 100, 'stopPrice': 50000, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['triggerAbove'], true);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O6: info.stop='up' + sell -> limit + price-fallback to stopPrice (TP placeholder)
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'stop': 'up' }, 'type': 'limit', 'side': 'sell', 'price': undefined, 'stopPrice': 50000, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['price'], 50000);
            assert.strictEqual (parsed['triggerAbove'], true);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O7: info.stop='down' + buy -> limit + price-fallback to stopPrice (TP placeholder)
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'stop': 'down' }, 'type': 'limit', 'side': 'buy', 'price': undefined, 'stopPrice': 50000, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['price'], 50000);
            assert.strictEqual (parsed['triggerAbove'], false);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O8: info.stop='down' + sell -> stop_loss (triggerAbove=false)
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'stop': 'down' }, 'type': 'limit', 'side': 'sell', 'price': 100, 'stopPrice': 50000, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['triggerAbove'], false);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O9: info.stop has unhandled direction -> no mutation
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'stop': 'unknown_direction' }, 'type': 'limit', 'side': 'buy', 'price': 100, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'limit');
            assert.strictEqual (parsed['triggerAbove'], undefined);
            assert.strictEqual (parsed['price'], 100);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O10: missing fee -> synthesized empty fee dict
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'type': 'limit', 'side': 'buy', 'price': 100, 'fee': undefined };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.deepStrictEqual (parsed['fee'], { 'cost': 0, 'currency': undefined, 'rate': undefined });
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseTrade branch T1: info.stop='loss' + sell -> stop_loss + triggerAbove=false
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': { 'stop': 'loss' }, 'type': 'limit', 'side': 'sell', 'price': 100, 'fee': { 'cost': 0.1 } };
        };
        try {
            const parsed: any = ex.parseTrade ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
            assert.strictEqual (parsed['triggerAbove'], false);
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch T2: type='liquid' + missing fee -> 'market' + synthesized fee
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'info': {}, 'type': 'liquid', 'side': 'buy', 'price': 100, 'fee': undefined };
        };
        try {
            const parsed: any = ex.parseTrade ({});
            assert.strictEqual (parsed['type'], 'market');
            assert.deepStrictEqual (parsed['fee'], { 'cost': 0, 'currency': undefined, 'rate': undefined });
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseFundingRate branch F1: super-returned nextFundingTimestamp set -> swap to previous + recompute next
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseFundingRate;
        parentProto.parseFundingRate = function () {
            return { 'symbol': 'BTC/USDT:USDT', 'nextFundingTimestamp': 1700000000000 };
        };
        try {
            const parsed: any = ex.parseFundingRate ({});
            assert.strictEqual (parsed['previousFundingTimestamp'], 1700000000000);
            assert.strictEqual (parsed['previousFundingDatetime'], ex.iso8601 (1700000000000));
            assert.strictEqual (parsed['nextFundingTimestamp'], 1700000000000 + 28800000);
            assert.strictEqual (parsed['nextFundingDatetime'], ex.iso8601 (1700000000000 + 28800000));
        } finally {
            parentProto.parseFundingRate = orig;
        }
    }
    // parseFundingRate branch F2: nextFundingTimestamp undefined -> no mutation
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseFundingRate;
        parentProto.parseFundingRate = function () {
            return { 'symbol': 'BTC/USDT:USDT' };
        };
        try {
            const parsed: any = ex.parseFundingRate ({});
            assert.strictEqual (parsed['previousFundingTimestamp'], undefined);
            assert.strictEqual (parsed['nextFundingTimestamp'], undefined);
        } finally {
            parentProto.parseFundingRate = orig;
        }
    }
    // fetchMarkets M1: info.minFunds raises limits.cost.min above quoteMinSize-derived min
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.fetchMarkets;
        parentProto.fetchMarkets = async function () {
            return [
                {
                    'limits': {
                        'cost': { 'min': 0.01 },
                        'leverage': {},
                        'amount': {},
                        'price': {},
                    },
                    'info': { 'minFunds': '0.5' },
                },
            ];
        };
        try {
            const markets: any = await ex.fetchMarkets ();
            assert.strictEqual (markets[0]['limits']['cost']['min'], 0.5);
        } finally {
            parentProto.fetchMarkets = orig;
        }
    }
    // fetchMarkets M2: existing cost.min stays when already above minFunds
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.fetchMarkets;
        parentProto.fetchMarkets = async function () {
            return [
                {
                    'limits': {
                        'cost': { 'min': 10 },
                        'leverage': {},
                        'amount': {},
                        'price': {},
                    },
                    'info': { 'minFunds': '0.1' },
                },
            ];
        };
        try {
            const markets: any = await ex.fetchMarkets ();
            assert.strictEqual (markets[0]['limits']['cost']['min'], 10);
        } finally {
            parentProto.fetchMarkets = orig;
        }
    }
    // fetchMarkets M3: no minFunds -> cost.min unchanged
    {
        const ex = new ccxt.ob_kucoin ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.fetchMarkets;
        parentProto.fetchMarkets = async function () {
            return [
                {
                    'limits': {
                        'cost': { 'min': 2 },
                        'leverage': {},
                        'amount': {},
                        'price': {},
                    },
                    'info': {},
                },
            ];
        };
        try {
            const markets: any = await ex.fetchMarkets ();
            assert.strictEqual (markets[0]['limits']['cost']['min'], 2);
        } finally {
            parentProto.fetchMarkets = orig;
        }
    }
}

export default testObKucoin;
