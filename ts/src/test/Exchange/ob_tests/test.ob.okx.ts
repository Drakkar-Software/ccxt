
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OBIPWhitelistError, PermissionDenied } from '../../../base/errors.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObOkx () {
    {
        const ex = new ccxt.ob_okx ();
        assertObExchangeId (ex, 'ob_okx');
    }
    {
        const ex = new ccxt.ob_okx ();
        ex.fetchAccounts = async () => [];
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, []);
    }
    {
        const ex = new ccxt.ob_okx ();
        const accounts = [{ 'info': { 'perm': 'read_only,trade,withdraw' }, 'id': 'a' }];
        ex.fetchAccounts = async () => (accounts as any);
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'marginTrading', 'futuresTrading', 'withdrawals' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_okx ();
        assert.strictEqual (ex.options['brokerId'], 'c812bf5944b749BC');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['brokerId'], 'c812bf5944b749BC');
    }
    {
        const ex = new ccxt.ob_okx ();
        ex.fetchAccounts = async () => ([{ 'id': 'acct-1', 'type': undefined, 'code': undefined, 'info': {} }]);
        const aid = await ex.fetchAccountId ();
        assert.strictEqual (aid, 'acct-1');
    }
    {
        const ex = new ccxt.ob_okx ();
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', { 'OK-ACCESS-SIGN': 'x' }, undefined), true);
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', {}, undefined), false);
    }
    {
        const ex = new ccxt.ob_okx ();
        const response = {
            'code': '1',
            'data': [
                {
                    'sCode': '50110',
                    'sMsg': 'Your IP 1.1.1.1 is not included in your API key\'s xxxx IP whitelist.',
                },
            ],
        };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":"1"}', response, {}, undefined);
        }, OBIPWhitelistError);
    }
    {
        const ex = new ccxt.ob_okx ();
        const response = {
            'code': '1',
            'data': [
                {
                    'sCode': '51155',
                    'sMsg': 'You can\'t trade this pair or borrow this crypto due to local compliance restrictions.',
                },
            ],
        };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":"1"}', response, {}, undefined);
        }, PermissionDenied);
    }
    // parseOrder branch O1: type 'market' -> override no-ops, type preserved
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'slTriggerPx': '50000' }, 'type': 'market', 'side': 'buy' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'market');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O2: conditional + slTriggerPx + tpTriggerPx -> 'unsupported' (OCO)
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'slTriggerPx': '49000', 'tpTriggerPx': '51000' }, 'type': 'conditional', 'side': 'buy' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'unsupported');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O3: conditional + slTriggerPx only -> 'stop_loss'
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'slTriggerPx': '49000' }, 'type': 'conditional', 'side': 'sell' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O4: conditional + tpTriggerPx only -> 'take_profit'
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'tpTriggerPx': '51000' }, 'type': 'conditional', 'side': 'buy' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'take_profit');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O5: conditional + lastPrice > triggerPrice + buy -> 'stop_loss'
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'last': '60000' }, 'type': 'trigger', 'side': 'buy', 'triggerPrice': 50000 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O6: conditional + lastPrice < triggerPrice + buy -> 'take_profit'
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'last': '40000' }, 'type': 'trigger', 'side': 'buy', 'triggerPrice': 50000 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'take_profit');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O7: conditional + lastPrice < triggerPrice + sell -> 'take_profit'
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'last': '40000' }, 'type': 'trigger', 'side': 'sell', 'triggerPrice': 50000 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'take_profit');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O8: conditional + lastPrice > triggerPrice + sell -> 'stop_loss'
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'last': '60000' }, 'type': 'trigger', 'side': 'sell', 'triggerPrice': 50000 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'stop_loss');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O9: conditional with no triggers and no last -> 'unknown'
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'type': 'trigger', 'side': 'buy' };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['type'], 'unknown');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseFundingRate branch F1: nextFundingTimestamp set -> previousFundingTimestamp = next - 28800000 + datetime
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseFundingRate;
        parentProto.parseFundingRate = function () {
            return { 'symbol': 'BTC/USDT:USDT', 'nextFundingTimestamp': 1700000000000 };
        };
        try {
            const parsed: any = ex.parseFundingRate ({});
            assert.strictEqual (parsed['previousFundingTimestamp'], 1700000000000 - 28800000);
            assert.strictEqual (parsed['previousFundingDatetime'], ex.iso8601 (1700000000000 - 28800000));
        } finally {
            parentProto.parseFundingRate = orig;
        }
    }
    // parseFundingRate branch F2: nextFundingTimestamp < interval -> previousFundingTimestamp clamped to 0
    {
        const ex = new ccxt.ob_okx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseFundingRate;
        parentProto.parseFundingRate = function () {
            return { 'symbol': 'BTC/USDT:USDT', 'nextFundingTimestamp': 1000 };
        };
        try {
            const parsed: any = ex.parseFundingRate ({});
            assert.strictEqual (parsed['previousFundingTimestamp'], 0);
        } finally {
            parentProto.parseFundingRate = orig;
        }
    }
    // parseFundingRate branch F3: nextFundingTimestamp undefined -> no mutation
    {
        const ex = new ccxt.ob_okx ();
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
}

export default testObOkx;
