
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import assertObExchangeId from './obTestUtil.js';

async function testObAlchemy () {
    {
        const exchange = new ccxt.ob_alchemy ();
        assertObExchangeId (exchange, 'ob_alchemy');
        const octobotOptions = exchange.options['octobot'];
        assert.deepStrictEqual (octobotOptions['supportedElements']['spot']['orders'], []);
        assert.deepStrictEqual (octobotOptions['supportedElements']['futures']['orders'], []);
        assert.strictEqual (octobotOptions['lazyLoadMarkets'], true);
        assert.strictEqual (octobotOptions['requiresSymbolsParamToFetchTickers'], true);
        assert.strictEqual (octobotOptions['fixMarketStatus'], true);
        assert.strictEqual (octobotOptions['createOhlcvFromTickers'], true);
        assert.strictEqual (exchange.options['maxRetriesOnFailure'], 5);
        assert.strictEqual (exchange.options['maxRetriesOnFailureDelay'], 0);
    }
}

export default testObAlchemy;
