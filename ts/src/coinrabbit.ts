//  ---------------------------------------------------------------------------

import { sha256 } from '@noble/hashes/sha2.js';
import Exchange from './abstract/coinrabbit.js';
import { ExchangeError, BadRequest, ArgumentsRequired, AuthenticationError, OrderNotFound, InvalidOrder, InsufficientFunds } from './base/errors.js';
import { DECIMAL_PLACES } from './base/functions/number.js';
import type { Balances, Dict, Int, Market, Num, NullableDict, Order, OrderSide, OrderType, Str, Ticker, int } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class coinrabbit
 * @augments Exchange
 * @description CoinRabbit trading API (OctoBot integration).
 */
export default class coinrabbit extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'coinrabbit',
            'name': 'CoinRabbit',
            'countries': [ ],
            'rateLimit': 1000,
            'version': 'v2',
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
                'createOrder': true,
                'fetchBalance': true,
                'fetchClosedOrders': true,
                'fetchMarkets': true,
                'fetchMyTrades': false,
                'fetchOHLCV': false,
                'fetchOpenOrders': true,
                'fetchOrder': true,
                'fetchOrderBook': false,
                'fetchOrders': true,
                'fetchTicker': true,
                'fetchTrades': false,
                'transfer': false,
            },
            'timeframes': {
                '1d': '1d',
            },
            'urls': {
                'logo': 'https://coinrabbit.io/favicon.ico',
                'api': {
                    'rest': 'https://exchange.coinrabbit.io',
                },
                'www': 'https://coinrabbit.io',
                'doc': [
                    'https://coinrabbit.io',
                ],
            },
            'api': {
                'public': {
                    'get': {
                        'market/markets': 1,
                        'market/ticker': 1,
                    },
                },
                'private': {
                    'get': {
                        'account/balance': 1,
                        'trading/orders': 1,
                        'trading/order/{id}': 1,
                        'trading/order/estimate': 1,
                    },
                    'post': {
                        'trading/order': 1,
                    },
                },
            },
            'precisionMode': DECIMAL_PLACES,
            'requiredCredentials': {
                'apiKey': true,
                'secret': true,
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
                        'marketBuyByCost': true,
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
                    'fetchOpenOrders': {
                        'marginMode': false,
                        'limit': 50,
                        'trigger': false,
                        'trailing': false,
                        'symbolRequired': false,
                    },
                    'fetchOrders': {
                        'marginMode': false,
                        'limit': 50,
                        'daysBack': undefined,
                        'untilDays': undefined,
                        'trigger': false,
                        'trailing': false,
                        'symbolRequired': false,
                    },
                    'fetchClosedOrders': {
                        'marginMode': false,
                        'limit': 50,
                        'daysBack': undefined,
                        'untilDays': undefined,
                        'trigger': false,
                        'trailing': false,
                        'symbolRequired': false,
                    },
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
                'orderSource': 'octobot',
                'statusMapping': {
                    'OPEN': 'open',
                    'CLOSED': 'closed',
                    'CANCELED': 'canceled',
                    'REJECTED': 'rejected',
                    'FAILED': 'failed',
                    'open': 'open',
                    'closed': 'closed',
                    'canceled': 'canceled',
                    'rejected': 'rejected',
                    'failed': 'failed',
                },
            },
        });
    }

    coinrabbitMarketId (baseNetwork: Str, quoteNetwork: Str, symbol: Str): Str {
        return baseNetwork + ':' + quoteNetwork + ':' + symbol;
    }

    coinrabbitUnwrapResponse (response: Dict): any {
        const success = this.safeBool (response, 'result', false);
        if (!success) {
            throw new ExchangeError (this.id + ' ' + this.json (response));
        }
        return this.safeValue (response, 'response');
    }

    coinrabbitResolveMarket (symbol: string, params = {}): Market {
        const tickerWise = this.coinrabbitParseTickerWiseSymbol (symbol);
        if (tickerWise !== undefined) {
            return this.market (symbol);
        }
        const baseNetwork = this.safeString2 (params, 'base_network', 'baseNetwork');
        const quoteNetwork = this.safeString2 (params, 'quote_network', 'quoteNetwork');
        if (baseNetwork !== undefined && quoteNetwork !== undefined) {
            const qualifiedSymbol = this.coinrabbitNetworkQualifiedSymbol (symbol, baseNetwork, quoteNetwork);
            return this.market (qualifiedSymbol);
        }
        return this.market (symbol);
    }

    coinrabbitParseTickerWiseSymbol (symbol: string) {
        const marketSeparatorIndex = symbol.indexOf ('/');
        if (marketSeparatorIndex < 0) {
            return undefined;
        }
        const baseLeg = symbol.slice (0, marketSeparatorIndex);
        const quoteLeg = symbol.slice (marketSeparatorIndex + 1);
        const baseSeparatorIndex = baseLeg.indexOf ('@');
        const quoteSeparatorIndex = quoteLeg.indexOf ('@');
        if (baseSeparatorIndex < 0 || quoteSeparatorIndex < 0) {
            return undefined;
        }
        const base = baseLeg.slice (0, baseSeparatorIndex);
        const baseNetwork = baseLeg.slice (baseSeparatorIndex + 1);
        const quote = quoteLeg.slice (0, quoteSeparatorIndex);
        const quoteNetwork = quoteLeg.slice (quoteSeparatorIndex + 1);
        if (!base || !baseNetwork || !quote || !quoteNetwork) {
            return undefined;
        }
        return {
            'base': base,
            'quote': quote,
            'baseNetwork': baseNetwork.toLowerCase (),
            'quoteNetwork': quoteNetwork.toLowerCase (),
        };
    }

    coinrabbitNetworkQualifiedSymbol (symbol: Str, baseNetwork: Str, quoteNetwork: Str): Str {
        const symbolParts = symbol.split ('/');
        const base = symbolParts[0];
        const quote = symbolParts[1];
        return base + '@' + baseNetwork.toUpperCase () + '/' + quote + '@' + quoteNetwork.toUpperCase ();
    }

    coinrabbitNetworkQualifiedCurrencyCode (currencyId: Str, networkId: Str): Str {
        return this.safeCurrencyCode (currencyId) + '@' + networkId.toUpperCase ();
    }

    coinrabbitIsFlatCurrencyBalance (currencyBalance: Dict): boolean {
        return (
            this.safeString (currencyBalance, 'free') !== undefined
            || this.safeString (currencyBalance, 'used') !== undefined
            || this.safeString (currencyBalance, 'total') !== undefined
        );
    }

    coinrabbitExpandNetworkBalances (balanceDict: Dict): Dict {
        const result: Dict = {};
        const currencyIds = Object.keys (balanceDict);
        for (let currencyIndex = 0; currencyIndex < currencyIds.length; currencyIndex++) {
            const currencyId = currencyIds[currencyIndex];
            const currencyBalance = this.safeDict (balanceDict, currencyId, {});
            if (this.coinrabbitIsFlatCurrencyBalance (currencyBalance)) {
                result[currencyId] = currencyBalance;
                continue;
            }
            const networkIds = Object.keys (currencyBalance);
            for (let networkIndex = 0; networkIndex < networkIds.length; networkIndex++) {
                const networkId = networkIds[networkIndex];
                const networkBalance = this.safeDict (currencyBalance, networkId, {});
                const code = this.coinrabbitNetworkQualifiedCurrencyCode (currencyId, networkId);
                result[code] = networkBalance;
            }
        }
        return result;
    }

    coinrabbitFlattenBalanceArray (balanceArray: any[]): Dict {
        const result: Dict = {};
        for (let entryIndex = 0; entryIndex < balanceArray.length; entryIndex++) {
            const entry = balanceArray[entryIndex];
            const currencyIds = Object.keys (entry);
            for (let currencyIndex = 0; currencyIndex < currencyIds.length; currencyIndex++) {
                const currencyId = currencyIds[currencyIndex];
                result[currencyId] = this.safeDict (entry, currencyId, {});
            }
        }
        return result;
    }

    /**
     * @method
     * @name coinrabbit#fetchMarkets
     * @description retrieves all available trading pairs
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of objects representing market data
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        const response = await this.publicGetMarketMarkets (params);
        const rawMarkets = this.coinrabbitUnwrapResponse (response);
        const parsedMarkets: Market[] = [];
        const symbolCounts: Dict = {};
        for (let marketIndex = 0; marketIndex < rawMarkets.length; marketIndex++) {
            const parsedMarket = this.parseMarket (rawMarkets[marketIndex]);
            const unifiedSymbol = this.safeString (parsedMarket, 'symbol');
            symbolCounts[unifiedSymbol] = this.safeInteger (symbolCounts, unifiedSymbol, 0) + 1;
            parsedMarkets.push (parsedMarket);
        }
        for (let marketIndex = 0; marketIndex < parsedMarkets.length; marketIndex++) {
            const parsedMarket = parsedMarkets[marketIndex];
            const unifiedSymbol = this.safeString (parsedMarket, 'symbol');
            if (this.safeInteger (symbolCounts, unifiedSymbol, 0) > 1) {
                const marketInfo = this.safeDict (parsedMarket, 'info', {});
                const baseNetwork = this.safeString (marketInfo, 'base_network');
                const quoteNetwork = this.safeString (marketInfo, 'quote_network');
                parsedMarket['symbol'] = this.coinrabbitNetworkQualifiedSymbol (unifiedSymbol, baseNetwork, quoteNetwork);
            }
        }
        return parsedMarkets;
    }

    parseMarket (market: Dict): Market {
        const apiSymbol = this.safeString (market, 'symbol');
        const baseId = this.safeString (market, 'base');
        const quoteId = this.safeString (market, 'quote');
        const base = this.safeCurrencyCode (baseId);
        const quote = this.safeCurrencyCode (quoteId);
        const baseNetwork = this.safeString (market, 'base_network');
        const quoteNetwork = this.safeString (market, 'quote_network');
        const active = this.safeBool (market, 'active', true);
        const minAmount = this.safeNumber (market, 'min_amount');
        const precisionInfo = this.safeDict (market, 'precision', {});
        const amountPrecision = this.safeNumber (precisionInfo, 'amount');
        const pricePrecision = this.safeNumber (precisionInfo, 'price');
        const marketId = this.coinrabbitMarketId (baseNetwork, quoteNetwork, apiSymbol);
        return {
            'id': marketId,
            'symbol': apiSymbol,
            'base': base,
            'quote': quote,
            'baseId': baseId,
            'quoteId': quoteId,
            'settle': undefined,
            'settleId': undefined,
            'type': 'spot',
            'spot': true,
            'margin': false,
            'swap': false,
            'future': false,
            'option': false,
            'active': active,
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
                'amount': amountPrecision,
                'price': pricePrecision,
            },
            'limits': {
                'leverage': { 'min': undefined, 'max': undefined },
                'amount': { 'min': minAmount, 'max': undefined },
                'price': { 'min': undefined, 'max': undefined },
                'cost': { 'min': undefined, 'max': undefined },
            },
            'created': undefined,
            'info': market,
        };
    }

    /**
     * @method
     * @name coinrabbit#fetchTicker
     * @description fetches a price ticker for a trading pair
     * @param {string} symbol unified market symbol
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.base_network] base currency network when symbol is ambiguous
     * @param {string} [params.quote_network] quote currency network when symbol is ambiguous
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const market = this.coinrabbitResolveMarket (symbol, params);
        const marketInfo = this.safeDict (market, 'info', {});
        const request: Dict = {
            'symbol': this.safeString (marketInfo, 'symbol', market['symbol']),
            'base_network': this.safeString2 (params, 'base_network', 'baseNetwork', this.safeString (marketInfo, 'base_network')),
            'quote_network': this.safeString2 (params, 'quote_network', 'quoteNetwork', this.safeString (marketInfo, 'quote_network')),
        };
        params = this.omit (params, [ 'base_network', 'baseNetwork', 'quote_network', 'quoteNetwork' ]);
        const response = await this.publicGetMarketTicker (this.extend (request, params));
        const tickerPayload = this.coinrabbitUnwrapResponse (response);
        return this.parseTicker (tickerPayload, market);
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        const last = this.safeString (ticker, 'last');
        const timestamp = this.parse8601 (this.safeString (ticker, 'timestamp'));
        const symbol = this.safeSymbol (undefined, market);
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
            'info': ticker,
        }, market);
    }

    /**
     * @method
     * @name coinrabbit#fetchBalance
     * @description query for balance and get the amount of funds available for trading or funds locked in orders
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [balance structure]{@link https://docs.ccxt.com/?id=balance-structure}
     */
    async fetchBalance (params = {}): Promise<Balances> {
        const response = await this.privateGetAccountBalance (params);
        const balancePayload = this.coinrabbitUnwrapResponse (response);
        let balanceDict: Dict;
        if (Array.isArray (balancePayload)) {
            balanceDict = this.coinrabbitFlattenBalanceArray (balancePayload);
        } else {
            balanceDict = balancePayload;
        }
        const expandedBalanceDict = this.coinrabbitExpandNetworkBalances (balanceDict);
        return this.parseBalance (expandedBalanceDict, balanceDict);
    }

    parseBalance (response: Dict, rawResponse: Dict = undefined): Balances {
        const result: Dict = {
            'info': (rawResponse !== undefined) ? rawResponse : response,
            'timestamp': undefined,
            'datetime': undefined,
        };
        const currencyIds = Object.keys (response);
        for (let currencyIndex = 0; currencyIndex < currencyIds.length; currencyIndex++) {
            const currencyId = currencyIds[currencyIndex];
            const currencyBalance = this.safeDict (response, currencyId, {});
            const account = this.account ();
            account['free'] = this.safeString (currencyBalance, 'free');
            account['used'] = this.safeString (currencyBalance, 'used');
            account['total'] = this.safeString (currencyBalance, 'total');
            let code: Str = undefined;
            if (currencyId.indexOf ('@') >= 0) {
                code = currencyId;
            } else {
                code = this.safeCurrencyCode (currencyId);
            }
            result[code] = account;
        }
        return this.safeBalance (result);
    }

    /**
     * @method
     * @name coinrabbit#createOrder
     * @description create a trade order
     * @param {string} symbol unified market symbol
     * @param {string} type 'market' or 'limit'
     * @param {string} side 'buy' or 'sell'
     * @param {float} amount amount of base currency to trade for sell orders
     * @param {float} [price] price for limit orders
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {float} [params.quote_amount] quote amount for buy orders
     * @param {string} [params.clientOrderId] client order id for idempotency
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        const market = this.coinrabbitResolveMarket (symbol, params);
        const marketInfo = this.safeDict (market, 'info', {});
        const orderSource = this.safeString (this.options, 'orderSource', 'octobot');
        const request: Dict = {
            'symbol': this.safeString (marketInfo, 'symbol', market['symbol']),
            'base_network': this.safeString2 (params, 'base_network', 'baseNetwork', this.safeString (marketInfo, 'base_network')),
            'quote_network': this.safeString2 (params, 'quote_network', 'quoteNetwork', this.safeString (marketInfo, 'quote_network')),
            'side': side,
            'type': type,
            'source': this.safeString2 (params, 'source', 'orderSource', orderSource),
        };
        if (side === 'buy') {
            const quoteAmount = this.safeString2 (params, 'quote_amount', 'quoteAmount');
            const cost = this.safeString (params, 'cost');
            let quoteValue = quoteAmount;
            if (quoteValue === undefined) {
                quoteValue = cost;
            }
            if (quoteValue === undefined) {
                quoteValue = this.costToPrecision (symbol, amount);
            }
            if (quoteValue === undefined) {
                throw new ArgumentsRequired (this.id + ' createOrder() requires a quote amount for buy orders');
            }
            request['quote_amount'] = quoteValue;
        } else {
            request['amount'] = this.amountToPrecision (symbol, amount);
        }
        if (type === 'limit') {
            if (price === undefined) {
                throw new ArgumentsRequired (this.id + ' createOrder() requires a price argument for limit orders');
            }
            request['price'] = this.priceToPrecision (symbol, price);
        }
        const clientOrderId = this.safeString2 (params, 'clientOrderId', 'client_order_id');
        if (clientOrderId !== undefined) {
            request['client_order_id'] = clientOrderId;
        }
        params = this.omit (params, [ 'base_network', 'baseNetwork', 'quote_network', 'quoteNetwork', 'source', 'orderSource', 'quote_amount', 'quoteAmount', 'cost', 'clientOrderId', 'client_order_id' ]);
        const response = await this.privatePostTradingOrder (this.extend (request, params));
        const orderPayload = this.coinrabbitUnwrapResponse (response);
        return this.parseOrder (orderPayload, market);
    }

    /**
     * @method
     * @name coinrabbit#fetchOrder
     * @description fetches information on an order
     * @param {string} id order id
     * @param {string} symbol unified market symbol
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        const request: Dict = {
            'id': id,
        };
        const response = await this.privateGetTradingOrderId (this.extend (request, params));
        const orderPayload = this.coinrabbitUnwrapResponse (response);
        let market = undefined;
        if (symbol !== undefined) {
            await this.loadMarkets ();
            market = this.coinrabbitResolveMarket (symbol, params);
        }
        return this.parseOrder (orderPayload, market);
    }

    /**
     * @method
     * @name coinrabbit#fetchOrders
     * @description fetches information on multiple orders
     * @param {string} symbol unified market symbol
     * @param {int} [since] timestamp in ms of the earliest order
     * @param {int} [limit] max number of orders to return, default is undefined
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.status] order status filter (open, closed, canceled, rejected)
     * @returns {Order[]} a list of [order structures]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        const request: Dict = {};
        let market = undefined;
        if (symbol !== undefined) {
            await this.loadMarkets ();
            market = this.coinrabbitResolveMarket (symbol, params);
            const marketInfo = this.safeDict (market, 'info', {});
            request['symbol'] = this.safeString (marketInfo, 'symbol', market['symbol']);
        }
        if (since !== undefined) {
            request['since'] = this.iso8601 (since);
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        params = this.omit (params, [ 'base_network', 'baseNetwork', 'quote_network', 'quoteNetwork' ]);
        const response = await this.privateGetTradingOrders (this.extend (request, params));
        const ordersPayload = this.coinrabbitUnwrapResponse (response);
        return this.parseOrders (ordersPayload, market, since, limit);
    }

    /**
     * @method
     * @name coinrabbit#fetchOpenOrders
     * @description fetch all unfilled currently open orders
     * @param {string} symbol unified market symbol
     * @param {int} [since] timestamp in ms of the earliest order
     * @param {int} [limit] max number of orders to return, default is undefined
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Order[]} a list of [order structures]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchOpenOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        params = this.extend ({ 'status': 'open' }, params);
        return await this.fetchOrders (symbol, since, limit, params);
    }

    /**
     * @method
     * @name coinrabbit#fetchClosedOrders
     * @description fetches information on multiple closed orders
     * @param {string} symbol unified market symbol
     * @param {int} [since] timestamp in ms of the earliest order
     * @param {int} [limit] max number of orders to return, default is undefined
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Order[]} a list of [order structures]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchClosedOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        params = this.extend ({ 'status': 'closed' }, params);
        return await this.fetchOrders (symbol, since, limit, params);
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const id = this.safeString (order, 'id');
        const apiSymbol = this.safeString (order, 'symbol');
        let symbol = this.safeSymbol (apiSymbol, market);
        if (symbol === undefined && apiSymbol !== undefined) {
            symbol = apiSymbol;
        }
        const timestamp = this.parse8601 (this.safeString (order, 'created_at'));
        const status = this.parseOrderStatus (this.safeStringUpper (order, 'status'));
        const side = this.safeStringLower (order, 'side');
        const type = this.safeStringLower (order, 'type');
        const price = this.safeString (order, 'price');
        const amount = this.safeString (order, 'amount');
        const cost = this.safeString (order, 'quote_amount');
        const clientOrderId = this.safeString (order, 'client_order_id');
        return this.safeOrder ({
            'info': order,
            'id': id,
            'clientOrderId': clientOrderId,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'lastUpdateTimestamp': undefined,
            'status': status,
            'symbol': symbol,
            'type': type,
            'timeInForce': undefined,
            'postOnly': undefined,
            'side': side,
            'price': price,
            'stopPrice': undefined,
            'triggerPrice': undefined,
            'amount': amount,
            'cost': cost,
            'average': undefined,
            'filled': undefined,
            'remaining': undefined,
            'fee': undefined,
            'trades': undefined,
        }, market);
    }

    parseOrderStatus (status: Str): Str {
        const statuses: Dict = this.safeDict (this.options, 'statusMapping', {});
        return this.safeString (statuses, status, status);
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers: NullableDict = undefined, body: Str = undefined) {
        const query = this.omit (params, this.extractParams (path));
        let signedPath = '/' + this.version + '/' + this.implodeParams (path, params);
        if ((method === 'GET') || (method === 'DELETE')) {
            if (Object.keys (query).length) {
                signedPath += '?' + this.urlencode (query);
            }
        }
        const url = this.urls['api']['rest'] + signedPath;
        if (api === 'private') {
            this.checkRequiredCredentials ();
            headers = (headers !== undefined) ? headers : {};
            const timestamp = this.milliseconds ().toString ();
            let rawBody = '';
            if (method === 'POST') {
                headers = {
                    'Content-Type': 'application/json',
                };
                if (Object.keys (query).length) {
                    rawBody = this.json (query);
                    body = rawBody;
                }
            }
            const payload = method + '\n' + signedPath + '\n' + rawBody + '\n' + timestamp;
            const signature = this.hmac (this.encode (payload), this.encode (this.secret), sha256, 'hex');
            headers = this.extend ({
                'X-API-KEY': this.apiKey,
                'X-TIMESTAMP': timestamp,
                'X-SIGNATURE': signature,
            }, headers);
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (httpCode: int, reason: string, url: string, method: string, headers: Dict, body: string, response, requestHeaders, requestBody) {
        if (response === undefined) {
            return undefined;
        }
        const errorMessage = this.safeString (response, 'error');
        if (errorMessage !== undefined) {
            const feedback = this.id + ' ' + body;
            if (httpCode === 401 || httpCode === 403) {
                throw new AuthenticationError (feedback);
            }
            if (httpCode === 404) {
                throw new OrderNotFound (feedback);
            }
            if (httpCode === 400) {
                if (body.indexOf ('INSUFFICIENT_BALANCE') >= 0) {
                    throw new InsufficientFunds (feedback);
                }
                throw new BadRequest (feedback);
            }
            if (httpCode === 409) {
                throw new InvalidOrder (feedback);
            }
            throw new ExchangeError (feedback);
        }
        const envelopeResult = this.safeBool (response, 'result', undefined);
        if (envelopeResult !== undefined && !envelopeResult) {
            throw new ExchangeError (this.id + ' ' + body);
        }
        if (httpCode === 401 || httpCode === 403) {
            throw new AuthenticationError (this.id + ' ' + body);
        }
        if (httpCode === 404 && url.indexOf ('/trading/order/') >= 0) {
            throw new OrderNotFound (this.id + ' order not found');
        }
        return undefined;
    }
}
