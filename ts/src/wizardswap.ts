
//  ---------------------------------------------------------------------------

import Exchange from './abstract/wizardswap.js';
import { ExchangeError, BadRequest, ArgumentsRequired, OrderNotFound } from './base/errors.js';
import { TICK_SIZE } from './base/functions/number.js';
import type { Market, Str, Dict, Ticker, Num, Currencies, Currency, int, Order, OrderType, OrderSide } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class wizardswap
 * @augments Exchange
 * @description WizardSwap - No-account, no-API-key cryptocurrency swap service
 * with own liquidity pool. Fixed 2.2% fee, floating rate only.
 * Docs: https://www.wizardswap.io/api
 */
export default class wizardswap extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'wizardswap',
            'name': 'WizardSwap',
            'countries': [ ],   // decentralized, no jurisdiction
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
                'transfer': false,
            },
            'urls': {
                'logo': 'https://www.wizardswap.io/favicon.ico',
                'api': {
                    'rest': 'https://www.wizardswap.io/api',
                },
                'www': 'https://www.wizardswap.io',
                'doc': [
                    'https://www.wizardswap.io/api',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'currencies',
                        'currency',
                        'currency/{symbol}',
                        'pairs',
                        'pairs/{symbol}',
                        'exchange/{id}',
                    ],
                    'post': [
                        'estimate',
                        'exchange',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'percentage': true,
                    'maker': this.parseNumber ('0.022'),
                    'taker': this.parseNumber ('0.022'),
                },
            },
            // WizardSwap does not support OHLCV, but OctoBot requires at least
            // one time frame for exchange manager initialization.
            'timeframes': {
                '1d': '1d',
            },
            'precisionMode': TICK_SIZE,
            'requiredCredentials': {
                'apiKey': false,
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
                        'leverage': false,
                        'marketBuyRequiresPrice': false,
                        'marketBuyByCost': false,
                        'selfTradePrevention': false,
                        'trailing': false,
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
                // Hardcoded fallback when both /currency and /currencies
                // endpoints are unreachable (e.g. DDoS-Guard blocks all GET).
                'defaultCurrencyIds': [
                    'btc', 'xmr', 'eth', 'ltc', 'bch',
                    'zec', 'dash', 'firo', 'part', 'pivx', 'zano',
                ],
                // WizardSwap statuses mapped to ccxt unified statuses
                'statusMapping': {
                    'waiting': 'open',
                    'confirming': 'open',
                    'exchanging': 'open',
                    'sending': 'open',
                    'finished': 'closed',
                    'failed': 'canceled',
                    'refunded': 'canceled',
                    'verifying': 'open',
                },
            },
        });
    }

    /**
     * @method
     * @name wizardswap#fetchCurrencies
     * @description fetches all available currencies on the exchange
     * @see https://www.wizardswap.io/api
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an associative dictionary of currencies
     */
    async fetchCurrencies (params = {}): Promise<Currencies> {
        //
        // GET /api/currency returns rich data:
        //  [
        //      {
        //          "symbol": "PART", "name": "Particl", "decimals": 8,
        //          "minamt": "0.00001", "enabled": 1, "maintenance": 0,
        //          "validation_address": "...", "explorer": "https://...",
        //          ...
        //      },
        //      ...
        //  ]
        //
        // GET /api/currencies returns simple array (may be blocked by DDoS-Guard):
        //  ["btc","xmr","eth",...]
        //
        let richResponse = undefined;
        try {
            richResponse = await this.publicGetCurrency (params);
        } catch (e) {
            richResponse = undefined;
        }
        if (Array.isArray (richResponse) && richResponse.length > 0) {
            return this.parseRichCurrencies (richResponse);
        }
        // Fallback: try the simple /currencies endpoint
        let simpleResponse = undefined;
        try {
            simpleResponse = await this.publicGetCurrencies (params);
        } catch (e) {
            simpleResponse = undefined;
        }
        if (Array.isArray (simpleResponse) && simpleResponse.length > 0) {
            return this.parseSimpleCurrencies (simpleResponse);
        }
        // Last resort: use hardcoded list
        const defaultIds = this.safeList (this.options, 'defaultCurrencyIds', []);
        return this.parseSimpleCurrencies (defaultIds);
    }

    parseRichCurrencies (response) {
        const result: Dict = {};
        for (let i = 0; i < response.length; i++) {
            const entry = response[i];
            const rawSymbol = this.safeString (entry, 'symbol');
            if (rawSymbol === undefined) {
                continue;
            }
            const currencyId = rawSymbol.toLowerCase ();
            const code = this.safeCurrencyCode (currencyId);
            const enabled = this.safeInteger (entry, 'enabled', 1);
            const maintenance = this.safeInteger (entry, 'maintenance', 0);
            const active = (enabled === 1) && (maintenance === 0);
            const decimals = this.safeInteger (entry, 'decimals');
            let precision = undefined;
            if (decimals !== undefined) {
                precision = this.parseNumber (this.decimalToPrecision (1, 0, decimals, 4));
            }
            const minAmt = this.safeNumber (entry, 'minamt');
            result[code] = this.safeCurrencyStructure ({
                'id': currencyId,
                'code': code,
                'name': this.safeString (entry, 'name'),
                'active': active,
                'deposit': active,
                'withdraw': active,
                'fee': undefined,
                'precision': precision,
                'limits': {
                    'amount': { 'min': minAmt, 'max': undefined },
                    'withdraw': { 'min': minAmt, 'max': undefined },
                },
                'info': entry,
            });
        }
        return result;
    }

    parseSimpleCurrencies (currencyIds) {
        const result: Dict = {};
        for (let i = 0; i < currencyIds.length; i++) {
            const currencyId = currencyIds[i];
            const code = this.safeCurrencyCode (currencyId);
            result[code] = this.safeCurrencyStructure ({
                'id': currencyId,
                'code': code,
                'name': undefined,
                'active': true,
                'deposit': true,
                'withdraw': true,
                'fee': undefined,
                'precision': undefined,
                'limits': {
                    'amount': { 'min': undefined, 'max': undefined },
                    'withdraw': { 'min': undefined, 'max': undefined },
                },
                'info': currencyId,
            });
        }
        return result;
    }

    /**
     * @method
     * @name wizardswap#fetchMarkets
     * @description retrieves all available swap pairs from /pairs and /currency
     * @see https://www.wizardswap.io/api
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of objects representing market data
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        const currencies = await this.fetchCurrencies (params);
        //
        // GET /api/pairs returns:
        // {
        //     "part": ["pivx","xmr","zec","dash","btc","ltc","eth","firo","zano","bch"],
        //     "xmr":  ["part","pivx","zec","dash","btc","ltc","eth","firo","zano","bch"],
        //     ...
        // }
        //
        let pairsData = undefined;
        try {
            pairsData = await this.publicGetPairs (params);
        } catch (e) {
            pairsData = undefined;
        }
        const result = [];
        if (pairsData !== undefined && typeof pairsData === 'object') {
            const baseIds = Object.keys (pairsData);
            for (let i = 0; i < baseIds.length; i++) {
                const baseId = baseIds[i];
                const baseCode = this.safeCurrencyCode (baseId);
                const quoteIds = this.safeList (pairsData, baseId, []);
                for (let j = 0; j < quoteIds.length; j++) {
                    const quoteId = quoteIds[j];
                    const quoteCode = this.safeCurrencyCode (quoteId);
                    const baseCurrency = this.safeDict (currencies, baseCode, {});
                    const quoteCurrency = this.safeDict (currencies, quoteCode, {});
                    result.push (this.buildMarketEntry (baseId, quoteId, baseCode, quoteCode, baseCurrency, quoteCurrency));
                }
            }
        } else {
            // Fallback: build from currencies (N*(N-1) pairs)
            const codes = Object.keys (currencies);
            for (let i = 0; i < codes.length; i++) {
                const baseCode = codes[i];
                const baseCurrency = currencies[baseCode];
                const baseId = this.safeString (baseCurrency, 'id');
                for (let j = 0; j < codes.length; j++) {
                    if (i === j) {
                        continue;
                    }
                    const quoteCode = codes[j];
                    const quoteCurrency = currencies[quoteCode];
                    const quoteId = this.safeString (quoteCurrency, 'id');
                    result.push (this.buildMarketEntry (baseId, quoteId, baseCode, quoteCode, baseCurrency, quoteCurrency));
                }
            }
        }
        return result;
    }

    buildMarketEntry (baseId, quoteId, baseCode, quoteCode, baseCurrency, quoteCurrency) {
        const symbol = baseCode + '/' + quoteCode;
        const baseMinAmt = this.safeNumber (this.safeDict (this.safeDict (baseCurrency, 'limits', {}), 'amount', {}), 'min');
        return {
            'id': baseId + '_' + quoteId,
            'symbol': symbol,
            'base': baseCode,
            'quote': quoteCode,
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
            'active': true,
            'contract': false,
            'linear': undefined,
            'inverse': undefined,
            'contractSize': undefined,
            'expiry': undefined,
            'expiryDatetime': undefined,
            'strike': undefined,
            'optionType': undefined,
            'taker': this.parseNumber ('0.022'),
            'maker': this.parseNumber ('0.022'),
            'percentage': true,
            'tierBased': false,
            'feeSide': 'get',
            'precision': {
                'amount': this.safeNumber (baseCurrency, 'precision'),
                'price': this.safeNumber (quoteCurrency, 'precision'),
            },
            'limits': {
                'leverage': { 'min': undefined, 'max': undefined },
                'amount': { 'min': baseMinAmt, 'max': undefined },
                'price': { 'min': undefined, 'max': undefined },
                'cost': { 'min': undefined, 'max': undefined },
            },
            'created': undefined,
            'info': {
                'baseId': baseId,
                'quoteId': quoteId,
            },
        };
    }

    /**
     * @method
     * @name wizardswap#fetchTicker
     * @description fetches a price ticker / estimate for a swap pair
     * @see https://www.wizardswap.io/api
     * @param {string} symbol unified market symbol, e.g. 'XMR/BTC'
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.amount_from] amount to estimate, defaults to '1'
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const amountFrom = this.safeString (params, 'amount_from', '1');
        params = this.omit (params, 'amount_from');
        const request: Dict = {
            'currency_from': market['baseId'],
            'currency_to': market['quoteId'],
            'amount_from': amountFrom,
        };
        const response = await this.publicPostEstimate (this.extend (request, params));
        //
        //  { "estimated_amount": "0.00476907" }
        //
        return this.parseTicker (response, market);
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        const currencyFrom = this.safeString (ticker, 'currency_from');
        const currencyTo = this.safeString (ticker, 'currency_to');
        let symbol = this.safeString (market, 'symbol');
        if (currencyFrom !== undefined && currencyTo !== undefined) {
            const baseCode = this.safeCurrencyCode (currencyFrom);
            const quoteCode = this.safeCurrencyCode (currencyTo);
            symbol = baseCode + '/' + quoteCode;
        }
        const last = this.safeString2 (ticker, 'estimated_amount', 'rate');
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
     * @name wizardswap#createOrder
     * @description create a swap order on WizardSwap (no API key needed)
     * @see https://www.wizardswap.io/api
     * @param {string} symbol unified market symbol, e.g. 'XMR/BTC'
     * @param {string} type order type – only 'market' is supported (floating rate)
     * @param {string} side 'buy' or 'sell' – for swaps this is always 'sell' (sell base for quote)
     * @param {float} amount amount of the base currency to send
     * @param {float} [price] not used for WizardSwap
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} params.address_to destination address for the quote currency
     * @param {string} [params.refund_address] refund address for the base currency
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const addressTo = this.safeString (params, 'address_to');
        if (addressTo === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder() requires params.address_to – the destination address for the received currency');
        }
        const request: Dict = {
            'currency_from': market['baseId'],
            'currency_to': market['quoteId'],
            'amount_from': this.numberToString (amount),
            'address_to': addressTo,
        };
        const refundAddress = this.safeString (params, 'refund_address');
        if (refundAddress !== undefined) {
            request['refund_address'] = refundAddress;
        }
        params = this.omit (params, [ 'address_to', 'refund_address' ]);
        const response = await this.publicPostExchange (this.extend (request, params));
        //
        //  {
        //      "id": "08A75WA1",
        //      "type": "fixed",
        //      "timestamp": "2026-03-24 21:48:22",
        //      "updated_at": "2026-03-24 22:48:21",
        //      "currency_from": "xmr",
        //      "amount_from": "0.1000...",
        //      "expected_amount": "0.1000...",
        //      "amount_to": "0.000467720...",
        //      "address_from": "88hsysd...",
        //      "address_to": "1Bitcoin...",
        //      "extra_id_from": "",
        //      "extra_id_to": "",
        //      "tx_from": "",
        //      "tx_to": "",
        //      "status": "waiting",
        //      "refund_address": null,
        //      "refund_extra_id": "",
        //      "currencies": { ... }
        //  }
        //
        // Note: create response may omit currency_to; pass market to parseOrder.
        return this.parseOrder (response, market);
    }

    /**
     * @method
     * @name wizardswap#fetchOrder
     * @description fetch the status of a WizardSwap exchange/swap order
     * @see https://www.wizardswap.io/api
     * @param {string} id the order / exchange id
     * @param {string} [symbol] unified market symbol (optional)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        const request: Dict = {
            'id': id,
        };
        let response = undefined;
        try {
            response = await this.publicGetExchangeId (this.extend (request, params));
        } catch (e) {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        //
        //  {
        //      "id": "08A75WA1",
        //      "timestamp": "2026-03-24 21:48:22",
        //      "updated_at": "2026-03-24 22:48:22",
        //      "currency_from": "xmr",
        //      "currency_to": "btc",
        //      "amount_from": "0.1000...",
        //      "amount_to": "0.000467720...",
        //      "expected_amount": "0.1000...",
        //      "address_from": "88hsysd...",
        //      "address_to": "1Bitcoin...",
        //      "extra_id_from": "",
        //      "extra_id_to": "",
        //      "tx_from": "",
        //      "tx_to": "",
        //      "status": "waiting",
        //      "refund_address": null,
        //      "refund_extra_id": "",
        //      "currencies": [ { "symbol": "xmr", ... }, { "symbol": "btc", ... } ]
        //  }
        //
        if (response === undefined || typeof response !== 'object') {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        // The API returns a dict with status=null for nonexistent orders
        const responseStatus = this.safeString (response, 'status');
        if (responseStatus === undefined) {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        return this.parseOrder (response);
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const id = this.safeString (order, 'id');
        const currencyFrom = this.safeString (order, 'currency_from');
        const currencyTo = this.safeString (order, 'currency_to');
        let parsedSymbol = undefined;
        if (currencyFrom !== undefined && currencyTo !== undefined) {
            const baseCode = this.safeCurrencyCode (currencyFrom);
            const quoteCode = this.safeCurrencyCode (currencyTo);
            parsedSymbol = baseCode + '/' + quoteCode;
        }
        // Prefer parsed symbol from response, fall back to market
        let symbol = parsedSymbol;
        if (symbol === undefined) {
            symbol = this.safeString (market, 'symbol');
        }
        const rawStatus = this.safeString (order, 'status');
        const status = this.parseOrderStatus (rawStatus);
        const amountFrom = this.safeString2 (order, 'expected_amount', 'amount_from');
        const amountTo = this.safeString (order, 'amount_to');
        // Parse timestamp from "2026-03-24 21:48:22" format
        const timestampStr = this.safeString (order, 'timestamp');
        let timestamp = undefined;
        if (timestampStr !== undefined) {
            timestamp = this.parse8601 (timestampStr.replace (' ', 'T') + 'Z');
        }
        const updatedAtStr = this.safeString (order, 'updated_at');
        let lastUpdateTimestamp = undefined;
        if (updatedAtStr !== undefined) {
            lastUpdateTimestamp = this.parse8601 (updatedAtStr.replace (' ', 'T') + 'Z');
        }
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
            'price': amountTo,       // estimated receive amount
            'stopPrice': undefined,
            'triggerPrice': undefined,
            'amount': amountFrom,     // amount sent
            'cost': undefined,
            'average': undefined,
            'filled': undefined,
            'remaining': undefined,
            'status': status,
            'fee': {
                'currency': undefined,
                'cost': undefined,
                'rate': this.parseNumber ('0.022'),
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
        if (response === undefined) {
            return undefined;
        }
        //
        // error responses from WizardSwap:
        //  { "error": "some error message" }
        //
        const error = this.safeString (response, 'error');
        if (error !== undefined) {
            throw new ExchangeError (this.id + ' ' + error);
        }
        const message = this.safeString (response, 'message');
        if (message !== undefined && httpCode >= 400) {
            throw new BadRequest (this.id + ' ' + message);
        }
        return undefined;
    }
}
