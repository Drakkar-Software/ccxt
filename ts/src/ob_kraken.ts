
//  ---------------------------------------------------------------------------

import kraken from './kraken.js';
import { AuthenticationError, OperationFailed } from './base/errors.js';
import type { Dict, Market, Order, Str, Ticker, Trade } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_kraken
 * @augments kraken
 */
export default class ob_kraken extends kraken {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_kraken',
            'name': 'Kraken',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'exact': {
                    'EAPI:Invalid nonce': OperationFailed, // should instantly retry
                },
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
                'maxRetriesOnFailure': 5,
                'maxRetriesOnFailureDelay': 0,
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
                    'myTradesSymbolFilterIsClientSide': true,
                    'myTradesFetchPaginationOffset': 'ofs',
                },
            },
        });
    }

    obKrakenLastNonceByApiKeyMap (): Dict {
        const classRef = ob_kraken as any;
        let lastNonceByApiKey: Dict;
        try {
            lastNonceByApiKey = classRef.obKrakenLastNonceByApiKey;
        } catch (caughtObKrakenNonceMapError) {
            lastNonceByApiKey = undefined;
        }
        if (lastNonceByApiKey === undefined) {
            lastNonceByApiKey = {};
            classRef.obKrakenLastNonceByApiKey = lastNonceByApiKey;
        }
        return lastNonceByApiKey;
    }

    /**
     * @method
     * @name ob_kraken#nonce
     * @description Process-wide monotonic nonce per API key. Kraken requires strictly
     *   increasing nonces across all clients using the same key in one process.
     * @returns {number} monotonic nonce
     */
    nonce () {
        const apiKey = this.apiKey;
        if (apiKey === undefined) {
            return this.milliseconds () - this.options['timeDifference'];
        }
        const candidate = this.milliseconds () - this.options['timeDifference'];
        const lastNonceByApiKey = this.obKrakenLastNonceByApiKeyMap ();
        const storedNonce = this.safeInteger (lastNonceByApiKey, apiKey);
        const previousNonce = (storedNonce === undefined) ? 0 : storedNonce;
        const nextNonce = Math.max (candidate, previousNonce + 1);
        lastNonceByApiKey[apiKey] = nextNonce;
        return nextNonce;
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

    /**
     * OctoBot Kraken adapter: normalize conditional order/trade types for portfolio history.
     * @name ob_kraken#adaptKrakenOrderOrTradeType
     * @param {object} parsed parsed order/trade dict (mutated in place)
     */
    adaptKrakenOrderOrTradeType (parsed: Dict) {
        const orderInfo = this.safeDict (parsed, 'info', {});
        let rawType = this.safeString (orderInfo, 'tradeordertype');
        if (rawType === undefined) {
            rawType = this.safeString (parsed, 'type');
        }
        if (rawType === undefined) {
            return;
        }
        let normalizedKey = '';
        const rawTypeLower = rawType.toLowerCase ();
        for (let charIndex = 0; charIndex < rawTypeLower.length; charIndex++) {
            const currentChar = rawTypeLower[charIndex];
            if (currentChar === ' ' || currentChar === '_') {
                normalizedKey += '-';
            } else {
                normalizedKey += currentChar;
            }
        }
        const krakenTypeMap: Dict = {
            'stop-loss-limit': 'stop_loss_limit',
            'stop-limit': 'stop_loss_limit',
            'stop-loss': 'stop_loss',
            'take-profit-limit': 'take_profit_limit',
            'take-profit': 'take_profit',
            'trailing-stop-limit': 'stop_loss_limit',
            'liquidation-market': 'market',
        };
        const mappedType = this.safeString (krakenTypeMap, normalizedKey);
        if (mappedType !== undefined) {
            parsed['type'] = mappedType;
            return;
        }
        const parseOrderTypeResult = this.parseOrderType (rawType);
        if (parseOrderTypeResult !== rawType) {
            parsed['type'] = parseOrderTypeResult;
        }
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const parsed = super.parseOrder (order, market) as Dict;
        this.adaptKrakenOrderOrTradeType (parsed);
        return parsed as Order;
    }

    /**
     * @method
     * @name ob_kraken#parseTrade
     * @description Inherits kraken.parseTrade fee parsing (fee.currency=quote). TradesHistory
     *   does not expose oflags/fciq/fcib; base-fee trades can mislabel fee currency. See
     *   OctoBot kraken_exchange.py for portfolio-history replay impact.
     * @param {object} trade trade structure from the exchange
     * @param {object} [market] market structure
     * @returns {object} parsed trade
     */
    parseTrade (trade: Dict, market: Market = undefined): Trade {
        const parsed = super.parseTrade (trade, market) as Dict;
        this.adaptKrakenOrderOrTradeType (parsed);
        return parsed as Trade;
    }
}
