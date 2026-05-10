

//  ---------------------------------------------------------------------------

import coinex from './coinex.js';
import { OrderNotFound } from './base/errors.js';
import type { Bool, Dict, Market, Order, Str, Ticker, Trade } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_coinex extends coinex {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_coinex',
            'name': 'CoinEx',
            'certified': false,
            'urls': {
            },
            'exceptions': {
                'broad': {
                    'Order not found': OrderNotFound,
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
                'brokerId': 'x-124998316',
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
                    'supportFetchingCancelledOrders': false,
                    'enableSpotBuyMarketWithCost': true,
                    'hasBroker': true,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        return await this.obFetchPermissionsImaginaryCancel ('12345', 'BTC/USDT', params, 'pair');
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
    }

    async fetchAccountId (params = {}, _ccxtTypesImportStr: Str = undefined): Promise<Str> {
        return 'default_account_id';
    }

    isAuthenticatedRequest (url: Str, method: Str, headers: Dict, body, _ccxtTypesImportStr: Str = undefined): Bool {
        return this.obIsAuthenticatedRequest (url, method, headers, body, 'headersJsonAny', {
            'needles': [ 'Authorization', 'X-COINEX-SIGN' ],
        });
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's CoinexCCXTAdapter.fix_order:
        // 1) call the standard parseOrder
        // 2) translate coinex-specific status values (None -> closed, part_filled -> open, part_canceled -> canceled)
        // 3) re-tag maker_only orders as limit_maker (not converted by ccxt)
        // 4) adapt_amount_from_filled_or_cost helper
        const parsed = super.parseOrder (order, market) as Dict;
        this.obAdaptAmountFromFilledOrCost (parsed);
        const status = this.safeString (parsed, 'status');
        // from https://docs.coinex.com/api/v2/enum#order_status
        if (status === undefined) {
            parsed['status'] = 'closed';
        } else if (status === 'part_filled') {
            // order partially executed (still pending)
            parsed['status'] = 'open';
        } else if (status === 'part_canceled') {
            // order partially executed and then canceled
            parsed['status'] = 'canceled';
        }
        const orderType = this.safeStringLower (parsed, 'type');
        if (orderType === 'maker_only') {
            // maker_only is currently not converted by ccxt
            parsed['type'] = 'limit_maker';
        }
        return parsed as Order;
    }

    parseTrade (trade: Dict, market: Market = undefined): Trade {
        // override the standard parseTrade to apply OctoBot's CoinexCCXTAdapter.fix_trades:
        // coinex trades sometimes carry the fee in info.fee_ccy / info.fee, copy them to fee.currency / fee.cost
        const parsed = super.parseTrade (trade, market) as Dict;
        const info = this.safeDict (parsed, 'info', {}) as Dict;
        let fee = this.safeDict (parsed, 'fee') as Dict;
        if (fee === undefined) {
            fee = {} as Dict;
        }
        if (this.safeString (fee, 'currency') === undefined) {
            const feeCcy = this.safeString (info, 'fee_ccy');
            if (feeCcy !== undefined) {
                fee['currency'] = feeCcy;
            }
        }
        if (this.safeNumber (fee, 'cost') === undefined) {
            const feeCost = this.safeNumber (info, 'fee');
            if (feeCost !== undefined) {
                fee['cost'] = feeCost;
            }
        }
        parsed['fee'] = fee;
        return parsed as Trade;
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's CoinexCCXTAdapter.fix_ticker:
        // coinex tickers may be returned with no timestamp, fall back to the current time
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
        }
        return parsed as Ticker;
    }

    obAdaptAmountFromFilledOrCost (parsed: Dict): Dict {
        // shared OctoBot CCXTAdapter helper: when amount is missing, derive it from filled or cost/price
        const orderType = this.safeStringLower (parsed, 'type');
        const orderSide = this.safeStringLower (parsed, 'side');
        const filled = this.safeNumber (parsed, 'filled');
        if (orderType === 'market' && orderSide === 'buy' && filled !== undefined && filled !== 0) {
            parsed['amount'] = filled;
        }
        const amount = this.safeNumber (parsed, 'amount');
        const cost = this.safeNumber (parsed, 'cost');
        const price = this.safeNumber (parsed, 'price');
        if ((amount === undefined || amount === 0) && cost !== undefined && cost !== 0 && price !== undefined && price !== 0) {
            parsed['amount'] = cost / price;
        }
        return parsed;
    }
}
