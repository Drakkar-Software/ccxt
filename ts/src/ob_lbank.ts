

//  ---------------------------------------------------------------------------

import lbank from './lbank.js';
import type { Bool, Dict, Str } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_lbank extends lbank {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_lbank',
            'name': 'LBank',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': false,
                'spot': true,
                'margin': false,
                'swap': undefined,
                'future': false,
                'option': false,
                'fetchAccountId': true,
                'fetchPermissions': true,
                'isAuthenticatedRequest': true,
            },
            'options': {
                'createMarketBuyOrderRequiresPrice': false, // disable quote conversion
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
                    'supportFetchingCancelledOrders': false,
                    'enableSpotBuyMarketWithCost': true,
                    'requireOrderFeesFromTrades': true,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        const restrictions = await this.spotPrivatePostSupplementApiRestrictions (params);
        const dataDict = this.safeDict (restrictions, 'data', {});
        const rights: string[] = [];
        if (this.safeBool (dataDict, 'enableReading', false)) {
            rights.push ('reading');
        }
        if (this.safeBool (dataDict, 'enableSpotTrading', false)) {
            rights.push ('spotTrading');
            rights.push ('marginTrading');
        }
        if (this.safeBool (dataDict, 'enableFuturesTrading', false)) {
            rights.push ('futuresTrading');
        }
        if (this.safeBool (dataDict, 'enableWithdrawals', false)) {
            rights.push ('withdrawals');
        }
        return rights;
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        return 'default_account_id';
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'signatureMethodInHeadersJsonOrSignInBody', {});
    }
}
