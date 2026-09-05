
//  ---------------------------------------------------------------------------

import bitfinex from './bitfinex.js';
import type { Dict, Market, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_bitfinex
 * @augments bitfinex
 */
export default class ob_bitfinex extends bitfinex {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_bitfinex',
            'name': 'Bitfinex',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
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

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's BitfinexCCXTAdapter.fix_ticker:
        // bitfinex tickers may be returned with no timestamp, fall back to the current time
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
        }
        return parsed as Ticker;
    }
}
