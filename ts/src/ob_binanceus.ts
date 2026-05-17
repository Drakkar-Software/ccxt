
//  ---------------------------------------------------------------------------

import binanceus from './binanceus.js';
import { OBOrderUncancellableError, OrderImmediatelyFillable, PermissionDenied } from './base/errors.js';
import type { Bool, Dict, Int, Str } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_binanceus extends binanceus {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_binanceus',
            'name': 'Binance US',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'exact': {
                    'Order would immediately trigger.': OrderImmediatelyFillable,
                    'Unknown order sent.': OBOrderUncancellableError,
                },
                'broad': {
                    'Invalid API-key, IP, or permissions for action.': PermissionDenied,
                    'This symbol is not permitted for this account.': PermissionDenied,
                    'Symbol not whitelisted for API key.': PermissionDenied,
                },
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'fetchAccountId': true,
                'fetchPermissions': true,
                'getMaxOpenOrdersCount': true,
                'isAuthenticatedRequest': true,
            },
            // Default spot fees per https://www.binance.us/fees (parity with OctoBot binanceus tentacle)
            'fees': {
                'trading': {
                    'tierBased': true,
                    'percentage': true,
                    'taker': this.parseNumber ('0.006'),
                    'maker': this.parseNumber ('0.004'),
                },
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
                    'requireOrderFeesFromTrades': true,
                    'supportsSetMarginTypeOnOpenPositions': false,
                    'supportsCustomLimitOrderBookFetch': true,
                    'enableSpotBuyMarketWithCost': true,
                    'adjustForTimeDifference': true,
                    'localFeeCurrency': 'BNB',
                    'requiresStopParamToFetchOrder': true,
                    'requiresStopParamToCancelOrder': true,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        return await this.obFetchPermissionsImaginaryCancel ('12345', 'BTC/USDT', params, 'either');
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        return 'default_account_id';
    }

    getMaxOpenOrdersCount (symbol: string, params = {}, _ccxtTypesImportInt: Int = undefined): Int {
        return this.obGetMaxOpenOrdersCountFromExchangeInfoFilters (symbol, params, 'ob_binanceus.getMaxOpenOrdersCount');
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'urlBodySignature', {});
    }
}
