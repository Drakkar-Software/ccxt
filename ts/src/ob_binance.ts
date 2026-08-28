
//  ---------------------------------------------------------------------------

import binance from './binance.js';
import { AuthenticationError, ExchangeError, NotSupported, OBOrderUncancellableError, OrderImmediatelyFillable, PermissionDenied } from './base/errors.js';
import type { Bool, Dict, FundingRate, Int, Market, Num, Order, OrderSide, OrderType, Str, Trade } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_binance
 * @augments binance
 */
export default class ob_binance extends binance {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_binance',
            'name': 'Binance',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'exact': {
                    'Order would immediately trigger.': OrderImmediatelyFillable,
                    'Unknown order sent.': OBOrderUncancellableError,
                },
                'broad': {
                    // binance_exchange.py comment examples (full msg casing)
                    'Invalid API-key, IP, or permissions for action.': PermissionDenied,
                    'This symbol is not permitted for this account.': PermissionDenied,
                    'Symbol not whitelisted for API key.': PermissionDenied,
                },
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': true,
                'option': true,
                'fetchAccountId': true,
                'fetchPermissions': true,
                'fetchStopOrderInDifferentRequest': true,
                'getMaxOpenOrdersCount': true,
                'getOrdersBrokerParameters': true,
                'isAuthenticatedRequest': true,
                'supportsNativeEditOrder': true,
                'usesDemoTradingInsteadOfSandbox': true,
            },
            'options': {
                // OctoBot binance_exchange.py CCXT_OPTIONS (connector may still narrow fetchMarkets when FETCH_MIN_EXCHANGE_MARKETS).
                'quoteOrderQty': true, // enable quote conversion for market orders
                'recvWindow': 60000, // default is 10000, avoid time related issues
                'fetchPositions': 'account', // required to fetch empty positions as well
                'filterClosed': false, // return empty positions as well
                'octobot': {
                    'supportedElements': {
                        'spot': {
                            'orders': [ 'market', 'limit', 'stop_loss' ],
                            'bundled_orders': {},
                        },
                        'futures': {
                            'orders': [ 'market', 'limit', 'stop_loss' ],
                            'bundled_orders': {},
                        },
                    },
                    'fixMarketStatus': true,
                    'requireOrderFeesFromTrades': true,
                    'supportsSetMarginTypeOnOpenPositions': false,
                    'supportsCustomLimitOrderBookFetch': true,
                    'enableSpotBuyMarketWithCost': true,
                    'adjustForTimeDifference': true,
                    'localFeeCurrency': 'BNB',
                    'defaultQuoteCurrency': 'USDC',
                    'stopLossEditPriceParam': 'stopPrice',
                    'hasBroker': true,
                    'myTradesFetchUseCcxtPaginate': true,
                    'requiresStopParamToFetchOrder': true,
                    'requiresStopParamToCancelOrder': true,
                },
                'broker': {
                    'spot': 'x-HR452G85',
                    'swap': 'x-uquVg2pc',
                    'future': 'x-uquVg2pc',
                },
            },
        });
    }

    /**
     * Spot market sells keep base quantity; strip reference price before delegating (OctoBot Binance parity).
     * @name ob_binance#createOrderRequest
     * @param symbol Symbol passed through.
     * @param type Order type passed through.
     * @param side Order side passed through.
     * @param amount Amount passed through.
     * @param price Optional limit/reference price (cleared for spot market sells).
     * @param params Extra parameters passed through.
     * @returns Result of parent `createOrderRequest`.
     */
    createOrderRequest (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}) {
        const market = this.market (symbol);
        let effectivePrice = price;
        if (this.safeBool (market as Dict, 'spot', false) && type.toUpperCase () === 'MARKET' && side.toUpperCase () === 'SELL') {
            // Spot market sell uses base quantity; do not derive quoteOrderQty from a reference price (binance#createOrderRequest MARKET branch).
            effectivePrice = undefined;
        }
        return super.createOrderRequest (symbol, type, side, amount, effectivePrice, params);
    }

    /**
     * Binance futures use demo trading instead of classic sandbox (OctoBot binance tentacle); accept `futures` spelling too.
     * @name ob_binance#usesDemoTradingInsteadOfSandbox
     * @param exchangeType Exchange subtype string from options or caller.
     * @returns Whether demo-trading semantics apply (`future` / `futures`).
     */
    usesDemoTradingInsteadOfSandbox (exchangeType: Str): Bool {
        const normalized = String (exchangeType || '').toLowerCase ();
        return (normalized === 'future') || (normalized === 'futures');
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        try {
            const restrictions = await this.sapiGetAccountApiRestrictions (params);
            const rights: string[] = [];
            if (this.safeBool (restrictions, 'enableReading')) {
                rights.push ('reading');
            }
            if (this.safeBool (restrictions, 'enableSpotAndMarginTrading')) {
                rights.push ('spotTrading');
                rights.push ('marginTrading');
            }
            if (this.safeBool (restrictions, 'enableFutures')) {
                rights.push ('futuresTrading');
            }
            if (this.safeBool (restrictions, 'enableWithdrawals')) {
                rights.push ('withdrawals');
            }
            const internalTransfersEnabled = this.safeBool (restrictions, 'enableInternalTransfer');
            const universalTransfersEnabled = this.safeBool (restrictions, 'permitsUniversalTransfer');
            const unifiedTransfersGranted = internalTransfersEnabled || universalTransfersEnabled;
            if (unifiedTransfersGranted && !this.inArray ('withdrawals', rights)) {
                rights.push ('withdrawals');
            }
            return rights;
        } catch (caughtRestrictionError) {
            if (caughtRestrictionError instanceof NotSupported) {
                const sandbox = this.safeBool (this.options, 'enableDemoTrading', false);
                if (sandbox) {
                    return [ 'reading', 'spotTrading', 'futuresTrading', 'marginTrading' ];
                }
                throw caughtRestrictionError;
            }
            const messageTxt = String (caughtRestrictionError);
            const messageLower = messageTxt.toLowerCase ();
            if (messageLower.indexOf ('invalid') >= 0 && messageLower.indexOf ('key') >= 0) {
                throw new AuthenticationError (this.id + ' ' + messageTxt);
            }
            throw caughtRestrictionError;
        }
    }

    supportsNativeEditOrder (order_type: Str, symbol: Str): Bool {
        const normalizedOrderType = String (order_type).toUpperCase ();
        const isStopOrder = (normalizedOrderType === 'STOP_LOSS') || (normalizedOrderType === 'STOP_LOSS_LIMIT');
        const market = this.market (symbol);
        const marketDetails = market as Dict;
        const isFuturesMarket = this.safeBool2 (marketDetails, 'future', 'swap', false);
        const isContractMarket = this.safeBool (marketDetails, 'contract', false);
        const isFuturesLikeMarket = isFuturesMarket || isContractMarket;
        if (isFuturesLikeMarket && isStopOrder) {
            return false;
        }
        return true;
    }

    fetchStopOrderInDifferentRequest (symbol: Str): Bool {
        // Override in tentacles when stop orders need to be fetched in a separate request from CCXT.
        // Binance futures uses the algo orders endpoint for stop orders (but not for inverse orders).
        const defaultTradingType = this.safeString2 (this.options, 'defaultType', 'defaultSubType', '');
        const isFutureExchangeMode = (defaultTradingType === 'swap' || defaultTradingType === 'future');
        const market = this.market (symbol) as Dict;
        const isInverseContract = this.safeBool (market, 'inverse', false);
        return isFutureExchangeMode && !isInverseContract;
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
    }

    getMaxOpenOrdersCount (symbol: string, params = {}, _ccxtTypesImportInt: Int = undefined): Int {
        return this.obGetMaxOpenOrdersCountFromExchangeInfoFilters (symbol, params, 'ob_binance.getMaxOpenOrdersCount');
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        const fromParams = this.safeBool2 (params, 'isFuture', 'future', undefined);
        let isFuture = false;
        if (fromParams !== undefined) {
            isFuture = fromParams;
        } else {
            const t = this.safeString2 (this.options, 'defaultType', 'defaultSubType', '');
            isFuture = (t === 'swap' || t === 'future');
        }
        if (isFuture) {
            const raw = await this.fapiPrivateV3GetBalance (params);
            const row = Array.isArray (raw) && raw.length ? raw[0] : {};
            const alias = this.safeString (row as Dict, 'accountAlias');
            if (alias === undefined) {
                throw new ExchangeError (this.id + ' missing futures accountAlias');
            }
            return alias;
        }
        const bal = await this.fetchBalance (params);
        const info = this.safeDict (bal as Dict, 'info');
        const uid = this.safeString (info, 'uid');
        if (uid === undefined) {
            throw new ExchangeError (this.id + ' missing spot uid');
        }
        return uid;
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'urlBodySignature', {});
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's BinanceCCXTAdapter.fix_order logic:
        // 1) call the standard parseOrder
        // 2) rewrite "PENDING_NEW" status as "open" (binance returns this for old open orders)
        // 3) re-tag stop / take-profit orders that ccxt does not flag as such, force their price
        //    to the trigger price and compute triggerAbove from the side
        const parsed = super.parseOrder (order, market) as Dict;
        if (this.safeString (parsed, 'status') === 'PENDING_NEW') {
            // PENDING_NEW orders are old orders on binance and should be considered as open
            parsed['status'] = 'open';
        }
        this.adaptOrderType (parsed);
        return parsed as Order;
    }

    parseTrade (trade: Dict, market: Market = undefined): Trade {
        // override the standard parseTrade to apply OctoBot's BinanceCCXTAdapter.fix_trades:
        // every trade returned by the exchange is a closed (executed) fill, force the status
        const parsed = super.parseTrade (trade, market) as Dict;
        parsed['status'] = 'closed';
        return parsed as Trade;
    }

    parseFundingRate (contract, market: Market = undefined): FundingRate {
        // override the standard parseFundingRate to apply OctoBot's BinanceCCXTAdapter.parse_funding_rate:
        // binance does not provide the previous funding time, derive it from the upcoming funding
        // timestamp (ccxt's fundingTimestamp, taken from raw nextFundingTime) by subtracting
        // the default 8h funding interval
        const parsed = super.parseFundingRate (contract, market) as Dict;
        const fundingTimestamp = this.safeInteger (parsed, 'fundingTimestamp');
        if (fundingTimestamp !== undefined) {
            const intervalMs = 8 * 60 * 60 * 1000;
            const previousFundingTimestamp = Math.max (fundingTimestamp - intervalMs, 0);
            parsed['previousFundingTimestamp'] = previousFundingTimestamp;
            parsed['previousFundingDatetime'] = this.iso8601 (previousFundingTimestamp);
        }
        return parsed as FundingRate;
    }

    adaptOrderType (parsed: Dict): Dict {
        const stopOrders = [
            'stop_market', 'stop',              // futures
            'stop_loss', 'stop_loss_limit',     // spot
        ];
        const takeProfitOrders = [
            'take_profit_market', 'take_profit_limit',  // futures
            'take_profit',                              // spot
        ];
        const orderInfo = this.safeDict (parsed, 'info', {});
        const rawType = this.safeStringLower2 (orderInfo, 'type', 'orderType', '');
        const isStop = this.inArray (rawType, stopOrders);
        const isTp = this.inArray (rawType, takeProfitOrders);
        if (!isStop && !isTp) {
            return parsed;
        }
        const triggerPrice = this.safeNumber (parsed, 'triggerPrice');
        if (triggerPrice === undefined || triggerPrice === 0) {
            this.log (
                'ob_binance.parseOrder',
                'Unknown binance order: stop order with no trigger price, order: ' + this.json (parsed)
            );
            return parsed;
        }
        const selling = this.safeStringLower (parsed, 'side') === 'sell';
        let updatedType: Str = 'unknown';
        let triggerAbove = false;
        if (isStop) {
            updatedType = 'stop_loss';
            // force price to trigger price
            parsed['price'] = triggerPrice;
            triggerAbove = !selling;    // sell stop loss triggers when price is lower than target
        } else if (isTp) {
            // take profits are not yet handled as such: consider them as limit orders
            updatedType = 'limit';      // waiting for TP handling
            if (!parsed['price']) {
                parsed['price'] = triggerPrice;     // waiting for TP handling
            }
            triggerAbove = selling;     // sell take profit triggers when price is higher than target
        }
        // stop loss and take profits are not tagged as such by ccxt, force it
        parsed['type'] = updatedType;
        parsed['triggerAbove'] = triggerAbove;
        return parsed;
    }
}
