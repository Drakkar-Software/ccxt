
//  ---------------------------------------------------------------------------

import kraken from './kraken.js';
import { AuthenticationError } from './base/errors.js';
import type { Dict, Market, Str, Ticker } from './base/types.js';

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
                'fetchAccountId': true,
                'fetchPermissions': true,
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

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        return 'default_account_id';
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        try {
            const response = await this.privatePostGetApiKeyInfo (params);
            const result = this.safeDict (response, 'result', {});
            const permissions = this.safeList (result, 'permissions', []);
            const rights: string[] = [];
            const readingPermissions = [ 'query-funds', 'query-open-trades', 'query-closed-trades', 'query-ledger', 'export-data', 'create-ws-token' ];
            const tradingPermissions = [ 'modify-trades', 'close-trades' ];
            const withdrawalPermissions = [ 'withdraw-funds', 'add-withdraw-address', 'update-withdraw-address' ];
            for (let permIdx = 0; permIdx < permissions.length; permIdx++) {
                const permission = permissions[permIdx];
                if (this.inArray (permission, readingPermissions) && !this.inArray ('reading', rights)) {
                    rights.push ('reading');
                }
                if (this.inArray (permission, tradingPermissions)) {
                    if (!this.inArray ('spotTrading', rights)) {
                        rights.push ('spotTrading');
                    }
                    if (!this.inArray ('marginTrading', rights)) {
                        rights.push ('marginTrading');
                    }
                }
                if (this.inArray (permission, withdrawalPermissions) && !this.inArray ('withdrawals', rights)) {
                    rights.push ('withdrawals');
                }
            }
            return rights;
        } catch (caughtPermissionError) {
            const messageTxt = String (caughtPermissionError);
            const messageLower = messageTxt.toLowerCase ();
            if (messageLower.indexOf ('invalid') >= 0 && messageLower.indexOf ('key') >= 0) {
                throw new AuthenticationError (this.id + ' ' + messageTxt);
            }
            throw caughtPermissionError;
        }
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
