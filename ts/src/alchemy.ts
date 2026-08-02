//  ---------------------------------------------------------------------------

import Exchange from './abstract/alchemy.js';
import { ArgumentsRequired, AuthenticationError, BadSymbol, ExchangeError, NotSupported, RateLimitExceeded } from './base/errors.js';
import type { Market, Dict, Ticker, int, Strings, Tickers, MarketInterface } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class alchemy
 * @augments Exchange
 * @description Alchemy - on-chain DEX quoter price provider (read-only).
 */
export default class alchemy extends Exchange {
    describe (): any {
        // dexes is auto-synced from getDefaultQuoterRegistry() by npm run enrich-quoter-registry
        const dexes: Dict = {
            'hydrex': 'HYDREX',
            'uniswapv3': 'UNISWAPV3',
            'uniswapv3_500': 'UNISWAPV3_500',
            'uniswapv3_10000': 'UNISWAPV3_10000',
        };
        const dexesById: Dict = {};
        const dexKeys = Object.keys (dexes);
        for (let dexIndex = 0; dexIndex < dexKeys.length; dexIndex++) {
            const dexId = dexKeys[dexIndex];
            dexesById[dexes[dexId]] = dexId;
        }
        const networks: Dict = {
            'ETH': 'ethereum',
            'BASE': 'base',
        };
        const networksById: Dict = {};
        const networkKeys = Object.keys (networks);
        for (let networkIndex = 0; networkIndex < networkKeys.length; networkIndex++) {
            const networkCode = networkKeys[networkIndex];
            networksById[networks[networkCode]] = networkCode;
        }
        networksById['ethereum'] = 'ETH';
        networksById['base'] = 'BASE';
        return this.deepExtend (super.describe (), {
            'id': 'alchemy',
            'name': 'Alchemy',
            'countries': [ ],
            'rateLimit': 200,
            'version': 'v1',
            'certified': false,
            'pro': false,
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'cancelOrder': false,
                'createDepositAddress': false,
                'createOrder': false,
                'fetchBalance': false,
                'fetchCurrencies': false,
                'fetchDepositAddress': false,
                'fetchDepositAddresses': false,
                'fetchDepositAddressesByNetwork': false,
                'fetchFundingHistory': false,
                'fetchFundingRate': false,
                'fetchFundingRateHistory': false,
                'fetchFundingRates': false,
                'fetchIndexOHLCV': false,
                'fetchMarkets': true,
                'fetchMarkOHLCV': false,
                'fetchOpenInterestHistory': false,
                'fetchOrder': false,
                'fetchOrderBook': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchTrades': false,
                'fetchTradingFee': false,
                'fetchTradingFees': false,
                'obLoadMarketsForSymbols': true,
                'transfer': false,
            },
            'timeframes': {
                '1d': '1d',
            },
            'urls': {
                'logo': 'https://www.alchemy.com/favicon.ico',
                'api': {
                    'rest': 'https://eth-mainnet.g.alchemy.com/v2/{apiKey}',
                },
                'www': 'https://www.alchemy.com',
                'doc': [
                    'https://docs.alchemy.com/reference/eth-call',
                ],
            },
            'api': {
                'public': {
                    'post': [
                        'rpc',
                    ],
                },
            },
            'requiredCredentials': {
                'apiKey': true,
                'secret': false,
            },
            'options': {
                'networks': networks,
                'networksById': networksById,
                'dexes': dexes,
                'dexesById': dexesById,
                'quoterRegistry': this.getDefaultQuoterRegistry (),
                'decimalsCache': {},
                'rpcUrls': {
                    'ethereum': 'https://eth-mainnet.g.alchemy.com/v2/{apiKey}',
                    'base': 'https://base-mainnet.g.alchemy.com/v2/{apiKey}',
                },
            },
        });
    }

    // Quoter registry — keys are NETWORK:DEX (symbol suffixes after @ and !).
    // To add a DEX: append a stub, e.g. 'BASE:UNISWAPV3_500': {}, then run:
    //   npm run enrich-quoter-registry
    // The script fills missing fields, validates quoter ABIs on Sourcify, and updates dexes.
    // New networks: add networks + rpcUrls in describe() first.
    // Then transpile alchemy to Python/JS before testing.
    getDefaultQuoterRegistry (): Dict {
        return {
            'BASE:HYDREX': {
                'engine': 'algebra',
                'quoter': '0x08b46265643a5389529D6f6616FA4a0d66F13Fdb',
                'chainId': 8453,
                'deployer': '0x0000000000000000000000000000000000000000',
            },
            'BASE:UNISWAPV3': {
                'engine': 'uniswapv3',
                'quoter': '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
                'chainId': 8453,
                'fee': 3000,
            },
            'BASE:UNISWAPV3_10000': {
                'engine': 'uniswapv3',
                'quoter': '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
                'chainId': 8453,
                'fee': 10000,
            },
            'BASE:UNISWAPV3_500': {
                'engine': 'uniswapv3',
                'quoter': '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
                'chainId': 8453,
                'fee': 500,
            },
            'ETH:UNISWAPV3': {
                'engine': 'uniswapv3',
                'quoter': '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
                'chainId': 1,
                'fee': 3000,
            },
            'ETH:UNISWAPV3_10000': {
                'engine': 'uniswapv3',
                'quoter': '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
                'chainId': 1,
                'fee': 10000,
            },
            'ETH:UNISWAPV3_500': {
                'engine': 'uniswapv3',
                'quoter': '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
                'chainId': 1,
                'fee': 500,
            },
        };
    }

    getQuoterRegistry (): Dict {
        return this.safeDict (this.options, 'quoterRegistry', this.getDefaultQuoterRegistry ());
    }

    getZeroAddress (): string {
        return '0x0000000000000000000000000000000000000000';
    }

    getErrorStringSelector (): string {
        return '08c379a0';
    }

    getQuoterOutputWordCount (): int {
        return 4;
    }

    getDecimalsSelector (): string {
        return '0x313ce567';
    }

    getUniswapv3QuoteSelector (): string {
        return '0xc6a5026a';
    }

    getAlgebraQuoteSelector (): string {
        return '0xe94764c4';
    }

    buildAmountInFromDecimals (decimals: int): string {
        let amountIn = '1';
        for (let zeroIndex = 0; zeroIndex < decimals; zeroIndex++) {
            amountIn = amountIn + '0';
        }
        return amountIn;
    }

    coerceAmountInForAbiEncode (amountIn) {
        if (typeof amountIn === 'string') {
            return this.convertToBigInt (amountIn);
        }
        if (typeof amountIn === 'number') {
            return this.convertToBigInt (String (amountIn));
        }
        return amountIn;
    }

    buildRegistryKey (networkCode: string, dexCode: string): string {
        return networkCode + ':' + dexCode;
    }

    resolveQuoterRoute (networkCode: string, dexCode: string): Dict {
        const registryKey = this.buildRegistryKey (networkCode, dexCode);
        const route = this.safeDict (this.getQuoterRegistry (), registryKey);
        if (route === undefined) {
            throw new NotSupported (this.id + ' does not support quoter route ' + registryKey);
        }
        return route;
    }

    normalizeTokenAddress (address) {
        if (address === undefined) {
            return undefined;
        }
        return address.toLowerCase ();
    }

    isTokenAddress (value) {
        return (value !== undefined) && (value.length > 5);
    }

    getTradingSymbolPart (symbol: string): string {
        const separatorIndex = symbol.indexOf ('@');
        if (separatorIndex >= 0) {
            return symbol.slice (0, separatorIndex);
        }
        return symbol;
    }

    isAddressPairSymbol (symbol: string): boolean {
        const tradingSymbol = this.getTradingSymbolPart (symbol);
        const parts = tradingSymbol.split ('/');
        if (parts.length !== 2) {
            return false;
        }
        const basePart = this.safeString (parts, 0);
        const quotePart = this.safeString (parts, 1);
        return this.isTokenAddress (basePart) && this.isTokenAddress (quotePart);
    }

    getAddressPairSymbol (baseAddress, quoteAddress, networkCode, dexCode) {
        let suffix = '@' + networkCode;
        if (dexCode !== undefined) {
            suffix = suffix + '!' + dexCode;
        }
        return this.normalizeTokenAddress (baseAddress) + '/' + this.normalizeTokenAddress (quoteAddress) + suffix;
    }

    normalizeAddressPairSymbol (symbol: string): string {
        if (!this.isAddressPairSymbol (symbol)) {
            return symbol;
        }
        const parsed = this.obParseDexPairSymbolInput (symbol);
        const tradingSymbol = this.safeString (parsed, 'tradingSymbol');
        const networkCode = this.safeString (parsed, 'networkCode');
        const dexCode = this.safeString (parsed, 'dexCode');
        const parts = tradingSymbol.split ('/');
        const baseAddress = this.safeString (parts, 0);
        const quoteAddress = this.safeString (parts, 1);
        return this.getAddressPairSymbol (baseAddress, quoteAddress, networkCode, dexCode);
    }

    requireAddressPairSymbol (symbol: string) {
        if (!this.isAddressPairSymbol (symbol)) {
            throw new BadSymbol (this.id + ' requires address-pair symbols (baseAddr/quoteAddr@NETWORK!DEX), got ' + symbol);
        }
    }

    requireNetworkCode (networkCode, symbol: string) {
        if ((networkCode === undefined) || (networkCode === '')) {
            throw new BadSymbol (this.id + ' symbol must include a network suffix using @ for ' + symbol);
        }
    }

    requireDexCode (dexCode, symbol: string) {
        if ((dexCode === undefined) || (dexCode === '')) {
            throw new BadSymbol (this.id + ' symbol must include a dex suffix using ! for ' + symbol);
        }
    }

    marketWithRequestedSymbol (market: Market, requestedSymbol: string): MarketInterface {
        const marketSymbol = this.safeString (market, 'symbol');
        if (marketSymbol === requestedSymbol) {
            return market;
        }
        return this.extend (market, { 'symbol': requestedSymbol });
    }

    market (symbol: string): MarketInterface {
        if (this.markets === undefined) {
            throw new ExchangeError (this.id + ' markets not loaded');
        }
        if (symbol in this.markets) {
            return this.marketWithRequestedSymbol (this.markets[symbol], symbol);
        }
        const normalizedSymbol = this.normalizeAddressPairSymbol (symbol);
        if ((normalizedSymbol !== symbol) && (normalizedSymbol in this.markets)) {
            return this.marketWithRequestedSymbol (this.markets[normalizedSymbol], symbol);
        }
        return super.market (symbol);
    }

    buildMarketSymbol (tradingSymbol: string, networkCode: string, dexCode): string {
        return tradingSymbol + '@' + networkCode + '!' + dexCode;
    }

    buildMarketId (networkCode: string, dexCode: string, chainSlug: string, baseId: string, quoteId: string): string {
        return networkCode + ':' + dexCode + ':' + chainSlug + ':' + baseId + ':' + quoteId;
    }

    parseMarketId (marketId: string): Dict {
        const parts = marketId.split (':');
        return {
            'networkCode': this.safeString (parts, 0),
            'dexCode': this.safeString (parts, 1),
            'chainSlug': this.safeString (parts, 2),
            'baseId': this.safeString (parts, 3),
            'quoteId': this.safeString (parts, 4),
        };
    }

    parseSyntheticMarket (tradingSymbol: string, networkCode: string, dexCode: string, baseId: string, quoteId: string): Market {
        const chainSlug = this.networkCodeToId (networkCode);
        const symbol = this.buildMarketSymbol (tradingSymbol, networkCode, dexCode);
        const id = this.buildMarketId (networkCode, dexCode, chainSlug, baseId, quoteId);
        return {
            'id': id,
            'symbol': symbol,
            'base': baseId,
            'quote': quoteId,
            'settle': undefined,
            'baseId': baseId,
            'quoteId': quoteId,
            'settleId': undefined,
            'type': 'spot',
            'spot': true,
            'margin': false,
            'swap': false,
            'future': false,
            'option': false,
            'active': true,
            'contract': false,
            'linear': undefined,
            'inverse': undefined,
            'contractSize': undefined,
            'expiry': undefined,
            'expiryDatetime': undefined,
            'strike': undefined,
            'optionType': undefined,
            'taker': undefined,
            'maker': undefined,
            'percentage': undefined,
            'tierBased': undefined,
            'feeSide': undefined,
            'precision': {
                'amount': undefined,
                'price': undefined,
            },
            'limits': {
                'leverage': { 'min': undefined, 'max': undefined },
                'amount': { 'min': undefined, 'max': undefined },
                'price': { 'min': undefined, 'max': undefined },
                'cost': { 'min': undefined, 'max': undefined },
            },
            'created': undefined,
            'info': {},
        };
    }

    parseSyntheticMarketFromSymbol (symbol: string): Market {
        this.requireAddressPairSymbol (symbol);
        const parsed = this.obParseDexPairSymbolInput (symbol);
        const tradingSymbol = this.safeString (parsed, 'tradingSymbol');
        const networkCode = this.safeString (parsed, 'networkCode');
        const dexCode = this.safeString (parsed, 'dexCode');
        this.requireNetworkCode (networkCode, symbol);
        this.requireDexCode (dexCode, symbol);
        this.resolveQuoterRoute (networkCode, dexCode);
        const parts = tradingSymbol.split ('/');
        const baseId = this.normalizeTokenAddress (this.safeString (parts, 0));
        const quoteId = this.normalizeTokenAddress (this.safeString (parts, 1));
        return this.parseSyntheticMarket (tradingSymbol, networkCode, dexCode, baseId, quoteId);
    }

    indexAddressPairMarketKeys () {
        const marketsList = Object.values (this.markets);
        for (let marketIndex = 0; marketIndex < marketsList.length; marketIndex++) {
            const market = marketsList[marketIndex];
            const unifiedSymbol = this.safeString (market, 'symbol');
            if (unifiedSymbol === undefined) {
                continue;
            }
            if (unifiedSymbol.indexOf ('@') < 0) {
                continue;
            }
            const parsed = this.obParseNetworkDexSymbol (unifiedSymbol);
            const networkCode = this.safeString (parsed, 'networkCode');
            const dexCode = this.safeString (parsed, 'dexCode');
            const baseId = this.safeString (market, 'baseId');
            const quoteId = this.safeString (market, 'quoteId');
            if ((baseId !== undefined) && (quoteId !== undefined)) {
                const addressAliasSymbol = this.getAddressPairSymbol (baseId, quoteId, networkCode, dexCode);
                if ((addressAliasSymbol !== unifiedSymbol) && !(addressAliasSymbol in this.markets)) {
                    this.markets[addressAliasSymbol] = market;
                }
            }
        }
        const unifiedSymbols: Dict = {};
        for (let marketIndex = 0; marketIndex < marketsList.length; marketIndex++) {
            const unifiedSymbol = this.safeString (marketsList[marketIndex], 'symbol');
            if (unifiedSymbol !== undefined) {
                unifiedSymbols[unifiedSymbol] = true;
            }
        }
        this.symbols = Object.keys (this.keysort (unifiedSymbols));
    }

    setMarkets (markets, currencies = undefined) {
        super.setMarkets (markets, currencies);
        this.indexAddressPairMarketKeys ();
        return this.markets;
    }

    mergeMarkets (newMarkets: Market[]) {
        const existingMarkets = (this.markets === undefined) ? [] : Object.values (this.markets);
        const combined = this.arrayConcat (existingMarkets, newMarkets);
        this.setMarkets (combined);
    }

    isMarketSymbolCached (symbol: string): boolean {
        if (this.markets === undefined) {
            return false;
        }
        const normalizedSymbol = this.normalizeAddressPairSymbol (symbol);
        return (symbol in this.markets) || ((normalizedSymbol !== symbol) && (normalizedSymbol in this.markets));
    }

    removeCachedMarketSymbol (symbol: string) {
        if (this.markets === undefined) {
            return;
        }
        if (symbol in this.markets) {
            delete this.markets[symbol];
        }
        const normalizedSymbol = this.normalizeAddressPairSymbol (symbol);
        if ((normalizedSymbol !== symbol) && (normalizedSymbol in this.markets)) {
            delete this.markets[normalizedSymbol];
        }
    }

    obParseDexPairSymbolInput (symbol: string): Dict {
        if (symbol.indexOf ('@') >= 0) {
            const parsed = this.obParseNetworkDexSymbol (symbol);
            const dexCode = this.safeString (parsed, 'dexCode');
            this.requireDexCode (dexCode, symbol);
            return parsed;
        }
        throw new BadSymbol (this.id + ' symbol must include a network suffix using @ for ' + symbol);
    }

    async resolveMarkets (symbols: string[], params = {}): Promise<Dict> {
        const marketsBySymbol: Dict = {};
        const pendingSymbols = [];
        const marketsDict = (this.markets === undefined) ? {} : this.markets;
        for (let symbolIndex = 0; symbolIndex < symbols.length; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            const normalizedSymbol = this.normalizeAddressPairSymbol (symbol);
            if ((symbol in marketsDict) || ((normalizedSymbol !== symbol) && (normalizedSymbol in marketsDict))) {
                marketsBySymbol[symbol] = this.market (symbol);
                continue;
            }
            pendingSymbols.push (symbol);
        }
        const newMarkets: Market[] = [];
        for (let pendingIndex = 0; pendingIndex < pendingSymbols.length; pendingIndex++) {
            const symbol = pendingSymbols[pendingIndex];
            const market = this.parseSyntheticMarketFromSymbol (symbol);
            newMarkets.push (market);
            marketsBySymbol[symbol] = market;
        }
        if (newMarkets.length > 0) {
            this.mergeMarkets (newMarkets);
            for (let pendingIndex = 0; pendingIndex < pendingSymbols.length; pendingIndex++) {
                const symbol = pendingSymbols[pendingIndex];
                marketsBySymbol[symbol] = this.market (symbol);
            }
        }
        return {
            'marketsBySymbol': marketsBySymbol,
        };
    }

    getRpcUrl (networkCode: string): string {
        const chainSlug = this.networkCodeToId (networkCode);
        const rpcUrls = this.safeDict (this.options, 'rpcUrls', {});
        let rpcTemplate = this.safeString (rpcUrls, chainSlug);
        if (rpcTemplate === undefined) {
            const apiUrls = this.safeDict (this.urls, 'api', {});
            rpcTemplate = this.safeString (apiUrls, 'rest');
        }
        if (rpcTemplate === undefined) {
            throw new NotSupported (this.id + ' no RPC URL configured for network ' + networkCode);
        }
        if ((this.apiKey === undefined) || (this.apiKey === '')) {
            throw new AuthenticationError (this.id + ' requires an apiKey (Alchemy API key)');
        }
        return rpcTemplate.replace ('{apiKey}', this.apiKey);
    }

    buildDecimalsCacheKey (networkCode: string, tokenAddress: string): string {
        return networkCode + ':' + this.normalizeTokenAddress (tokenAddress);
    }

    getCachedDecimals (networkCode: string, tokenAddress: string) {
        const cache = this.safeDict (this.options, 'decimalsCache', {});
        const cacheKey = this.buildDecimalsCacheKey (networkCode, tokenAddress);
        return this.safeInteger (cache, cacheKey);
    }

    setCachedDecimals (networkCode: string, tokenAddress: string, decimals: int) {
        const cache = this.safeDict (this.options, 'decimalsCache', {});
        const cacheKey = this.buildDecimalsCacheKey (networkCode, tokenAddress);
        cache[cacheKey] = decimals;
        this.options['decimalsCache'] = cache;
    }

    decodeUint256Hex (resultHex: string): number {
        const normalizedHex = resultHex.startsWith ('0x') ? resultHex.slice (2) : resultHex;
        if (normalizedHex.length < 64) {
            throw new ExchangeError (this.id + ' RPC result too short to decode uint256: ' + resultHex);
        }
        return parseInt (normalizedHex.slice (0, 64), 16);
    }

    decodeQuoterRevertData (revertData: string) {
        const normalizedHex = revertData.startsWith ('0x') ? revertData.slice (2) : revertData;
        if ((normalizedHex.length >= 8) && (normalizedHex.slice (0, 8) === this.getErrorStringSelector ())) {
            return undefined;
        }
        const expectedLength = this.getQuoterOutputWordCount () * 64;
        if (normalizedHex.length === expectedLength) {
            return '0x' + normalizedHex;
        }
        return undefined;
    }

    decodeQuoterAmountOut (resultHex: string): number {
        const normalizedHex = resultHex.startsWith ('0x') ? resultHex.slice (2) : resultHex;
        if (normalizedHex.length < 64) {
            throw new ExchangeError (this.id + ' quoter result too short to decode amountOut: ' + resultHex);
        }
        return parseInt (normalizedHex.slice (0, 64), 16);
    }

    async ethCall (rpcUrl: string, toAddress: string, calldata: string, params = {}): Promise<string> {
        const requestBody = {
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'eth_call',
            'params': [
                {
                    'to': toAddress,
                    'data': calldata,
                },
                'latest',
            ],
        };
        const response = await this.fetch (rpcUrl, 'POST', {
            'Content-Type': 'application/json',
        }, this.json (requestBody));
        const result = this.safeString (response, 'result');
        if (result !== undefined) {
            return result;
        }
        const error = this.safeDict (response, 'error');
        if (error !== undefined) {
            const revertData = this.safeString (error, 'data');
            if (revertData !== undefined) {
                const decodedResult = this.decodeQuoterRevertData (revertData);
                if (decodedResult !== undefined) {
                    return decodedResult;
                }
            }
            const errorMessage = this.safeString (error, 'message');
            throw new ExchangeError (this.id + ' eth_call failed: ' + errorMessage);
        }
        throw new ExchangeError (this.id + ' eth_call returned no result');
    }

    async fetchTokenDecimals (networkCode: string, tokenAddress: string, params = {}): Promise<int> {
        const cachedDecimals = this.getCachedDecimals (networkCode, tokenAddress);
        if (cachedDecimals !== undefined) {
            return cachedDecimals;
        }
        const rpcUrl = this.getRpcUrl (networkCode);
        const resultHex = await this.ethCall (rpcUrl, tokenAddress, this.getDecimalsSelector (), params);
        const decimals = this.decodeUint256Hex (resultHex);
        this.setCachedDecimals (networkCode, tokenAddress, decimals);
        return decimals;
    }

    buildUniswapV3QuoterCalldata (tokenIn: string, tokenOut: string, amountIn, fee: int): string {
        const encodedAmountIn = this.coerceAmountInForAbiEncode (amountIn);
        const encodedParams = this.ethAbiEncode (
            [ 'address', 'address', 'uint256', 'uint24', 'uint160' ],
            [ tokenIn, tokenOut, encodedAmountIn, fee, 0 ]
        );
        return '0x' + this.getUniswapv3QuoteSelector ().slice (2) + this.binaryToBase16 (encodedParams);
    }

    buildAlgebraQuoterCalldata (tokenIn: string, tokenOut: string, deployer: string, amountIn): string {
        const encodedAmountIn = this.coerceAmountInForAbiEncode (amountIn);
        const encodedParams = this.ethAbiEncode (
            [ 'address', 'address', 'address', 'uint256', 'uint160' ],
            [ tokenIn, tokenOut, deployer, encodedAmountIn, 0 ]
        );
        return '0x' + this.getAlgebraQuoteSelector ().slice (2) + this.binaryToBase16 (encodedParams);
    }

    getEffectiveUniswapFee (route: Dict, params = {}): int {
        const paramsFee = this.safeInteger (params, 'fee');
        if (paramsFee !== undefined) {
            return paramsFee;
        }
        const routeFee = this.safeInteger (route, 'fee');
        if (routeFee === undefined) {
            throw new ExchangeError (this.id + ' missing fee for uniswapv3 route');
        }
        return routeFee;
    }

    async buildQuoterCalldataForMarket (market: Market, params = {}): Promise<Dict> {
        const symbol = this.safeString (market, 'symbol');
        const parsed = this.obParseNetworkDexSymbol (symbol);
        const networkCode = this.safeString (parsed, 'networkCode');
        const dexCode = this.safeString (parsed, 'dexCode');
        const route = this.resolveQuoterRoute (networkCode, dexCode);
        const engine = this.safeString (route, 'engine');
        const quoter = this.safeString (route, 'quoter');
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const baseDecimals = await this.fetchTokenDecimals (networkCode, baseId, params);
        const amountIn = this.buildAmountInFromDecimals (baseDecimals);
        let calldata: string;
        if (engine === 'algebra') {
            const deployer = this.safeString (route, 'deployer', this.getZeroAddress ());
            calldata = this.buildAlgebraQuoterCalldata (baseId, quoteId, deployer, amountIn);
        } else if (engine === 'uniswapv3') {
            const fee = this.getEffectiveUniswapFee (route, params);
            calldata = this.buildUniswapV3QuoterCalldata (baseId, quoteId, amountIn, fee);
        } else {
            throw new NotSupported (this.id + ' unsupported quoter engine ' + engine);
        }
        return {
            'networkCode': networkCode,
            'quoter': quoter,
            'calldata': calldata,
            'baseDecimals': baseDecimals,
            'quoteId': quoteId,
        };
    }

    async fetchQuoterAmountOut (market: Market, params = {}): Promise<Dict> {
        const quoteRequest = await this.buildQuoterCalldataForMarket (market, params);
        const networkCode = this.safeString (quoteRequest, 'networkCode');
        const quoter = this.safeString (quoteRequest, 'quoter');
        const calldata = this.safeString (quoteRequest, 'calldata');
        const quoteId = this.safeString (quoteRequest, 'quoteId');
        const baseDecimals = this.safeInteger (quoteRequest, 'baseDecimals');
        const rpcUrl = this.getRpcUrl (networkCode);
        const resultHex = await this.ethCall (rpcUrl, quoter, calldata, params);
        const amountOut = this.decodeQuoterAmountOut (resultHex);
        const quoteDecimals = await this.fetchTokenDecimals (networkCode, quoteId, params);
        const last = amountOut / Math.pow (10, quoteDecimals);
        return {
            'amountOut': amountOut,
            'last': last,
            'baseDecimals': baseDecimals,
            'quoteDecimals': quoteDecimals,
            'resultHex': resultHex,
        };
    }

    parseTickerFromQuote (market: Market, quoteInfo: Dict): Ticker {
        const symbol = this.safeString (market, 'symbol');
        const last = this.numberToString (this.safeNumber (quoteInfo, 'last'));
        const timestamp = this.seconds ();
        return this.safeTicker ({
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp * 1000),
            'high': undefined,
            'low': undefined,
            'bid': last,
            'bidVolume': undefined,
            'ask': last,
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': undefined,
            'quoteVolume': undefined,
            'info': quoteInfo,
        }, market);
    }

    /**
     * @method
     * @name alchemy#fetchMarkets
     * @description fetches markets; returns empty by default (markets loaded on demand)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of market structures
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        return [];
    }

    /**
     * @method
     * @name alchemy#fetchTicker
     * @description fetches a price ticker for a market via on-chain quoter eth_call
     * @param {string} symbol unified address-pair symbol with @network!dex suffix
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.fee] optional Uniswap V3 fee tier override
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        const market = resolveResult['marketsBySymbol'][symbol];
        const quoteInfo = await this.fetchQuoterAmountOut (market, params);
        const ticker = this.parseTickerFromQuote (market, quoteInfo);
        ticker['symbol'] = symbol;
        return ticker;
    }

    /**
     * @method
     * @name alchemy#fetchTickers
     * @description fetches price tickers for multiple markets; one eth_call per symbol
     * @param {string[]} symbols list of unified address-pair symbols with @network!dex suffix
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a dictionary of [ticker structures]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTickers (symbols: Strings = undefined, params = {}): Promise<Tickers> {
        if (symbols === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchTickers() requires a non-empty symbols argument');
        }
        const symbolsLength = symbols.length;
        if (symbolsLength === 0) {
            throw new ArgumentsRequired (this.id + ' fetchTickers() requires a non-empty symbols argument');
        }
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets (symbols, params);
        const marketsBySymbol = resolveResult['marketsBySymbol'];
        const result: Dict = {};
        for (let symbolIndex = 0; symbolIndex < symbolsLength; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            const market = this.safeValue (marketsBySymbol, symbol);
            const quoteInfo = await this.fetchQuoterAmountOut (market, params);
            const ticker = this.parseTickerFromQuote (market, quoteInfo);
            ticker['symbol'] = symbol;
            result[symbol] = ticker;
        }
        return result;
    }

    /**
     * @method
     * @name alchemy#obLoadMarketsForSymbols
     * @description lazily resolves and populates this.markets for the given symbols
     * @param {string[]} symbols list of address-pair symbols with @network!dex suffix
     * @param {boolean} reload when true, re-fetch symbols even if already cached in this.markets
     * @param {object} params extra parameters specific to the exchange API endpoint
     * @returns {object[]} empty list; ob_alchemy returns fixed market status structures
     */
    async obLoadMarketsForSymbols (symbols: string[], reload = false, params = {}): Promise<Dict[]> {
        if (symbols === undefined) {
            throw new ArgumentsRequired (this.id + ' obLoadMarketsForSymbols() requires a non-empty symbols argument');
        }
        const symbolsLength = symbols.length;
        if (symbolsLength === 0) {
            throw new ArgumentsRequired (this.id + ' obLoadMarketsForSymbols() requires a non-empty symbols argument');
        }
        await this.loadMarkets ();
        const symbolsToResolve = [];
        for (let symbolIndex = 0; symbolIndex < symbolsLength; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            if (reload) {
                this.removeCachedMarketSymbol (symbol);
                symbolsToResolve.push (symbol);
            } else if (!this.isMarketSymbolCached (symbol)) {
                symbolsToResolve.push (symbol);
            }
        }
        if (symbolsToResolve.length > 0) {
            await this.resolveMarkets (symbolsToResolve, params);
        }
        return [];
    }

    handleErrors (httpCode: int, reason: string, url: string, method: string, headers: Dict, body: string, response, requestHeaders, requestBody) {
        if (response === undefined) {
            return undefined;
        }
        if (httpCode === 429) {
            throw new RateLimitExceeded (this.id + ' ' + body);
        }
        if (httpCode === 401 || httpCode === 403) {
            throw new AuthenticationError (this.id + ' ' + body);
        }
        return undefined;
    }
}
