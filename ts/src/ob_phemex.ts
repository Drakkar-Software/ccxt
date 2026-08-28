
//  ---------------------------------------------------------------------------

import phemex from './phemex.js';
import type { Dict, Market, Num, Order, OrderSide, OrderType, Str } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_phemex
 * @augments phemex
 */
export default class ob_phemex extends phemex {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_phemex',
            'name': 'Phemex',
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
                'fetchPermissions': true,
                'getOrdersBrokerParameters': true,
            },
            'options': {
                'brokerId': 'Octobot',
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
                    'hasBroker': true,
                    'myTradesFetchUseCcxtPaginate': true,
                },
            },
        });
    }

    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        // Spot Market orders: passing price switches base implementation to qtyType ByQuote and builds cost via amount × price;
        // clear price here so qty stays ByBase (OctoBot phemex_exchange.py create_order parity).
        await this.loadMarkets ();
        const market = this.market (symbol);
        let usePrice = price;
        const capType = this.capitalize (type);
        if (market['spot'] && capType === 'Market') {
            usePrice = undefined;
        }
        return await super.createOrder (symbol, type, side, amount, usePrice, params);
    }

    async cancelOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        // Cancel response may expose unified status canceling; those orders cannot be fetched reliably on Phemex.
        // Coerce to canceled — same intent as tentacle PENDING_CANCEL -> CANCELED.
        const order = await super.cancelOrder (id, symbol, params) as Dict;
        const st = this.safeStringLower (order, 'status');
        if (st === 'canceling') {
            order['status'] = 'canceled';
        }
        return order as Order;
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        await this.fetchBalance (params);
        return [ 'reading', 'spotTrading', 'futuresTrading', 'marginTrading' ];
    }

    getOrdersBrokerParameters (params = {}): any {
        return this.extend ({}, params);
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's PhemexCCXTAdapter.fix_order:
        // 1) when phemex omits fee.currency, fall back to info.feeCurrency
        // 2) for closed orders, phemex returns base_amount which becomes "amount"; the actual filled
        //    amount is amount - remaining (mirrors the Python that converts base_amount -> filled)
        const parsed = super.parseOrder (order, market) as Dict;
        const status = this.safeStringLower (parsed, 'status');
        if (status === 'closed') {
            const info = this.safeDict (parsed, 'info', {}) as Dict;
            const fee = this.safeDict (parsed, 'fee') as Dict;
            if (fee !== undefined && this.safeString (fee, 'currency') === undefined) {
                const feeCurrency = this.safeString (info, 'feeCurrency');
                if (feeCurrency !== undefined) {
                    fee['currency'] = feeCurrency;
                    parsed['fee'] = fee;
                }
            }
            const amount = this.safeNumber (parsed, 'amount');
            const remaining = this.safeNumber (parsed, 'remaining');
            if (amount !== undefined && remaining !== undefined) {
                // base_amount is converted to amount by ccxt: real filled amount is amount - remaining
                parsed['amount'] = amount - remaining;
            }
        }
        return parsed as Order;
    }
}
