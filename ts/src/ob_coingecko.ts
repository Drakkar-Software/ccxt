
//  ---------------------------------------------------------------------------

import coingecko from './coingecko.js';
import type { Dict, Market, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

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
                    'fixMarketStatus': true,
                    'createOhlcvFromTickers': true,
                    'supportsMarketsCache': false,
                    'supportsAllSymbolsListing': true,
                    'lazyLoadMarkets': true,
                    'noVolumeInTicker': true,
                },
            },
        });
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
            parsed['datetime'] = this.iso8601 (parsed['timestamp']);
        }
        return parsed as Ticker;
    }

    parseOnchainTicker (market: Market, last: string, baseTokenData: Dict, quoteTokenData: Dict = undefined): Ticker {
        const parsed = super.parseOnchainTicker (market, last, baseTokenData, quoteTokenData) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
            parsed['datetime'] = this.iso8601 (parsed['timestamp']);
        }
        return parsed as Ticker;
    }

    /**
     * @method
     * @name ob_coingecko#obLoadMarketsForSymbols
     * @description lazily loads and returns fixed market status structures for the given symbols
     * @see https://docs.coingecko.com/demo/reference/token-data-contract-address
     * @param {string[]} symbols list of symbols with @network or @network!* suffix
     * @param {boolean} reload when true, re-fetch symbols even if already cached in this.markets
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} list of fixed market status structures
     */
    async obLoadMarketsForSymbols (symbols: string[], reload = false, params = {}): Promise<Dict[]> {
        await super.obLoadMarketsForSymbols (symbols, reload, params);
        const symbolsLength = symbols.length;
        const result = [];
        for (let symbolIndex = 0; symbolIndex < symbolsLength; symbolIndex++) {
            const symbol = symbols[symbolIndex];
            if (this.isOnchainSymbol (symbol)) {
                result.push (this.obGetFixedMarketStatus (symbol));
            }
        }
        return result;
    }
}
