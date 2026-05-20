
//  ---------------------------------------------------------------------------

import dexscreener from './dexscreener.js';

//  ---------------------------------------------------------------------------

export default class ob_dexscreener extends dexscreener {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_dexscreener',
            'name': 'DexScreener',
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
                    'fixMarketStatus': true,
                    'requiresConfiguration': true,
                    'createOhlcvFromTickers': true,
                    'requiresSymbolsParamToFetchTickers': true,
                    'supportsMarketsCache': false, // market status depend on the exchange config
                },
            },
        });
    }
}
