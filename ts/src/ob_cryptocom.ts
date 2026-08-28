
//  ---------------------------------------------------------------------------

import cryptocom from './cryptocom.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_cryptocom
 * @augments cryptocom
 */
export default class ob_cryptocom extends cryptocom {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_cryptocom',
            'name': 'Crypto.com',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': false,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': true,
                'option': true,
                'fetchPermissions': true,
                'getOrdersBrokerParameters': true,
            },
            'options': {
                'broker': 'OCTBT',
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
                    'expectPossibleNotFoundOrderDuringOrderCreation': true,
                    'supportFetchingCancelledOrders': false,
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
}
