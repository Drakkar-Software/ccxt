
//  ---------------------------------------------------------------------------

import mexc from './mexc.js';
import { AuthenticationError, OBIPWhitelistError, OrderNotFound, PermissionDenied, OBUntradableSymbol } from './base/errors.js';
import { sha256 } from '@noble/hashes/sha2.js';
import type { Bool, Dict, Int, Market, Order, Str, Transaction } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_mexc
 * @augments mexc
 */
export default class ob_mexc extends mexc {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_mexc',
            'name': 'MEXC Global',
            'certified': false,
            'urls': {
                'referral': 'https://www.mexc.com/register?inviteCode=1fqGu',
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
                    'supportsForcedSigningAllRequests': true,
                    'enableForcedSigningAllRequests': false,
                    'enableSpotBuyMarketWithCost': true,
                    'adjustForTimeDifference': true,
                    'localFeeCurrency': 'MX',
                    'hasBroker': true,
                    'myTradesFetchUseCcxtPaginate': true,
                },
            },
        });
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        const octobotOpts = this.safeDict (this.options, 'octobot', {});
        const enableForcedSigningAllRequests = this.safeBool (octobotOpts, 'enableForcedSigningAllRequests', false);
        if (!enableForcedSigningAllRequests) {
            return super.sign (path, api, method, params, headers, body);
        }
        const section = this.safeString (api, 0);
        const access = this.safeString (api, 1);
        [ path, params ] = this.resolvePath (path, params);
        let url = undefined;
        if (section === 'spot' || section === 'broker') {
            if (section === 'broker') {
                url = this.urls['api'][section][access] + '/' + path;
            } else {
                url = this.urls['api'][section][access] + '/api/' + this.version + '/' + path;
            }
            let urlParams = params;
            // ob_mexc local override: begin (diff vs mexc.sign) — spot/broker force signing (see mexc_exchange _force_sign ~80-90)
            // Same truth value as `true || …` here: we only reach this block when forced signing is enabled.
            if (enableForcedSigningAllRequests || access === 'private') {
                if (section === 'broker' && ((method === 'POST') || (method === 'PUT') || (method === 'DELETE'))) {
                    urlParams = {
                        'timestamp': this.nonce (),
                        'recvWindow': this.safeInteger (this.options, 'recvWindow', 5000),
                    };
                    body = this.json (params);
                } else {
                    urlParams['timestamp'] = this.nonce ();
                    urlParams['recvWindow'] = this.safeInteger (this.options, 'recvWindow', 5000);
                }
            }
            let paramsEncoded = '';
            if (Object.keys (urlParams).length) {
                paramsEncoded = this.urlencode (urlParams);
                url += '?' + paramsEncoded;
            }
            if (enableForcedSigningAllRequests || access === 'private') {
                this.checkRequiredCredentials ();
                const signature = this.hmac (this.encode (paramsEncoded), this.encode (this.secret), sha256);
                url += '&' + 'signature=' + signature;
                headers = {
                    'X-MEXC-APIKEY': this.apiKey,
                    'source': this.safeString (this.options, 'broker', 'CCXT'),
                };
            }
            // ob_mexc local override: end (diff vs mexc.sign)
            if ((method === 'POST') || (method === 'PUT') || (method === 'DELETE')) {
                headers['Content-Type'] = 'application/json';
            }
        } else if (section === 'contract' || section === 'spot2') {
            url = this.urls['api'][section][access] + '/' + this.implodeParams (path, params);
            params = this.omit (params, this.extractParams (path));
            // ob_mexc local override: begin (diff vs mexc.sign) — contract/spot2 public unsigned skipped (see mexc.sign ~6189-6192)
            // if (access === 'public') {
            //     if (Object.keys (params).length) {
            //         url += '?' + this.urlencode (params);
            //     }
            // } else {
            this.checkRequiredCredentials ();
            const timestamp = this.nonce ().toString ();
            let auth = '';
            headers = {
                'ApiKey': this.apiKey,
                'Request-Time': timestamp,
                'Content-Type': 'application/json',
                'source': this.safeString (this.options, 'broker', 'CCXT'),
            };
            if (method === 'POST') {
                auth = this.json (params);
                body = auth;
            } else {
                params = this.keysort (params);
                if (Object.keys (params).length) {
                    auth += this.urlencode (params);
                    url += '?' + auth;
                }
            }
            auth = this.apiKey + timestamp + auth;
            const signature = this.hmac (this.encode (auth), this.encode (this.secret), sha256);
            headers['Signature'] = signature;
            // }
            // ob_mexc local override: end (diff vs mexc.sign)
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
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
            let feeCurrency = '';
            if (quoteCcy !== undefined) {
                feeCurrency = quoteCcy;
            }
            parsed['fee'] = {
                'currency': feeCurrency,
                'cost': 0,
            };
        }
        return parsed as Order;
    }

    async fetchDeposits (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Transaction[]> {
        if (since === undefined) {
            const now = this.milliseconds ();
            // MEXC allows up to 7 days per request when startTime is set
            since = now - 6 * 24 * 60 * 60 * 1000;
            params = this.extend (params, { 'endTime': now });
        }
        return await super.fetchDeposits (code, since, limit, params);
    }

    async fetchWithdrawals (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Transaction[]> {
        if (since === undefined) {
            const now = this.milliseconds ();
            // MEXC allows up to 7 days per request when startTime is set
            since = now - 6 * 24 * 60 * 60 * 1000;
            params = this.extend (params, { 'endTime': now });
        }
        return await super.fetchWithdrawals (code, since, limit, params);
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
