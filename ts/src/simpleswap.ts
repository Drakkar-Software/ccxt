//  ---------------------------------------------------------------------------

import Exchange from './abstract/simpleswap.js';
import { ExchangeError, BadRequest, ArgumentsRequired, AuthenticationError, OrderNotFound, InvalidOrder, PermissionDenied, BadSymbol } from './base/errors.js';
import { TICK_SIZE } from './base/functions/number.js';
import type { Market, Str, Dict, Ticker, Num, Currencies, int, Order, OrderType, OrderSide } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class simpleswap
 * @augments Exchange
 * @description SimpleSwap - non-custodial cryptocurrency swap service.
 * API key required for all endpoints. Docs: https://api.simpleswap.io/docs/getting-started/
 */
export default class simpleswap extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'simpleswap',
            'name': 'SimpleSwap',
            'countries': [ ],
            'rateLimit': 1000,
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
                'createOrder': true,
                'fetchBalance': false,
                'fetchCurrencies': true,
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
                'fetchOrder': true,
                'fetchOrderBook': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchTicker': true,
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
                'logo': 'https://static.simpleswap.io/images/simpleswap-logo.svg',
                'api': {
                    'rest': 'https://api.simpleswap.io',
                },
                'www': 'https://simpleswap.io',
                'doc': [
                    'https://api.simpleswap.io/docs/getting-started/',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'v3/currencies',
                        'v3/currencies/{ticker}/{network}',
                        'v3/pairs',
                        'v3/pairs/{ticker}/{network}',
                        'v3/estimates',
                        'v3/ranges',
                        'v3/exchanges/check',
                        'v3/exchanges/{publicId}',
                        'v3/exchanges',
                    ],
                    'post': [
                        'v3/exchanges',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'percentage': true,
                    'maker': this.parseNumber ('0.005'),
                    'taker': this.parseNumber ('0.005'),
                },
            },
            'precisionMode': TICK_SIZE,
            'requiredCredentials': {
                'apiKey': true,
                'secret': false,
            },
            'features': {
                'spot': {
                    'sandbox': false,
                    'createOrder': {
                        'marginMode': false,
                        'triggerPrice': false,
                        'triggerPriceType': undefined,
                        'triggerDirection': false,
                        'stopLossPrice': false,
                        'takeProfitPrice': false,
                        'attachedStopLossTakeProfit': undefined,
                        'timeInForce': {
                            'IOC': false,
                            'FOK': false,
                            'PO': false,
                            'GTD': false,
                        },
                        'hedged': false,
                        'selfTradePrevention': false,
                        'trailing': false,
                        'leverage': false,
                        'marketBuyByCost': false,
                        'marketBuyRequiresPrice': false,
                        'iceberg': false,
                    },
                    'createOrders': undefined,
                    'fetchMyTrades': undefined,
                    'fetchOrder': {
                        'marginMode': false,
                        'trigger': false,
                        'trailing': false,
                        'symbolRequired': false,
                    },
                    'fetchOpenOrders': undefined,
                    'fetchOrders': undefined,
                    'fetchClosedOrders': undefined,
                    'fetchOHLCV': undefined,
                },
                'swap': {
                    'linear': undefined,
                    'inverse': undefined,
                },
                'future': {
                    'linear': undefined,
                    'inverse': undefined,
                },
            },
            'options': {
                'defaultAPIKey': '',
                'forceDefaultAPIKey': false,
                'statusMapping': {
                    'waiting': 'open',
                    'confirming': 'open',
                    'verifying': 'open',
                    'exchanging': 'open',
                    'sending': 'open',
                    'finished': 'closed',
                    'failed': 'canceled',
                    'refunded': 'canceled',
                    'expired': 'expired',
                },
            },
        });
    }

    resolveApiKey (): Str {
        if (this.safeBool (this.options, 'forceDefaultAPIKey', false)) {
            return this.safeString (this.options, 'defaultAPIKey');
        }
        if (this.apiKey) {
            return this.apiKey;
        }
        return this.safeString (this.options, 'defaultAPIKey');
    }

    checkRequiredCredentials (error = true) {
        const keys = Object.keys (this.requiredCredentials);
        for (let credentialIndex = 0; credentialIndex < keys.length; credentialIndex++) {
            const key = keys[credentialIndex];
            if (this.requiredCredentials[key]) {
                if (key === 'apiKey') {
                    if (!this.resolveApiKey ()) {
                        if (error) {
                            throw new AuthenticationError (this.id + ' requires "' + key + '" credential');
                        } else {
                            return false;
                        }
                    }
                } else if (!this[key]) {
                    if (error) {
                        throw new AuthenticationError (this.id + ' requires "' + key + '" credential');
                    } else {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    compositeToCode (compositeId: string): Str {
        const parts = compositeId.split (':');
        const ticker = this.safeString (parts, 0);
        const network = this.safeString (parts, 1);
        if (ticker === undefined || network === undefined) {
            return undefined;
        }
        return ticker.toUpperCase () + '@' + network.toUpperCase ();
    }

    codeToComposite (code: string): Str {
        const parts = code.split ('@');
        const ticker = this.safeString (parts, 0);
        const network = this.safeString (parts, 1);
        if (ticker === undefined || network === undefined) {
            return undefined;
        }
        return ticker.toLowerCase () + ':' + network.toLowerCase ();
    }

    parseAtNetworkCode (code: string): Dict {
        const parts = code.split ('@');
        const ticker = this.safeString (parts, 0);
        const network = this.safeString (parts, 1);
        if (ticker === undefined || network === undefined) {
            return {};
        }
        const tickerLower = ticker.toLowerCase ();
        const networkLower = network.toLowerCase ();
        return {
            'ticker': tickerLower,
            'network': networkLower,
            'composite': tickerLower + ':' + networkLower,
            'code': ticker.toUpperCase () + '@' + network.toUpperCase (),
        };
    }

    buildSymbolFromComposites (baseComposite: string, quoteComposite: string): Str {
        const baseCode = this.compositeToCode (baseComposite);
        const quoteCode = this.compositeToCode (quoteComposite);
        if (baseCode === undefined || quoteCode === undefined) {
            return undefined;
        }
        return baseCode + '/' + quoteCode;
    }

    parseMarketFromComposites (baseComposite: string, quoteComposite: string): Market {
        const baseCode = this.compositeToCode (baseComposite);
        const quoteCode = this.compositeToCode (quoteComposite);
        const symbol = baseCode + '/' + quoteCode;
        const pairId = baseComposite + '_' + quoteComposite;
        const baseParts = this.parseAtNetworkCode (baseCode);
        const quoteParts = this.parseAtNetworkCode (quoteCode);
        return {
            'id': pairId,
            'symbol': symbol,
            'base': baseCode,
            'quote': quoteCode,
            'settle': undefined,
            'baseId': baseComposite,
            'quoteId': quoteComposite,
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
            'taker': this.parseNumber ('0.005'),
            'maker': this.parseNumber ('0.005'),
            'percentage': true,
            'tierBased': false,
            'feeSide': 'get',
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
            'info': {
                'tickerFrom': this.safeString (baseParts, 'ticker'),
                'networkFrom': this.safeString (baseParts, 'network'),
                'tickerTo': this.safeString (quoteParts, 'ticker'),
                'networkTo': this.safeString (quoteParts, 'network'),
            },
        };
    }

    symbolToPairId (symbol: string): Str {
        const parts = symbol.split ('/');
        if (parts.length !== 2) {
            return undefined;
        }
        const baseCode = this.safeString (parts, 0);
        const quoteCode = this.safeString (parts, 1);
        const baseComposite = this.codeToComposite (baseCode);
        const quoteComposite = this.codeToComposite (quoteCode);
        if (baseComposite === undefined || quoteComposite === undefined) {
            return undefined;
        }
        return baseComposite + '_' + quoteComposite;
    }

    parseResultEnvelope (response): any {
        if (response !== undefined && typeof response === 'object') {
            const result = this.safeValue (response, 'result');
            if (result !== undefined) {
                return result;
            }
        }
        return response;
    }

    async request (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined, config = {}) {
        const response = await super.request (path, api, method, params, headers, body, config);
        return this.parseResultEnvelope (response);
    }

    async fetchAvailablePairs (params = {}, reload = false): Promise<Dict> {
        if (!reload) {
            const cachedPairsLookup = this.safeDict (this.options, 'cachedAvailablePairsLookup', {});
            if (!this.isEmpty (cachedPairsLookup)) {
                return cachedPairsLookup;
            }
        }
        const request: Dict = {
            'fixed': this.safeBool (params, 'fixed', false),
        };
        params = this.omit (params, 'fixed');
        const response = await this.publicGetV3Pairs (this.extend (request, params));
        const pairsLookup: Dict = {};
        const unifiedSymbols: Dict = {};
        if (response !== undefined && typeof response === 'object') {
            const baseComposites = Object.keys (response);
            for (let baseIndex = 0; baseIndex < baseComposites.length; baseIndex++) {
                const baseComposite = baseComposites[baseIndex];
                const quoteComposites = this.safeList (response, baseComposite, []);
                for (let quoteIndex = 0; quoteIndex < quoteComposites.length; quoteIndex++) {
                    const quoteComposite = quoteComposites[quoteIndex];
                    const pairId = baseComposite + '_' + quoteComposite;
                    pairsLookup[pairId] = true;
                    const unifiedSymbol = this.buildSymbolFromComposites (baseComposite, quoteComposite);
                    if (unifiedSymbol !== undefined) {
                        unifiedSymbols[unifiedSymbol] = true;
                    }
                }
            }
        }
        this.options['cachedAvailablePairsLookup'] = pairsLookup;
        this.options['availablePairSymbols'] = Object.keys (this.keysort (unifiedSymbols));
        return pairsLookup;
    }

    isPairAvailable (pairId: string): boolean {
        const pairsLookup = this.safeDict (this.options, 'cachedAvailablePairsLookup', {});
        return this.safeBool (pairsLookup, pairId, false);
    }

    hasAvailablePairsCache (): boolean {
        const pairsLookup = this.safeDict (this.options, 'cachedAvailablePairsLookup', {});
        return !this.isEmpty (pairsLookup);
    }

    setMarkets (markets, currencies = undefined) {
        const result = super.setMarkets (markets, currencies);
        const cachedSymbols = this.safeList (this.options, 'availablePairSymbols', []);
        if (cachedSymbols.length > 0) {
            this.symbols = cachedSymbols;
        }
        return result;
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
        return symbol in this.markets;
    }

    removeCachedMarketSymbol (symbol: string) {
        if (this.markets === undefined) {
            return;
        }
        if (symbol in this.markets) {
            delete this.markets[symbol];
        }
    }

    async resolveMarkets (symbols: string[], params = {}): Promise<Dict> {
        const marketsBySymbol: Dict = {};
        const pendingSymbols = [];
        const newMarkets: Market[] = [];
        const marketsDict = (this.markets === undefined) ? {} : this.markets;
        for (let symbolIndex = 0; symbolIndex < symbols.length; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            if (symbol in marketsDict) {
                marketsBySymbol[symbol] = this.market (symbol);
                continue;
            }
            pendingSymbols.push (symbol);
        }
        if (pendingSymbols.length > 0) {
            if (this.hasAvailablePairsCache ()) {
                await this.fetchAvailablePairs (params);
            }
        }
        for (let pendingIndex = 0; pendingIndex < pendingSymbols.length; pendingIndex++) {
            const symbol = pendingSymbols[pendingIndex];
            const pairId = this.symbolToPairId (symbol);
            if (pairId === undefined) {
                throw new BadSymbol (this.id + ' does not have market ' + symbol);
            }
            if (this.hasAvailablePairsCache () && !this.isPairAvailable (pairId)) {
                throw new BadSymbol (this.id + ' does not have market ' + symbol);
            }
            const parts = symbol.split ('/');
            const baseComposite = this.codeToComposite (this.safeString (parts, 0));
            const quoteComposite = this.codeToComposite (this.safeString (parts, 1));
            if (baseComposite === undefined || quoteComposite === undefined) {
                throw new BadSymbol (this.id + ' does not have market ' + symbol);
            }
            const market = this.parseMarketFromComposites (baseComposite, quoteComposite);
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

    /**
     * @method
     * @name simpleswap#fetchCurrencies
     * @description fetches all available currencies on SimpleSwap
     * @see https://api.simpleswap.io/docs/api-reference/currencies
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an associative dictionary of currencies
     */
    async fetchCurrencies (params = {}): Promise<Currencies> {
        this.checkRequiredCredentials ();
        const response = await this.publicGetV3Currencies (params);
        const currencies = this.toArray (response);
        const result: Dict = {};
        for (let currencyIndex = 0; currencyIndex < currencies.length; currencyIndex++) {
            const currency = currencies[currencyIndex];
            const ticker = this.safeString (currency, 'ticker');
            const network = this.safeString (currency, 'network');
            if (ticker === undefined || network === undefined) {
                continue;
            }
            const isFiat = this.safeBool (currency, 'isFiat', false);
            if (isFiat) {
                continue;
            }
            const composite = ticker + ':' + network;
            const code = this.compositeToCode (composite);
            const precisionValue = this.safeInteger (currency, 'precision');
            let precision = undefined;
            if (precisionValue !== undefined) {
                precision = this.parseNumber (this.parsePrecision (this.numberToString (precisionValue)));
            }
            result[code] = this.safeCurrencyStructure ({
                'id': composite,
                'code': code,
                'name': this.safeString (currency, 'name'),
                'active': true,
                'deposit': true,
                'withdraw': true,
                'fee': undefined,
                'precision': precision,
                'limits': {
                    'amount': { 'min': undefined, 'max': undefined },
                    'withdraw': { 'min': undefined, 'max': undefined },
                },
                'info': currency,
            });
        }
        return result;
    }

    /**
     * @method
     * @name simpleswap#fetchMarkets
     * @description fetches markets; returns empty by default (markets loaded on demand)
     * @see https://api.simpleswap.io/docs/api-reference/pairs
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of market structures
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        return [];
    }

    /**
     * @method
     * @name simpleswap#obLoadMarketsForSymbols
     * @description lazily resolves and populates this.markets for the given symbols
     * @see https://api.simpleswap.io/docs/api-reference/pairs
     * @param {string[]} symbols list of unified market symbols
     * @param {boolean} reload when true, re-fetch symbols even if already cached in this.markets
     * @param {object} params extra parameters specific to the exchange API endpoint
     * @returns {object[]} empty list; ob_simpleswap returns fixed market status structures
     */
    async obLoadMarketsForSymbols (symbols: string[], reload = false, params = {}): Promise<Dict[]> {
        if (symbols === undefined) {
            throw new ArgumentsRequired (this.id + ' obLoadMarketsForSymbols() requires a non-empty symbols argument');
        }
        const symbolsLength = symbols.length;
        if (symbolsLength === 0) {
            throw new ArgumentsRequired (this.id + ' obLoadMarketsForSymbols() requires a non-empty symbols argument');
        }
        this.checkRequiredCredentials ();
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
            await this.fetchAvailablePairs (params, reload);
            await this.resolveMarkets (symbolsToResolve, params);
        }
        return [];
    }

    /**
     * @method
     * @name simpleswap#fetchTicker
     * @description fetches a price ticker / estimate for a swap pair on SimpleSwap
     * @see https://api.simpleswap.io/docs/api-reference/estimates
     * @param {string} symbol unified market symbol, e.g. 'BTC@BTC/ETH@ETH'
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.amount] amount to estimate, defaults to '1'
     * @param {boolean} [params.fixed] if true, use fixed-rate flow estimation
     * @param {boolean} [params.reverse] if true, amount is receive amount
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        this.checkRequiredCredentials ();
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        const market = resolveResult['marketsBySymbol'][symbol];
        const marketInfo = this.safeDict (market, 'info', {});
        const tickerFrom = this.safeString (marketInfo, 'tickerFrom');
        const networkFrom = this.safeString (marketInfo, 'networkFrom');
        const tickerTo = this.safeString (marketInfo, 'tickerTo');
        const networkTo = this.safeString (marketInfo, 'networkTo');
        const amount = this.safeString (params, 'amount', '1');
        const fixed = this.safeBool (params, 'fixed', false);
        const reverse = this.safeBool (params, 'reverse', false);
        params = this.omit (params, [ 'amount', 'fixed', 'reverse' ]);
        const request: Dict = {
            'tickerFrom': tickerFrom,
            'networkFrom': networkFrom,
            'tickerTo': tickerTo,
            'networkTo': networkTo,
            'amount': amount,
            'fixed': fixed,
            'reverse': reverse,
        };
        const response = await this.publicGetV3Estimates (this.extend (request, params));
        return this.parseTicker (response, market);
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        const symbol = this.safeString (market, 'symbol');
        const last = this.safeString (ticker, 'estimatedAmount');
        return this.safeTicker ({
            'symbol': symbol,
            'timestamp': undefined,
            'datetime': undefined,
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
            'info': ticker,
        }, market);
    }

    /**
     * @method
     * @name simpleswap#createOrder
     * @description create a swap order on SimpleSwap (requires API key)
     * @see https://api.simpleswap.io/docs/api-reference/exchanges
     * @param {string} symbol unified market symbol, e.g. 'BTC@BTC/ETH@ETH'
     * @param {string} type order type – only 'market' is supported (floating rate), or 'limit' for fixed-rate
     * @param {string} side 'buy' or 'sell' – for swaps this is always 'sell' (sell base for quote)
     * @param {float} amount amount of the base currency to send
     * @param {float} [price] not used for SimpleSwap standard flow
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} params.address_to destination address for the quote currency (required)
     * @param {string} [params.extraIdTo] extra id or memo for the destination address
     * @param {string} [params.userRefundAddress] refund address for the base currency
     * @param {string} [params.userRefundExtraId] extra id or memo for the refund address
     * @param {string} [params.rateId] rate id from fixed-rate estimate (required for fixed-rate)
     * @param {boolean} [params.fixed] if true, create a fixed-rate exchange
     * @param {boolean} [params.reverse] if true, amount is receive amount
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        this.checkRequiredCredentials ();
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        const market = resolveResult['marketsBySymbol'][symbol];
        const marketInfo = this.safeDict (market, 'info', {});
        const addressTo = this.safeString (params, 'address_to');
        if (addressTo === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder() requires params.address_to – the destination address for the received currency');
        }
        const request: Dict = {
            'tickerFrom': this.safeString (marketInfo, 'tickerFrom'),
            'networkFrom': this.safeString (marketInfo, 'networkFrom'),
            'tickerTo': this.safeString (marketInfo, 'tickerTo'),
            'networkTo': this.safeString (marketInfo, 'networkTo'),
            'amount': this.numberToString (amount),
            'addressTo': addressTo,
        };
        const extraIdTo = this.safeString (params, 'extraIdTo');
        if (extraIdTo !== undefined) {
            request['extraIdTo'] = extraIdTo;
        }
        const userRefundAddress = this.safeString (params, 'userRefundAddress');
        if (userRefundAddress !== undefined) {
            request['userRefundAddress'] = userRefundAddress;
        }
        const userRefundExtraId = this.safeString (params, 'userRefundExtraId');
        if (userRefundExtraId !== undefined) {
            request['userRefundExtraId'] = userRefundExtraId;
        }
        const rateId = this.safeString (params, 'rateId');
        if (rateId !== undefined) {
            request['rateId'] = rateId;
        }
        const fixed = this.safeBool (params, 'fixed');
        if (fixed !== undefined) {
            request['fixed'] = fixed;
        }
        const reverse = this.safeBool (params, 'reverse');
        if (reverse !== undefined) {
            request['reverse'] = reverse;
        }
        params = this.omit (params, [ 'address_to', 'extraIdTo', 'userRefundAddress', 'userRefundExtraId', 'rateId', 'fixed', 'reverse' ]);
        const response = await this.publicPostV3Exchanges (this.extend (request, params));
        return this.parseOrder (response, market);
    }

    /**
     * @method
     * @name simpleswap#fetchOrder
     * @description fetch the status of a SimpleSwap exchange/swap order
     * @see https://api.simpleswap.io/docs/api-reference/exchanges
     * @param {string} id the order / exchange public id
     * @param {string} [symbol] unified market symbol (optional)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        this.checkRequiredCredentials ();
        const request: Dict = {
            'publicId': id,
        };
        const response = await this.publicGetV3ExchangesPublicId (this.extend (request, params));
        return this.parseOrder (response);
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const id = this.safeString2 (order, 'publicId', 'id');
        const tickerFrom = this.safeString (order, 'tickerFrom');
        const networkFrom = this.safeString (order, 'networkFrom');
        const tickerTo = this.safeString (order, 'tickerTo');
        const networkTo = this.safeString (order, 'networkTo');
        let parsedSymbol = undefined;
        if (tickerFrom !== undefined && networkFrom !== undefined && tickerTo !== undefined && networkTo !== undefined) {
            const baseComposite = tickerFrom + ':' + networkFrom;
            const quoteComposite = tickerTo + ':' + networkTo;
            parsedSymbol = this.buildSymbolFromComposites (baseComposite, quoteComposite);
        }
        let symbol = this.safeSymbol (undefined, market);
        if (symbol === undefined) {
            symbol = parsedSymbol;
        }
        const rawStatus = this.safeString (order, 'status');
        let status = undefined;
        if (rawStatus !== undefined) {
            status = this.parseOrderStatus (rawStatus);
        } else {
            status = 'open';
        }
        const amountFrom = this.safeString (order, 'amountFrom');
        const amountTo = this.safeString (order, 'amountTo');
        const createdAt = this.safeString (order, 'createdAt');
        const updatedAt = this.safeString (order, 'updatedAt');
        const timestamp = this.parse8601 (createdAt);
        const lastUpdateTimestamp = this.parse8601 (updatedAt);
        return this.safeOrder ({
            'id': id,
            'clientOrderId': undefined,
            'info': order,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'lastUpdateTimestamp': lastUpdateTimestamp,
            'symbol': symbol,
            'type': 'market',
            'timeInForce': undefined,
            'postOnly': undefined,
            'side': 'sell',
            'price': amountTo,
            'stopPrice': undefined,
            'triggerPrice': undefined,
            'amount': amountFrom,
            'cost': undefined,
            'average': undefined,
            'filled': undefined,
            'remaining': undefined,
            'status': status,
            'fee': {
                'currency': undefined,
                'cost': undefined,
                'rate': undefined,
            },
            'trades': undefined,
        }, market);
    }

    parseOrderStatus (status: Str): Str {
        const statuses: Dict = this.safeDict (this.options, 'statusMapping', {});
        return this.safeString (statuses, status, status);
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        this.checkRequiredCredentials (false);
        let url = this.urls['api']['rest'] + '/' + this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));
        const apiKey = this.resolveApiKey ();
        headers = (headers === undefined) ? {} : headers;
        headers['x-api-key'] = apiKey;
        if (method === 'GET') {
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else if (method === 'POST') {
            if (Object.keys (query).length) {
                body = this.json (query);
                headers['Content-Type'] = 'application/json';
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (httpCode: int, reason: string, url: string, method: string, headers: Dict, body: string, response, requestHeaders, requestBody) {
        if (httpCode === 404 && url.indexOf ('/v3/exchanges/') >= 0) {
            throw new OrderNotFound (this.id + ' order not found');
        }
        if (response === undefined) {
            return undefined;
        }
        const code = this.safeInteger (response, 'code');
        const error = this.safeString (response, 'error');
        const message = this.safeString (response, 'message');
        if (error !== undefined || (code !== undefined && code >= 400)) {
            if (httpCode === 401 || code === 401 || error === 'Unauthorized') {
                throw new AuthenticationError (this.id + ' ' + body);
            }
            if (httpCode === 404 || code === 404 || error === 'Not Found') {
                if (url.indexOf ('/v3/exchanges/') >= 0) {
                    throw new OrderNotFound (this.id + ' ' + body);
                }
                throw new BadSymbol (this.id + ' ' + body);
            }
            if (httpCode === 422 || code === 422) {
                throw new InvalidOrder (this.id + ' ' + body);
            }
            if (httpCode === 400 || code === 400) {
                throw new BadRequest (this.id + ' ' + body);
            }
            throw new ExchangeError (this.id + ' ' + body);
        }
        if (message !== undefined && httpCode >= 400) {
            if (httpCode === 401 || httpCode === 403) {
                throw new AuthenticationError (this.id + ' ' + body);
            }
            throw new BadRequest (this.id + ' ' + body);
        }
        return undefined;
    }
}
