//  ---------------------------------------------------------------------------

import Exchange from './abstract/dexscreener.js';
import { ArgumentsRequired, BadRequest, BadSymbol, ExchangeError, RateLimitExceeded } from './base/errors.js';
import type { Market, Dict, Ticker, int, Strings, Tickers, MarketInterface, ObDexPair } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class dexscreener
 * @augments Exchange
 * @description DexScreener - DEX pair market data provider (read-only).
 * Docs: https://docs.dexscreener.com/api/reference
 */
export default class dexscreener extends Exchange {
    describe (): any {
        const dexes: Dict = {
            'uniswap': 'UNISWAP',
            'uniswapv2': 'UNISWAPV2',
            'uniswapv3': 'UNISWAPV3',
            'sushiswap': 'SUSHISWAP',
            'pancakeswap': 'PANCAKESWAP',
            'pancakeswapv2': 'PANCAKESWAPV2',
            'pancakeswapv3': 'PANCAKESWAPV3',
            'raydium': 'RAYDIUM',
            'orca': 'ORCA',
            'meteora': 'METEORA',
            'curve': 'CURVE',
            'balancer': 'BALANCER',
            'aerodrome': 'AERODROME',
            'quickswap': 'QUICKSWAP',
            'quickswapv3': 'QUICKSWAPV3',
            'pumpswap': 'PUMPSWAP',
            'pumpfun': 'PUMPFUN',
            'traderjoe': 'TRADERJOE',
            'camelot': 'CAMELOT',
            'velodrome': 'VELODROME',
            'baseswap': 'BASESWAP',
            'syncswap': 'SYNCSWAP',
            'spookyswap': 'SPOOKYSWAP',
            'spiritswap': 'SPIRITSWAP',
            'osmosis': 'OSMOSIS',
            'jupiter': 'JUPITER',
            'lifinity': 'LIFINITY',
            'phoenix': 'PHOENIX',
            'dedust': 'DEDUST',
            'stonfi': 'STONFI',
            'cetus': 'CETUS',
            'turbos': 'TURBOS',
            'bluemove': 'BLUEMOVE',
            'liquidswap': 'LIQUIDSWAP',
            'thala': 'THALA',
            'hyperliquid': 'HYPERLIQUID',
            'dydx': 'DYDX',
            'gmx': 'GMX',
            'kyberswap': 'KYBERSWAP',
            'biswap': 'BISWAP',
            'mdex': 'MDEX',
            'apeswap': 'APESWAP',
            'vvsfinance': 'VVSFINANCE',
            'mmfinance': 'MMFINANCE',
            'shibaswap': 'SHIBASWAP',
            'fraxswap': 'FRAXSWAP',
            'wagmi': 'WAGMI',
            'agni': 'AGNI',
            'lynex': 'LYNEX',
            'retro': 'RETRO',
            'ramses': 'RAMSES',
            'thena': 'THENA',
            'bancor': 'BANCOR',
            'dodo': 'DODO',
            'maverick': 'MAVERICK',
            'woofi': 'WOOFI',
            'equalizer': 'EQUALIZER',
            'solidly': 'SOLIDLY',
            'voltage': 'VOLTAGE',
            'kinetix': 'KINETIX',
            'hermes': 'HERMES',
            'merchantmoe': 'MERCHANTMOE',
            'beamswap': 'BEAMSWAP',
            'stellaswap': 'STELLASWAP',
            'arthswap': 'ARTHSWAP',
            'solarbeam': 'SOLARBEAM',
            'voltagefinance': 'VOLTAGEFINANCE',
            'honeyswap': 'HONEYSWAP',
            'ubeswap': 'UBESWAP',
            'trisolaris': 'TRISOLARIS',
            'reffinance': 'REFFINANCE',
            'saucerswap': 'SAUCERSWAP',
            'helix': 'HELIX',
            'injective': 'INJECTIVE',
            'bluefin': 'BLUEFIN',
            'flowx': 'FLOWX',
            'crescent': 'CRESCENT',
            'astroport': 'ASTROPORT',
            'terraswap': 'TERRASWAP',
            'stepn': 'STEPN',
            'step': 'STEP',
            'raydiumclmm': 'RAYDIUMCLMM',
            'raydiumcpmm': 'RAYDIUMCPMM',
            'meteoradlmm': 'METEORADLMM',
            'meteoradamm': 'METEORADAMM',
        };
        const dexesById: Dict = {};
        const dexKeys = Object.keys (dexes);
        for (let dexIndex = 0; dexIndex < dexKeys.length; dexIndex++) {
            const dexId = dexKeys[dexIndex];
            dexesById[dexes[dexId]] = dexId;
        }
        const networks: Dict = {
            // CCXT unified
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
            // token-standard aliases
            'ERC20': 'ethereum',
            'TRC20': 'tron',
            'BEP20': 'bsc',
            'BEP2': 'bnb',
            'AVAX': 'avalanche',
            'AVAXC': 'avalanche',
            'ZKSYNC': 'zksync',
            'ZKSYNCERA': 'zksync',
            // DexScreener L2 / extra
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
        };
        const preferredChainIds = Object.keys (preferredNetworkCodeByChainId);
        for (let chainIndex = 0; chainIndex < preferredChainIds.length; chainIndex++) {
            const chainId = preferredChainIds[chainIndex];
            networksById[chainId] = preferredNetworkCodeByChainId[chainId];
        }
        return this.deepExtend (super.describe (), {
            'id': 'dexscreener',
            'name': 'DexScreener',
            'countries': [ ],
            'rateLimit': 200, // 300 requests per minute (DEX/pairs endpoints)
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
                    // DEX/pairs request rate limit of 300 per minute
                    // cost = 1 => (1000 / (200 * 1)) * 60 = 300
                    'get': {
                        'latest/dex/search': 1,
                        'tokens/v1/{chainId}/{tokenAddresses}': 1,
                        'latest/dex/pairs/{chainId}/{pairId}': 1,
                    },
                },
            },
            'requiredCredentials': {
                'apiKey': false,
                'secret': false,
            },
            'options': {
                'maxTokenAddressesPerRequest': 30,
                'networks': networks,
                'networksById': networksById,
                'dexes': dexes,
                'dexesById': dexesById,
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

    safeLiquidityQuote (pair: Dict): number {
        const liquidity = this.safeDict (pair, 'liquidity', {});
        return this.safeNumber (liquidity, 'quote', 0);
    }

    safeLiquidityForPairSelection (pair: Dict, dexCode): number {
        if (dexCode === '*') {
            return this.safeLiquidityQuote (pair);
        }
        return this.safeLiquidityUsd (pair);
    }

    parseTokenPairsResponse (response) {
        if (Array.isArray (response)) {
            return response;
        }
        return this.safeList (response, 'pairs', []);
    }

    getUniqueTokenAddresses (tokenAddresses: string[]): string[] {
        const uniqueAddresses: Dict = {};
        for (let addressIndex = 0; addressIndex < tokenAddresses.length; addressIndex++) {
            const address = tokenAddresses[addressIndex];
            if (address !== undefined) {
                uniqueAddresses[address] = true;
            }
        }
        return Object.keys (uniqueAddresses);
    }

    async fetchPairsForTokensV1Batch (tokenAddresses: string[], chainId: string, params = {}): Promise<any[]> {
        if (tokenAddresses.length === 0) {
            return [];
        }
        const request: Dict = {
            'chainId': chainId,
            'tokenAddresses': tokenAddresses.join (','),
        };
        const response = await this.publicGetTokensV1ChainIdTokenAddresses (this.extend (request, params));
        return this.parseTokenPairsResponse (response);
    }

    async fetchPairsForTokensV1 (tokenAddresses: string[], chainId: string, params = {}): Promise<any[]> {
        const addresses = this.getUniqueTokenAddresses (tokenAddresses);
        const maxBatchSize = this.safeInteger (this.options, 'maxTokenAddressesPerRequest', 30);
        const allPairs: Dict[] = [];
        let offset = 0;
        while (offset < addresses.length) {
            const batch = addresses.slice (offset, offset + maxBatchSize);
            const pairs = await this.fetchPairsForTokensV1Batch (batch, chainId, params);
            for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
                allPairs.push (pairs[pairIndex]);
            }
            offset = offset + maxBatchSize;
        }
        return allPairs;
    }

    mergePairsByPairAddress (pairs: Dict[]): Dict[] {
        const mergedByPairAddress: Dict = {};
        for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
            const pair = pairs[pairIndex];
            const pairAddress = this.safeString (pair, 'pairAddress');
            if (pairAddress === undefined) {
                continue;
            }
            mergedByPairAddress[pairAddress] = pair;
        }
        return Object.values (mergedByPairAddress);
    }

    pairMatchesTickerSymbol (pair: Dict, base: string, quote: string): boolean {
        const baseToken = this.safeDict (pair, 'baseToken', {});
        const quoteToken = this.safeDict (pair, 'quoteToken', {});
        if (this.isTokenAddress (base)) {
            const pairBase = this.normalizeTokenAddress (this.safeString (baseToken, 'address'));
            if (pairBase !== this.normalizeTokenAddress (base)) {
                return false;
            }
        } else {
            const pairBase = this.safeCurrencyCode (this.safeString (baseToken, 'symbol'));
            if (pairBase !== this.safeCurrencyCode (base)) {
                return false;
            }
        }
        if (this.isTokenAddress (quote)) {
            const pairQuote = this.normalizeTokenAddress (this.safeString (quoteToken, 'address'));
            if (pairQuote !== this.normalizeTokenAddress (quote)) {
                return false;
            }
        } else {
            const pairQuote = this.safeCurrencyCode (this.safeString (quoteToken, 'symbol'));
            if (pairQuote !== this.safeCurrencyCode (quote)) {
                return false;
            }
        }
        return true;
    }

    pairMatchesNetworkAndDex (pair: Dict, networkCode, dexCode) {
        if (networkCode !== undefined) {
            const chainId = this.safeString (pair, 'chainId');
            const pairNetworkCode = this.networkIdToCode (chainId);
            if (this.obSanitizeNetworkDexToken (pairNetworkCode) !== this.obSanitizeNetworkDexToken (networkCode)) {
                return false;
            }
        }
        if (dexCode === undefined) {
            return true;
        }
        if (dexCode === '*') {
            return true;
        }
        const pairDexId = this.safeString (pair, 'dexId');
        return pairDexId === this.obDexCodeToId (dexCode);
    }

    pairMatchesAddressCombination (pair: Dict, baseAddress: string, quoteAddress: string): boolean {
        const baseToken = this.safeDict (pair, 'baseToken', {});
        const quoteToken = this.safeDict (pair, 'quoteToken', {});
        const pairBase = this.normalizeTokenAddress (this.safeString (baseToken, 'address'));
        const pairQuote = this.normalizeTokenAddress (this.safeString (quoteToken, 'address'));
        return (pairBase === this.normalizeTokenAddress (baseAddress)) && (pairQuote === this.normalizeTokenAddress (quoteAddress));
    }

    buildMarketSymbol (tradingSymbol: string, networkCode: string, dexCode): string {
        if (dexCode !== undefined) {
            return tradingSymbol + '@' + networkCode + '!' + dexCode;
        }
        return tradingSymbol + '@' + networkCode;
    }

    buildMarketId (networkCode: string, dexCode, chainId: string, pairAddress: string): string {
        const unifiedDexCode = (dexCode !== undefined) ? dexCode : '';
        return networkCode + ':' + unifiedDexCode + ':' + chainId + ':' + pairAddress;
    }

    parseMarketId (marketId: string): Dict {
        const parts = marketId.split (':');
        return {
            'networkCode': this.safeString (parts, 0),
            'dexCode': this.safeString (parts, 1),
            'chainId': this.safeString (parts, 2),
            'pairAddress': this.safeString (parts, 3),
        };
    }

    parseMarket (pair: Dict): Market {
        const chainId = this.safeString (pair, 'chainId');
        const pairAddress = this.safeString (pair, 'pairAddress');
        const pairDexId = this.safeString (pair, 'dexId');
        const networkCode = this.networkIdToCode (chainId);
        const dexCode = this.obDexIdToCode (pairDexId);
        const baseToken = this.safeDict (pair, 'baseToken', {});
        const quoteToken = this.safeDict (pair, 'quoteToken', {});
        const baseId = this.safeString (baseToken, 'address');
        const quoteId = this.safeString (quoteToken, 'address');
        const base = this.safeCurrencyCode (this.safeString (baseToken, 'symbol'));
        const quote = this.safeCurrencyCode (this.safeString (quoteToken, 'symbol'));
        const tradingSymbol = base + '/' + quote;
        const symbol = this.buildMarketSymbol (tradingSymbol, networkCode, dexCode);
        const id = this.buildMarketId (networkCode, dexCode, chainId, pairAddress);
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

    parseAddressMarket (pair: Dict, tradingSymbol: string, networkCode: string, dexCode): Market {
        const chainId = this.safeString (pair, 'chainId');
        const pairAddress = this.safeString (pair, 'pairAddress');
        const baseToken = this.safeDict (pair, 'baseToken', {});
        const quoteToken = this.safeDict (pair, 'quoteToken', {});
        const baseId = this.safeString (baseToken, 'address');
        const quoteId = this.safeString (quoteToken, 'address');
        const base = this.safeCurrencyCode (this.safeString (baseToken, 'symbol'));
        const quote = this.safeCurrencyCode (this.safeString (quoteToken, 'symbol'));
        let effectiveNetworkCode = networkCode;
        if (effectiveNetworkCode === undefined) {
            effectiveNetworkCode = this.networkIdToCode (chainId);
        }
        let effectiveDexCode = dexCode;
        if ((effectiveDexCode === undefined) || (effectiveDexCode === '*')) {
            const pairDexId = this.safeString (pair, 'dexId');
            effectiveDexCode = this.obDexIdToCode (pairDexId);
        }
        const symbol = this.buildMarketSymbol (tradingSymbol, effectiveNetworkCode, effectiveDexCode);
        const id = this.buildMarketId (effectiveNetworkCode, effectiveDexCode, chainId, pairAddress);
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
            const base = this.safeString (market, 'base');
            const quote = this.safeString (market, 'quote');
            if ((baseId !== undefined) && (quoteId !== undefined)) {
                const addressAliasSymbol = this.getAddressPairSymbol (baseId, quoteId, networkCode, dexCode);
                if ((addressAliasSymbol !== unifiedSymbol) && !(addressAliasSymbol in this.markets)) {
                    this.markets[addressAliasSymbol] = market;
                }
            }
            if ((base !== undefined) && (quote !== undefined) && this.isAddressPairSymbol (unifiedSymbol)) {
                const tickerAliasSymbol = this.buildMarketSymbol (base + '/' + quote, networkCode, dexCode);
                if ((tickerAliasSymbol !== unifiedSymbol) && !(tickerAliasSymbol in this.markets)) {
                    this.markets[tickerAliasSymbol] = market;
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

    /**
     * @method
     * @name dexscreener#fetchMarkets
     * @description fetches markets; returns empty by default (markets loaded on demand)
     * @see https://docs.dexscreener.com/api/reference
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of market structures
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        return [];
    }

    normalizeTradingSymbolPart (part: string): string {
        if (this.isTokenAddress (part)) {
            return this.normalizeTokenAddress (part);
        }
        return this.safeCurrencyCode (part);
    }

    buildSearchQueryFromTradingSymbol (tradingSymbol: string): string {
        const parts = tradingSymbol.split ('/');
        if (parts.length !== 2) {
            throw new BadSymbol (this.id + ' buildSearchQueryFromTradingSymbol() requires a base/quote symbol');
        }
        const basePart = this.safeString (parts, 0);
        const quotePart = this.safeString (parts, 1);
        const base = this.normalizeTradingSymbolPart (basePart);
        const quote = this.normalizeTradingSymbolPart (quotePart);
        return base + '/' + quote;
    }

    /**
     * @method
     * @name dexscreener#fetchMarketsForSymbol
     * @description fetches all markets matching a base/quote ticker symbol via search
     * @see https://docs.dexscreener.com/api/reference
     * @param {string} symbol trading symbol without network suffix, e.g. WETH/USDC
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of market structures
     */
    async fetchMarketsForSymbol (symbol: string, params = {}): Promise<Market[]> {
        const parts = symbol.split ('/');
        if (parts.length !== 2) {
            throw new BadSymbol (this.id + ' fetchMarketsForSymbol() requires a base/quote symbol');
        }
        const basePart = this.safeString (parts, 0);
        const quotePart = this.safeString (parts, 1);
        const base = this.normalizeTradingSymbolPart (basePart);
        const quote = this.normalizeTradingSymbolPart (quotePart);
        const request: Dict = {
            'q': this.buildSearchQueryFromTradingSymbol (symbol),
        };
        const response = await this.publicGetLatestDexSearch (this.extend (request, params));
        const rawPairs = this.parseTokenPairsResponse (response);
        const filteredPairs = [];
        const seenMarketIds: Dict = {};
        for (let pairIndex = 0; pairIndex < rawPairs.length; pairIndex++) {
            const pair = rawPairs[pairIndex];
            if (!this.pairMatchesTickerSymbol (pair, base, quote)) {
                continue;
            }
            const market = this.parseMarket (pair);
            const marketId = this.safeString (market, 'id');
            if (marketId in seenMarketIds) {
                continue;
            }
            seenMarketIds[marketId] = true;
            filteredPairs.push (market);
        }
        if (filteredPairs.length > 0) {
            this.mergeMarkets (filteredPairs);
        }
        return filteredPairs;
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
        const marketId = this.safeString (market, 'id');
        if (marketId !== undefined) {
            const parsedMarketId = this.parseMarketId (marketId);
            const pairAddress = this.safeString (parsedMarketId, 'pairAddress');
            if (pairAddress !== undefined) {
                return pairAddress;
            }
        }
        const info = this.safeDict (market, 'info', {});
        return this.safeString2 (info, 'pairAddress', 'pair_address');
    }

    getChainIdFromMarket (market: Market) {
        const marketId = this.safeString (market, 'id');
        if (marketId !== undefined) {
            const parsedMarketId = this.parseMarketId (marketId);
            const chainId = this.safeString (parsedMarketId, 'chainId');
            if (chainId !== undefined) {
                return chainId;
            }
        }
        const info = this.safeDict (market, 'info', {});
        return this.safeString (info, 'chainId');
    }

    async fetchPairForMarket (market: Market, dexCode, params = {}): Promise<Dict> {
        const symbol = this.safeString (market, 'symbol');
        const parsed = this.obParseNetworkDexSymbol (symbol);
        const tradingSymbol = this.safeString (parsed, 'tradingSymbol');
        const networkCode = this.safeString (parsed, 'networkCode');
        const effectiveDexCode = (dexCode !== undefined) ? dexCode : this.safeString (parsed, 'dexCode');
        const request: Dict = {
            'q': this.buildSearchQueryFromTradingSymbol (tradingSymbol),
        };
        const response = await this.publicGetLatestDexSearch (this.extend (request, params));
        const rawPairs = this.parseTokenPairsResponse (response);
        const filteredPairs = this.filterPairsForResolvedSymbol (rawPairs, symbol, networkCode, effectiveDexCode, tradingSymbol);
        const pair = this.selectBestFilteredPair (filteredPairs, effectiveDexCode);
        if (pair === undefined) {
            throw new BadSymbol (this.id + ' no pair data for symbol ' + symbol);
        }
        return pair;
    }

    getPairFromMarketInfo (market: Market) {
        const info = this.safeDict (market, 'info', {});
        const pairAddress = this.safeString (info, 'pairAddress');
        if (pairAddress === undefined) {
            return undefined;
        }
        return info;
    }

    async fetchPairForMarketTicker (market: Market, pairs: Dict[], dexCode, params = {}): Promise<Dict> {
        const pair = this.selectBestPairForMarket (pairs, market, dexCode);
        if (pair !== undefined) {
            return pair;
        }
        return await this.fetchPairForMarket (market, dexCode, params);
    }

    selectBestPairForMarket (pairs: Dict[], market: Market, dexCode) {
        const marketBaseId = this.normalizeTokenAddress (this.safeString (market, 'baseId'));
        const marketQuoteId = this.normalizeTokenAddress (this.safeString (market, 'quoteId'));
        const marketId = this.safeString (market, 'id');
        const parsedMarketId = this.parseMarketId (marketId);
        const targetNetworkCode = this.safeString (parsedMarketId, 'networkCode');
        const targetDexCode = (dexCode !== undefined) ? dexCode : this.safeString (parsedMarketId, 'dexCode');
        let bestPair = undefined;
        let bestLiquidity = 0;
        for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
            const pair = pairs[pairIndex];
            if (!this.pairMatchesNetworkAndDex (pair, targetNetworkCode, targetDexCode)) {
                continue;
            }
            const baseToken = this.safeDict (pair, 'baseToken', {});
            const quoteToken = this.safeDict (pair, 'quoteToken', {});
            const pairBase = this.normalizeTokenAddress (this.safeString (baseToken, 'address'));
            const pairQuote = this.normalizeTokenAddress (this.safeString (quoteToken, 'address'));
            if ((pairBase !== marketBaseId) || (pairQuote !== marketQuoteId)) {
                continue;
            }
            const liquidity = this.safeLiquidityForPairSelection (pair, targetDexCode);
            if ((bestPair === undefined) || (liquidity > bestLiquidity)) {
                bestPair = pair;
                bestLiquidity = liquidity;
            }
        }
        return bestPair;
    }

    filterPairsForResolvedSymbol (rawPairs: Dict[], symbol: string, networkCode: string, dexCode, tradingSymbol: string): Dict[] {
        const filteredPairs = [];
        for (let pairIndex = 0; pairIndex < rawPairs.length; pairIndex++) {
            const pair = rawPairs[pairIndex];
            if (!this.pairMatchesNetworkAndDex (pair, networkCode, dexCode)) {
                continue;
            }
            const parts = tradingSymbol.split ('/');
            const base = this.safeString (parts, 0);
            const quote = this.safeString (parts, 1);
            if (!this.pairMatchesTickerSymbol (pair, base, quote)) {
                continue;
            }
            filteredPairs.push (pair);
        }
        return filteredPairs;
    }

    async resolveAddressPairFromRawPairs (rawPairs: Dict[], symbol: string, networkCode: string, dexCode, tradingSymbol: string, params = {}): Promise<Dict> {
        let filteredPairs = this.filterPairsForResolvedSymbol (rawPairs, symbol, networkCode, dexCode, tradingSymbol);
        if (filteredPairs.length === 0) {
            const request: Dict = {
                'q': this.buildSearchQueryFromTradingSymbol (tradingSymbol),
            };
            const response = await this.publicGetLatestDexSearch (this.extend (request, params));
            const searchPairs = this.parseTokenPairsResponse (response);
            filteredPairs = this.filterPairsForResolvedSymbol (searchPairs, symbol, networkCode, dexCode, tradingSymbol);
        }
        return {
            'pairs': filteredPairs,
        };
    }

    async fetchPairsForAddressSymbol (symbol: string, networkCode: string, dexCode, tradingSymbol: string, chainId: string, params = {}): Promise<Dict> {
        const parts = tradingSymbol.split ('/');
        const baseAddress = this.safeString (parts, 0);
        const rawPairs = await this.fetchPairsForTokensV1 ([ baseAddress ], chainId, params);
        return await this.resolveAddressPairFromRawPairs (rawPairs, symbol, networkCode, dexCode, tradingSymbol, params);
    }

    selectBestFilteredPair (filteredPairs: Dict[], dexCode = undefined): Dict {
        let bestPair = undefined;
        let bestLiquidity = 0;
        for (let pairIndex = 0; pairIndex < filteredPairs.length; pairIndex++) {
            const pair = filteredPairs[pairIndex];
            const liquidity = this.safeLiquidityForPairSelection (pair, dexCode);
            if ((bestPair === undefined) || (liquidity > bestLiquidity)) {
                bestPair = pair;
                bestLiquidity = liquidity;
            }
        }
        return bestPair;
    }

    registerWildcardMarketAlias (wildcardSymbol: string, concreteSymbol: string) {
        const concreteMarket = this.safeValue (this.markets, concreteSymbol);
        if (concreteMarket !== undefined) {
            this.markets[wildcardSymbol] = concreteMarket;
        }
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

    async resolveMarket (symbol: string, params = {}): Promise<Market> {
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        return resolveResult['marketsBySymbol'][symbol];
    }

    formatNetworkDexResolutionDetails (networkCode, dexCode): string {
        const unifiedNetwork = (networkCode !== undefined) ? networkCode : 'none';
        const localNetwork = (networkCode !== undefined) ? this.networkCodeToId (networkCode) : 'none';
        let unifiedDex = 'none';
        let localDex = 'none';
        if (dexCode === '*') {
            unifiedDex = '*';
            localDex = 'any';
        } else if (dexCode !== undefined) {
            unifiedDex = dexCode;
            localDex = this.obDexCodeToId (dexCode);
        }
        return 'network unified=' + unifiedNetwork + ' local=' + localNetwork + ', dex unified=' + unifiedDex + ' local=' + localDex;
    }

    async resolveMarkets (symbols: string[], params = {}): Promise<Dict> {
        const marketsBySymbol: Dict = {};
        const justResolvedSymbols: Dict = {};
        const tradingSymbolsToFetch: Dict = {};
        const pendingSymbols = [];
        // 1) split cached markets from symbols that still need resolve
        for (let symbolIndex = 0; symbolIndex < symbols.length; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            const normalizedSymbol = this.normalizeAddressPairSymbol (symbol);
            if ((symbol in this.markets) || ((normalizedSymbol !== symbol) && (normalizedSymbol in this.markets))) {
                marketsBySymbol[symbol] = this.market (symbol);
                continue;
            }
            const parsed = this.obParseDexPairSymbolInput (symbol);
            const tradingSymbol = this.safeString (parsed, 'tradingSymbol');
            pendingSymbols.push ({
                'symbol': symbol,
                'parsed': parsed,
            });
            if (!this.isAddressPairSymbol (symbol)) {
                tradingSymbolsToFetch[tradingSymbol] = true;
            }
        }
        // 2) unified (non-address) symbols: load candidate markets via search
        const tradingSymbolList = Object.keys (tradingSymbolsToFetch);
        for (let tradingIndex = 0; tradingIndex < tradingSymbolList.length; tradingIndex++) {
            await this.fetchMarketsForSymbol (tradingSymbolList[tradingIndex], params);
        }
        // 3) address-pair symbols: batch tokens/v1 once per chain (base addresses only)
        const addressPairChainGroups: Dict = {};
        for (let pendingIndex = 0; pendingIndex < pendingSymbols.length; pendingIndex++) {
            const pending = pendingSymbols[pendingIndex];
            const symbol = this.safeString (pending, 'symbol');
            if (!this.isAddressPairSymbol (symbol)) {
                continue;
            }
            const parsed = this.safeDict (pending, 'parsed', {});
            const tradingSymbol = this.safeString (parsed, 'tradingSymbol');
            const networkCode = this.safeString (parsed, 'networkCode');
            const normalizedSymbol = this.normalizeAddressPairSymbol (symbol);
            if ((symbol in this.markets) || ((normalizedSymbol !== symbol) && (normalizedSymbol in this.markets))) {
                continue;
            }
            if (networkCode === undefined) {
                continue;
            }
            const chainId = this.networkCodeToId (networkCode);
            if (!(chainId in addressPairChainGroups)) {
                addressPairChainGroups[chainId] = {
                    'baseAddresses': {},
                };
            }
            const parts = tradingSymbol.split ('/');
            const baseAddress = this.normalizeTokenAddress (this.safeString (parts, 0));
            if (baseAddress !== undefined) {
                addressPairChainGroups[chainId]['baseAddresses'][baseAddress] = true;
            }
        }
        const pairsByChain: Dict = {};
        const addressPairChainIds = Object.keys (addressPairChainGroups);
        for (let chainIndex = 0; chainIndex < addressPairChainIds.length; chainIndex++) {
            const chainId = addressPairChainIds[chainIndex];
            const baseAddressList = Object.keys (addressPairChainGroups[chainId]['baseAddresses']);
            pairsByChain[chainId] = await this.fetchPairsForTokensV1 (baseAddressList, chainId, params);
        }
        // 4) resolve each pending symbol: filter batched pairs (or search fallback), merge market
        const pendingMarketAliases: Dict = {};
        for (let pendingIndex = 0; pendingIndex < pendingSymbols.length; pendingIndex++) {
            const pending = pendingSymbols[pendingIndex];
            const symbol = this.safeString (pending, 'symbol');
            const parsed = this.safeDict (pending, 'parsed', {});
            const tradingSymbol = this.safeString (parsed, 'tradingSymbol');
            const networkCode = this.safeString (parsed, 'networkCode');
            const dexCode = this.safeString (parsed, 'dexCode');
            const normalizedSymbol = this.normalizeAddressPairSymbol (symbol);
            if ((symbol in this.markets) || ((normalizedSymbol !== symbol) && (normalizedSymbol in this.markets))) {
                marketsBySymbol[symbol] = this.market (symbol);
                continue;
            }
            let filteredPairs = [];
            if (this.isAddressPairSymbol (symbol)) {
                if (networkCode === undefined) {
                    const addressResolveResult = await this.resolveAddressPairFromRawPairs ([], symbol, networkCode, dexCode, tradingSymbol, params);
                    filteredPairs = this.safeList (addressResolveResult, 'pairs', []);
                } else {
                    const chainId = this.networkCodeToId (networkCode);
                    const rawPairs = this.safeList (pairsByChain, chainId, []);
                    const addressResolveResult = await this.resolveAddressPairFromRawPairs (rawPairs, symbol, networkCode, dexCode, tradingSymbol, params);
                    filteredPairs = this.safeList (addressResolveResult, 'pairs', []);
                }
            } else {
                const parts = tradingSymbol.split ('/');
                const base = this.safeCurrencyCode (this.safeString (parts, 0));
                const quote = this.safeCurrencyCode (this.safeString (parts, 1));
                const marketSymbols = Object.keys (this.markets);
                for (let marketIndex = 0; marketIndex < marketSymbols.length; marketIndex++) {
                    const marketSymbol = marketSymbols[marketIndex];
                    const cachedMarket = this.markets[marketSymbol];
                    const marketTradingSymbol = cachedMarket['base'] + '/' + cachedMarket['quote'];
                    if (marketTradingSymbol !== (base + '/' + quote)) {
                        continue;
                    }
                    const marketId = this.safeString (cachedMarket, 'id');
                    const parsedMarketId = this.parseMarketId (marketId);
                    if (networkCode !== undefined) {
                        if (this.obSanitizeNetworkDexToken (this.safeString (parsedMarketId, 'networkCode')) !== this.obSanitizeNetworkDexToken (networkCode)) {
                            continue;
                        }
                    }
                    if ((dexCode !== undefined) && (dexCode !== '*')) {
                        if (this.obSanitizeNetworkDexToken (this.safeString (parsedMarketId, 'dexCode')) !== this.obSanitizeNetworkDexToken (dexCode)) {
                            continue;
                        }
                    }
                    filteredPairs.push (this.safeDict (cachedMarket, 'info', {}));
                }
            }
            if (filteredPairs.length === 0) {
                throw new BadSymbol (this.id + ' tokens are not supported for symbol ' + symbol + ' (' + this.formatNetworkDexResolutionDetails (networkCode, dexCode) + ')');
            }
            const selectedPair = this.selectBestFilteredPair (filteredPairs, dexCode);
            let market = undefined;
            if (this.isAddressPairSymbol (symbol)) {
                market = this.parseAddressMarket (selectedPair, tradingSymbol, networkCode, dexCode);
            } else {
                market = this.parseMarket (selectedPair);
            }
            this.mergeMarkets ([ market ]);
            if (symbol !== market['symbol']) {
                pendingMarketAliases[symbol] = market['symbol'];
                this.registerWildcardMarketAlias (symbol, market['symbol']);
            }
            marketsBySymbol[symbol] = this.market (symbol);
            justResolvedSymbols[symbol] = true;
        }
        const pendingAliasSymbols = Object.keys (pendingMarketAliases);
        for (let aliasIndex = 0; aliasIndex < pendingAliasSymbols.length; aliasIndex++) {
            const aliasSymbol = pendingAliasSymbols[aliasIndex];
            this.registerWildcardMarketAlias (aliasSymbol, pendingMarketAliases[aliasSymbol]);
        }
        return {
            'marketsBySymbol': marketsBySymbol,
            'justResolvedSymbols': justResolvedSymbols,
        };
    }

    async fetchTickersFromTokensV1 (symbols: string[], marketsBySymbol: Dict, justResolvedSymbols: Dict = {}, params = {}): Promise<Tickers> {
        const chainGroups: Dict = {};
        const result: Dict = {};
        // 1) just-resolved symbols: reuse pair data already stored in market.info (no HTTP)
        for (let symbolIndex = 0; symbolIndex < symbols.length; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            const market = this.safeValue (marketsBySymbol, symbol);
            if (this.safeValue (justResolvedSymbols, symbol, false)) {
                const pair = this.getPairFromMarketInfo (market);
                if (pair === undefined) {
                    throw new BadSymbol (this.id + ' no pair data for symbol ' + symbol);
                }
                const ticker = this.parseTicker (pair, market);
                ticker['symbol'] = symbol;
                result[symbol] = ticker;
                continue;
            }
            // 2) pre-existing symbols: group by chain and collect base token addresses for batch fetch
            const chainId = this.getChainIdFromMarket (market);
            if (chainId === undefined) {
                throw new BadSymbol (this.id + ' market has no chain id for symbol ' + symbol);
            }
            if (!(chainId in chainGroups)) {
                chainGroups[chainId] = {
                    'symbols': [],
                    'tokenAddresses': {},
                };
            }
            chainGroups[chainId]['symbols'].push (symbol);
            const baseId = this.safeString (market, 'baseId');
            if (baseId !== undefined) {
                chainGroups[chainId]['tokenAddresses'][baseId] = true;
            }
        }
        // 3) fetch fresh pair data once per chain
        const pairsByChain: Dict = {};
        const chainIds = Object.keys (chainGroups);
        for (let chainIndex = 0; chainIndex < chainIds.length; chainIndex++) {
            const chainId = chainIds[chainIndex];
            const tokenAddressList = Object.keys (chainGroups[chainId]['tokenAddresses']);
            pairsByChain[chainId] = await this.fetchPairsForTokensV1 (tokenAddressList, chainId, params);
        }
        // 4) match batched pairs to each symbol and parse tickers (search fallback on batch miss)
        for (let chainIndex = 0; chainIndex < chainIds.length; chainIndex++) {
            const chainId = chainIds[chainIndex];
            const chainSymbols = chainGroups[chainId]['symbols'];
            const allPairs = pairsByChain[chainId];
            for (let symbolIndex = 0; symbolIndex < chainSymbols.length; symbolIndex++) {
                const symbol = chainSymbols[symbolIndex];
                const market = this.safeValue (marketsBySymbol, symbol);
                const parsed = this.obParseNetworkDexSymbol (symbol);
                const dexCode = this.safeString (parsed, 'dexCode');
                const pair = await this.fetchPairForMarketTicker (market, allPairs, dexCode, params);
                const ticker = this.parseTicker (pair, market);
                ticker['symbol'] = symbol;
                result[symbol] = ticker;
            }
        }
        return result;
    }

    /**
     * @method
     * @name dexscreener#fetchTicker
     * @description fetches a price ticker for a market
     * @see https://docs.dexscreener.com/api/reference
     * @param {string} symbol unified market symbol with @network dex suffix
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        const tickers = await this.fetchTickersFromTokensV1 ([ symbol ], resolveResult['marketsBySymbol'], resolveResult['justResolvedSymbols'], params);
        return tickers[symbol];
    }

    /**
     * @method
     * @name dexscreener#fetchTickers
     * @description fetches price tickers for multiple markets
     * @see https://docs.dexscreener.com/api/reference
     * @param {string[]} symbols list of unified market symbols with @network dex suffix
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
        return await this.fetchTickersFromTokensV1 (symbols, resolveResult['marketsBySymbol'], resolveResult['justResolvedSymbols'], params);
    }

    /**
     * @method
     * @name dexscreener#obLoadMarketsForSymbols
     * @description lazily resolves and populates this.markets for the given symbols
     * @see https://docs.dexscreener.com/api/reference
     * @param {string[]} symbols list of base/quote symbols, optionally with @network dex suffix
     * @param {boolean} reload when true, re-fetch symbols even if already cached in this.markets
     * @param {object} params extra parameters specific to the exchange API endpoint
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

    parseTicker (pair: Dict, market: Market = undefined): Ticker {
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

    obParseDexPairSymbolInput (symbol: string): Dict {
        if (symbol.indexOf ('@') >= 0) {
            return this.obParseNetworkDexSymbol (symbol);
        }
        const parts = symbol.split ('/');
        if (parts.length !== 2) {
            throw new BadSymbol (this.id + ' obParseDexPairSymbolInput() requires a base/quote symbol');
        }
        const basePart = this.safeString (parts, 0);
        const quotePart = this.safeString (parts, 1);
        if ((basePart === undefined) || (basePart === '') || (quotePart === undefined) || (quotePart === '')) {
            throw new BadSymbol (this.id + ' obParseDexPairSymbolInput() requires a base/quote symbol');
        }
        return {
            'tradingSymbol': symbol,
            'networkCode': undefined,
            'dexCode': undefined,
        };
    }

    filterPairsForObDexPairQuery (rawPairs: Dict[], tradingSymbol: string, networkCode, dexCode): Dict[] {
        const filteredPairs = [];
        const parts = tradingSymbol.split ('/');
        const base = this.safeString (parts, 0);
        const quote = this.safeString (parts, 1);
        for (let pairIndex = 0; pairIndex < rawPairs.length; pairIndex++) {
            const pair = rawPairs[pairIndex];
            if (!this.pairMatchesNetworkAndDex (pair, networkCode, dexCode)) {
                continue;
            }
            if (!this.pairMatchesTickerSymbol (pair, base, quote)) {
                continue;
            }
            filteredPairs.push (pair);
        }
        return filteredPairs;
    }

    parsePairToObDexPair (pair: Dict): ObDexPair {
        const chainId = this.safeString (pair, 'chainId');
        const pairDexId = this.safeString (pair, 'dexId');
        const networkCode = this.networkIdToCode (chainId);
        const dexCode = this.obDexIdToCode (pairDexId);
        const baseToken = this.safeDict (pair, 'baseToken', {});
        const quoteToken = this.safeDict (pair, 'quoteToken', {});
        const base = this.safeCurrencyCode (this.safeString (baseToken, 'symbol'));
        const quote = this.safeCurrencyCode (this.safeString (quoteToken, 'symbol'));
        const liquidityInfo = this.safeDict (pair, 'liquidity', {});
        return {
            'symbol': base + '/' + quote,
            'network': networkCode,
            'dex': dexCode,
            'baseTokenAddress': this.safeString (baseToken, 'address'),
            'quoteTokenAddress': this.safeString (quoteToken, 'address'),
            'price': this.safeNumber (pair, 'priceNative'),
            'quoteLiquidity': this.safeNumber (liquidityInfo, 'quote'),
        };
    }

    selectBestPairByQuoteLiquidity (pairs: Dict[]): Dict {
        let bestPair = undefined;
        let bestQuoteLiquidity = 0;
        for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
            const pair = pairs[pairIndex];
            const liquidityInfo = this.safeDict (pair, 'liquidity', {});
            const quoteLiquidity = this.safeNumber (liquidityInfo, 'quote', 0);
            if ((bestPair === undefined) || (quoteLiquidity > bestQuoteLiquidity)) {
                bestPair = pair;
                bestQuoteLiquidity = quoteLiquidity;
            }
        }
        return bestPair;
    }

    buildVenueKey (networkCode: string, dexCode: string): string {
        return networkCode + ':' + dexCode;
    }

    async fetchCandidatePairsForObDexPairInput (parsedInput: Dict, params = {}, cache: Dict = {}): Promise<Dict[]> {
        const tradingSymbol = parsedInput['tradingSymbol'];
        const networkCode = parsedInput['networkCode'];
        const dexCode = parsedInput['dexCode'];
        const rawPairs: Dict[] = [];
        const parts = tradingSymbol.split ('/');
        const basePart = this.safeString (parts, 0);
        if ((networkCode !== undefined) && this.isTokenAddress (basePart)) {
            const chainId = this.networkCodeToId (networkCode);
            const baseAddress = this.normalizeTokenAddress (basePart);
            const tokensCacheKey = chainId + ':' + baseAddress;
            if (!('tokensV1' in cache)) {
                cache['tokensV1'] = {};
            }
            const tokensV1Cache: Dict = cache['tokensV1'];
            if (!(tokensCacheKey in tokensV1Cache)) {
                tokensV1Cache[tokensCacheKey] = await this.fetchPairsForTokensV1 ([ baseAddress ], chainId, params);
            }
            const tokensPairs = tokensV1Cache[tokensCacheKey];
            for (let pairIndex = 0; pairIndex < tokensPairs.length; pairIndex++) {
                rawPairs.push (tokensPairs[pairIndex]);
            }
        }
        const searchQuery = this.buildSearchQueryFromTradingSymbol (tradingSymbol);
        if (!('search' in cache)) {
            cache['search'] = {};
        }
        const searchCache: Dict = cache['search'];
        if (!(searchQuery in searchCache)) {
            const request: Dict = {
                'q': searchQuery,
            };
            const response = await this.publicGetLatestDexSearch (this.extend (request, params));
            searchCache[searchQuery] = this.parseTokenPairsResponse (response);
        }
        const searchPairs = searchCache[searchQuery];
        for (let pairIndex = 0; pairIndex < searchPairs.length; pairIndex++) {
            rawPairs.push (searchPairs[pairIndex]);
        }
        return this.filterPairsForObDexPairQuery (this.mergePairsByPairAddress (rawPairs), tradingSymbol, networkCode, dexCode);
    }

    /**
     * @method
     * @name dexscreener#obFetchDexPairs
     * @description discovers DEX pairs across venues that list every requested symbol
     * @see https://docs.dexscreener.com/api/reference
     * @param {string[]} symbols list of base/quote symbols, optionally with @network dex suffix
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {ObDexPair[]} list of DEX pair structures for venues listing all requested symbols
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
        const cache: Dict = {};
        const venues: Dict = {};
        const requiredTradingSymbols: Dict = {};
        for (let inputIndex = 0; inputIndex < parsedInputs.length; inputIndex++) {
            const parsedInput = parsedInputs[inputIndex];
            const tradingSymbol = parsedInput['tradingSymbol'];
            requiredTradingSymbols[tradingSymbol] = true;
            const candidatePairs = await this.fetchCandidatePairsForObDexPairInput (parsedInput, params, cache);
            for (let pairIndex = 0; pairIndex < candidatePairs.length; pairIndex++) {
                const pair = candidatePairs[pairIndex];
                const chainId = this.safeString (pair, 'chainId');
                const pairNetworkCode = this.networkIdToCode (chainId);
                const pairDexCode = this.obDexIdToCode (this.safeString (pair, 'dexId'));
                const venueKey = this.buildVenueKey (pairNetworkCode, pairDexCode);
                if (!(venueKey in venues)) {
                    venues[venueKey] = {};
                }
                const venueSymbols: Dict = venues[venueKey];
                if (!(tradingSymbol in venueSymbols)) {
                    venueSymbols[tradingSymbol] = pair;
                } else {
                    venueSymbols[tradingSymbol] = this.selectBestPairByQuoteLiquidity ([ venueSymbols[tradingSymbol], pair ]);
                }
            }
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
                result.push (this.parsePairToObDexPair (venueSymbols[requiredTradingSymbol]));
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
