
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObCoingecko () {
    {
        const exchange = new ccxt.ob_coingecko ();
        assertObExchangeId (exchange, 'ob_coingecko');
        const octobotOptions = exchange.options['octobot'];
        assert.deepStrictEqual (octobotOptions['supportedElements']['spot']['orders'], []);
        assert.deepStrictEqual (octobotOptions['supportedElements']['futures']['orders'], []);
    }
}

export default testObCoingecko;
