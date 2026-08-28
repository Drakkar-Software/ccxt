
//  ---------------------------------------------------------------------------

import bybit from './bybit.js';
import type { Dict, Market, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_bybit
 * @augments bybit
 */
export default class ob_bybit extends bybit {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_bybit',
            'name': 'Bybit',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': true,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': true,
                'option': true,
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
                        'futures': {
                            'orders': [ 'market', 'limit', 'stop_loss' ],
                            'bundled_orders': {},
                        },
                    },
                    'fixMarketStatus': true,
                    'markPriceInTicker': true,
                    'fundingInTicker': true,
                    'requiresSymbolForEmptyPosition': true,
                    'requireOrderFeesFromTrades': true,
                    'expectPossibleNotFoundOrderDuringOrderCreation': true,
                    'canHaveDelayedCancelledOrders': true,
                    'adjustForTimeDifference': true,
                    'hasBroker': true,
                    'myTradesFetchUseCcxtPaginate': true,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        await this.fetchBalance (params);
        return [ 'reading', 'spotTrading', 'futuresTrading', 'marginTrading' ];
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
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
