
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OBOrderUncancellableError, OrderImmediatelyFillable, PermissionDenied } from '../../../base/errors.js';
import { AuthenticationError, NotSupported } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObBinance () {
    {
        const ex = new ccxt.ob_binance ();
        assertObExchangeId (ex, 'ob_binance');
    }
    {
        const ex = new ccxt.ob_binance ();
        assert.strictEqual (ex.has['usesDemoTradingInsteadOfSandbox'], true);
        assert.strictEqual (ex.usesDemoTradingInsteadOfSandbox ('future'), true);
        assert.strictEqual (ex.usesDemoTradingInsteadOfSandbox ('futures'), true);
        assert.strictEqual (ex.usesDemoTradingInsteadOfSandbox ('FUTURES'), true);
        assert.strictEqual (ex.usesDemoTradingInsteadOfSandbox ('spot'), false);
        assert.strictEqual (ex.usesDemoTradingInsteadOfSandbox ('margin'), false);
        assert.strictEqual (ex.usesDemoTradingInsteadOfSandbox ('option'), false);
    }
    {
        const ex = new ccxt.ob_binance ();
        const response = {
            'enableReading': true,
            'enableSpotAndMarginTrading': true,
            'enableFutures': true,
            'enableWithdrawals': true,
            'enableInternalTransfer': true,
        };
        ex.sapiGetAccountApiRestrictions = async () => response;
        const rights = await ex.fetchPermissions ();
        const expected = [
            'reading',
            'spotTrading',
            'marginTrading',
            'futuresTrading',
            'withdrawals',
        ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_binance ({ 'options': { 'enableDemoTrading': true } });
        ex.sapiGetAccountApiRestrictions = async () => {
            throw new NotSupported ('not supported');
        };
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading', 'spotTrading', 'futuresTrading', 'marginTrading' ]);
    }
    {
        const ex = new ccxt.ob_binance ();
        ex.sapiGetAccountApiRestrictions = async () => {
            throw new Error ('Invalid something key');
        };
        await assert.rejects (async () => {
            await ex.fetchPermissions ();
        }, AuthenticationError);
    }
    {
        const ex = new ccxt.ob_binance ();
        assert.strictEqual (ex.options['broker']['spot'], 'x-HR452G85');
        assert.strictEqual (ex.options['broker']['swap'], 'x-uquVg2pc');
        assert.strictEqual (ex.options['broker']['future'], 'x-uquVg2pc');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['broker']['spot'], 'x-HR452G85');
        assert.strictEqual (ex.options['broker']['swap'], 'x-uquVg2pc');
        assert.strictEqual (ex.options['broker']['future'], 'x-uquVg2pc');
    }
    {
        const ex = new ccxt.ob_binance ();
        let helperCalls = 0;
        ex.obGetMaxOpenOrdersCountFromExchangeInfoFilters = () => {
            helperCalls++;
            return 77;
        };
        const n = ex.getMaxOpenOrdersCount ('ETH/USDT');
        assert.strictEqual (n, 77);
        assert.strictEqual (helperCalls, 1);
    }
    {
        const ex = new ccxt.ob_binance ();
        ex.market = ((symbol) => {
            if (symbol === 'BTC/USDT:USDT') {
                return { 'future': true } as any;
            }
            return { 'spot': true } as any;
        }) as any;
        assert.strictEqual (ex.supportsNativeEditOrder ('STOP_LOSS', 'BTC/USDT:USDT'), false);
        assert.strictEqual (ex.supportsNativeEditOrder ('STOP_LOSS_LIMIT', 'BTC/USDT:USDT'), false);
        assert.strictEqual (ex.supportsNativeEditOrder ('STOP_LOSS', 'BTC/USDT'), true);
        assert.strictEqual (ex.supportsNativeEditOrder ('limit', 'BTC/USDT:USDT'), true);
    }
    {
        const ex = new ccxt.ob_binance ();
        assert.strictEqual (ex.has['fetchStopOrderInDifferentRequest'], true);
    }
    {
        const ex = new ccxt.ob_binance ({ 'options': { 'defaultType': 'swap' } });
        ex.market = ((symbol) => {
            if (symbol === 'BTC/USDT:USDT') {
                return { 'inverse': false } as any;
            }
            if (symbol === 'BTC/USD:BTC') {
                return { 'inverse': true } as any;
            }
            return { 'spot': true, 'inverse': false } as any;
        }) as any;
        assert.strictEqual (ex.fetchStopOrderInDifferentRequest ('BTC/USDT:USDT'), true);
        assert.strictEqual (ex.fetchStopOrderInDifferentRequest ('BTC/USD:BTC'), false);
    }
    {
        const ex = new ccxt.ob_binance ({ 'options': { 'defaultType': 'spot' } });
        ex.market = () => ({ 'inverse': false } as any) as any;
        assert.strictEqual (ex.fetchStopOrderInDifferentRequest ('BTC/USDT'), false);
    }
    {
        const ex = new ccxt.ob_binance ();
        assert.strictEqual (ex.isAuthenticatedRequest ('https://x?a=1&signature=abc', 'GET', undefined, undefined), true);
        assert.strictEqual (ex.isAuthenticatedRequest ('https://x', 'GET', {}, ''), false);
    }
    {
        const ex = new ccxt.ob_binance ();
        ex.fetchBalance = async () => ({ 'info': { 'uid': 'u1' } } as any);
        const accountId = await ex.fetchAccountId ();
        assert.strictEqual (accountId, 'u1');
    }
    {
        const ex = new ccxt.ob_binance ();
        ex.fapiPrivateV3GetBalance = async () => ([{ 'accountAlias': 'f1' }]);
        const accountId = await ex.fetchAccountId ({ 'isFuture': true });
        assert.strictEqual (accountId, 'f1');
    }
    {
        const ex = new ccxt.ob_binance ();
        const spotUrl = 'https://api.binance.com/api/v3/order';
        const bodyUnknown = '{"code":-2011,"msg":"Unknown order sent."}';
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', spotUrl, 'DELETE', {}, bodyUnknown, { 'code': -2011, 'msg': 'Unknown order sent.' }, {}, undefined);
        }, OBOrderUncancellableError);
    }
    {
        const ex = new ccxt.ob_binance ();
        const spotUrl = 'https://api.binance.com/api/v3/order';
        const bodyTrigger = '{"code":-2021,"msg":"Order would immediately trigger."}';
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', spotUrl, 'POST', {}, bodyTrigger, { 'code': -2021, 'msg': 'Order would immediately trigger.' }, {}, undefined);
        }, OrderImmediatelyFillable);
    }
    {
        const ex = new ccxt.ob_binance ();
        const spotUrl = 'https://api.binance.com/api/v3/order';
        const bodyPerm = '{"code":-2015,"msg":"Invalid API-key, IP, or permissions for action."}';
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', spotUrl, 'GET', {}, bodyPerm, { 'code': -2015, 'msg': 'Invalid API-key, IP, or permissions for action.' }, {}, undefined);
        }, PermissionDenied);
    }
    // parseOrder branch A1: PENDING_NEW status is rewritten to 'open'
    {
        const ex = new ccxt.ob_binance ();
        const raw = {
            'symbol': 'BTCUSDT',
            'orderId': 1,
            'status': 'PENDING_NEW',
            'type': 'LIMIT',
            'side': 'BUY',
            'price': '100',
            'origQty': '1',
            'executedQty': '0',
            'time': 1700000000000,
        };
        const parsed = ex.parseOrder (raw);
        assert.strictEqual (parsed['status'], 'open');
        assert.strictEqual (parsed['type'], 'limit');
        assert.strictEqual (parsed['triggerAbove'], undefined);
    }
    // parseOrder branch A2: non-PENDING_NEW status is left to base parseOrderStatus (NEW -> open)
    {
        const ex = new ccxt.ob_binance ();
        const raw = {
            'symbol': 'BTCUSDT',
            'orderId': 1,
            'status': 'NEW',
            'type': 'LIMIT',
            'side': 'BUY',
            'price': '100',
            'origQty': '1',
            'executedQty': '0',
            'time': 1700000000000,
        };
        const parsed = ex.parseOrder (raw);
        assert.strictEqual (parsed['status'], 'open');
        assert.strictEqual (parsed['type'], 'limit');
        assert.strictEqual (parsed['triggerAbove'], undefined);
    }
    // parseOrder branch A3: integration on a spot stop-loss-limit, sell side
    {
        const ex = new ccxt.ob_binance ();
        const raw = {
            'symbol': 'BTCUSDT',
            'orderId': 2,
            'status': 'NEW',
            'type': 'STOP_LOSS_LIMIT',
            'side': 'SELL',
            'price': '49900',
            'stopPrice': '50000',
            'origQty': '1',
            'executedQty': '0',
            'time': 1700000000000,
        };
        const parsed = ex.parseOrder (raw);
        assert.strictEqual (parsed['status'], 'open');
        assert.strictEqual (parsed['type'], 'stop_loss');
        assert.strictEqual (parsed['price'], 50000);
        assert.strictEqual (parsed['triggerAbove'], false);
    }
    // adaptOrderType branch B1: non-stop / non-TP order is left untouched
    {
        const ex = new ccxt.ob_binance ();
        const parsed: any = {
            'info': { 'type': 'LIMIT' },
            'type': 'limit',
            'side': 'buy',
            'price': 100,
        };
        ex.adaptOrderType (parsed);
        assert.strictEqual (parsed['type'], 'limit');
        assert.strictEqual (parsed['price'], 100);
        assert.strictEqual (parsed['triggerAbove'], undefined);
    }
    // adaptOrderType branch B2: stop order without triggerPrice is left untouched
    {
        const ex = new ccxt.ob_binance ();
        const parsed: any = {
            'info': { 'type': 'STOP_LOSS' },
            'type': 'limit',
            'side': 'sell',
            'price': 100,
        };
        ex.adaptOrderType (parsed);
        assert.strictEqual (parsed['type'], 'limit');
        assert.strictEqual (parsed['price'], 100);
        assert.strictEqual (parsed['triggerAbove'], undefined);
    }
    // adaptOrderType branch B3: stop + buy + triggerPrice -> stop_loss, price=triggerPrice, triggerAbove=true
    {
        const ex = new ccxt.ob_binance ();
        const parsed: any = {
            'info': { 'type': 'STOP_LOSS_LIMIT' },
            'type': 'limit',
            'side': 'buy',
            'price': 100,
            'triggerPrice': 50000,
        };
        ex.adaptOrderType (parsed);
        assert.strictEqual (parsed['type'], 'stop_loss');
        assert.strictEqual (parsed['price'], 50000);
        assert.strictEqual (parsed['triggerAbove'], true);
    }
    // adaptOrderType branch B4: stop + sell + triggerPrice -> triggerAbove=false
    {
        const ex = new ccxt.ob_binance ();
        const parsed: any = {
            'info': { 'type': 'STOP_MARKET' },
            'type': 'market',
            'side': 'sell',
            'triggerPrice': 50000,
        };
        ex.adaptOrderType (parsed);
        assert.strictEqual (parsed['type'], 'stop_loss');
        assert.strictEqual (parsed['price'], 50000);
        assert.strictEqual (parsed['triggerAbove'], false);
    }
    // adaptOrderType branch B5: TP order without triggerPrice is left untouched
    {
        const ex = new ccxt.ob_binance ();
        const parsed: any = {
            'info': { 'type': 'TAKE_PROFIT' },
            'type': 'limit',
            'side': 'buy',
            'price': 100,
        };
        ex.adaptOrderType (parsed);
        assert.strictEqual (parsed['type'], 'limit');
        assert.strictEqual (parsed['price'], 100);
        assert.strictEqual (parsed['triggerAbove'], undefined);
    }
    // adaptOrderType branch B6: TP + buy + triggerPrice + no existing price -> limit, price=triggerPrice, triggerAbove=false
    {
        const ex = new ccxt.ob_binance ();
        const parsed: any = {
            'info': { 'type': 'TAKE_PROFIT' },
            'type': 'market',
            'side': 'buy',
            'triggerPrice': 50000,
        };
        ex.adaptOrderType (parsed);
        assert.strictEqual (parsed['type'], 'limit');
        assert.strictEqual (parsed['price'], 50000);
        assert.strictEqual (parsed['triggerAbove'], false);
    }
    // adaptOrderType branch B7: TP + sell + triggerPrice + existing price -> limit, price preserved, triggerAbove=true
    {
        const ex = new ccxt.ob_binance ();
        const parsed: any = {
            'info': { 'type': 'TAKE_PROFIT_LIMIT' },
            'type': 'limit',
            'side': 'sell',
            'price': 100,
            'triggerPrice': 50000,
        };
        ex.adaptOrderType (parsed);
        assert.strictEqual (parsed['type'], 'limit');
        assert.strictEqual (parsed['price'], 100);
        assert.strictEqual (parsed['triggerAbove'], true);
    }
    // adaptOrderType branch B8: info.orderType fallback when info.type is missing
    {
        const ex = new ccxt.ob_binance ();
        const parsed: any = {
            'info': { 'orderType': 'STOP_MARKET' },
            'type': 'market',
            'side': 'buy',
            'triggerPrice': 50000,
        };
        ex.adaptOrderType (parsed);
        assert.strictEqual (parsed['type'], 'stop_loss');
        assert.strictEqual (parsed['price'], 50000);
        assert.strictEqual (parsed['triggerAbove'], true);
    }
    // parseTrade branch C1: arbitrary super-returned trade -> status='closed' (overwrites existing)
    {
        const ex = new ccxt.ob_binance ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'symbol': 'BTC/USDT', 'amount': 1, 'price': 50000, 'status': 'pending' };
        };
        try {
            const parsed: any = ex.parseTrade ({});
            assert.strictEqual (parsed['status'], 'closed');
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseTrade branch C2: super-returned trade with no status -> status='closed'
    {
        const ex = new ccxt.ob_binance ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTrade;
        parentProto.parseTrade = function () {
            return { 'symbol': 'BTC/USDT', 'amount': 1, 'price': 50000 };
        };
        try {
            const parsed: any = ex.parseTrade ({});
            assert.strictEqual (parsed['status'], 'closed');
        } finally {
            parentProto.parseTrade = orig;
        }
    }
    // parseFundingRate branch D1: fundingTimestamp set -> previousFundingTimestamp = funding - 28800000 + datetime
    {
        const ex = new ccxt.ob_binance ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseFundingRate;
        parentProto.parseFundingRate = function () {
            return { 'symbol': 'BTC/USDT:USDT', 'fundingTimestamp': 1700000000000 };
        };
        try {
            const parsed: any = ex.parseFundingRate ({});
            assert.strictEqual (parsed['previousFundingTimestamp'], 1700000000000 - 28800000);
            assert.strictEqual (parsed['previousFundingDatetime'], ex.iso8601 (1700000000000 - 28800000));
        } finally {
            parentProto.parseFundingRate = orig;
        }
    }
    // parseFundingRate branch D2: fundingTimestamp < interval -> previousFundingTimestamp clamped to 0
    {
        const ex = new ccxt.ob_binance ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseFundingRate;
        parentProto.parseFundingRate = function () {
            return { 'symbol': 'BTC/USDT:USDT', 'fundingTimestamp': 1000 };
        };
        try {
            const parsed: any = ex.parseFundingRate ({});
            assert.strictEqual (parsed['previousFundingTimestamp'], 0);
        } finally {
            parentProto.parseFundingRate = orig;
        }
    }
    // parseFundingRate branch D3: fundingTimestamp undefined -> no mutation
    {
        const ex = new ccxt.ob_binance ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseFundingRate;
        parentProto.parseFundingRate = function () {
            return { 'symbol': 'BTC/USDT:USDT' };
        };
        try {
            const parsed: any = ex.parseFundingRate ({});
            assert.strictEqual (parsed['previousFundingTimestamp'], undefined);
            assert.strictEqual (parsed['previousFundingDatetime'], undefined);
        } finally {
            parentProto.parseFundingRate = orig;
        }
    }
    // createOrderRequest C1: spot market sell clears price before super (base quantity, not quoteOrderQty from amount*price)
    {
        const ex = new ccxt.ob_binance ();
        ex.market = () => ({ 'spot': true }) as any;
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.createOrderRequest;
        let capturedPrice: number | undefined = undefined;
        parentProto.createOrderRequest = function (_symbol, _type, _side, _amount, price, _params) {
            capturedPrice = price;
            return {};
        };
        try {
            ex.createOrderRequest ('BTC/USDT', 'market', 'sell', 1, 99999, {});
            assert.strictEqual (capturedPrice, undefined);
        } finally {
            parentProto.createOrderRequest = orig;
        }
    }
    // createOrderRequest C2: spot market buy keeps price for super
    {
        const ex = new ccxt.ob_binance ();
        ex.market = () => ({ 'spot': true }) as any;
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.createOrderRequest;
        let capturedPrice: number | undefined = undefined;
        parentProto.createOrderRequest = function (_symbol, _type, _side, _amount, price, _params) {
            capturedPrice = price;
            return {};
        };
        try {
            ex.createOrderRequest ('BTC/USDT', 'market', 'buy', 1, 99999, {});
            assert.strictEqual (capturedPrice, 99999);
        } finally {
            parentProto.createOrderRequest = orig;
        }
    }
    // createOrderRequest C3: contract market sell keeps price
    {
        const ex = new ccxt.ob_binance ();
        ex.market = () => ({ 'spot': false, 'contract': true }) as any;
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.createOrderRequest;
        let capturedPrice: number | undefined = undefined;
        parentProto.createOrderRequest = function (_symbol, _type, _side, _amount, price, _params) {
            capturedPrice = price;
            return {};
        };
        try {
            ex.createOrderRequest ('BTC/USDT:USDT', 'market', 'sell', 1, 99999, {});
            assert.strictEqual (capturedPrice, 99999);
        } finally {
            parentProto.createOrderRequest = orig;
        }
    }
}

export default testObBinance;
