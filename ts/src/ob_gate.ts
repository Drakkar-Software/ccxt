
//  ---------------------------------------------------------------------------

import gate from './gate.js';
import { OBIPWhitelistError } from './base/errors.js';
import type { Dict, int, Market, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_gate
 * @augments gate
 */
export default class ob_gate extends gate {
    describe (): any {
        const base = super.describe ();
        const parentHeaders = this.safeDict (base, 'headers');
        return this.deepExtend (base, {
            'id': 'ob_gate',
            'name': 'Gate',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'exact': {
                    'IP_FORBIDDEN': OBIPWhitelistError,
                },
                'broad': {
                    // gateio_exchange.py comment: "Request IP not in whitelist: 11.11.11.11"
                    'Request IP not in whitelist': OBIPWhitelistError,
                    'ip not in whitelist': OBIPWhitelistError,
                },
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': true,
                'option': true,
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
                    'removeMarketStatusPriceLimits': true,
                    'adjustForTimeDifference': true,
                    'hasBroker': true,
                },
            },
            'headers': this.extend (parentHeaders, {
                'X-Gate-Channel-Id': 'octobotclo',
            }),
        });
    }

    handleErrors (code: int, reason: string, url: string, method: string, headers: Dict, body: string, response, requestHeaders, requestBody) {
        if (response !== undefined) {
            const message = this.safeString (response, 'message');
            const feedback = this.id + ' ' + body;
            this.throwBroadlyMatchedException (this.exceptions['broad'], message, feedback);
        }
        return super.handleErrors (code, reason, url, method, headers, body, response, requestHeaders, requestBody);
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        await this.fetchBalance (params);
        return [ 'reading', 'spotTrading', 'futuresTrading', 'marginTrading' ];
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's GateioCCXTAdapter.fix_ticker:
        // gateio tickers may be returned with no timestamp, fall back to the current time
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
        }
        return parsed as Ticker;
    }
}
