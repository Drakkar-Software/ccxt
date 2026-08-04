
//  ---------------------------------------------------------------------------

import bitstamp from './bitstamp.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_bitstamp
 * @augments bitstamp
 */
export default class ob_bitstamp extends bitstamp {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_bitstamp',
            'name': 'Bitstamp',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': true,
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
