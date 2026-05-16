
import assert from 'assert';
import ccxt from '../../../../ccxt.js';

function syntheticMarket (infoMarker: object) {
    return {
        'id': 's',
        'symbol': 'BTC/USDT',
        'base': 'BTC',
        'quote': 'USDT',
        'baseId': 'BTC',
        'quoteId': 'USDT',
        'precision': {
            'amount': '0.001',
            'price': '0.01',
        },
        'limits': {
            'amount': {
                'min': '1',
                'max': '10',
            },
            'price': {
                'min': '100',
                'max': '200',
            },
            'cost': {
                'min': 'oops',
                'max': '1e6',
            },
        },
        'contractSize': '100',
        'info': infoMarker,
    } as any;
}

async function testObExchangeMarketStatus () {
    // fixMarketStatus: precision steps -> digit counts
    {
        const infoMarker = { 'k': 1 };
        const m = syntheticMarket (infoMarker);
        const ex = new ccxt.Exchange ({
            'id': 'ob_ms_test',
            'markets': { 'BTC/USDT': m },
            'options': {
                'octobot': {
                    'fixMarketStatus': true,
                },
            },
        });
        const fixed: any = ex.obGetFixedMarketStatus ('BTC/USDT');
        assert.strictEqual (fixed['precision']['amount'], 3);
        assert.strictEqual (fixed['precision']['price'], 2);
        assert.strictEqual (m['precision']['amount'], '0.001');
    }
    // removeMarketStatusPriceLimits
    {
        const infoMarker = {};
        const m = syntheticMarket (infoMarker);
        const ex = new ccxt.Exchange ({
            'id': 'ob_ms_test',
            'markets': { 'BTC/USDT': m },
            'options': {
                'octobot': {
                    'removeMarketStatusPriceLimits': true,
                },
            },
        });
        const fixed: any = ex.obGetFixedMarketStatus ('BTC/USDT');
        assert.strictEqual (fixed['limits']['price']['min'], undefined);
        assert.strictEqual (fixed['limits']['price']['max'], undefined);
        assert.strictEqual (m['limits']['price']['min'], '100');
    }
    // adaptMarketStatusForContractSize: scale amount limits + precision.amount from contract size
    {
        const infoMarker = {};
        const m = syntheticMarket (infoMarker);
        const ex = new ccxt.Exchange ({
            'id': 'ob_ms_test',
            'markets': { 'BTC/USDT': m },
            'options': {
                'octobot': {
                    'adaptMarketStatusForContractSize': true,
                },
            },
        });
        const fixed: any = ex.obGetFixedMarketStatus ('BTC/USDT');
        assert.strictEqual (fixed['limits']['amount']['min'], 100);
        assert.strictEqual (fixed['limits']['amount']['max'], 1000);
        assert.strictEqual (fixed['precision']['amount'], 2);
    }
    // fixMarketStatus then adaptMarketStatusForContractSize: final precision.amount from contractSize
    {
        const infoMarker = {};
        const m = syntheticMarket (infoMarker);
        const ex = new ccxt.Exchange ({
            'id': 'ob_ms_test',
            'markets': { 'BTC/USDT': m },
            'options': {
                'octobot': {
                    'fixMarketStatus': true,
                    'adaptMarketStatusForContractSize': true,
                },
            },
        });
        const fixed: any = ex.obGetFixedMarketStatus ('BTC/USDT');
        assert.strictEqual (fixed['precision']['price'], 2);
        assert.strictEqual (fixed['precision']['amount'], 2);
    }
    // coercion failure -> undefined
    {
        const infoMarker = {};
        const m = syntheticMarket (infoMarker);
        const ex = new ccxt.Exchange ({
            'id': 'ob_ms_test',
            'markets': { 'BTC/USDT': m },
            'options': {},
        });
        const fixed: any = ex.obGetFixedMarketStatus ('BTC/USDT');
        assert.strictEqual (fixed['limits']['cost']['min'], undefined);
        assert.strictEqual (fixed['limits']['cost']['max'], 1000000);
    }
    // immutability: shared info ref; cached market precision/limits unchanged
    {
        const infoMarker = { 'tag': 'x' };
        const m = syntheticMarket (infoMarker);
        const beforeAmount = m['precision']['amount'];
        const limitsAmountMin = m['limits']['amount']['min'];
        const ex = new ccxt.Exchange ({
            'id': 'ob_ms_test',
            'markets': { 'BTC/USDT': m },
            'options': {
                'octobot': {
                    'fixMarketStatus': true,
                    'adaptMarketStatusForContractSize': true,
                },
            },
        });
        const fixed: any = ex.obGetFixedMarketStatus ('BTC/USDT');
        assert.strictEqual (fixed['info'], infoMarker);
        assert.strictEqual (beforeAmount, m['precision']['amount']);
        assert.strictEqual (limitsAmountMin, m['limits']['amount']['min']);
        assert.notStrictEqual (fixed['precision'], m['precision']);
        assert.notStrictEqual (fixed['limits']['amount'], m['limits']['amount']);
        assert.strictEqual (m['limits']['cost']['min'], 'oops');
        assert.notStrictEqual (fixed['limits']['cost'], m['limits']['cost']);
    }
}

export default testObExchangeMarketStatus;
