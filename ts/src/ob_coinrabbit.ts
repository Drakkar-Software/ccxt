
//  ---------------------------------------------------------------------------

import coinrabbit from './coinrabbit.js';
import { ArgumentsRequired, AuthenticationError } from './base/errors.js';
import type { Dict, Num, Str } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_coinrabbit
 * @augments coinrabbit
 */
export default class ob_coinrabbit extends coinrabbit {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_coinrabbit',
            'name': 'CoinRabbit',
            'certified': false,
            'urls': {
                'api': {
                    'wallet': 'https://api.coinrabbit.io',
                },
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
            },
            'options': {
                'orderSource': 'octobot',
                'octobot': {
                    'supportedElements': {
                        'spot': {
                            'orders': [ 'market', 'limit' ],
                            'bundled_orders': {},
                        },
                        'futures': {
                            'orders': [],
                            'bundled_orders': {},
                        },
                    },
                    'fixMarketStatus': true,
                    'supportFetchingCancelledOrders': true,
                },
            },
        });
    }

    /**
     * @method
     * @name ob_coinrabbit#obTopUpTradingCell
     * @description top up a CoinRabbit trading cell via the wallet API
     * @param {string} code currency code (e.g. usdt)
     * @param {float} amount amount to top up
     * @param {string} network blockchain network identifier
     * @param {object} [params] extra parameters
     * @param {string} [params.userToken] CoinRabbit website JWT for x-user-token header
     * @param {string} [params.xApiKey] OctoBot settings API key for x-api-key header
     * @returns {object} top-up response payload
     */
    async obTopUpTradingCell (code: Str, amount: Num, network: Str, params = {}): Promise<Dict> {
        if (this.apiKey === undefined) {
            throw new AuthenticationError (this.id + ' requires "apiKey" credential');
        }
        const userToken = this.safeString2 (params, 'userToken', 'user_token');
        if (userToken === undefined) {
            throw new ArgumentsRequired (this.id + ' obTopUpTradingCell() requires a userToken parameter');
        }
        const xApiKey = this.safeString2 (params, 'xApiKey', 'x_api_key');
        if (xApiKey === undefined) {
            throw new ArgumentsRequired (this.id + ' obTopUpTradingCell() requires an xApiKey parameter');
        }
        if (code === undefined) {
            throw new ArgumentsRequired (this.id + ' obTopUpTradingCell() requires a code argument');
        }
        if (amount === undefined) {
            throw new ArgumentsRequired (this.id + ' obTopUpTradingCell() requires an amount argument');
        }
        if (network === undefined) {
            throw new ArgumentsRequired (this.id + ' obTopUpTradingCell() requires a network argument');
        }
        const requestBody = {
            'code': code.toLowerCase (),
            'network': network,
            'amount': this.numberToString (amount),
            'apiKey': this.apiKey,
        };
        const url = this.urls['api']['wallet'] + '/v2/trading/top-up';
        const headers = {
            'Content-Type': 'application/json',
            'x-user-token': userToken,
            'x-api-key': xApiKey,
        };
        const response = await this.fetch (url, 'POST', headers, this.json (requestBody));
        return this.coinrabbitUnwrapResponse (response);
    }
}
