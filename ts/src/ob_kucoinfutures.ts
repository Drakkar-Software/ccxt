
//  ---------------------------------------------------------------------------

import kucoinfutures from './kucoinfutures.js';
import { OBClosedPositionError, OBIPWhitelistError, OBOrderUncancellableError, PermissionDenied, OperationFailed } from './base/errors.js';
import type { Bool, Dict, FundingRate, Int, Market, Order, Str, Ticker, Trade } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_kucoinfutures extends kucoinfutures {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_kucoinfutures',
            'name': 'KuCoin Futures',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'exact': {
                    'order_not_exist_or_not_allow_to_cancel': OBOrderUncancellableError,
                    'Order cannot be canceled.': OBOrderUncancellableError,
                    'Order cannot be cancelled.': OBOrderUncancellableError,
                    '300009': OBClosedPositionError,
                    '429000': OperationFailed, // should instantly retry
                },
                'broad': {
                    // OctoBot tentacle comments (API msg casing), not lowercase tuple fragments
                    'Invalid request ip': OBIPWhitelistError,
                    'Unfortunately, trading is currently unavailable in your location due to country, region, or IP restrictions.': PermissionDenied,
                    'Access denied, require more permission': PermissionDenied,
                    'No open positions to close': OBClosedPositionError,
                },
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': false,
                'option': false,
                'fetchAccountId': true,
                'fetchPermissions': true,
                'fetchStopOrderInDifferentRequest': true,
                'getMaxOpenOrdersCount': true,
                'getOrdersBrokerParameters': true,
                'isAuthenticatedRequest': true,
                'supportsNativeEditOrder': true,
            },
            'options': {
                'maxRetriesOnFailure': 5,
                'maxRetriesOnFailureDelay': 0,
                'partner': {
                    'spot': {
                        'id': 'Octobot',
                        'key': '0782058c-8c05-45f1-bfe1-840e2f96335a',
                    },
                    'future': {
                        'id': 'Octobotfutures',
                        'key': '018e58ef-d9ac-4c8e-9646-0afa7fa9e37c',
                    },
                },
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
                    'removeMarketStatusPriceLimits': true,
                    'adaptMarketStatusForContractSize': true,
                    'canHaveDelayedOpenOrders': true,
                    'canHaveDelayedCancelledOrders': true,
                    'canMakeAuthenticatedRequestsWhenLoadingMarkets': true,
                    'enableSpotBuyMarketWithCost': true,
                    'canMissTickersInAllTickers': true,
                    'requiresSymbolForEmptyPosition': true,
                    'supportsSetMarginTypeOnOpenPositions': false,
                    'allowTradesFromClosedOrders': true,
                    'adjustForTimeDifference': true,
                    'localFeeCurrency': 'KCS',
                    'maxIncreasedPositionQuantityMultiplier': 0.95,
                    'hasBroker': true,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        return await this.obFetchPermissionsImaginaryCancel ('12345', 'BTC/USDT', params, 'pair');
    }

    async fetchOpenOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        let effectiveLimit = limit;
        if (effectiveLimit === undefined) {
            // Keep OctoBot Kucoin tentacle behavior: use 200 instead of ccxt's default 50.
            effectiveLimit = 200;
        }
        return await super.fetchOpenOrders (symbol, since, effectiveLimit, params);
    }

    supportsNativeEditOrder (_order_type: Str, symbol: Str): Bool {
        return false;
    }

    fetchStopOrderInDifferentRequest (symbol: Str): Bool {
        // Override in tentacles when stop orders need to be fetched in a separate request from CCXT.
        // Kucoin uses the algo orders endpoint for all stop orders.
        return true;
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
    }

    getMaxOpenOrdersCount (symbol: string, params = {}, _ccxtTypesImportInt: Int = undefined): Int {
        return 100;
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'headersJsonAny', {
            'needles': [ 'KC-API-SIGN' ],
        });
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        const fromParams = this.safeBool2 (params, 'isFuture', 'future', undefined);
        let futuresSuffixNeeded = false;
        if (fromParams !== undefined) {
            futuresSuffixNeeded = fromParams;
        } else {
            const t = this.safeString2 (this.options, 'defaultType', 'defaultSubType', '');
            futuresSuffixNeeded = (t === 'swap' || t === 'future');
        }
        try {
            const subAccounts = await this.privateGetSubAccounts (params);
            const dataDict = this.safeDict (subAccounts, 'data');
            const accounts = this.safeList (dataDict, 'items', []);
            let accountId: Str = undefined;
            let probingSubaccount: Str = undefined;
            const hasSubs = accounts.length > 0;
            if (!hasSubs) {
                return 'default_account_id';
            }
            if (accounts.length === 1) {
                const soleAccount = accounts[0];
                accountId = this.safeString (soleAccount, 'subUserId');
                if (!accountId) {
                    accountId = this.safeString (soleAccount, 'subName');
                }
            } else {
                for (let idx = 0; idx < accounts.length; idx++) {
                    const rowEntry = accounts[idx];
                    const subUid = rowEntry['subUserId'];
                    if (subUid) {
                        probingSubaccount = this.safeString (rowEntry, 'subName');
                    } else {
                        accountId = this.safeString (rowEntry, 'subName');
                    }
                }
            }
            if ((accountId !== undefined && accountId !== '') && futuresSuffixNeeded) {
                accountId = String (accountId) + '_futures';
            }
            if (probingSubaccount !== undefined) {
                const subApiKeyResponse = await this.privateGetSubApiKey (this.extend ({
                    'subName': probingSubaccount,
                }, params));
                const respMsg = this.safeString (subApiKeyResponse, 'msg');
                const respDataPresent = ('data' in subApiKeyResponse);
                const respData = this.safeValue (subApiKeyResponse, 'data');
                if (!respDataPresent || (respMsg !== undefined) || respData === undefined) {
                    return 'default_account_id';
                }
            }
            if (hasSubs && (accountId === undefined || accountId === '')) {
                return 'default_account_id';
            }
            if (accountId === undefined) {
                return 'default_account_id';
            }
            return accountId;
        } catch (e) {
            if (String (e).toLowerCase ().indexOf ('not a master user') >= 0) {
                return 'default_subaccount_id';
            }
            throw e;
        }
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's KucoinCCXTAdapter.fix_order:
        // 1) call the standard parseOrder
        // 2) re-tag stop / take-profit orders that ccxt does not flag as such, force their price
        //    to the trigger price for take-profit, and compute triggerAbove from the side and direction
        // 3) ensure a fee dict is always present (kucoin omits it for orders without fees)
        const parsed = super.parseOrder (order, market) as Dict;
        this.adaptKucoinOrderType (parsed);
        this.ensureKucoinFee (parsed);
        return parsed as Order;
    }

    parseTrade (trade: Dict, market: Market = undefined): Trade {
        // override the standard parseTrade to apply OctoBot's KucoinCCXTAdapter.fix_trades:
        // run the same stop/take-profit re-tagging as parseOrder and ensure a fee dict is set
        const parsed = super.parseTrade (trade, market) as Dict;
        this.adaptKucoinOrderType (parsed);
        this.ensureKucoinFee (parsed);
        return parsed as Trade;
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's KucoinCCXTAdapter.fix_ticker:
        // kucoin futures tickers may be returned with no timestamp, fall back to the current time
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
        }
        return parsed as Ticker;
    }

    parseFundingRate (data, market: Market = undefined): FundingRate {
        // override the standard parseFundingRate to apply OctoBot's KucoinCCXTAdapter.parse_funding_rate:
        // kucoin's parseFundingRate reports the previous funding timestamp under nextFundingTimestamp;
        // the actual next funding time is not provided, so swap it to previousFundingTimestamp and derive the
        // real next by adding the default 8h funding interval
        const parsed = super.parseFundingRate (data, market) as Dict;
        const previousFundingTimestamp = this.safeInteger (parsed, 'nextFundingTimestamp');
        if (previousFundingTimestamp !== undefined) {
            const intervalMs = 8 * 60 * 60 * 1000;
            parsed['previousFundingTimestamp'] = previousFundingTimestamp;
            parsed['previousFundingDatetime'] = this.iso8601 (previousFundingTimestamp);
            const nextFundingTimestamp = previousFundingTimestamp + intervalMs;
            parsed['nextFundingTimestamp'] = nextFundingTimestamp;
            parsed['nextFundingDatetime'] = this.iso8601 (nextFundingTimestamp);
        }
        return parsed as FundingRate;
    }

    adaptKucoinOrderType (parsed: Dict): Dict {
        // shared OctoBot KucoinCCXTAdapter._adapt_order_type helper used by parseOrder and parseTrade
        // 1) liquidation trades come back as "liquid" type, treat them as market orders
        // 2) when info.stop is set the order is a stop / take-profit:
        //    - spot: "loss" (stop loss) / "entry" (stop entry, unhandled)
        //    - futures: "up" (triggerAbove=true) / "down" (triggerAbove=false)
        //    - any other direction is unhandled, leave the ccxt default parsing alone
        // 3) take profits are not yet handled as such: consider them as limit orders and force
        //    their price to the stop price when missing (waiting for TP handling)
        if (this.safeStringLower (parsed, 'type') === 'liquid') {
            parsed['type'] = 'market';
        }
        const info = this.safeDict (parsed, 'info', {});
        const triggerDirection = this.safeStringLower (info, 'stop');
        if (triggerDirection === undefined || triggerDirection === '') {
            return parsed;
        }
        const side = this.safeStringLower (parsed, 'side');
        let triggerAbove = false;
        let isStopLoss = false;
        let isStopEntry = false;
        if (triggerDirection === 'loss') {
            isStopLoss = true;
        } else if (triggerDirection === 'entry') {
            isStopEntry = true;
        } else if (triggerDirection === 'up') {
            triggerAbove = true;
        } else if (triggerDirection === 'down') {
            triggerAbove = false;
        } else {
            // unhandled, rely on ccxt default parsing
            this.log ('ob_kucoinfutures.parseOrder', 'Unhandled ob_kucoin trigger direction: ' + triggerDirection + ', order: ' + this.json (parsed));
            return parsed;
        }
        if (isStopLoss) {
            triggerAbove = (side === 'buy');
        }
        if (isStopEntry) {
            this.log ('ob_kucoinfutures.parseOrder', 'Unhandled ob_kucoin stop_entry order: ' + this.json (parsed));
        }
        const stopPrice = this.safeNumber (parsed, 'stopPrice');
        let updated = 'unknown';
        if (side === 'buy') {
            if (triggerAbove) {
                updated = 'stop_loss';
            } else {
                // take profits are not yet handled as such: consider them as limit orders
                updated = 'limit';      // waiting for TP handling
                if (!parsed['price'] && stopPrice !== undefined) {
                    parsed['price'] = stopPrice;    // waiting for TP handling
                }
            }
        } else {
            // selling
            if (triggerAbove) {
                // take profits are not yet handled as such: consider them as limit orders
                updated = 'limit';      // waiting for TP handling
                if (!parsed['price'] && stopPrice !== undefined) {
                    parsed['price'] = stopPrice;    // waiting for TP handling
                }
            } else {
                updated = 'stop_loss';
            }
        }
        // stop loss are not tagged as such by ccxt, force it
        parsed['type'] = updated;
        parsed['triggerAbove'] = triggerAbove;
        return parsed;
    }

    ensureKucoinFee (parsed: Dict): Dict {
        // shared OctoBot CCXTAdapter._ensure_fees helper: kucoin omits the fee dict for orders /
        // trades without fees, synthesize an empty one so downstream code can rely on its presence
        if (this.safeValue (parsed, 'fee') === undefined) {
            parsed['fee'] = {
                'cost': 0,
                'currency': undefined,
                'rate': undefined,
            };
        }
        return parsed;
    }
}
