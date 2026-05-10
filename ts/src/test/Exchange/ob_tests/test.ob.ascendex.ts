
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OBIPWhitelistError } from '../../../base/errors.js';
import assertObExchangeId from './obTestUtil.js';

async function testObAscendex () {
    {
        const ex = new ccxt.ob_ascendex ();
        assertObExchangeId (ex, 'ob_ascendex');
    }
    {
        const ex = new ccxt.ob_ascendex ();
        ex.fetchBalance = async () => ({ 'info': {} } as any);
        const rights = await ex.fetchPermissions ();
        assert (rights.indexOf ('marginTrading') >= 0);
    }
    {
        const ex = new ccxt.ob_ascendex ();
        ex.uuid = () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        const out = ex.getOrdersBrokerParameters ({ 'x': 2 });
        const rawUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        const strippedNoHyphens = rawUuid.split ('-').join ('');
        const prefix = 'OctoBot';
        const expectedId = prefix + strippedNoHyphens.slice (prefix.length);
        assert.strictEqual (out['id'], expectedId);
        assert.strictEqual (out['x'], 2);
    }
    {
        const ex = new ccxt.ob_ascendex ();
        const response = {
            'code': '999999',
            'message': 'You have setup IP allowed list for this key. Your IP address () is not in the allowed list.',
        };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":"999999","message":"You have setup IP allowed list for this key. Your IP address () is not in the allowed list."}', response, {}, undefined);
        }, OBIPWhitelistError);
    }
    // parseTicker branch C1: super returns no timestamp -> milliseconds() fallback applied
    {
        const ex = new ccxt.ob_ascendex ();
        ex.milliseconds = () => 1700000000000;
        const raw = { 'symbol': 'BTC/USDT', 'type': 'spot', 'close': '100' };
        const parsed = ex.parseTicker (raw);
        assert.strictEqual (parsed['timestamp'], 1700000000000);
    }
    // parseTicker branch C2: super returns an existing timestamp -> preserved (fallback skipped)
    {
        const ex = new ccxt.ob_ascendex ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () { return { 'symbol': 'BTC/USDT', 'timestamp': 9999 }; };
        try {
            ex.milliseconds = () => 1700000000000;
            const parsed = ex.parseTicker ({});
            assert.strictEqual (parsed['timestamp'], 9999);
        } finally {
            parentProto.parseTicker = orig;
        }
    }
}

export default testObAscendex;
