//  ---------------------------------------------------------------------------

import Exchange from './abstract/coingecko.js';
import { AuthenticationError, BadRequest, ExchangeError, NullResponse, RateLimitExceeded } from './base/errors.js';
import type { Market, Dict, Ticker, int, Strings, Tickers } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class coingecko
 * @augments Exchange
 * @description CoinGecko - cryptocurrency market data provider (read-only).
 * Docs: https://docs.coingecko.com/v3.0.1/reference/coins-list
 */
export default class coingecko extends Exchange {
    describe (): any {
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
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'coins/list',
                        'coins/markets',
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
            },
        });
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
            result.push (this.parseMarket (response[i]));
        }
        return result;
    }

    parseMarket (coin: Dict): Market {
        const vsCurrency = this.safeString (this.options, 'vsCurrency', 'usd').toLowerCase ();
        const coinId = this.safeString (coin, 'id');
        const rawSymbol = this.safeString (coin, 'symbol');
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
     * @param {string} symbol unified market symbol
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.vs_currency] quote currency for prices
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
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
     * @param {string[]} [symbols] unified market symbols
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.vs_currency] quote currency for prices
     * @param {int} [params.page] page number when fetching without symbols (default 1)
     * @param {int} [params.per_page] page size when fetching without symbols (default 250, max 250)
     * @returns {object} a dictionary of [ticker structures]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTickers (symbols: Strings = undefined, params = {}): Promise<Tickers> {
        await this.loadMarkets ();
        const vsCurrency = this.safeString2 (params, 'vs_currency', 'vsCurrency', this.safeString (this.options, 'vsCurrency', 'usd')).toLowerCase ();
        const maxBatchSize = 250;
        const page = this.safeInteger2 (params, 'page', undefined, 1);
        const perPage = this.safeInteger2 (params, 'per_page', 'perPage', maxBatchSize);
        params = this.omit (params, [ 'vs_currency', 'vsCurrency', 'page', 'per_page', 'perPage' ]);
        const symbolsLength = (symbols === undefined) ? 0 : symbols.length;
        if (symbolsLength === 0) {
            const request: Dict = {
                'vs_currency': vsCurrency,
                'page': page,
                'per_page': perPage,
            };
            const response = await this.publicGetCoinsMarkets (this.extend (request, params));
            return this.parseTickersFromMarketsRows (response);
        }
        const marketIds = [];
        const marketByCoinId: Dict = {};
        for (let i = 0; i < symbolsLength; i++) {
            const symbol = symbols[i];
            const market = this.market (symbol);
            const coinId = this.safeString (market, 'baseId');
            marketIds.push (coinId);
            marketByCoinId[coinId] = market;
        }
        let result: Dict = {};
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
        return result;
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
        if ((this.apiKey !== undefined) && (this.apiKey !== '')) {
            if (headers === undefined) {
                headers = {};
            }
            headers['x-cg-demo-api-key'] = this.apiKey;
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
            if (errorCode === 10005) {
                throw new RateLimitExceeded (this.id + ' ' + errorMessage);
            }
            if (errorCode === 10002) {
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
