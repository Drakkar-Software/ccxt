//  ---------------------------------------------------------------------------

import Exchange from './abstract/dexscreener.js';
import { ArgumentsRequired, BadRequest, BadSymbol, ExchangeError, RateLimitExceeded } from './base/errors.js';
import type { Market, Dict, Ticker, int, Strings, Tickers, MarketInterface } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class dexscreener
 * @augments Exchange
 * @description DexScreener - DEX pair market data provider (read-only).
 * Docs: https://docs.dexscreener.com/api/reference
 */
export default class dexscreener extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'dexscreener',
            'name': 'DexScreener',
            'countries': [ ],
            'rateLimit': 1000,
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
                'transfer': false,
            },
            'timeframes': {
                '1d': '1d',
            },
            'urls': {
                'logo': 'https://dexscreener.com/favicon.ico',
                'api': {
                    'rest': 'https://api.dexscreener.com',
                },
                'www': 'https://dexscreener.com',
                'doc': [
                    'https://docs.dexscreener.com/api/reference',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'tokens/v1/{chainId}/{tokenAddresses}',
                        'token-pairs/v1/{chainId}/{tokenAddress}',
                        'latest/dex/pairs/{chainId}/{pairId}',
                    ],
                },
            },
            'requiredCredentials': {
                'apiKey': false,
                'secret': false,
            },
            'options': {
                'chainId': undefined,
                'dexId': undefined,
                'baseTokenAddresses': undefined,
                'quoteTokenAddresses': undefined,
                'maxTokenAddressesPerRequest': 30,
            },
        });
    }

    checkRequiredOptions () {
        const chainId = this.safeString (this.options, 'chainId');
        const dexId = this.safeString (this.options, 'dexId');
        if ((chainId === undefined) || (chainId === '')) {
            throw new ArgumentsRequired (this.id + ' requires options.chainId to be set');
        }
        if ((dexId === undefined) || (dexId === '')) {
            throw new ArgumentsRequired (this.id + ' requires options.dexId to be set');
        }
    }

    getConfiguredChainId () {
        this.checkRequiredOptions ();
        return this.safeString (this.options, 'chainId');
    }

    getConfiguredDexId () {
        this.checkRequiredOptions ();
        return this.safeString (this.options, 'dexId');
    }

    getTokenAddressList (optionKey: string): string[] {
        const raw = this.safeList (this.options, optionKey, []);
        const result: string[] = [];
        for (let i = 0; i < raw.length; i++) {
            const address = this.safeString (raw, i);
            if (address !== undefined) {
                result.push (address);
            }
        }
        return result;
    }

    getAllConfiguredTokenAddresses (): string[] {
        const baseAddresses = this.getTokenAddressList ('baseTokenAddresses');
        const quoteAddresses = this.getTokenAddressList ('quoteTokenAddresses');
        return this.getUniqueTokenAddresses (this.arrayConcat (baseAddresses, quoteAddresses));
    }

    getMarketDiscoveryAddresses (): string[] {
        const baseAddresses = this.getTokenAddressList ('baseTokenAddresses');
        if (baseAddresses.length > 0) {
            return this.getUniqueTokenAddresses (baseAddresses);
        }
        return this.getUniqueTokenAddresses (this.getTokenAddressList ('quoteTokenAddresses'));
    }

    clearDiscoveryPairsCache () {
        this.options['discoveryPairsCache'] = undefined;
    }

    getCachedDiscoveryPairs () {
        const cached = this.safeValue (this.options, 'discoveryPairsCache');
        if (cached === undefined) {
            return undefined;
        }
        return cached;
    }

    setCachedDiscoveryPairs (pairs: Dict[]) {
        this.options['discoveryPairsCache'] = pairs;
    }

    pairMatchesAddressCombination (pair: Dict, baseAddress: string, quoteAddress: string): boolean {
        const baseToken = this.safeDict (pair, 'baseToken', {});
        const quoteToken = this.safeDict (pair, 'quoteToken', {});
        const pairBase = this.normalizeTokenAddress (this.safeString (baseToken, 'address'));
        const pairQuote = this.normalizeTokenAddress (this.safeString (quoteToken, 'address'));
        const baseMatch = pairBase === this.normalizeTokenAddress (baseAddress);
        const quoteMatch = pairQuote === this.normalizeTokenAddress (quoteAddress);
        return baseMatch && quoteMatch;
    }

    hasAllConfiguredCombinations (pairs: Dict[]): boolean {
        const baseAddresses = this.getTokenAddressList ('baseTokenAddresses');
        const quoteAddresses = this.getTokenAddressList ('quoteTokenAddresses');
        if ((baseAddresses.length === 0) || (quoteAddresses.length === 0)) {
            return true;
        }
        const dexId = this.getConfiguredDexId ();
        for (let baseIndex = 0; baseIndex < baseAddresses.length; baseIndex++) {
            const baseAddress = baseAddresses[baseIndex];
            for (let quoteIndex = 0; quoteIndex < quoteAddresses.length; quoteIndex++) {
                const quoteAddress = quoteAddresses[quoteIndex];
                let found = false;
                for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
                    const pair = pairs[pairIndex];
                    if (this.safeString (pair, 'dexId') !== dexId) {
                        continue;
                    }
                    if (this.pairMatchesAddressCombination (pair, baseAddress, quoteAddress)) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return false;
                }
            }
        }
        return true;
    }

    mergePairsByPairAddress (pairs: Dict[]): Dict[] {
        const mergedByPairAddress: Dict = {};
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            const pairAddress = this.safeString (pair, 'pairAddress');
            if (pairAddress === undefined) {
                continue;
            }
            mergedByPairAddress[pairAddress] = pair;
        }
        return Object.values (mergedByPairAddress);
    }

    async fetchDiscoveryPairs (params = {}, extraTokenAddresses: string[] = []): Promise<any[]> {
        const useCache = extraTokenAddresses.length === 0;
        if (useCache) {
            const cachedPairs = this.getCachedDiscoveryPairs ();
            if (cachedPairs !== undefined) {
                return cachedPairs;
            }
        }
        const allAddresses = this.getUniqueTokenAddresses (
            this.arrayConcat (this.getAllConfiguredTokenAddresses (), extraTokenAddresses)
        );
        if (allAddresses.length === 0) {
            return [];
        }
        let pairs = await this.fetchPairsForTokensV1 (allAddresses, params);
        if (!this.hasAllConfiguredCombinations (pairs)) {
            const discoveryAddresses = this.getUniqueTokenAddresses (
                this.arrayConcat (this.getMarketDiscoveryAddresses (), extraTokenAddresses)
            );
            if (discoveryAddresses.length > 0) {
                const extraPairs = await this.fetchPairsForTokenAddresses (discoveryAddresses, params);
                pairs = this.mergePairsByPairAddress (this.arrayConcat (pairs, extraPairs));
            }
        }
        if (useCache) {
            this.setCachedDiscoveryPairs (pairs);
        }
        return pairs;
    }

    normalizeTokenAddress (address) {
        if (address === undefined) {
            return undefined;
        }
        return address.toLowerCase ();
    }

    isTokenAddress (value) {
        return (value !== undefined) && (value.length > 4);
    }

    isAddressPairSymbol (symbol: string): boolean {
        const parts = symbol.split ('/');
        if (parts.length !== 2) {
            return false;
        }
        const basePart = this.safeString (parts, 0);
        const quotePart = this.safeString (parts, 1);
        return this.isTokenAddress (basePart) && this.isTokenAddress (quotePart);
    }

    getAddressPairSymbol (baseAddress, quoteAddress) {
        return this.normalizeTokenAddress (baseAddress) + '/' + this.normalizeTokenAddress (quoteAddress);
    }

    normalizeAddressPairSymbol (symbol: string): string {
        if (!this.isAddressPairSymbol (symbol)) {
            return symbol;
        }
        const parts = symbol.split ('/');
        const baseAddress = this.safeString (parts, 0);
        const quoteAddress = this.safeString (parts, 1);
        return this.getAddressPairSymbol (baseAddress, quoteAddress);
    }

    market (symbol: string): MarketInterface {
        if (this.markets === undefined) {
            throw new ExchangeError (this.id + ' markets not loaded');
        }
        if (symbol in this.markets) {
            return this.markets[symbol];
        }
        const normalizedSymbol = this.normalizeAddressPairSymbol (symbol);
        if ((normalizedSymbol !== symbol) && (normalizedSymbol in this.markets)) {
            return this.markets[normalizedSymbol];
        }
        return super.market (symbol);
    }

    safeLiquidityUsd (pair: Dict): number {
        const liquidity = this.safeDict (pair, 'liquidity', {});
        return this.safeNumber (liquidity, 'usd', 0);
    }

    pairPassesFilters (pair: Dict, baseAddresses: string[], quoteAddresses: string[]): boolean {
        const dexId = this.getConfiguredDexId ();
        const pairDexId = this.safeString (pair, 'dexId');
        if (pairDexId !== dexId) {
            return false;
        }
        const baseToken = this.safeDict (pair, 'baseToken', {});
        const quoteToken = this.safeDict (pair, 'quoteToken', {});
        const baseAddress = this.normalizeTokenAddress (this.safeString (baseToken, 'address'));
        const quoteAddress = this.normalizeTokenAddress (this.safeString (quoteToken, 'address'));
        const hasBaseList = baseAddresses.length > 0;
        const hasQuoteList = quoteAddresses.length > 0;
        if (hasBaseList && hasQuoteList) {
            const baseSet: Dict = {};
            const quoteSet: Dict = {};
            for (let i = 0; i < baseAddresses.length; i++) {
                baseSet[this.normalizeTokenAddress (baseAddresses[i])] = true;
            }
            for (let j = 0; j < quoteAddresses.length; j++) {
                quoteSet[this.normalizeTokenAddress (quoteAddresses[j])] = true;
            }
            return (baseAddress in baseSet) && (quoteAddress in quoteSet);
        }
        if (hasBaseList) {
            for (let i = 0; i < baseAddresses.length; i++) {
                if (this.normalizeTokenAddress (baseAddresses[i]) === baseAddress) {
                    return true;
                }
            }
            return false;
        }
        if (hasQuoteList) {
            for (let i = 0; i < quoteAddresses.length; i++) {
                if (this.normalizeTokenAddress (quoteAddresses[i]) === quoteAddress) {
                    return true;
                }
            }
            return false;
        }
        return false;
    }

    parseTokenPairsResponse (response) {
        if (Array.isArray (response)) {
            return response;
        }
        return this.safeList (response, 'pairs', []);
    }

    async fetchPairsForTokenAddressBatch (tokenAddresses: string[], params = {}): Promise<any[]> {
        const allPairs: Dict[] = [];
        const chainId = this.getConfiguredChainId ();
        for (let i = 0; i < tokenAddresses.length; i++) {
            const tokenAddress = tokenAddresses[i];
            const request: Dict = {
                'chainId': chainId,
                'tokenAddress': tokenAddress,
            };
            const response = await this.publicGetTokenPairsV1ChainIdTokenAddress (this.extend (request, params));
            const pairs = this.parseTokenPairsResponse (response);
            for (let j = 0; j < pairs.length; j++) {
                allPairs.push (pairs[j]);
            }
        }
        return allPairs;
    }

    async fetchPairsForTokenAddress (tokenAddress: string, params = {}): Promise<any[]> {
        return await this.fetchPairsForTokenAddressBatch ([ tokenAddress ], params);
    }

    getUniqueTokenAddresses (tokenAddresses: string[]): string[] {
        const uniqueAddresses: Dict = {};
        for (let i = 0; i < tokenAddresses.length; i++) {
            const address = tokenAddresses[i];
            if (address !== undefined) {
                uniqueAddresses[address] = true;
            }
        }
        return Object.keys (uniqueAddresses);
    }

    async fetchPairsForTokenAddresses (tokenAddresses: string[], params = {}): Promise<any[]> {
        const addresses = this.getUniqueTokenAddresses (tokenAddresses);
        const maxBatchSize = this.safeInteger (this.options, 'maxTokenAddressesPerRequest', 30);
        const allPairs: Dict[] = [];
        let offset = 0;
        while (offset < addresses.length) {
            const batch = addresses.slice (offset, offset + maxBatchSize);
            const pairs = await this.fetchPairsForTokenAddressBatch (batch, params);
            for (let j = 0; j < pairs.length; j++) {
                allPairs.push (pairs[j]);
            }
            offset = offset + maxBatchSize;
        }
        return allPairs;
    }

    async fetchPairsForTokensV1Batch (tokenAddresses: string[], params = {}): Promise<any[]> {
        if (tokenAddresses.length === 0) {
            return [];
        }
        const chainId = this.getConfiguredChainId ();
        const request: Dict = {
            'chainId': chainId,
            'tokenAddresses': tokenAddresses.join (','),
        };
        const response = await this.publicGetTokensV1ChainIdTokenAddresses (this.extend (request, params));
        return this.parseTokenPairsResponse (response);
    }

    async fetchPairsForTokensV1 (tokenAddresses: string[], params = {}): Promise<any[]> {
        const addresses = this.getUniqueTokenAddresses (tokenAddresses);
        const maxBatchSize = this.safeInteger (this.options, 'maxTokenAddressesPerRequest', 30);
        const allPairs: Dict[] = [];
        let offset = 0;
        while (offset < addresses.length) {
            const batch = addresses.slice (offset, offset + maxBatchSize);
            const pairs = await this.fetchPairsForTokensV1Batch (batch, params);
            for (let j = 0; j < pairs.length; j++) {
                allPairs.push (pairs[j]);
            }
            offset = offset + maxBatchSize;
        }
        return allPairs;
    }

    selectBestPairs (pairs: Dict[]): Dict[] {
        const bestBySymbol: Dict = {};
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            const baseToken = this.safeDict (pair, 'baseToken', {});
            const quoteToken = this.safeDict (pair, 'quoteToken', {});
            const base = this.safeCurrencyCode (this.safeString (baseToken, 'symbol'));
            const quote = this.safeCurrencyCode (this.safeString (quoteToken, 'symbol'));
            if ((base === undefined) || (quote === undefined)) {
                continue;
            }
            const symbol = base + '/' + quote;
            const liquidityUsd = this.safeLiquidityUsd (pair);
            const existing = this.safeDict (bestBySymbol, symbol);
            if (existing === undefined) {
                bestBySymbol[symbol] = pair;
            } else if (liquidityUsd > this.safeLiquidityUsd (existing)) {
                bestBySymbol[symbol] = pair;
            }
        }
        return Object.values (bestBySymbol);
    }

    buildMarketsFromPairs (pairs: Dict[]): Market[] {
        const bestPairs = this.selectBestPairs (pairs);
        const result: Market[] = [];
        for (let i = 0; i < bestPairs.length; i++) {
            const market = this.parseMarket (bestPairs[i]);
            result.push (market);
        }
        return result;
    }

    indexAddressPairMarketKeys () {
        const marketsList = Object.values (this.markets);
        for (let i = 0; i < marketsList.length; i++) {
            const market = marketsList[i];
            const baseId = this.safeString (market, 'baseId');
            const quoteId = this.safeString (market, 'quoteId');
            if ((baseId === undefined) || (quoteId === undefined)) {
                continue;
            }
            const aliasSymbol = this.getAddressPairSymbol (baseId, quoteId);
            const unifiedSymbol = this.safeString (market, 'symbol');
            if ((aliasSymbol !== unifiedSymbol) && !(aliasSymbol in this.markets)) {
                this.markets[aliasSymbol] = market;
            }
        }
        const unifiedSymbols: Dict = {};
        for (let i = 0; i < marketsList.length; i++) {
            const unifiedSymbol = this.safeString (marketsList[i], 'symbol');
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
        const existingMarkets = Object.values (this.markets);
        const combined = this.arrayConcat (existingMarkets, newMarkets);
        this.setMarkets (combined);
    }

    /**
     * @method
     * @name dexscreener#fetchMarkets
     * @description fetches markets for configured token addresses on a chain and dex
     * @see https://docs.dexscreener.com/api/reference
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of market structures
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        const chainId = this.safeString (this.options, 'chainId');
        const dexId = this.safeString (this.options, 'dexId');
        if ((chainId === undefined) || (chainId === '') || (dexId === undefined) || (dexId === '')) {
            return [];
        }
        const baseAddresses = this.getTokenAddressList ('baseTokenAddresses');
        const quoteAddresses = this.getTokenAddressList ('quoteTokenAddresses');
        if ((baseAddresses.length === 0) && (quoteAddresses.length === 0)) {
            return [];
        }
        this.clearDiscoveryPairsCache ();
        const rawPairs = await this.fetchDiscoveryPairs (params);
        const filteredPairs = [];
        for (let i = 0; i < rawPairs.length; i++) {
            const pair = rawPairs[i];
            if (this.pairPassesFilters (pair, baseAddresses, quoteAddresses)) {
                filteredPairs.push (pair);
            }
        }
        return this.buildMarketsFromPairs (filteredPairs);
    }

    parseMarket (pair: Dict): Market {
        const chainId = this.safeString (pair, 'chainId', this.getConfiguredChainId ());
        const pairAddress = this.safeString (pair, 'pairAddress');
        const baseToken = this.safeDict (pair, 'baseToken', {});
        const quoteToken = this.safeDict (pair, 'quoteToken', {});
        const baseId = this.safeString (baseToken, 'address');
        const quoteId = this.safeString (quoteToken, 'address');
        const base = this.safeCurrencyCode (this.safeString (baseToken, 'symbol'));
        const quote = this.safeCurrencyCode (this.safeString (quoteToken, 'symbol'));
        const symbol = base + '/' + quote;
        const id = chainId + ':' + pairAddress;
        return {
            'id': id,
            'symbol': symbol,
            'base': base,
            'quote': quote,
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
            'info': pair,
        };
    }

    extractPairFromResponse (response: Dict): Dict {
        const pair = this.safeDict (response, 'pair');
        if (pair !== undefined) {
            return pair;
        }
        const pairs = this.safeList (response, 'pairs', []);
        if (pairs.length > 0) {
            return pairs[0];
        }
        if ((response !== undefined) && ('pairAddress' in response)) {
            return response;
        }
        throw new ExchangeError (this.id + ' invalid pair response');
    }

    getPairIdFromMarket (market: Market) {
        const info = this.safeDict (market, 'info', {});
        const pairAddress = this.safeString2 (info, 'pairAddress', 'pair_address');
        if (pairAddress !== undefined) {
            return pairAddress;
        }
        const marketId = this.safeString (market, 'id');
        if (marketId === undefined) {
            return undefined;
        }
        const parts = marketId.split (':');
        return this.safeString (parts, 1);
    }

    async fetchPairTicker (market: Market, params = {}): Promise<Ticker> {
        const chainId = this.getConfiguredChainId ();
        const pairId = this.getPairIdFromMarket (market);
        if (pairId === undefined) {
            throw new BadSymbol (this.id + ' market has no pair address');
        }
        const request: Dict = {
            'chainId': chainId,
            'pairId': pairId,
        };
        const response = await this.publicGetLatestDexPairsChainIdPairId (this.extend (request, params));
        const pair = this.extractPairFromResponse (response);
        return this.parseTicker (pair, market);
    }

    filterPairsForUnifiedSymbol (rawPairs: Dict[], symbol: string): Dict[] {
        const parts = symbol.split ('/');
        const baseCode = this.safeCurrencyCode (this.safeString (parts, 0));
        const quoteCode = this.safeCurrencyCode (this.safeString (parts, 1));
        const baseAddresses = this.getTokenAddressList ('baseTokenAddresses');
        const quoteAddresses = this.getTokenAddressList ('quoteTokenAddresses');
        const filteredPairs = [];
        for (let i = 0; i < rawPairs.length; i++) {
            const pair = rawPairs[i];
            if (!this.pairPassesFilters (pair, baseAddresses, quoteAddresses)) {
                continue;
            }
            const baseToken = this.safeDict (pair, 'baseToken', {});
            const quoteToken = this.safeDict (pair, 'quoteToken', {});
            const pairBase = this.safeCurrencyCode (this.safeString (baseToken, 'symbol'));
            const pairQuote = this.safeCurrencyCode (this.safeString (quoteToken, 'symbol'));
            if ((pairBase === baseCode) && (pairQuote === quoteCode)) {
                filteredPairs.push (pair);
            }
        }
        return filteredPairs;
    }

    filterPairsForAddressSymbol (rawPairs: Dict[], symbol: string): Dict[] {
        const parts = symbol.split ('/');
        const baseAddress = this.safeString (parts, 0);
        const quoteAddress = this.safeString (parts, 1);
        const filteredPairs = [];
        for (let i = 0; i < rawPairs.length; i++) {
            const pair = rawPairs[i];
            if (!this.pairPassesFilters (pair, [ baseAddress ], [ quoteAddress ])) {
                continue;
            }
            const baseToken = this.safeDict (pair, 'baseToken', {});
            const quoteToken = this.safeDict (pair, 'quoteToken', {});
            const pairBase = this.normalizeTokenAddress (this.safeString (baseToken, 'address'));
            const pairQuote = this.normalizeTokenAddress (this.safeString (quoteToken, 'address'));
            if ((pairBase === this.normalizeTokenAddress (baseAddress)) && (pairQuote === this.normalizeTokenAddress (quoteAddress))) {
                filteredPairs.push (pair);
            }
        }
        return filteredPairs;
    }

    assignResolvedMarket (marketsBySymbol: Dict, symbol: string) {
        marketsBySymbol[symbol] = this.market (symbol);
    }

    addConfiguredTokenAddresses (tokenAddressesToFetch: Dict) {
        const baseAddresses = this.getTokenAddressList ('baseTokenAddresses');
        const quoteAddresses = this.getTokenAddressList ('quoteTokenAddresses');
        for (let i = 0; i < baseAddresses.length; i++) {
            tokenAddressesToFetch[baseAddresses[i]] = true;
        }
        for (let i = 0; i < quoteAddresses.length; i++) {
            tokenAddressesToFetch[quoteAddresses[i]] = true;
        }
    }

    async resolveMarkets (symbols: string[], params = {}): Promise<Dict> {
        const marketsBySymbol: Dict = {};
        const missingAddressSymbols = [];
        const missingUnifiedSymbols = [];
        const tokenAddressesToFetch: Dict = {};
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            const normalizedSymbol = this.normalizeAddressPairSymbol (symbol);
            if ((symbol in this.markets) || ((normalizedSymbol !== symbol) && (normalizedSymbol in this.markets))) {
                marketsBySymbol[symbol] = this.market (symbol);
                continue;
            }
            if (!this.isAddressPairSymbol (symbol)) {
                missingUnifiedSymbols.push (symbol);
                this.addConfiguredTokenAddresses (tokenAddressesToFetch);
                continue;
            }
            missingAddressSymbols.push (symbol);
            const parts = symbol.split ('/');
            const baseAddress = this.safeString (parts, 0);
            const quoteAddress = this.safeString (parts, 1);
            tokenAddressesToFetch[baseAddress] = true;
            tokenAddressesToFetch[quoteAddress] = true;
        }
        const symbolsToResolve = this.arrayConcat (missingAddressSymbols, missingUnifiedSymbols);
        if (symbolsToResolve.length > 0) {
            const addressList = Object.keys (tokenAddressesToFetch);
            if (addressList.length === 0) {
                throw new BadSymbol (this.id + ' no token addresses configured to resolve markets');
            }
            const rawPairs = await this.fetchDiscoveryPairs (params, addressList);
            const pairsToMerge = [];
            for (let i = 0; i < missingAddressSymbols.length; i++) {
                const symbol = missingAddressSymbols[i];
                const filteredPairs = this.filterPairsForAddressSymbol (rawPairs, symbol);
                if (filteredPairs.length === 0) {
                    throw new BadSymbol (this.id + ' tokens are not supported for symbol ' + symbol);
                }
                for (let j = 0; j < filteredPairs.length; j++) {
                    pairsToMerge.push (filteredPairs[j]);
                }
            }
            for (let i = 0; i < missingUnifiedSymbols.length; i++) {
                const symbol = missingUnifiedSymbols[i];
                const filteredPairs = this.filterPairsForUnifiedSymbol (rawPairs, symbol);
                if (filteredPairs.length === 0) {
                    throw new BadSymbol (this.id + ' tokens are not supported for symbol ' + symbol);
                }
                for (let j = 0; j < filteredPairs.length; j++) {
                    pairsToMerge.push (filteredPairs[j]);
                }
            }
            const newMarkets = this.buildMarketsFromPairs (pairsToMerge);
            this.mergeMarkets (newMarkets);
            for (let i = 0; i < symbolsToResolve.length; i++) {
                const symbol = symbolsToResolve[i];
                this.assignResolvedMarket (marketsBySymbol, symbol);
            }
        }
        return marketsBySymbol;
    }

    async resolveMarket (symbol: string, params = {}): Promise<Market> {
        const marketsBySymbol = await this.resolveMarkets ([ symbol ], params);
        return marketsBySymbol[symbol];
    }

    getMarketsMissingPair (symbols: string[], marketsBySymbol: Dict, pairs: Dict[]) {
        const missing = [];
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            const market = this.safeValue (marketsBySymbol, symbol);
            if (this.findPairForMarket (pairs, market) === undefined) {
                missing.push (market);
            }
        }
        return missing;
    }

    findPairForMarket (pairs: Dict[], market: Market) {
        const dexId = this.getConfiguredDexId ();
        const marketBaseId = this.normalizeTokenAddress (this.safeString (market, 'baseId'));
        const marketQuoteId = this.normalizeTokenAddress (this.safeString (market, 'quoteId'));
        let bestPair = undefined;
        let bestLiquidityUsd = 0;
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            const pairDexId = this.safeString (pair, 'dexId');
            if (pairDexId !== dexId) {
                continue;
            }
            const baseToken = this.safeDict (pair, 'baseToken', {});
            const quoteToken = this.safeDict (pair, 'quoteToken', {});
            const pairBase = this.normalizeTokenAddress (this.safeString (baseToken, 'address'));
            const pairQuote = this.normalizeTokenAddress (this.safeString (quoteToken, 'address'));
            if ((pairBase !== marketBaseId) || (pairQuote !== marketQuoteId)) {
                continue;
            }
            const liquidityUsd = this.safeLiquidityUsd (pair);
            if ((bestPair === undefined) || (liquidityUsd > bestLiquidityUsd)) {
                bestPair = pair;
                bestLiquidityUsd = liquidityUsd;
            }
        }
        return bestPair;
    }

    getTokenPairFallbackAddresses (markets: Market[]): string[] {
        const discoveryAddresses: Dict = {};
        for (let i = 0; i < markets.length; i++) {
            const market = markets[i];
            const baseId = this.safeString (market, 'baseId');
            if (baseId !== undefined) {
                discoveryAddresses[baseId] = true;
            }
        }
        const addressList = Object.keys (discoveryAddresses);
        if (addressList.length > 0) {
            return addressList;
        }
        return this.getMarketDiscoveryAddresses ();
    }

    async fetchTickersFromTokensV1 (symbols: string[], marketsBySymbol: Dict, params = {}): Promise<Tickers> {
        const tokenAddressesToFetch: Dict = {};
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            const market = this.safeValue (marketsBySymbol, symbol);
            const baseId = this.safeString (market, 'baseId');
            const quoteId = this.safeString (market, 'quoteId');
            if (baseId !== undefined) {
                tokenAddressesToFetch[baseId] = true;
            }
            if (quoteId !== undefined) {
                tokenAddressesToFetch[quoteId] = true;
            }
        }
        const tokenAddressList = Object.keys (tokenAddressesToFetch);
        if (tokenAddressList.length === 0) {
            throw new BadSymbol (this.id + ' no token addresses available to refresh tickers');
        }
        let allPairs = await this.fetchPairsForTokensV1 (tokenAddressList, params);
        const marketsMissingPair = this.getMarketsMissingPair (symbols, marketsBySymbol, allPairs);
        if (marketsMissingPair.length > 0) {
            const fallbackAddresses = this.getTokenPairFallbackAddresses (marketsMissingPair);
            if (fallbackAddresses.length > 0) {
                const extraPairs = await this.fetchPairsForTokenAddresses (fallbackAddresses, params);
                allPairs = this.mergePairsByPairAddress (this.arrayConcat (allPairs, extraPairs));
            }
        }
        const result: Dict = {};
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            const market = this.safeValue (marketsBySymbol, symbol);
            const pair = this.findPairForMarket (allPairs, market);
            if (pair === undefined) {
                throw new BadSymbol (this.id + ' no pair data for symbol ' + symbol);
            }
            const ticker = this.parseTicker (pair, market);
            ticker['symbol'] = symbol;
            result[symbol] = ticker;
        }
        return result;
    }

    /**
     * @method
     * @name dexscreener#fetchTicker
     * @description fetches a price ticker for a market
     * @see https://docs.dexscreener.com/api/reference
     * @param {string} symbol unified market symbol
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        this.checkRequiredOptions ();
        await this.loadMarkets ();
        const marketsBySymbol = await this.resolveMarkets ([ symbol ], params);
        const tickers = await this.fetchTickersFromTokensV1 ([ symbol ], marketsBySymbol, params);
        return tickers[symbol];
    }

    /**
     * @method
     * @name dexscreener#fetchTickers
     * @description fetches price tickers for multiple markets
     * @see https://docs.dexscreener.com/api/reference
     * @param {string[]} symbols list of unified market symbols
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a dictionary of [ticker structures]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTickers (symbols: Strings = undefined, params = {}): Promise<Tickers> {
        this.checkRequiredOptions ();
        if (symbols === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchTickers() requires a non-empty symbols argument');
        }
        const symbolsLength = symbols.length;
        if (symbolsLength === 0) {
            throw new ArgumentsRequired (this.id + ' fetchTickers() requires a non-empty symbols argument');
        }
        await this.loadMarkets ();
        const marketsBySymbol = await this.resolveMarkets (symbols, params);
        return await this.fetchTickersFromTokensV1 (symbols, marketsBySymbol, params);
    }

    parseTicker (pair: Dict, market: Market = undefined): Ticker {
        // {
        //     "chainId": "solana",
        //     "dexId": "raydium",
        //     "url": "https://dexscreener.com/solana/3nmfwzxwy1s1m5s8vyahqd4wgs4isxxe4lroummyqegf",
        //     "pairAddress": "3nMFwZXwY1s1M5s8vYAHqd4wGs4iSxXE4LRoUMMYqEgF",
        //     "labels": [
        //         "CLMM"
        //     ],
        //     "baseToken": {
        //         "address": "So11111111111111111111111111111111111111112",
        //         "name": "Wrapped SOL",
        //         "symbol": "SOL"
        //     },
        //     "quoteToken": {
        //         "address": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        //         "name": "USDT",
        //         "symbol": "USDT"
        //     },
        //     "priceNative": "87.4816",
        //     "priceUsd": "87.48",
        //     "txns": {
        //         "m5": {
        //         "buys": 133,
        //         "sells": 154
        //         },
        //         "h1": {
        //         "buys": 2005,
        //         "sells": 1955
        //         },
        //         "h6": {
        //         "buys": 10034,
        //         "sells": 12583
        //         },
        //         "h24": {
        //         "buys": 44952,
        //         "sells": 47953
        //         }
        //     },
        //     "volume": {
        //         "h24": 32204203.35,
        //         "h6": 6729764.11,
        //         "h1": 1037755.64,
        //         "m5": 91765.17
        //     },
        //     "priceChange": {
        //         "m5": -0.05,
        //         "h1": 0.73,
        //         "h6": 0.91,
        //         "h24": 2.24
        //     },
        //     "liquidity": {
        //         "usd": 2544708.51,
        //         "base": 16710,
        //         "quote": 1082810
        //     },
        //     "pairCreatedAt": 1723699294000,
        //     "info": {
        //         "imageUrl": "https://cdn.dexscreener.com/cms/images/fcfb87378d3198fe753ca08ba51a5552a84f34cf48cd09d83971aa195bdf00d2?width=800&height=800&quality=95&format=auto",
        //         "header": "https://cdn.dexscreener.com/cms/images/7a8b9d77ffff37a36144cdebff51443a7c35bd737e8f327fc03f1121357731dd?width=1500&height=500&quality=95&format=auto",
        //         "openGraph": "https://cdn.dexscreener.com/token-images/og/solana/So11111111111111111111111111111111111111112?timestamp=1779452700000",
        //         "websites": [
        //         {
        //             "url": "https://solana.com",
        //             "label": "Website"
        //         }
        //         ],
        //         "socials": [
        //         {
        //             "url": "https://x.com/solana",
        //             "type": "twitter"
        //         }
        //         ]
        //     }
        // }
        const symbol = this.safeString (market, 'symbol');
        const last = this.safeString (pair, 'priceNative');
        const timestamp = this.seconds ();
        const volumeInfo = this.safeDict (pair, 'volume');
        const quoteVolume = this.safeString (volumeInfo, 'h24');
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
            'quoteVolume': quoteVolume,
            'info': pair,
        }, market);
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api']['rest'] + '/' + this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));
        if (method === 'GET') {
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (httpCode: int, reason: string, url: string, method: string, headers: Dict, body: string, response, requestHeaders, requestBody) {
        if (response === undefined) {
            if (httpCode === 429) {
                throw new RateLimitExceeded (this.id + ' ' + reason);
            }
            return undefined;
        }
        if (httpCode === 429) {
            throw new RateLimitExceeded (this.id + ' ' + body);
        }
        if (httpCode >= 400) {
            throw new BadRequest (this.id + ' ' + body);
        }
        return undefined;
    }
}
