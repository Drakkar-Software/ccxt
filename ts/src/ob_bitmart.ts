
//  ---------------------------------------------------------------------------

import bitmart from './bitmart.js';
import type { Dict, Market, Order, Str } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_bitmart extends bitmart {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_bitmart',
            'name': 'BitMart',
            'certified': false,
            'urls': {
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
            },
            'options': {
                'createMarketBuyOrderRequiresPrice': false, // disable quote conversion
                'brokerId': 'OCTOBOTBROKER01',
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
                    'enableSpotBuyMarketWithCost': true,
                    'supportFetchingCancelledOrders': false,
                    'adjustForTimeDifference': true,
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

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's BitMartCCXTAdapter.fix_order:
        // 1) call the standard parseOrder
        // 2) adapt amount from filled or cost when missing (shared CCXTAdapter helper)
        // 3) when bitmart returns a market order tagged as canceled but filled, mark it as closed
        const parsed = super.parseOrder (order, market) as Dict;
        this.obAdaptAmountFromFilledOrCost (parsed);
        const orderType = this.safeStringLower (parsed, 'type');
        const orderStatus = this.safeStringLower (parsed, 'status');
        const filled = this.safeNumber (parsed, 'filled');
        if (orderType === 'market' && orderStatus === 'canceled' && filled !== undefined && filled !== 0) {
            // consider as filled & closed (Bitmart is sometimes tagging filled market orders as "canceled": ignore it)
            parsed['status'] = 'closed';
        }
        return parsed as Order;
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
