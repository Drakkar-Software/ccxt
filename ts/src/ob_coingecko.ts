
//  ---------------------------------------------------------------------------

import coingecko from './coingecko.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_coingecko
 * @augments coingecko
 */
export default class ob_coingecko extends coingecko {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_coingecko',
            'name': 'CoinGecko',
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
                            'orders': [],
                            'bundled_orders': {},
                        },
                        'futures': {
                            'orders': [],
                            'bundled_orders': {},
                        },
                    },
                },
            },
        });
    }
}
