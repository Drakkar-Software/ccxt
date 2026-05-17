
//  ---------------------------------------------------------------------------

import myokx from './myokx.js';
import { OBIPWhitelistError, PermissionDenied } from './base/errors.js';
import type { Bool, Dict, Market, Order, Str } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_myokx extends myokx {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_myokx',
            'name': 'MyOKX (EEA)',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'exact': {
                    '50110': OBIPWhitelistError,
                    '51155': PermissionDenied,
                },
                'broad': {
                    // okx_exchange.py comment examples (sMsg / API casing)
                    'is not included in your API key': OBIPWhitelistError,
                    'Trading of this pair or contract is restricted due to local compliance requirements': PermissionDenied,
                    "You can't trade this pair or borrow this crypto due to local compliance restrictions.": PermissionDenied,
                },
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': true,
                'option': true,
                'fetchAccountId': true,
                'fetchPermissions': true,
                'getOrdersBrokerParameters': true,
                'isAuthenticatedRequest': true,
            },
            'options': {
                'brokerId': 'c812bf5944b749BC',
                'octobot': {
                    'supportedElements': {
                        'spot': {
                            'orders': [ 'market', 'limit' ],
                            'bundled_orders': {},
                        },
                        'futures': {
                            'orders': [ 'market', 'limit', 'stop_loss' ],
                            'bundled_orders': {},
                        },
                    },
                    'fixMarketStatus': true,
                    'canMakeAuthenticatedRequestsWhenLoadingMarkets': true,
                    'adaptMarketStatusForContractSize': true,
                    'requiresMockedEmptyPosition': true,
                    'requiresSymbolForEmptyPosition': true,
                    'requiresStopParamToFetchOrder': true,
                    'requiresStopParamToCancelOrder': true,
                    'adjustForTimeDifference': true,
                    'maxFetchedOhlcvCount': 100,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        const accounts = await this.fetchAccounts (params);
        const rights: string[] = [];
        if (accounts.length === 0) {
            return rights;
        }
        const firstAccount = accounts[0];
        const rawInfo = this.safeDict (firstAccount, 'info');
        const rawPerm = rawInfo['perm'];
        const permTxt = typeof rawPerm === 'string' ? rawPerm.toLowerCase () : '';
        const permSegments = permTxt.split (',');
        const restrictions = [];
        for (let segIdx = 0; segIdx < permSegments.length; segIdx++) {
            const segment = permSegments[segIdx];
            restrictions.push (segment.trim ().toLowerCase ());
        }
        if (this.inArray ('read_only', restrictions)) {
            rights.push ('reading');
        }
        if (this.inArray ('trade', restrictions)) {
            rights.push ('spotTrading');
            rights.push ('marginTrading');
            rights.push ('futuresTrading');
        }
        if (this.inArray ('withdraw', restrictions)) {
            rights.push ('withdrawals');
        }
        return rights;
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        const accounts = await this.fetchAccounts (params);
        const firstAccount = accounts[0];
        return this.safeString (firstAccount, 'id');
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'headersJsonAny', {
            'needles': [ 'OK-ACCESS-SIGN' ],
        });
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's OKXCCXTAdapter._adapt_order_type:
        // when ccxt did not flag the order as a basic market/limit order, infer stop_loss, take_profit,
        // unsupported OCO, or unknown from OKX info fields and trigger price vs last price and side
        const parsed = super.parseOrder (order, market) as Dict;
        const type = this.safeStringLower (parsed, 'type');
        if (type !== 'market' && type !== 'limit') {
            const info = this.safeDict (parsed, 'info', {});
            const triggerPrice = this.safeNumber (parsed, 'triggerPrice');
            const lastPrice = this.safeNumber (info, 'last');
            const slTrigger = this.safeNumber (info, 'slTriggerPx');
            const tpTrigger = this.safeNumber (info, 'tpTriggerPx');
            let updated = 'unknown';
            if (slTrigger !== undefined && tpTrigger !== undefined) {
                // OCO order, unsupported yet
                this.log ('ob_myokx.parseOrder', 'Unsupported OKX OCO (stop loss & take profit in a single order): ' + this.json (parsed));
                updated = 'unsupported';
            } else if (slTrigger !== undefined) {
                updated = 'stop_loss';
            } else if (tpTrigger !== undefined) {
                updated = 'take_profit';
            } else if (lastPrice !== undefined && triggerPrice !== undefined) {
                const side = this.safeStringLower (parsed, 'side');
                if (side === 'buy') {
                    // trigger stop loss buy when price goes below trigger, untriggered when last price is above
                    updated = (lastPrice > triggerPrice) ? 'stop_loss' : 'take_profit';
                } else {
                    // trigger take profit sell when price goes above trigger, untriggered when last price is below
                    updated = (lastPrice < triggerPrice) ? 'take_profit' : 'stop_loss';
                }
            } else {
                this.log ('ob_myokx.parseOrder', 'Unknown ob_myokx order type, order: ' + this.json (parsed));
            }
            // stop loss and take profits are not tagged as such by ccxt, force it
            parsed['type'] = updated;
        }
        return parsed as Order;
    }
}
