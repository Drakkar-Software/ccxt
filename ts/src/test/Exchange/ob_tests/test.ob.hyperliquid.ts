
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

function assertCostMinApprox11 (exchange: any, parsed: Record<string, any>) {
    const limits = exchange.safeDict (parsed, 'limits', {});
    const cost = exchange.safeDict (limits, 'cost', {});
    const minCost = exchange.safeNumber (cost, 'min');
    assert.ok (minCost !== undefined);
    assert.ok (Math.abs ((minCost as number) - 11) < 1e-9);
}

async function testObHyperliquid () {
    {
        const ex = new ccxt.ob_hyperliquid ();
        assertObExchangeId (ex, 'ob_hyperliquid');
    }
    // parseMarket: base hyperliquid sets cost.min 10; ob_hyperliquid bumps to 11
    {
        const ex = new ccxt.ob_hyperliquid ();
        const raw = {
            'name': 'ETH',
            'szDecimals': '4',
            'markPx': '2369.6',
            'baseId': '1',
            'maxLeverage': '50',
        };
        const parsed = ex.parseMarket (raw);
        assertCostMinApprox11 (ex, parsed);
    }
    // fetchSpotMarkets: stub parent to return cost.min 10; override bumps to 11
    {
        const ex = new ccxt.ob_hyperliquid ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.fetchSpotMarkets;
        parentProto.fetchSpotMarkets = async function () {
            return [
                {
                    'limits': {
                        'cost': { 'min': 10 },
                        'leverage': {},
                        'amount': {},
                        'price': {},
                    },
                },
            ];
        };
        try {
            const markets = await ex.fetchSpotMarkets ();
            assert.strictEqual (markets.length, 1);
            assertCostMinApprox11 (ex, markets[0]);
        } finally {
            parentProto.fetchSpotMarkets = orig;
        }
    }
}

export default testObHyperliquid;
