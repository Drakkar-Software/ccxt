
//  ---------------------------------------------------------------------------

import bybiteu from './bybiteu.js';
import type { Dict, Market, Str, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_bybiteu
 * @augments bybiteu
 */
export default class ob_bybiteu extends bybiteu {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_bybiteu',
            'name': 'Bybit EU',
            'certified': false,
            'urls': {
                'referral': 'https://www.bybit.com/invite?ref=XDK12WP',
            },
            'has': {
                'CORS': true,
                'spot': true,
                'margin': true,
                'swap': false,
                'future': false,
                'option': false,
                'fetchPermissions': true,
                'getOrdersBrokerParameters': true,
            },
            'options': {
                'brokerId': 'octobot',
                'recvWindow': 60000, // default is 5000, avoid time related issues
                'octobot': {
                    'supportedElements': {
                        'spot': {
                            'orders': [ 'market', 'limit' ],
                            'bundled_orders': {},
                        },
                    },
                    'fixMarketStatus': true,
                    'requireOrderFeesFromTrades': false,
                    'expectPossibleNotFoundOrderDuringOrderCreation': true,
                    'canHaveDelayedCancelledOrders': true,
                    'adjustForTimeDifference': true,
                    'hasBroker': true,
                    'myTradesFetchUseCcxtPaginate': true,
                    'enableSpotBuyMarketWithCost': true,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        await this.fetchBalance (params);
        return [ 'reading', 'spotTrading', 'marginTrading' ];
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
    }

    async fetchOrder (id: string, symbol: Str = undefined, params = {}) {
        const acknowledgedParams = this.extend ({ 'acknowledged': true }, params);
        return super.fetchOrder (id, symbol, acknowledgedParams);
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's BybitCCXTAdapter.fix_ticker:
        // bybit tickers may be returned with no timestamp, fall back to the current time
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
        }
        return parsed as Ticker;
    }
}
