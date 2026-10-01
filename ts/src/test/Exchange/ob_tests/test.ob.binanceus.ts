
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { OBOrderUncancellableError, PermissionDenied } from '../../../base/errors.js';
import { ExchangeError } from '../../tests.helpers.js';
import assertObExchangeId from './obTestUtil.js';

function sortedStrings (values: string[]) {
    return values.slice ().sort ();
}

async function testObBinanceus () {
    {
        const ex = new ccxt.ob_binanceus ();
        assertObExchangeId (ex, 'ob_binanceus');
    }
    {
        const ex = new ccxt.ob_binanceus ();
        const trading = (ex as any).fees['trading'];
        assert.strictEqual (trading['tierBased'], true);
        assert.strictEqual (trading['percentage'], true);
        assert.strictEqual (trading['taker'], 0.006);
        assert.strictEqual (trading['maker'], 0.004);
    }
    {
        const ex = new ccxt.ob_binanceus ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('permission denied');
        };
        const rights = await ex.fetchPermissions ();
        assert.deepStrictEqual (rights, [ 'reading' ]);
    }
    {
        const ex = new ccxt.ob_binanceus ();
        ex.cancelOrder = async () => {
            throw new ExchangeError ('not found');
        };
        const rights = await ex.fetchPermissions ();
        const expected = [ 'reading', 'spotTrading', 'marginTrading', 'futuresTrading' ];
        assert.deepStrictEqual (sortedStrings (rights), sortedStrings (expected));
    }
    {
        const ex = new ccxt.ob_binanceus ();
        assert.strictEqual (await ex.fetchAccountId (), 'default_account_id');
    }
    {
        const ex = new ccxt.ob_binanceus ();
        ex.obGetMaxOpenOrdersCountFromExchangeInfoFilters = () => 55;
        const n = ex.getMaxOpenOrdersCount ('BTC/USDT');
        assert.strictEqual (n, 55);
    }
    {
        const ex = new ccxt.ob_binanceus ();
        assert.strictEqual (ex.isAuthenticatedRequest ('https://api/?signature=x', 'GET', {}, ''), true);
    }
    {
        const ex = new ccxt.ob_binanceus ();
        const spotUrl = 'https://api.binance.us/api/v3/order';
        const response = { 'code': -2015, 'msg': 'Invalid API-key, IP, or permissions for action.' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', spotUrl, 'GET', {}, '{"code":-2015,"msg":"Invalid API-key, IP, or permissions for action."}', response, {}, undefined);
        }, PermissionDenied);
    }
    {
        const ex = new ccxt.ob_binanceus ();
        const spotUrl = 'https://api.binance.us/api/v3/order';
        const response = { 'code': -2011, 'msg': 'Unknown order sent.' };
        assert.throws (() => {
            ex.handleErrors (400, 'Bad Request', spotUrl, 'DELETE', {}, '{"code":-2011,"msg":"Unknown order sent."}', response, {}, undefined);
        }, OBOrderUncancellableError);
    }
}

export default testObBinanceus;
