
//  ---------------------------------------------------------------------------

import poloniex from './poloniex.js';

//  ---------------------------------------------------------------------------

export default class ob_poloniex extends poloniex {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_poloniex',
            'name': 'Poloniex',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': undefined,
                'swap': true,
                'future': true,
                'option': false,
            },
            'options': {
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
                    'removeMarketStatusPriceLimits': true,
                },
            },
        });
    }
}
