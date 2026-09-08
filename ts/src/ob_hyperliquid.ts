
//  ---------------------------------------------------------------------------

import hyperliquid from './hyperliquid.js';
import type { Currency, Dict, Market, Ticker, Transaction } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class ob_hyperliquid
 * @augments hyperliquid
 */
export default class ob_hyperliquid extends hyperliquid {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'ob_hyperliquid',
            'name': 'Hyperliquid',
            'certified': false,
            'urls': {
                'referral': 'https://app.hyperliquid.xyz/join/OCTOBOT',
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
                    'myTradesFetchUseCcxtPaginate': true,
                },
                'ref': 'OCTOBOT',
                'builder': '0x4574F97475dc29034cf57bc1E255Ef1997b0cc43',
                'feeRate': '0.01%',
                'builderFee': true,
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

    parseTransaction (transaction: Dict, currency: Currency = undefined): Transaction {
        // override the standard parseTransaction: upstream leaves currency unset while amount comes from delta.usdc
        const parsed = super.parseTransaction (transaction, currency) as Dict;
        if (parsed['currency'] === undefined) {
            const delta = this.safeDict (transaction, 'delta', {});
            if (this.safeNumber (delta, 'usdc') !== undefined) {
                parsed['currency'] = 'USDC';
            } else {
                const token = this.safeString (delta, 'token');
                if (token !== undefined) {
                    parsed['currency'] = token;
                }
            }
        }
        return parsed as Transaction;
    }
}
