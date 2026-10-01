
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { AuthenticationError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObKraken () {
    {
        const ex = new ccxt.ob_kraken ();
        assertObExchangeId (ex, 'ob_kraken');
    }
    {
        const ex = new ccxt.ob_kraken ();
        assert.strictEqual (ex.options.octobot.myTradesSymbolFilterIsClientSide, true);
        assert.strictEqual (ex.options.octobot.myTradesFetchPaginationOffset, 'ofs');
    }
    {
        const ex = new ccxt.ob_kraken ();
        assert.strictEqual (await ex.fetchAccountId (), 'default_account_id');
    }
    {
        const ex = new ccxt.ob_kraken ();
        const response = {
            'error': [],
            'result': {
                'permissions': [ 'query-funds', 'modify-trades', 'withdraw-funds' ],
            },
        };
        ex.privatePostGetApiKeyInfo = async () => response;
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'marginTrading', 'withdrawals' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_kraken ();
        const response = {
            'error': [],
            'result': {
                'permissions': [ 'query-funds' ],
            },
        };
        ex.privatePostGetApiKeyInfo = async () => response;
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_kraken ();
        ex.privatePostGetApiKeyInfo = async () => {
            throw new Error ('EAPI:Invalid key');
        };
        await assert.rejects (async () => {
            await ex.fetchPermissions ();
        }, AuthenticationError);
    }
    // parseTrade: stop limit ordertype -> stop_loss_limit
    {
        const ex = new ccxt.ob_kraken ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const originalParseTrade = parentProto.parseTrade;
        parentProto.parseTrade = function (trade) {
            return {
                'id': 'TLG6I2-2V2XZ-7OD2JZ',
                'symbol': 'BTC/EUR',
                'type': trade['ordertype'],
                'side': 'sell',
                'price': 23624.0,
                'amount': 0.04992013,
                'info': trade,
            };
        };
        try {
            const trade = ex.parseTrade ({
                'ordertxid': 'OA45RH-N6W4V-XCVL54',
                'pair': 'XXBTZEUR',
                'type': 'sell',
                'ordertype': 'stop limit',
                'tradeordertype': 'stop_loss_limit',
                'price': '23624.00000',
                'vol': '0.04992013',
                'time': 1609755558.224525,
            });
            assert.strictEqual (trade.type, 'stop_loss_limit');
        } finally {
            parentProto.parseTrade = originalParseTrade;
        }
    }
    // parseTrade: dashed stop-loss-limit ordertype -> stop_loss_limit
    {
        const ex = new ccxt.ob_kraken ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const originalParseTrade = parentProto.parseTrade;
        parentProto.parseTrade = function (trade) {
            return {
                'id': 'trade-1',
                'symbol': 'BTC/EUR',
                'type': trade['ordertype'],
                'side': 'sell',
                'price': 23624.0,
                'amount': 0.01,
                'info': trade,
            };
        };
        try {
            const trade = ex.parseTrade ({
                'ordertxid': 'order-1',
                'pair': 'XXBTZEUR',
                'type': 'sell',
                'ordertype': 'stop-loss-limit',
                'price': '23624.00000',
                'vol': '0.01000000',
                'time': 1609755558.224525,
            });
            assert.strictEqual (trade.type, 'stop_loss_limit');
        } finally {
            parentProto.parseTrade = originalParseTrade;
        }
    }
    // parseTrade: stop-loss ordertype -> stop_loss
    {
        const ex = new ccxt.ob_kraken ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const originalParseTrade = parentProto.parseTrade;
        parentProto.parseTrade = function (trade) {
            return {
                'id': 'trade-2',
                'symbol': 'ETH/USDT',
                'type': trade['ordertype'],
                'side': 'buy',
                'price': 3000.0,
                'amount': 1.0,
                'info': trade,
            };
        };
        try {
            const trade = ex.parseTrade ({
                'ordertxid': 'order-2',
                'pair': 'XETHZUSD',
                'type': 'buy',
                'ordertype': 'stop-loss',
                'price': '3000.00000',
                'vol': '1.00000000',
                'time': 1609755558.224525,
            });
            assert.strictEqual (trade.type, 'stop_loss');
        } finally {
            parentProto.parseTrade = originalParseTrade;
        }
    }
    // nonce: same apiKey across instances, same millisecond -> strictly increasing
    {
        const apiKey = 'ob-kraken-nonce-test-same-key';
        const ex1 = new ccxt.ob_kraken ();
        const ex2 = new ccxt.ob_kraken ();
        ex1.apiKey = apiKey;
        ex2.apiKey = apiKey;
        ex1.options['timeDifference'] = 0;
        ex2.options['timeDifference'] = 0;
        ex1.milliseconds = () => 1000;
        ex2.milliseconds = () => 1000;
        assert.strictEqual (ex1.nonce (), 1000);
        assert.strictEqual (ex2.nonce (), 1001);
    }
    // nonce: same apiKey, clock moves forward -> candidate wins over last+1
    {
        const apiKey = 'ob-kraken-nonce-test-forward-time';
        const ex = new ccxt.ob_kraken ();
        ex.apiKey = apiKey;
        ex.options['timeDifference'] = 0;
        ex.milliseconds = () => 1000;
        assert.strictEqual (ex.nonce (), 1000);
        ex.milliseconds = () => 2000;
        assert.strictEqual (ex.nonce (), 2000);
    }
    // nonce: different apiKeys -> independent counters
    {
        const ex1 = new ccxt.ob_kraken ();
        const ex2 = new ccxt.ob_kraken ();
        ex1.apiKey = 'ob-kraken-nonce-test-key-a';
        ex2.apiKey = 'ob-kraken-nonce-test-key-b';
        ex1.options['timeDifference'] = 0;
        ex2.options['timeDifference'] = 0;
        ex1.milliseconds = () => 1000;
        ex2.milliseconds = () => 1000;
        assert.strictEqual (ex1.nonce (), 1000);
        assert.strictEqual (ex2.nonce (), 1000);
    }
    // nonce: shared map persists across instances with same apiKey
    {
        const apiKey = 'ob-kraken-nonce-test-map-persist';
        const ex1 = new ccxt.ob_kraken ();
        const ex2 = new ccxt.ob_kraken ();
        ex1.apiKey = apiKey;
        ex2.apiKey = apiKey;
        ex1.options['timeDifference'] = 0;
        ex2.options['timeDifference'] = 0;
        ex1.milliseconds = () => 5000;
        ex2.milliseconds = () => 5000;
        assert.strictEqual (ex1.nonce (), 5000);
        assert.strictEqual (ex2.nonce (), 5001);
        const classRef = ccxt.ob_kraken as any;
        assert.strictEqual (classRef.obKrakenLastNonceByApiKey[apiKey], 5001);
    }
    // nonce: burst on one instance then another with same apiKey stays strictly increasing
    {
        const apiKey = 'ob-kraken-nonce-test-burst';
        const ex1 = new ccxt.ob_kraken ();
        const ex2 = new ccxt.ob_kraken ();
        ex1.apiKey = apiKey;
        ex2.apiKey = apiKey;
        ex1.options['timeDifference'] = 0;
        ex2.options['timeDifference'] = 0;
        let millisecondValue = 9000;
        ex1.milliseconds = () => millisecondValue;
        ex2.milliseconds = () => millisecondValue;
        const burstNonces: number[] = [];
        for (let burstIndex = 0; burstIndex < 20; burstIndex++) {
            burstNonces.push (ex1.nonce ());
        }
        const afterBurstNonce = ex2.nonce ();
        burstNonces.push (afterBurstNonce);
        for (let nonceIndex = 1; nonceIndex < burstNonces.length; nonceIndex++) {
            assert.ok (burstNonces[nonceIndex] > burstNonces[nonceIndex - 1]);
        }
    }
}

export default testObKraken;
