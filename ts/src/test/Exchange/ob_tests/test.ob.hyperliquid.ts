
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

const OB_BUILDER = '0x4574F97475dc29034cf57bc1E255Ef1997b0cc43';
const OB_BUILDER_LOWER = OB_BUILDER.toLowerCase ();
const OB_FEE_RATE = '0.01%';

function assertCostMinApprox11 (exchange: any, parsed: Record<string, any>) {
    const limits = exchange.safeDict (parsed, 'limits', {});
    const cost = exchange.safeDict (limits, 'cost', {});
    const minCost = exchange.safeNumber (cost, 'min');
    assert.ok (minCost !== undefined);
    assert.ok (Math.abs ((minCost as number) - 11) < 1e-9);
}

function assertObBuilderOptions (exchange: any) {
    assert.strictEqual (exchange.options['builder'], OB_BUILDER);
    assert.strictEqual (exchange.options['feeRate'], OB_FEE_RATE);
    assert.strictEqual (exchange.options['builderFee'], true);
}

async function testObHyperliquid () {
    {
        const ex = new ccxt.ob_hyperliquid ();
        assertObExchangeId (ex, 'ob_hyperliquid');
        assertObBuilderOptions (ex);
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
    // handleBuilderFeeApproval: reads OctoBot builder/feeRate from options
    {
        const ex = new ccxt.ob_hyperliquid ();
        assertObBuilderOptions (ex);
        assert.strictEqual (ex.options['approvedBuilderFee'], undefined);
        let capturedBuilder: string | undefined = undefined;
        let capturedFeeRate: string | undefined = undefined;
        let approveCalls = 0;
        const origApprove = ex.approveBuilderFee;
        ex.approveBuilderFee = async (builder: string, maxFeeRate: string) => {
            approveCalls++;
            capturedBuilder = builder;
            capturedFeeRate = maxFeeRate;
            return { 'status': 'ok' };
        };
        try {
            await ex.handleBuilderFeeApproval ();
            assert.strictEqual (approveCalls, 1);
            assert.strictEqual (capturedBuilder, OB_BUILDER);
            assert.strictEqual (capturedFeeRate, OB_FEE_RATE);
            assert.strictEqual (ex.options['approvedBuilderFee'], true);
        } finally {
            ex.approveBuilderFee = origApprove;
        }
    }
    // handleBuilderFeeApproval: skip when builderFee is disabled
    {
        const ex = new ccxt.ob_hyperliquid ();
        ex.options['builderFee'] = false;
        let approveCalls = 0;
        const origApprove = ex.approveBuilderFee;
        ex.approveBuilderFee = async () => {
            approveCalls++;
            return { 'status': 'ok' };
        };
        try {
            await ex.handleBuilderFeeApproval ();
            assert.strictEqual (approveCalls, 0);
            assert.notStrictEqual (ex.options['approvedBuilderFee'], true);
        } finally {
            ex.approveBuilderFee = origApprove;
        }
    }
    // approveBuilderFee: request action uses OctoBot builder and feeRate
    {
        const ex = new ccxt.ob_hyperliquid ();
        assertObBuilderOptions (ex);
        let capturedRequest: Record<string, any> | undefined = undefined;
        const origBuildSig = ex.buildApproveBuilderFeeSig;
        const origPost = ex.privatePostExchange;
        ex.buildApproveBuilderFeeSig = () => ({ 'r': '0x1', 's': '0x2', 'v': 27 });
        ex.privatePostExchange = async (request: Record<string, any>) => {
            capturedRequest = request;
            return { 'status': 'ok' };
        };
        try {
            await ex.approveBuilderFee (ex.options['builder'], ex.options['feeRate']);
            assert.ok (capturedRequest !== undefined);
            const action = capturedRequest!['action'];
            assert.strictEqual (action['type'], 'approveBuilderFee');
            assert.strictEqual (action['builder'], OB_BUILDER);
            assert.strictEqual (action['maxFeeRate'], OB_FEE_RATE);
        } finally {
            ex.buildApproveBuilderFeeSig = origBuildSig;
            ex.privatePostExchange = origPost;
        }
    }
    // createOrdersRequest: attaches lowercased OctoBot builder when approvedBuilderFee is true
    {
        const ex = new ccxt.ob_hyperliquid ();
        assertObBuilderOptions (ex);
        ex.options['approvedBuilderFee'] = true;
        const origCheckCreds = ex.checkRequiredCredentials;
        const origMarket = ex.market;
        const origPriceToPrecision = ex.priceToPrecision;
        const origAmountToPrecision = ex.amountToPrecision;
        const origSignL1 = ex.signL1Action;
        ex.checkRequiredCredentials = () => true;
        ex.market = ((symbol: string) => ({
            'symbol': symbol,
            'baseId': '1',
        })) as typeof ex.market;
        ex.priceToPrecision = ((_symbol: string, price: string) => price) as typeof ex.priceToPrecision;
        ex.amountToPrecision = ((_symbol: string, amount: string) => amount) as typeof ex.amountToPrecision;
        ex.signL1Action = () => ({ 'r': '0x1', 's': '0x2', 'v': 27 });
        try {
            const request = ex.createOrdersRequest ([
                { 'symbol': 'ETH/USDC', 'type': 'limit', 'side': 'buy', 'amount': '1', 'price': '100' },
            ]);
            const builder = request['action']['builder'];
            assert.strictEqual (builder['b'], OB_BUILDER_LOWER);
            assert.strictEqual (builder['f'], 10);
        } finally {
            ex.checkRequiredCredentials = origCheckCreds;
            ex.market = origMarket;
            ex.priceToPrecision = origPriceToPrecision;
            ex.amountToPrecision = origAmountToPrecision;
            ex.signL1Action = origSignL1;
        }
    }
    // createOrdersRequest: omits builder when approvedBuilderFee is false
    {
        const ex = new ccxt.ob_hyperliquid ();
        ex.options['approvedBuilderFee'] = false;
        const origCheckCreds = ex.checkRequiredCredentials;
        const origMarket = ex.market;
        const origPriceToPrecision = ex.priceToPrecision;
        const origAmountToPrecision = ex.amountToPrecision;
        const origSignL1 = ex.signL1Action;
        ex.checkRequiredCredentials = () => true;
        ex.market = ((symbol: string) => ({
            'symbol': symbol,
            'baseId': '1',
        })) as typeof ex.market;
        ex.priceToPrecision = ((_symbol: string, price: string) => price) as typeof ex.priceToPrecision;
        ex.amountToPrecision = ((_symbol: string, amount: string) => amount) as typeof ex.amountToPrecision;
        ex.signL1Action = () => ({ 'r': '0x1', 's': '0x2', 'v': 27 });
        try {
            const request = ex.createOrdersRequest ([
                { 'symbol': 'ETH/USDC', 'type': 'limit', 'side': 'buy', 'amount': '1', 'price': '100' },
            ]);
            assert.strictEqual (request['action']['builder'], undefined);
        } finally {
            ex.checkRequiredCredentials = origCheckCreds;
            ex.market = origMarket;
            ex.priceToPrecision = origPriceToPrecision;
            ex.amountToPrecision = origAmountToPrecision;
            ex.signL1Action = origSignL1;
        }
    }
}

export default testObHyperliquid;
