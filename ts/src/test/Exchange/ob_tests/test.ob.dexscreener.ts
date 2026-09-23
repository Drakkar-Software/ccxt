
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObDexscreener () {
    {
        const exchange = new ccxt.ob_dexscreener ();
        assertObExchangeId (exchange, 'ob_dexscreener');
        const octobotOptions = exchange.options['octobot'];
        assert.deepStrictEqual (octobotOptions['supportedElements']['spot']['orders'], []);
        assert.deepStrictEqual (octobotOptions['supportedElements']['futures']['orders'], []);
    }
}

export default testObDexscreener;
