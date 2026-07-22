//  ---------------------------------------------------------------------------

import Exchange from './abstract/trocador.js';
import { ExchangeError, BadRequest, ArgumentsRequired, AuthenticationError, OrderNotFound, InvalidOrder, BadSymbol } from './base/errors.js';
import { TICK_SIZE } from './base/functions/number.js';
import type { Market, Str, Dict, Ticker, Num, Currencies, int, Order, OrderType, OrderSide } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class trocador
 * @augments Exchange
 * @description Trocador.app - privacy-focused swap aggregator across partner exchanges.
 * API key required for all requests. Docs: https://trocador.app/en/docs/
 */
export default class trocador extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'trocador',
            'name': 'Trocador',
            'userAgent': 'Dart/3.5 ' + '(dart:io)',
            'countries': [ 'BR' ],
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
                'logo': 'https://trocador.app/favicon.ico',
                'api': {
                    'rest': 'https://api.trocador.app',
                },
                'www': 'https://trocador.app',
                'doc': [
                    'https://trocador.app/en/docs/',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'coins',
                        'coin',
                        'trade',
                        'new_rate',
                        'exchanges',
                    ],
                    'post': [
                        'new_trade',
                    ],
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
                'validateServerSsl': false,
                'cachedRateBySymbol': {},
                'statusMapping': {
                    'new': 'open',
                    'waiting': 'open',
                    'confirming': 'open',
                    'sending': 'open',
                    'finished': 'closed',
                    'failed': 'canceled',
                    'refunded': 'canceled',
                    'expired': 'expired',
                    'halted': 'canceled',
                    'paid partially': 'open',
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

    parseSymbolPart (part: string): Dict {
        const segments = part.split ('@');
        if (segments.length !== 2) {
            throw new BadSymbol (this.id + ' market symbols must use TICKER@NETWORK format, e.g. BTC@Mainnet/XMR@Mainnet');
        }
        const ticker = this.safeString (segments, 0);
        const network = this.safeString (segments, 1);
        if (ticker === undefined || network === undefined || ticker === '' || network === '') {
            throw new BadSymbol (this.id + ' market symbols must use TICKER@NETWORK format, e.g. BTC@Mainnet/XMR@Mainnet');
        }
        return {
            'ticker': ticker.toLowerCase (),
            'network': network,
            'code': this.safeCurrencyCode (ticker),
        };
    }

    parseMarketSymbol (symbol: string): Dict {
        const parts = symbol.split ('/');
        if (parts.length !== 2) {
            throw new BadSymbol (this.id + ' does not have market ' + symbol);
        }
        const basePart = this.parseSymbolPart (parts[0]);
        const quotePart = this.parseSymbolPart (parts[1]);
        const baseCode = this.safeString (basePart, 'code');
        const quoteCode = this.safeString (quotePart, 'code');
        const baseId = this.safeString (basePart, 'ticker') + '@' + this.safeString (basePart, 'network').toLowerCase ();
        const quoteId = this.safeString (quotePart, 'ticker') + '@' + this.safeString (quotePart, 'network').toLowerCase ();
        return {
            'symbol': baseCode + '/' + quoteCode,
            'unifiedSymbol': baseCode + '@' + this.safeString (basePart, 'network') + '/' + quoteCode + '@' + this.safeString (quotePart, 'network'),
            'base': baseCode,
            'quote': quoteCode,
            'baseId': baseId,
            'quoteId': quoteId,
            'tickerFrom': this.safeString (basePart, 'ticker'),
            'tickerTo': this.safeString (quotePart, 'ticker'),
            'networkFrom': this.safeString (basePart, 'network'),
            'networkTo': this.safeString (quotePart, 'network'),
        };
    }

    parseMarketFromSymbol (symbol: string): Market {
        const parsed = this.parseMarketSymbol (symbol);
        const base = this.safeString (parsed, 'base');
        const quote = this.safeString (parsed, 'quote');
        const baseId = this.safeString (parsed, 'baseId');
        const quoteId = this.safeString (parsed, 'quoteId');
        const unifiedSymbol = this.safeString (parsed, 'unifiedSymbol', symbol);
        return {
            'id': baseId + '_' + quoteId,
            'symbol': unifiedSymbol,
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
            'info': parsed,
        };
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

    mergeMarkets (newMarkets: Market[]) {
        const existingMarkets = (this.markets === undefined) ? [] : Object.values (this.markets);
        const combined = this.arrayConcat (existingMarkets, newMarkets);
        this.setMarkets (combined);
    }

    cacheRateForSymbol (symbol: string, rate: Dict) {
        const cachedRateBySymbol = this.safeDict (this.options, 'cachedRateBySymbol', {});
        cachedRateBySymbol[symbol] = rate;
        this.options['cachedRateBySymbol'] = cachedRateBySymbol;
    }

    getCachedRateForSymbol (symbol: string): Dict {
        const cachedRateBySymbol = this.safeDict (this.options, 'cachedRateBySymbol', {});
        return this.safeDict (cachedRateBySymbol, symbol, {});
    }

    async requestNewRate (symbol: string, params = {}): Promise<Dict> {
        this.checkRequiredCredentials ();
        const parsed = this.parseMarketSymbol (symbol);
        const amountFrom = this.safeString (params, 'amount_from', '0.01');
        const request: Dict = {
            'ticker_from': this.safeString (parsed, 'tickerFrom'),
            'network_from': this.safeString (parsed, 'networkFrom'),
            'ticker_to': this.safeString (parsed, 'tickerTo'),
            'network_to': this.safeString (parsed, 'networkTo'),
            'amount_from': amountFrom,
            'best_only': true,
        };
        const callParams = this.omit (params, [ 'amount_from' ]);
        const response = await this.publicGetNewRate (this.extend (request, callParams));
        if (response === undefined || typeof response !== 'object') {
            throw new BadSymbol (this.id + ' does not have market ' + symbol);
        }
        const amountTo = this.safeString (response, 'amount_to');
        if (amountTo === undefined) {
            throw new BadSymbol (this.id + ' does not have market ' + symbol);
        }
        this.cacheRateForSymbol (symbol, response);
        return response;
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
        for (let pendingIndex = 0; pendingIndex < pendingSymbols.length; pendingIndex++) {
            const symbol = pendingSymbols[pendingIndex];
            await this.requestNewRate (symbol, params);
            const market = this.parseMarketFromSymbol (symbol);
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
     * @name trocador#fetchCurrencies
     * @description fetches all available currencies on Trocador
     * @see https://trocador.app/en/docs/
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an associative dictionary of currencies
     */
    async fetchCurrencies (params = {}): Promise<Currencies> {
        this.checkRequiredCredentials ();
        const response = await this.publicGetCoins (params);
        const coins = this.toArray (response);
        const result: Dict = {};
        for (let coinIndex = 0; coinIndex < coins.length; coinIndex++) {
            const coin = coins[coinIndex];
            const ticker = this.safeString (coin, 'ticker');
            const network = this.safeString (coin, 'network');
            if (ticker === undefined || network === undefined) {
                continue;
            }
            const currencyId = ticker.toLowerCase () + '@' + network.toLowerCase ();
            const code = this.safeCurrencyCode (ticker);
            const minimum = this.safeNumber (coin, 'minimum');
            const maximum = this.safeNumber (coin, 'maximum');
            const memo = this.safeBool (coin, 'memo', false);
            result[code] = this.safeCurrencyStructure ({
                'id': currencyId,
                'code': code,
                'name': this.safeString (coin, 'name'),
                'active': true,
                'deposit': true,
                'withdraw': true,
                'fee': undefined,
                'precision': undefined,
                'limits': {
                    'amount': { 'min': minimum, 'max': maximum },
                    'withdraw': { 'min': minimum, 'max': maximum },
                },
                'info': this.extend (coin, { 'memo': memo }),
            });
        }
        return result;
    }

    /**
     * @method
     * @name trocador#fetchMarkets
     * @description fetches markets; returns empty by default (markets loaded on demand)
     * @see https://trocador.app/en/docs/
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of market structures
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        return [];
    }

    /**
     * @method
     * @name trocador#obLoadMarketsForSymbols
     * @description lazily resolves and populates this.markets for the given symbols
     * @see https://trocador.app/en/docs/
     * @param {string[]} symbols list of unified market symbols
     * @param {boolean} reload when true, re-fetch symbols even if already cached in this.markets
     * @param {object} params extra parameters specific to the exchange API endpoint
     * @returns {object[]} empty list; ob_trocador returns fixed market status structures
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

    /**
     * @method
     * @name trocador#fetchTicker
     * @description fetches a price ticker / estimate for a swap pair on Trocador
     * @see https://trocador.app/en/docs/
     * @param {string} symbol unified market symbol, e.g. 'BTC@Mainnet/XMR@Mainnet'
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.amount_from] amount to estimate, defaults to '0.01'
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        const market = resolveResult['marketsBySymbol'][symbol];
        const amountFrom = this.safeString (params, 'amount_from', '0.01');
        const callParams = this.omit (params, [ 'amount_from' ]);
        const response = await this.requestNewRate (symbol, this.extend ({ 'amount_from': amountFrom }, callParams));
        return this.parseTicker (response, market);
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        const symbol = this.safeString (market, 'symbol');
        const last = this.safeString (ticker, 'amount_to');
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
     * @name trocador#createOrder
     * @description create a swap order on Trocador (requires API key)
     * @see https://trocador.app/en/docs/
     * @param {string} symbol unified market symbol, e.g. 'BTC@Mainnet/XMR@Mainnet'
     * @param {string} type order type – 'market' for floating rate, 'limit' for fixed rate
     * @param {string} side 'buy' or 'sell' – for swaps this is always 'sell' (sell base for quote)
     * @param {float} amount amount of the base currency to send
     * @param {float} [price] not used for Trocador
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} params.address_to destination address for the quote currency (required)
     * @param {string} [params.extraId] memo/ExtraID for the destination address ('0' when unused)
     * @param {string} [params.refund_address] refund address for the base currency
     * @param {string} [params.refundExtraId] memo/ExtraID for the refund address ('0' when unused)
     * @param {string} [params.provider] aggregator provider from the quote (defaults to cached best quote)
     * @param {bool} [params.fixed] fixed-rate flag from the quote (defaults to cached best quote)
     * @param {string} [params.rateId] rate id from new_rate (defaults to cached trade_id)
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        this.checkRequiredCredentials ();
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        const market = resolveResult['marketsBySymbol'][symbol];
        const parsed = this.parseMarketSymbol (symbol);
        const addressTo = this.safeString (params, 'address_to');
        if (addressTo === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder() requires params.address_to – the destination address for the received currency');
        }
        let cachedRate = this.getCachedRateForSymbol (symbol);
        const rateId = this.safeString (params, 'rateId');
        if (rateId !== undefined || this.isEmpty (cachedRate)) {
            cachedRate = await this.requestNewRate (symbol, this.extend ({ 'amount_from': this.numberToString (amount) }, params));
        }
        let provider = this.safeString (params, 'provider');
        if (provider === undefined) {
            provider = this.safeString (cachedRate, 'provider');
        }
        if (provider === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder() requires params.provider or a prior fetchTicker/new_rate quote with provider');
        }
        let fixed = this.safeBool (params, 'fixed');
        if (fixed === undefined) {
            fixed = this.safeBool (cachedRate, 'fixed');
        }
        if (fixed === undefined) {
            fixed = (type === 'limit');
        }
        const tradeId = this.safeString2 (params, 'rateId', 'id');
        const request: Dict = {
            'ticker_from': this.safeString (parsed, 'tickerFrom'),
            'network_from': this.safeString (parsed, 'networkFrom'),
            'ticker_to': this.safeString (parsed, 'tickerTo'),
            'network_to': this.safeString (parsed, 'networkTo'),
            'amount_from': this.numberToString (amount),
            'address': addressTo,
            'provider': provider,
            'fixed': fixed,
        };
        const resolvedRateId = (tradeId !== undefined) ? tradeId : this.safeString (cachedRate, 'trade_id');
        if (resolvedRateId !== undefined) {
            request['id'] = resolvedRateId;
        }
        const extraId = this.safeString (params, 'extraId', '0');
        request['address_memo'] = extraId;
        const refundAddress = this.safeString (params, 'refund_address');
        if (refundAddress !== undefined) {
            request['refund'] = refundAddress;
            const refundExtraId = this.safeString (params, 'refundExtraId', '0');
            request['refund_memo'] = refundExtraId;
        }
        const callParams = this.omit (params, [ 'address_to', 'extraId', 'refund_address', 'refundExtraId', 'provider', 'fixed', 'rateId', 'id', 'amount_from' ]);
        const response = await this.publicPostNewTrade (this.extend (request, callParams));
        return this.parseOrder (response, market);
    }

    parseTradeResponse (response, id: string): Dict {
        if (response === undefined || response === null || response === false) {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        if (Array.isArray (response)) {
            if (response.length === 1) {
                response = response[0];
            } else {
                throw new OrderNotFound (this.id + ' order ' + id + ' not found');
            }
        }
        if (typeof response !== 'object') {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        const responseStatus = this.safeString (response, 'status');
        if (responseStatus === undefined) {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        return response;
    }

    /**
     * @method
     * @name trocador#fetchOrder
     * @description fetch the status of a Trocador swap order
     * @see https://trocador.app/en/docs/
     * @param {string} id the order / trade id
     * @param {string} [symbol] unified market symbol (optional)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        this.checkRequiredCredentials ();
        const request: Dict = {
            'id': id,
        };
        let response = undefined;
        try {
            response = await this.publicGetTrade (this.extend (request, params));
        } catch (e) {
            if (e instanceof OrderNotFound) {
                throw e;
            }
            if (e instanceof AuthenticationError) {
                throw e;
            }
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        const trade = this.parseTradeResponse (response, id);
        return this.parseOrder (trade);
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const id = this.safeString2 (order, 'trade_id', 'id');
        const tickerFrom = this.safeString (order, 'ticker_from');
        const tickerTo = this.safeString (order, 'ticker_to');
        const networkFrom = this.safeString (order, 'network_from');
        const networkTo = this.safeString (order, 'network_to');
        let parsedSymbol = undefined;
        if (tickerFrom !== undefined && tickerTo !== undefined && networkFrom !== undefined && networkTo !== undefined) {
            const baseCode = this.safeCurrencyCode (tickerFrom);
            const quoteCode = this.safeCurrencyCode (tickerTo);
            parsedSymbol = baseCode + '@' + networkFrom + '/' + quoteCode + '@' + networkTo;
        }
        let symbol = this.safeString (market, 'symbol');
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
        const amountFrom = this.safeString (order, 'amount_from');
        const amountTo = this.safeString (order, 'amount_to');
        const timestampStr = this.safeString (order, 'date');
        let timestamp = undefined;
        if (timestampStr !== undefined) {
            timestamp = this.parse8601 (timestampStr.replace (' ', 'T') + 'Z');
        }
        return this.safeOrder ({
            'id': id,
            'clientOrderId': undefined,
            'info': order,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'lastUpdateTimestamp': undefined,
            'symbol': symbol,
            'type': this.safeBool (order, 'fixed', false) ? 'limit' : 'market',
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
        const apiKey = this.resolveApiKey ();
        let url = this.urls['api']['rest'] + '/' + path;
        const query = this.omit (params, this.extractParams (path));
        if (method === 'GET') {
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else if (method === 'POST') {
            if (Object.keys (query).length) {
                body = this.json (query);
                headers = {
                    'Content-Type': 'application/json',
                };
            }
        }
        const authHeaders: Dict = {
            'API-Key': apiKey,
        };
        if (headers !== undefined) {
            authHeaders['Content-Type'] = this.safeString (headers, 'Content-Type');
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': authHeaders };
    }

    handleErrors (httpCode: int, reason: string, url: string, method: string, headers: Dict, body: string, response, requestHeaders, requestBody) {
        if (httpCode === 401 || httpCode === 403) {
            throw new AuthenticationError (this.id + ' ' + body);
        }
        if (httpCode === 404 && url.indexOf ('/trade') >= 0) {
            throw new OrderNotFound (this.id + ' order not found');
        }
        if (response === undefined) {
            return undefined;
        }
        const error = this.safeString (response, 'error');
        const message = this.safeString (response, 'message');
        if (error !== undefined) {
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
