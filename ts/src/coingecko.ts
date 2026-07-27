//  ---------------------------------------------------------------------------

import Exchange from './abstract/coingecko.js';
import { ArgumentsRequired, AuthenticationError, BadRequest, BadSymbol, ExchangeError, NotSupported, NullResponse, RateLimitExceeded } from './base/errors.js';
import type { Market, Dict, Ticker, int, Strings, Tickers, MarketInterface } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class coingecko
 * @augments Exchange
 * @description CoinGecko - cryptocurrency market data provider (read-only).
 * Docs: https://docs.coingecko.com/v3.0.1/reference/coins-list
 */
export default class coingecko extends Exchange {
    describe (): any {
        const networks: Dict = {
            'ETH': 'eth',
            'ERC20': 'eth',
            'BSC': 'bsc',
            'BEP20': 'bsc',
            'BASE': 'base',
            'MATIC': 'polygon_pos',
            'POLYGON': 'polygon_pos',
            'ARBITRUM': 'arbitrum',
            'OPTIMISM': 'optimism',
            'AVAX': 'avax',
            'AVAXC': 'avax',
            'SOL': 'solana',
            'FTM': 'ftm',
            'ZKSYNC': 'zksync',
            'ZKSYNCERA': 'zksync',
            'LINEA': 'linea',
            'BLAST': 'blast',
            'MANTLE': 'mnt',
            'MNT': 'mnt',
            'SCROLL': 'scroll',
            'CELO': 'celo',
            'CRONOS': 'cro',
            'GNOSIS': 'xdai',
            'MOONBEAM': 'glmr',
            'MOONRIVER': 'movr',
            'AURORA': 'aurora',
            'HARMONY': 'one',
            'ZORA': 'zora',
            'SONIC': 'sonic',
            'BERACHAIN': 'berachain',
            'UNICHAIN': 'unichain',
            'WORLDCHAIN': 'world-chain',
            'ABSTRACT': 'abstract',
            'INK': 'ink',
            'TRX': 'tron',
            'TRC20': 'tron',
            'TON': 'ton',
            'SUI': 'sui',
            'APT': 'aptos',
            'SEI': 'sei',
            'NEAR': 'near',
            'OSMO': 'osmosis',
            'KAVA': 'kava',
            'PULSECHAIN': 'pulsechain',
            'BOBA': 'boba',
            'METIS': 'metis',
            'MODE': 'mode',
            'CORE': 'core',
            'TAIKO': 'taiko',
        };
        const networksById: Dict = {};
        const networkKeys = Object.keys (networks);
        for (let networkIndex = 0; networkIndex < networkKeys.length; networkIndex++) {
            const networkCode = networkKeys[networkIndex];
            networksById[networks[networkCode]] = networkCode;
        }
        const preferredNetworkCodeByChainId: Dict = {
            'eth': 'ETH',
            'tron': 'TRX',
            'bsc': 'BEP20',
            'avax': 'AVAX',
            'mnt': 'MANTLE',
            'base': 'BASE',
        };
        const preferredChainIds = Object.keys (preferredNetworkCodeByChainId);
        for (let chainIndex = 0; chainIndex < preferredChainIds.length; chainIndex++) {
            const chainId = preferredChainIds[chainIndex];
            networksById[chainId] = preferredNetworkCodeByChainId[chainId];
        }
        return this.deepExtend (super.describe (), {
            'id': 'coingecko',
            'name': 'CoinGecko',
            'countries': [ ],
            'rateLimit': 6000,
            'version': 'v3',
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
                'logo': 'https://static.coingecko.com/s/coingecko-logo-white-750bdea438e850281f784dffc8f4fd498415754f088d655a1140849745cb66ac.svg',
                'api': {
                    'rest': 'https://api.coingecko.com/api/v3',
                },
                'www': 'https://www.coingecko.com',
                'doc': [
                    'https://docs.coingecko.com/v3.0.1/reference/coins-list',
                    'https://docs.coingecko.com/v3.0.1/reference/coins-markets',
                    'https://docs.coingecko.com/v3.0.1/reference/coins-id',
                    'https://docs.coingecko.com/demo/reference/token-data-contract-address',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'coins/list',
                        'coins/markets',
                        'coins/{id}',
                        'onchain/networks/{network}/tokens/{address}',
                    ],
                },
            },
            'requiredCredentials': {
                'apiKey': false,
                'secret': false,
            },
            'options': {
                'vsCurrency': 'usd',
                'fetchMarketsIncludePlatform': true,
                'defaultAPIKey': '',
                'forceDefaultAPIKey': false,
                'networks': networks,
                'networksById': networksById,
            },
        });
    }

    resolveApiKey () {
        if (this.safeBool (this.options, 'forceDefaultAPIKey', false)) {
            return this.safeString (this.options, 'defaultAPIKey');
        }
        if (this.apiKey) {
            return this.apiKey;
        }
        return this.safeString (this.options, 'defaultAPIKey');
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

    isOnchainSymbol (symbol: string): boolean {
        return symbol.indexOf ('@') >= 0;
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

    isSingleTokenOnchainSymbol (symbol: string): boolean {
        if (!this.isOnchainSymbol (symbol)) {
            return false;
        }
        if (this.isAddressPairSymbol (symbol)) {
            return false;
        }
        const tradingSymbol = this.getTradingSymbolPart (symbol);
        const parts = tradingSymbol.split ('/');
        if (parts.length !== 2) {
            return false;
        }
        const basePart = this.safeString (parts, 0);
        const quotePart = this.safeString (parts, 1);
        if (!this.isTokenAddress (basePart)) {
            return false;
        }
        const vsCurrency = this.safeString (this.options, 'vsCurrency', 'usd').toLowerCase ();
        return quotePart.toLowerCase () === vsCurrency;
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
        if (networkCode === undefined) {
            return this.normalizeTokenAddress (baseAddress) + '/' + this.normalizeTokenAddress (quoteAddress);
        }
        return this.getAddressPairSymbol (baseAddress, quoteAddress, networkCode, dexCode);
    }

    assertSupportedDexCode (dexCode) {
        if ((dexCode !== undefined) && (dexCode !== '*')) {
            throw new NotSupported (this.id + ' does not support dex filter ' + dexCode + '; only wildcard * is allowed');
        }
    }

    getEffectiveDexCode (dexCode) {
        return (dexCode !== undefined) ? dexCode : '*';
    }

    requireNetworkCode (networkCode, symbol: string) {
        if ((networkCode === undefined) || (networkCode === '')) {
            throw new BadSymbol (this.id + ' symbol must include a network suffix using @ for ' + symbol);
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
        if (dexCode !== undefined) {
            return tradingSymbol + '@' + networkCode + '!' + dexCode;
        }
        return tradingSymbol + '@' + networkCode;
    }

    buildMarketId (networkCode: string, dexCode, chainSlug: string, baseId: string, quoteId: string): string {
        const unifiedDexCode = (dexCode !== undefined) ? dexCode : '';
        return networkCode + ':' + unifiedDexCode + ':' + chainSlug + ':' + baseId + ':' + quoteId;
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

    getChainSlugFromMarket (market: Market) {
        const marketId = this.safeString (market, 'id');
        if (marketId !== undefined) {
            const parsedMarketId = this.parseMarketId (marketId);
            const chainSlug = this.safeString (parsedMarketId, 'chainSlug');
            if (chainSlug !== undefined) {
                return chainSlug;
            }
        }
        const symbol = this.safeString (market, 'symbol');
        const parsed = this.obParseNetworkDexSymbol (symbol);
        const networkCode = this.safeString (parsed, 'networkCode');
        return this.networkCodeToId (networkCode);
    }

    parseSyntheticMarket (tradingSymbol: string, networkCode: string, dexCode, baseId: string, quoteId: string, base: string = undefined, quote: string = undefined): Market {
        const chainSlug = this.networkCodeToId (networkCode);
        const effectiveDexCode = this.getEffectiveDexCode (dexCode);
        const symbol = this.buildMarketSymbol (tradingSymbol, networkCode, dexCode);
        const id = this.buildMarketId (networkCode, effectiveDexCode, chainSlug, baseId, quoteId);
        const effectiveBase = (base !== undefined) ? base : baseId;
        const effectiveQuote = (quote !== undefined) ? quote : quoteId;
        return {
            'id': id,
            'symbol': symbol,
            'base': effectiveBase,
            'quote': effectiveQuote,
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

    parseSyntheticMarketFromSymbol (symbol: string, base: string = undefined, quote: string = undefined): Market {
        const parsed = this.obParseDexPairSymbolInput (symbol);
        const tradingSymbol = this.safeString (parsed, 'tradingSymbol');
        const networkCode = this.safeString (parsed, 'networkCode');
        const dexCode = this.safeString (parsed, 'dexCode');
        this.requireNetworkCode (networkCode, symbol);
        this.assertSupportedDexCode (dexCode);
        const parts = tradingSymbol.split ('/');
        const basePart = this.normalizeTokenAddress (this.safeString (parts, 0));
        const quotePart = this.safeString (parts, 1);
        if (this.isAddressPairSymbol (symbol)) {
            const quoteId = this.normalizeTokenAddress (quotePart);
            return this.parseSyntheticMarket (tradingSymbol, networkCode, dexCode, basePart, quoteId, base, quote);
        }
        if (this.isSingleTokenOnchainSymbol (symbol)) {
            const vsCurrency = this.safeString (this.options, 'vsCurrency', 'usd').toLowerCase ();
            const effectiveQuote = (quote !== undefined) ? quote : this.safeCurrencyCode (vsCurrency);
            return this.parseSyntheticMarket (tradingSymbol, networkCode, dexCode, basePart, vsCurrency, base, effectiveQuote);
        }
        throw new BadSymbol (this.id + ' onchain symbol must be an address pair or token/' + this.safeString (this.options, 'vsCurrency', 'usd') + ' for ' + symbol);
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
            const effectiveDexCode = this.getEffectiveDexCode (dexCode);
            const baseId = this.safeString (market, 'baseId');
            const quoteId = this.safeString (market, 'quoteId');
            const base = this.safeString (market, 'base');
            const quote = this.safeString (market, 'quote');
            if ((baseId !== undefined) && (quoteId !== undefined) && this.isAddressPairSymbol (unifiedSymbol)) {
                const addressAliasSymbol = this.getAddressPairSymbol (baseId, quoteId, networkCode, dexCode);
                if ((addressAliasSymbol !== unifiedSymbol) && !(addressAliasSymbol in this.markets)) {
                    this.markets[addressAliasSymbol] = market;
                }
                if (effectiveDexCode === '*') {
                    const tradingSymbol = this.safeString (parsed, 'tradingSymbol');
                    if (tradingSymbol !== undefined) {
                        const noDexTradingSymbolAlias = this.buildMarketSymbol (tradingSymbol, networkCode, undefined);
                        if ((noDexTradingSymbolAlias !== unifiedSymbol) && !(noDexTradingSymbolAlias in this.markets)) {
                            this.markets[noDexTradingSymbolAlias] = market;
                        }
                        const wildcardDexTradingSymbolAlias = this.buildMarketSymbol (tradingSymbol, networkCode, '*');
                        if ((wildcardDexTradingSymbolAlias !== unifiedSymbol) && !(wildcardDexTradingSymbolAlias in this.markets)) {
                            this.markets[wildcardDexTradingSymbolAlias] = market;
                        }
                    }
                    const noDexAddressAliasSymbol = this.getAddressPairSymbol (baseId, quoteId, networkCode, undefined);
                    if ((noDexAddressAliasSymbol !== unifiedSymbol) && !(noDexAddressAliasSymbol in this.markets)) {
                        this.markets[noDexAddressAliasSymbol] = market;
                    }
                    const wildcardDexAddressAliasSymbol = this.getAddressPairSymbol (baseId, quoteId, networkCode, '*');
                    if ((wildcardDexAddressAliasSymbol !== unifiedSymbol) && !(wildcardDexAddressAliasSymbol in this.markets)) {
                        this.markets[wildcardDexAddressAliasSymbol] = market;
                    }
                }
            }
            if ((base !== undefined) && (quote !== undefined) && this.isAddressPairSymbol (unifiedSymbol)) {
                const tickerAliasSymbol = this.buildMarketSymbol (base + '/' + quote, networkCode, dexCode);
                if ((tickerAliasSymbol !== unifiedSymbol) && !(tickerAliasSymbol in this.markets)) {
                    this.markets[tickerAliasSymbol] = market;
                }
                if (effectiveDexCode === '*') {
                    const noDexTickerAliasSymbol = this.buildMarketSymbol (base + '/' + quote, networkCode, undefined);
                    if ((noDexTickerAliasSymbol !== unifiedSymbol) && !(noDexTickerAliasSymbol in this.markets)) {
                        this.markets[noDexTickerAliasSymbol] = market;
                    }
                    const wildcardDexTickerAliasSymbol = this.buildMarketSymbol (base + '/' + quote, networkCode, '*');
                    if ((wildcardDexTickerAliasSymbol !== unifiedSymbol) && !(wildcardDexTickerAliasSymbol in this.markets)) {
                        this.markets[wildcardDexTickerAliasSymbol] = market;
                    }
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
            this.assertSupportedDexCode (dexCode);
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
        const newMarkets = [];
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

    buildOnchainTokenKey (networkId: string, address: string): string {
        return networkId + ':' + this.normalizeTokenAddress (address);
    }

    getOnchainTokenAddressesForMarket (market: Market): string[] {
        const chainSlug = this.getChainSlugFromMarket (market);
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const addresses = [];
        if ((chainSlug !== undefined) && (baseId !== undefined)) {
            addresses.push (this.buildOnchainTokenKey (chainSlug, baseId));
        }
        if ((chainSlug !== undefined) && (quoteId !== undefined) && this.isTokenAddress (quoteId)) {
            addresses.push (this.buildOnchainTokenKey (chainSlug, quoteId));
        }
        return addresses;
    }

    async fetchOnchainToken (networkId: string, address: string, params = {}): Promise<Dict> {
        const request: Dict = {
            'network': networkId,
            'address': this.normalizeTokenAddress (address),
        };
        const response = await this.publicGetOnchainNetworksNetworkTokensAddress (this.extend (request, params));
        return this.parseOnchainTokenAttributes (response);
    }

    parseOnchainTokenAttributes (response: Dict): Dict {
        const data = this.safeDict (response, 'data', {});
        const attributes = this.safeDict (data, 'attributes', {});
        const volumeUsd = this.safeDict (attributes, 'volume_usd', {});
        return {
            'address': this.safeString (attributes, 'address'),
            'name': this.safeString (attributes, 'name'),
            'symbol': this.safeString (attributes, 'symbol'),
            'priceUsd': this.safeString (attributes, 'price_usd'),
            'imageUrl': this.safeString (attributes, 'image_url'),
            'lastTradeTimestamp': this.safeInteger (attributes, 'last_trade_timestamp'),
            'volumeUsdH24': this.safeString (volumeUsd, 'h24'),
            'info': response,
        };
    }

    async fetchOnchainTokensForMarkets (markets: Market[], params = {}): Promise<Dict> {
        const tokenKeys: Dict = {};
        for (let marketIndex = 0; marketIndex < markets.length; marketIndex++) {
            const market = markets[marketIndex];
            const chainSlug = this.getChainSlugFromMarket (market);
            const baseId = this.safeString (market, 'baseId');
            const quoteId = this.safeString (market, 'quoteId');
            if ((chainSlug !== undefined) && (baseId !== undefined)) {
                tokenKeys[this.buildOnchainTokenKey (chainSlug, baseId)] = { 'networkId': chainSlug, 'address': baseId };
            }
            if ((chainSlug !== undefined) && (quoteId !== undefined) && this.isTokenAddress (quoteId)) {
                tokenKeys[this.buildOnchainTokenKey (chainSlug, quoteId)] = { 'networkId': chainSlug, 'address': quoteId };
            }
        }
        const uniqueKeys = Object.keys (tokenKeys);
        const result: Dict = {};
        for (let keyIndex = 0; keyIndex < uniqueKeys.length; keyIndex++) {
            const tokenKey = uniqueKeys[keyIndex];
            const tokenRequest = tokenKeys[tokenKey];
            const tokenData = await this.fetchOnchainToken (tokenRequest['networkId'], tokenRequest['address'], params);
            result[tokenKey] = tokenData;
        }
        return result;
    }

    getUsdPriceFromOnchainToken (tokenDataByAddress: Dict, tokenKey: string): number {
        const tokenData = this.safeDict (tokenDataByAddress, tokenKey);
        const priceUsd = this.safeNumber (tokenData, 'priceUsd');
        if (priceUsd === undefined) {
            throw new BadSymbol (this.id + ' no USD price for onchain token ' + tokenKey);
        }
        return priceUsd;
    }

    computePairPrice (baseUsd: number, quoteUsd: number): number {
        if ((baseUsd === undefined) || (quoteUsd === undefined) || (quoteUsd === 0)) {
            throw new BadSymbol (this.id + ' cannot compute pair price from USD prices');
        }
        return baseUsd / quoteUsd;
    }

    enrichMarketFromOnchainTokens (market: Market, tokenDataByAddress: Dict): Market {
        const chainSlug = this.getChainSlugFromMarket (market);
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const baseKey = this.buildOnchainTokenKey (chainSlug, baseId);
        const baseTokenData = this.safeDict (tokenDataByAddress, baseKey, {});
        const baseSymbol = this.safeCurrencyCode (this.safeString (baseTokenData, 'symbol'));
        if ((baseSymbol !== undefined) && (baseSymbol !== market['base'])) {
            market['base'] = baseSymbol;
        }
        if (this.isTokenAddress (quoteId)) {
            const quoteKey = this.buildOnchainTokenKey (chainSlug, quoteId);
            const quoteTokenData = this.safeDict (tokenDataByAddress, quoteKey, {});
            const quoteSymbol = this.safeCurrencyCode (this.safeString (quoteTokenData, 'symbol'));
            if ((quoteSymbol !== undefined) && (quoteSymbol !== market['quote'])) {
                market['quote'] = quoteSymbol;
            }
        }
        return market;
    }

    parseOnchainTicker (market: Market, last: string, baseTokenData: Dict, quoteTokenData: Dict = undefined): Ticker {
        const symbol = this.safeString (market, 'symbol');
        const lastTradeTimestamp = this.safeInteger (baseTokenData, 'lastTradeTimestamp');
        const name = this.safeString (baseTokenData, 'name');
        const imageUrl = this.safeString (baseTokenData, 'imageUrl');
        let timestamp = undefined;
        let datetime = undefined;
        if (lastTradeTimestamp !== undefined) {
            timestamp = lastTradeTimestamp * 1000;
            datetime = this.iso8601 (timestamp);
        }
        return this.safeTicker ({
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': datetime,
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
            'extra': {
                'name': name,
                'logoUrl': imageUrl,
            },
            'info': {
                'baseToken': baseTokenData,
                'quoteToken': quoteTokenData,
            },
        }, market);
    }

    buildOnchainTicker (market: Market, tokenDataByAddress: Dict): Ticker {
        const chainSlug = this.getChainSlugFromMarket (market);
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const baseKey = this.buildOnchainTokenKey (chainSlug, baseId);
        const baseTokenData = this.safeDict (tokenDataByAddress, baseKey, {});
        let last: string;
        let quoteTokenData = undefined;
        if (this.isTokenAddress (quoteId)) {
            const quoteKey = this.buildOnchainTokenKey (chainSlug, quoteId);
            quoteTokenData = this.safeDict (tokenDataByAddress, quoteKey, {});
            const baseUsd = this.getUsdPriceFromOnchainToken (tokenDataByAddress, baseKey);
            const quoteUsd = this.getUsdPriceFromOnchainToken (tokenDataByAddress, quoteKey);
            const pairPrice = this.computePairPrice (baseUsd, quoteUsd);
            last = this.numberToString (pairPrice);
        } else {
            last = this.safeString (baseTokenData, 'priceUsd');
            if (last === undefined) {
                throw new BadSymbol (this.id + ' no USD price for onchain token ' + baseKey);
            }
        }
        this.enrichMarketFromOnchainTokens (market, tokenDataByAddress);
        return this.parseOnchainTicker (market, last, baseTokenData, quoteTokenData);
    }

    async fetchOnchainTicker (symbol: string, params = {}): Promise<Ticker> {
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        const market = resolveResult['marketsBySymbol'][symbol];
        const tokenDataByAddress = await this.fetchOnchainTokensForMarkets ([ market ], params);
        const ticker = this.buildOnchainTicker (market, tokenDataByAddress);
        ticker['symbol'] = symbol;
        return ticker;
    }

    async fetchOnchainTickers (symbols: string[], params = {}): Promise<Tickers> {
        const symbolsLength = symbols.length;
        const resolveResult = await this.resolveMarkets (symbols, params);
        const marketsBySymbol = resolveResult['marketsBySymbol'];
        const markets = [];
        for (let symbolIndex = 0; symbolIndex < symbolsLength; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            markets.push (this.safeValue (marketsBySymbol, symbol));
        }
        const tokenDataByAddress = await this.fetchOnchainTokensForMarkets (markets, params);
        const result: Dict = {};
        for (let symbolIndex = 0; symbolIndex < symbolsLength; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            const market = this.safeValue (marketsBySymbol, symbol);
            const ticker = this.buildOnchainTicker (market, tokenDataByAddress);
            ticker['symbol'] = symbol;
            result[symbol] = ticker;
        }
        return result;
    }

    /**
     * @method
     * @name coingecko#fetchMarkets
     * @description fetches all supported coins from CoinGecko
     * @see https://docs.coingecko.com/v3.0.1/reference/coins-list
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {boolean} [params.include_platform] include platform contract addresses
     * @returns {Market[]} an array of market structures
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        const includePlatform = this.safeBool2 (params, 'include_platform', 'includePlatform', this.safeBool (this.options, 'fetchMarketsIncludePlatform', true));
        const request: Dict = {
            'include_platform': includePlatform,
        };
        params = this.omit (params, [ 'include_platform', 'includePlatform' ]);
        const response = await this.publicGetCoinsList (this.extend (request, params));
        const result = [];
        for (let i = 0; i < response.length; i++) {
            const coin = response[i];
            // Skip incomplete catalog rows (CoinGecko can return null symbols)
            if (this.safeString (coin, 'symbol') === undefined) {
                continue;
            }
            result.push (this.parseMarket (coin));
        }
        return result;
    }

    parseMarket (coin: Dict): Market {
        const vsCurrency = this.safeString (this.options, 'vsCurrency', 'usd').toLowerCase ();
        const coinId = this.safeString (coin, 'id');
        const rawSymbol = this.safeString (coin, 'symbol');
        if (rawSymbol === undefined) {
            throw new BadSymbol (this.id + ' parseMarket() requires a non-null symbol');
        }
        const base = this.safeCurrencyCode (rawSymbol);
        const quote = this.safeCurrencyCode (vsCurrency);
        const symbol = base + '/' + quote;
        return {
            'id': coinId,
            'symbol': symbol,
            'base': base,
            'quote': quote,
            'settle': undefined,
            'baseId': coinId,
            'quoteId': vsCurrency,
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
            'info': coin,
        };
    }

    /**
     * @method
     * @name coingecko#fetchTicker
     * @description fetches a price ticker for a market
     * @see https://docs.coingecko.com/v3.0.1/reference/coins-markets
     * @see https://docs.coingecko.com/demo/reference/token-data-contract-address
     * @param {string} symbol unified market symbol
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.vs_currency] quote currency for prices
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        if (this.isOnchainSymbol (symbol)) {
            return await this.fetchOnchainTicker (symbol, params);
        }
        const market = this.market (symbol);
        const vsCurrency = this.safeString2 (params, 'vs_currency', 'vsCurrency', this.safeString (this.options, 'vsCurrency', 'usd')).toLowerCase ();
        params = this.omit (params, [ 'vs_currency', 'vsCurrency' ]);
        const request: Dict = {
            'vs_currency': vsCurrency,
            'ids': this.safeString (market, 'baseId'),
        };
        const response = await this.publicGetCoinsMarkets (this.extend (request, params));
        const row = this.safeValue (response, 0);
        if (row === undefined) {
            throw new NullResponse (this.id + ' fetchTicker() could not find a ticker for ' + symbol);
        }
        return this.parseTicker (row, market);
    }

    parseTickersFromMarketsRows (rows: any[], marketByCoinId: Dict = undefined): Tickers {
        const result: Dict = {};
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const coinId = this.safeString (row, 'id');
            let market = (marketByCoinId !== undefined) ? this.safeValue (marketByCoinId, coinId) : undefined;
            if (market === undefined) {
                // Skip incomplete markets-API rows (null symbol cannot be unified)
                if (this.safeString (row, 'symbol') === undefined) {
                    continue;
                }
                market = this.parseMarket (row);
            }
            const ticker = this.parseTicker (row, market);
            const tickerSymbol = this.safeString (ticker, 'symbol');
            result[tickerSymbol] = ticker;
        }
        return result;
    }

    /**
     * @method
     * @name coingecko#fetchTickers
     * @description fetches price tickers for the requested symbols, or the first page of top markets when no symbols are provided
     * @see https://docs.coingecko.com/v3.0.1/reference/coins-markets
     * @see https://docs.coingecko.com/demo/reference/token-data-contract-address
     * @param {string[]} [symbols] unified market symbols
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.vs_currency] quote currency for prices
     * @param {int} [params.page] page number when fetching without symbols (default 1)
     * @param {int} [params.per_page] page size when fetching without symbols (default 250, max 250)
     * @returns {object} a dictionary of [ticker structures]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTickers (symbols: Strings = undefined, params = {}): Promise<Tickers> {
        await this.loadMarkets ();
        const symbolsLength = (symbols === undefined) ? 0 : symbols.length;
        const onchainSymbols = [];
        const coinIdSymbols = [];
        for (let symbolIndex = 0; symbolIndex < symbolsLength; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            if (this.isOnchainSymbol (symbol)) {
                onchainSymbols.push (symbol);
            } else {
                coinIdSymbols.push (symbol);
            }
        }
        let result: Dict = {};
        if (onchainSymbols.length > 0) {
            const onchainTickers = await this.fetchOnchainTickers (onchainSymbols, params);
            result = this.extend (result, onchainTickers) as Dict;
        }
        const vsCurrency = this.safeString2 (params, 'vs_currency', 'vsCurrency', this.safeString (this.options, 'vsCurrency', 'usd')).toLowerCase ();
        const maxBatchSize = 250;
        const page = this.safeInteger2 (params, 'page', undefined, 1);
        const perPage = this.safeInteger2 (params, 'per_page', 'perPage', maxBatchSize);
        params = this.omit (params, [ 'vs_currency', 'vsCurrency', 'page', 'per_page', 'perPage' ]);
        if ((symbolsLength === 0) && (coinIdSymbols.length === 0)) {
            const request: Dict = {
                'vs_currency': vsCurrency,
                'page': page,
                'per_page': perPage,
            };
            const response = await this.publicGetCoinsMarkets (this.extend (request, params));
            return this.parseTickersFromMarketsRows (response);
        }
        if (coinIdSymbols.length > 0) {
            const marketIds = [];
            const marketByCoinId: Dict = {};
            for (let coinSymbolIndex = 0; coinSymbolIndex < coinIdSymbols.length; coinSymbolIndex++) {
                const symbol = coinIdSymbols[coinSymbolIndex];
                const market = this.market (symbol);
                const coinId = this.safeString (market, 'baseId');
                marketIds.push (coinId);
                marketByCoinId[coinId] = market;
            }
            for (let offset = 0; offset < marketIds.length; offset += maxBatchSize) {
                const batch = marketIds.slice (offset, offset + maxBatchSize);
                const request: Dict = {
                    'vs_currency': vsCurrency,
                    'ids': batch.join (','),
                };
                const response = await this.publicGetCoinsMarkets (this.extend (request, params));
                const tickers = this.parseTickersFromMarketsRows (response, marketByCoinId);
                result = this.extend (result, tickers) as Dict;
            }
        }
        return result;
    }

    /**
     * @method
     * @name coingecko#obLoadMarketsForSymbols
     * @description lazily resolves and populates this.markets for the given onchain symbols
     * @see https://docs.coingecko.com/demo/reference/token-data-contract-address
     * @param {string[]} symbols list of symbols with @network or @network!* suffix
     * @param {boolean} reload when true, re-fetch symbols even if already cached in this.markets
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} empty list; subclasses may return fixed market status structures
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
            if (!this.isOnchainSymbol (symbol)) {
                continue;
            }
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

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        const marketDefined = (market !== undefined);
        const symbol = marketDefined ? this.safeString (market, 'symbol') : undefined;
        const last = this.safeString (ticker, 'current_price');
        const timestamp = this.parse8601 (this.safeString (ticker, 'last_updated'));
        const name = this.safeString (ticker, 'name');
        const image = this.safeString (ticker, 'image');
        return this.safeTicker ({
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
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
            'extra': {
                'name': name,
                'logoUrl': image,
                'change': this.safeString (ticker, 'price_change_24h'),
                'percentage': this.safeString (ticker, 'price_change_percentage_24h'),
            },
            'info': ticker,
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
        const apiKey = this.resolveApiKey ();
        if ((apiKey !== undefined) && (apiKey !== '')) {
            if (headers === undefined) {
                headers = {};
            }
            headers['x-cg-demo-api-key'] = apiKey;
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
        const status = this.safeDict (response, 'status');
        const errorCode = this.safeInteger (status, 'error_code');
        const errorMessage = this.safeString (status, 'error_message');
        if (errorCode !== undefined) {
            if (errorCode === 10005 || errorCode === 429) {
                throw new RateLimitExceeded (this.id + ' ' + errorMessage);
            }
            if (errorCode === 10002) {
                throw new AuthenticationError (this.id + ' ' + errorMessage);
            }
            if (errorCode === 401) {
                throw new AuthenticationError (this.id + ' ' + errorMessage);
            }
            throw new ExchangeError (this.id + ' ' + body);
        }
        if (httpCode === 429) {
            throw new RateLimitExceeded (this.id + ' ' + body);
        }
        if (httpCode >= 400) {
            if (httpCode === 401 || httpCode === 403) {
                throw new AuthenticationError (this.id + ' ' + body);
            }
            throw new BadRequest (this.id + ' ' + body);
        }
        return undefined;
    }
}
