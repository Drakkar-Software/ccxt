
//  ---------------------------------------------------------------------------

import bitget from './bitget.js';
import type { Dict, Market, Order, Trade } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_bitget
 * @augments bitget
 */
export default class ob_bitget extends bitget {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_bitget',
            'name': 'Bitget',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': true,
                'option': false,
                'fetchPermissions': true,
                'getOrdersBrokerParameters': true,
            },
            'options': {
                'createMarketBuyOrderRequiresPrice': false, // disable quote conversion
                'broker': 'Octobot',
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
                    'enableSpotBuyMarketWithCost': true,
                    'hasBroker': true,
                },
            },
        });
    }

    async fetchPermissions (params = {}): Promise<string[]> {
        await this.fetchBalance (params);
        return [ 'reading', 'spotTrading', 'futuresTrading', 'marginTrading' ];
    }

    getOrdersBrokerParameters (params = {}): any {
        const clientOrderId = 'Octobot#' + this.uuid22 ();
        return this.extend ({
            'clientOrderId': clientOrderId,
        }, params);
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's BitgetCCXTAdapter.fix_order:
        // call the standard parseOrder then run adapt_amount_from_filled_or_cost
        const parsed = super.parseOrder (order, market) as Dict;
        this.obAdaptAmountFromFilledOrCost (parsed);
        return parsed as Order;
    }

    parseTrade (trade: Dict, market: Market = undefined): Trade {
        // override the standard parseTrade to apply OctoBot's BitgetCCXTAdapter.fix_trades:
        // bitget trades sometimes carry the fee currency under the "code" key, copy it to "currency"
        const parsed = super.parseTrade (trade, market) as Dict;
        const fee = this.safeDict (parsed, 'fee') as Dict;
        if (fee !== undefined && this.safeString (fee, 'currency') === undefined) {
            const code = this.safeString (fee, 'code');
            if (code !== undefined) {
                fee['currency'] = code;
                parsed['fee'] = fee;
            }
        }
        return parsed as Trade;
    }

    obAdaptAmountFromFilledOrCost (parsed: Dict): Dict {
        // shared OctoBot CCXTAdapter helper: when amount is missing, derive it from filled or cost/price
        const orderType = this.safeStringLower (parsed, 'type');
        const orderSide = this.safeStringLower (parsed, 'side');
        const filled = this.safeNumber (parsed, 'filled');
        if (orderType === 'market' && orderSide === 'buy' && filled !== undefined && filled !== 0) {
            // convert amount to use the base unit: use FILLED for accuracy (when not None/0)
            parsed['amount'] = filled;
        }
        const amount = this.safeNumber (parsed, 'amount');
        const cost = this.safeNumber (parsed, 'cost');
        const price = this.safeNumber (parsed, 'price');
        if ((amount === undefined || amount === 0) && cost !== undefined && cost !== 0 && price !== undefined && price !== 0) {
            // convert amount to use the base unit
            parsed['amount'] = cost / price;
        }
        return parsed;
    }
}
