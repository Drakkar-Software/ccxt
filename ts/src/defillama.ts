//  ---------------------------------------------------------------------------

import Exchange from './abstract/defillama.js';
import { ArgumentsRequired, BadSymbol, ExchangeError, NotSupported, RateLimitExceeded } from './base/errors.js';
import type { Market, Dict, Ticker, int, Strings, Tickers, MarketInterface, ObDexPair } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class defillama
 * @augments Exchange
 * @description DefiLlama - token price data provider (read-only).
 * Docs: https://api-docs.defillama.com/#tag/coins
 */
export default class defillama extends Exchange {
    describe (): any {
        // Slugs default to /v2/chains name.toLowerCase(); manual overrides (e.g. OP Mainnet -> optimism).
        const networks: Dict = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'BSC': 'bsc',
            'XRP': 'xrpl',
            'LTC': 'litecoin',
            'DOGE': 'dogechain',
            'XLM': 'stellar',
            'TRX': 'tron',
            'ETC': 'ethereumclassic',
            'ZEC': 'zcash',
            'XMR': 'monero',
            'ADA': 'cardano',
            'XTZ': 'tezos',
            'ATOM': 'cosmos',
            'SOL': 'solana',
            'DOT': 'polkadot',
            'ALGO': 'algorand',
            'BCH': 'smartbch',
            'FIL': 'filecoin',
            'KSM': 'kusama',
            'EGLD': 'elrond',
            'RUNE': 'thorchain',
            'ICP': 'icp',
            'NEAR': 'near',
            'CELO': 'celo',
            'HBAR': 'hedera',
            'MIOTA': 'iota',
            'KLAY': 'klaytn',
            'VET': 'vechain',
            'THETA': 'theta',
            'STX': 'stacks',
            'OPTIMISM': 'optimism',
            'ARBITRUM': 'arbitrum',
            'MATIC': 'polygon',
            'FTM': 'fantom',
            'ERC20': 'ethereum',
            'TRC20': 'tron',
            'BEP20': 'bsc',
            'BEP2': 'bnb',
            'AVAX': 'avalanche',
            'AVAXC': 'avalanche',
            'ZKSYNC': 'zksync',
            'ZKSYNCERA': 'zksync',
            'BASE': 'base',
            'SUI': 'sui',
            'APT': 'aptos',
            'SCROLL': 'scroll',
            'KAVA': 'kava',
            'RSK': 'rsk',
            'SEI': 'sei',
            'TON': 'ton',
            'OSMO': 'osmosis',
            'ACA': 'acala',
            'METIS': 'metis',
            'ASTR': 'astar',
            'CFX': 'conflux',
            'SCRT': 'secret',
            'ONT': 'ontology',
            'CRONOS': 'cronos',
            'LINEA': 'linea',
            'BLAST': 'blast',
            'MANTLE': 'mantle',
            'MODE': 'mode',
            'CORE': 'core',
            'TAIKO': 'taiko',
            'MNT': 'mantle',
            'BERACHAIN': 'berachain',
            'HYPERLIQUID': 'hyperliquid',
            'INJECTIVE': 'injective',
            'PULSECHAIN': 'pulsechain',
            'BOBA': 'boba',
            'MOONBEAM': 'moonbeam',
            'MOONRIVER': 'moonriver',
            'GNOSIS': 'gnosis',
            'AURORA': 'aurora',
            'HARMONY': 'harmony',
            'FUSE': 'fuse',
            'OKC': 'okc',
            'HECO': 'heco',
            'KCC': 'kcc',
            'WAVES': 'waves',
            'EOS': 'eos',
            'FLOW': 'flow',
            'ZORA': 'zora',
            'WORLDCHAIN': 'worldchain',
            'ABSTRACT': 'abstract',
            'SONIC': 'sonic',
            'UNICHAIN': 'unichain',
            'INK': 'ink',
        };
        const networksById: Dict = {};
        const networkKeys = Object.keys (networks);
        for (let networkIndex = 0; networkIndex < networkKeys.length; networkIndex++) {
            const networkCode = networkKeys[networkIndex];
            networksById[networks[networkCode]] = networkCode;
        }
        const preferredNetworkCodeByChainId: Dict = {
            'ethereum': 'ETH',
            'tron': 'TRX',
            'bsc': 'BEP20',
            'avalanche': 'AVAX',
            'zksync': 'ZKSYNC',
            'mantle': 'MANTLE',
            'base': 'BASE',
        };
        const preferredChainIds = Object.keys (preferredNetworkCodeByChainId);
        for (let chainIndex = 0; chainIndex < preferredChainIds.length; chainIndex++) {
            const chainId = preferredChainIds[chainIndex];
            networksById[chainId] = preferredNetworkCodeByChainId[chainId];
        }
        return this.deepExtend (super.describe (), {
            'id': 'defillama',
            'name': 'DefiLlama',
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
                'obFetchDexPairs': true,
                'obLoadMarketsForSymbols': true,
                'transfer': false,
            },
            'timeframes': {
                '1d': '1d',
            },
            'urls': {
                'logo': 'https://defillama.com/favicon.ico',
                'api': {
                    'rest': 'https://coins.llama.fi',
                },
                'www': 'https://defillama.com',
                'doc': [
                    'https://api-docs.defillama.com/#tag/coins',
                ],
            },
            'api': {
                'public': {
                    'get': {
                        'prices/current/{coins}': 1,
                        'prices/historical/{timestamp}/{coins}': 1,
                        'batchHistorical': 1,
                        'chart/{coins}': 1,
                        'percentage/{coins}': 1,
                        'prices/first/{coins}': 1,
                        'block/{chain}/{timestamp}': 1,
                    },
                },
            },
            'requiredCredentials': {
                'apiKey': false,
                'secret': false,
            },
            'options': {
                'networks': networks,
                'networksById': networksById,
            },
        });
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
        //
        // built locally (no HTTP); representative shape:
        // {
        //     "id": "ETH:*:ethereum:0xc02a…:0xa0b8…",
        //     "symbol": "0xc02a…/0xa0b8…@ETH!*",
        //     "base": "WETH",
        //     "quote": "USDC",
        //     "baseId": "0xc02aa…",
        //     "quoteId": "0xa0b869…",
        //     "type": "spot",
        //     "spot": true,
        //     "active": true
        // }
        //
        const parsed = this.obParseDexPairSymbolInput (symbol);
        const tradingSymbol = this.safeString (parsed, 'tradingSymbol');
        const networkCode = this.safeString (parsed, 'networkCode');
        const dexCode = this.safeString (parsed, 'dexCode');
        this.requireNetworkCode (networkCode, symbol);
        this.assertSupportedDexCode (dexCode);
        const parts = tradingSymbol.split ('/');
        const baseId = this.normalizeTokenAddress (this.safeString (parts, 0));
        const quoteId = this.normalizeTokenAddress (this.safeString (parts, 1));
        return this.parseSyntheticMarket (tradingSymbol, networkCode, dexCode, baseId, quoteId, base, quote);
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
            if ((baseId !== undefined) && (quoteId !== undefined)) {
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

    async resolveMarket (symbol: string, params = {}): Promise<Market> {
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        return resolveResult['marketsBySymbol'][symbol];
    }

    buildCoinKey (chainSlug: string, tokenAddress: string): string {
        return chainSlug + ':' + this.normalizeTokenAddress (tokenAddress);
    }

    getCoinKeysForMarket (market: Market): string[] {
        const chainSlug = this.getChainSlugFromMarket (market);
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const keys: string[] = [];
        if ((chainSlug !== undefined) && (baseId !== undefined)) {
            keys.push (this.buildCoinKey (chainSlug, baseId));
        }
        if ((chainSlug !== undefined) && (quoteId !== undefined)) {
            keys.push (this.buildCoinKey (chainSlug, quoteId));
        }
        return keys;
    }

    getUniqueCoinKeys (coinKeys: string[]): string[] {
        const uniqueKeys: Dict = {};
        for (let keyIndex = 0; keyIndex < coinKeys.length; keyIndex++) {
            const coinKey = coinKeys[keyIndex];
            if (coinKey !== undefined) {
                uniqueKeys[coinKey] = true;
            }
        }
        return Object.keys (uniqueKeys);
    }

    parseCoinPrices (response: Dict): Dict {
        //
        // GET /prices/current/{coins}
        // {
        //     "coins": {
        //         "ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": {
        //             "decimals": 18,
        //             "symbol": "WETH",
        //             "price": 1675.3099201762927,
        //             "timestamp": 1781423945,
        //             "confidence": 0.99
        //         },
        //         "ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7": {
        //             "decimals": 6,
        //             "symbol": "USDT",
        //             "price": 0.9994492627639542,
        //             "timestamp": 1781426524,
        //             "confidence": 0.99
        //         }
        //     }
        // }
        //
        return this.safeDict (response, 'coins', {});
    }

    async fetchCurrentPrices (coinKeys: string[], params = {}): Promise<Dict> {
        const uniqueKeys = this.getUniqueCoinKeys (coinKeys);
        if (uniqueKeys.length === 0) {
            return {};
        }
        const request: Dict = {
            'coins': uniqueKeys.join (','),
        };
        const response = await this.publicGetPricesCurrentCoins (this.extend (request, params));
        return this.parseCoinPrices (response);
    }

    getUsdPriceFromCoins (coins: Dict, coinKey: string): number {
        const entry = this.safeDict (coins, coinKey);
        const price = this.safeNumber (entry, 'price');
        if (price === undefined) {
            throw new BadSymbol (this.id + ' no USD price for coin ' + coinKey);
        }
        return price;
    }

    getTokenSymbolFromCoins (coins: Dict, coinKey: string): string {
        const entry = this.safeDict (coins, coinKey);
        return this.safeCurrencyCode (this.safeString (entry, 'symbol'));
    }

    computePairPrice (baseUsd: number, quoteUsd: number): number {
        if ((baseUsd === undefined) || (quoteUsd === undefined) || (quoteUsd === 0)) {
            throw new BadSymbol (this.id + ' cannot compute pair price from USD prices');
        }
        return baseUsd / quoteUsd;
    }

    enrichMarketFromCoins (market: Market, coins: Dict): Market {
        const chainSlug = this.getChainSlugFromMarket (market);
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const baseKey = this.buildCoinKey (chainSlug, baseId);
        const quoteKey = this.buildCoinKey (chainSlug, quoteId);
        const baseSymbol = this.getTokenSymbolFromCoins (coins, baseKey);
        const quoteSymbol = this.getTokenSymbolFromCoins (coins, quoteKey);
        if ((baseSymbol !== undefined) && (baseSymbol !== market['base'])) {
            market['base'] = baseSymbol;
        }
        if ((quoteSymbol !== undefined) && (quoteSymbol !== market['quote'])) {
            market['quote'] = quoteSymbol;
        }
        return market;
    }

    parseTicker (market: Market, coins: Dict, pairPrice: number): Ticker {
        //
        // last/close are derived: price_base_usd / price_quote_usd (not returned directly by API)
        // API has no volume fields; baseVolume and quoteVolume stay unset
        //
        const symbol = this.safeString (market, 'symbol');
        const chainSlug = this.getChainSlugFromMarket (market);
        const baseId = this.safeString (market, 'baseId');
        const baseKey = this.buildCoinKey (chainSlug, baseId);
        const baseEntry = this.safeDict (coins, baseKey, {});
        const timestamp = this.safeInteger (baseEntry, 'timestamp');
        const last = this.numberToString (pairPrice);
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
            'info': {
                'coins': coins,
                'pairPrice': pairPrice,
            },
        }, market);
    }

    async buildTickerForMarket (market: Market, coins: Dict): Promise<Ticker> {
        const chainSlug = this.getChainSlugFromMarket (market);
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const baseKey = this.buildCoinKey (chainSlug, baseId);
        const quoteKey = this.buildCoinKey (chainSlug, quoteId);
        const baseUsd = this.getUsdPriceFromCoins (coins, baseKey);
        const quoteUsd = this.getUsdPriceFromCoins (coins, quoteKey);
        const pairPrice = this.computePairPrice (baseUsd, quoteUsd);
        this.enrichMarketFromCoins (market, coins);
        return this.parseTicker (market, coins, pairPrice);
    }

    collectCoinKeysForMarkets (marketsBySymbol: Dict, symbols: string[]): string[] {
        const allCoinKeys: string[] = [];
        for (let symbolIndex = 0; symbolIndex < symbols.length; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            const market = this.safeValue (marketsBySymbol, symbol);
            const marketCoinKeys = this.getCoinKeysForMarket (market);
            for (let keyIndex = 0; keyIndex < marketCoinKeys.length; keyIndex++) {
                allCoinKeys.push (marketCoinKeys[keyIndex]);
            }
        }
        return allCoinKeys;
    }

    /**
     * @method
     * @name defillama#fetchMarkets
     * @description fetches markets; returns empty by default (markets loaded on demand)
     * @see https://api-docs.defillama.com/#tag/coins
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of market structures
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        return [];
    }

    /**
     * @method
     * @name defillama#fetchTicker
     * @description fetches a price ticker for a market
     * @see https://api-docs.defillama.com/#tag/coins/get/coins/prices/current/{coins}
     * @param {string} symbol unified market symbol with @network or @network!* suffix
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        const market = resolveResult['marketsBySymbol'][symbol];
        const coinKeys = this.getCoinKeysForMarket (market);
        const coins = await this.fetchCurrentPrices (coinKeys, params);
        const ticker = await this.buildTickerForMarket (market, coins);
        ticker['symbol'] = symbol;
        return ticker;
    }

    /**
     * @method
     * @name defillama#fetchTickers
     * @description fetches price tickers for multiple markets; batches coin keys in one request
     * @see https://api-docs.defillama.com/#tag/coins/get/coins/prices/current/{coins}
     * @param {string[]} symbols list of unified market symbols with @network or @network!* suffix
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
        const coinKeys = this.collectCoinKeysForMarkets (marketsBySymbol, symbols);
        const coins = await this.fetchCurrentPrices (coinKeys, params);
        const result: Dict = {};
        for (let symbolIndex = 0; symbolIndex < symbolsLength; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            const market = this.safeValue (marketsBySymbol, symbol);
            const ticker = await this.buildTickerForMarket (market, coins);
            ticker['symbol'] = symbol;
            result[symbol] = ticker;
        }
        return result;
    }

    /**
     * @method
     * @name defillama#obLoadMarketsForSymbols
     * @description lazily resolves and populates this.markets for the given symbols
     * @see https://api-docs.defillama.com/#tag/coins
     * @param {string[]} symbols list of base/quote symbols with @network or @network!* suffix
     * @param {boolean} reload when true, re-fetch symbols even if already cached in this.markets
     * @param {object} params extra parameters specific to the exchange API endpoint
     * @returns {object[]} empty list; ob_defillama returns fixed market status structures
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

    parsePairToObDexPair (market: Market, coins: Dict, pairPrice: number): ObDexPair {
        //
        // {
        //     "symbol": "WETH/USDC",
        //     "network": "ETH",
        //     "dex": "*",
        //     "baseTokenAddress": "0xc02aa…",
        //     "quoteTokenAddress": "0xa0b869…",
        //     "price": 1675.31,
        //     "quoteLiquidity": 1
        // }
        //
        const chainSlug = this.getChainSlugFromMarket (market);
        const symbol = this.safeString (market, 'symbol');
        const parsed = this.obParseNetworkDexSymbol (symbol);
        const networkCode = this.safeString (parsed, 'networkCode');
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const baseKey = this.buildCoinKey (chainSlug, baseId);
        const quoteKey = this.buildCoinKey (chainSlug, quoteId);
        const base = this.getTokenSymbolFromCoins (coins, baseKey);
        const quote = this.getTokenSymbolFromCoins (coins, quoteKey);
        return {
            'symbol': base + '/' + quote,
            'network': networkCode,
            'dex': '*',
            'baseTokenAddress': baseId,
            'quoteTokenAddress': quoteId,
            'price': pairPrice,
            'quoteLiquidity': 1,
        };
    }

    buildVenueKey (networkCode: string, dexCode: string): string {
        return networkCode + ':' + dexCode;
    }

    /**
     * @method
     * @name defillama#obFetchDexPairs
     * @description returns DEX pair structures for DefiLlama (single venue per network, dex=*)
     * @see https://api-docs.defillama.com/#tag/coins
     * @param {string[]} symbols list of symbols with @network or @network!* suffix
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {ObDexPair[]} list of pair structures
     */
    async obFetchDexPairs (symbols: string[], params = {}): Promise<ObDexPair[]> {
        if (symbols === undefined) {
            throw new ArgumentsRequired (this.id + ' obFetchDexPairs() requires a non-empty symbols argument');
        }
        const symbolsLength = symbols.length;
        if (symbolsLength === 0) {
            throw new ArgumentsRequired (this.id + ' obFetchDexPairs() requires a non-empty symbols argument');
        }
        const seenInputs: Dict = {};
        const parsedInputs: Dict[] = [];
        for (let symbolIndex = 0; symbolIndex < symbolsLength; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            if (symbol in seenInputs) {
                continue;
            }
            seenInputs[symbol] = true;
            parsedInputs.push (this.obParseDexPairSymbolInput (symbol));
        }
        const requiredTradingSymbols: Dict = {};
        for (let inputIndex = 0; inputIndex < parsedInputs.length; inputIndex++) {
            const parsedInput = parsedInputs[inputIndex];
            requiredTradingSymbols[parsedInput['tradingSymbol']] = true;
        }
        const resolveSymbols = Object.keys (seenInputs);
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets (resolveSymbols, params);
        const marketsBySymbol = resolveResult['marketsBySymbol'];
        const coinKeys = this.collectCoinKeysForMarkets (marketsBySymbol, resolveSymbols);
        const coins = await this.fetchCurrentPrices (coinKeys, params);
        const venues: Dict = {};
        for (let symbolIndex = 0; symbolIndex < resolveSymbols.length; symbolIndex++) {
            const symbol = resolveSymbols[symbolIndex];
            const parsedInput = this.obParseDexPairSymbolInput (symbol);
            const tradingSymbol = parsedInput['tradingSymbol'];
            const networkCode = parsedInput['networkCode'];
            const market = this.safeValue (marketsBySymbol, symbol);
            if (market === undefined) {
                continue;
            }
            const chainSlug = this.getChainSlugFromMarket (market);
            const baseId = this.safeString (market, 'baseId');
            const quoteId = this.safeString (market, 'quoteId');
            const baseKey = this.buildCoinKey (chainSlug, baseId);
            const quoteKey = this.buildCoinKey (chainSlug, quoteId);
            const baseUsd = this.getUsdPriceFromCoins (coins, baseKey);
            const quoteUsd = this.getUsdPriceFromCoins (coins, quoteKey);
            const pairPrice = this.computePairPrice (baseUsd, quoteUsd);
            const venueKey = this.buildVenueKey (networkCode, '*');
            if (!(venueKey in venues)) {
                venues[venueKey] = {};
            }
            venues[venueKey][tradingSymbol] = this.parsePairToObDexPair (market, coins, pairPrice);
        }
        const requiredSymbolsList = Object.keys (requiredTradingSymbols);
        const result = [];
        const venueKeys = Object.keys (venues);
        for (let venueKeyIndex = 0; venueKeyIndex < venueKeys.length; venueKeyIndex++) {
            const venueKey = venueKeys[venueKeyIndex];
            const venueSymbols: Dict = venues[venueKey];
            let hasAllSymbols = true;
            for (let requiredIndex = 0; requiredIndex < requiredSymbolsList.length; requiredIndex++) {
                const requiredTradingSymbol = requiredSymbolsList[requiredIndex];
                if (!(requiredTradingSymbol in venueSymbols)) {
                    hasAllSymbols = false;
                    break;
                }
            }
            if (!hasAllSymbols) {
                continue;
            }
            for (let requiredIndex = 0; requiredIndex < requiredSymbolsList.length; requiredIndex++) {
                const requiredTradingSymbol = requiredSymbolsList[requiredIndex];
                result.push (venueSymbols[requiredTradingSymbol]);
            }
        }
        return result;
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
            return undefined;
        }
        if (httpCode === 429) {
            throw new RateLimitExceeded (this.id + ' ' + body);
        }
        return undefined;
    }
}
