
//  ---------------------------------------------------------------------------

import changenow from './changenow.js';
import type { Dict, Market, Order, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_changenow extends changenow {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_changenow',
            'name': 'ChangeNOW',
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
                'defaultAPIKey': '5f7dc0622f06ed2256261edd51a062c551cb93b799909f02dcaf695c40493c6c',
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
                    'removeMarketStatusPriceLimits': true,
                    'supportFetchingCancelledOrders': false,
                    'requireClosedOrdersFromRecentTrades': false,
                    'createOhlcvFromTickers': true,
                    'lazyLoadMarkets': true,
                },
            },
        });
    }

    /**
     * @method
     * @name ob_changenow#obLoadMarketsForSymbols
     * @description lazily loads and returns fixed market status structures for the given symbols
     * @see https://changenow.io/api/docs
     * @param {string[]} symbols list of unified market symbols
     * @param {boolean} reload when true, re-fetch symbols even if already cached in this.markets
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} list of fixed market status structures
     */
    async obLoadMarketsForSymbols (symbols: string[], reload = false, params = {}): Promise<Dict[]> {
        await super.obLoadMarketsForSymbols (symbols, reload, params);
        const symbolsLength = symbols.length;
        const result = [];
        for (let symbolIndex = 0; symbolIndex < symbolsLength; symbolIndex++) {
            result.push (this.obGetFixedMarketStatus (symbols[symbolIndex]));
        }
        return result;
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const parsed = super.parseOrder (order, market) as Dict;
        this.adaptChangenowPayinToEsovAddressFrom (parsed);
        this.ensureChangenowFee (parsed);
        return parsed as Order;
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        const parsed = super.parseTicker (ticker, market) as Dict;
        this.ensureChangenowTickerTimestamp (parsed);
        return parsed as Ticker;
    }

    adaptChangenowPayinToEsovAddressFrom (parsed: Dict): Dict {
        // surface info.payinAddress into 'esov' as address_from (OctoBot unified key)
        const info = this.safeDict (parsed, 'info', {});
        const addressFrom = this.safeString (info, 'payinAddress');
        if (addressFrom !== undefined) {
            const existing = this.safeDict (parsed, 'esov', {});
            parsed['esov'] = this.extend (existing, { 'address_from': addressFrom });
        }
        return parsed;
    }

    ensureChangenowFee (parsed: Dict): Dict {
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

    ensureChangenowTickerTimestamp (parsed: Dict): Dict {
        if (this.safeInteger (parsed, 'timestamp') === undefined) {
            const now = this.milliseconds ();
            parsed['timestamp'] = now;
            parsed['datetime'] = this.iso8601 (now);
        }
        return parsed;
    }
}
