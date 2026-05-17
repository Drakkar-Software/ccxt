
//  ---------------------------------------------------------------------------

import wavesexchange from './wavesexchange.js';

//  ---------------------------------------------------------------------------

export default class ob_wavesexchange extends wavesexchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_wavesexchange',
            'name': 'Waves.Exchange',
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
