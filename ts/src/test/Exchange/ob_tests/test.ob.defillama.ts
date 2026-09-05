
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObDefillama () {
    {
        const exchange = new ccxt.ob_defillama ();
        assertObExchangeId (exchange, 'ob_defillama');
        const octobotOptions = exchange.options['octobot'];
        assert.deepStrictEqual (octobotOptions['supportedElements']['spot']['orders'], []);
        assert.strictEqual (octobotOptions['lazyLoadMarkets'], true);
        assert.strictEqual (octobotOptions['requiresSymbolsParamToFetchTickers'], true);
    }
}

export default testObDefillama;
