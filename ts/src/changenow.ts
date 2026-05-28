//  ---------------------------------------------------------------------------

import Exchange from './abstract/changenow.js';
import { ExchangeError, BadRequest, ArgumentsRequired, AuthenticationError, OrderNotFound, InvalidOrder, PermissionDenied } from './base/errors.js';
import { TICK_SIZE } from './base/functions/number.js';
import { Precise } from './base/Precise.js';
import type { Market, Str, Dict, Ticker, Num, Currencies, int, Int, Order, OrderType, OrderSide, Trade } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class changenow
 * @augments Exchange
 * @description ChangeNOW - instant non-custodial cryptocurrency exchange service.
 * Supports 900+ cryptocurrencies with both standard (floating) and fixed-rate flows.
 * API key required for creating transactions.
 * Docs: https://changenow.io/api/docs
 */
export default class changenow extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'changenow',
            'name': 'ChangeNOW',
            'countries': [ 'VG' ],
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
                'fetchMyTrades': true,
                'fetchOpenInterestHistory': false,
                'fetchOrder': true,
                'fetchOrderBook': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchTicker': true,
                'fetchTrades': false,
                'fetchTradingFee': false,
                'fetchTradingFees': false,
                'transfer': false,
            },
            'timeframes': {
                '1d': '1d',
            },
            'urls': {
                'logo': 'https://changenow.io/images/changenow-logo.svg',
                'api': {
                    'rest': 'https://api.changenow.io/v1',
                },
                'www': 'https://changenow.io',
                'doc': [
                    'https://changenow.io/api/docs',
                    'https://documenter.getpostman.com/view/8180765/SVfTPnM8',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'currencies',
                        'currencies-to/{ticker}',
                        'min-amount/{from}_{to}',
                        'exchange-amount/{amount}/{from}_{to}',
                        'exchange-amount/fixed-rate/{amount}/{from}_{to}',
                        'market-info/available-pairs',
                    ],
                },
                'private': {
                    'get': [
                        'transactions/{apiKey}',
                        'transactions/{id}/{apiKey}',
                        'market-info/fixed-rate/{apiKey}',
                    ],
                    'post': [
                        'transactions/{apiKey}',
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
                    'fetchMyTrades': {
                        'marginMode': false,
                        'limit': undefined,
                        'daysBack': undefined,
                        'untilDays': undefined,
                        'symbolRequired': false,
                    },
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
                    'new': 'open',
                    'waiting': 'open',
                    'confirming': 'open',
                    'exchanging': 'open',
                    'sending': 'open',
                    'verifying': 'open',
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

    /**
     * @method
     * @name changenow#fetchCurrencies
     * @description fetches all available currencies on ChangeNOW
     * @see https://changenow.io/api/docs
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {boolean} [params.active] if true, return only active currencies
     * @param {boolean} [params.fixedRate] if true, return only currencies available on fixed-rate flow
     * @returns {object} an associative dictionary of currencies
     */
    async fetchCurrencies (params = {}): Promise<Currencies> {
        const request: Dict = {};
        const active = this.safeBool (params, 'active');
        if (active !== undefined) {
            request['active'] = active;
        }
        const fixedRate = this.safeBool (params, 'fixedRate');
        if (fixedRate !== undefined) {
            request['fixedRate'] = fixedRate;
        }
        params = this.omit (params, [ 'active', 'fixedRate' ]);
        const response = await this.publicGetCurrencies (this.extend (request, params));
        //
        //  [
        //      {
        //          "ticker": "btc",
        //          "name": "Bitcoin",
        //          "image": "https://changenow.io/images/coins/btc.svg",
        //          "hasExternalId": false,
        //          "isFiat": false,
        //          "featured": true,
        //          "isStable": false,
        //          "supportsFixedRate": true
        //      },
        //      ...
        //  ]
        //
        const result: Dict = {};
        for (let i = 0; i < response.length; i++) {
            const currency = response[i];
            const id = this.safeString (currency, 'ticker');
            const code = this.safeCurrencyCode (id);
            const name = this.safeString (currency, 'name');
            // v1 /currencies has no 'active' field; all returned currencies are active
            const isFiat = this.safeBool (currency, 'isFiat', false);
            if (!isFiat) {
                result[code] = this.safeCurrencyStructure ({
                    'id': id,
                    'code': code,
                    'name': name,
                    'active': true,
                    'deposit': true,
                    'withdraw': true,
                    'fee': undefined,
                    'precision': undefined,
                    'limits': {
                        'amount': { 'min': undefined, 'max': undefined },
                        'withdraw': { 'min': undefined, 'max': undefined },
                    },
                    'info': currency,
                });
            }
        }
        return result;
    }

    /**
     * @method
     * @name changenow#fetchMarkets
     * @description fetches all available swap pairs on ChangeNOW and returns them as CCXT market structures
     * @see https://changenow.io/api/docs
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of market structures
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        const response = await this.publicGetMarketInfoAvailablePairs (params);
        //
        //  [
        //      "btc_eth",
        //      "btc_ltc",
        //      "eth_btc",
        //      ...
        //  ]
        //
        const result = [];
        for (let i = 0; i < response.length; i++) {
            const pair = response[i];
            const parts = pair.split ('_');
            const baseId = this.safeString (parts, 0);
            const quoteId = this.safeString (parts, 1);
            if (baseId === undefined || quoteId === undefined) {
                continue;
            }
            const base = this.safeCurrencyCode (baseId);
            const quote = this.safeCurrencyCode (quoteId);
            const symbol = base + '/' + quote;
            result.push ({
                'id': pair,
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
                'info': pair,
            });
        }
        return result;
    }

    /**
     * @method
     * @name changenow#fetchTicker
     * @description fetches a price ticker / estimate for a swap pair on ChangeNOW
     * @see https://changenow.io/api/docs
     * @param {string} symbol unified market symbol, e.g. 'BTC/USDT'
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.amount] amount to estimate, defaults to '1'
     * @param {boolean} [params.fixedRate] if true, use fixed-rate flow estimation
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const amount = this.safeString (params, 'amount', '1');
        const fixedRate = this.safeBool (params, 'fixedRate', false);
        params = this.omit (params, [ 'amount', 'fixedRate' ]);
        const request: Dict = {
            'from': baseId,
            'to': quoteId,
            'amount': amount,
        };
        let response = undefined;
        if (fixedRate) {
            // v1 fixed-rate estimate requires api_key query parameter
            request['api_key'] = this.resolveApiKey ();
            response = await this.publicGetExchangeAmountFixedRateAmountFromTo (this.extend (request, params));
        } else {
            response = await this.publicGetExchangeAmountAmountFromTo (this.extend (request, params));
        }
        //
        //  {
        //      "estimatedAmount": 0.07365102,
        //      "transactionSpeedForecast": "10-60",
        //      "warningMessage": null
        //  }
        //
        // fixed-rate response additionally includes:
        //  {
        //      "estimatedAmount": 0.07365102,
        //      "transactionSpeedForecast": "10-60",
        //      "warningMessage": null,
        //      "rateId": "abc123..."
        //  }
        //
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
     * @name changenow#createOrder
     * @description create a swap order on ChangeNOW (requires API key)
     * @see https://changenow.io/api/docs
     * @param {string} symbol unified market symbol, e.g. 'BTC/ETH'
     * @param {string} type order type – only 'market' is supported (floating rate), or 'limit' for fixed-rate
     * @param {string} side 'buy' or 'sell' – for swaps this is always 'sell' (sell base for quote)
     * @param {float} amount amount of the base currency to send
     * @param {float} [price] not used for ChangeNOW standard flow
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} params.address_to destination address for the quote currency (required)
     * @param {string} [params.extraId] extra id or memo for the destination address (e.g. for XRP, XLM)
     * @param {string} [params.refund_address] refund address for the base currency
     * @param {string} [params.refundExtraId] extra id or memo for the refund address
     * @param {string} [params.rateId] rate id from fixed-rate estimate (required for fixed-rate)
     * @param {string} [params.contactEmail] contact email for notifications
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        this.checkRequiredCredentials ();
        await this.loadMarkets ();
        const market = this.market (symbol);
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const addressTo = this.safeString (params, 'address_to');
        if (addressTo === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder() requires params.address_to – the destination address for the received currency');
        }
        const request: Dict = {
            'apiKey': this.resolveApiKey (),
            'from': baseId,
            'to': quoteId,
            'amount': this.numberToString (amount),
            'address': addressTo,
        };
        const extraId = this.safeString (params, 'extraId');
        if (extraId !== undefined) {
            request['extraId'] = extraId;
        }
        const refundAddress = this.safeString (params, 'refund_address');
        if (refundAddress !== undefined) {
            request['refundAddress'] = refundAddress;
        }
        const refundExtraId = this.safeString (params, 'refundExtraId');
        if (refundExtraId !== undefined) {
            request['refundExtraId'] = refundExtraId;
        }
        const rateId = this.safeString (params, 'rateId');
        if (rateId !== undefined) {
            request['rateId'] = rateId;
        }
        const contactEmail = this.safeString (params, 'contactEmail');
        if (contactEmail !== undefined) {
            request['contactEmail'] = contactEmail;
        }
        params = this.omit (params, [ 'address_to', 'extraId', 'refund_address', 'refundExtraId', 'rateId', 'contactEmail' ]);
        const response = await this.privatePostTransactionsApiKey (this.extend (request, params));
        //
        //  {
        //      "id": "5788c1ab245b37",
        //      "payinAddress": "3NWnMcW31...",
        //      "payoutAddress": "0x0000...",
        //      "fromCurrency": "btc",
        //      "toCurrency": "eth",
        //      "amount": "0.3233127",       // estimated receive amount (quote)
        //      "directedAmount": "0.01"      // amount sent (base)
        //  }
        //
        return this.parseOrder (response, market);
    }

    /**
     * @method
     * @name changenow#fetchOrder
     * @description fetch the status of a ChangeNOW exchange/swap order
     * @see https://changenow.io/api/docs
     * @param {string} id the order / transaction id
     * @param {string} [symbol] unified market symbol (optional)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        this.checkRequiredCredentials ();
        const request: Dict = {
            'id': id,
            'apiKey': this.resolveApiKey (),
        };
        const response = await this.privateGetTransactionsIdApiKey (this.extend (request, params));
        //
        //  {
        //      "status": "finished",
        //      "payinHash": "0x...",
        //      "payoutHash": "0x...",
        //      "payinAddress": "0xAB5...",
        //      "payoutAddress": "1Jqf...",
        //      "fromCurrency": "eth",
        //      "toCurrency": "btc",
        //      "amountSend": 1,
        //      "amountReceive": 0.07365102,
        //      "networkFee": "0.0005",
        //      "id": "a5c73e2603f40d",
        //      "updatedAt": "2023-01-15T12:34:56.789Z",
        //      "createdAt": "2023-01-15T12:30:00.000Z",
        //      "expectedSendAmount": 1,
        //      "expectedReceiveAmount": 0.07365102
        //  }
        //
        return this.parseOrder (response);
    }

    /**
     * @method
     * @name changenow#fetchMyTrades
     * @description fetches completed swap transactions for the authenticated API key
     * @see https://documenter.getpostman.com/view/8180765/SVfTPnM8?version=latest#d4d5a53e-f92a-4113-b0d9-e9d097e080b8
     * @param {string} [symbol] unified market symbol, e.g. 'BTC/ETH'
     * @param {int} [since] the earliest time in ms to fetch trades for
     * @param {int} [limit] the maximum number of trade structures to retrieve
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.status] filter by transaction status (e.g. 'finished')
     * @param {int} [params.offset] number of transactions to skip
     * @param {string} [params.dateTo] return transactions created before this ISO-8601 datetime
     * @param {string} [params.from] payin currency ticker filter
     * @param {string} [params.to] payout currency ticker filter
     * @returns {Trade[]} a list of [trade structures]{@link https://docs.ccxt.com/?id=trade-structure}
     */
    async fetchMyTrades (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        this.checkRequiredCredentials ();
        await this.loadMarkets ();
        const request: Dict = {
            'apiKey': this.resolveApiKey (),
        };
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['from'] = this.safeString (market, 'baseId');
            request['to'] = this.safeString (market, 'quoteId');
        }
        if (since !== undefined) {
            request['dateFrom'] = this.iso8601 (since);
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        params = this.omit (params, [ 'from', 'to', 'dateFrom', 'limit' ]);
        const response = await this.privateGetTransactionsApiKey (this.extend (request, params));
        //
        //  [
        //      {
        //          "id": "a5c73e2603f40d",
        //          "status": "finished",
        //          "fromCurrency": "btc",
        //          "toCurrency": "eth",
        //          "amountSend": 0.01,
        //          "amountReceive": 0.3233127,
        //          "networkFee": "0.0005",
        //          "payinHash": "0x...",
        //          "payoutHash": "0x...",
        //          "updatedAt": "2023-01-15T12:34:56.789Z"
        //      },
        //      ...
        //  ]
        //
        return this.parseTrades (response, market, since, limit);
    }

    parseTrades (trades: any[], market: Market = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Trade[] {
        trades = this.toArray (trades);
        const filtered = [];
        for (let tradeIndex = 0; tradeIndex < trades.length; tradeIndex++) {
            const rawTrade = trades[tradeIndex];
            const amountSend = this.safeString (rawTrade, 'amountSend');
            const amountReceive = this.safeString (rawTrade, 'amountReceive');
            if (amountSend === undefined || amountReceive === undefined) {
                continue;
            }
            if (Precise.stringEq (amountSend, '0') || Precise.stringEq (amountReceive, '0')) {
                continue;
            }
            filtered.push (rawTrade);
        }
        return super.parseTrades (filtered, market, since, limit, params);
    }

    parseTrade (trade: Dict, market: Market = undefined): Trade {
        const id = this.safeString (trade, 'id');
        const fromCurrency = this.safeString (trade, 'fromCurrency');
        const toCurrency = this.safeString (trade, 'toCurrency');
        let parsedSymbol = undefined;
        if (fromCurrency !== undefined && toCurrency !== undefined) {
            const baseCode = this.safeCurrencyCode (fromCurrency);
            const quoteCode = this.safeCurrencyCode (toCurrency);
            parsedSymbol = baseCode + '/' + quoteCode;
        }
        let symbol = this.safeSymbol (undefined, market);
        if (symbol === undefined) {
            symbol = parsedSymbol;
        }
        const amountSend = this.safeString (trade, 'amountSend');
        const amountReceive = this.safeString (trade, 'amountReceive');
        const price = Precise.stringDiv (amountReceive, amountSend);
        const updatedAt = this.safeString (trade, 'updatedAt');
        const timestamp = this.parse8601 (updatedAt);
        const networkFee = this.safeString (trade, 'networkFee');
        return this.safeTrade ({
            'info': trade,
            'id': id,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'order': id,
            'type': 'market',
            'side': 'sell',
            'takerOrMaker': undefined,
            'price': price,
            'amount': amountSend,
            'cost': amountReceive,
            'fee': {
                'currency': undefined,
                'cost': networkFee,
                'rate': undefined,
            },
        }, market);
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const id = this.safeString (order, 'id');
        const fromCurrency = this.safeString (order, 'fromCurrency');
        const toCurrency = this.safeString (order, 'toCurrency');
        let parsedSymbol = undefined;
        if (fromCurrency !== undefined && toCurrency !== undefined) {
            const baseCode = this.safeCurrencyCode (fromCurrency);
            const quoteCode = this.safeCurrencyCode (toCurrency);
            parsedSymbol = baseCode + '/' + quoteCode;
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
            // v1 create response has no status — default to 'open'
            status = 'open';
        }
        // v1 fetch response uses amountSend/expectedSendAmount
        // v1 create response uses directedAmount (amount sent) and amount (estimated receive)
        const amountSend = this.safeString2 (order, 'amountSend', 'expectedSendAmount');
        const directedAmount = this.safeString (order, 'directedAmount');
        const amountReceive = this.safeString2 (order, 'amountReceive', 'expectedReceiveAmount');
        let orderAmount = amountSend;
        if (orderAmount === undefined) {
            orderAmount = directedAmount;
        }
        let orderPrice = amountReceive;
        if (orderPrice === undefined && directedAmount !== undefined) {
            // v1 create response: 'amount' is estimated receive, not send amount
            orderPrice = this.safeString (order, 'amount');
        }
        if (orderAmount === undefined && directedAmount === undefined) {
            // Use raw amount only when directedAmount is missing; otherwise amount may mean estimated receive.
            orderAmount = this.safeString (order, 'amount');
        }
        const createdAt = this.safeString (order, 'createdAt');
        const updatedAt = this.safeString (order, 'updatedAt');
        const timestamp = this.parse8601 (createdAt);
        const lastUpdateTimestamp = this.parse8601 (updatedAt);
        const networkFee = this.safeString (order, 'networkFee');
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
            'price': orderPrice,
            'stopPrice': undefined,
            'triggerPrice': undefined,
            'amount': orderAmount,
            'cost': undefined,
            'average': undefined,
            'filled': undefined,
            'remaining': undefined,
            'status': status,
            'fee': {
                'currency': undefined,
                'cost': networkFee,
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
        let url = this.urls['api']['rest'] + '/' + this.implodeParams (path, params);
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
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (httpCode: int, reason: string, url: string, method: string, headers: Dict, body: string, response, requestHeaders, requestBody) {
        if (httpCode === 404 && url.indexOf ('/transactions/') >= 0) {
            throw new OrderNotFound (this.id + ' order not found');
        }
        if (response === undefined) {
            return undefined;
        }
        //
        // error responses from ChangeNOW:
        //  { "error": "pair_is_inactive", "message": "This pair is currently unavailable" }
        //  { "error": "not_valid_params", "message": "Invalid request parameters" }
        //  { "error": "deposit_too_small", "message": "Deposit amount is less than minimum" }
        //  { "error": "out_of_range", "message": "Amount is less then minimal: 0.0223925 XMR" }
        //  { "error": "invalid_api_key", "message": "Use private key for this endpoint" }
        //  { "message": "Unauthorized" }
        //
        const error = this.safeString (response, 'error');
        const message = this.safeString (response, 'message');
        if (error !== undefined) {
            if (error === 'not_valid_params') {
                throw new BadRequest (this.id + ' ' + body);
            }
            if (error === 'invalid_api_key') {
                throw new PermissionDenied (this.id + ' ' + body);
            }
            if (error === 'unauthorized') {
                throw new AuthenticationError (this.id + ' ' + body);
            }
            if (error === 'not_found') {
                throw new OrderNotFound (this.id + ' ' + body);
            }
            if (error === 'deposit_too_small' || error === 'out_of_range') {
                throw new InvalidOrder (this.id + ' ' + body);
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
