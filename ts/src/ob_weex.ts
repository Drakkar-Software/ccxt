
//  ---------------------------------------------------------------------------

import weex from './weex.js';
import { ExchangeError } from './base/errors.js';
import type { Bool, Dict, Num, OrderSide, OrderType, Str } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_weex
 * @augments weex
 */
export default class ob_weex extends weex {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_weex',
            'name': 'Weex',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': true,
                'future': false,
                'option': false,
                'fetchAccountId': true,
                'fetchPermissions': true,
                'isAuthenticatedRequest': true,
            },
            'options': {
                'partner': 'b-WEEX111174',
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
                    'adjustForTimeDifference': true,
                    'fixMarketStatus': true,
                    'requireOrderFeesFromTrades': true,
                    'hasBroker': true,
                    'myTradesFetchUseCcxtPaginate': true,
                },
            },
        });
    }

    async obFetchSpotAccount (params = {}): Promise<Dict> {
        return await this.privateGetApiV3Account (params);
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        const response = await this.obFetchSpotAccount (params);
        const uid = this.safeString (response, 'uid');
        if (uid === undefined) {
            throw new ExchangeError (this.id + ' missing uid');
        }
        return uid;
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        const response = await this.obFetchSpotAccount (params);
        const rights: string[] = [];
        const permissions = this.safeList (response, 'permissions', []);
        for (let permIdx = 0; permIdx < permissions.length; permIdx++) {
            const permission = String (permissions[permIdx]).toUpperCase ();
            if (permission === 'SPOT' || permission === 'SPOT_TRADING') {
                if (!this.inArray ('reading', rights)) {
                    rights.push ('reading');
                }
                if (!this.inArray ('spotTrading', rights)) {
                    rights.push ('spotTrading');
                }
            } else if (permission === 'READONLY' || permission === 'READ_ONLY') {
                if (!this.inArray ('reading', rights)) {
                    rights.push ('reading');
                }
            } else if (permission === 'FUTURES' || permission === 'FUTURES_TRADING' || permission === 'CONTRACT') {
                if (!this.inArray ('reading', rights)) {
                    rights.push ('reading');
                }
                if (!this.inArray ('futuresTrading', rights)) {
                    rights.push ('futuresTrading');
                }
            }
        }
        if (rights.length === 0) {
            rights.push ('reading');
        }
        if (this.safeBool (response, 'canWithdraw') && !this.inArray ('withdrawals', rights)) {
            rights.push ('withdrawals');
        }
        return rights;
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'headersJsonAny', {
            'needles': [ 'ACCESS-SIGN', 'ACCESS-KEY' ],
        });
    }

    obExtendParamsWithDefaultPartner (params = {}) {
        const defaultPartner = this.safeString (this.options, 'partner');
        if (this.safeString (params, 'partner') !== undefined || defaultPartner === undefined) {
            return params;
        }
        return this.extend ({ 'partner': defaultPartner }, params);
    }

    createSpotOrderRequest (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Dict {
        const userPartner = this.safeString (params, 'partner');
        const extendedParams = this.obExtendParamsWithDefaultPartner (params);
        const request = super.createSpotOrderRequest (symbol, type, side, amount, price, extendedParams);
        if (userPartner === undefined) {
            return this.omit (request, 'partner');
        }
        return request;
    }

    createContractOrderRequest (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Dict {
        const userPartner = this.safeString (params, 'partner');
        const extendedParams = this.obExtendParamsWithDefaultPartner (params);
        const request = super.createContractOrderRequest (symbol, type, side, amount, price, extendedParams);
        if (userPartner === undefined) {
            return this.omit (request, 'partner');
        }
        return request;
    }
}
