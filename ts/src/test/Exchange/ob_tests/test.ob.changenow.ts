
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObChangenow () {
    {
        const ex = new ccxt.ob_changenow ();
        assertObExchangeId (ex, 'ob_changenow');
    }
    // parseOrder O1: info.payinAddress -> esov.address_from
    {
        const ex = new ccxt.ob_changenow ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'payinAddress': '3NWnMcW31' }, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov']['address_from'], '3NWnMcW31');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder O2: no payinAddress -> no esov
    {
        const ex = new ccxt.ob_changenow ();
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
        const ex = new ccxt.ob_changenow ();
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
    // parseOrder O4: extend existing esov with address_from from payinAddress
    {
        const ex = new ccxt.ob_changenow ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'payinAddress': '0xpayin' }, 'esov': { 'other': 1 }, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov']['other'], 1);
            assert.strictEqual (parsed['esov']['address_from'], '0xpayin');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseTicker T1: missing timestamp -> filled with ms + datetime
    {
        const ex = new ccxt.ob_changenow ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () {
            return { 'symbol': 'BTC/ETH', 'timestamp': undefined, 'datetime': undefined, 'info': {} };
        };
        try {
            const parsed: any = ex.parseTicker ({});
            assert.strictEqual (typeof parsed['timestamp'], 'number');
            assert.strictEqual (parsed['datetime'], ex.iso8601 (parsed['timestamp']));
        } finally {
            parentProto.parseTicker = orig;
        }
    }
    // parseTicker T2: explicit timestamp preserved
    {
        const ex = new ccxt.ob_changenow ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () {
            return { 'symbol': 'BTC/ETH', 'timestamp': 1700000000000, 'datetime': ex.iso8601 (1700000000000), 'info': {} };
        };
        try {
            const parsed: any = ex.parseTicker ({});
            assert.strictEqual (parsed['timestamp'], 1700000000000);
            assert.strictEqual (parsed['datetime'], ex.iso8601 (1700000000000));
        } finally {
            parentProto.parseTicker = orig;
        }
    }
}

export default testObChangenow;
