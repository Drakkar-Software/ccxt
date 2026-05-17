
//  ---------------------------------------------------------------------------

import upbit from './upbit.js';

//  ---------------------------------------------------------------------------

export default class ob_upbit extends upbit {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_upbit',
            'name': 'Upbit',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': true,
                'spot': true,
                'margin': undefined,
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
