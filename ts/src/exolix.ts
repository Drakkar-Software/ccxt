//  ---------------------------------------------------------------------------

import Exchange from './abstract/exolix.js';
import { ExchangeError, BadRequest, ArgumentsRequired, AuthenticationError, OrderNotFound, InvalidOrder, BadSymbol } from './base/errors.js';
import { TICK_SIZE } from './base/functions/number.js';
import type { Market, Str, Dict, Ticker, Num, Currencies, int, Order, OrderType, OrderSide } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class exolix
 * @augments Exchange
 * @description Exolix - instant non-custodial cryptocurrency swap service.
 * Network-aware v2 API. Symbols use TICKER@NETWORK (e.g. BTC@BTC/ETH@ETH).
 * Docs: https://exolix.com/developers
 */
export default class exolix extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'exolix',
            'name': 'Exolix',
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
                'logo': 'https://exolix.com/favicon.ico',
                'api': {
                    'rest': 'https://exolix.com/api/v2',
                },
                'www': 'https://exolix.com',
                'doc': [
                    'https://exolix.com/developers',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'currencies',
                        'currencies/{code}/networks',
                        'currencies/networks',
                        'rate',
                        'transactions/{id}',
                    ],
                    'post': [
                        'transactions',
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
                'defaultNetworks': {},
                'statusMapping': {
                    'wait': 'open',
                    'confirmation': 'open',
                    'confirmed': 'open',
                    'exchanging': 'open',
                    'sending': 'open',
                    'success': 'closed',
                    'overdue': 'expired',
                    'refund': 'canceled',
                    'refunded': 'canceled',
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

    parseAtNetworkCode (code: string): Dict {
        const parts = code.split ('@');
        const ticker = this.safeString (parts, 0);
        const network = this.safeString (parts, 1);
        if (ticker === undefined || network === undefined) {
            return {};
        }
        const tickerUpper = ticker.toUpperCase ();
        const networkUpper = network.toUpperCase ();
        return {
            'ticker': tickerUpper,
            'network': networkUpper,
            'code': tickerUpper + '@' + networkUpper,
        };
    }

    buildMarketId (baseParts: Dict, quoteParts: Dict): Str {
        const baseTicker = this.safeString (baseParts, 'ticker');
        const baseNetwork = this.safeString (baseParts, 'network');
        const quoteTicker = this.safeString (quoteParts, 'ticker');
        const quoteNetwork = this.safeString (quoteParts, 'network');
        if (baseTicker === undefined || baseNetwork === undefined || quoteTicker === undefined || quoteNetwork === undefined) {
            return undefined;
        }
        return baseTicker.toLowerCase () + '@' + baseNetwork.toLowerCase () + '_' + quoteTicker.toLowerCase () + '@' + quoteNetwork.toLowerCase ();
    }

    parseMarketFromParts (baseParts: Dict, quoteParts: Dict, symbol: string, rateLimits: Dict = {}): Market {
        const baseCode = this.safeString (baseParts, 'code');
        const quoteCode = this.safeString (quoteParts, 'code');
        const marketId = this.buildMarketId (baseParts, quoteParts);
        const minAmount = this.safeNumber (rateLimits, 'minAmount');
        const maxAmount = this.safeNumber (rateLimits, 'maxAmount');
        return {
            'id': marketId,
            'symbol': symbol,
            'base': baseCode,
            'quote': quoteCode,
            'settle': undefined,
            'baseId': marketId,
            'quoteId': marketId,
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
                'amount': { 'min': minAmount, 'max': maxAmount },
                'price': { 'min': undefined, 'max': undefined },
                'cost': { 'min': undefined, 'max': undefined },
            },
            'created': undefined,
            'info': {
                'coinFrom': this.safeString (baseParts, 'ticker'),
                'networkFrom': this.safeString (baseParts, 'network'),
                'coinTo': this.safeString (quoteParts, 'ticker'),
                'networkTo': this.safeString (quoteParts, 'network'),
            },
        };
    }

    async ensureDefaultNetworks (params = {}): Promise<Dict> {
        const cachedNetworks = this.safeDict (this.options, 'defaultNetworks', {});
        if (!this.isEmpty (cachedNetworks)) {
            return cachedNetworks;
        }
        await this.fetchCurrencies (params);
        return this.safeDict (this.options, 'defaultNetworks', {});
    }

    async resolveSymbolPart (part: string, params = {}): Promise<Dict> {
        const atParts = part.split ('@');
        const ticker = this.safeString (atParts, 0);
        let network = this.safeString (atParts, 1);
        if (ticker === undefined) {
            return {};
        }
        const tickerUpper = ticker.toUpperCase ();
        if (network === undefined) {
            const defaultNetworks = await this.ensureDefaultNetworks (params);
            network = this.safeString (defaultNetworks, tickerUpper);
            if (network === undefined) {
                network = tickerUpper;
            }
        }
        const networkUpper = network.toUpperCase ();
        return {
            'ticker': tickerUpper,
            'network': networkUpper,
            'code': tickerUpper + '@' + networkUpper,
        };
    }

    async parseSymbolToParts (symbol: string, params = {}): Promise<Dict> {
        const symbolParts = symbol.split ('/');
        if (symbolParts.length !== 2) {
            return {};
        }
        const basePart = this.safeString (symbolParts, 0);
        const quotePart = this.safeString (symbolParts, 1);
        const baseParts = await this.resolveSymbolPart (basePart, params);
        const quoteParts = await this.resolveSymbolPart (quotePart, params);
        if (this.isEmpty (baseParts) || this.isEmpty (quoteParts)) {
            return {};
        }
        return {
            'baseParts': baseParts,
            'quoteParts': quoteParts,
        };
    }

    extendRequestWithApiKey (request: Dict): Dict {
        const apiKey = this.resolveApiKey ();
        if (apiKey !== undefined) {
            request['apiKey'] = apiKey;
        }
        return request;
    }

    /**
     * @method
     * @name exolix#fetchCurrencies
     * @description fetches all available currencies on Exolix (paginated, with networks)
     * @see https://exolix.com/developers
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an associative dictionary of currencies
     */
    async fetchCurrencies (params = {}): Promise<Currencies> {
        const pageSize = 100;
        let page = 1;
        let totalCount = undefined;
        const allCurrencies = [];
        const defaultNetworks: Dict = {};
        let hasMorePages = true;
        while (hasMorePages) {
            const request: Dict = {
                'page': page,
                'size': pageSize,
                'withNetworks': true,
            };
            const response = await this.publicGetCurrencies (this.extend (this.extendRequestWithApiKey (request), params));
            const data = this.safeList (response, 'data', []);
            for (let currencyIndex = 0; currencyIndex < data.length; currencyIndex++) {
                allCurrencies.push (data[currencyIndex]);
            }
            if (totalCount === undefined) {
                totalCount = this.safeInteger (response, 'count', data.length);
            }
            hasMorePages = allCurrencies.length < totalCount;
            if (hasMorePages) {
                page = page + 1;
            }
        }
        const result: Dict = {};
        for (let currencyIndex = 0; currencyIndex < allCurrencies.length; currencyIndex++) {
            const currency = allCurrencies[currencyIndex];
            const coinCode = this.safeString (currency, 'code');
            if (coinCode === undefined) {
                continue;
            }
            const coinUpper = coinCode.toUpperCase ();
            const networks = this.safeList (currency, 'networks', []);
            for (let networkIndex = 0; networkIndex < networks.length; networkIndex++) {
                const networkEntry = networks[networkIndex];
                const networkCode = this.safeString (networkEntry, 'network');
                if (networkCode === undefined) {
                    continue;
                }
                const networkUpper = networkCode.toUpperCase ();
                const code = coinUpper + '@' + networkUpper;
                const precisionValue = this.safeInteger (networkEntry, 'precision');
                let precision = undefined;
                if (precisionValue !== undefined) {
                    precision = this.parseNumber (this.parsePrecision (this.numberToString (precisionValue)));
                }
                const isDefault = this.safeBool (networkEntry, 'isDefault', false);
                if (isDefault) {
                    defaultNetworks[coinUpper] = networkUpper;
                }
                result[code] = this.safeCurrencyStructure ({
                    'id': coinUpper + ':' + networkUpper,
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
                    'info': this.extend ({}, currency, networkEntry),
                });
            }
            if (!(coinUpper in defaultNetworks) && networks.length > 0) {
                const firstNetwork = this.safeString (networks[0], 'network');
                if (firstNetwork !== undefined) {
                    defaultNetworks[coinUpper] = firstNetwork.toUpperCase ();
                }
            }
        }
        this.options['defaultNetworks'] = defaultNetworks;
        return result;
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

    async probePairRate (baseParts: Dict, quoteParts: Dict, params = {}): Promise<Dict> {
        const request: Dict = {
            'coinFrom': this.safeString (baseParts, 'ticker'),
            'networkFrom': this.safeString (baseParts, 'network'),
            'coinTo': this.safeString (quoteParts, 'ticker'),
            'networkTo': this.safeString (quoteParts, 'network'),
            'amount': this.safeString (params, 'probeAmount', '1'),
            'rateType': this.safeString (params, 'rateType', 'float'),
        };
        const probeParams = this.omit (params, [ 'probeAmount', 'rateType' ]);
        return await this.publicGetRate (this.extend (this.extendRequestWithApiKey (request), probeParams));
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
            const parsed = await this.parseSymbolToParts (symbol, params);
            const baseParts = this.safeDict (parsed, 'baseParts', {});
            const quoteParts = this.safeDict (parsed, 'quoteParts', {});
            if (this.isEmpty (baseParts) || this.isEmpty (quoteParts)) {
                throw new BadSymbol (this.id + ' does not have market ' + symbol);
            }
            let rateLimits: Dict = {};
            try {
                const rateResponse = await this.probePairRate (baseParts, quoteParts, params);
                rateLimits = {
                    'minAmount': this.safeNumber (rateResponse, 'minAmount'),
                    'maxAmount': this.safeNumber (rateResponse, 'maxAmount'),
                };
            } catch (error) {
                if (error instanceof BadSymbol) {
                    throw error;
                }
                if (error instanceof InvalidOrder) {
                    rateLimits = {};
                } else {
                    throw error;
                }
            }
            const market = this.parseMarketFromParts (baseParts, quoteParts, symbol, rateLimits);
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
     * @name exolix#fetchMarkets
     * @description fetches markets; returns empty by default (markets loaded on demand)
     * @see https://exolix.com/developers
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of market structures
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        return [];
    }

    /**
     * @method
     * @name exolix#obLoadMarketsForSymbols
     * @description lazily resolves and populates this.markets for the given symbols
     * @see https://exolix.com/developers
     * @param {string[]} symbols list of unified market symbols
     * @param {boolean} reload when true, re-fetch symbols even if already cached in this.markets
     * @param {object} params extra parameters specific to the exchange API endpoint
     * @returns {object[]} empty list; ob_exolix returns fixed market status structures
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
     * @name exolix#fetchTicker
     * @description fetches a price ticker / estimate for a swap pair on Exolix
     * @see https://exolix.com/developers
     * @param {string} symbol unified market symbol, e.g. 'BTC@BTC/ETH@ETH'
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.amount] amount to estimate, defaults to '1'
     * @param {string} [params.rateType] float or fixed, defaults to float
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        const market = resolveResult['marketsBySymbol'][symbol];
        const marketInfo = this.safeDict (market, 'info', {});
        const amount = this.safeString (params, 'amount', '1');
        const rateType = this.safeString (params, 'rateType', 'float');
        params = this.omit (params, [ 'amount', 'rateType', 'probeAmount' ]);
        const request: Dict = {
            'coinFrom': this.safeString (marketInfo, 'coinFrom'),
            'networkFrom': this.safeString (marketInfo, 'networkFrom'),
            'coinTo': this.safeString (marketInfo, 'coinTo'),
            'networkTo': this.safeString (marketInfo, 'networkTo'),
            'amount': amount,
            'rateType': rateType,
        };
        const response = await this.publicGetRate (this.extend (this.extendRequestWithApiKey (request), params));
        return this.parseTicker (response, market);
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        const symbol = this.safeString (market, 'symbol');
        const last = this.safeString (ticker, 'toAmount');
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
     * @name exolix#createOrder
     * @description create a swap order on Exolix
     * @see https://exolix.com/developers
     * @param {string} symbol unified market symbol, e.g. 'BTC@BTC/ETH@ETH'
     * @param {string} type order type – 'market' (float) or 'limit' (fixed)
     * @param {string} side 'buy' or 'sell' – for swaps this is always 'sell' (sell base for quote)
     * @param {float} amount amount of the base currency to send
     * @param {float} [price] not used for Exolix standard flow
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} params.address_to destination address for the quote currency (required)
     * @param {string} [params.extraId] extra id or memo for the destination address
     * @param {string} [params.refund_address] refund address for the base currency
     * @param {string} [params.refundExtraId] extra id or memo for the refund address
     * @param {string} [params.rateType] float or fixed override
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        const resolveResult = await this.resolveMarkets ([ symbol ], params);
        const market = resolveResult['marketsBySymbol'][symbol];
        const marketInfo = this.safeDict (market, 'info', {});
        const addressTo = this.safeString (params, 'address_to');
        if (addressTo === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder() requires params.address_to – the destination address for the received currency');
        }
        let rateType = this.safeString (params, 'rateType');
        if (rateType === undefined) {
            rateType = (type === 'limit') ? 'fixed' : 'float';
        }
        const request: Dict = {
            'coinFrom': this.safeString (marketInfo, 'coinFrom'),
            'networkFrom': this.safeString (marketInfo, 'networkFrom'),
            'coinTo': this.safeString (marketInfo, 'coinTo'),
            'networkTo': this.safeString (marketInfo, 'networkTo'),
            'amount': this.numberToString (amount),
            'withdrawalAddress': addressTo,
            'rateType': rateType,
        };
        const extraId = this.safeString (params, 'extraId');
        if (extraId !== undefined) {
            request['withdrawalExtraId'] = extraId;
        }
        const refundAddress = this.safeString (params, 'refund_address');
        if (refundAddress !== undefined) {
            request['refundAddress'] = refundAddress;
        }
        const refundExtraId = this.safeString (params, 'refundExtraId');
        if (refundExtraId !== undefined) {
            request['refundExtraId'] = refundExtraId;
        }
        params = this.omit (params, [ 'address_to', 'extraId', 'refund_address', 'refundExtraId', 'rateType', 'probeAmount' ]);
        const response = await this.publicPostTransactions (this.extend (this.extendRequestWithApiKey (request), params));
        return this.parseOrder (response, market);
    }

    /**
     * @method
     * @name exolix#fetchOrder
     * @description fetch the status of an Exolix exchange/swap order
     * @see https://exolix.com/developers
     * @param {string} id the order / transaction id
     * @param {string} [symbol] unified market symbol (optional)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        const request: Dict = {
            'id': id,
        };
        let market = undefined;
        if (symbol !== undefined) {
            await this.loadMarkets ();
            market = this.market (symbol);
        }
        const response = await this.publicGetTransactionsId (this.extend (this.extendRequestWithApiKey (request), params));
        if (response === undefined || typeof response !== 'object') {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        const responseId = this.safeString (response, 'id');
        if (responseId === undefined) {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        return this.parseOrder (response, market);
    }

    buildSymbolFromCoins (coinFrom: Dict, coinTo: Dict): Str {
        const fromCode = this.safeString (coinFrom, 'coinCode');
        const fromNetwork = this.safeString (coinFrom, 'network');
        const toCode = this.safeString (coinTo, 'coinCode');
        const toNetwork = this.safeString (coinTo, 'network');
        if (fromCode === undefined || fromNetwork === undefined || toCode === undefined || toNetwork === undefined) {
            return undefined;
        }
        return fromCode.toUpperCase () + '@' + fromNetwork.toUpperCase () + '/' + toCode.toUpperCase () + '@' + toNetwork.toUpperCase ();
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const id = this.safeString (order, 'id');
        const coinFrom = this.safeDict (order, 'coinFrom', {});
        const coinTo = this.safeDict (order, 'coinTo', {});
        const parsedSymbol = this.buildSymbolFromCoins (coinFrom, coinTo);
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
        const amountFrom = this.safeString (order, 'amount');
        const amountTo = this.safeString (order, 'amountTo');
        const createdAt = this.safeString (order, 'createdAt');
        const timestamp = this.parse8601 (createdAt);
        return this.safeOrder ({
            'id': id,
            'clientOrderId': undefined,
            'info': order,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'lastUpdateTimestamp': timestamp,
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
        let url = this.urls['api']['rest'] + '/' + this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));
        headers = (headers === undefined) ? {} : headers;
        headers['Accept'] = 'application/json';
        const apiKey = this.resolveApiKey ();
        if (apiKey !== undefined) {
            headers['api-key'] = apiKey;
        }
        if (method === 'GET') {
            if (apiKey !== undefined) {
                query['apiKey'] = apiKey;
            }
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else if (method === 'POST') {
            if (apiKey !== undefined) {
                query['apiKey'] = apiKey;
            }
            if (Object.keys (query).length) {
                body = this.json (query);
                headers['Content-Type'] = 'application/json';
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
        const errorMessage = this.safeString2 (response, 'error', 'message');
        if (errorMessage !== undefined) {
            const errorLower = errorMessage.toLowerCase ();
            if (errorLower.indexOf ('not available') >= 0 || errorLower.indexOf ('pair') >= 0 && errorLower.indexOf ('unavailable') >= 0) {
                throw new BadSymbol (this.id + ' ' + errorMessage);
            }
            if (errorLower.indexOf ('min') >= 0 || errorLower.indexOf ('minimum') >= 0 || errorLower.indexOf ('less than') >= 0) {
                throw new InvalidOrder (this.id + ' ' + errorMessage);
            }
            if (httpCode === 401 || httpCode === 403) {
                throw new AuthenticationError (this.id + ' ' + body);
            }
            if (httpCode >= 400) {
                throw new BadRequest (this.id + ' ' + body);
            }
            throw new ExchangeError (this.id + ' ' + body);
        }
        return undefined;
    }
}
