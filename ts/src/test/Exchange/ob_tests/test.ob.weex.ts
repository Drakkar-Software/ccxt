
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObWeex () {
    {
        const exchange = new ccxt.ob_weex ();
        assertObExchangeId (exchange, 'ob_weex');
        const octobotOptions = exchange.options['octobot'];
        assert.strictEqual (octobotOptions['fixMarketStatus'], true);
        assert.deepStrictEqual (octobotOptions['supportedElements']['spot']['orders'], [ 'market', 'limit' ]);
        assert.deepStrictEqual (octobotOptions['supportedElements']['futures']['orders'], [ 'market', 'limit' ]);
    }
}

export default testObWeex;
