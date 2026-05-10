

//  ---------------------------------------------------------------------------

import hitbtc from './hitbtc.js';

//  ---------------------------------------------------------------------------

export default class ob_hitbtc extends hitbtc {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_hitbtc',
            'name': 'HitBTC',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': false,
                'spot': true,
                'margin': true,
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
                },
            },
        });
    }
}
