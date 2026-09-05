
//  ---------------------------------------------------------------------------

import bingx from './bingx.js';
import { AuthenticationError, ExchangeError, OBIPWhitelistError, OBOrderUncancellableError, OrderNotFound, PermissionDenied } from './base/errors.js';
import type { Bool, Dict, Market, Order, Str, Trade } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_bingx
 * @augments bingx
 */
export default class ob_bingx extends bingx {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_bingx',
            'name': 'BingX',
            'certified': false,
            'urls': {
                'referral': 'https://bingx.com/invite/Z4UUVX',
            },
            'exceptions': {
                'exact': {
                    '100419': OBIPWhitelistError,
                    ' order not exist, NoRetry, RemoteInfo(100400,RetErr), ': OrderNotFound,
                    ' order not exist, NoRetry, RemoteInfo(100404,RetErr), ': OrderNotFound,
                },
                'broad': {
                    // bingx_exchange.py comment msg fragments (verbatim casing where quoted)
                    'the order you want to cancel is FILLED or CANCELLED already': OBOrderUncancellableError,
                    'the order is FILLED or CANCELLED already before': OBOrderUncancellableError,
                    'Incorrect apiKey': AuthenticationError,
                    'Permission denied as the API key was created without the permission': PermissionDenied,
                    'Spot Trading permission': PermissionDenied,
                    'does not match IP whitelist': OBIPWhitelistError,
                    'IP does not match IP whitelist': OBIPWhitelistError,
                },
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': true,
                'future': false,
                'option': false,
                'fetchAccountId': true,
                'fetchPermissions': true,
                'getOrdersBrokerParameters': true,
                'isAuthenticatedRequest': true,
            },
            'options': {
                'broker': 'OctoBot',
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
                    'fixMarketStatus': true,
                    'canHaveDelayedCancelledOrders': true,
                    'requireRecentTradesFromClosedOrders': true,
                    'closedOrdersFetchUseCcxtPaginate': true,
                    'adjustForTimeDifference': true,
                    'hasBroker': true,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        const rights: string[] = [ 'reading' ];
        try {
            await this.cancelOrder ('12345', 'BTC/USDT');
            return rights;
        } catch (e) {
            const txt = String (e).toLowerCase ();
            if (txt.indexOf ('incorrect apikey') >= 0) {
                throw new AuthenticationError (this.id + ' ' + String (e));
            }
            if (e instanceof AuthenticationError) {
                if (txt.indexOf ('permission') >= 0 || txt.indexOf ('denied') >= 0) {
                    return rights;
                }
                throw e;
            }
            if (e instanceof ExchangeError) {
                if (txt.indexOf ('permission') >= 0 || txt.indexOf ('denied') >= 0) {
                    return rights;
                }
                rights.push ('spotTrading');
                rights.push ('marginTrading');
                rights.push ('futuresTrading');
                return rights;
            }
            throw e;
        }
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        const resp = await this.accountV1PrivateGetUid (params);
        const data = this.safeDict (resp, 'data', {});
        return this.safeString (data, 'uid');
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'restSignatureInHeadersJsonOrInUrl', {});
    }

    /**
     * OctoBot BingxCCXTAdapter._update_stop_order_or_trade_type_and_price (orders and trades).
     * @name ob_bingx#adaptBingxStopOrderOrTradeTypeAndPrice
     * @param parsed
     * @param logContext
     */
    adaptBingxStopOrderOrTradeTypeAndPrice (parsed: Dict, logContext: Str = 'ob_bingx.parseOrder') {
        // Step 1: only adjust when BingX stop-loss quote field is present
        const stopPrice = this.safeNumber (parsed, 'stopLossPrice');
        if (stopPrice === undefined || stopPrice === 0) {
            return;
        }
        // Step 2: creation price from raw info or unified price
        const orderInfo = this.safeDict (parsed, 'info', {});
        const creationPriceRaw = this.safeString (orderInfo, 'price');
        const fallbackPrice = this.safeString (parsed, 'price');
        let creationPriceString = fallbackPrice;
        if (creationPriceRaw !== undefined) {
            creationPriceString = creationPriceRaw;
        }
        const orderCreationPrice = this.parseNumber (creationPriceString);
        const isSelling = this.safeStringLower (parsed, 'side') === 'sell';
        // use stop price price to parse it properly
        parsed['price'] = stopPrice;
        const currentType = this.safeStringLower (parsed, 'type');
        // Step 3: take_stop_limit cannot be classified vs TP here
        if (currentType === 'take_stop_limit') {
            // unsupported: no way to tell stop loss vs take profit from take_stop_limit(trigger above or below)
            parsed['type'] = 'unsupported';
            this.log (logContext, 'Unsupported order fetched: ' + this.json (parsed));
            return;
        }
        // Step 4: infer trigger direction and unified type from stop vs creation and side
        let triggerAbove = false;
        let orderType = 'limit';
        if (currentType === 'take_stop_market') {
            orderType = 'stop_loss';
            triggerAbove = !isSelling; // for stop orders, trigger above when buying
        } else {
            if (orderCreationPrice === undefined) {
                return;
            }
            if (stopPrice <= orderCreationPrice) {
                triggerAbove = false;
                if (isSelling) {
                    orderType = 'stop_loss';
                    parsed['stopPrice'] = stopPrice;
                } else {
                    orderType = 'limit';
                }
            } else {
                triggerAbove = true;
                if (isSelling) {
                    orderType = 'limit';
                } else {
                    orderType = 'stop_loss';
                    parsed['stopPrice'] = stopPrice;
                }
            }
        }
        parsed['triggerAbove'] = triggerAbove;
        parsed['type'] = orderType;
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // Shared with parseTrade via adaptBingxStopOrderOrTradeTypeAndPrice (BingxCCXTAdapter._update_stop_order_or_trade_type_and_price).
        const parsed = super.parseOrder (order, market) as Dict;
        this.adaptBingxStopOrderOrTradeTypeAndPrice (parsed, 'ob_bingx.parseOrder');
        return parsed as Order;
    }

    parseTrade (trade: Dict, market: Market = undefined): Trade {
        const parsed = super.parseTrade (trade, market) as Dict;
        this.adaptBingxStopOrderOrTradeTypeAndPrice (parsed, 'ob_bingx.parseTrade');
        return parsed as Trade;
    }

    parseMarket (market: Dict): Market {
        // override the standard parseMarket to apply OctoBot's BingxCCXTAdapter.fix_market_status:
        // bingx min and max quantity should be ignored
        // https://bingx-api.github.io/docs/#/en-us/spot/market-api.html#Spot%20trading%20symbols
        const parsed = super.parseMarket (market) as Dict;
        if (!parsed) {
            return parsed as Market;
        }
        const limits = this.safeDict (parsed, 'limits', {}) as Dict;
        const amountLimits = this.safeDict (limits, 'amount', {}) as Dict;
        amountLimits['min'] = 0;
        amountLimits['max'] = undefined;
        limits['amount'] = amountLimits;
        parsed['limits'] = limits;
        return parsed as Market;
    }
}
