
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { AuthenticationError, PermissionDenied } from '../../../base/errors.js';
import { ExchangeError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

async function testObMexc () {
    {
        const ex = new ccxt.ob_mexc ();
        assertObExchangeId (ex, 'ob_mexc');
    }
    {
        const ex = new ccxt.ob_mexc ();
        assert.strictEqual (ex.options.octobot.myTradesFetchUseCcxtPaginate, true);
    }
    {
        const ex = new ccxt.ob_mexc ();
        ex.cancelOrder = async () => ({} as any);
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_mexc ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('permission denied');
        };
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_mexc ();
        assert.strictEqual (ex.options['broker'], 'OCTO');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['broker'], 'OCTO');
    }
    {
        const ex = new ccxt.ob_mexc ();
        ex.spotPrivateGetUid = async () => ({ 'uid': '99' });
        assert.strictEqual (await ex.fetchAccountId (), '99');
    }
    {
        const ex = new ccxt.ob_mexc ();
        ex.spotPrivateGetUid = async () => ({ 'data': { 'uid': '88' } });
        assert.strictEqual (await ex.fetchAccountId (), '88');
    }
    {
        const ex = new ccxt.ob_mexc ();
        assert.strictEqual (
            ex.isAuthenticatedRequest ('https://x?signature=1', 'GET', {}, undefined),
            true,
        );
        assert.strictEqual (
            ex.isAuthenticatedRequest ('https://x', 'GET', { 'Signature': 'x' }, undefined),
            true,
        );
        assert.strictEqual (ex.isAuthenticatedRequest ('https://x', 'GET', {}, undefined), false);
    }
    {
        const ex = new ccxt.ob_mexc ();
        const response = { 'code': 700007, 'msg': 'No permission to access the endpoint.' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":700007,"msg":"No permission to access the endpoint."}', response, {}, undefined);
        }, PermissionDenied);
    }
    {
        const ex = new ccxt.ob_mexc ();
        const response = { 'code': 999999, 'msg': 'Api key info invalid' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', '', 'POST', {}, '{"code":999999,"msg":"Api key info invalid"}', response, {}, undefined);
        }, AuthenticationError);
    }
    // obQuoteFromSymbol branch Q1: spot symbol -> quote
    {
        const ex = new ccxt.ob_mexc ();
        assert.strictEqual (ex.obQuoteFromSymbol ('BTC/USDT'), 'USDT');
    }
    // obQuoteFromSymbol branch Q2: futures symbol with settle suffix -> quote (suffix stripped)
    {
        const ex = new ccxt.ob_mexc ();
        assert.strictEqual (ex.obQuoteFromSymbol ('BTC/USDT:USDT'), 'USDT');
    }
    // obQuoteFromSymbol branch Q3: empty / no slash -> ''
    {
        const ex = new ccxt.ob_mexc ();
        assert.strictEqual (ex.obQuoteFromSymbol (''), '');
        assert.strictEqual (ex.obQuoteFromSymbol ('BTCUSDT'), '');
    }
    // parseOrder branch O1: canceled + no fee -> synthesized empty fee with quote currency
    {
        const ex = new ccxt.ob_mexc ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': 'BTC/USDT', 'status': 'canceled', 'fee': undefined };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.deepStrictEqual (parsed['fee'], { 'currency': 'USDT', 'cost': 0 });
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O2: canceled + existing fee -> unchanged
    {
        const ex = new ccxt.ob_mexc ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': 'BTC/USDT', 'status': 'canceled', 'fee': { 'currency': 'USDC', 'cost': 1 } };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['fee']['currency'], 'USDC');
            assert.strictEqual (parsed['fee']['cost'], 1);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O3: open + no fee -> no synthetic fee
    {
        const ex = new ccxt.ob_mexc ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': 'BTC/USDT', 'status': 'open', 'fee': undefined };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['fee'], undefined);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // parseOrder branch O4: canceled + no fee + symbol without quote -> currency=''
    {
        const ex = new ccxt.ob_mexc ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'symbol': '', 'status': 'canceled', 'fee': undefined };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['fee']['currency'], '');
            assert.strictEqual (parsed['fee']['cost'], 0);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // sign: enableForcedSigningAllRequests false — spot public stays unsigned (no signature in URL / no API key header)
    {
        const ex = new ccxt.ob_mexc ();
        ex.apiKey = 'k';
        ex.secret = 's';
        const out: any = (ex as any).sign ('ping', [ 'spot', 'public' ], 'GET', {});
        assert.strictEqual (out['headers'], undefined);
        assert.strictEqual (out['url'].includes ('signature='), false);
    }
    // sign: forced spot public adds signature query + X-MEXC-APIKEY
    {
        const exAny = new ccxt.ob_mexc () as any;
        exAny.options['octobot']['enableForcedSigningAllRequests'] = true;
        exAny.apiKey = 'mykey';
        exAny.secret = 'mysecret';
        exAny.nonce = () => 42;
        exAny.hmac = () => 'HMACSTUB';
        const out = exAny.sign ('ping', [ 'spot', 'public' ], 'GET', {});
        assert.strictEqual (out['headers']['X-MEXC-APIKEY'], 'mykey');
        assert.ok (out['url'].includes ('signature=HMACSTUB'));
    }
    // sign: forced contract public adds Signature header (unsigned public branch skipped)
    {
        const exAny = new ccxt.ob_mexc () as any;
        exAny.options['octobot']['enableForcedSigningAllRequests'] = true;
        exAny.apiKey = 'mykey';
        exAny.secret = 'mysecret';
        exAny.nonce = () => 42;
        exAny.hmac = () => 'CONTRACTSIG';
        const out = exAny.sign ('ping', [ 'contract', 'public' ], 'GET', {});
        assert.strictEqual (out['headers']['Signature'], 'CONTRACTSIG');
        assert.strictEqual (out['headers']['ApiKey'], 'mykey');
    }
    // fetchDeposits: default since -> 6-day window (MEXC 7-day limit margin)
    {
        const exAny = new ccxt.ob_mexc () as any;
        const fixedNow = 1_000_000_000_000;
        const defaultWindowMs = 6 * 24 * 60 * 60 * 1000;
        exAny.markets = {};
        exAny.milliseconds = () => fixedNow;
        let capturedRequest: any = undefined;
        exAny.spotPrivateGetCapitalDepositHisrec = async (request: any) => {
            capturedRequest = request;
            return [];
        };
        await exAny.fetchDeposits ();
        assert.strictEqual (capturedRequest['startTime'], fixedNow - defaultWindowMs);
        assert.strictEqual (capturedRequest['endTime'], fixedNow);
    }
    // fetchDeposits: explicit since preserved
    {
        const exAny = new ccxt.ob_mexc () as any;
        exAny.markets = {};
        let capturedRequest: any = undefined;
        exAny.spotPrivateGetCapitalDepositHisrec = async (request: any) => {
            capturedRequest = request;
            return [];
        };
        await exAny.fetchDeposits (undefined, 123);
        assert.strictEqual (capturedRequest['startTime'], 123);
    }
    // fetchWithdrawals: default since -> 6-day window (MEXC 7-day limit margin)
    {
        const exAny = new ccxt.ob_mexc () as any;
        const fixedNow = 1_000_000_000_000;
        const defaultWindowMs = 6 * 24 * 60 * 60 * 1000;
        exAny.markets = {};
        exAny.milliseconds = () => fixedNow;
        let capturedRequest: any = undefined;
        exAny.spotPrivateGetCapitalWithdrawHistory = async (request: any) => {
            capturedRequest = request;
            return [];
        };
        await exAny.fetchWithdrawals ();
        assert.strictEqual (capturedRequest['startTime'], fixedNow - defaultWindowMs);
        assert.strictEqual (capturedRequest['endTime'], fixedNow);
    }
    // fetchWithdrawals: explicit since preserved
    {
        const exAny = new ccxt.ob_mexc () as any;
        exAny.markets = {};
        let capturedRequest: any = undefined;
        exAny.spotPrivateGetCapitalWithdrawHistory = async (request: any) => {
            capturedRequest = request;
            return [];
        };
        await exAny.fetchWithdrawals (undefined, 456);
        assert.strictEqual (capturedRequest['startTime'], 456);
    }
}

export default testObMexc;
