
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObWizardswap () {
    {
        const ex = new ccxt.ob_wizardswap ();
        assertObExchangeId (ex, 'ob_wizardswap');
    }
    // parseOrder O1: info.address_from -> esov.address_from
    {
        const ex = new ccxt.ob_wizardswap ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'address_from': '88hsysd' }, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov']['address_from'], '88hsysd');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder O2: no address_from -> no esov
    {
        const ex = new ccxt.ob_wizardswap ();
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
        const ex = new ccxt.ob_wizardswap ();
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
    // parseOrder O4: extend existing esov with address_from
    {
        const ex = new ccxt.ob_wizardswap ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'info': { 'address_from': 'addr1' }, 'esov': { 'other': 1 }, 'fee': { 'cost': 0 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['esov']['other'], 1);
            assert.strictEqual (parsed['esov']['address_from'], 'addr1');
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseTicker T1: missing timestamp -> filled with ms + datetime
    {
        const ex = new ccxt.ob_wizardswap ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () {
            return { 'symbol': 'XMR/BTC', 'timestamp': undefined, 'datetime': undefined, 'info': {} };
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
        const ex = new ccxt.ob_wizardswap ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseTicker;
        parentProto.parseTicker = function () {
            return { 'symbol': 'XMR/BTC', 'timestamp': 1700000000000, 'datetime': ex.iso8601 (1700000000000), 'info': {} };
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

export default testObWizardswap;
