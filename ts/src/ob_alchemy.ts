
//  ---------------------------------------------------------------------------

import alchemy from './alchemy.js';
import type { Dict } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_alchemy
 * @augments alchemy
 */
export default class ob_alchemy extends alchemy {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_alchemy',
            'name': 'Alchemy',
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
                    'createOhlcvFromTickers': true,
                    'requiresSymbolsParamToFetchTickers': true,
                    'supportsMarketsCache': false,
                    'supportsAllSymbolsListing': false,
                    'lazyLoadMarkets': true,
                    'noVolumeInTicker': true,
                },
            },
        });
    }

    /**
     * @method
     * @name ob_alchemy#obLoadMarketsForSymbols
     * @description lazily loads and returns fixed market status structures for the given symbols
     * @param {string[]} symbols list of address-pair symbols with @network!dex suffix
     * @param {boolean} reload when true, re-fetch symbols even if already cached in this.markets
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} list of fixed market status structures
     */
    async obLoadMarketsForSymbols (symbols: string[], reload = false, params = {}): Promise<Dict[]> {
        await super.obLoadMarketsForSymbols (symbols, reload, params);
        const symbolsLength = symbols.length;
        const result = [];
        for (let symbolIndex = 0; symbolIndex < symbolsLength; symbolIndex++) {
            result.push (this.obGetFixedMarketStatus (symbols[symbolIndex]));
        }
        return result;
    }
}
