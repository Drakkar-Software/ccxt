
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OBIPWhitelistError } from '../../../base/errors.js';
import assertObExchangeId from './obTestUtil.js';

async function testObGate () {
    {
        const ex = new ccxt.ob_gate ();
        assertObExchangeId (ex, 'ob_gate');
    }
    {
        const ex = new ccxt.ob_gate ();
        assert.strictEqual (ex.options.octobot.myTradesFetchUseCcxtPaginate, true);
    }
    {
        const ex = new ccxt.ob_gate ();
        const cfg = ex.describe ();
        const headers = cfg['headers'] as Record<string, string>;
        assert.strictEqual (headers['X-Gate-Channel-Id'], 'octobotclo');
    }
    {
        const ex = new ccxt.ob_gate ();
        ex.fetchBalance = async () => ({ 'info': {} } as any);
        const rights = await ex.fetchPermissions ();
        assert (rights.indexOf ('spotTrading') >= 0);
    }
    {
        const ex = new ccxt.ob_gate ();
        assert.deepStrictEqual (ex.getOrdersBrokerParameters ({ 'a': 1 }), { 'a': 1 });
    }
    {
        const ex = new ccxt.ob_gate ();
        const body = '{"label":"FORBIDDEN","message":"Request IP not in whitelist: 1.1.1.1"}';
        assert.throws (() => {
            ex.handleErrors (403, 'Forbidden', 'https://api.gateio.ws/api/v4/spot/orders', 'POST', {}, body, { 'label': 'FORBIDDEN', 'message': 'Request IP not in whitelist: 1.1.1.1' }, {}, undefined);
        }, OBIPWhitelistError);
    }
    // parseTicker branch K1: super returns no timestamp -> milliseconds() fallback applied
    {
        const ex = new ccxt.ob_gate ();
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
        const ex = new ccxt.ob_gate ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () { return { 'symbol': 'BTC/USDT', 'timestamp': 7777 }; };
        try {
            ex.milliseconds = () => 1700000000000;
            const parsed: any = ex.parseTicker ({});
            assert.strictEqual (parsed['timestamp'], 7777);
        } finally {
            parentProto.parseTicker = orig;
        }
    }
}

export default testObGate;
