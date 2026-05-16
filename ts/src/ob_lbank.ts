

//  ---------------------------------------------------------------------------

import lbank from './lbank.js';
import { md5 } from './static_dependencies/noble-hashes/md5.js';
import { sha256 } from './static_dependencies/noble-hashes/sha256.js';
import { rsa } from './base/functions/rsa.js';
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
                    'supportsForcedSigningAllRequests': true,
                    'enableForcedSigningAllRequests': false,
                },
            },
        });
    }

    convertSecretToPem (secret) {
        // include it here to avoid missing snake-case conversion in other languages
        const lineLength = 64;
        const secretLength = secret.length - 0;
        let numLines = this.parseToInt (secretLength / lineLength);
        numLines = this.sum (numLines, 1);
        let pem = "-----BEGIN PRIVATE KEY-----\n"; // eslint-disable-line
        for (let i = 0; i < numLines; i++) {
            const start = i * lineLength;
            const end = this.sum (start, lineLength);
            pem += this.secret.slice (start, end) + "\n"; // eslint-disable-line
        }
        return pem + '-----END PRIVATE KEY-----';
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        const octobotOpts = this.safeDict (this.options, 'octobot', {});
        const enableForcedSigningAllRequests = this.safeBool (octobotOpts, 'enableForcedSigningAllRequests', false);
        if (!enableForcedSigningAllRequests) {
            return super.sign (path, api, method, params, headers, body);
        }
        let query = this.omit (params, this.extractParams (path));
        let url = this.urls['api']['rest'] + '/' + this.version + '/' + this.implodeParams (path, params);
        // Every spot endpoint ends with ".do"
        if (api[0] === 'spot') {
            url += '.do';
        } else {
            url = this.urls['api']['contract'] + '/' + this.implodeParams (path, params);
        }
        // ob_lbank local override: begin (diff vs lbank.sign) — parent public unsigned query skipped (see lbank.sign ~2985-2988)
        // if (api[1] === 'public') {
        //     if (Object.keys (query).length) {
        //         url += '?' + this.urlencode (this.keysort (query));
        //     }
        // }
        // ob_lbank local override: end (diff vs lbank.sign)
        this.checkRequiredCredentials ();
        const timestamp = this.milliseconds ().toString ();
        const echostr = this.uuid22 () + this.uuid16 ();
        query = this.extend ({
            'api_key': this.apiKey,
        }, query);
        let signatureMethod = undefined;
        if (this.secret.length > 32) {
            signatureMethod = 'RSA';
        } else {
            signatureMethod = 'HmacSHA256';
        }
        const auth = this.rawencode (this.keysort (this.extend ({
            'echostr': echostr,
            'signature_method': signatureMethod,
            'timestamp': timestamp,
        }, query)));
        const encoded = this.encode (auth);
        const hash = this.hash (encoded, md5);
        const uppercaseHash = hash.toUpperCase ();
        let sign = undefined;
        if (signatureMethod === 'RSA') {
            const cacheSecretAsPem = this.safeBool (this.options, 'cacheSecretAsPem', true);
            let pem = undefined;
            if (cacheSecretAsPem) {
                pem = this.safeValue (this.options, 'pem');
                if (pem === undefined) {
                    pem = this.convertSecretToPem (this.encode (this.secret));
                    this.options['pem'] = pem;
                }
            } else {
                pem = this.convertSecretToPem (this.encode (this.secret));
            }
            sign = rsa (uppercaseHash, pem, sha256);
        } else if (signatureMethod === 'HmacSHA256') {
            sign = this.hmac (this.encode (uppercaseHash), this.encode (this.secret), sha256);
        }
        query['sign'] = sign;
        // ob_lbank local override: begin (diff vs lbank.sign) — encoded params on URL query for public, else body (see lbank.sign ~3028 vs lbank_exchange _force_sign)
        if (api[1] === 'public') {
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (this.keysort (query));
            }
        } else {
            body = this.urlencode (this.keysort (query));
        }
        // ob_lbank local override: end (diff vs lbank.sign)
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'timestamp': timestamp,
            'signature_method': signatureMethod,
            'echostr': echostr,
        };
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
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
