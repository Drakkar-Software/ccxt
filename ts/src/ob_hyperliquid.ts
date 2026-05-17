
//  ---------------------------------------------------------------------------

import hyperliquid from './hyperliquid.js';
import type { Dict, Market, Ticker } from './base/types.js';

//  ---------------------------------------------------------------------------

export default class ob_hyperliquid extends hyperliquid {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_hyperliquid',
            'name': 'Hyperliquid',
            'certified': false,
            'urls': {
            },
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': true,
                'future': true,
                'option': false,
            },
            'options': {
                'hip3TokensByName': {},
                'fetchMarkets': {
                    'types': [ 'spot' ], // only hyperliquid spot markets are supported
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
                    'requireOrderFeesFromTrades': true,
                    'expectPossibleNotFoundOrderDuringOrderCreation': true,
                },
            },
        });
    }

    /**
     * Bump `limits.cost.min` by 10% (same intent as former HyperLiquidCCXTAdapter.fix_market_status):
     * Hyperliquid may reject orders that are only slightly above the advertised minimum notional.
     * @name ob_hyperliquid#obBumpHyperliquidCostMin
     * @param market Parsed market structure from CCXT.
     * @returns Market with adjusted minimum cost limit when applicable.
     */
    obBumpHyperliquidCostMin (market: Market): Market {
        const marketDict = market as Dict;
        const limits = this.safeDict (marketDict, 'limits', {});
        const cost = this.safeDict (limits, 'cost', {});
        const minCost = this.safeNumber (cost, 'min');
        if (minCost !== undefined) {
            cost['min'] = minCost * 1.1;
        }
        return market;
    }

    parseMarket (market: Dict): Market {
        const parsed = super.parseMarket (market) as Market;
        return this.obBumpHyperliquidCostMin (parsed);
    }

    async fetchSpotMarkets (params = {}): Promise<Market[]> {
        const markets = await super.fetchSpotMarkets (params);
        const result = [];
        for (let i = 0; i < markets.length; i++) {
            result.push (this.obBumpHyperliquidCostMin (markets[i]));
        }
        return result;
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // override the standard parseTicker to apply OctoBot's HyperliquidCCXTAdapter.fix_ticker:
        // hyperliquid tickers may be returned with no timestamp, fall back to the current time
        const parsed = super.parseTicker (ticker, market) as Dict;
        if (!this.safeInteger (parsed, 'timestamp')) {
            parsed['timestamp'] = this.milliseconds ();
        }
        return parsed as Ticker;
    }
}
