
//  ---------------------------------------------------------------------------

import coinbase from './coinbase.js';
import { AuthenticationError, ArgumentsRequired, BadSymbol, ExchangeError, InvalidNonce, OBInternalSyncError, OperationFailed, OrderNotFound, PermissionDenied } from './base/errors.js';
import { Precise } from './base/Precise.js';
import type { Balances, Bool, Dict, Market, NullableDict, Num, Order, OrderSide, OrderType, Str, Ticker, Trade } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_coinbase
 * @augments coinbase
 */
export default class ob_coinbase extends coinbase {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_coinbase',
            'name': 'Coinbase Advanced',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'exact': {
                    'not_found': OrderNotFound,
                    '429': OperationFailed, // should instantly retry
                },
                'broad': {
                    // coinbase_exchange.py comment message / error_details casing
                    'Missing required scopes': PermissionDenied,
                    'Permission is required': PermissionDenied,
                    'target is not enabled for trading': PermissionDenied,
                    'User is not allowed to convert crypto': PermissionDenied,
                    'account is not available': OBInternalSyncError,
                    'orderID was not found': OrderNotFound,
                },
            },
            'has': {
                'CORS': true,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'fetchAccountId': true,
                'fetchPermissions': true,
                'getOrdersBrokerParameters': true,
                'isAuthenticatedRequest': true,
                'supportsNativeEditOrder': true,
            },
            'options': {
                'maxRetriesOnFailure': 5,
                'maxRetriesOnFailureDelay': 0,
                'brokerId': 'octobot',
                'octobot': {
                    'supportedElements': {
                        'spot': {
                            'orders': [ 'market', 'limit', 'stop_loss' ],
                            'bundled_orders': {},
                        },
                        'futures': {
                            'orders': [ 'market', 'limit' ],
                            'bundled_orders': {},
                        },
                    },
                    'isSkippingEmptyCandlesInOhlcvFetch': true,
                    'fixMarketStatus': true,
                    'enableSpotBuyMarketWithCost': true,
                    'adjustForTimeDifference': true,
                    'defaultQuoteCurrency': 'USDC',
                    'hasBroker': true,
                    'myTradesFetchUseCcxtPaginate': true,
                },
            },
        });
    }

    sign (path, api: any = [], method = 'GET', params = {}, headers: NullableDict = undefined, body: Str = undefined) {
        try {
            return super.sign (path, api, method, params, headers, body);
        } catch (e) {
            const errorMessage = String (e);
            if (errorMessage.indexOf ('Unable to load PEM') >= 0 || errorMessage.indexOf ('MalformedFraming') >= 0) {
                throw new AuthenticationError (this.id + ' invalid key format: ' + errorMessage);
            }
            throw e;
        }
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        const rights: string[] = [ 'reading' ];
        try {
            await this.cancelOrder ('8bb80a81-27f7-4415-aa50-911ea46d841c', 'BTC/USDT');
            return rights;
        } catch (e) {
            if (e instanceof PermissionDenied) {
                return rights;
            }
            if ((e instanceof BadSymbol) || (e instanceof OperationFailed) || (e instanceof AuthenticationError) || (e instanceof InvalidNonce)) {
                throw e;
            }
            if (e instanceof ArgumentsRequired) {
                throw new AuthenticationError (this.id + ' ' + String (e.message));
            }
            if (!(e instanceof ExchangeError)) {
                throw e;
            }
            const low = String (e).toLowerCase ();
            if (low.indexOf ('permission') >= 0 && (low.indexOf ('denied') >= 0 || low.indexOf ('trading') >= 0)) {
                return rights;
            }
            rights.push ('spotTrading');
            rights.push ('marginTrading');
            rights.push ('futuresTrading');
            return rights;
        }
    }

    async fetchBalance (params = {}): Promise<Balances> {
        // warning: sometimes has unexpected delays after creating / filling orders
        if (!('v3' in params)) {
            // use v3 to get free and total amounts (default is only returning free amounts)
            params['v3'] = true;
        }
        return await super.fetchBalance (params);
    }

    supportsNativeEditOrder (order_type: Str, symbol: Str): Bool {
        const normalizedOrderType = String (order_type).toUpperCase ();
        const isStopOrder = (normalizedOrderType === 'STOP_LOSS') || (normalizedOrderType === 'STOP_LOSS_LIMIT');
        return !isStopOrder;
    }

    /**
     * Coinbase only supports stop-limit orders, not stop-market (`coinbase#createOrder` throws).
     * OctoBot `Coinbase._create_market_stop_loss_order`: limit stop-loss with limit = trigger * 0.98
     * (STOP_LIMIT_ORDER_INSTANT_FILL_PRICE_RATIO in coinbase_exchange.py).
     * @name ob_coinbase#createOrder
     * @param symbol Symbol passed through.
     * @param type Order type passed through (market stop-loss is rewritten to limit).
     * @param side Order side passed through.
     * @param amount Amount passed through.
     * @param price Limit price passed through when no stop-loss synthesis applies.
     * @param params Extra parameters (`stopLossPrice` / `stopPrice` trigger handling).
     * @returns Created order from the underlying Coinbase implementation.
     */
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        const normalizedType = String (type).toUpperCase ();
        if (normalizedType === 'MARKET') {
            const stopLossPrice = this.safeNumber (params, 'stopLossPrice');
            const triggerFromParams = this.safeNumberN (params, [ 'stopPrice', 'stop_price', 'triggerPrice' ]);
            const takeProfitPrice = this.safeNumber (params, 'takeProfitPrice');
            if (takeProfitPrice === undefined) {
                const stopTrigger = (stopLossPrice !== undefined) ? stopLossPrice : triggerFromParams;
                if (stopTrigger !== undefined) {
                    const limitPriceString = Precise.stringMul (this.numberToString (stopTrigger), '0.98');
                    const limitPrice = parseFloat (limitPriceString);
                    const rest = this.omit (params, [ 'stopPrice', 'stop_price', 'triggerPrice', 'stopLossPrice' ]);
                    const merged = this.extend (rest, { 'stopLossPrice': stopTrigger });
                    return await super.createOrder (symbol, 'limit', side, amount, limitPrice, merged);
                }
            }
        }
        return await super.createOrder (symbol, type, side, amount, price, params);
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        try {
            const accounts = await this.fetchAccounts (params);
            const portfolioIds = {};
            const portfolioInfos = [];
            for (let idx = 0; idx < accounts.length; idx++) {
                const accountEntry = accounts[idx];
                const info = this.safeDict (accountEntry, 'info');
                const retailPortfolioId = this.safeString (info, 'retail_portfolio_id');
                if (retailPortfolioId !== undefined && retailPortfolioId !== '') {
                    portfolioIds[retailPortfolioId] = true;
                    portfolioInfos.push (info);
                }
            }
            const uniqueIds = Object.keys (portfolioIds);
            if (uniqueIds.length === 1) {
                return uniqueIds[0];
            }
            if (uniqueIds.length === 0) {
                return 'default_account_id';
            }
            let oldestPortfolioInfo = portfolioInfos[0];
            const oldestInitialParsed = this.parse8601 (this.safeString (oldestPortfolioInfo, 'created_at', ''));
            let oldestCreatedAtMs = Number.MAX_SAFE_INTEGER;
            if (oldestInitialParsed !== undefined) {
                oldestCreatedAtMs = oldestInitialParsed;
            }
            for (let portfolioIdx = 1; portfolioIdx < portfolioInfos.length; portfolioIdx++) {
                const portfolioInfoRow = portfolioInfos[portfolioIdx];
                const createdParsed = this.parse8601 (this.safeString (portfolioInfoRow, 'created_at', ''));
                if (createdParsed === undefined) {
                    continue;
                }
                if (createdParsed < oldestCreatedAtMs) {
                    oldestCreatedAtMs = createdParsed;
                    oldestPortfolioInfo = portfolioInfoRow;
                }
            }
            const resolvedRetailPortfolioId = this.safeString (oldestPortfolioInfo, 'retail_portfolio_id');
            if (resolvedRetailPortfolioId !== undefined) {
                return resolvedRetailPortfolioId;
            }
            return 'default_account_id';
        } catch (e) {
            if (e instanceof AuthenticationError) {
                throw e;
            }
            return 'default_account_id';
        }
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'headersJsonAny', {
            'needles': [ 'CB-ACCESS-SIGN', 'Authorization' ],
        });
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's CoinbaseCCXTAdapter:
        // 1) call the standard parseOrder
        // 2) re-tag stop orders using info.order_configuration.stop_direction (stop_loss vs limit, triggerAbove)
        // 3) infer a missing type from price / stopPrice (UNKNOWN_ORDER_TYPE in the raw response)
        // 4) translate "PENDING" / "CANCEL_QUEUED" statuses to OctoBot equivalents
        // 5) fallback amount to filled when missing
        // 6) coinbase-specific fee.currency: when missing, use the symbol quote (CoinbaseCCXTAdapter._register_exchange_fees)
        const parsed = super.parseOrder (order, market) as Dict;
        this.adaptStopOrderTypeAndPrice (parsed);
        if (this.safeString (parsed, 'type') === undefined) {
            const stopPrice = this.safeNumber (parsed, 'stopPrice');
            const price = this.safeNumber (parsed, 'price');
            let inferredType: Str = 'limit';
            if (stopPrice !== undefined && stopPrice !== 0) {
                // stop price set: stop order
                inferredType = 'stop_loss';
            } else if (price === undefined) {
                // price not set: market order
                inferredType = 'market';
            } else {
                // price is set and stop price is not: limit order
                inferredType = 'limit';
            }
            parsed['type'] = inferredType;
        }
        const status = this.safeString (parsed, 'status');
        if (status === 'PENDING') {
            parsed['status'] = 'pending_creation';
        } else if (status === 'CANCEL_QUEUED') {
            parsed['status'] = 'pending_cancel';
        }
        const amount = this.safeNumber (parsed, 'amount');
        const filled = this.safeNumber (parsed, 'filled');
        if ((amount === undefined || amount === 0) && filled !== undefined && filled !== 0) {
            parsed['amount'] = filled;
        }
        const fee = this.safeDict (parsed, 'fee') as Dict;
        if (fee !== undefined && this.safeString (fee, 'currency') === undefined) {
            // fees currency are not provided, they are always in quote on Coinbase
            const quoteCcy = this.obQuoteFromSymbol (this.safeString (parsed, 'symbol', ''));
            if (quoteCcy !== '') {
                fee['currency'] = quoteCcy;
                parsed['fee'] = fee;
            }
        }
        return parsed as Order;
    }

    parseTrade (trade: Dict, market: Market = undefined): Trade {
        // override the standard parseTrade to apply OctoBot's CoinbaseCCXTAdapter.fix_trades:
        // 1) re-tag stop trades using the translated stop-order helper
        // 2) every trade returned by the exchange is a closed (executed) fill, force the status
        // 3) when amount is missing but cost and price are set, convert amount to base units
        const parsed = super.parseTrade (trade, market) as Dict;
        this.adaptStopOrderTypeAndPrice (parsed);
        parsed['status'] = 'closed';
        const amount = this.safeNumber (parsed, 'amount');
        const cost = this.safeNumber (parsed, 'cost');
        const price = this.safeNumber (parsed, 'price');
        if (amount === undefined && cost !== undefined && cost !== 0 && price !== undefined && price !== 0) {
            // convert amount to have the same units as every other exchange
            parsed['amount'] = cost / price;
        }
        return parsed as Trade;
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's CoinbaseCCXTAdapter.fix_ticker:
        // coinbase tickers may be returned with no timestamp, fall back to the current time
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
        }
        return parsed as Ticker;
    }

    adaptStopOrderTypeAndPrice (parsed: Dict): Dict {
        // CoinbaseCCXTAdapter._update_stop_order_or_trade_type_and_price:
        // when stopPrice is set and the type is not already a known stop/take-profit, decode the
        // stop_direction from info.order_configuration.stop_limit_stop_limit_gtc|gtd to set
        // type / triggerAbove, and force price to stopPrice
        const stopPrice = this.safeNumber (parsed, 'stopPrice');
        if (stopPrice === undefined || stopPrice === 0) {
            return parsed;
        }
        const currentType = this.safeStringLower (parsed, 'type');
        if (currentType === 'stop_loss' || currentType === 'take_profit') {
            return parsed;
        }
        // use stop price as order price to parse it properly
        parsed['price'] = stopPrice;
        let orderType: Str = 'stop_loss';
        let triggerAbove = false;
        const orderInfo = this.safeDict (parsed, 'info', {}) as Dict;
        const orderConfig = this.safeDict (orderInfo, 'order_configuration', {}) as Dict;
        const stopConfigGtc = this.safeDict (orderConfig, 'stop_limit_stop_limit_gtc') as Dict;
        const stopConfigGtd = this.safeDict (orderConfig, 'stop_limit_stop_limit_gtd') as Dict;
        const stopConfig = (stopConfigGtc !== undefined) ? stopConfigGtc : stopConfigGtd;
        if (stopConfig !== undefined) {
            const stopDirection = this.safeStringLower (stopConfig, 'stop_direction', '');
            if (stopDirection.indexOf ('down') >= 0) {
                triggerAbove = false;
            } else if (stopDirection.indexOf ('up') >= 0) {
                triggerAbove = true;
            } else {
                this.log ('ob_coinbase.parseOrder', 'Unknown order direction: ' + stopDirection + ' (' + this.json (parsed) + ')');
            }
            const side = this.safeStringLower (parsed, 'side');
            if (side === 'sell') {
                if (triggerAbove) {
                    // take profits are not yet handled as such: consider them as limit orders
                    orderType = 'limit';    // waiting for TP handling
                } else {
                    orderType = 'stop_loss';
                }
            } else if (side === 'buy') {
                if (triggerAbove) {
                    orderType = 'stop_loss';
                } else {
                    // take profits are not yet handled as such: consider them as limit orders
                    orderType = 'limit';    // waiting for TP handling
                }
            }
        } else {
            this.log ('ob_coinbase.parseOrder', 'missing expected coinbase order config: ' + this.json (parsed));
        }
        parsed['type'] = orderType;
        parsed['triggerAbove'] = triggerAbove;
        return parsed;
    }

    obQuoteFromSymbol (symbolStr: Str): Str {
        // extract the quote currency from a unified symbol like "BTC/USD" or "BTC/USDT:USDT"
        if (symbolStr === undefined || symbolStr === '') {
            return '';
        }
        const parts = symbolStr.split ('/');
        if (parts.length < 2) {
            return '';
        }
        const quoteAndSettle = parts[1];
        const quoteParts = quoteAndSettle.split (':');
        return quoteParts[0];
    }
}
