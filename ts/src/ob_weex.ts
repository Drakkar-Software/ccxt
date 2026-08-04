
//  ---------------------------------------------------------------------------

import weex from './weex.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_weex
 * @augments weex
 */
export default class ob_weex extends weex {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_weex',
            'name': 'Weex',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': true,
                'future': false,
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
                    'requireOrderFeesFromTrades': true,
                },
            },
        });
    }
}
