
//  ---------------------------------------------------------------------------

import wizardswap from './wizardswap.js';
import type { Dict, Market, Order, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_wizardswap extends wizardswap {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_wizardswap',
            'name': 'WizardSwap',
            'certified': false,
            'urls': {
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
                'octobot': {
                    'supportedElements': {
                        'spot': {
                            'orders': [ 'market' ],
                            'bundled_orders': {},
                        },
                        'futures': {
                            'orders': [],
                            'bundled_orders': {},
                        },
                    },
                    'fixMarketStatus': true,
                    'supportFetchingCancelledOrders': false,
                    'requireClosedOrdersFromRecentTrades': false,
                    'createOhlcvFromTickers': true,
                },
            },
        });
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const parsed = super.parseOrder (order, market) as Dict;
        this.adaptWizardswapAddressFrom (parsed);
        this.ensureWizardswapFee (parsed);
        return parsed as Order;
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        const parsed = super.parseTicker (ticker, market) as Dict;
        this.ensureWizardswapTickerTimestamp (parsed);
        return parsed as Ticker;
    }

    adaptWizardswapAddressFrom (parsed: Dict): Dict {
        // mirror WizardSwapCCXTAdapter.fix_order: surface info.address_from
        // into 'esov' (ExchangeConstantsOrderColumns.EXCHANGE_SPECIFIC_ORDER_VALUES.value)
        const info = this.safeDict (parsed, 'info', {});
        const addressFrom = this.safeString (info, 'address_from');
        if (addressFrom !== undefined) {
            const existing = this.safeDict (parsed, 'esov', {});
            parsed['esov'] = this.extend (existing, { 'address_from': addressFrom });
        }
        return parsed;
    }

    ensureWizardswapFee (parsed: Dict): Dict {
        // mirror CCXTAdapter._ensure_fees: synthesize an empty fee dict if missing
        if (this.safeValue (parsed, 'fee') === undefined) {
            parsed['fee'] = {
                'cost': 0,
                'currency': undefined,
                'rate': undefined,
            };
        }
        return parsed;
    }

    ensureWizardswapTickerTimestamp (parsed: Dict): Dict {
        // mirror WizardSwapCCXTAdapter.fix_ticker: backfill timestamp when missing
        if (this.safeInteger (parsed, 'timestamp') === undefined) {
            const now = this.milliseconds ();
            parsed['timestamp'] = now;
            parsed['datetime'] = this.iso8601 (now);
        }
        return parsed;
    }
}
