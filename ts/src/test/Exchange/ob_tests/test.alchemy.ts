
import assert from 'assert';
import ccxt from '../../../../ccxt.js';
import { AuthenticationError, OperationFailed } from '../../../base/errors.js';

const MCADE_BASE = '0xc48823ec67720a04a9dfd8c7d109b2c3d6622094';
const WETH_BASE = '0x4200000000000000000000000000000000000006';
const USDC_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const WETH_ETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const USDC_ETH = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const HYDREX_QUOTER = '0x08b46265643a5389529D6f6616FA4a0d66F13Fdb';
const BASE_UNI_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
const SYMBOL_HYDREX = MCADE_BASE + '/' + WETH_BASE + '@BASE!HYDREX';
const SYMBOL_BASE_UNI = WETH_BASE + '/' + USDC_BASE + '@BASE!UNISWAPV3';
const SYMBOL_ETH_UNI = WETH_ETH + '/' + USDC_ETH + '@ETH!UNISWAPV3';

function createExchange () {
    const exchange = new ccxt.alchemy ({
        'apiKey': 'test-api-key',
    });
    return exchange;
}

async function testAlchemy () {
    // R1: resolveQuoterRoute for supported routes
    {
        const exchange = createExchange ();
        const hydrexRoute: any = exchange.resolveQuoterRoute ('BASE', 'HYDREX');
        assert.strictEqual (hydrexRoute['engine'], 'algebra');
        assert.strictEqual (hydrexRoute['quoter'], HYDREX_QUOTER);
        const uniRoute: any = exchange.resolveQuoterRoute ('ETH', 'UNISWAPV3');
        assert.strictEqual (uniRoute['engine'], 'uniswapv3');
        assert.strictEqual (uniRoute['fee'], 3000);
    }
    // R2: unknown route -> NotSupported
    {
        const exchange = createExchange ();
        await assert.rejects (
            async () => exchange.resolveQuoterRoute ('BASE', 'AERODROME'),
            (error: any) => error instanceof ccxt.NotSupported
        );
    }
    // S1: address-pair symbol required
    {
        const exchange = createExchange ();
        await assert.rejects (
            async () => exchange.parseSyntheticMarketFromSymbol ('WETH/USDC@BASE!HYDREX'),
            (error: any) => error instanceof ccxt.BadSymbol
        );
    }
    // E1: Algebra calldata uses 5-field deployer struct
    {
        const exchange = createExchange ();
        const calldata: string = exchange.buildAlgebraQuoterCalldata (
            MCADE_BASE,
            WETH_BASE,
            '0x0000000000000000000000000000000000000000',
            '1000000000000000000'
        );
        assert.strictEqual (calldata.startsWith ('0x'), true);
        assert.strictEqual (calldata.length > 10, true);
    }
    // E2: Uniswap V3 calldata with default fee
    {
        const exchange = createExchange ();
        const calldata: string = exchange.buildUniswapV3QuoterCalldata (
            WETH_BASE,
            USDC_BASE,
            '1000000000000000000',
            3000
        );
        assert.strictEqual (calldata.startsWith ('0x'), true);
        assert.strictEqual (calldata.length > 10, true);
    }
    // D1: decodeQuoterAmountOut first-word decode for extended payload
    {
        const exchange = createExchange ();
        const extendedPayload = '0x' + '0'.repeat (62) + '2a' + '0'.repeat (200);
        const amountOut = exchange.decodeQuoterAmountOut (extendedPayload);
        assert.strictEqual (amountOut, 42);
    }
    // D2: standard 4-word quoter output decode
    {
        const exchange = createExchange ();
        const standardPayload = '0x' + '0'.repeat (62) + '2a' + '0'.repeat (192);
        const amountOut = exchange.decodeQuoterAmountOut (standardPayload);
        assert.strictEqual (amountOut, 42);
    }
    // T1: fetchTicker with mocked eth_call
    {
        const exchange = createExchange ();
        const ethCallStub = async (rpcUrl: string, toAddress: string, calldata: string) => {
            if (calldata === '0x313ce567') {
                if (toAddress.toLowerCase () === MCADE_BASE) {
                    return '0x' + '0'.repeat (63) + '12';
                }
                if (toAddress.toLowerCase () === WETH_BASE) {
                    return '0x' + '0'.repeat (63) + '12';
                }
                if (toAddress.toLowerCase () === USDC_BASE) {
                    return '0x' + '0'.repeat (63) + '6';
                }
            }
            if (toAddress.toLowerCase () === HYDREX_QUOTER.toLowerCase ()) {
                return '0x' + '0'.repeat (48) + '1' + '0'.repeat (191);
            }
            throw new Error ('unexpected eth_call to ' + toAddress);
        };
        exchange.ethCall = ethCallStub;
        const ticker: any = await exchange.fetchTicker (SYMBOL_HYDREX);
        assert.strictEqual (ticker['symbol'], SYMBOL_HYDREX);
        assert.strictEqual (parseFloat (ticker['last']) > 0, true);
    }
    // T2: fetchTicker Uniswap route with mocked eth_call
    {
        const exchange = createExchange ();
        const ethCallStub = async (rpcUrl: string, toAddress: string, calldata: string) => {
            if (calldata === '0x313ce567') {
                if (toAddress.toLowerCase () === WETH_BASE) {
                    return '0x' + '0'.repeat (63) + '12';
                }
                if (toAddress.toLowerCase () === USDC_BASE) {
                    return '0x' + '0'.repeat (63) + '6';
                }
            }
            if (toAddress.toLowerCase () === BASE_UNI_QUOTER.toLowerCase ()) {
                return '0x' + '0'.repeat (42) + 'de0b6b3a7640000' + '0'.repeat (128);
            }
            throw new Error ('unexpected eth_call to ' + toAddress);
        };
        exchange.ethCall = ethCallStub;
        const ticker: any = await exchange.fetchTicker (SYMBOL_BASE_UNI);
        assert.strictEqual (ticker['symbol'], SYMBOL_BASE_UNI);
        assert.strictEqual (parseFloat (ticker['last']) > 0, true);
    }
    // P1: obParseNetworkDexSymbol
    {
        const exchange = createExchange ();
        const parsed: any = exchange.obParseNetworkDexSymbol (SYMBOL_ETH_UNI);
        assert.strictEqual (parsed['networkCode'], 'ETH');
        assert.strictEqual (parsed['dexCode'], 'UNISWAPV3');
    }
    // D1: describe() retry options
    {
        const exchange = createExchange ();
        assert.strictEqual (exchange.options['maxRetriesOnFailure'], 5);
        assert.strictEqual (exchange.options['maxRetriesOnFailureDelay'], 0);
    }
    // C1: transient empty 403
    {
        const exchange = createExchange ();
        assert.strictEqual (exchange.isTransientAlchemyGatewayHttpError (403, '', undefined), true);
    }
    // C2: auth 403 with JSON-RPC body
    {
        const exchange = createExchange ();
        const jsonRpcError = { 'jsonrpc': '2.0', 'error': { 'code': -32600 } };
        assert.strictEqual (exchange.isTransientAlchemyGatewayHttpError (403, '{"jsonrpc":"2.0","error":{"code":-32600}}', jsonRpcError), false);
    }
    // C3: non-403 response
    {
        const exchange = createExchange ();
        const jsonRpcResult = { 'result': '0x' };
        assert.strictEqual (exchange.isTransientAlchemyGatewayHttpError (200, '{"result":"0x"}', jsonRpcResult), false);
    }
    // H1: handleErrors transient 403 -> OperationFailed
    {
        const exchange = createExchange ();
        assert.throws (
            () => exchange.handleErrors (403, 'Forbidden', 'https://base-mainnet.g.alchemy.com/v2/test', 'POST', {}, '', undefined, {}, undefined),
            OperationFailed,
        );
    }
    // H2: handleErrors auth 403 with JSON body -> AuthenticationError
    {
        const exchange = createExchange ();
        const body = '{"jsonrpc":"2.0","error":{"code":-32600,"message":"Invalid request"}}';
        const response = { 'jsonrpc': '2.0', 'error': { 'code': -32600, 'message': 'Invalid request' } };
        assert.throws (
            () => exchange.handleErrors (403, 'Forbidden', 'https://base-mainnet.g.alchemy.com/v2/test', 'POST', {}, body, response, {}, undefined),
            AuthenticationError,
        );
    }
    // R1: ethCall retries transient failures then succeeds
    {
        const exchange = createExchange ();
        let fetchCallCount = 0;
        exchange.fetch = async (url, method, headers, body) => {
            fetchCallCount++;
            if (fetchCallCount <= 2) {
                throw new OperationFailed ('transient gateway 403');
            }
            return { 'jsonrpc': '2.0', 'id': 1, 'result': '0x' + '0'.repeat (64) };
        };
        const result = await exchange.ethCall ('https://base-mainnet.g.alchemy.com/v2/test', '0xabc', '0x');
        assert.strictEqual (fetchCallCount, 3);
        assert.strictEqual (result.startsWith ('0x'), true);
    }
    // R2: ethCall does not retry AuthenticationError
    {
        const exchange = createExchange ();
        let fetchCallCount = 0;
        exchange.fetch = async (url, method, headers, body) => {
            fetchCallCount++;
            throw new AuthenticationError ('invalid api key');
        };
        await assert.rejects (
            async () => exchange.ethCall ('https://base-mainnet.g.alchemy.com/v2/test', '0xabc', '0x'),
            AuthenticationError,
        );
        assert.strictEqual (fetchCallCount, 1);
    }
    // R3: ethCall exhausts retries on persistent OperationFailed
    {
        const exchange = createExchange ();
        let fetchCallCount = 0;
        exchange.fetch = async (url, method, headers, body) => {
            fetchCallCount++;
            throw new OperationFailed ('transient gateway 403');
        };
        await assert.rejects (
            async () => exchange.ethCall ('https://base-mainnet.g.alchemy.com/v2/test', '0xabc', '0x'),
            OperationFailed,
        );
        assert.strictEqual (fetchCallCount, 6);
    }
}

export default testAlchemy;
