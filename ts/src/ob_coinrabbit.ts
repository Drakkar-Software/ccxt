
//  ---------------------------------------------------------------------------

import coinrabbit from './coinrabbit.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_coinrabbit
 * @augments coinrabbit
 */
export default class ob_coinrabbit extends coinrabbit {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_coinrabbit',
            'name': 'CoinRabbit',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
            },
            'options': {
                'orderSource': 'octobot',
                'octobot': {
                    'supportedElements': {
                        'spot': {
                            'orders': [ 'market', 'limit' ],
                            'bundled_orders': {},
                        },
                        'futures': {
                            'orders': [],
                            'bundled_orders': {},
                        },
                    },
                    'fixMarketStatus': true,
                    'supportFetchingCancelledOrders': true,
                },
            },
        });
    }
}
