
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObLbank () {
    {
        const ex = new ccxt.ob_lbank ();
        assertObExchangeId (ex, 'ob_lbank');
    }
    {
        const ex = new ccxt.ob_lbank ();
        const payload = {
            'data': {
                'enableReading': true,
                'enableSpotTrading': true,
                'enableFuturesTrading': true,
                'enableWithdrawals': true,
            },
        };
        ex.spotPrivatePostSupplementApiRestrictions = async () => payload;
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'marginTrading', 'futuresTrading', 'withdrawals' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_lbank ();
        assert.strictEqual (await ex.fetchAccountId (), 'default_account_id');
    }
    {
        const ex = new ccxt.ob_lbank ();
        const headers = { 'signature_method': 'RSA' };
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', headers, ''), true);
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', {}, 'sign=abc'), true);
        assert.strictEqual (ex.isAuthenticatedRequest ('', 'GET', {}, ''), false);
    }
    {
        const ex = new ccxt.ob_lbank ();
        assert.strictEqual (
            ex.isAuthenticatedRequest ('', 'POST', { 'signature_method': 'RSA' }, 'sign=abc'),
            true,
        );
    }
    // sign: octobot.enableForcedSigningAllRequests false stays on parent behavior (spot public stays unsigned URL + no auth headers)
    {
        const exchange = new ccxt.ob_lbank ();
        exchange.apiKey = 'k';
        exchange.secret = 's';
        const exchangeAnySigned = exchange as any;
        const signedPublic = exchangeAnySigned.sign ('currencyPairs', [ 'spot', 'public' ], 'GET', { 'symbol': 'BTC_USDT' });
        assert.strictEqual (signedPublic['headers'], undefined);
        assert.strictEqual (signedPublic['body'], undefined);
        assert.match (signedPublic['url'], /symbol[=]BTC_USDT/);
        const signedPrivate = exchangeAnySigned.sign ('user_info', [ 'spot', 'private' ], 'POST', { 'dummy': '1' });
        assert.strictEqual (signedPrivate['headers']['signature_method'], 'HmacSHA256');
        assert.strictEqual (typeof signedPrivate['body'], 'string');
        assert.ok ((signedPrivate['body'] as string).includes ('api_key='));
    }

    // sign: enableForcedSigningAllRequests signs spot public GET (signature on URL query); short secret uses HMAC
    {
        const exchangeAny = new ccxt.ob_lbank () as any;
        exchangeAny.options['octobot']['enableForcedSigningAllRequests'] = true;
        exchangeAny.apiKey = 'myapikey';
        exchangeAny.secret = 'short_hmac_secret_under_33';
        exchangeAny.milliseconds = () => 9;
        exchangeAny.uuid22 = () => 'u'.repeat (22);
        exchangeAny.uuid16 = () => 'v'.repeat (16);
        exchangeAny.hmac = () => 'HMACSTUB';
        const forcedPublic = exchangeAny.sign ('currencyPairs', [ 'spot', 'public' ], 'GET', { 'symbol': 'BTC_USDT' });
        assert.strictEqual (forcedPublic['headers']['signature_method'], 'HmacSHA256');
        assert.strictEqual (forcedPublic['body'], undefined);
        assert.strictEqual ((forcedPublic['headers']['echostr'] as string), 'u'.repeat (22) + 'v'.repeat (16));
        assert.strictEqual ((forcedPublic['url'] as string).includes ('echostr='), false);
        assert.strictEqual ((forcedPublic['headers']['timestamp'] as string), '9');
        const joinedUrl = forcedPublic['url'] as string;
        assert.ok (!joinedUrl.includes ('\n'));
        assert.match (joinedUrl, /[?]api_key=myapikey/);
        assert.match (joinedUrl, /sign=HMACSTUB/);

        const forcedPrivate = exchangeAny.sign ('user_info', [ 'spot', 'private' ], 'POST', {});
        assert.ok ((forcedPrivate['body'] as string).startsWith ('api_key='));
        assert.match ((forcedPrivate['body'] as string), /[&]sign=HMACSTUB/);
        assert.strictEqual ((forcedPrivate['url'] as string).includes ('?'), false);
    }

    // sign: forced contract public uses contract base URL
    {
        const exchangeContract = new ccxt.ob_lbank () as any;
        exchangeContract.options['octobot']['enableForcedSigningAllRequests'] = true;
        exchangeContract.apiKey = 'myapikey';
        exchangeContract.secret = 'short_hmac_secret_under_33';
        exchangeContract.milliseconds = () => 9;
        exchangeContract.uuid22 = () => 'u'.repeat (22);
        exchangeContract.uuid16 = () => 'v'.repeat (16);
        exchangeContract.hmac = () => 'HMACSTUB';
        const out = exchangeContract.sign ('cfd/openApi/v1/pub/getTime', [ 'contract', 'public' ], 'GET', {});
        assert.ok ((out['url'] as string).startsWith ('https://lbkperp.lbank.com/cfd/openApi/v1/pub/getTime'));
        assert.ok ((out['url'] as string).includes ('?'));
    }
}

export default testObLbank;
