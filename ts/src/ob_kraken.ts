

//  ---------------------------------------------------------------------------

import kraken from './kraken.js';
import type { Dict, Market, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_kraken extends kraken {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_kraken',
            'name': 'Kraken',
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
                    'adjustForTimeDifference': true,
                },
            },
        });
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's KrakenCCXTAdapter.fix_ticker:
        // kraken tickers may be returned with no timestamp, fall back to the current time
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
        }
        return parsed as Ticker;
    }
}
