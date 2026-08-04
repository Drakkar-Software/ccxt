
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObCoinrabbit () {
    {
        const exchange = new ccxt.ob_coinrabbit ();
        assertObExchangeId (exchange, 'ob_coinrabbit');
        const octobotOptions = exchange.options['octobot'];
        assert.strictEqual (octobotOptions['fixMarketStatus'], true);
        assert.deepStrictEqual (octobotOptions['supportedElements']['spot']['orders'], [ 'market', 'limit' ]);
        assert.strictEqual (exchange.options['orderSource'], 'octobot');
    }
}

export default testObCoinrabbit;
