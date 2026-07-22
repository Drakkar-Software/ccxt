
//  ---------------------------------------------------------------------------

import hollaex from './hollaex.js';
import { OBIPWhitelistError, OBMaxOpenOrdersReached, PermissionDenied } from './base/errors.js';
import type { Bool, Dict, Int, Market, Order, Str, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_hollaex
 * @augments hollaex
 */
export default class ob_hollaex extends hollaex {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_hollaex',
            'name': 'HollaEx',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'broad': {
                    // hollaex_exchange.py quoted message examples
                    'This key does not have the right permissions to access this endpoint': PermissionDenied,
                    'Access denied: Unauthorized Access. The IP address you are reaching': OBIPWhitelistError,
                    'You are only allowed to have maximum 50 active orders per market': OBMaxOpenOrdersReached,
                },
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': undefined,
                'swap': false,
                'future': false,
                'option': false,
                'fetchAccountId': true,
                'fetchPermissions': true,
                'getMaxOpenOrdersCount': true,
                'isAuthenticatedRequest': true,
            },
            'options': {
                // OctoBot trading_constants.DEFAULT_REQUEST_TIMEOUT default 20000 ms / 1000 (hollaex_exchange.py); env can override Python.
                'api-expires': 20,
                'octobot': {
                    'supportedElements': {
                        'spot': {
                            'orders': [ 'market', 'limit' ],
                            'bundled_orders': {},
                        },
                        'futures': {
                            'orders': [ 'market', 'limit' ],
                            'bundled_orders': {},
                        },
                    },
                    'fixMarketStatus': true,
                    'requireOrderFeesFromTrades': true,
                    'supportFetchingCancelledOrders': false,
                    'isSkippingEmptyCandlesInOhlcvFetch': true,
                    'stopLossEditPriceParam': 'stopPrice',
                    'stopLossCreatePriceParam': 'stopPrice',
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        return await this.obFetchPermissionsImaginaryCancel ('12345', 'BTC/USDT', params, 'pair');
    }

    getMaxOpenOrdersCount (symbol: string, params = {}, _ccxtTypesImportInt: Int = undefined): Int {
        return 50;
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        const userInfo = await this.privateGetUser (params);
        return this.safeString (userInfo, 'id');
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'headersJsonAny', {
            'needles': [ 'api-signature' ],
        });
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's HollaexCCXTAdapter.fix_order:
        // 1) when the parsed price is missing but the raw payload has an "average" field, use it
        // 2) tag orders with a triggerPrice as stop_loss orders
        // 3) override fee.currency with info.fee_coin (uppercased) when set
        const parsed = super.parseOrder (order, market) as Dict;
        const info = this.safeDict (parsed, 'info', {}) as Dict;
        const price = this.safeNumber (parsed, 'price');
        if (price === undefined || price === 0) {
            const average = this.safeNumber (info, 'average');
            if (average !== undefined && average !== 0) {
                parsed['price'] = average;
            }
        }
        const triggerPrice = this.safeNumber (parsed, 'triggerPrice');
        if (triggerPrice !== undefined && triggerPrice !== 0) {
            parsed['type'] = 'stop_loss';
        }
        const feeCoin = this.safeString (info, 'fee_coin');
        const fee = this.safeDict (parsed, 'fee') as Dict;
        if (feeCoin !== undefined && fee !== undefined) {
            fee['currency'] = feeCoin.toUpperCase ();
            parsed['fee'] = fee;
        }
        return parsed as Order;
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's HollaexCCXTAdapter.fix_ticker:
        // hollaex tickers may be returned with no timestamp, fall back to the current time
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
        }
        return parsed as Ticker;
    }
}
