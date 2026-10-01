
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObHtx () {
    {
        const ex = new ccxt.ob_htx ();
        assertObExchangeId (ex, 'ob_htx');
    }
    {
        const ex = new ccxt.ob_htx ();
        assert.strictEqual (ex.options.octobot.myTradesFetchUseCcxtPaginate, true);
    }
    {
        const ex = new ccxt.ob_htx ();
        ex.fetchBalance = async () => ({ 'info': {} } as any);
        const rights = await ex.fetchPermissions ();
        assert (rights.indexOf ('futuresTrading') >= 0);
    }
    {
        const ex = new ccxt.ob_htx ();
        assert.strictEqual (ex.options['broker']['id'], 'AAc4ccb049');
        ex.getOrdersBrokerParameters ();
        assert.strictEqual (ex.options['broker']['id'], 'AAc4ccb049');
    }
    // obAdaptAmountFromFilledOrCost branch A1: market+buy+filled -> amount=filled
    {
        const ex = new ccxt.ob_htx ();
        const parsed: any = { 'type': 'market', 'side': 'buy', 'amount': 0, 'filled': 4 };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 4);
    }
    // obAdaptAmountFromFilledOrCost branch A2: !amount && cost && price -> amount=cost/price
    {
        const ex = new ccxt.ob_htx ();
        const parsed: any = { 'type': 'limit', 'side': 'sell', 'amount': undefined, 'filled': 0, 'cost': 100, 'price': 25 };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 4);
    }
    // obAdaptAmountFromFilledOrCost branch A3: amount already set -> unchanged
    {
        const ex = new ccxt.ob_htx ();
        const parsed: any = { 'type': 'limit', 'side': 'buy', 'amount': 9, 'filled': 0, 'cost': 100, 'price': 25 };
        ex.obAdaptAmountFromFilledOrCost (parsed);
        assert.strictEqual (parsed['amount'], 9);
    }
    // parseOrder integration: market+buy+filled goes through obAdaptAmountFromFilledOrCost
    {
        const ex = new ccxt.ob_htx ();
        const parentProto = Object.getPrototypeOf (Object.getPrototypeOf (ex));
        const orig = parentProto.parseOrder;
        parentProto.parseOrder = function () {
            return { 'type': 'market', 'side': 'buy', 'amount': 0, 'filled': 4 };
        };
        try {
            const parsed: any = ex.parseOrder ({});
            assert.strictEqual (parsed['amount'], 4);
        } finally {
            parentProto.parseOrder = orig;
        }
    }
    // marketHelperProps: copy chain-id maps when sharing markets cache
    {
        const ex = new ccxt.ob_htx ();
        assert.deepStrictEqual (ex.options['marketHelperProps'], [ 'networkNamesByChainIds', 'networkChainIdsByNames' ]);
    }
    // parseTransaction: chain maps present -> network resolved without KeyError
    {
        const ex = new ccxt.ob_htx ();
        ex.options['networkNamesByChainIds'] = { 'arc20usdt': 'ETH' };
        const parsed: any = ex.parseTransaction ({
            'id': '118655882',
            'type': 'withdraw',
            'currency': 'usdt',
            'chain': 'arc20usdt',
            'tx-hash': '0xfa5915039a1c53448bf9a9f9d6bb7dcd857b01be8b6f20ee019f3a41875da211',
            'amount': 28.357244,
            'fee': 1,
            'state': 'confirmed',
            'created-at': 1691317556725,
            'updated-at': 1691317728483,
        });
        assert.strictEqual (parsed['currency'], 'USDT');
        assert.strictEqual (parsed['amount'], 28.357244);
        assert.ok (parsed['network'] !== undefined);
    }
    // ensureNetworkChainMaps: loads currencies when chain maps are empty
    {
        const ex = new ccxt.ob_htx ();
        let fetchCurrenciesCalls = 0;
        const origFetchCurrencies = ex.fetchCurrencies;
        ex.fetchCurrencies = async () => {
            fetchCurrenciesCalls++;
            ex.options['networkNamesByChainIds'] = { 'arc20usdt': 'ETH' };
            return {};
        };
        try {
            await ex.ensureNetworkChainMaps ();
            assert.strictEqual (fetchCurrenciesCalls, 1);
        } finally {
            ex.fetchCurrencies = origFetchCurrencies;
        }
    }
}

export default testObHtx;
