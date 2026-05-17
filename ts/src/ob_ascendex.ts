
//  ---------------------------------------------------------------------------

import ascendex from './ascendex.js';
import { OBIPWhitelistError } from './base/errors.js';
import type { Dict, Market, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_ascendex extends ascendex {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_ascendex',
            'name': 'AscendEX',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'broad': {
                    // ascendex_exchange.py comment message casing
                    'You have setup IP allowed list for this key': OBIPWhitelistError,
                    'Your IP address () is not in the allowed list.': OBIPWhitelistError,
                },
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': false,
                'option': false,
                'fetchPermissions': true,
                'getOrdersBrokerParameters': true,
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
                    'supportFetchingCancelledOrders': false,
                    'requireRecentTradesFromClosedOrders': true,
                    'hasBroker': true,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        await this.fetchBalance (params);
        return [ 'reading', 'spotTrading', 'futuresTrading', 'marginTrading' ];
    }

    getOrdersBrokerParameters (params = {}): any {
        const partnerId = 'OctoBot';
        const rawUuid = this.uuid ();
        const hyphenMarker = '-';
        const strippedPieces = rawUuid.split (hyphenMarker);
        let strippedUuid = '';
        for (let pieceIdx = 0; pieceIdx < strippedPieces.length; pieceIdx++) {
            strippedUuid = strippedUuid + strippedPieces[pieceIdx];
        }
        const prefixLength = partnerId.length;
        let tail = '';
        let tailIdx = prefixLength;
        while (tailIdx < strippedUuid.length) {
            const nextChar = strippedUuid[tailIdx];
            tail = tail + nextChar;
            tailIdx = tailIdx + 1;
        }
        const id = partnerId + tail;
        return this.extend (params, {
            'id': id,
        });
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's AscendexCCXTAdapter.fix_ticker:
        // ascendex tickers may be returned with no timestamp, fall back to the current time
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
        }
        return parsed as Ticker;
    }
}
