

//  ---------------------------------------------------------------------------

import mexc from './mexc.js';
import { AuthenticationError, OBIPWhitelistError, OrderNotFound, PermissionDenied, OBUntradableSymbol } from './base/errors.js';
import type { Bool, Dict, Market, Order, Str } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_mexc extends mexc {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_mexc',
            'name': 'MEXC Global',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'exact': {
                    '700007': PermissionDenied,
                    '10072': AuthenticationError,
                    '700006': OBIPWhitelistError,
                },
                'broad': {
                    // mexc_exchange.py comment JSON snippets (body substring match)
                    'No permission to access the endpoint.': PermissionDenied,
                    'Api key info invalid': AuthenticationError,
                    'Order does not exist': OrderNotFound,
                    'not in the ip white list': OBIPWhitelistError,
                    'symbol not support api': OBUntradableSymbol,
                },
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': false,
                'option': false,
                'fetchAccountId': true,
                'fetchPermissions': true,
                'getOrdersBrokerParameters': true,
                'isAuthenticatedRequest': true,
            },
            'options': {
                'createMarketBuyOrderRequiresPrice': false, // disable quote conversion
                'recvWindow': 60000, // default is 5000, avoid time related issues
                'broker': 'OCTO',
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
                    'includeDisabledSymbolsInAvailableSymbols': true,
                    'expectPossibleOrderNotFoundDuringOrderCreation': true,
                    'requireOrderFeesFromTrades': true,
                    'enableSpotBuyMarketWithCost': true,
                    'adjustForTimeDifference': true,
                    'localFeeCurrency': 'MX',
                    'hasBroker': true,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        return await this.obFetchPermissionsImaginaryCancel ('12345', 'BTC/USDT', params, 'either');
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        try {
            const resp = await this.spotPrivateGetUid (params);
            const uid = this.safeString (resp, 'uid');
            if (uid !== undefined) {
                return uid;
            }
            const data = this.safeDict (resp, 'data');
            const uidFallback = this.safeString (data, 'uid');
            if (uidFallback !== undefined) {
                return uidFallback;
            }
            return 'default_account_id';
        } catch (e) {
            this.log ('ob_mexc.fetchAccountId', String (e));
            return 'default_account_id';
        }
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'restSignatureInHeadersJsonOrInUrl', {});
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's MexcCCXTAdapter.fix_order:
        // mexc does not return fee info on canceled orders; synthesize empty fee with currency set to symbol quote
        const parsed = super.parseOrder (order, market) as Dict;
        const status = this.safeStringLower (parsed, 'status');
        const fee = this.safeDict (parsed, 'fee');
        if (status === 'canceled' && fee === undefined) {
            const quoteCcy = this.obQuoteFromSymbol (this.safeString (parsed, 'symbol', ''));
            parsed['fee'] = {
                'currency': quoteCcy !== undefined ? quoteCcy : '',
                'cost': 0,
            };
        }
        return parsed as Order;
    }

    obQuoteFromSymbol (symbolStr: Str): Str {
        // extract the quote currency from a unified symbol like "BTC/USD" or "BTC/USDT:USDT"
        if (symbolStr === undefined || symbolStr === '') {
            return '';
        }
        const parts = symbolStr.split ('/');
        if (parts.length < 2) {
            return '';
        }
        const quoteAndSettle = parts[1];
        const quoteParts = quoteAndSettle.split (':');
        return quoteParts[0];
    }
}
