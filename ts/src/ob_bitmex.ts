

//  ---------------------------------------------------------------------------

import bitmex from './bitmex.js';

//  ---------------------------------------------------------------------------

export default class ob_bitmex extends bitmex {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_bitmex',
            'name': 'BitMEX',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
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
                    'fixMarketStatus': false,
                    'markPriceInTicker': true,
                    'fundingInTicker': true,
                },
            },
        });
    }
}
