
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObSimpleswap () {
    {
        const ex = new ccxt.ob_simpleswap ();
        assertObExchangeId (ex, 'ob_simpleswap');
        const octobotOptions = ex.options['octobot'];
        assert.strictEqual (octobotOptions['lazyLoadMarkets'], true);
        assert.strictEqual (ex.has['obLoadMarketsForSymbols'], true);
    }
    // compositeToCode / codeToComposite
    {
        const ex = new ccxt.simpleswap ();
        assert.strictEqual (ex.compositeToCode ('btc:btc'), 'BTC@BTC');
        assert.strictEqual (ex.codeToComposite ('USDT@TRX'), 'usdt:trx');
        assert.strictEqual (ex.buildSymbolFromComposites ('btc:btc', 'eth:eth'), 'BTC@BTC/ETH@ETH');
    }
    // parseOrder O1: info.addressFrom -> esov.address_from
    {
        const ex = new ccxt.ob_simpleswap ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'addressFrom': '3NWnMcW31' }, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov']['address_from'], '3NWnMcW31');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder O2: no addressFrom -> no esov
    {
        const ex = new ccxt.ob_simpleswap ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov'], undefined);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder O3: missing fee -> synthesized empty fee dict
    {
        const ex = new ccxt.ob_simpleswap ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': {}, 'fee': undefined };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.deepStrictEqual (parsed['fee'], { 'cost': 0, 'currency': undefined, 'rate': undefined });
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseTicker T1: missing timestamp -> filled with ms + datetime
    {
        const ex = new ccxt.ob_simpleswap ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () {
            return { 'symbol': 'BTC@BTC/ETH@ETH', 'timestamp': undefined, 'datetime': undefined, 'info': {} };
        };
        try {
            const parsed: any = ex.parseTicker ({});
            assert.strictEqual (typeof parsed['timestamp'], 'number');
            assert.strictEqual (parsed['datetime'], ex.iso8601 (parsed['timestamp']));
        } finally {
            parentProto.parseTicker = orig;
        }
    }
    // resolveApiKey K1: forceDefaultAPIKey uses defaultAPIKey
    {
        const ex = new ccxt.simpleswap ();
        ex.apiKey = 'user-api-key';
        ex.options['defaultAPIKey'] = 'default-api-key';
        ex.options['forceDefaultAPIKey'] = true;
        assert.strictEqual (ex.resolveApiKey (), 'default-api-key');
    }
    // parseResultEnvelope
    {
        const ex = new ccxt.simpleswap ();
        assert.deepStrictEqual (ex.parseResultEnvelope ({ 'result': { 'estimatedAmount': '1' }, 'traceId': 'x' }), { 'estimatedAmount': '1' });
    }
}

export default testObSimpleswap;
