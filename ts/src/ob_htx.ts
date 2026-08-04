
//  ---------------------------------------------------------------------------

import htx from './htx.js';
import type { Dict, Market, Order, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_htx
 * @augments htx
 */
export default class ob_htx extends htx {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_htx',
            'name': 'HTX',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': true,
                'option': undefined,
                'fetchPermissions': true,
                'getOrdersBrokerParameters': true,
            },
            'options': {
                'createMarketBuyOrderRequiresPrice': false, // disable quote conversion
                'broker': {
                    'id': 'AAc4ccb049',
                },
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
                    'adjustForTimeDifference': true,
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
        return this.extend ({}, params);
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        // override the standard parseOrder to apply OctoBot's HTXCCXTAdapter.fix_order:
        // call the standard parseOrder then run adapt_amount_from_filled_or_cost
        const parsed = super.parseOrder (order, market) as Dict;
        this.obAdaptAmountFromFilledOrCost (parsed);
        return parsed as Order;
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's HTXCCXTAdapter.fix_ticker:
        // htx tickers may be returned with no timestamp, fall back to the current time
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
