
//  ---------------------------------------------------------------------------

import ndax from './ndax.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_ndax
 * @augments ndax
 */
export default class ob_ndax extends ndax {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_ndax',
            'name': 'NDAX',
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
                },
            },
        });
    }
}
