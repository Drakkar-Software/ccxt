// ----------------------------------------------------------------------------

import Exchange from './abstract/polymarket.js';
import { ExchangeError, ArgumentsRequired, AuthenticationError, PermissionDenied, BadRequest, InvalidOrder, InsufficientFunds, OrderNotFound, RateLimitExceeded, NetworkError, ExchangeNotAvailable, OnMaintenance } from './base/errors.js';
import { keccak_256 as keccak } from './static_dependencies/noble-hashes/sha3.js';
import { sha256 } from './static_dependencies/noble-hashes/sha256.js';
import { secp256k1 } from './static_dependencies/noble-curves/secp256k1.js';
import { ecdsa } from './base/functions/crypto.js';
import { Precise } from './base/Precise.js';
import type { Int, OrderBook, OrderBooks, Str, Dict, Ticker, Tickers, Strings, Market, int, MarketType, Trade, OHLCV, Order, OrderSide, OrderType, Num, OrderRequest, TradingFeeInterface, Position } from './base/types.js';

// ----------------------------------------------------------------------------

/**
 * @class polymarket
 * @augments Exchange
 * @description Polymarket is a decentralized prediction market platform
 */
export default class polymarket extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'polymarket',
            'name': 'Polymarket',
            'countries': [ 'US' ],
            'version': '1',
            // Rate limits are enforced using Cloudflare's throttling system
            // Requests over the limit are throttled/delayed rather than rejected
            // See https://docs.polymarket.com/quickstart/introduction/rate-limits
            // Cost calculation formula: cost = (1000 / rateLimit) * 60 / requests_per_minute
            // With rateLimit = 50ms (20 req/s = 1200 req/min), base cost = 1.0
            // General limits:
            // - General Rate Limiting: 5000 requests / 10s (500 req/s = 30000 req/min) => cost = 0.04
            // - CLOB (General): 5000 requests / 10s (500 req/s = 30000 req/min) => cost = 0.04
            // - GAMMA (General): 750 requests / 10s (75 req/s = 4500 req/min) => cost = 0.267
            // - Data API (General): 200 requests / 10s (20 req/s = 1200 req/min) => cost = 1.0
            // Setting to 50ms (20 req/s) to match the most restrictive general limit (Data API)
            // Specific endpoint costs are calculated relative to this base rateLimit
            'rateLimit': 50, // 20 requests per second (matches Data API general limit)
            'certified': false,
            'pro': true,
            'requiredCredentials': {
                'apiKey': false,
                'secret': false,
                'walletAddress': true,
                'privateKey': true,
            },
            'has': {
                'CORS': undefined,
                'spot': false,
                'margin': false,
                'swap': false,
                'future': false,
                'option': true,
                'addMargin': false,
                'cancelOrder': true,
                'cancelOrders': true,
                'createDepositAddress': true, // TODO with https://docs.polymarket.com/developers/misc-endpoints/bridge-deposit
                'createMarketBuyOrderWithCost': false,
                'createMarketOrder': true,
                'createMarketOrderWithCost': false,
                'createMarketSellOrderWithCost': false,
                'createOrder': true,
                'createOrders': true,
                'createStopLimitOrder': false,
                'createStopMarketOrder': false,
                'createStopOrder': false,
                'editOrder': false,
                'fetchBalance': true,
                'fetchBorrowInterest': false,
                'fetchBorrowRateHistories': false,
                'fetchBorrowRateHistory': false,
                'fetchClosedOrders': false,
                'fetchClosedPositions': true,
                'fetchCrossBorrowRate': false,
                'fetchCrossBorrowRates': false,
                'fetchCurrencies': false,
                'fetchDepositAddress': false, 
                'fetchDepositAddresses': true, // TODO with https://docs.polymarket.com/developers/misc-endpoints/bridge-supported-assets
                'fetchDepositAddressesByNetwork': true, // TODO with https://docs.polymarket.com/developers/misc-endpoints/bridge-supported-assets
                'fetchDeposits': false,
                'fetchFundingHistory': false,
                'fetchFundingRate': false,
                'fetchFundingRateHistory': false,
                'fetchFundingRates': false,
                'fetchIndexOHLCV': false,
                'fetchIsolatedBorrowRate': false,
                'fetchIsolatedBorrowRates': false,
                'fetchLedger': false,
                'fetchLedgerEntry': false,
                'fetchLeverageTiers': false,
                'fetchMarkets': true,
                'fetchMarkOHLCV': false,
                'fetchMyTrades': true,
                'fetchOHLCV': true,
                'fetchOpenInterest': true,
                'fetchOpenInterestHistory': false,
                'fetchOpenOrders': true,
                'fetchOrder': true,
                'fetchOrderBook': true,
                'fetchOrderBooks': true,
                'fetchOrders': true,
                'fetchPosition': false,
                'fetchPositionMode': false,
                'fetchPositions': true,
                'fetchPremiumIndexOHLCV': false,
                'fetchStatus': true,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchTime': true,
                'fetchTrades': true,
                'fetchTradingFee': true,
                'fetchTradingFees': false,
                'fetchUserClosedPositions': true,
                'fetchUserPositions': true,
                'fetchWithdrawals': false,
                'setLeverage': false,
                'setMarginMode': false,
                'transfer': false,
                'withdraw': false,
            },
            'urls': {
                'logo': 'https://polymarket.com/favicon.ico',
                'api': {
                    'gamma': 'https://gamma-api.polymarket.com',
                    'clob': 'https://clob.polymarket.com', // Can be overridden with options.clobHost
                    'data': 'https://data-api.polymarket.com',
                    'bridge': 'https://bridge.polymarket.com',
                    'ws': 'wss://ws-subscriptions-clob.polymarket.com/ws/', // CLOB WebSocket for subscriptions
                    'rtds': 'wss://ws-live-data.polymarket.com', // Real Time Data Socket for crypto prices and comments
                },
                'test': {}, // TODO if exists
                'www': 'https://polymarket.com',
                'doc': [
                    'https://docs.polymarket.com',
                ],
                'fees': 'https://docs.polymarket.com/developers/CLOB/introduction',
            },
            'api': {
                // GAMMA API: https://gamma-api.polymarket.com
                // Rate limits: https://docs.polymarket.com/quickstart/introduction/rate-limits
                // Cost calculation: cost = (1000 / 50) * 60 / requests_per_minute = 1200 / requests_per_minute
                // - GAMMA (General): 750 requests / 10s (75 req/s = 4500 req/min) => cost = 0.267
                // - GAMMA Get Comments: 100 requests / 10s (10 req/s = 600 req/min) => cost = 2.0
                // - GAMMA /events: 100 requests / 10s (10 req/s = 600 req/min) => cost = 2.0
                // - GAMMA /markets: 125 requests / 10s (12.5 req/s = 750 req/min) => cost = 1.6
                // - GAMMA /markets /events listing: 100 requests / 10s (10 req/s = 600 req/min) => cost = 2.0
                // - GAMMA Tags: 100 requests / 10s (10 req/s = 600 req/min) => cost = 2.0
                // - GAMMA Search: 300 requests / 10s (30 req/s = 1800 req/min) => cost = 0.667
                'gamma': {
                    'public': {
                        'get': {
                            // Market endpoints
                            'markets': 1.6,                     // GET /markets - used by fetchMarkets (125 req/10s = 750 req/min)
                            'markets/{id}': 0.267,              // GET /markets/{id} - used by gammaPublicGetMarketsId (general limit)
                            'markets/{id}/tags': 2.0,            // GET /markets/{id}/tags - used by gammaPublicGetMarketsIdTags (100 req/10s = 600 req/min)
                            'markets/slug/{slug}': 0.267,        // GET /markets/slug/{slug} - used by gammaPublicGetMarketsSlugSlug (general limit)
                            // Event endpoints
                            'events': 2.0,                      // GET /events - used by gammaPublicGetEvents (100 req/10s = 600 req/min)
                            'events/{id}': 0.267,                // GET /events/{id} - used by gammaPublicGetEventsId (general limit)
                            // Series endpoints
                            'series': 0.267,                     // GET /series - used by gammaPublicGetSeries (general limit)
                            'series/{id}': 0.267,               // GET /series/{id} - used by gammaPublicGetSeriesId (general limit)
                            // Search endpoints
                            'search': 0.667,                     // GET /search - used by gammaPublicGetSearch (300 req/10s = 1800 req/min)
                            // Comment endpoints
                            'comments': 2.0,                     // GET /comments - used by gammaPublicGetComments (100 req/10s = 600 req/min)
                            'comments/{id}': 0.267,             // GET /comments/{id} - used by gammaPublicGetCommentsId (general limit)
                            // Sports endpoints
                            'sports': 0.267,                    // GET /sports - used by gammaPublicGetSports (general limit)
                            'sports/{id}': 0.267,               // GET /sports/{id} - used by gammaPublicGetSportsId (general limit)
                        },
                    },
                },
                // Data-API: https://data-api.polymarket.com
                // Rate limits: https://docs.polymarket.com/quickstart/introduction/rate-limits
                // Cost calculation: cost = (1000 / 50) * 60 / requests_per_minute = 1200 / requests_per_minute
                // - Data API (General): 200 requests / 10s (20 req/s = 1200 req/min) => cost = 1.0
                // - Data API (Alternative): 1200 requests / 1 minute (20 req/s = 1200 req/min) => cost = 1.0
                // - Data API /trades: 75 requests / 10s (7.5 req/s = 450 req/min) => cost = 2.67
                // - Data API "OK" Endpoint: 10 requests / 10s (1 req/s = 60 req/min) => cost = 20.0
                'data': {
                    'public': {
                        'get': {
                            // Core endpoints (from Data-API)
                            'positions': 1.0,                     // GET /positions - used by dataPublicGetPositions (200 req/10s = 1200 req/min)
                            'trades': 2.67,                      // GET /trades - used by dataPublicGetTrades (75 req/10s = 450 req/min)
                            'activity': 1.0,                      // GET /activity - used by dataPublicGetActivity (200 req/10s = 1200 req/min)
                            'holders': 1.0,                       // GET /holders - used by dataPublicGetHolders (200 req/10s = 1200 req/min)
                            'value': 1.0,                         // GET /value - used by dataPublicGetTotalValue (200 req/10s = 1200 req/min)
                            'closed-positions': 1.0,             // GET /closed-positions - used by dataPublicGetClosedPositions (200 req/10s = 1200 req/min)
                            // Misc endpoints (from Data-API)
                            'traded': 1.0,                        // GET /traded - used by dataPublicGetTraded (200 req/10s = 1200 req/min)
                            'oi': 1.0,                            // GET /oi - used by dataPublicGetOpenInterest (200 req/10s = 1200 req/min)
                            'live-volume': 1.0,                   // GET /live-volume - used by dataPublicGetLiveVolume (200 req/10s = 1200 req/min)
                        },
                    },
                },
                // Bridge API: https://bridge.polymarket.com
                // Rate limits: Not explicitly documented, using conservative general rate limits
                // Assuming similar to Data API: 200 requests / 10s (20 req/s = 1200 req/min) => cost = 1.0
                'bridge': {
                    'public': {
                        'get': {
                            // Bridge endpoints
                            'supported-assets': 1.0,              // GET /supported-assets - used by bridgePublicGetSupportedAssets (assumed 200 req/10s)
                        },
                        'post': {
                            // Bridge endpoints
                            'deposit': 1.0,                       // POST /deposit - used by bridgePublicPostDeposit (assumed 200 req/10s)
                        },
                    },
                },
                // CLOB API: https://clob.polymarket.com
                // Rate limits: https://docs.polymarket.com/quickstart/introduction/rate-limits
                // Cost calculation: cost = (1000 / 50) * 60 / requests_per_minute = 1200 / requests_per_minute
                // General CLOB Endpoints:
                // - CLOB (General): 5000 requests / 10s (500 req/s = 30000 req/min) => cost = 0.04
                // - CLOB GET Balance Allowance: 125 requests / 10s (12.5 req/s = 750 req/min) => cost = 1.6
                // - CLOB UPDATE Balance Allowance: 20 requests / 10s (2 req/s = 120 req/min) => cost = 10.0
                // CLOB Market Data:
                // - CLOB /book: 200 requests / 10s (20 req/s = 1200 req/min) => cost = 1.0
                // - CLOB /books: 80 requests / 10s (8 req/s = 480 req/min) => cost = 2.5
                // - CLOB /price: 200 requests / 10s (20 req/s = 1200 req/min) => cost = 1.0
                // - CLOB /prices: 80 requests / 10s (8 req/s = 480 req/min) => cost = 2.5
                // - CLOB /midprice: 200 requests / 10s (20 req/s = 1200 req/min) => cost = 1.0
                // - CLOB /midprices: 80 requests / 10s (8 req/s = 480 req/min) => cost = 2.5
                // CLOB Ledger Endpoints:
                // - CLOB Ledger (/trades /orders /notifications /order): 300 requests / 10s (30 req/s = 1800 req/min) => cost = 0.667
                // - CLOB Ledger /data/orders: 150 requests / 10s (15 req/s = 900 req/min) => cost = 1.33
                // - CLOB Ledger /data/trades: 150 requests / 10s (15 req/s = 900 req/min) => cost = 1.33
                // - CLOB /notifications: 125 requests / 10s (12.5 req/s = 750 req/min) => cost = 1.6
                // CLOB Markets & Pricing:
                // - CLOB Price History: 100 requests / 10s (10 req/s = 600 req/min) => cost = 2.0
                // - CLOB Markets: 250 requests / 10s (25 req/s = 1500 req/min) => cost = 0.8
                // - CLOB Market Tick Size: 50 requests / 10s (5 req/s = 300 req/min) => cost = 4.0
                // - CLOB markets/0x: 50 requests / 10s (5 req/s = 300 req/min) => cost = 4.0
                // - CLOB /markets listing: 100 requests / 10s (10 req/s = 600 req/min) => cost = 2.0
                // CLOB Authentication:
                // - CLOB API Keys: 50 requests / 10s (5 req/s = 300 req/min) => cost = 4.0
                // CLOB Trading Endpoints (using sustained limits, not BURST):
                // - CLOB POST /order: 24000 requests / 10 minutes (40 req/s = 2400 req/min) => cost = 0.5
                // - CLOB DELETE /order: 24000 requests / 10 minutes (40 req/s = 2400 req/min) => cost = 0.5
                // - CLOB POST /orders: 12000 requests / 10 minutes (20 req/s = 1200 req/min) => cost = 1.0
                // - CLOB DELETE /orders: 12000 requests / 10 minutes (20 req/s = 1200 req/min) => cost = 1.0
                // - CLOB DELETE /cancel-all: 3000 requests / 10 minutes (5 req/s = 300 req/min) => cost = 4.0
                // - CLOB DELETE /cancel-market-orders: 12000 requests / 10 minutes (20 req/s = 1200 req/min) => cost = 1.0
                'clob': {
                    'public': {
                        'get': {
                            // Order book endpoints
                            'orderbook': 1.0,                     // GET /book - used by fetchOrderBook (200 req/10s = 1200 req/min)
                            'orderbook/{token_id}': 0.04,        // Not used (deprecated format, general limit)
                            // Trade endpoints
                            'market/{condition_id}/trades': 0.04, // Not used (deprecated, use /trades instead, general limit)
                            'trades': 0.667,                    // GET /data/trades - used by fetchTrades (300 req/10s = 1800 req/min)
                            // Price history endpoints
                            'prices-history': 2.0,              // GET /prices-history - used by fetchOHLCV (100 req/10s = 600 req/min)
                            // Pricing endpoints
                            'price': 1.0,                       // GET /price - available but using POST /prices instead (200 req/10s = 1200 req/min)
                            'prices': 2.5,                      // GET /prices - used by fetchTickers (80 req/10s = 480 req/min)
                            // Midpoint endpoints
                            'midpoint': 1.0,                    // GET /midpoint - used by fetchTicker (200 req/10s = 1200 req/min)
                            'midpoints': 2.5,                   // GET /midpoints - available for fetchTickers enhancement (80 req/10s = 480 req/min)
                            // Spread endpoints
                            'spread': 0.04,                     // GET /spread - available for fetchTicker enhancement (general limit)
                            // Last trade price endpoints
                            'last-trade-price': 0.04,           // GET /last-trade-price - available for ticker enhancement (general limit)
                            'last-trades-prices': 0.04,         // GET /last-trades-prices - available for tickers enhancement (general limit)
                            // Utility endpoints
                            '': 4.0,                            // GET / - health check endpoint used by fetchStatus/clobPublicGetOk (50 req/10s = 300 req/min)
                            'time': 0.04,                       // GET /time - used by fetchTime (general limit)
                            'tick-size': 4.0,                   // GET /tick-size - used for market precision (50 req/10s = 300 req/min)
                            'neg-risk': 0.04,                   // GET /neg-risk - used for market metadata (general limit)
                            'fee-rate': 0.04,                   // GET /fee-rate - used by fetchTradingFee (general limit)
                            'markets': 2.0,                     // GET /markets - used by fetchMarkets (100 req/10s = 600 req/min)
                        },
                        'post': {
                            // Order book endpoints
                            'books': 2.5,                      // POST /books - used by fetchOrderBooks (80 req/10s = 480 req/min)
                            // Spread endpoints
                            'spreads': 0.04,                    // POST /spreads - used by fetchTickers (optional, general limit)
                            // Pricing endpoints
                            'prices': 2.5,                      // POST /prices - used by fetchTicker (80 req/10s = 480 req/min)
                        },
                    },
                    'private': {
                        'get': {
                            // Order endpoints
                            'order': 0.667,                     // GET /data/order/{order_id} - used by fetchOrder (300 req/10s = 1800 req/min)
                            'orders': 1.33,                     // GET /data/orders - used by fetchOrders, fetchOpenOrders (150 req/10s = 900 req/min)
                            // Trade endpoints
                            'trades': 0.667,                    // GET /data/trades - used by fetchMyTrades (300 req/10s = 1800 req/min)
                            'builder-trades': 0.667,             // GET /builder-trades - used for builder trades (300 req/10s = 1800 req/min)
                            // Notification endpoints
                            'notifications': 1.6,                // GET /notifications - used by getNotifications (125 req/10s = 750 req/min)
                            // Balance endpoints
                            'balance-allowance': 1.6,           // GET /balance-allowance - used by fetchBalance/getBalanceAllowance (125 req/10s = 750 req/min)
                            // Order scoring endpoints
                            'order-scoring': 0.04,               // GET /order-scoring - used by isOrderScoring (general limit)
                            // API credential endpoints (L1 authentication - uses manual URL building)
                            'auth/derive-api-key': 4.0,         // GET /auth/derive-api-key - used by derive_api_key (50 req/10s = 300 req/min)
                        },
                        'post': {
                            // Order creation endpoints
                            'order': 0.5,                       // POST /order - used by createOrder (24000 req/10min = 2400 req/min sustained)
                            'orders': 1.0,                      // POST /orders - used by createOrders (12000 req/10min = 1200 req/min sustained)
                            // Order scoring endpoints
                            'orders-scoring': 0.04,             // POST /orders-scoring - used by areOrdersScoring (general limit)
                            // API credential endpoints
                            'auth/api-key': 4.0,                // POST /auth/api-key - used by create_or_derive_api_creds (50 req/10s = 300 req/min)
                        },
                        'delete': {
                            // Order cancellation endpoints
                            'order': 0.5,                       // DELETE /order - used by cancelOrder (24000 req/10min = 2400 req/min sustained)
                            'orders': 1.0,                      // DELETE /orders - used by cancelOrders (12000 req/10min = 1200 req/min sustained)
                            'cancel-all': 4.0,                   // DELETE /cancel-all - used by cancelAllOrders (3000 req/10min = 300 req/min sustained)
                            'cancel-market-orders': 1.0,        // DELETE /cancel-market-orders - used for canceling market orders (12000 req/10min = 1200 req/min sustained)
                            // Notification endpoints
                            'notifications': 0.04,               // DELETE /notifications - used by dropNotifications (general limit)
                        },
                        'put': {
                            // Balance endpoints
                            'balance-allowance': 10.0,           // PUT /balance-allowance - used by updateBalanceAllowance (20 req/10s = 120 req/min)
                        },
                    },
                },
            },
            'timeframes': {
                '1m': '1m',
                '1h': '1h',
                '6h': '6h',
                '1d': '1d',
                '1w': '1w',
            },
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'taker': this.parseNumber ('0.02'), // 2% taker fee (approximate)
                    'maker': this.parseNumber ('0.02'), // 2% maker fee (approximate)
                },
            },
            'options': {
                'fetchMarkets': {
                    'active': true, // only fetch active markets by default
                    'closed': false,
                    'archived': false,
                },
                'funder': undefined, // Address that holds funds (walletAddress, required for proxy wallets like email/Magic wallets)
                'proxyWallet': undefined, // Proxy wallet address for Data-API endpoints (defaults to funder/walletAddress if not set)
                'builderWallet': undefined, // Builder wallet address (defaults to funder/walletAddress if not set)
                'signatureTypes': {
                    // https://docs.polymarket.com/developers/CLOB/orders/orders#signature-types
                    'EOA': 0, // EIP712 signature signed by an EOA
                    'POLY_PROXY': 1, // EIP712 signatures signed by a signer associated with funding Polymarket proxy wallet
                    'POLY_GNOSIS_SAFE': 2, // EIP712 signatures signed by a signer associated with funding Polymarket gnosis safe wallet
                },
                'side': undefined, // Order side: 'BUY' or 'SELL' (default: undefined, must be provided)
                'sides': {
                    'BUY': 0, // Buy side (maker gives USDC, wants tokens)
                    'SELL': 1, // Sell side (maker gives tokens, wants USDC)
                },
                'chainId': 137, // Chain ID: 137 = Polygon mainnet (default), 80001 = Polygon Mumbai testnet
                'chainName': 'polygon-mainnet', // Chain name: 'polygon-mainnet' (default), 'polygon-mumbai' (testnet)
                'sandboxMode': false, // Enable sandbox/testnet mode (uses Polygon Mumbai testnet)
                'clobHost': undefined, // Custom CLOB API endpoint (defaults to https://clob.polymarket.com)
                'defaultCollateral': 'USDC', // Default collateral currency
                'defaultExpirationDays': 30, // Default expiration in days (default: 30 days from now)
                'defaultFeeRateBps': 200, // Default fee rate fallback in basis points (default: 200 bps = 2%)
                'defaultTickSize': '0.01', // Default tick size for rounding config (default: 0.01 = 2 decimal places for price, 2 for size, 4 for amount)
                'marketOrderQuoteDecimals': 2, // Max decimal places for quote currency (USDC) in market orders (default: 2)
                'marketOrderBaseDecimals': 4, // Max decimal places for base currency (tokens) in market orders (default: 4)
                'roundingBufferDecimals': 4, // Additional decimal places buffer for rounding up before final rounding down (default: 4)
                'defaultEndDateIso': '2099-01-01T00:00:00Z', // Default end date ISO string used as placeholder when endDateIso is undefined
                'defaultOptionType': 'custom', // Default option type for prediction markets
                // Constants matching clob-client
                // See https://github.com/Polymarket/clob-client/blob/main/src/signing/constants.ts
                // See https://github.com/Polymarket/clob-client/blob/main/src/constants.ts
                'clobDomainName': 'ClobAuthDomain',
                'clobVersion': '1',
                'msgToSign': 'This message attests that I control the given wallet',
                'initialCursor': 'MA==', // Base64 encoded empty string, matches clob-client INITIAL_CURSOR
                'endCursor': 'LTE=', // Sentinel value indicating end of pagination
                'defaultTokenId': undefined, // Default token ID for conditional tokens
                // Constants matching py-clob-client
                // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/constants.py
                'zeroAddress': '0x0000000000000000000000000000000000000000', // Zero address for open orders (taker)
                // EIP-712 domain constants matching clob-order-utils
                // See https://github.com/Polymarket/clob-order-utils/blob/main/src/exchange.order.const.ts
                'orderDomainName': 'Polymarket CTF Exchange', // EIP-712 domain name for orders (PROTOCOL_NAME)
                'orderDomainVersion': '1', // EIP-712 domain version for orders (PROTOCOL_VERSION)
                // Contract addresses for all networks
                // See https://github.com/Polymarket/clob-client/blob/main/src/config.ts
                'contracts': {
                    // Polygon Amoy testnet (chainId: 80001)
                    '80001': {
                        'exchange': '0xdFE02Eb6733538f8Ea35D585af8DE5958AD99E40',
                        'negRiskAdapter': '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
                        'negRiskExchange': '0xC5d563A36AE78145C45a50134d48A1215220f80a',
                        'collateral': '0x9c4e1703476e875070ee25b56a58b008cfb8fa78',
                        'conditionalTokens': '0x69308FB512518e39F9b16112fA8d994F4e2Bf8bB',
                    },
                    // Polygon mainnet (chainId: 137)
                    '137': {
                        'exchange': '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
                        'negRiskAdapter': '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
                        'negRiskExchange': '0xC5d563A36AE78145C45a50134d48A1215220f80a',
                        'collateral': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        'conditionalTokens': '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
                    },
                },
            },
            'limits': {
                'amount': {
                    'min': 5, // Minimum order size
                    'max': undefined,
                },
                'price': {
                    'min': 1e-6, // Prediction markets are >0 and <1
                    'max': 1, // Prediction markets are 0-1
                },
                'cost': {
                    'min': undefined,
                    'max': undefined,
                },
            },
            'exceptions': {
                'exact': {
                    // HTTP status codes
                    '400': BadRequest, // Bad Request - Invalid request parameters
                    '401': AuthenticationError, // Unauthorized - Invalid or missing authentication
                    '403': PermissionDenied, // Forbidden - Insufficient permissions
                    '404': ExchangeError, // Not Found - Resource not found
                    '429': RateLimitExceeded, // Too Many Requests - Rate limit exceeded
                    '500': ExchangeError, // Internal Server Error
                    '502': ExchangeError, // Bad Gateway
                    '503': OnMaintenance, // Service Unavailable - Service temporarily unavailable
                    '504': NetworkError, // Gateway Timeout
                    // Common error messages (will be matched against error/message fields in response)
                    'Invalid signature': AuthenticationError, // Invalid signature in request
                    'Invalid API key': AuthenticationError, // Invalid or missing API key
                    'Invalid timestamp': AuthenticationError, // Invalid timestamp in request
                    'Signature expired': AuthenticationError, // Request timestamp is too old
                    'Unauthorized': AuthenticationError, // Authentication failed
                    'Forbidden': PermissionDenied, // Access denied
                    'Rate limit exceeded': RateLimitExceeded, // Rate limit exceeded
                    'Too many requests': RateLimitExceeded, // Too many requests
                    'Invalid order': InvalidOrder, // Order validation failed
                    'Invalid orderID': OrderNotFound, // Order does not exist
                    'Order not found': OrderNotFound, // Order does not exist
                    'Insufficient funds': InsufficientFunds, // Insufficient balance
                    'Insufficient balance': InsufficientFunds, // Insufficient balance
                    'Invalid market': BadRequest, // Invalid market/symbol
                    'Invalid symbol': BadRequest, // Invalid symbol
                    'Market not found': BadRequest, // Market does not exist
                    'Service unavailable': ExchangeNotAvailable, // Service temporarily unavailable
                    'Maintenance': OnMaintenance, // Service under maintenance
                },
                'broad': {
                    'authentication': AuthenticationError, // Any authentication-related error
                    'authorization': PermissionDenied, // Any authorization-related error
                    'rate limit': RateLimitExceeded, // Any rate limit error
                    'invalid order': InvalidOrder, // Any order validation error
                    'insufficient': InsufficientFunds, // Any insufficient funds/balance error
                    'not found': ExchangeError, // Any not found error
                    'timeout': NetworkError, // Any timeout error
                    'network': NetworkError, // Any network-related error
                    'maintenance': OnMaintenance, // Any maintenance-related error
                },
            },
        });
    }

    /**
     * Helper method to get signature type from params or options with fallback to constants
     * @param {object} [params] parameters that may contain signatureType or signature_type
     * @returns {number|undefined} signature type value
     */
    getSignatureType (params = {}) {
        const signatureTypes = this.safeDict (this.options, 'signatureTypes', {});
        const eoaSignatureType = this.safeInteger (signatureTypes, 'EOA');
        const polyProxySignatureType = this.safeInteger (signatureTypes, 'POLY_PROXY');
        const polyGnosisSafeSignatureType = this.safeInteger (signatureTypes, 'POLY_GNOSIS_SAFE');
        // Note: POLY_GNOSIS_SAFE is not supported for now
        const proxyWalletAddress = this.getProxyWalletAddress ();
        const mainWalletAddress = this.getMainWalletAddress ();
        if (proxyWalletAddress !== mainWalletAddress) {
            return polyProxySignatureType;
        }
        return eoaSignatureType;
    }

    /**
     * Helper method to get side as integer from params or options with fallback to constants
     * Converts BUY/SELL string to integer: BUY = 0, SELL = 1 (matches UtilsBuy/UtilsSell from py-order-utils)
     * @param {string} sideString side as string ('BUY' or 'SELL')
     * @param {object} [params] parameters that may contain side or side_int
     * @returns {number} side as integer (0 for BUY, 1 for SELL)
     */
    getSide (sideString: string, params = {}) {
        // Check if side_int is provided directly in params
        const sideInt = this.safeInteger (params, 'sideInt') || this.safeInteger (params, 'side_int');
        if (sideInt !== undefined) {
            return sideInt;
        }
        // Get sides enum from options
        const sides = this.safeDict (this.options, 'sides', {});
        const buySide = this.safeInteger (sides, 'BUY', 0);
        const sellSide = this.safeInteger (sides, 'SELL', 1);
        // Convert side string to integer
        const sideUpper = sideString.toUpperCase ();
        let sideValue = sellSide; // Default to SELL
        if (sideUpper === 'BUY') {
            sideValue = buySide;
        }
        return sideValue;
    }

    parseOptionType (optionType: string): string {
        return this.strip (optionType).replace (' ', '_').toUpperCase ();
    }

    /**
     * @method
     * @name polymarket#fetchMarkets
     * @description retrieves data on all markets for polymarket
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide#3-fetch-all-active-markets
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {boolean} [params.active] fetch active markets only (default: true)
     * @param {boolean} [params.closed] fetch closed markets
     * @returns {object[]} an array of objects representing market data
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        const limit = 500;
        const options = this.safeDict (this.options, 'fetchMarkets', {});
        const request: Dict = this.extend ({
            'order': 'id',
            'ascending': false,
            'limit': limit,
            'offset': 0,
        }, params);
        const active = this.safeBool (options, 'active', true);
        if (this.safeValue (params, 'closed') === undefined) {
            request['closed'] = !active;
        }
        // Fetch first page to seed the results
        const firstResponse = await this.gammaPublicGetMarkets (this.extend ({}, request, { 'offset': 0 }));
        const firstPage = this.safeList (firstResponse as any, 'data', firstResponse as any) || [];
        let markets: any[] = firstPage;
        if (firstPage.length >= limit) {
            // API returns a plain list with no total count — fetch remaining pages in parallel batches.
            // BATCH_SIZE=10 pages per round, MAX_ROUNDS=100 covers up to 500,000 markets.
            const BATCH_SIZE = 10;
            const MAX_ROUNDS = 100;
            let currentOffset = limit;
            let done = false;
            for (let round = 0; round < MAX_ROUNDS; round++) {
                const batchPromises = [];
                for (let i = 0; i < BATCH_SIZE; i++) {
                    batchPromises.push (this.gammaPublicGetMarkets (this.extend ({}, request, { 'offset': currentOffset + i * limit })));
                }
                const batchResponses = await Promise.all (batchPromises);
                for (let i = 0; i < batchResponses.length; i++) {
                    const page = this.safeList (batchResponses[i] as any, 'data', batchResponses[i] as any) || [];
                    markets = this.arrayConcat (markets, page);
                    if (page.length < limit) {
                        done = true;
                        break;
                    }
                }
                currentOffset += BATCH_SIZE * limit;
                if (done) {
                    break;
                }
            }
        }
        const filtered = [];
        for (let i = 0; i < markets.length; i++) {
            const market = markets[i];
            const id = this.safeString (market, 'id');
            const conditionId = this.safeString (market, 'conditionId') || this.safeString (market, 'condition_id');
            if (id === undefined && conditionId === undefined) {
                continue;
            }
            const outcomes = [];
            const outcomesStr = this.safeString (market, 'outcomes');
            if (outcomesStr !== undefined) {
                let parsedOutcomes = undefined;
                try {
                    parsedOutcomes = JSON.parse (outcomesStr);
                } catch (e) {
                    parsedOutcomes = undefined;
                }
                if (parsedOutcomes !== undefined && parsedOutcomes.length !== undefined) {
                    for (let j = 0; j < parsedOutcomes.length; j++) {
                        outcomes.push (parsedOutcomes[j]);
                    }
                } else {
                    const outcomesArray = outcomesStr.split (',');
                    for (let j = 0; j < outcomesArray.length; j++) {
                        const v = outcomesArray[j].trim ();
                        if (v !== '') {
                            outcomes.push (v);
                        }
                    }
                }
            }
            const clobTokenIds = this.parseClobTokenIds (this.safeValue (market, 'clobTokenIds'));
            if (outcomes.length > 0) {
                for (let j = 0; j < outcomes.length; j++) {
                    const outcome = outcomes[j];
                    let clobTokenId = undefined;
                    if (j < clobTokenIds.length) {
                        clobTokenId = clobTokenIds[j];
                    }
                    // Create a copy of the market with the outcome as optionType and clobTokenId as id
                    const marketWithOutcome = this.extend ({}, market, { 'optionType': outcome, 'id': clobTokenId });
                    filtered.push (marketWithOutcome);
                }
            } else {
                // If no outcomes, push the market as-is
                filtered.push (market);
            }
        }
        return this.parseMarkets (filtered);
    }

    parseClobTokenIds (clobTokenIds: any): string[] {
        if (clobTokenIds === undefined) {
            return [];
        }
        if (Array.isArray (clobTokenIds)) {
            return clobTokenIds;
        }
        try {
            return JSON.parse (clobTokenIds);
        } catch (e) {
            return [];
        }
    }

    parseMarket (market: Dict): Market {
        // Check if id is provided (e.g., from clobTokenId in fetchMarkets)
        const providedId = this.safeString (market, 'id');
        // Schema uses 'conditionId' (camelCase)
        const conditionId = this.safeString (market, 'conditionId');
        const question = this.safeString (market, 'question');
        // Schema uses 'questionID' (camelCase)
        const questionId = this.safeString (market, 'questionID');
        // Schema uses 'slug' (camelCase)
        const slug = this.safeString (market, 'slug');
        const active = this.safeBool (market, 'active', false);
        const closed = this.safeBool (market, 'closed', false);
        const archived = this.safeBool (market, 'archived', false);
        const outcomes = [];
        const outcomePrices = [];
        const outcomesStr = this.safeString (market, 'outcomes');
        if (outcomesStr !== undefined) {
            let parsedOutcomes = undefined;
            try {
                parsedOutcomes = JSON.parse (outcomesStr);
            } catch (e) {
                parsedOutcomes = undefined;
            }
            if (parsedOutcomes !== undefined && parsedOutcomes.length !== undefined) {
                for (let i = 0; i < parsedOutcomes.length; i++) {
                    outcomes.push (parsedOutcomes[i]);
                }
            } else {
                const outcomesArray = outcomesStr.split (',');
                for (let i = 0; i < outcomesArray.length; i++) {
                    const v = outcomesArray[i].trim ();
                    if (v !== '') {
                        outcomes.push (v);
                    }
                }
            }
        }
        const outcomePricesStr = this.safeString (market, 'outcomePrices');
        if (outcomePricesStr !== undefined) {
            let parsedPrices = undefined;
            try {
                parsedPrices = JSON.parse (outcomePricesStr);
            } catch (e) {
                parsedPrices = undefined;
            }
            if (parsedPrices !== undefined && parsedPrices.length !== undefined) {
                for (let i = 0; i < parsedPrices.length; i++) {
                    outcomePrices.push (this.parseNumber (parsedPrices[i]));
                }
            } else {
                const pricesArray = outcomePricesStr.split (',');
                for (let i = 0; i < pricesArray.length; i++) {
                    const v = pricesArray[i].trim ();
                    if (v !== '') {
                        outcomePrices.push (this.parseNumber (v));
                    }
                }
            }
        }
        // Use slug as base symbol if available
        const baseId = slug || conditionId;
        const quoteId = this.safeString (this.options, 'defaultCollateral', 'USDC'); // Polymarket uses USDC as quote currency
        // Market type - Polymarket is a prediction market platform
        const marketType: MarketType = 'option'; // Using 'option' as closest match for prediction markets
        const ammType = this.safeString (market, 'ammType');
        // Schema uses 'enableOrderBook' (camelCase)
        const enableOrderBook = this.safeBool (market, 'enableOrderBook', false);
        // Market metadata
        const category = this.safeString (market, 'category');
        const description = this.safeString (market, 'description');
        const tags = this.safeValue (market, 'tags', []);
        const clobTokenIds = this.parseClobTokenIds (this.safeValue (market, 'clobTokenIds'));
        const outcomesInfo = [];
        let length = outcomes.length;
        if (outcomePrices.length > length) {
            length = outcomePrices.length;
        }
        if (clobTokenIds.length > length) {
            length = clobTokenIds.length;
        }
        for (let i = 0; i < length; i++) {
            let outcome = undefined;
            if (i < outcomes.length) {
                outcome = outcomes[i];
            }
            let price = undefined;
            if (i < outcomePrices.length) {
                price = this.parseNumber (outcomePrices[i]);
            }
            let clobId = undefined;
            if (i < clobTokenIds.length) {
                clobId = clobTokenIds[i];
            }
            let outcomeId = i.toString ();
            if (clobId !== undefined) {
                outcomeId = clobId;
            }
            outcomesInfo.push ({
                'id': outcomeId,
                'name': outcome,
                'price': price,
                'clobId': clobId,
                'assetId': clobId,
            });
        }
        // Parse dates - Schema uses 'endDateIso' (preferred) or 'endDate' (fallback)
        let endDateIso = this.safeString (market, 'endDateIso') || this.safeString (market, 'endDate');
        if (endDateIso === undefined) {
            // When endDateIso is undefined use a very far future date as placeholder
            endDateIso = this.safeString (this.options, 'defaultEndDateIso');
        }
        // Schema uses 'createdAt' (camelCase)
        const createdAt = this.safeString (market, 'createdAt');
        let createdTimestamp = undefined;
        if (createdAt !== undefined) {
            createdTimestamp = this.parse8601 (createdAt);
        }
        // Volume and liquidity
        const volume = this.safeString (market, 'volume');
        const volumeNum = this.safeNumber (market, 'volumeNum');
        const liquidity = this.safeString (market, 'liquidity');
        const liquidityNum = this.safeNumber (market, 'liquidityNum');
        const feesEnabled = this.safeBool (market, 'feesEnabled', false);
        const makerBaseFee = this.safeNumber (market, 'makerBaseFee');
        const takerBaseFee = this.safeNumber (market, 'takerBaseFee');
        const base = baseId;
        const quote = quoteId;
        const settle = quote; // Use quote as settle
        // Parse expiry for option symbol formatting
        // Handle date-only strings (YYYY-MM-DD) by converting to ISO8601 datetime
        let expiry = undefined;
        const expiryDatetime = endDateIso;
        if (endDateIso !== undefined) {
            let dateString = endDateIso;
            // Check if it's a date-only string (YYYY-MM-DD format)
            if (dateString.indexOf (':') < 0) {
                // Append time to make it a valid ISO8601 datetime
                dateString = dateString + 'T00:00:00Z';
            }
            expiry = this.parse8601 (dateString);
        }
        // Use outcome from market dict if available (set in fetchMarkets), otherwise use default
        const optionType = this.safeString (market, 'optionType') || this.safeString (this.options, 'defaultOptionType');
        // Format symbol with expiry date following CCXT option format
        // Format: base/quote:settle-YYMMDD-strike-type
        const ymd = this.yymmdd (expiry);
        const strikePlaceholder = '0'; // Use 0 as placeholder for strike price while not provided by the exchange
        let optionTypeValue = undefined;
        if (optionType === 'call') {
            optionTypeValue = 'C';
        } else if (optionType === 'put') {
            optionTypeValue = 'P';
        } else if (optionType !== undefined) {
            optionTypeValue = this.parseOptionType (optionType);
        }
        const symbol = base + '/' + quote + ':' + settle + '-' + ymd + '-' + strikePlaceholder + '-' + optionTypeValue;
        const strike = undefined;
        const contractSize = this.parseNumber ('1');
        // Calculate fees based on feesEnabled flag
        let takerFee = this.parseNumber ('0');
        let makerFee = this.parseNumber ('0');
        if (feesEnabled) {
            // Fees are enabled - use makerBaseFee and takerBaseFee from schema
            // These are typically in basis points (e.g., 200 = 2% = 0.02)
            if (takerBaseFee !== undefined) {
                takerFee = takerBaseFee / 10000; // Convert basis points to decimal
            }
            if (makerBaseFee !== undefined) {
                makerFee = makerBaseFee / 10000; // Convert basis points to decimal
            }
        }
        let created = this.milliseconds (); // TODO change it
        if (createdTimestamp !== undefined) {
            created = createdTimestamp;
        }
        let volumeValue = this.parseNumber ('0');
        if (volumeNum !== undefined) {
            volumeValue = volumeNum;
        } else if (volume !== undefined) {
            volumeValue = this.parseNumber (volume);
        }
        let liquidityValue = this.parseNumber ('0');
        if (liquidityNum !== undefined) {
            liquidityValue = liquidityNum;
        } else if (liquidity !== undefined) {
            liquidityValue = this.parseNumber (liquidity);
        }
        let marketId = providedId;
        if (marketId === undefined) {
            marketId = conditionId;
        }
        return {
            'id': marketId,
            'symbol': symbol,
            'base': base,
            'quote': quote,
            'settle': settle,
            'baseId': baseId,
            'quoteId': quoteId,
            'settleId': settle,
            'type': marketType,
            'spot': false,
            'margin': false,
            'swap': false,
            'future': false,
            'option': true, // Prediction markets are treated as options
            'active': enableOrderBook && active && !closed && !archived,
            'contract': true,
            'linear': true, // Only linear makes sense
            'inverse': undefined,
            'contractSize': contractSize,
            'expiry': expiry,
            'expiryDatetime': expiryDatetime,
            'strike': strike,
            'optionType': optionType,
            'taker': takerFee,
            'maker': makerFee,
            'precision': {
                'amount': 6, // https://github.com/Polymarket/clob-client/blob/main/src/config.ts
                'price': 6, // https://github.com/Polymarket/clob-client/blob/main/src/config.ts
            },
            'limits': {
                'leverage': {
                    'min': undefined,
                    'max': undefined,
                },
                'amount': {
                    'min': 5, // Minimum order size
                    'max': undefined,
                },
                'price': {
                    'min': 1e-6, // Prediction markets are >0 and <1
                    'max': 1, // Prediction markets are 0-1
                },
                'cost': {
                    'min': undefined,
                    'max': undefined,
                },
            },
            'created': created,
            'info': this.deepExtend (market, {
                'outcomes': outcomes,
                'outcomePrices': outcomePrices,
                'outcomesInfo': outcomesInfo,
                'question': question,
                'slug': slug,
                'category': category,
                'description': description,
                'tags': tags,
                'condition_id': conditionId,
                'question_id': questionId,
                'asset_id': questionId,
                'ammType': ammType,
                'enableOrderBook': enableOrderBook,
                'volume': volumeValue,
                'liquidity': liquidityValue,
                'endDateIso': endDateIso,
                'createdAt': createdAt,
                'createdTimestamp': createdTimestamp,
                'clobTokenIds': clobTokenIds,
                'quoteDecimals': 6,  // https://github.com/Polymarket/clob-client/blob/main/src/config.ts
                'baseDecimals': 6, // https://github.com/Polymarket/clob-client/blob/main/src/config.ts
            }),
        };
    }

    /**
     * @method
     * @name polymarket#fetchOrderBook
     * @description fetches the order book for a market
     * @see https://docs.polymarket.com/api-reference/orderbook/get-order-book-summary
     * @param {string} symbol unified symbol of the market to fetch the order book for
     * @param {int} [limit] the maximum amount of order book entries to return
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID for the specific outcome (required if market has multiple outcomes)
     * @returns {object} A dictionary of [order book structures]{@link https://docs.ccxt.com/#/?id=order-book-structure} indexed by market symbols
     */
    async fetchOrderBook (symbol: string, limit: Int = undefined, params = {}): Promise<OrderBook> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request: Dict = {};
        // Get token ID from params or market
        // Use market['id'] which is the specific token ID for this outcome (YES/NO)
        // Do NOT use clobTokenIds[0] as that always picks the first outcome regardless of symbol
        let tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            tokenId = this.safeString (market, 'id');
        }
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOrderBook() requires a token_id parameter for market ' + symbol);
        }
        request['token_id'] = tokenId;
        const response = await this.clobPublicGetOrderbookTokenId (this.extend (request, params));
        return this.parseOrderBook (response, symbol);
    }

    /**
     * @method
     * @name polymarket#fetchOrderBooks
     * @description fetches information on open orders with bid (buy) and ask (sell) prices, volumes and other data for multiple markets
     * @see https://docs.polymarket.com/developers/CLOB/clients/methods-public#getorderbooks
     * @param {string[]|undefined} symbols list of unified market symbols, all symbols fetched if undefined, default is undefined
     * @param {int} [limit] the maximum amount of order book entries to return
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a dictionary of [order book structures]{@link https://docs.ccxt.com/#/?id=order-book-structure} indexed by market symbol
     */
    async fetchOrderBooks (symbols: Strings = undefined, limit: Int = undefined, params = {}): Promise<OrderBooks> {
        await this.loadMarkets ();
        if (symbols === undefined) {
            symbols = this.symbols;
        }
        // Build list of token IDs to fetch order books for
        const tokenIds: string[] = [];
        const tokenIdToSymbol: Dict = {};
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            const market = this.market (symbol);
            // Use market['id'] which is the specific token ID for this outcome (YES/NO)
            // Do NOT use clobTokenIds[0] as that always picks the first outcome regardless of symbol
            const tokenId = this.safeString (market, 'id');
            if (tokenId !== undefined) {
                tokenIds.push (tokenId);
                tokenIdToSymbol[tokenId] = symbol;
            }
        }
        if (tokenIds.length === 0) {
            return {} as OrderBooks;
        }
        // Fetch order books for all token IDs at once using POST /books endpoint
        // See https://docs.polymarket.com/api-reference/orderbook/get-multiple-order-books-summaries-by-request
        // Request body: [{token_id: "..."}, {token_id: "..."}, ...]
        // Response format: array of order book objects, each with asset_id matching token_id
        const requestBody = [];
        for (let i = 0; i < tokenIds.length; i++) {
            const requestItem: Dict = { 'token_id': tokenIds[i] };
            if (limit !== undefined) {
                requestItem['limit'] = limit;
            }
            requestBody.push (requestItem);
        }
        const response = await this.clobPublicPostBooks (this.extend ({ 'requests': requestBody }, params));
        // Parse response: array of order book objects, each with asset_id field
        // Response is directly an array: [{asset_id: "...", bids: [...], asks: [...]}, ...]
        const result: Dict = {};
        if (Array.isArray (response)) {
            for (let i = 0; i < response.length; i++) {
                const orderbookData = response[i];
                const assetId = this.safeString (orderbookData, 'asset_id');
                const symbol = tokenIdToSymbol[assetId];
                if (symbol !== undefined) {
                    try {
                        const orderbook = this.parseOrderBook (orderbookData, symbol);
                        result[symbol] = orderbook;
                    } catch (e) {
                        // Skip markets that fail to parse
                        continue;
                    }
                }
            }
        }
        return result as OrderBooks;
    }

    parseOrderBook (orderbook: Dict, symbol: Str = undefined, timestamp: Int = undefined, bidsKey: Str = 'bids', asksKey: Str = 'asks', priceKey: Int = 0, amountKey: Int = 1, countOrIdKey: Int = 2): OrderBook {
        // Polymarket CLOB orderbook format (from /book endpoint)
        // See https://docs.polymarket.com/developers/CLOB/clients/methods-public#getorderbook
        // {
        //   "market": "string",
        //   "asset_id": "string",
        //   "timestamp": "string",
        //   "bids": [
        //     {
        //       "price": "0.65",  // string
        //       "size": "100"     // string
        //     }
        //   ],
        //   "asks": [
        //     {
        //       "price": "0.66",  // string
        //       "size": "50"      // string
        //     }
        //   ],
        //   "min_order_size": "string",
        //   "tick_size": "string",
        //   "neg_risk": boolean,
        //   "hash": "string"
        // }
        // Note: Ensure bids and asks are always arrays to avoid Python transpilation issues
        // safeList can return undefined, which becomes None in Python, causing len() to fail
        const bids = this.safeList (orderbook, 'bids', []) || [];
        const asks = this.safeList (orderbook, 'asks', []) || [];
        // Note: Using 'const' without explicit type annotation to avoid Python transpilation issues
        // The transpiler incorrectly preserves TypeScript tuple type annotations (e.g., ': [number, number][]') in Python code
        const parsedBids = [];
        const parsedAsks = [];
        for (let i = 0; i < bids.length; i++) {
            const bid = bids[i];
            const price = this.safeNumber (bid, 'priceNumber', this.safeNumber (bid, 'price'));
            const amount = this.safeNumber (bid, 'sizeNumber', this.safeNumber (bid, 'size'));
            if (price !== undefined && amount !== undefined) {
                parsedBids.push ([ price, amount ]);
            }
        }
        for (let i = 0; i < asks.length; i++) {
            const ask = asks[i];
            const price = this.safeNumber (ask, 'priceNumber', this.safeNumber (ask, 'price'));
            const amount = this.safeNumber (ask, 'sizeNumber', this.safeNumber (ask, 'size'));
            if (price !== undefined && amount !== undefined) {
                parsedAsks.push ([ price, amount ]);
            }
        }
        // Extract timestamp from orderbook response if available
        const orderbookTimestamp = this.safeString (orderbook, 'timestamp');
        let finalTimestamp = timestamp;
        if (orderbookTimestamp !== undefined) {
            // CLOB API returns timestamp as ISO string, convert to milliseconds
            finalTimestamp = this.parse8601 (orderbookTimestamp);
        }
        // Extract tick_size and neg_risk from orderbook if available (useful metadata)
        // These are also available via get_tick_size() and get_neg_risk() endpoints
        // Based on py-clob-client: get_tick_size() and get_neg_risk()
        const tickSize = this.safeString (orderbook, 'tick_size');
        const negRisk = this.safeBool (orderbook, 'neg_risk');
        const minOrderSize = this.safeString (orderbook, 'min_order_size');
        const result: OrderBook = {
            'symbol': symbol,
            'bids': parsedBids,
            'asks': parsedAsks,
            'timestamp': finalTimestamp,
            'datetime': this.iso8601 (finalTimestamp),
            'nonce': undefined,
        };
        // Include tick_size, neg_risk, and min_order_size in info if available (useful metadata)
        if (tickSize !== undefined || negRisk !== undefined || minOrderSize !== undefined) {
            const metadata: Dict = {};
            if (tickSize !== undefined) {
                metadata['tick_size'] = tickSize;
                // Update market precision and info with tick_size if available
                if (this.markets !== undefined && symbol in this.markets) {
                    const market = this.markets[symbol];
                    if (market['precision']['price'] === undefined || market['precision']['price'] === 6) {
                        market['precision']['price'] = this.parseNumber (tickSize);
                    }
                    // Also keep market['info']['tick_size'] in sync so buildAndSignOrder uses the
                    // correct rounding config (prevents price like 0.003956 rounding to 0.00)
                    if (this.safeString (market['info'], 'tick_size') === undefined) {
                        market['info']['tick_size'] = tickSize;
                    }
                }
            }
            if (negRisk !== undefined) {
                metadata['neg_risk'] = negRisk;
            }
            if (minOrderSize !== undefined) {
                metadata['min_order_size'] = minOrderSize;
                // Update market limits with min_order_size if available
                if (this.markets !== undefined && symbol in this.markets) {
                    const market = this.markets[symbol];
                    if (market['limits']['amount']['min'] === undefined) {
                        market['limits']['amount']['min'] = this.parseNumber (minOrderSize);
                    }
                }
            }
            result['info'] = this.extend (orderbook, metadata);
        }
        return result;
    }

    /**
     * @method
     * @name polymarket#fetchTicker
     * @description fetches a price ticker, a statistical calculation with the information calculated over the past 24 hours for a specific market
     * @see https://docs.polymarket.com/api-reference/pricing/get-market-price
     * @see https://docs.polymarket.com/api-reference/pricing/get-midpoint-price
     * @param {string} symbol unified symbol of the market to fetch the ticker for
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID for the specific outcome (required if market has multiple outcomes)
     * @param {string} [params.side] the side: 'BUY' or 'SELL' (default: 'BUY')
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/#/?id=ticker-structure}
     * 
     * **Currently Populated Fields:**
     * - `bid` - Best bid price from POST /prices endpoint (BUY side)
     * - `ask` - Best ask price from POST /prices endpoint (SELL side)
     * - `last` - Midpoint price from GET /midpoint or lastTradePrice from market info
     * - `open` - Calculated approximation: last / (1 + oneDayPriceChange)
     * - `change` - Calculated: last - open
     * - `percentage` - From oneDayPriceChange * 100 (from market info)
     * - `volume` - From volumeNum or volume (from market info)
     * - `timestamp` - From updatedAt (parsed from ISO string)
     * - `datetime` - ISO8601 formatted timestamp
     * 
     * **Currently Undefined Fields (Available via Additional API Calls):**
     * - `high` - Can be fetched from GET /prices-history (24h price history) or GET /trades (24h trades)
     * - `low` - Can be fetched from GET /prices-history (24h price history) or GET /trades (24h trades)
     * - `bidVolume` - Can be calculated from GET /book (order book) by summing all bid sizes
     * - `askVolume` - Can be calculated from GET /book (order book) by summing all ask sizes
     * - `vwap` - Can be calculated from GET /trades (24h trades) using volume-weighted average
     * - `average` - Not available
     * - `indexPrice` - Not available
     * - `markPrice` - Not available
     * 
     * **Enhancement Options:**
     * 
     * 1. **For High/Low/More Accurate Open:**
     *    - Use fetchOHLCV() to get 24h price history: `await exchange.fetchOHLCV(symbol, '1h', since24hAgo, undefined, {token_id: tokenId})`
     *    - Calculate high/low from OHLCV data
     *    - Use first candle's open price for accurate 24h open
     *    - API: GET /prices-history (see https://docs.polymarket.com/developers/CLOB/timeseries)
     * 
     * 2. **For VWAP:**
     *    - Use fetchTrades() to get 24h trades: `await exchange.fetchTrades(symbol, since24hAgo, undefined, {token_id: tokenId})`
     *    - Calculate: vwap = sum(trade.cost) / sum(trade.amount)
     *    - API: GET /trades (see https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets)
     * 
     * 3. **For Bid/Ask Volumes:**
     *    - Use fetchOrderBook() to get order book: `await exchange.fetchOrderBook(symbol, undefined, {token_id: tokenId})`
     *    - Calculate: bidVolume = sum of all bid[1] (sizes), askVolume = sum of all ask[1] (sizes)
     *    - API: GET /book (see https://docs.polymarket.com/api-reference/orderbook/get-order-book-summary)
     * 
     * 4. **For More Accurate Last Price:**
     *    - Use GET /last-trade-price endpoint: `await exchange.clobPublicGetLastTradePrice({token_id: tokenId})`
     *    - API: GET /last-trade-price (see https://docs.polymarket.com/api-reference/trades/get-last-trade-price)
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        let market = undefined;
        try {
            market = this.market (symbol);
        } catch (e) {
            market = undefined;
        }
        if (market === undefined) {
            const conditionId = this.safeString2 (params, 'condition_id', 'conditionId');
            const slug = this.safeString (params, 'slug');
            const tokenIdParam = this.safeString (params, 'token_id');
            const fallbackId = conditionId || slug || tokenIdParam || symbol;
            try {
                market = this.safeMarketWithFallback (fallbackId, undefined, params);
            } catch (e) {
                market = undefined;
            }
        }
        const marketInfo = (market !== undefined) ? this.safeDict (market, 'info', {}) : {};
        // Get token ID from params or market
        // Use market['id'] which is the specific token ID for this outcome (YES/NO)
        // Do NOT use clobTokenIds[0] as that always picks the first outcome regardless of symbol
        let tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            tokenId = this.safeString (market, 'id');
        }
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchTicker() requires a token_id parameter for market ' + symbol);
        }
        // Fetch both BUY and SELL prices in a single POST /prices request
        // See https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices-by-request
        const pricesResponse = await this.clobPublicPostPrices (this.extend ({
            'requests': [
                { 'token_id': tokenId, 'side': 'BUY' },
                { 'token_id': tokenId, 'side': 'SELL' },
            ],
        }, params));
        const tokenPrices = this.safeDict (pricesResponse, tokenId, {});
        const buyPrice = this.safeString (tokenPrices, 'BUY');
        const sellPrice = this.safeString (tokenPrices, 'SELL');
        // Fetch midpoint if available (optional, ignore if not provided)
        let midpoint = undefined;
        try {
            const midpointResponse = await this.clobPublicGetMidpoint (this.extend ({ 'token_id': tokenId }, params));
            midpoint = this.safeString (midpointResponse, 'mid');
        } catch (e) {
            // Ignore midpoint if not available or fails
            midpoint = undefined;
        }
        // Combine pricing data with market info - already loaded from fetchMarkets
        const combinedData = this.deepExtend (marketInfo, {
            'buyPrice': buyPrice,
            'sellPrice': sellPrice,
            'midpoint': midpoint,
        });
        return this.parseTicker (combinedData, market);
    }

    /**
     * @method
     * @name polymarket#fetchTickers
     * @description fetches price tickers for multiple markets, statistical information calculated over the past 24 hours for each market
     * @see https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices-by-request
     * @param {string[]|undefined} symbols unified symbols of the markets to fetch the ticker for, all market tickers are returned if not assigned
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a dictionary of [ticker structures]{@link https://docs.ccxt.com/#/?id=ticker-structure}
     */
    async fetchTickers (symbols: Strings = undefined, params = {}): Promise<Tickers> {
        await this.loadMarkets ();
        // Build list of token IDs to fetch prices for
        const tokenIds: string[] = [];
        const tokenIdToSymbol: Dict = {};
        const symbolsToFetch = symbols || this.symbols;
        for (let i = 0; i < symbolsToFetch.length; i++) {
            const symbol = symbolsToFetch[i];
            try {
                const market = this.market (symbol);
                // Use market['id'] which is the specific token ID for this outcome (YES/NO)
                // Do NOT use clobTokenIds[0] as that always picks the first outcome regardless of symbol
                const tokenId = this.safeString (market, 'id');
                if (tokenId !== undefined) {
                    tokenIds.push (tokenId);
                    tokenIdToSymbol[tokenId] = symbol;
                }
            } catch (e) {
                continue;
            }
        }
        if (tokenIds.length === 0) {
            return {};
        }
        // Fetch prices in batches using POST /prices with BUY+SELL requests per token.
        // Response format: {[token_id]: {BUY: price, SELL: price}}
        // See https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices-by-request
        // Note: lastTradePrice, bestBid, bestAsk are already in marketInfo from loadMarkets() (Gamma API)
        // and serve as fallbacks in parseTicker() when the pricing API has no orderbook data.
        const BATCH_TOKEN_SIZE = 250;
        let allPricesResponse: Dict = {};
        let batchStart = 0;
        while (batchStart < tokenIds.length) {
            const batchTokenIds = tokenIds.slice (batchStart, batchStart + BATCH_TOKEN_SIZE);
            const batchRequests = [];
            for (let j = 0; j < batchTokenIds.length; j++) {
                batchRequests.push ({ 'token_id': batchTokenIds[j], 'side': 'BUY' });
                batchRequests.push ({ 'token_id': batchTokenIds[j], 'side': 'SELL' });
            }
            const batchResponse = await this.clobPublicPostPrices ({ 'requests': batchRequests });
            allPricesResponse = this.deepExtend (allPricesResponse, batchResponse);
            batchStart = batchStart + BATCH_TOKEN_SIZE;
        }
        // Parse prices and build tickers
        const tickers: Dict = {};
        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const symbol = tokenIdToSymbol[tokenId];
            try {
                const market = this.market (symbol);
                const tokenPrices = this.safeDict (allPricesResponse, tokenId, {});
                const buyPrice = this.safeString (tokenPrices, 'BUY');
                const sellPrice = this.safeString (tokenPrices, 'SELL');
                const marketInfo = this.safeDict (market, 'info', {});
                const combinedData = this.deepExtend (marketInfo, {
                    'buyPrice': buyPrice,
                    'sellPrice': sellPrice,
                });
                const ticker = this.parseTicker (combinedData, market);
                tickers[symbol] = ticker;
            } catch (e) {
                continue;
            }
        }
        return tickers;
    }

    /**
     * @method
     * @name polymarket#parseTicker
     * @description parses a ticker data structure from Polymarket API response
     * @param {object} ticker ticker data structure from Polymarket API
     * @param {object} [market] market structure
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/#/?id=ticker-structure}
     * 
     * **Data Sources:**
     * - Market info from fetchMarkets() (volume, oneDayPriceChange, lastTradePrice, etc.)
     * - Pricing API (buyPrice, sellPrice, midpoint)
     * - Market metadata (updatedAt, volume24hr, volume1wk, volume1mo, volume1yr)
     * 
     * **Currently Parsed Fields:**
     * - `bid` - From buyPrice (POST /prices BUY side) or bestBid (market info)
     * - `ask` - From sellPrice (POST /prices SELL side) or bestAsk (market info)
     * - `last` - From midpoint (GET /midpoint) or lastTradePrice (market info)
     * - `open` - Calculated: last / (1 + oneDayPriceChange) when both available
     * - `change` - Calculated: last - open
     * - `percentage` - From oneDayPriceChange * 100
     * - `volume` - From volumeNum or volume (market info)
     * - `timestamp` - From updatedAt (ISO string parsed to milliseconds)
     * - `datetime` - ISO8601 formatted timestamp
     * 
     * **Fields Set to Undefined (Can Be Enhanced):**
     * - `high` - Not available in current data sources. Can be calculated from:
     *   - Price history: Math.max(...ohlcvData.map(c => c[2])) where c[2] is high
     *   - Trades: Math.max(...trades.map(t => t.price))
     * - `low` - Not available in current data sources. Can be calculated from:
     *   - Price history: Math.min(...ohlcvData.map(c => c[3])) where c[3] is low
     *   - Trades: Math.min(...trades.map(t => t.price))
     * - `bidVolume` - Not available. Can be calculated from order book:
     *   - orderbook.bids.reduce((sum, bid) => sum + bid[1], 0)
     * - `askVolume` - Not available. Can be calculated from order book:
     *   - orderbook.asks.reduce((sum, ask) => sum + ask[1], 0)
     * - `vwap` - Not available. Can be calculated from trades:
     *   - totalCost = trades.reduce((sum, t) => sum + t.cost, 0)
     *   - totalVolume = trades.reduce((sum, t) => sum + t.amount, 0)
     *   - vwap = totalCost / totalVolume
     * 
     * **To Enhance Ticker Data:**
     * Before calling parseTicker(), you can fetch additional data and add it to the ticker dict:
     * 
     * ```typescript
     * // Example: Add high/low from price history
     * const since24h = exchange.milliseconds() - 24 * 60 * 60 * 1000;
     * const ohlcv = await exchange.fetchOHLCV(symbol, '1h', since24h, undefined, {token_id: tokenId});
     * if (ohlcv.length > 0) {
     *     const highs = ohlcv.map(c => c[2]); // OHLCV[2] is high
     *     const lows = ohlcv.map(c => c[3]);  // OHLCV[3] is low
     *     ticker['high'] = Math.max(...highs);
     *     ticker['low'] = Math.min(...lows);
     *     ticker['open'] = ohlcv[0][1]; // First candle's open
     * }
     * 
     * // Example: Add VWAP from trades
     * const trades = await exchange.fetchTrades(symbol, since24h, undefined, {token_id: tokenId});
     * if (trades.length > 0) {
     *     let totalCost = 0;
     *     let totalVolume = 0;
     *     for (let i = 0; i < trades.length; i++) {
     *         totalCost += trades[i]['cost'];
     *         totalVolume += trades[i]['amount'];
     *     }
     *     ticker['vwap'] = totalVolume > 0 ? totalCost / totalVolume : undefined;
     * }
     * 
     * // Example: Add bid/ask volumes from order book
     * const orderbook = await exchange.fetchOrderBook(symbol, undefined, {token_id: tokenId});
     * let bidVolume = 0;
     * let askVolume = 0;
     * for (let i = 0; i < orderbook['bids'].length; i++) {
     *     bidVolume += orderbook['bids'][i][1];
     * }
     * for (let i = 0; i < orderbook['asks'].length; i++) {
     *     askVolume += orderbook['asks'][i][1];
     * }
     * ticker['bidVolume'] = bidVolume;
     * ticker['askVolume'] = askVolume;
     * ```
     */
    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        // Polymarket ticker format from market data
        let symbol = market ? market['symbol'] : undefined;
        if (market === undefined) {
            const conditionId = this.safeString2 (ticker, 'condition_id', 'conditionId');
            const slug = this.safeString (ticker, 'slug');
            const tokenId = this.safeString (ticker, 'token_id');
            const fallbackId = conditionId || slug || tokenId;
            if (fallbackId !== undefined || slug !== undefined) {
                try {
                    market = this.safeMarketWithFallback (fallbackId || slug, undefined, ticker);
                    symbol = this.safeString (market, 'symbol', symbol);
                } catch (e) {
                    market = undefined;
                }
            }
        }
        // Parse outcome prices
        const outcomePricesStr = this.safeString (ticker, 'outcomePrices');
        const outcomePrices = [];
        if (outcomePricesStr) {
            try {
                const parsed = JSON.parse (outcomePricesStr);
                // Note: Ensure all elements are numbers - JSON.parse may return strings
                // Convert each element to a number to avoid Python multiplication errors
                if (parsed !== undefined && parsed !== null && parsed.length !== undefined) {
                    for (let i = 0; i < parsed.length; i++) {
                        const price = this.parseNumber (parsed[i]);
                        if (price !== undefined) {
                            outcomePrices.push (price);
                        }
                    }
                }
            } catch (e) {
                // Note: Using for loop instead of .map() to avoid Python transpilation issues
                // Arrow functions with type annotations (e.g., '(p: string) =>') are incorrectly preserved in Python
                const pricesArray = outcomePricesStr.split (',');
                for (let i = 0; i < pricesArray.length; i++) {
                    const price = this.parseNumber (pricesArray[i].trim ());
                    if (price !== undefined) {
                        outcomePrices.push (price);
                    }
                }
            }
        }
        let last = undefined;
        let bid = undefined;
        let ask = undefined;
        let high = undefined;
        let low = undefined;
        // Volume data
        const volume = this.safeNumber (ticker, 'volumeNum', this.safeNumber (ticker, 'volume'));
        const volume24hr = this.safeNumber (ticker, 'volume24hr');
        const volume1wk = this.safeNumber (ticker, 'volume1wk');
        const volume1mo = this.safeNumber (ticker, 'volume1mo');
        const volume1yr = this.safeNumber (ticker, 'volume1yr');
        // Price changes
        const oneDayPriceChange = this.safeNumber (ticker, 'oneDayPriceChange');
        // Best bid/ask from pricing API (BUY = bid, SELL = ask)
        const buyPrice = this.safeNumber (ticker, 'buyPrice');
        const sellPrice = this.safeNumber (ticker, 'sellPrice');
        const midpoint = this.safeNumber (ticker, 'midpoint');
        // Use pricing API data if available
        if (buyPrice !== undefined) {
            bid = buyPrice;
        }
        if (sellPrice !== undefined) {
            ask = sellPrice;
        }
        if (midpoint !== undefined) {
            last = midpoint;
        }
        // Fallback to ticker data if pricing API data not available
        const bestBid = this.safeNumber (ticker, 'bestBid');
        const bestAsk = this.safeNumber (ticker, 'bestAsk');
        const lastTradePrice = this.safeNumber (ticker, 'lastTradePrice');
        if (bid === undefined && bestBid !== undefined) {
            bid = bestBid;
        }
        if (ask === undefined && bestAsk !== undefined) {
            ask = bestAsk;
        }
        if (last === undefined && lastTradePrice !== undefined) {
            last = lastTradePrice;
        }
        if (last === undefined && bid !== undefined && ask !== undefined) {
            last = (bid + ask) / 2;
        }
        // Fallback to market outcomesInfo from loadMarkets() (Gamma API)
        // Match by market.id (clobTokenId) to find the correct outcome price
        if (last === undefined && market !== undefined) {
            const marketInfoForPrices = this.safeDict (market, 'info', {});
            const outcomesInfoList = this.safeList (marketInfoForPrices, 'outcomesInfo', []);
            const marketId = this.safeString (market, 'id');
            for (let k = 0; k < outcomesInfoList.length; k++) {
                const outcomeInfo = this.safeDict (outcomesInfoList, k, {});
                const outcomeId = this.safeString (outcomeInfo, 'id');
                if (outcomeId === marketId) {
                    last = this.safeNumber (outcomeInfo, 'price');
                    break;
                }
            }
        }
        // Timestamp
        const updatedAtString = this.safeString (ticker, 'updatedAt');
        const timestamp = updatedAtString ? this.parse8601 (updatedAtString) : undefined;
        const datetime = timestamp ? this.iso8601 (timestamp) : undefined;
        // Open (previous closing price - approximated)
        let open = undefined;
        if (last !== undefined && oneDayPriceChange !== undefined) {
            open = last / (1 + oneDayPriceChange);
        }
        // Change and percentage
        let change = undefined;
        if (last !== undefined && open !== undefined) {
            change = last - open;
        }
        let percentage = undefined;
        if (oneDayPriceChange !== undefined) {
            percentage = oneDayPriceChange * 100;
        }
        // Add additional Polymarket-specific fields to info
        const tickerInfo = this.safeDict (ticker, 'info', {});
        const extendedInfo = this.deepExtend (tickerInfo, {
            'buyPrice': buyPrice,
            'sellPrice': sellPrice,
            'midpoint': midpoint,
            'lastTradePrice': lastTradePrice,
            'volume24hr': volume24hr,
            'volume1wk': volume1wk,
            'volume1mo': volume1mo,
            'volume1yr': volume1yr,
        });
        return {
            'symbol': symbol,
            'info': this.deepExtend (ticker, { 'info': extendedInfo }),
            'timestamp': timestamp,
            'datetime': datetime,
            'high': high,
            'low': low,
            'bid': bid,
            'bidVolume': undefined,
            'ask': ask,
            'askVolume': undefined,
            'vwap': undefined,
            'open': open,
            'close': last,
            'last': last,
            'previousClose': open,
            'change': change,
            'percentage': percentage,
            'average': undefined,
            'baseVolume': volume,
            'quoteVolume': volume,
            'indexPrice': undefined,
            'markPrice': undefined,
        };
    }

    /**
     * @method
     * @name polymarket#fetchTrades
     * @description get the list of most recent trades for a particular symbol
     * @see https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets
     * @param {string} symbol unified symbol of the market to fetch trades for
     * @param {int} [since] timestamp in ms of the earliest trade to fetch
     * @param {int} [limit] the maximum amount of trades to fetch (default: 100, max: 10000)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.offset] offset for pagination (default: 0, max: 10000)
     * @param {boolean} [params.takerOnly] if true, returns only trades where the user is the taker (default: true)
     * @param {string} [params.side] filter by side: 'BUY' or 'SELL'
     * @returns {Trade[]} a list of [trade structures]{@link https://docs.ccxt.com/#/?id=public-trades}
     */
    async fetchTrades (symbol: string, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const marketInfo = this.safeDict (market, 'info', {});
        // Get condition_id from market info (this is the market ID for Polymarket)
        const conditionId = this.safeString (marketInfo, 'condition_id', market['id']);
        const request: Dict = {
            'market': [ conditionId ], // Data API expects an array of condition IDs
        };
        // Note: Data API /trades endpoint supports limit (default: 100, max: 10000) and offset for pagination
        // The 'since' parameter is not directly supported by the REST API
        if (limit !== undefined) {
            request['limit'] = Math.min (limit, 10000); // Cap at max 10000
        }
        const offset = this.safeInteger (params, 'offset');
        if (offset !== undefined) {
            request['offset'] = offset;
        }
        const takerOnly = this.safeBool (params, 'takerOnly', true);
        request['takerOnly'] = takerOnly;
        const side = this.safeStringUpper (params, 'side');
        if (side !== undefined) {
            request['side'] = side;
        }
        const response = await this.dataPublicGetTrades (this.extend (request, this.omit (params, [ 'offset', 'takerOnly', 'side' ])));
        let tradesData = [];
        if (Array.isArray (response)) {
            tradesData = response;
        } else {
            const dataList = this.safeList (response, 'data', []);
            if (dataList !== undefined) {
                tradesData = dataList;
            }
        }
        return this.parseTrades (tradesData, market, since, limit);
    }

    parseTrade (trade: Dict, market: Market = undefined): Trade {
        // Detect Data API format (has conditionId field) vs CLOB format (has market/asset_id fields)
        // Check for both camelCase and snake_case for robustness
        const conditionId = this.safeString2 (trade, 'conditionId', 'condition_id');
        const isDataApiFormat = conditionId !== undefined;
        if (isDataApiFormat) {
            // Data API format: https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets
            // {
            //   "proxyWallet": "0x...",
            //   "side": "BUY",
            //   "asset": "<string>",
            //   "conditionId": "0x...",
            //   "size": 123,
            //   "price": 123,
            //   "timestamp": 123,
            //   "transactionHash": "0x...",
            //   ...
            // }
            // Use transactionHash as id, check both camelCase and snake_case
            const id = this.safeString2 (trade, 'transactionHash', 'transaction_hash');
            let symbol = undefined;
            if (market !== undefined && market['symbol'] !== undefined) {
                symbol = market['symbol'];
            } else if (conditionId !== undefined) {
                const resolved = this.safeMarketWithFallback (conditionId, undefined, trade);
                const resolvedSymbol = this.safeString (resolved, 'symbol');
                if (resolvedSymbol !== undefined) {
                    symbol = resolvedSymbol;
                } else {
                    symbol = conditionId;
                }
            }
            const timestampSeconds = this.safeInteger (trade, 'timestamp');
            let timestamp = undefined;
            if (timestampSeconds !== undefined) {
                timestamp = timestampSeconds * 1000;
            }
            const side = this.safeStringLower (trade, 'side');
            const price = this.safeNumber (trade, 'price');
            const amount = this.safeNumber (trade, 'size');
            let cost = undefined;
            if (price !== undefined && amount !== undefined) {
                cost = price * amount;
            }
            // Data API doesn't provide fee information
            return {
                'id': id,
                'info': trade,
                'timestamp': timestamp,
                'datetime': this.iso8601 (timestamp),
                'symbol': symbol,
                'type': undefined,
                'side': side,
                'takerOrMaker': undefined, // Data API doesn't provide this information
                'price': price,
                'amount': amount,
                'cost': cost,
                'fee': undefined, // Data API doesn't provide fee information
                'order': undefined, // Data API doesn't provide order ID
            };
        } else {
            // CLOB Trade format (backward compatibility)
            // interface Trade {
            //   id: string;
            //   taker_order_id: string;
            //   market: string;
            //   asset_id: string;
            //   side: Side;
            //   size: string;
            //   fee_rate_bps: string;
            //   price: string;
            //   status: string;
            //   match_time: string;
            //   last_update: string;
            //   outcome: string;
            //   bucket_index: number;
            //   owner: string;
            //   maker_address: string;
            //   maker_orders: MakerOrder[];
            //   transaction_hash: string;
            //   trader_side: "TAKER" | "MAKER";
            // }
            const id = this.safeString (trade, 'id');
            const assetId = this.safeString (trade, 'asset_id');
            const tradeMarket = this.safeString (trade, 'market');
            let symbol = undefined;
            if (market !== undefined && market['symbol'] !== undefined) {
                symbol = market['symbol'];
            } else if (tradeMarket !== undefined) {
                const resolved = this.safeMarketWithFallback (tradeMarket, undefined, trade);
                const resolvedSymbol = this.safeString (resolved, 'symbol');
                if (resolvedSymbol !== undefined) {
                    symbol = resolvedSymbol;
                } else {
                    symbol = tradeMarket;
                }
            } else if (assetId !== undefined) {
                const resolved = this.safeMarketWithFallback (assetId, market, trade);
                const resolvedSymbol = this.safeString (resolved, 'symbol');
                if (resolvedSymbol !== undefined) {
                    symbol = resolvedSymbol;
                } else {
                    symbol = assetId;
                }
            }
            const matchTime = this.safeInteger (trade, 'match_time');
            let timestamp = undefined;
            if (matchTime !== undefined) {
                timestamp = matchTime * 1000;
            }
            // Top-level fields are from the taker perspective; for maker trades use maker_orders
            let side = this.safeStringLower (trade, 'side');
            let price = this.safeNumber (trade, 'price');
            let amount = this.safeNumber (trade, 'size');
            let feeRateBps = this.safeNumber (trade, 'fee_rate_bps');
            const traderSide = this.safeStringUpper (trade, 'trader_side');
            if (traderSide === 'MAKER') {
                const makerOrders = this.safeValue (trade, 'maker_orders', []);
                const proxyWallet = this.getProxyWalletAddress ();
                let userAddress = proxyWallet.toLowerCase ();
                let matched = false;
                for (let i = 0; i < makerOrders.length; i++) {
                    const m = makerOrders[i];
                    const mAddr = this.safeString (m, 'maker_address');
                    if (mAddr !== undefined) {
                        const mAddrLower = mAddr.toLowerCase ();
                        if (mAddrLower === userAddress) {
                                price = this.safeNumber (m, 'price');
                                amount = this.safeNumber (m, 'matched_amount');
                                side = this.safeStringLower (m, 'side');
                                feeRateBps = this.safeNumber (m, 'fee_rate_bps');
                                matched = true;
                                break;
                        }
                    }
                }
                if (!matched) {
                    const m = makerOrders[0];
                    price = this.safeNumber (m, 'price');
                    amount = this.safeNumber (m, 'matched_amount');
                    side = this.safeStringLower (m, 'side');
                    feeRateBps = this.safeNumber (m, 'fee_rate_bps');
                }
            }
            let feeCost = undefined;
            if (feeRateBps !== undefined && price !== undefined && amount !== undefined) {
                feeCost = price * amount * feeRateBps / 10000;
            }
            let fee = undefined;
            if (feeCost !== undefined) {
                fee = {
                    'cost': feeCost,
                    'currency': this.safeString (this.options, 'defaultCollateral', 'USDC'),
                    'rate': feeRateBps !== undefined ? feeRateBps / 10000 : undefined,
                };
            }
            const cost = (price !== undefined && amount !== undefined) ? price * amount : undefined;
            return {
                'id': id,
                'info': trade,
                'timestamp': timestamp,
                'datetime': this.iso8601 (timestamp),
                'symbol': symbol,
                'type': undefined,
                'side': side,
                'takerOrMaker': this.safeStringLower (trade, 'trader_side'),
                'price': price,
                'amount': amount,
                'cost': cost,
                'fee': fee,
                'order': this.safeString (trade, 'taker_order_id'),
            };
        }
    }

    /**
     * @method
     * @name polymarket#fetchOHLCV
     * @description fetches historical candlestick data containing the open, high, low, and close price, and the volume of a market
     * @see https://docs.polymarket.com/developers/CLOB/clients/methods-public#getpriceshistory
     * @param {string} symbol unified symbol of the market to fetch OHLCV data for
     * @param {string} timeframe the length of time each candle represents
     * @param {int} [since] timestamp in ms of the earliest candle to fetch
     * @param {int} [limit] the maximum amount of candles to fetch
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID for the specific outcome (required if market has multiple outcomes)
     * @param {int} [params.endTs] timestamp in seconds for the ending date filter
     * @param {number} [params.fidelity] data fidelity/quality
     * @returns {int[][]} A list of candles ordered as timestamp, open, high, low, close, volume
     */
    async fetchOHLCV (symbol: string, timeframe: string = '1h', since: Int = undefined, limit: Int = undefined, params = {}): Promise<OHLCV[]> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request: Dict = {};
        // Get token ID from params or market
        // Use market['id'] which is the specific token ID for this outcome (YES/NO)
        // Do NOT use clobTokenIds[0] as that always picks the first outcome regardless of symbol
        let tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            tokenId = this.safeString (market, 'id');
        }
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOHLCV() requires a token_id parameter for market ' + symbol);
        }
        request['market'] = tokenId; // API uses 'market' parameter for token_id
        // Note: REST API /prices-history endpoint requires either:
        // 1. startTs and endTs (mutually exclusive with interval)
        // 2. interval (mutually exclusive with startTs/endTs)
        // See https://docs.polymarket.com/developers/CLOB/timeseries
        // Supported intervals: "1m", "1h", "6h", "1d", "1w", "max"
        // CCXT will automatically reject unsupported timeframes based on the 'timeframes' definition
        const endTs = this.safeInteger (params, 'endTs');
        if (since !== undefined || endTs !== undefined) {
            // Use startTs/endTs when time range is specified
            if (since !== undefined) {
                // Convert milliseconds to seconds for API
                request['startTs'] = this.parseToInt (since / 1000);
            }
            if (endTs !== undefined) {
                request['endTs'] = endTs;
            }
        } else {
            // Use interval when no time range is specified
            // CCXT will validate the timeframe against the 'timeframes' definition
            // Map to API format (timeframe should already be validated by CCXT)
            request['interval'] = timeframe;
        }
        // Fidelity parameter controls data granularity (e.g., 720 for 12-hour intervals)
        // If not provided, API may use default fidelity
        let fidelity = this.safeNumber (params, 'fidelity');
        // Polymarket enforces minimum fidelity per interval (e.g. interval=1m requires fidelity>=10)
        // Avoid leaking a server-side validation error back to the user when a too-low value is supplied.
        if (timeframe === '1m') {
            if (fidelity === undefined) {
                fidelity = 10;
            } else {
                fidelity = Math.min (10, fidelity);
            }
        }
        if (fidelity !== undefined) {
            request['fidelity'] = fidelity;
        }
        const remainingParams = this.omit (params, [ 'token_id', 'endTs', 'fidelity' ]);
        const response = await this.clobPublicGetPricesHistory (this.extend (request, remainingParams));
        let ohlcvData = [];
        if (Array.isArray (response)) {
            ohlcvData = response;
        } else {
            // Response has 'history' key containing the array
            ohlcvData = this.safeList (response, 'history', []) || [];
        }
        return this.parseOHLCVs (ohlcvData, market, timeframe, since, limit);
    }

    parseOHLCV (ohlcv: any, market: Market = undefined): OHLCV {
        // Polymarket MarketPrice format from getPricesHistory
        // See https://docs.polymarket.com/developers/CLOB/clients/methods-public#getpriceshistory
        // {
        //   "t": number,  // timestamp in seconds
        //   "p": number   // price
        // }
        // Note: Polymarket only returns price data, not full OHLCV
        // We'll use the price as open, high, low, and close, with volume as 0
        let timestamp = this.safeInteger (ohlcv, 't');
        const price = this.safeNumber (ohlcv, 'p');
        // Convert timestamp from seconds to milliseconds
        if (timestamp !== undefined) {
            timestamp = timestamp * 1000;
        }
        return [
            timestamp,
            price, // open
            price, // high (same as price since we only have price)
            price, // low (same as price since we only have price)
            price, // close
            0,     // volume (not available in price history)
        ];
    }

    /**
     * @method
     * @name polymarket#getRoundingConfig
     * @description Get rounding configuration based on tick size (matches ROUNDING_CONFIG from official SDK)
     * @param {string} tickSize tick size string (e.g., '0.1', '0.01', '0.001', '0.0001')
     * @returns {object} rounding configuration with price, size, and amount decimal places
     */
    getRoundingConfig (tickSize: string): Dict {
        // Determine rounding config based on tick size (matches ROUNDING_CONFIG from SDK)
        // Returns: { price: number, size: number, amount: number }
        let priceDecimals = 2;
        let sizeDecimals = 2;
        let amountDecimals = 4;
        if (tickSize === '0.1') {
            priceDecimals = 1;
            sizeDecimals = 2;
            amountDecimals = 3;
        } else if (tickSize === '0.01') {
            priceDecimals = 2;
            sizeDecimals = 2;
            amountDecimals = 4;
        } else if (tickSize === '0.001') {
            priceDecimals = 3;
            sizeDecimals = 2;
            amountDecimals = 5;
        } else if (tickSize === '0.0001') {
            priceDecimals = 4;
            sizeDecimals = 2;
            amountDecimals = 6;
        }
        return {
            'price': priceDecimals,
            'size': sizeDecimals,
            'amount': amountDecimals,
        };
    }

    /**
     * @method
     * @name polymarket#roundDown
     * @description Round down (truncate) a value to specific decimal places
     * @param {string} value value to round down
     * @param {number} decimals number of decimal places
     * @returns {string} rounded down value
     */
    roundDown (value: string, decimals: number): string {
        return this.decimalToPrecision (value, 0, decimals, 2, 5);
    }

    /**
     * @method
     * @name polymarket#roundNormal
     * @description Round a value normally to specific decimal places
     * @param {string} value value to round
     * @param {number} decimals number of decimal places
     * @returns {string} rounded value
     */
    roundNormal (value: string, decimals: number): string {
        return this.decimalToPrecision (value, 1, decimals, 2, 5);
    }

    /**
     * @method
     * @name polymarket#roundUp
     * @description Round up a value to specific decimal places
     * @param {string} value value to round up
     * @param {number} decimals number of decimal places
     * @returns {string} rounded up value
     */
    roundUp (value: string, decimals: number): string {
        return this.decimalToPrecision (value, 2, decimals, 2, 5);
    }

    /**
     * @method
     * @name polymarket#decimalPlaces
     * @description Count the number of decimal places in a string value
     * @param {string} value value to count decimal places for
     * @returns {number} number of decimal places
     */
    decimalPlaces (value: string): number {
        const parts = value.split ('.');
        if (parts.length === 2) {
            return parts[1].length;
        }
        return 0;
    }

    /**
     * @method
     * @name polymarket#toTokenDecimals
     * @description Convert a value to token decimals (smallest unit) by multiplying by 10^decimals and truncating
     * @param {string} value value to convert
     * @param {number} decimals number of decimals (e.g., 6 for USDC, 18 for tokens)
     * @returns {string} value in smallest unit as string
     */
    toTokenDecimals (value: string, decimals: number): string {
        // Multiply by 10^decimals and truncate to integer
        const multiplier = this.integerPrecisionToAmount (this.numberToString (-decimals));
        return Precise.stringDiv (Precise.stringMul (value, multiplier), '1', 0);
    }

    /**
     * @method
     * @name polymarket#buildAndSignOrder
     * @description Builds and signs an order with EIP-712 according to Polymarket order-utils specification
     * @see https://github.com/Polymarket/clob-order-utils
     * @see https://github.com/Polymarket/clob-client/blob/main/src/order-builder/builder.ts
     * @see https://github.com/Polymarket/python-order-utils/blob/main/py_order_utils/builders/order_builder.py
     * @param {string} tokenId the token ID
     * @param {string} side 'BUY' or 'SELL'
     * @param {string} size order size as string
     * @param {string} [price] order price as string (required for limit orders)
     * @param {object} [market] market structure (optional, used to get fees)
     * @param {object} [params] extra parameters
     * @param {number} [params.expiration] expiration timestamp in seconds (default: 30 days from now)
     * @param {number} [params.nonce] order nonce (default: 0)
     * @param {number} [params.feeRateBps] fee rate in basis points (default: from market or 200 bps)
     * @param {string} [params.maker] maker address (default: getMainWalletAddress())
     * @param {string} [params.taker] taker address (default: zero address)
     * @param {string} [params.signer] signer address (default: maker address)
     * @param {number} [params.signatureType] signature type (default: from options.signatureType or options.signatureTypes.EOA).
     * @param {string} [params.orderType] order type: 'GTC', 'IOC', 'FOK', 'GTD' (default: 'GTC' for limit orders, 'FOK' for market orders)
     * @param {boolean} [params.negRisk] true if the market is a neg risk (multi-outcome) market; overrides market.info.neg_risk
     * @returns {object} signed order object ready for submission
     */
    async buildAndSignOrder (tokenId: string, side: string, size: string, price: string = undefined, market: Market = undefined, params = {}): Promise<Dict> {
        // Get zero address constant (matches py-clob-client ZERO_ADDRESS)
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/constants.py
        const zeroAddress = this.safeString (this.options, 'zeroAddress', '0x0000000000000000000000000000000000000000');
        // Get signature type
        const signatureType = this.getSignatureType (params);
        // Get maker address (wallet address) - checksummed for signing
        let maker = this.safeString (params, 'maker');
        if (maker === undefined) {
            const signatureTypes = this.safeDict (this.options, 'signatureTypes', {});
            const eoaSignatureType = this.safeInteger (signatureTypes, 'EOA');
            if (signatureType === eoaSignatureType) {
                maker = this.getMainWalletAddress ();
            } else {
                maker = this.getProxyWalletAddress ();
            }
        }
        const normalizedMaker = this.normalizeAddress (maker);
        // Get taker address (default: zero address for open orders)
        const taker = this.safeString (params, 'taker', zeroAddress);
        const normalizedTaker = this.normalizeAddress (taker);
        // Get fee rate in basis points from market or params
        let feeRateBps = this.safeInteger (params, 'feeRateBps');
        if (feeRateBps === undefined) {
            if (market !== undefined) {
                // Try to get fee from market structure
                const marketInfo = this.safeDict (market, 'info', {});
                // First try takerBaseFee from market info (in basis points)
                feeRateBps = this.safeInteger (marketInfo, 'takerBaseFee');
                if (feeRateBps === undefined) {
                    // Try taker fee from parsed market (decimal, convert to basis points)
                    const takerFee = this.safeNumber (market, 'taker');
                    if (takerFee !== undefined) {
                        feeRateBps = Math.round (takerFee * 10000);
                    }
                }
            }
            // Fallback to default fee rate from options if not found in market
            if (feeRateBps === undefined) {
                feeRateBps = this.safeInteger (this.options, 'defaultFeeRateBps', 200);
            }
        }
        // Get expiration: GTC/IOC/FOK orders must have expiration = 0 (no expiration).
        // Only GTD orders use a future timestamp. buildOrder enforces this for normal flows,
        // but buildAndSignOrder may also be called directly, so we apply the same rule here.
        let expiration = this.safeInteger (params, 'expiration');
        if (expiration === undefined) {
            const timeInForce = this.safeString (params, 'timeInForce', 'GTC');
            const timeInForceUpper = timeInForce.toUpperCase ();
            if (timeInForceUpper === 'GTD') {
                const nowSeconds = Math.floor (this.milliseconds () / 1000);
                const defaultExpirationDays = this.safeInteger (this.options, 'defaultExpirationDays', 30);
                expiration = nowSeconds + (defaultExpirationDays * 24 * 60 * 60);
            } else {
                expiration = 0;
            }
        }
        // Get nonce (default: 0 for regular orders)
        // The nonce is used for on-chain batch cancellation: all orders sharing a non-zero nonce
        // can be cancelled together. 0 means "no group" and is required for standard orders.
        // See https://github.com/Polymarket/clob-order-utils/blob/main/src/order-builder/builder.ts
        let nonce = this.safeInteger (params, 'nonce');
        if (nonce === undefined) {
            nonce = 0;
        }
        // Get signer address (default: maker address)
        let signer = this.safeString (params, 'signer');
        if (signer === undefined) {
            signer = this.getMainWalletAddress ();
        }
        const normalizedSigner = this.normalizeAddress (signer);
        // Generate salt (unique integer based on milliseconds for better uniqueness)
        const salt = this.milliseconds ();
        // Calculate makerAmount and takerAmount from size and price
        // Key steps: 1) Round down size first, 2) Calculate other amount, 3) Round if needed, 4) Convert to smallest units
        // Get precision from market info or use defaults (USDC: 6 decimals, Tokens: 18 decimals)
        let orderMarketInfo: any = {};
        if (market !== undefined) {
            orderMarketInfo = this.safeDict (market, 'info', {});
        }
        let marketPrecision: any = {};
        if (market !== undefined) {
            marketPrecision = this.safeDict (market, 'precision', {});
        }
        const quoteDecimals = this.safeInteger (orderMarketInfo, 'quoteDecimals', this.safeInteger (marketPrecision, 'price'));
        const baseDecimals = this.safeInteger (orderMarketInfo, 'baseDecimals', this.safeInteger (marketPrecision, 'amount'));
        const defaultTickSize = this.safeString (this.options, 'defaultTickSize');
        const tickSize = this.safeString (orderMarketInfo, 'tick_size', defaultTickSize);
        const roundingConfig = this.getRoundingConfig (tickSize);
        const priceDecimals = this.safeInteger (roundingConfig, 'price', 2);
        const sizeDecimals = this.safeInteger (roundingConfig, 'size', 2);
        const amountDecimals = this.safeInteger (roundingConfig, 'amount', 4);
        let makerAmount: string;
        let takerAmount: string;
        const isBuy = (side.toUpperCase () === 'BUY');
        // Get price: from parameter, or from params.marketPrice for market orders
        let orderPrice = price;
        if (orderPrice === undefined) {
            orderPrice = this.safeString (params, 'marketPrice');
        }
        if (orderPrice === undefined) {
            throw new ArgumentsRequired (this.id + ' buildAndSignOrder() requires a price parameter or params.marketPrice');
        }
        // Round price and size first, then calculate amounts (same logic for limit and market orders)
        let rawPrice = this.roundNormal (orderPrice, priceDecimals);
        // If the rounded price is zero (price is below tick resolution), auto-detect the needed
        // decimal precision from the actual price value to avoid submitting a zero makerAmount.
        if (this.parseNumber (rawPrice) === 0) {
            const orderPriceStr = this.numberToString (orderPrice);
            const dotIndex = orderPriceStr.indexOf ('.');
            let neededDecimals = priceDecimals;
            if (dotIndex >= 0) {
                let nonZeroPos = dotIndex + 1;
                while (nonZeroPos < orderPriceStr.length && orderPriceStr[nonZeroPos] === '0') {
                    nonZeroPos += 1;
                }
                neededDecimals = nonZeroPos - dotIndex;
            }
            if (neededDecimals > priceDecimals) {
                rawPrice = this.roundNormal (orderPrice, neededDecimals);
            }
        }
        // Check if this is a market order for special decimal handling
        const orderType = this.safeString (params, 'orderType', 'limit');
        const isMarketOrder = (orderType === 'market');
        // Get rounding buffer constant
        const roundingBuffer = this.safeInteger (this.options, 'roundingBufferDecimals', 4);
        // Determine decimal precision based on order type and side
        let makerDecimals = 0;
        let takerDecimals = 0;
        if (isMarketOrder) {
            // Get market order decimal limits for quote (USDC) and base (tokens)
            const marketOrderQuoteDecimals = this.safeInteger (this.options, 'marketOrderQuoteDecimals', 2);
            const marketOrderBaseDecimals = this.safeInteger (this.options, 'marketOrderBaseDecimals', 4);
            if (isBuy) {
                // Market buy orders: maker gives USDC (quote), taker gives tokens (base)
                makerDecimals = marketOrderQuoteDecimals;
                takerDecimals = marketOrderBaseDecimals;
            } else {
                // Market sell orders: maker gives tokens (base), taker gives USDC (quote)
                makerDecimals = marketOrderBaseDecimals;
                takerDecimals = marketOrderQuoteDecimals;
            }
        } else {
            // Limit orders: use amountDecimals for both
            makerDecimals = amountDecimals;
            takerDecimals = amountDecimals;
        }
        if (isBuy) {
            // BUY: maker gives USDC, wants tokens
            // Round down size first
            let rawTakerAmt = this.roundDown (size, sizeDecimals);
            // Round taker amount to max decimals
            if (this.decimalPlaces (rawTakerAmt) > takerDecimals) {
                rawTakerAmt = this.roundDown (rawTakerAmt, takerDecimals);
            }
            // Calculate maker amount: raw_maker_amt = raw_taker_amt * raw_price
            // Do NOT round calculated amounts - preserve full precision for accurate calculations
            // The decimal limits apply to input size and final representation, not intermediate calculations
            const rawMakerAmt = Precise.stringMul (rawTakerAmt, rawPrice);
            // Convert to smallest units: maker gives USDC (quoteDecimals), taker gives tokens (baseDecimals)
            makerAmount = this.toTokenDecimals (rawMakerAmt, quoteDecimals);
            takerAmount = this.toTokenDecimals (rawTakerAmt, baseDecimals);
        } else {
            // SELL: maker gives tokens, wants USDC
            // Round down size first
            let rawMakerAmt = this.roundDown (size, sizeDecimals);
            // Round maker amount to max decimals
            if (this.decimalPlaces (rawMakerAmt) > makerDecimals) {
                rawMakerAmt = this.roundDown (rawMakerAmt, makerDecimals);
            }
            // Calculate taker amount: raw_taker_amt = raw_maker_amt * raw_price
            // Do NOT round calculated amounts - preserve full precision for accurate calculations
            // The decimal limits apply to input size and final representation, not intermediate calculations
            const rawTakerAmt = Precise.stringMul (rawMakerAmt, rawPrice);
            // Convert to smallest units: maker gives tokens (baseDecimals), taker gives USDC (quoteDecimals)
            makerAmount = this.toTokenDecimals (rawMakerAmt, baseDecimals);
            takerAmount = this.toTokenDecimals (rawTakerAmt, quoteDecimals);
        }
        const sideInt = this.getSide (side, params);
        const order: Dict = {
            'salt': salt.toString (), // uint256
            'maker': normalizedMaker, // address
            'signer': normalizedSigner, // address
            'taker': normalizedTaker, // address
            'tokenId': tokenId.toString (), // uint256
            'makerAmount': makerAmount.toString (), // uint256
            'takerAmount': takerAmount.toString (), // uint256
            'expiration': expiration.toString (), // uint256
            'nonce': nonce.toString (), // uint256
            'feeRateBps': feeRateBps.toString (), // uint256
            'side': sideInt, // uint8: number (0 or 1)
            'signatureType': signatureType, // uint8: number (0, 1, or 2)
        };
        const chainId = this.safeInteger (this.options, 'chainId');
        const orderDomainName = this.safeString (this.options, 'orderDomainName');
        const orderDomainVersion = this.safeString (this.options, 'orderDomainVersion');
        const contractConfig = this.getContractConfig (chainId);
        // Select verifyingContract based on neg_risk status:
        // - Standard (binary) markets use CTF Exchange (exchange)
        // - Neg risk (multi-outcome) markets use Neg Risk CTF Exchange (negRiskExchange)
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/order_builder/builder.py
        // Priority: params.negRisk > market.info.negRisk (camelCase, Gamma API) > market.info.neg_risk (snake_case, CLOB API) > fetch from CLOB
        let negRisk = this.safeBool (params, 'negRisk');
        if (negRisk === undefined) {
            // Gamma API uses camelCase; CLOB orderbook uses snake_case — check both
            negRisk = this.safeBool (orderMarketInfo, 'negRisk');
        }
        if (negRisk === undefined) {
            negRisk = this.safeBool (orderMarketInfo, 'neg_risk');
        }
        if (negRisk === undefined && tokenId !== undefined) {
            // Authoritative fallback: query the CLOB /neg-risk endpoint
            const negRiskResponse = await this.clobPublicGetNegRisk ({ 'token_id': tokenId });
            negRisk = this.safeBool (negRiskResponse, 'neg_risk');
        }
        let contractKey = 'exchange';
        if (negRisk) {
            contractKey = 'negRiskExchange';
        }
        const verifyingContract = this.normalizeAddress (this.safeString (contractConfig, contractKey));
        // Domain must match exactly what server expects for signature validation
        const domain = {
            'name': orderDomainName,
            'version': orderDomainVersion,
            'chainId': chainId,
            'verifyingContract': verifyingContract,
        };
        // EIP-712 types for orders from https://github.com/Polymarket/clob-order-utils/blob/main/src/exchange.order.const.ts
        const ORDER_STRUCTURE = [
            { 'name': 'salt', 'type': 'uint256' },
            { 'name': 'maker', 'type': 'address' },
            { 'name': 'signer', 'type': 'address' },
            { 'name': 'taker', 'type': 'address' },
            { 'name': 'tokenId', 'type': 'uint256' },
            { 'name': 'makerAmount', 'type': 'uint256' },
            { 'name': 'takerAmount', 'type': 'uint256' },
            { 'name': 'expiration', 'type': 'uint256' },
            { 'name': 'nonce', 'type': 'uint256' },
            { 'name': 'feeRateBps', 'type': 'uint256' },
            { 'name': 'side', 'type': 'uint8' },
            { 'name': 'signatureType', 'type': 'uint8' },
        ];
        // primary type is types[0] => 'primaryType': 'Order'
        // EIP712Domain shouldn't be included in messageTypes
        const messageTypes: Dict = {
            'Order': ORDER_STRUCTURE,
        };
        const signature = this.signTypedData (domain, messageTypes, order);
        order['signature'] = signature;
        return order;
    }

    /**
     * @method
     * @name polymarket#buildOrder
     * @description build a signed order request payload from order parameters
     * @see https://docs.polymarket.com/developers/CLOB/orders/create-order
     * @see https://docs.polymarket.com/developers/CLOB/orders/create-order-batch
     * @param {string} symbol unified symbol of the market to create an order in
     * @param {string} type 'market' or 'limit'
     * @param {string} side 'buy' or 'sell'
     * @param {float} amount how much you want to trade in units of the base currency
     * @param {float} [price] the price at which the order is to be fulfilled, in units of the quote currency, ignored in market orders
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID (required if market has multiple outcomes)
     * @param {string} [params.timeInForce] 'GTC', 'IOC', 'FOK', 'GTD' (default: 'GTC')
     * @param {string} [params.clientOrderId] a unique id for the order
     * @param {boolean} [params.postOnly] if true, the order will only be posted to the order book and not executed immediately
     * @param {number} [params.expiration] expiration timestamp in seconds (default: 30 days from now)
     * @returns {object} request payload with order, owner, orderType, and optional fields
     */
    async buildOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Dict> {
        const market = this.market (symbol);
        const marketInfo = this.safeDict (market, 'info', {});
        // Get token ID from params or market
        // Use market['id'] which is the specific token ID for this outcome (YES/NO)
        // Do NOT use clobTokenIds[0] as that always picks the first outcome regardless of symbol
        let tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            tokenId = this.safeString (market, 'id');
        }
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' buildOrder() requires a token_id parameter for market ' + symbol);
        }
        // Convert CCXT side to Polymarket side (BUY/SELL)
        const polymarketSide = (side === 'buy') ? 'BUY' : 'SELL';
        // Convert amount and price to strings
        const size = this.numberToString (amount);
        let priceStr = undefined;
        if (type === 'limit') {
            if (price === undefined) {
                throw new ArgumentsRequired (this.id + ' buildOrder() requires a price parameter for limit orders');
            }
            priceStr = this.numberToString (price);
        } else if (type === 'market') {
            // For market orders, price is optional but recommended
            // If not provided, we'll try to fetch from orderbook or use params.marketPrice
            if (price !== undefined) {
                priceStr = this.numberToString (price);
            } else {
                // Try to get price from params.marketPrice
                const marketPrice = this.safeNumber (params, 'marketPrice');
                if (marketPrice !== undefined) {
                    priceStr = this.numberToString (marketPrice);
                }
            }
        }
        // Determine orderType (at top level, not inside order object)
        // Must be determined before building orderObject to set expiration correctly
        let orderType = this.safeString (params, 'timeInForce', 'GTC');
        if (type === 'market') {
            // For market orders, use IOC (Immediate-Or-Cancel) by default
            // IOC allows partial fills, making it more forgiving than FOK (Fill-Or-Kill)
            // Users can still override with params.timeInForce = 'FOK' if needed
            orderType = this.safeString (params, 'timeInForce', 'IOC');
        }
        // Set expiration BEFORE signing: for non-GTD orders (GTC, FOK, FAK), expiration must be '0'
        // Only GTD orders should have a timestamp expiration
        // The signature must match the exact expiration value that will be sent to the API
        // See https://docs.polymarket.com/developers/CLOB/orders/create-order#request-payload-parameters
        const orderTypeUpper = orderType.toUpperCase ();
        // For non-GTD orders, expiration MUST be '0' (API requirement)
        // Override any user-provided expiration for non-GTD orders
        const orderParams = this.extend ({}, params);
        if (orderTypeUpper === 'GTD') {
            let expiration = this.safeInteger (params, 'expiration');
            if (expiration === undefined) {
                const nowSeconds = Math.floor (this.milliseconds () / 1000);
                const defaultExpirationDays = this.safeInteger (this.options, 'defaultExpirationDays', 30);
                expiration = nowSeconds + (defaultExpirationDays * 24 * 60 * 60);
            } else {
                orderParams['expiration'] = expiration.toString ();
            }
        } else {
            // For non-GTD orders, expiration must be 0 (will be converted to "0" string in signing)
            orderParams['expiration'] = 0;
        }
        // Pass order type to buildAndSignOrder for market order special handling
        orderParams['orderType'] = type;
        // Build and sign the order with EIP-712 (pass market to use fees from market)
        const signedOrder = await this.buildAndSignOrder (tokenId, polymarketSide, size, priceStr, market, orderParams);
        // override signedOrder types
        signedOrder['salt'] = this.parseToInt (signedOrder['salt']); // integer not string
        signedOrder['side'] = polymarketSide; // string (BUY or SELL)
        // Get API credentials for owner field
        const apiCredentials = this.getApiCredentials ();
        const owner = this.safeString (apiCredentials, 'apiKey');
        if (owner === undefined) {
            throw new AuthenticationError (this.id + ' buildOrder() requires API credentials (apiKey)');
        }
        // Build request payload according to API specification
        // Top-level fields: order, owner, orderType
        const requestPayload: Dict = {
            'order': signedOrder,
            'owner': owner,
            'orderType': orderType.toUpperCase (),
        };
        // Add optional parameters if provided
        const clientOrderId = this.safeString (params, 'clientOrderId');
        if (clientOrderId !== undefined) {
            requestPayload['clientOrderId'] = clientOrderId;
        }
        const postOnly = this.safeBool (params, 'postOnly', false);
        if (postOnly) {
            requestPayload['postOnly'] = true;
        }
        return requestPayload;
    }

    /**
     * @method
     * @name polymarket#createOrder
     * @description create a trade order
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/orders/create-order
     * @see https://github.com/Polymarket/clob-order-utils
     * @see https://docs.polymarket.com/developers/CLOB/orders/create-order#request-payload-parameters
     * @param {string} symbol unified symbol of the market to create an order in
     * @param {string} type 'market' or 'limit'
     * @param {string} side 'buy' or 'sell'
     * @param {float} amount how much you want to trade in units of the base currency
     * @param {float} [price] the price at which the order is to be fulfilled, in units of the quote currency, ignored in market orders
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID (required if market has multiple outcomes)
     * @param {string} [params.timeInForce] 'GTC', 'IOC', 'FOK', 'GTD' (default: 'GTC')
     * @param {string} [params.clientOrderId] a unique id for the order
     * @param {boolean} [params.postOnly] if true, the order will only be posted to the order book and not executed immediately
     * @param {number} [params.expiration] expiration timestamp in seconds (default: 30 days from now)
     * @param {number} [params.nonce] order nonce for batch cancellation grouping (default: 0)
     * @param {number} [params.feeRateBps] fee rate in basis points (default: fetched from API)
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        // Build the order request payload
        const requestPayload = await this.buildOrder (symbol, type, side, amount, price, params);
        // Extract clientOrderId from request payload for return value
        const clientOrderId = this.safeString (requestPayload, 'clientOrderId');
        // Submit order via POST /order endpoint
        const response = await this.clobPrivatePostOrder (this.extend (requestPayload, params));
        // Response format:
        // {
        //     "success": boolean,
        //     "errorMsg": string (if error),
        //     "orderId": string,
        //     "orderHashes": string[] (if order was marketable)
        // }
        const success = this.safeBool (response, 'success', true);
        if (!success) {
            const errorMsg = this.safeString (response, 'errorMsg', 'Unknown error');
            throw new ExchangeError (this.id + ' createOrder() failed: ' + errorMsg);
        }
        const orderId = this.safeString (response, 'orderID');
        if (orderId === undefined) {
            throw new ExchangeError (this.id + ' createOrder() response missing orderID');
        }
        let market = undefined;
        if (symbol) {
            market = this.market (symbol);
        }
        // Combine response with order details from requestPayload for parseOrder
        const orderData = this.extend ({
            'orderID': orderId,
            'clientOrderId': clientOrderId,
            'order': requestPayload['order'], // Include the signed order for additional context
            'order_type': requestPayload['orderType'], // Include orderType for parseOrder
        }, response);
        const order = this.parseOrder (orderData, market);
        return order;
    }

    /**
     * @method
     * @name polymarket#createOrders
     * @description create multiple trade orders
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/orders/create-order-batch
     * @param {Array} orders list of orders to create, each order should contain the parameters required by createOrder
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an array of [order structures]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    async createOrders (orders: OrderRequest[], params = {}): Promise<Order[]> {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        const orderRequests = [];
        const clientOrderIds = [];
        const symbols = [];
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            const symbol = this.safeString (order, 'symbol');
            if (symbol === undefined) {
                throw new ArgumentsRequired (this.id + ' createOrders() requires a symbol in each order');
            }
            const type = this.safeString (order, 'type');
            const side = this.safeString (order, 'side');
            const amount = this.safeNumber (order, 'amount');
            const price = this.safeNumber (order, 'price');
            const orderParams = this.safeDict (order, 'params', {});
            // Merge order-level params with top-level params
            const mergedParams = this.extend ({}, params, orderParams);
            // Get token_id from order params, order directly, or it will be resolved in buildOrder
            const tokenId = this.safeString (orderParams, 'token_id') || this.safeString (order, 'token_id');
            if (tokenId !== undefined) {
                mergedParams['token_id'] = tokenId;
            }
            // Get clientOrderId from order params or order directly
            const clientOrderId = this.safeString (orderParams, 'clientOrderId') || this.safeString (order, 'clientOrderId');
            if (clientOrderId !== undefined) {
                mergedParams['clientOrderId'] = clientOrderId;
            }
            // Get timeInForce from order params or order directly
            const timeInForce = this.safeString (orderParams, 'timeInForce') || this.safeString (order, 'timeInForce');
            if (timeInForce !== undefined) {
                mergedParams['timeInForce'] = timeInForce;
            }
            // Build the order request payload using the shared buildOrder function
            const orderRequest = await this.buildOrder (symbol, type, side, amount, price, mergedParams);
            // Store clientOrderId from request payload for response parsing
            const requestClientOrderId = this.safeString (orderRequest, 'clientOrderId');
            clientOrderIds.push (requestClientOrderId);
            symbols.push (symbol);
            orderRequests.push (orderRequest);
        }
        // Submit batch orders via POST /orders endpoint
        const response = await this.clobPrivatePostOrders (this.extend ({ 'orders': orderRequests }, params));
        // Response format: array of order responses, each with:
        // {
        //     "success": boolean,
        //     "errorMsg": string (if error),
        //     "orderId": string,
        //     "orderHashes": string[] (if order was marketable)
        // }
        const result = [];
        for (let i = 0; i < response.length; i++) {
            const orderResponse = response[i];
            const success = this.safeBool (orderResponse, 'success', true);
            if (!success) {
                const errorMsg = this.safeString (orderResponse, 'errorMsg', 'Unknown error');
                throw new ExchangeError (this.id + ' createOrders() failed for order ' + i + ': ' + errorMsg);
            }
            const orderId = this.safeString (orderResponse, 'orderID');
            if (orderId === undefined) {
                throw new ExchangeError (this.id + ' createOrders() response missing orderID for order ' + i);
            }
            let market = undefined;
            if (symbols[i]) {
                market = this.market (symbols[i]);
            }
            // Combine response with order details from orderRequests for parseOrder
            const orderData = this.extend ({
                'orderID': orderId,
                'clientOrderId': clientOrderIds[i],
                'order': orderRequests[i]['order'], // Include the signed order for additional context
                'order_type': orderRequests[i]['orderType'], // Include orderType for parseOrder
            }, orderResponse);
            result.push (this.parseOrder (orderData, market));
        }
        return result;
    }

    /**
     * @method
     * @name polymarket#createMarketOrder
     * @description create a market order
     * @param {string} symbol unified symbol of the market to create an order in
     * @param {string} side 'buy' or 'sell'
     * @param {float} amount how much you want to trade in units of the base currency
     * @param {float} [price] ignored for market orders
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    async createMarketOrder (symbol: string, side: OrderSide, amount: number, price: Num = undefined, params = {}) {
        // Use IOC by default for market orders (allows partial fills)
        // Users can override with params.timeInForce = 'FOK' if they need Fill-Or-Kill behavior
        return await this.createOrder (symbol, 'market', side, amount, price, this.extend (params, { 'timeInForce': 'IOC' }));
    }

    /**
     * @method
     * @name polymarket#cancelOrder
     * @description cancels an open order
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/orders/cancel-order
     * @param {string} id order id
     * @param {string} symbol unified symbol of the market the order was made in
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} An [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    async cancelOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        // Based on cancel() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (CANCEL = "/order")
        // Response format: { canceled: string[], not_canceled: { order_id -> reason } }
        // See https://docs.polymarket.com/developers/CLOB/orders/cancel-order
        const response = await this.clobPrivateDeleteOrder (this.extend ({ 'order_id': id }, params));
        const canceled = this.safeList (response, 'canceled', []);
        const notCanceled = this.safeDict (response, 'not_canceled', {});
        // Check if order was successfully canceled
        let isCanceled = false;
        for (let i = 0; i < canceled.length; i++) {
            if (canceled[i] === id) {
                isCanceled = true;
                break;
            }
        }
        if (isCanceled) {
            // Order was canceled, parse order from response data
            const market = symbol ? this.market (symbol) : undefined;
            const orderData = {
                'id': id,
                'status': 'canceled',
                'info': response,
            };
            return this.parseOrder (orderData, market);
        } else {
            // Check if order is in not_canceled map
            const reason = this.safeString (notCanceled, id);
            if (reason !== undefined) {
                // Order couldn't be canceled, throw error with reason
                throw new ExchangeError (this.id + ' cancelOrder() failed: ' + reason);
            } else {
                // Order ID not found in response (shouldn't happen)
                throw new ExchangeError (this.id + ' cancelOrder() unexpected response format');
            }
        }
    }

    /**
     * @method
     * @name polymarket#cancelOrders
     * @description cancel multiple orders
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/orders/cancel-order-batch
     * @param {string[]} ids order ids
     * @param {string} symbol unified symbol of the market the orders were made in
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an array of [order structures]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    async cancelOrders (ids: string[], symbol: Str = undefined, params = {}): Promise<Order[]> {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        // Based on cancel_orders() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (CANCEL_ORDERS = "/orders")
        // Response format: { canceled: string[], not_canceled: { order_id -> reason } }
        // See https://docs.polymarket.com/developers/CLOB/orders/cancel-order-batch
        const response = await this.clobPrivateDeleteOrders (this.extend ({ 'order_ids': ids }, params));
        const canceled = this.safeList (response, 'canceled', []);
        const notCanceled = this.safeDict (response, 'not_canceled', {});
        const market = symbol ? this.market (symbol) : undefined;
        const orders: Order[] = [];
        // Add canceled orders
        for (let i = 0; i < canceled.length; i++) {
            const orderId = canceled[i];
            const orderData = {
                'id': orderId,
                'status': 'canceled',
                'info': response,
            };
            orders.push (this.parseOrder (orderData, market));
        }
        // Verify all requested orders are accounted for in the response
        for (let i = 0; i < ids.length; i++) {
            const orderId = ids[i];
            let isInCanceled = false;
            for (let j = 0; j < canceled.length; j++) {
                if (canceled[j] === orderId) {
                    isInCanceled = true;
                    break;
                }
            }
            if (!isInCanceled && !(orderId in notCanceled)) {
                // Order ID not found in response (unexpected)
                throw new ExchangeError (this.id + ' cancelOrders() unexpected response format for order ' + orderId);
            }
        }
        return orders;
    }

    /**
     * @method
     * @name polymarket#cancelAllOrders
     * @description cancel all open orders
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/orders/cancel-all-orders
     * @param {string} [symbol] unified market symbol, only orders in the market of this symbol are cancelled when symbol is not undefined
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [order structures]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    async cancelAllOrders (symbol: Str = undefined, params = {}): Promise<Order[]> {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        let response;
        if (symbol !== undefined) {
            // Use cancel-market-orders endpoint when symbol is provided
            // See https://docs.polymarket.com/developers/CLOB/orders/cancel-market-orders
            const market = this.market (symbol);
            const marketInfo = this.safeDict (market, 'info', {});
            // Get condition_id (market ID)
            const conditionId = this.safeString (marketInfo, 'condition_id', market['id']);
            // Get asset_id from market
            // Use market['id'] which is the specific token ID for this outcome (YES/NO)
            // Do NOT use clobTokenIds[0] as that always picks the first outcome regardless of symbol
            const request: Dict = {};
            if (conditionId !== undefined) {
                request['market'] = conditionId;
            }
            const assetId = this.safeString (market, 'id');
            if (assetId !== undefined) {
                request['asset_id'] = assetId;
            }
            // Response format: { canceled: string[], not_canceled: { order_id -> reason } }
            response = await this.clobPrivateDeleteCancelMarketOrders (this.extend (request, params));
        } else {
            // Use cancel-all endpoint when symbol is undefined
            // Based on cancel_all() from py-clob-client
            // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (CANCEL_ALL = "/cancel-all")
            // Response format: { canceled: string[], not_canceled: { order_id -> reason } }
            // See https://docs.polymarket.com/developers/CLOB/orders/cancel-all-orders
            response = await this.clobPrivateDeleteCancelAll (params);
        }
        const canceled = this.safeList (response, 'canceled', []);
        const orderMarket = symbol ? this.market (symbol) : undefined;
        const orders: Order[] = [];
        // Add canceled orders
        for (let i = 0; i < canceled.length; i++) {
            const orderId = canceled[i];
            const orderData = {
                'id': orderId,
                'status': 'canceled',
                'info': response,
            };
            orders.push (this.parseOrder (orderData, orderMarket));
        }
        return orders;
    }

    /**
     * @method
     * @name polymarket#fetchOrder
     * @description fetches information on an order made by the user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/orders/get-order
     * @param {string} id order id
     * @param {string} symbol unified symbol of the market the order was made in
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} An [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    async fetchOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        // Based on get_order() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (GET_ORDER = "/data/order/")
        const response = await this.clobPrivateGetOrder (this.extend ({ 'order_id': id }, params));
        const market = symbol ? this.market (symbol) : undefined;
        return this.parseOrder (response, market);
    }

    /**
     * @method
     * @name polymarket#fetchOrders
     * @description fetches information on multiple orders made by the user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/orders/get-orders
     * @param {string} symbol unified symbol of the market the orders were made in
     * @param {int} [since] the earliest time in ms to fetch orders for
     * @param {int} [limit] the maximum number of order structures to retrieve
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.id] filter orders by order id
     * @param {string} [params.market] filter orders by market id
     * @param {string} [params.asset_id] filter orders by asset id (alias token_id)
     * @returns {object[]} a list of [order structures]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    async fetchOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        await this.loadMarkets ();
        await this.ensureApiCredentials (params);
        const request = {};
        if (symbol !== undefined) {
            const market = this.market (symbol);
            const marketInfo = this.safeDict (market, 'info', {});
            // Filter by condition_id (market) to get all orders for this market
            // This is more appropriate than filtering by asset_id alone, as a market can have multiple outcomes
            const conditionId = this.safeString (marketInfo, 'condition_id', market['id']);
            if (conditionId !== undefined) {
                request['market'] = conditionId;
            }
            // Also include asset_id for backward compatibility and more specific filtering
            // Use market['id'] which is the specific token ID for this outcome (YES/NO)
            // Do NOT use clobTokenIds[0] as that always picks the first outcome regardless of symbol
            const assetId = this.safeString (market, 'id');
            if (assetId !== undefined) {
                // The Polymarket L2 getOpenOrders() endpoint filters by asset_id
                request['asset_id'] = assetId;
                // Keep backward compatibility for legacy token_id usage
                request['token_id'] = assetId;
            }
        }
        const id = this.safeString (params, 'id');
        if (id !== undefined) {
            request['id'] = id;
        }
        const marketId = this.safeString (params, 'market');
        if (marketId !== undefined) {
            request['market'] = marketId;
        }
        const assetId = this.safeString2 (params, 'asset_id', 'token_id');
        if (assetId !== undefined) {
            request['asset_id'] = assetId;
            request['token_id'] = assetId;
        }
        const initialCursor = this.safeString (this.options, 'initialCursor');
        const endCursor = this.safeString (this.options, 'endCursor');
        let nextCursor = initialCursor;
        let ordersResponse: any[] = [];
        while (true) {
            const response = await this.clobPrivateGetOrders (this.extend (request, { 'next_cursor': nextCursor }, params));
            const data = this.safeList (response, 'data', []);
            ordersResponse = this.arrayConcat (ordersResponse, data);
            if (limit !== undefined && ordersResponse.length >= limit) {
                break;
            }
            nextCursor = this.safeString (response, 'next_cursor');
            if (nextCursor === undefined || nextCursor === endCursor) {
                break;
            }
        }
        const orderMarket = symbol ? this.market (symbol) : undefined;
        return this.parseOrders (ordersResponse, orderMarket, since, limit);
    }

    /**
     * @method
     * @name polymarket#fetchOpenOrders
     * @description fetch all unfilled currently open orders
     * @param {string} symbol unified symbol of the market to fetch open orders for
     * @param {int} [since] the earliest time in ms to fetch open orders for
     * @param {int} [limit] the maximum number of open order structures to retrieve
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [order structures]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    async fetchOpenOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        return await this.fetchOrders (symbol, since, limit, params);
    }

    /**
     * @method
     * @name polymarket#parseOrder
     * @description parses an order from the exchange response format
     * @param {object} order order response from the exchange
     * @param {object} [market] market structure
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    parseOrder (order: Dict, market: Market = undefined): Order {
        // Handle createOrder/createOrders response format:
        // {
        //   "success": boolean,
        //   "errorMsg": string (if error),
        //   "orderID": string,
        //   "orderHashes": string[] (if order was marketable)
        // }
        // Or fetchOrder response format (OpenOrder interface):
        // {
        //   id: string;
        //   status: string;
        //   owner: string;
        //   maker_address: string;
        //   market: string;
        //   asset_id: string;
        //   side: string;
        //   original_size: string;
        //   size_matched: string;
        //   price: string;
        //   associate_trades: string[];
        //   outcome: string;
        //   created_at: number; // seconds
        //   expiration: string;
        //   order_type: string;
        // }
        let id = this.safeString (order, 'id');
        // Handle createOrder response format (has orderID instead of id)
        if (id === undefined) {
            id = this.safeString (order, 'orderID');
        }
        const marketId = this.safeString (order, 'market');
        const assetId = this.safeString (order, 'asset_id');
        if (market === undefined && marketId !== undefined) {
            market = this.safeMarketWithFallback (marketId, undefined, order);
        }
        let symbol = undefined;
        if (market !== undefined && market['symbol'] !== undefined) {
            symbol = market['symbol'];
        } else if (assetId !== undefined) {
            symbol = assetId;
        }
        // Handle createOrder response - get side from order object if available
        let sideStr = this.safeStringLower (order, 'side');
        // If side is not in order, try to get it from the order object passed in createOrder
        if (sideStr === undefined) {
            const orderObj = this.safeDict (order, 'order');
            if (orderObj !== undefined) {
                sideStr = this.safeStringLower (orderObj, 'side');
            }
        }
        const side = (sideStr === 'buy' || sideStr === 'sell') ? sideStr : undefined;
        let orderType = this.safeString (order, 'order_type');
        // Handle createOrder response - get orderType from order object if available
        if (orderType === undefined) {
            const orderObj = this.safeDict (order, 'order');
            if (orderObj !== undefined) {
                orderType = this.safeString (orderObj, 'orderType');
            }
            // Also check at top level (from requestPayload)
            if (orderType === undefined) {
                orderType = this.safeString (order, 'orderType');
            }
        }
        // Normalize orderType to lowercase for consistent parsing
        if (orderType !== undefined) {
            orderType = orderType.toLowerCase ();
        }
        // Amounts
        let amount = this.safeNumber (order, 'original_size');
        // Handle createOrder response - get amount from order object if available
        if (amount === undefined) {
            const orderObj = this.safeDict (order, 'order');
            if (orderObj !== undefined) {
                amount = this.safeNumber (orderObj, 'size');
            }
        }
        const filled = this.safeNumber (order, 'size_matched');
        let remaining = this.safeNumber (order, 'remaining_size');
        if (remaining === undefined && amount !== undefined && filled !== undefined) {
            remaining = amount - filled;
        }
        // Price
        let price = this.safeNumber (order, 'price');
        // Handle createOrder response - get price from order object if available
        if (price === undefined) {
            const orderObj = this.safeDict (order, 'order');
            if (orderObj !== undefined) {
                price = this.safeNumber (orderObj, 'price');
            }
        }
        // Status
        const statusStr = this.safeString (order, 'status', '');
        const status = this.parseOrderStatus (statusStr);
        // Timestamps (created_at is seconds)
        const createdAt = this.safeInteger (order, 'created_at');
        const timestamp = (createdAt !== undefined) ? createdAt * 1000 : undefined;
        // Get clientOrderId from order or from the order object
        let clientOrderId = this.safeString (order, 'clientOrderId');
        if (clientOrderId === undefined) {
            const orderObj = this.safeDict (order, 'order');
            if (orderObj !== undefined) {
                clientOrderId = this.safeString (orderObj, 'clientOrderId');
            }
        }
        // No explicit updated_at in interface; leave lastTradeTimestamp undefined
        return this.safeOrder ({
            'id': id,
            'clientOrderId': clientOrderId,
            'info': order,
            'timestamp': timestamp,
            'datetime': timestamp ? this.iso8601 (timestamp) : undefined,
            'lastTradeTimestamp': undefined,
            'status': status,
            'symbol': symbol,
            'type': this.parseOrderType (orderType),
            'timeInForce': this.parseTimeInForce (orderType),
            'side': side,
            'price': price,
            'amount': amount,
            'cost': undefined,
            'average': undefined,
            'filled': filled,
            'remaining': remaining,
            'fee': undefined,
        }, market);
    }

    /**
     * @method
     * @name polymarket#parseOrderStatus
     * @description parse the status of an order
     * @param {string} status order status from exchange
     * @returns {string} a unified order status
     */
    parseOrderStatus (status: Str): Str {
        if (status === undefined || status === '') {
            return 'open'; // Default to 'open' if no status is provided
        }
        const statuses: Dict = {
            // https://docs.polymarket.com/developers/CLOB/orders/create-order#status
            'matched': 'closed',   // order placed and matched with an existing resting order
            'live': 'open',         // order placed and resting on the book
            'delayed': 'open',      // order marketable, but subject to matching delay
            'unmatched': 'open',    // order marketable, but failure delaying, placement successful
            'canceled': 'canceled', // CCXT unified status for canceled orders
            'canceled_market_resolved': 'canceled', // order voided because the market resolved before it was filled
            'invalid': 'rejected',
        };
        const normalizedStatus = status.toLowerCase ();
        return this.safeString (statuses, normalizedStatus, normalizedStatus);
    }

    parseOrderType (type: Str): Str {
        const types: Dict = {
            'fok': 'market', // Fill-Or-Kill: market order
            'fak': 'market', // Fill-And-Kill: market order
            'ioc': 'market', // Immediate-Or-Cancel: market order
            'gtc': 'limit', // Good-Til-Cancelled: limit order
            'gtd': 'limit', // Good-Til-Date: limit order
        };
        return this.safeString (types, type, 'limit');
    }

    parseTimeInForce (timeInForce: Str): Str {
        if (timeInForce === undefined) {
            return undefined;
        }
        const timeInForces: Dict = {
            'fok': 'FOK', // Fill-Or-Kill
            'fak': 'FAK', // Fill-And-Kill
            'ioc': 'IOC', // Immediate-Or-Cancel
            'gtc': 'GTC', // Good-Til-Cancelled
            'gtd': 'GTD', // Good-Til-Date
        };
        const normalized = timeInForce.toLowerCase ();
        const mapped = this.safeString (timeInForces, normalized);
        return mapped !== undefined ? mapped : timeInForce.toUpperCase ();
    }

    /**
     * @method
     * @name polymarket#fetchPositions
     * @description fetches the current user positions
     * @param {string[]} [symbols] list of unified market symbols
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.userAddress] user wallet address (defaults to getProxyWalletAddress())
     * @returns {object[]} a list of [position structures]{@link https://docs.ccxt.com/#/?id=position-structure}
     */
    async fetchPositions (symbols: Strings = undefined, params = {}): Promise<Position[]> {
        await this.loadMarkets ();
        const userAddress = this.safeString (params, 'userAddress');
        const response = await this.getUserPositions (userAddress, params);
        // Response format: array of position objects
        // {
        //   "proxyWallet": "0x...",
        //   "asset": "0x...",
        //   "conditionId": "0x...",
        //   "size": "123.45",
        //   "avgPrice": "0.65",
        //   "initialValue": "80.24",
        //   "currentValue": "85.50",
        //   "cashPnl": "5.26",
        //   "percentPnl": "6.55",
        //   ...
        // }
        const positions = Array.isArray (response) ? response : [];
        return this.parsePositions (positions, symbols);
    }

    /**
     * @method
     * @name polymarket#fetchUserPositions
     * @description fetches the current user positions
     * @param {string} userId user ID
     * @param {string[]} [symbols] list of unified market symbols
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.userAddress] user wallet address (defaults to getProxyWalletAddress())
     * @returns {object[]} a list of [position structures]{@link https://docs.ccxt.com/#/?id=position-structure}
     */
    async fetchUserPositions (userId: string, symbols: Strings = undefined, params = {}): Promise<Position[]> {
        await this.loadMarkets ();
        const response = await this.getUserPositions (userId, params);
        // Response format: array of position objects
        // {
        //   "proxyWallet": "0x...",
        //   "asset": "0x...",
        //   "conditionId": "0x...",
        //   "size": "123.45",
        //   "avgPrice": "0.65",
        //   "initialValue": "80.24",
        //   "currentValue": "85.50",
        //   "cashPnl": "5.26",
        //   "percentPnl": "6.55",
        //   ...
        // }
        const positions = Array.isArray (response) ? response : [];
        return this.parsePositions (positions, symbols);
    }

    /**
     * @method
     * @name polymarket#fetchClosedPositions
     * @description fetches the closed user positions
     * @param {string[]} [symbols] list of unified market symbols
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.userAddress] user wallet address (defaults to getProxyWalletAddress())
     * @returns {object[]} a list of [position structures]{@link https://docs.ccxt.com/#/?id=position-structure}
     */
    async fetchClosedPositions (symbols: Strings = undefined, params = {}): Promise<Position[]> {
        await this.loadMarkets ();
        const userAddress = this.safeString (params, 'userAddress');
        const response = await this.getUserClosedPositions (userAddress, params);
        // Response format: array of position objects
        // {
        //   "proxyWallet": "0x...",
        //   "asset": "0x...",
        //   "conditionId": "0x...",
        //   "size": "123.45",
        //   "avgPrice": "0.65",
        //   "initialValue": "80.24",
        //   "currentValue": "85.50",
        //   "cashPnl": "5.26",
        //   "percentPnl": "6.55",
        //   ...
        // }
        const positions = Array.isArray (response) ? response : [];
        return this.parsePositions (positions, symbols);
    }

    /**
     * @method
     * @name polymarket#fetchUserClosedPositions
     * @description fetches the closed user positions
     * @param {string} userId user ID
     * @param {string[]} [symbols] list of unified market symbols
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.userAddress] user wallet address (defaults to getProxyWalletAddress())
     * @returns {object[]} a list of [position structures]{@link https://docs.ccxt.com/#/?id=position-structure}
     */
    async fetchUserClosedPositions (userId: string, symbols: Strings = undefined, params = {}): Promise<Position[]> {
        await this.loadMarkets ();
        const response = await this.getUserClosedPositions (userId, params);
        // Response format: array of position objects
        // {
        //   "proxyWallet": "0x...",
        //   "asset": "0x...",
        //   "conditionId": "0x...",
        //   "size": "123.45",
        //   "avgPrice": "0.65",
        //   "initialValue": "80.24",
        //   "currentValue": "85.50",
        //   "cashPnl": "5.26",
        //   "percentPnl": "6.55",
        //   ...
        // }
        const positions = Array.isArray (response) ? response : [];
        return this.parsePositions (positions, symbols);
    }

    /**
     * @method
     * @name polymarket#safeMarketWithFallback
     * @description Safely get a market by ID, with fallback to synthetic market for missing/closed markets
     * @param {string} marketId Market ID (asset ID, clobTokenId, or symbol) to look up
     * @param {object} [market] Optional pre-existing market structure
     * @param {object} [metadata] Optional metadata (position, order, etc.) containing market info
     * @returns {object} Market structure (from marketsById, synthetic, or minimal)
     */
    safeMarketWithFallback (marketId: string, market: Market = undefined, metadata: Dict = undefined): Market {
        try {
            market = this.safeMarket (marketId, market);
            // Check if market was actually found in markets_by_id
            if (this.markets_by_id !== undefined && marketId in this.markets_by_id) {
                return market; // Market found, return it
            }
        } catch (e) {
            // safeMarket can raise ArgumentsRequired for ambiguous markets
            // In this case, we'll try to create synthetic or return minimal structure
            if (e instanceof ArgumentsRequired) {
                market = undefined
            } else {
                // Re-raise other exceptions
                throw e;
            }
        }
        // Market not found in markets_by_id - if we have metadata, try to create synthetic market
        if (metadata !== undefined) {
            const conditionId = this.safeString (metadata, 'conditionId');
            const slug = this.safeString (metadata, 'slug');
            if (conditionId !== undefined || slug !== undefined) {
                return this.createSyntheticClosedMarket (metadata, marketId);
            }
        }
        // No metadata or can't create synthetic - return minimal structure from safeMarket
        return this.safeMarket (marketId, market);
    }

    /**
     * @method
     * @name polymarket#createSyntheticClosedMarket
     * @description Create a synthetic market structure for a closed/expired market
     * @param {object} position position response from the exchange
     * @param {string} asset asset ID
     * @returns {object} synthetic market structure
     */
    createSyntheticClosedMarket (position: Dict, asset: string): Market {
        const conditionId = this.safeString (position, 'conditionId');
        const slug = this.safeString (position, 'slug');
        const title = this.safeString (position, 'title');
        const outcome = this.safeString (position, 'outcome');
        const endDate = this.safeString (position, 'endDate');
        // Use slug or conditionId as base
        const baseId = slug || conditionId || asset;
        const quoteId = this.safeString (this.options, 'defaultCollateral', 'USDC');
        // Parse endDate for symbol construction
        let expiry = undefined;
        if (endDate !== undefined) {
            try {
                if (endDate.indexOf ('T') >= 0 || endDate.indexOf ('Z') >= 0) {
                    expiry = this.parse8601 (endDate);
                } else {
                    expiry = this.parse8601 (endDate + 'T00:00:00Z');
                }
            } catch (e) {
                expiry = undefined
            }
        }
        // Far future if no date
        let ymd = '999999';
        if (expiry !== undefined) {
            ymd = this.yymmdd (expiry);
        }
        let optionType = 'UNKNOWN';
        if (outcome !== undefined) {
            optionType = this.parseOptionType (outcome);
        }
        const symbol = baseId + '/' + quoteId + ':' + quoteId + '-' + ymd + '-0-' + optionType;
        return this.safeMarketStructure ({
            'id': asset,
            'symbol': symbol,
            'base': baseId,
            'quote': quoteId,
            'settle': quoteId,
            'baseId': baseId,
            'quoteId': quoteId,
            'type': 'option',
            'spot': false,
            'margin': false,
            'swap': false,
            'future': false,
            'option': true,
            'active': false, // Mark as inactive since it's closed
            'contract': true,
            'linear': true,
            'precision': {
                'amount': 6, // https://github.com/Polymarket/clob-client/blob/main/src/config.ts
                'price': 6, // https://github.com/Polymarket/clob-client/blob/main/src/config.ts
            },
            'limits': {
                'leverage': {
                    'min': undefined,
                    'max': undefined,
                },
                'amount': {
                    'min': 5, // Minimum order size
                    'max': undefined,
                },
                'price': {
                    'min': 1e-6, // Prediction markets are >0 and <1
                    'max': 1, // Prediction markets are 0-1
                },
                'cost': {
                    'min': undefined,
                    'max': undefined,
                },
            },
            'info': {
                'conditionId': conditionId,
                'slug': slug,
                'title': title,
                'outcome': outcome,
                'endDate': endDate,
                'closed': true,
            },
        });
    }

    /**
     * @method
     * @name polymarket#parsePosition
     * @description parses a position from the exchange response format
     * @param {object} position position response from the exchange
     * @param {object} [market] market structure
     * @returns {object} a [position structure]{@link https://docs.ccxt.com/#/?id=position-structure}
     */
    parsePosition (position: Dict, market: Market = undefined): Position {
        // Response format from getUserPositions:
        // {
        //   "proxyWallet": "0x56687bf447db6ffa42ffe2204a05edaa20f55839",
        //   "asset": "<string>",
        //   "conditionId": "0xdd22472e552920b8438158ea7238bfadfa4f736aa4cee91a6b86c39ead110917",
        //   "size": 123,
        //   "avgPrice": 123,
        //   "initialValue": 123,
        //   "currentValue": 123,
        //   "cashPnl": 123,
        //   "percentPnl": 123,
        //   "totalBought": 123,
        //   "realizedPnl": 123,
        //   "percentRealizedPnl": 123,
        //   "curPrice": 123,
        //   "redeemable": true,
        //   "mergeable": true,
        //   "title": "<string>",
        //   "slug": "<string>",
        //   "icon": "<string>",
        //   "eventSlug": "<string>",
        //   "outcome": "<string>",
        //   "outcomeIndex": 123,
        //   "oppositeOutcome": "<string>",
        //   "oppositeAsset": "<string>",
        //   "endDate": "<string>",
        //   "negativeRisk": true,
        //   "timestamp": 123
        // }
        const conditionId = this.safeString (position, 'conditionId');
        const asset = this.safeString (position, 'asset');
        const proxyWallet = this.safeString (position, 'proxyWallet');
        const totalBought = this.safeNumber (position, 'totalBought');
        const realizedPnl = this.safeNumber (position, 'realizedPnl');
        const percentRealizedPnl = this.safeNumber (position, 'percentRealizedPnl');
        const curPrice = this.safeNumber (position, 'curPrice');
        const redeemable = this.safeBool (position, 'redeemable');
        const mergeable = this.safeBool (position, 'mergeable');
        const title = this.safeString (position, 'title');
        const slug = this.safeString (position, 'slug');
        const icon = this.safeString (position, 'icon');
        const eventSlug = this.safeString (position, 'eventSlug');
        const outcome = this.safeString (position, 'outcome');
        const outcomeIndex = this.safeInteger (position, 'outcomeIndex');
        const oppositeOutcome = this.safeString (position, 'oppositeOutcome');
        const oppositeAsset = this.safeString (position, 'oppositeAsset');
        const endDate = this.safeString (position, 'endDate');
        const negativeRisk = this.safeBool (position, 'negativeRisk');
        const timestamp = this.safeInteger (position, 'timestamp');
        // Get market with automatic fallback for closed markets
        market = this.safeMarketWithFallback (asset, market, position);
        const symbol = market['symbol'];
        const sizeString = this.safeString (position, 'size', '0');
        const contracts = this.parseNumber (sizeString);
        let side: Str = undefined;
        if (contracts !== undefined) {
            if (contracts > 0) {
                side = 'long';
            } else if (contracts < 0) {
                side = 'short';
            }
        }
        const avgPrice = this.safeNumber (position, 'avgPrice');
        const currentValue = this.safeNumber (position, 'currentValue');
        const initialValue = this.safeNumber (position, 'initialValue');
        const cashPnl = this.safeNumber (position, 'cashPnl');
        const percentPnl = this.safeNumber (position, 'percentPnl');
        // Calculate unrealized PnL (cashPnl is already the unrealized PnL)
        const unrealizedPnl = cashPnl;
        // Calculate notional value (current value of the position)
        const notional = currentValue;
        // Calculate collateral (initial value invested)
        const collateral = initialValue;
        // Extract margin mode, default to 'cross' if not available
        const marginMode = this.safeString (position, 'marginMode', 'cross');
        const isIsolated = (marginMode === 'isolated');
        // For now leverage is not supported by Polymarket
        const leverage = this.safeNumber (position, 'leverage', 1);
        // Build extended info object with parsed values
        const extendedInfo = this.extend (position, {
            'proxyWallet': proxyWallet,
            'totalBought': totalBought,
            'realizedPnl': realizedPnl,
            'percentRealizedPnl': percentRealizedPnl,
            'curPrice': curPrice,
            'redeemable': redeemable,
            'mergeable': mergeable,
            'title': title,
            'slug': slug,
            'icon': icon,
            'eventSlug': eventSlug,
            'outcome': outcome,
            'outcomeIndex': outcomeIndex,
            'oppositeOutcome': oppositeOutcome,
            'oppositeAsset': oppositeAsset,
            'endDate': endDate,
            'negativeRisk': negativeRisk,
            'timestamp': timestamp,
        });
        return this.safePosition ({
            'info': extendedInfo,
            'id': asset,
            'symbol': symbol,
            'notional': notional,
            'marginMode': marginMode,
            'isolated': isIsolated,
            'liquidationPrice': undefined,
            'entryPrice': avgPrice,
            'unrealizedPnl': unrealizedPnl,
            'percentage': percentPnl,
            'contracts': contracts,
            'contractSize': undefined,
            'markPrice': curPrice,
            'side': side,
            'hedged': undefined,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'initialMarginPercentage': undefined,
            'maintenanceMargin': undefined,
            'maintenanceMarginPercentage': undefined,
            'collateral': collateral,
            'initialMargin': initialValue,
            'leverage': leverage,
            'realizedPnl': realizedPnl,
        });
    }

    /**
     * @method
     * @name polymarket#fetchTime
     * @description fetches the current integer timestamp in milliseconds from the exchange server
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py#L178
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {int} the current integer timestamp in milliseconds from the exchange server
     */
    async fetchTime (params = {}): Promise<Int> {
        // Based on get_server_time() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py#L178
        const response = await this.clobPublicGetTime (params);
        // Response format: timestamp in seconds (Unix timestamp)
        // Convert to milliseconds for CCXT standard
        const timestamp = this.safeInteger (response, 'timestamp');
        if (timestamp !== undefined) {
            return timestamp * 1000; // Convert seconds to milliseconds
        }
        // Fallback: if response is just a number
        if (typeof response === 'number') {
            return response * 1000;
        }
        // Fallback: use current time if server time not available
        return this.milliseconds ();
    }

    /**
     * @method
     * @name polymarket#fetchStatus
     * @description the latest known information on the availability of the exchange API
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py#L170
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [status structure]{@link https://docs.ccxt.com/#/?id=exchange-status-structure}
     */
    async fetchStatus (params = {}) {
        // Based on get_ok() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py#L170
        try {
            await this.clobPublicGetOk (params);
            return {
                'status': 'ok',
                'updated': undefined,
                'eta': undefined,
                'url': undefined,
            };
        } catch (e) {
            return {
                'status': 'error',
                'updated': undefined,
                'eta': undefined,
                'url': undefined,
            };
        }
    }

    /**
     * @method
     * @name polymarket#fetchTradingFee
     * @description fetches the trading fee for a market
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @param {string} symbol unified symbol of the market to fetch the fee for
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID (required if not in market info)
     * @returns {object} a [fee structure]{@link https://docs.ccxt.com/#/?id=fee-structure}
     */
    async fetchTradingFee (symbol: string, params = {}): Promise<TradingFeeInterface> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const marketInfo = this.safeDict (market, 'info', {});
        // Get token ID from params or market
        // Use market['id'] which is the specific token ID for this outcome (YES/NO)
        // Do NOT use clobTokenIds[0] as that always picks the first outcome regardless of symbol
        let tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            tokenId = this.safeString (market, 'id');
        }
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchTradingFee() requires a token_id parameter for market ' + symbol);
        }
        // Based on get_fee_rate() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
        const response = await this.clobPublicGetFeeRate (this.extend ({ 'token_id': tokenId }, params));
        // Response format: {"fee_rate": "0.02"} or {"fee_rate_bps": 200} (basis points)
        const feeRate = this.safeString (response, 'fee_rate');
        const feeRateBps = this.safeInteger (response, 'fee_rate_bps');
        let maker: Num = undefined;
        let taker: Num = undefined;
        if (feeRate !== undefined) {
            const fee = this.parseNumber (feeRate);
            maker = fee;
            taker = fee;
        } else if (feeRateBps !== undefined) {
            // Convert basis points to percentage (200 bps = 2% = 0.02)
            const fee = this.parseNumber (feeRateBps) / 10000;
            maker = fee;
            taker = fee;
        } else {
            // Default fee from describe() if not available
            maker = this.safeNumber (this.fees['trading'], 'maker');
            taker = this.safeNumber (this.fees['trading'], 'taker');
        }
        // Ensure we have valid numbers (fallback to default if undefined)
        const makerFee: Num = maker !== undefined ? maker : this.parseNumber ('0.02');
        const takerFee: Num = taker !== undefined ? taker : this.parseNumber ('0.02');
        const result: TradingFeeInterface = {
            'info': response,
            'symbol': symbol,
            'maker': makerFee,
            'taker': takerFee,
            'percentage': true,
            'tierBased': false,
        };
        return result;
    }

    /**
     * @method
     * @name polymarket#fetchOpenInterest
     * @description retrieves the open interest of a market
     * @see https://docs.polymarket.com/api-reference/misc/get-open-interest
     * @param {string} symbol unified CCXT market symbol
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an open interest structure{@link https://docs.ccxt.com/#/?id=open-interest-structure}
     */
    async fetchOpenInterest (symbol: string, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const marketInfo = this.safeDict (market, 'info', {});
        const conditionId = this.safeString (marketInfo, 'condition_id', market['id']);
        // API expects market as array of condition IDs
        const request: Dict = {
            'market': [ conditionId ],
        };
        const response = await this.dataPublicGetOpenInterest (this.extend (request, params));
        return this.parseOpenInterest (response, market);
    }

    /**
     * @method
     * @name polymarket#parseOpenInterest
     * @description parses open interest data from the exchange response format
     * @param {object} interest open interest data from the exchange
     * @param {object} [market] the market this open interest is for
     * @returns {object} an open interest structure{@link https://docs.ccxt.com/#/?id=open-interest-structure}
     */
    parseOpenInterest (interest: Dict, market: Market = undefined) {
        // Polymarket Data API /oi response format
        // Response is an array of objects with market (condition ID) and value
        // Example response structure:
        // [
        //   {
        //     "market": "0xdd22472e552920b8438158ea7238bfadfa4f736aa4cee91a6b86c39ead110917",
        //     "value": 123
        //   }
        // ]
        const timestamp = this.milliseconds ();
        // Handle array response
        let openInterestData: Dict = {};
        if (Array.isArray (interest)) {
            // For single symbol query, get the first item
            if (interest.length > 0) {
                openInterestData = interest[0];
            }
        } else if (typeof interest === 'object' && interest !== null) {
            // Fallback: handle object response if API changes
            openInterestData = interest;
        }
        // Extract open interest value from the response
        // API returns "value" field which represents the open interest value
        const openInterestValue = this.safeNumber (openInterestData, 'value', 0);
        // For Polymarket, value is typically in USDC, so we use it as both amount and value
        // If we need to distinguish, we could parse additional fields if available
        return this.safeOpenInterest ({
            'symbol': market ? market['symbol'] : undefined,
            'openInterestAmount': openInterestValue, // Using value as amount since API only provides value
            'openInterestValue': openInterestValue,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'info': interest,
        }, market);
    }

    /**
     * @method
     * @name polymarket#fetchMyTrades
     * @description fetch all trades made by the user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @param {string} symbol unified symbol of the market to fetch trades for
     * @param {int} [since] the earliest time in ms to fetch trades for
     * @param {int} [limit] the maximum number of trades structures to retrieve
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.market] filter trades by market (condition_id)
     * @param {string} [params.asset_id] filter trades by asset ID
     * @param {string} [params.id] filter by trade id
     * @param {string} [params.maker_address] filter by maker address
     * @param {string} [params.before] pagination cursor (see API docs)
     * @param {string} [params.after] pagination cursor (see API docs)
     * @param {string} [params.next_cursor] pagination cursor (default: "MA==")
     * @returns {Trade[]} a list of [trade structures]{@link https://docs.ccxt.com/#/?id=trade-structure}
     */
    async fetchMyTrades (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        const request: Dict = {};
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
            const marketInfo = this.safeDict (market, 'info', {});
            // Filter by condition_id (market) to get all trades for this market
            // Don't automatically add asset_id filter as it would restrict to only one outcome
            const conditionId = this.safeString (marketInfo, 'condition_id', this.safeString (market, 'id'));
            if (conditionId !== undefined) {
                request['market'] = conditionId;
            }
        }
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId !== undefined) {
            request['asset_id'] = tokenId;
        }
        const marketId = this.safeString (params, 'market');
        if (marketId !== undefined) {
            request['market'] = marketId;
        }
        const assetId = this.safeString2 (params, 'asset_id', 'assetId');
        if (assetId !== undefined) {
            request['asset_id'] = assetId;
        }
        const id = this.safeString (params, 'id');
        if (id !== undefined) {
            request['id'] = id;
        }
        const makerAddress = this.safeString2 (params, 'maker_address', 'makerAddress');
        if (makerAddress !== undefined) {
            request['maker_address'] = makerAddress;
        }
        const before = this.safeString (params, 'before');
        if (before !== undefined) {
            request['before'] = before;
        }
        const after = this.safeString (params, 'after');
        if (after !== undefined) {
            request['after'] = after;
        }
        if (since !== undefined) {
            // Map ccxt since to Polymarket's "after" cursor using seconds
            request['after'] = this.numberToString (Math.floor (since / 1000));
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        let results: any[] = [];
        const initialCursor = this.safeString (this.options, 'initialCursor');
        const endCursor = this.safeString (this.options, 'endCursor');
        let next_cursor = initialCursor;
        while (next_cursor !== endCursor) {
            const response = await this.clobPrivateGetTrades (this.extend (request, { 'next_cursor': next_cursor }, params));
            next_cursor = this.safeString (response, 'next_cursor', endCursor);
            const data = this.safeList (response, 'data', []) || [];
            results = this.arrayConcat (results, data);
            if (limit !== undefined && results.length >= limit) {
                break;
            }
        }
        return this.parseTrades (results, market, since, limit);
    }

    /**
     * @method
     * @name polymarket#fetchUserTrades
     * @description fetch trades for a specific user
     * @see https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets
     * @param {string} user user address (0x-prefixed, 40 hex chars)
     * @param {string} [symbol] unified symbol of the market to fetch trades for
     * @param {int} [since] timestamp in ms of the earliest trade to fetch
     * @param {int} [limit] the maximum amount of trades to fetch (default: 100, max: 10000)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.offset] offset for pagination (default: 0, max: 10000)
     * @param {boolean} [params.takerOnly] if true, returns only trades where the user is the taker (default: true)
     * @param {string} [params.side] filter by side: 'BUY' or 'SELL'
     * @param {string[]} [params.market] comma-separated list of condition IDs (mutually exclusive with symbol)
     * @param {int[]} [params.eventId] comma-separated list of event IDs (mutually exclusive with market)
     * @returns {Trade[]} a list of [trade structures]{@link https://docs.ccxt.com/#/?id=trade-structure}
     */
    async fetchUserTrades (user: string, symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        await this.loadMarkets ();
        const request: Dict = {
            'user': user,
        };
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
            const marketInfo = this.safeDict (market, 'info', {});
            const conditionId = this.safeString (marketInfo, 'condition_id', market['id']);
            request['market'] = [ conditionId ];
        }
        const marketParam = this.safeValue (params, 'market');
        if (marketParam !== undefined) {
            // Convert to array if it's a string or single value
            if (Array.isArray (marketParam)) {
                request['market'] = marketParam;
            } else {
                request['market'] = [ marketParam ];
            }
        }
        const eventId = this.safeValue (params, 'eventId');
        if (eventId !== undefined) {
            if (Array.isArray (eventId)) {
                request['eventId'] = eventId;
            } else {
                request['eventId'] = [ eventId ];
            }
        }
        if (limit !== undefined) {
            request['limit'] = Math.min (limit, 10000); // Cap at max 10000
        }
        const offset = this.safeInteger (params, 'offset');
        if (offset !== undefined) {
            request['offset'] = offset;
        }
        const takerOnly = this.safeBool (params, 'takerOnly', true);
        request['takerOnly'] = takerOnly;
        const side = this.safeStringUpper (params, 'side');
        if (side !== undefined) {
            request['side'] = side;
        }
        const response = await this.dataPublicGetTrades (this.extend (request, this.omit (params, [ 'market', 'eventId', 'offset', 'takerOnly', 'side' ])));
        let tradesData = [];
        if (Array.isArray (response)) {
            tradesData = response;
        } else {
            const dataList = this.safeList (response, 'data', []);
            if (dataList !== undefined) {
                tradesData = dataList;
            }
        }
        return this.parseTrades (tradesData, market, since, limit);
    }

    /**
     * @method
     * @name polymarket#fetchBalance
     * @description fetches balance and allowance for the authenticated user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/clients/methods-l2#getbalanceallowance
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.asset_type] asset type: 'COLLATERAL' (default) or 'CONDITIONAL'
     * @param {string} [params.token_id] token ID, default: from options.defaultTokenId)
     * @param {int} [params.signature_type] signature type (default: from options.signatureType or options.signatureTypes.EOA).
     * @returns {object} a [balance structure]{@link https://docs.ccxt.com/#/?id=balance-structure}
     */
    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        // Default asset_type to COLLATERAL if not provided
        const assetType = this.safeString (params, 'asset_type', 'COLLATERAL');
        params['asset_type'] = assetType;
        // Use signature_type from params or fall back to options
        const signatureType = this.getSignatureType (params);
        const request: Dict = {
            'asset_type': assetType,
        };
        if (signatureType !== undefined) {
            request['signature_type'] = signatureType;
        }
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            const defaultTokenId = this.safeString (this.options, 'defaultTokenId');
            if (defaultTokenId !== undefined) {
                request['token_id'] = defaultTokenId;
            }
        } else {
            request['token_id'] = tokenId;
        }
        // Fetch balance and allowance from CLOB endpoint
        const clobResponse = await this.clobPrivateGetBalanceAllowance (request);
        //
        //     {
        //         "balance": "1000000",
        //         "allowance": "0"
        //     }
        //
        const balance = this.safeString (clobResponse, 'balance');
        const allowance = this.safeString (clobResponse, 'allowance');
        const collateral = this.safeString (this.options, 'defaultCollateral', 'USDC');
        // Convert CLOB balance and allowance (6 decimals) to standard units
        let collateralTotalValue = undefined;
        let collateralUsedValue = undefined;
        let collateralFreeValue = undefined;
        if (balance !== undefined) {
            const parsedBalance = this.parseNumber (balance);
            if (parsedBalance !== undefined) {
                collateralTotalValue = parsedBalance / 1000000;
            }
        }
        if (allowance !== undefined) {
            const parsedAllowance = this.parseNumber (allowance);
            if (parsedAllowance !== undefined) {
                collateralUsedValue = parsedAllowance / 1000000;
            }
        }
        // Calculate free balance: total - used (allowance)
        if (collateralTotalValue !== undefined && collateralUsedValue !== undefined) {
            collateralFreeValue = collateralTotalValue - collateralUsedValue;
        } else if (collateralTotalValue !== undefined) {
            collateralFreeValue = collateralTotalValue;
        }
        const result: Dict = {
            'info': clobResponse,
        };
        if (collateralTotalValue !== undefined) {
            const account = this.account ();
            account['total'] = collateralTotalValue;
            if (collateralFreeValue !== undefined) {
                account['free'] = collateralFreeValue;
            }
            if (collateralUsedValue !== undefined) {
                account['used'] = collateralUsedValue;
            }
            result[collateral] = account;
        }
        return this.safeBalance (result);
    }

    /**
     * @method
     * @name polymarket#getNotifications
     * @description fetches notifications for the authenticated user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.signature_type] signature type (default: from options.signatureType or options.signatureTypes.EOA).
     * @returns {object} response from the exchange
     */
    async getNotifications (params = {}) {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        // Use signature_type from params or fall back to options
        const signatureType = this.getSignatureType (params);
        const request: Dict = {};
        if (signatureType !== undefined) {
            request['signature_type'] = signatureType;
        }
        // Based on get_notifications() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
        const response = await this.clobPrivateGetNotifications (this.extend (request, params));
        return response;
    }

    /**
     * @method
     * @name polymarket#dropNotifications
     * @description drops notifications for the authenticated user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.notification_id] specific notification ID to drop (optional)
     * @param {int} [params.signature_type] signature type (default: from options.signatureType or options.signatureTypes.EOA).
     * @returns {object} response from the exchange
     */
    async dropNotifications (params = {}) {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        // Use signature_type from params or fall back to options
        const signatureType = this.getSignatureType (params);
        const request: Dict = {};
        if (signatureType !== undefined) {
            request['signature_type'] = signatureType;
        }
        // Based on drop_notifications() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
        const response = await this.clobPrivateDeleteNotifications (this.extend (request, params));
        return response;
    }

    /**
     * @method
     * @name polymarket#getBalanceAllowance
     * @description fetches balance and allowance for the authenticated user (alias for fetchBalance)
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/clients/methods-l2#getbalanceallowance
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.asset_type] asset type: 'COLLATERAL' (default) or 'CONDITIONAL'
     * @param {string} [params.token_id] token ID, default: from options.defaultTokenId)
     * @param {int} [params.signature_type] signature type (default: from options.signatureType or options.signatureTypes.EOA).
     * @returns {object} response from the exchange
     */
    async getBalanceAllowance (params = {}) {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        // Alias for fetchBalance, but returns raw response
        // Use signature_type from params or fall back to options
        if (this.safeInteger (params, 'signature_type') === undefined) {
            const signatureType = this.getSignatureType (params);
            if (signatureType !== undefined) {
                params['signature_type'] = signatureType;
            }
        }
        // Default asset_type to COLLATERAL if not provided (for USDC balance)
        const assetType = this.safeString (params, 'asset_type', 'COLLATERAL');
        params['asset_type'] = assetType;
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            const defaultTokenId = this.safeString (this.options, 'defaultTokenId');
            if (defaultTokenId !== undefined) {
                params['token_id'] = defaultTokenId;
            }
        } else {
            params['token_id'] = tokenId;
        }
        return await this.clobPrivateGetBalanceAllowance (params);
    }

    /**
     * @method
     * @name polymarket#updateBalanceAllowance
     * @description updates balance and allowance for the authenticated user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.signature_type] signature type (default: from options.signatureType or options.signatureTypes.EOA).
     * @returns {object} response from the exchange
     */
    async updateBalanceAllowance (params = {}) {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        // Based on update_balance_allowance() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
        // Use signature_type from params or fall back to options
        if (this.safeInteger (params, 'signature_type') === undefined) {
            const signatureType = this.getSignatureType (params);
            if (signatureType !== undefined) {
                params['signature_type'] = signatureType;
            }
        }
        const response = await this.clobPrivatePutBalanceAllowance (params);
        return response;
    }

    /**
     * @method
     * @name polymarket#isOrderScoring
     * @description checks if an order is currently scoring
     * @see https://docs.polymarket.com/developers/CLOB/orders/check-scoring#check-order-reward-scoring
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.order_id] the order ID to check (required)
     * @returns {object} response from the exchange indicating if order is scoring
     */
    async isOrderScoring (params = {}) {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        const orderId = this.safeString (params, 'order_id');
        if (orderId === undefined) {
            throw new ArgumentsRequired (this.id + ' isOrderScoring() requires an order_id parameter');
        }
        const response = await this.clobPrivateGetIsOrderScoring (params);
        // Response: { scoring: boolean }
        return response;
    }

    /**
     * @method
     * @name polymarket#areOrdersScoring
     * @description checks if multiple orders are currently scoring
     * @see https://docs.polymarket.com/developers/CLOB/orders/check-scoring#check-order-reward-scoring
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string[]} [params.order_ids] array of order IDs to check (required)
     * @returns {object} response from the exchange indicating which orders are scoring
     */
    async areOrdersScoring (params = {}) {
        await this.loadMarkets ();
        // Ensure API credentials are generated (lazy generation)
        await this.ensureApiCredentials (params);
        const orderIds = this.safeValue2 (params, 'order_ids', 'orderIds');
        if (orderIds === undefined || !Array.isArray (orderIds)) {
            throw new ArgumentsRequired (this.id + ' areOrdersScoring() requires an order_ids parameter (array of order IDs)');
        }
        const response = await this.clobPrivatePostAreOrdersScoring (this.extend ({ 'orderIds': orderIds }, params));
        // Response: { orderId: boolean, ... }
        return response;
    }

    /**
     * @method
     * @name polymarket#clobPublicGetMarkets
     * @description fetches markets from CLOB API (matches clob-client getMarkets())
     * @see https://github.com/Polymarket/clob-client/blob/main/src/client.ts
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.next_cursor] pagination cursor (default: options.initialCursor)
     * @returns {object} response from the exchange
     */
    async clobPublicGetMarkets (params = {}) {
        // Pass api as array ['clob', 'public'] to match the expected format
        // The api parameter should be an array [api_type, access_level] for exchanges with multiple API types
        return await this.request ('markets', [ 'clob', 'public' ], 'GET', this.extend ({ 'api_type': 'clob' }, params));
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetMarkets
     * @description fetches markets from Gamma API
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} response from the exchange
     */
    async gammaPublicGetMarkets (params = {}) {
        // Pass api as array ['gamma', 'public'] to match the expected format
        // The api parameter should be an array [api_type, access_level] for exchanges with multiple API types
        return await this.request ('markets', [ 'gamma', 'public' ], 'GET', this.extend ({ 'api_type': 'gamma' }, params));
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetMarketsId
     * @description fetches a specific market by ID from Gamma API
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} response from the exchange
     */
    async gammaPublicGetMarketsId (params = {}) {
        const id = this.safeString (params, 'id');
        if (id === undefined) {
            throw new ArgumentsRequired (this.id + ' gammaPublicGetMarketsId() requires an id parameter');
        }
        const path = 'markets/' + this.encodeURIComponent (id);
        const remainingParams = this.extend ({ 'api_type': 'gamma' }, this.omit (params, 'id'));
        return await this.request (path, [ 'gamma', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetMarketsIdTags
     * @description fetches tags for a specific market by ID from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.id] the market ID (required)
     * @returns {object} response from the exchange
     */
    async gammaPublicGetMarketsIdTags (params = {}) {
        const id = this.safeString (params, 'id');
        if (id === undefined) {
            throw new ArgumentsRequired (this.id + ' gammaPublicGetMarketsIdTags() requires an id parameter');
        }
        const path = 'markets/' + this.encodeURIComponent (id) + '/tags';
        const remainingParams = this.extend ({ 'api_type': 'gamma' }, this.omit (params, 'id'));
        return await this.request (path, [ 'gamma', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetMarketsSlugSlug
     * @description fetches a specific market by slug from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.slug] the market slug (required)
     * @returns {object} response from the exchange
     */
    async gammaPublicGetMarketsSlugSlug (params = {}) {
        const slug = this.safeString (params, 'slug');
        if (slug === undefined) {
            throw new ArgumentsRequired (this.id + ' gammaPublicGetMarketsSlugSlug() requires a slug parameter');
        }
        const path = 'markets/slug/' + this.encodeURIComponent (slug);
        const remainingParams = this.extend ({ 'api_type': 'gamma' }, this.omit (params, 'slug'));
        return await this.request (path, [ 'gamma', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetEvents
     * @description fetches events from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.limit] maximum number of results to return
     * @param {int} [params.offset] offset for pagination
     * @param {string} [params.category] filter by category
     * @param {string} [params.slug] filter by slug
     * @returns {object} response from the exchange
     */
    async gammaPublicGetEvents (params = {}) {
        return await this.request ('events', [ 'gamma', 'public' ], 'GET', this.extend ({ 'api_type': 'gamma' }, params));
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetEventsId
     * @description fetches a specific event by ID from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.id] the event ID (required)
     * @returns {object} response from the exchange
     */
    async gammaPublicGetEventsId (params = {}) {
        const id = this.safeString (params, 'id');
        if (id === undefined) {
            throw new ArgumentsRequired (this.id + ' gammaPublicGetEventsId() requires an id parameter');
        }
        const path = 'events/' + this.encodeURIComponent (id);
        const remainingParams = this.extend ({ 'api_type': 'gamma' }, this.omit (params, 'id'));
        return await this.request (path, [ 'gamma', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetSeries
     * @description fetches series from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.limit] maximum number of results to return
     * @param {int} [params.offset] offset for pagination
     * @param {string} [params.category] filter by category
     * @param {string} [params.slug] filter by slug
     * @returns {object} response from the exchange
     */
    async gammaPublicGetSeries (params = {}) {
        return await this.request ('series', [ 'gamma', 'public' ], 'GET', this.extend ({ 'api_type': 'gamma' }, params));
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetSeriesId
     * @description fetches a specific series by ID from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.id] the series ID (required)
     * @returns {object} response from the exchange
     */
    async gammaPublicGetSeriesId (params = {}) {
        const id = this.safeString (params, 'id');
        if (id === undefined) {
            throw new ArgumentsRequired (this.id + ' gammaPublicGetSeriesId() requires an id parameter');
        }
        const path = 'series/' + this.encodeURIComponent (id);
        const remainingParams = this.extend ({ 'api_type': 'gamma' }, this.omit (params, 'id'));
        return await this.request (path, [ 'gamma', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetSearch
     * @description performs a full-text search across events, tags, and user profiles from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.q] search query (required)
     * @param {string} [params.type] filter by type: 'event', 'tag', 'user', etc.
     * @param {int} [params.limit] maximum number of results to return
     * @param {int} [params.offset] offset for pagination
     * @returns {object} response from the exchange
     */
    async gammaPublicGetSearch (params = {}) {
        const q = this.safeString (params, 'q');
        if (q === undefined) {
            throw new ArgumentsRequired (this.id + ' gammaPublicGetSearch() requires a q (query) parameter');
        }
        return await this.request ('search', [ 'gamma', 'public' ], 'GET', this.extend ({ 'api_type': 'gamma' }, params));
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetComments
     * @description fetches comments from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.event_id] filter by event ID
     * @param {string} [params.series_id] filter by series ID
     * @param {int} [params.limit] maximum number of results to return
     * @param {int} [params.offset] offset for pagination
     * @returns {object} response from the exchange
     */
    async gammaPublicGetComments (params = {}) {
        return await this.request ('comments', [ 'gamma', 'public' ], 'GET', this.extend ({ 'api_type': 'gamma' }, params));
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetCommentsId
     * @description fetches a specific comment by ID from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.id] the comment ID (required)
     * @returns {object} response from the exchange
     */
    async gammaPublicGetCommentsId (params = {}) {
        const id = this.safeString (params, 'id');
        if (id === undefined) {
            throw new ArgumentsRequired (this.id + ' gammaPublicGetCommentsId() requires an id parameter');
        }
        const path = 'comments/' + this.encodeURIComponent (id);
        const remainingParams = this.extend ({ 'api_type': 'gamma' }, this.omit (params, 'id'));
        return await this.request (path, [ 'gamma', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetSports
     * @description fetches sports data from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.league] filter by league
     * @param {string} [params.team] filter by team
     * @param {int} [params.limit] maximum number of results to return
     * @param {int} [params.offset] offset for pagination
     * @returns {object} response from the exchange
     */
    async gammaPublicGetSports (params = {}) {
        return await this.request ('sports', [ 'gamma', 'public' ], 'GET', this.extend ({ 'api_type': 'gamma' }, params));
    }

    /**
     * @method
     * @name polymarket#gammaPublicGetSportsId
     * @description fetches a specific sport/team by ID from Gamma API
     * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.id] the sport/team ID (required)
     * @returns {object} response from the exchange
     */
    async gammaPublicGetSportsId (params = {}) {
        const id = this.safeString (params, 'id');
        if (id === undefined) {
            throw new ArgumentsRequired (this.id + ' gammaPublicGetSportsId() requires an id parameter');
        }
        const path = 'sports/' + this.encodeURIComponent (id);
        const remainingParams = this.extend ({ 'api_type': 'gamma' }, this.omit (params, 'id'));
        return await this.request (path, [ 'gamma', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#dataPublicGetPositions
     * @description fetches current positions for a user from Data-API
     * @see https://docs.polymarket.com/api-reference/core/get-current-positions-for-a-user
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.user] user address (required)
     * @param {string[]} [params.market] comma-separated list of condition IDs (mutually exclusive with eventId)
     * @param {int[]} [params.eventId] comma-separated list of event IDs (mutually exclusive with market)
     * @param {number} [params.sizeThreshold] minimum size threshold (default: 1)
     * @param {boolean} [params.redeemable] filter by redeemable positions (default: false)
     * @param {boolean} [params.mergeable] filter by mergeable positions (default: false)
     * @param {int} [params.limit] maximum number of results (default: 100, max: 500)
     * @param {int} [params.offset] offset for pagination (default: 0, max: 10000)
     * @param {string} [params.sortBy] sort field: CURRENT, INITIAL, TOKENS, CASHPNL, PERCENTPNL, TITLE, RESOLVING, PRICE, AVGPRICE (default: TOKENS)
     * @param {string} [params.sortDirection] sort direction: ASC, DESC (default: DESC)
     * @param {string} [params.title] filter by title (max length: 100)
     * @returns {object} response from the exchange
     */
    async dataPublicGetPositions (params = {}) {
        const user = this.safeString (params, 'user');
        if (user === undefined) {
            throw new ArgumentsRequired (this.id + ' dataPublicGetPositions() requires a user parameter');
        }
        return await this.request ('positions', [ 'data', 'public' ], 'GET', this.extend ({ 'api_type': 'data' }, params));
    }

    /**
     * @method
     * @name polymarket#dataPublicGetTrades
     * @description fetches trades for a user or markets from Data-API
     * @see https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.user] user address (optional, filter by user)
     * @param {string[]} [params.market] comma-separated list of condition IDs (optional, filter by markets)
     * @param {int} [params.limit] maximum number of results
     * @param {int} [params.offset] offset for pagination
     * @returns {object} response from the exchange
     */
    async dataPublicGetTrades (params = {}) {
        return await this.request ('trades', [ 'data', 'public' ], 'GET', this.extend ({ 'api_type': 'data' }, params));
    }

    /**
     * @method
     * @name polymarket#dataPublicGetActivity
     * @description fetches user activity from Data-API
     * @see https://docs.polymarket.com/api-reference/core/get-user-activity
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.user] user address (required)
     * @param {int} [params.limit] maximum number of results
     * @param {int} [params.offset] offset for pagination
     * @returns {object} response from the exchange
     */
    async dataPublicGetActivity (params = {}) {
        const user = this.safeString (params, 'user');
        if (user === undefined) {
            throw new ArgumentsRequired (this.id + ' dataPublicGetActivity() requires a user parameter');
        }
        return await this.request ('activity', [ 'data', 'public' ], 'GET', this.extend ({ 'api_type': 'data' }, params));
    }

    /**
     * @method
     * @name polymarket#dataPublicGetHolders
     * @description fetches top holders for markets from Data-API
     * @see https://docs.polymarket.com/api-reference/core/get-top-holders-for-markets
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string[]} [params.market] comma-separated list of condition IDs (required)
     * @param {int} [params.limit] maximum number of results
     * @param {int} [params.offset] offset for pagination
     * @returns {object} response from the exchange
     */
    async dataPublicGetHolders (params = {}) {
        const market = this.safeString (params, 'market');
        if (market === undefined) {
            throw new ArgumentsRequired (this.id + ' dataPublicGetHolders() requires a market parameter');
        }
        return await this.request ('holders', [ 'data', 'public' ], 'GET', this.extend ({ 'api_type': 'data' }, params));
    }

    /**
     * @method
     * @name polymarket#dataPublicGetTotalValue
     * @description fetches total value of a user's positions from Data-API
     * @see https://docs.polymarket.com/api-reference/core/get-total-value-of-a-users-positions
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.user] user address (required)
     * @returns {object} response from the exchange
     */
    async dataPublicGetTotalValue (params = {}) {
        const user = this.safeString (params, 'user');
        if (user === undefined) {
            throw new ArgumentsRequired (this.id + ' dataPublicGetTotalValue() requires a user parameter');
        }
        return await this.request ('value', [ 'data', 'public' ], 'GET', this.extend ({ 'api_type': 'data' }, params));
    }

    /**
     * @method
     * @name polymarket#dataPublicGetClosedPositions
     * @description fetches closed positions for a user from Data-API
     * @see https://docs.polymarket.com/api-reference/core/get-closed-positions-for-a-user
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.user] user address (required)
     * @param {string[]} [params.market] comma-separated list of condition IDs (mutually exclusive with eventId)
     * @param {int[]} [params.eventId] comma-separated list of event IDs (mutually exclusive with market)
     * @param {int} [params.limit] maximum number of results
     * @param {int} [params.offset] offset for pagination
     * @param {string} [params.sortBy] sort field
     * @param {string} [params.sortDirection] sort direction: ASC, DESC
     * @returns {object} response from the exchange
     */
    async dataPublicGetClosedPositions (params = {}) {
        const user = this.safeString (params, 'user');
        if (user === undefined) {
            throw new ArgumentsRequired (this.id + ' dataPublicGetClosedPositions() requires a user parameter');
        }
        return await this.request ('closed-positions', [ 'data', 'public' ], 'GET', this.extend ({ 'api_type': 'data' }, params));
    }

    /**
     * @method
     * @name polymarket#dataPublicGetTraded
     * @description fetches total markets a user has traded from Data-API
     * @see https://docs.polymarket.com/api-reference/misc/get-total-markets-a-user-has-traded
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.user] user address (required)
     * @returns {object} response from the exchange
     */
    async dataPublicGetTraded (params = {}) {
        const user = this.safeString (params, 'user');
        if (user === undefined) {
            throw new ArgumentsRequired (this.id + ' dataPublicGetTraded() requires a user parameter');
        }
        return await this.request ('traded', [ 'data', 'public' ], 'GET', this.extend ({ 'api_type': 'data' }, params));
    }

    /**
     * @method
     * @name polymarket#dataPublicGetOpenInterest
     * @description fetches open interest from Data-API
     * @see https://docs.polymarket.com/api-reference/misc/get-open-interest
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string[]} [params.market] array of condition IDs (required)
     * @returns {object} response from the exchange
     */
    async dataPublicGetOpenInterest (params = {}) {
        const market = this.safeValue (params, 'market');
        if (market === undefined) {
            throw new ArgumentsRequired (this.id + ' dataPublicGetOpenInterest() requires a market parameter');
        }
        // Convert market to array if it's a single string
        let marketArray: string[] = [];
        if (Array.isArray (market)) {
            marketArray = market;
        } else if (typeof market === 'string') {
            marketArray = [ market ];
        } else {
            throw new ArgumentsRequired (this.id + ' dataPublicGetOpenInterest() requires market to be a string or array of condition IDs');
        }
        // API expects market as array in query params
        const requestParams = this.extend ({ 'market': marketArray }, this.omit (params, 'market'));
        return await this.request ('oi', [ 'data', 'public' ], 'GET', this.extend ({ 'api_type': 'data' }, requestParams));
    }

    /**
     * @method
     * @name polymarket#dataPublicGetLiveVolume
     * @description fetches live volume for an event from Data-API
     * @see https://docs.polymarket.com/api-reference/misc/get-live-volume-for-an-event
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.eventId] event ID (required)
     * @returns {object} response from the exchange
     */
    async dataPublicGetLiveVolume (params = {}) {
        const eventId = this.safeInteger (params, 'eventId');
        if (eventId === undefined) {
            throw new ArgumentsRequired (this.id + ' dataPublicGetLiveVolume() requires an eventId parameter');
        }
        return await this.request ('live-volume', [ 'data', 'public' ], 'GET', this.extend ({ 'api_type': 'data' }, params));
    }

    /**
     * @method
     * @name polymarket#bridgePublicGetSupportedAssets
     * @description fetches supported assets for bridging from Bridge API
     * @see https://docs.polymarket.com/developers/misc-endpoints/bridge-supported-assets
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} response from the exchange
     */
    async bridgePublicGetSupportedAssets (params = {}) {
        return await this.request ('supported-assets', [ 'bridge', 'public' ], 'GET', this.extend ({ 'api_type': 'bridge' }, params));
    }

    /**
     * @method
     * @name polymarket#bridgePublicPostDeposit
     * @description creates deposit addresses for bridging assets to Polymarket
     * @see https://docs.polymarket.com/developers/misc-endpoints/bridge-deposit
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.address] Polymarket wallet address (required)
     * @returns {object} response from the exchange
     */
    async bridgePublicPostDeposit (params = {}) {
        const address = this.safeString (params, 'address');
        if (address === undefined) {
            throw new ArgumentsRequired (this.id + ' bridgePublicPostDeposit() requires an address parameter');
        }
        const body = this.json ({ 'address': address });
        const remainingParams = this.extend ({ 'api_type': 'bridge' }, this.omit (params, 'address'));
        return await this.request ('deposit', [ 'bridge', 'public' ], 'POST', remainingParams, undefined, body);
    }

    /**
     * @method
     * @name polymarket#createDepositAddress
     * @description create a deposit address for bridging assets to Polymarket
     * @see https://docs.polymarket.com/developers/misc-endpoints/bridge-deposit
     * @param {string} code unified currency code
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.address] Polymarket wallet address (required if not set in options)
     * @returns {object} an [address structure]{@link https://docs.ccxt.com/#/?id=address-structure}
     */
    async createDepositAddress (code: string, params = {}) {
        // Get address from params or use default from options
        let address = this.safeString (params, 'address');
        if (address === undefined) {
            // Try to get from options or throw error
            address = this.safeString (this.options, 'address');
            if (address === undefined) {
                throw new ArgumentsRequired (this.id + ' createDepositAddress() requires an address parameter or address in options');
            }
        }
        const response = await this.bridgePublicPostDeposit (this.extend ({ 'address': address }, params));
        // Response format: {address: "...", depositAddresses: [{chainId, chainName, tokenAddress, tokenSymbol, depositAddress}, ...]}
        const depositAddresses = this.safeList (response, 'depositAddresses', []);
        // Find the deposit address for the requested currency code
        // For Polymarket, all deposits are converted to USDC.e, but we can filter by tokenSymbol
        const currency = this.currency (code);
        let depositAddress = undefined;
        for (let i = 0; i < depositAddresses.length; i++) {
            const addr = depositAddresses[i];
            const tokenSymbol = this.safeString (addr, 'tokenSymbol');
            if (tokenSymbol && tokenSymbol.toUpperCase () === currency['code'].toUpperCase ()) {
                depositAddress = this.safeString (addr, 'depositAddress');
                break;
            }
        }
        // If not found, return the first deposit address (default to USDC)
        if (depositAddress === undefined && depositAddresses.length > 0) {
            depositAddress = this.safeString (depositAddresses[0], 'depositAddress');
        }
        return {
            'currency': code,
            'address': depositAddress,
            'tag': undefined,
            'info': response,
        };
    }

    /**
     * @method
     * @name polymarket#clobPublicGetOrderbookTokenId
     * @description fetches orderbook for a specific token ID from CLOB API
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} response from the exchange
     */
    async clobPublicGetOrderbookTokenId (params = {}) {
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetOrderbookTokenId() requires a token_id parameter');
        }
        // Note: CLOB API uses /book endpoint with token_id as query parameter, not /orderbook/{token_id}
        // See https://docs.polymarket.com/developers/CLOB/prices-books/get-book
        const remainingParams = this.extend ({ 'api_type': 'clob' }, params);
        return await this.request ('book', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicPostBooks
     * @description fetches order books for multiple token IDs from CLOB API
     * @see https://docs.polymarket.com/api-reference/orderbook/get-multiple-order-books-summaries-by-request
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {Array} [params.requests] array of {token_id, limit?} objects (required)
     * @returns {object} response from the exchange
     */
    async clobPublicPostBooks (params = {}) {
        const requests = this.safeValue (params, 'requests');
        if (requests === undefined || !Array.isArray (requests) || requests.length === 0) {
            throw new ArgumentsRequired (this.id + ' clobPublicPostBooks() requires a requests parameter (array of {token_id, limit?} objects)');
        }
        // Note: REST API endpoint format: POST /books with JSON body
        // See https://docs.polymarket.com/api-reference/orderbook/get-multiple-order-books-summaries-by-request
        // Request body: [{token_id: "..."}, {token_id: "...", limit: 10}, ...]
        // Response format: array of order book objects, each with asset_id, bids, asks, etc.
        const body = this.json (requests);
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, 'requests'));
        return await this.request ('books', [ 'clob', 'public' ], 'POST', remainingParams, undefined, body);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetMarketTradesEvents
     * @description fetches market trade events for a specific condition ID from CLOB API
     * @see https://docs.polymarket.com/developers/CLOB/clients/methods-public#getmarkettradesevents
     * @see https://docs.polymarket.com/developers/CLOB/trades/trades-data-api
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.condition_id] the condition ID (market ID) for the market
     * @param {int} [params.limit] the maximum number of trades to fetch (default: 100, max: 500)
     * @param {int} [params.offset] number of trades to skip before starting to return results (default: 0)
     * @param {boolean} [params.takerOnly] if true, returns only trades where the user is the taker (default: true)
     * @param {string} [params.side] filter by side: 'BUY' or 'SELL'
     * @returns {object} response from the exchange
     */
    async clobPublicGetMarketTradesEvents (params = {}) {
        const conditionId = this.safeString (params, 'condition_id');
        if (conditionId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetMarketTradesEvents() requires a condition_id parameter');
        }
        // Note: CLOB REST API endpoint format: /trades?market={condition_id}
        // See https://docs.polymarket.com/developers/CLOB/trades/trades-data-api
        // The client SDK method getMarketTradesEvents() uses a different endpoint, but the REST API uses /trades
        const request: Dict = {
            'market': conditionId,
        };
        const remainingParams = this.omit (params, 'condition_id');
        // Add optional parameters
        const limit = this.safeInteger (remainingParams, 'limit');
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const offset = this.safeInteger (remainingParams, 'offset');
        if (offset !== undefined) {
            request['offset'] = offset;
        }
        const takerOnly = this.safeBool (remainingParams, 'takerOnly');
        if (takerOnly !== undefined) {
            request['takerOnly'] = takerOnly;
        }
        const side = this.safeString (remainingParams, 'side');
        if (side !== undefined) {
            request['side'] = side;
        }
        // Add any other remaining params
        const finalParams = this.extend ({ 'api_type': 'clob' }, this.extend (request, this.omit (remainingParams, [ 'limit', 'offset', 'takerOnly', 'side' ])));
        return await this.request ('trades', [ 'clob', 'public' ], 'GET', finalParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetPricesHistory
     * @description fetches historical price data for a token from CLOB API
     * @see https://docs.polymarket.com/developers/CLOB/clients/methods-public#getpriceshistory
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.market] the token ID (market parameter)
     * @param {string} [params.interval] the time interval: "max", "1w", "1d", "6h", "1h"
     * @param {int} [params.startTs] timestamp in seconds of the earliest candle to fetch
     * @param {int} [params.endTs] timestamp in seconds of the latest candle to fetch
     * @param {number} [params.fidelity] data fidelity/quality
     * @returns {object} response from the exchange
     */
    async clobPublicGetPricesHistory (params = {}) {
        const market = this.safeString (params, 'market');
        if (market === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetPricesHistory() requires a market (token_id) parameter');
        }
        // Note: REST API endpoint format: /prices-history
        // See https://docs.polymarket.com/developers/CLOB/timeseries
        // Required: market
        // Time component (mutually exclusive): either (startTs and endTs) OR interval
        // Optional: fidelity
        // Response format: {"history": [{"t": timestamp, "p": price}, ...]}
        const request: Dict = {
            'market': market,
        };
        // Add time component - either startTs/endTs OR interval (mutually exclusive)
        const startTs = this.safeInteger (params, 'startTs');
        const endTs = this.safeInteger (params, 'endTs');
        const interval = this.safeString (params, 'interval');
        if (startTs !== undefined || endTs !== undefined) {
            // Use startTs/endTs when provided
            if (startTs !== undefined) {
                request['startTs'] = startTs;
            }
            if (endTs !== undefined) {
                request['endTs'] = endTs;
            }
        } else if (interval !== undefined) {
            // Use interval when startTs/endTs are not provided
            request['interval'] = interval;
        }
        // Add optional fidelity parameter
        const fidelity = this.safeNumber (params, 'fidelity');
        if (fidelity !== undefined) {
            let finalFidelity = fidelity;
            // Polymarket enforces minimum fidelity per interval (e.g. interval=1m requires fidelity>=10)
            const intervalForFidelity = this.safeString (request, 'interval');
            if (intervalForFidelity === '1m') {
                finalFidelity = Math.max (10, finalFidelity);
            }
            request['fidelity'] = finalFidelity;
        }
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.extend (request, this.omit (params, [ 'market', 'startTs', 'endTs', 'fidelity', 'interval' ])));
        return await this.request ('prices-history', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetTime
     * @description fetches the current server timestamp from CLOB API
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py#L178
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} response from the exchange
     */
    async clobPublicGetTime (params = {}) {
        // Based on get_server_time() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (TIME = "/time")
        return await this.request ('time', [ 'clob', 'public' ], 'GET', this.extend ({ 'api_type': 'clob' }, params));
    }

    /**
     * @method
     * @name polymarket#clobPublicGetOk
     * @description health check endpoint to confirm server is up
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py#L170
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} response from the exchange
     */
    async clobPublicGetOk (params = {}) {
        // Based on get_ok() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py#L170
        return await this.request ('', [ 'clob', 'public' ], 'GET', this.extend ({ 'api_type': 'clob' }, params));
    }

    /**
     * @method
     * @name polymarket#clobPublicGetFeeRate
     * @description fetches the fee rate for a token from CLOB API
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID (required)
     * @returns {object} response from the exchange
     */
    async clobPublicGetFeeRate (params = {}) {
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetFeeRate() requires a token_id parameter');
        }
        // Based on get_fee_rate() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (GET_FEE_RATE = "/fee-rate")
        const remainingParams = this.extend ({ 'api_type': 'clob' }, params);
        return await this.request ('fee-rate', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetPrice
     * @description fetches the market price for a specific token and side from CLOB API
     * @see https://docs.polymarket.com/api-reference/pricing/get-market-price
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID (required)
     * @param {string} [params.side] the side: 'BUY' or 'SELL' (required)
     * @returns {object} response from the exchange
     */
    async clobPublicGetPrice (params = {}) {
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetPrice() requires a token_id parameter');
        }
        const side = this.safeString (params, 'side');
        if (side === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetPrice() requires a side parameter (BUY or SELL)');
        }
        // Note: REST API endpoint format: /price?token_id={token_id}&side={side}
        // See https://docs.polymarket.com/api-reference/pricing/get-market-price
        const remainingParams = this.extend ({ 'api_type': 'clob' }, params);
        return await this.request ('price', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetPrices
     * @description fetches market prices for multiple tokens from CLOB API
     * @see https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string[]} [params.token_ids] array of token IDs to fetch prices for
     * @param {string} [params.side] the side: 'BUY' or 'SELL' (required if token_ids provided)
     * @returns {object} response from the exchange
     */
    async clobPublicGetPrices (params = {}) {
        // Note: REST API endpoint format: /prices?token_id={token_id1,token_id2,...}
        // See https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices
        // Response format: {[token_id]: {BUY: "price", SELL: "price"}, ...}
        // The endpoint returns both BUY and SELL prices for each token_id
        const remainingParams = this.extend ({ 'api_type': 'clob' }, params);
        return await this.request ('prices', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicPostPrices
     * @description fetches market prices for specified tokens and sides via POST request
     * @see https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices-by-request
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {Array} [params.requests] array of {token_id, side} objects (required)
     * @returns {object} response from the exchange
     */
    async clobPublicPostPrices (params = {}) {
        const requests = this.safeValue (params, 'requests');
        if (requests === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicPostPrices() requires a requests parameter (array of {token_id, side} objects)');
        }
        // Note: REST API endpoint format: POST /prices with JSON body
        // See https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices-by-request
        // Body format: [{"token_id": "1234567890", "side": "BUY"}, {"token_id": "1234567890", "side": "SELL"}]
        // Response format: {[token_id]: {BUY: "price", SELL: "price"}, ...}
        const body = this.json (requests);
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, 'requests'));
        return await this.request ('prices', [ 'clob', 'public' ], 'POST', remainingParams, undefined, body);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetMidpoint
     * @description fetches the midpoint price for a specific token from CLOB API
     * @see https://docs.polymarket.com/api-reference/pricing/get-midpoint-price
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID (required)
     * @returns {object} response from the exchange
     */
    async clobPublicGetMidpoint (params = {}) {
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetMidpoint() requires a token_id parameter');
        }
        // Note: REST API endpoint format: /midpoint?token_id={token_id}
        // See https://docs.polymarket.com/api-reference/pricing/get-midpoint-price
        const remainingParams = this.extend ({ 'api_type': 'clob' }, params);
        return await this.request ('midpoint', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetMidpoints
     * @description fetches midpoint prices for multiple tokens from CLOB API
     * @see https://docs.polymarket.com/api-reference/pricing/get-midpoint-prices
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string[]} [params.token_ids] array of token IDs to fetch midpoints for (required)
     * @returns {object} response from the exchange
     */
    async clobPublicGetMidpoints (params = {}) {
        const tokenIds = this.safeValue (params, 'token_ids');
        if (tokenIds === undefined || !Array.isArray (tokenIds) || tokenIds.length === 0) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetMidpoints() requires a token_ids parameter (array of token IDs)');
        }
        // Note: REST API endpoint format: POST /midpoints with JSON body
        // See https://docs.polymarket.com/api-reference/pricing/get-midpoint-prices
        // Request body: [{token_id: "..."}, {token_id: "..."}, ...]
        // Response format: {[token_id]: "midpoint", ...}
        const body: any[] = [];
        for (let i = 0; i < tokenIds.length; i++) {
            body.push ({ 'token_id': tokenIds[i] });
        }
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, 'token_ids'));
        return await this.request ('midpoints', [ 'clob', 'public' ], 'POST', remainingParams, undefined, this.json (body));
    }

    /**
     * @method
     * @name polymarket#clobPublicGetSpread
     * @description fetches the bid-ask spread for a specific token from CLOB API
     * @see https://docs.polymarket.com/api-reference/spreads/get-bid-ask-spread
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID (required)
     * @returns {object} response from the exchange
     */
    async clobPublicGetSpread (params = {}) {
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetSpread() requires a token_id parameter');
        }
        // Note: REST API endpoint format: /spread?token_id={token_id}
        // See https://docs.polymarket.com/api-reference/spreads/get-bid-ask-spread
        const remainingParams = this.extend ({ 'api_type': 'clob' }, params);
        return await this.request ('spread', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetLastTradePrice
     * @description fetches the last trade price for a specific token from CLOB API
     * @see https://docs.polymarket.com/api-reference/trades/get-last-trade-price
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID (required)
     * @returns {object} response from the exchange
     */
    async clobPublicGetLastTradePrice (params = {}) {
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetLastTradePrice() requires a token_id parameter');
        }
        // Note: REST API endpoint format: /last-trade-price?token_id={token_id}
        // See https://docs.polymarket.com/api-reference/trades/get-last-trade-price
        const remainingParams = this.extend ({ 'api_type': 'clob' }, params);
        return await this.request ('last-trade-price', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetLastTradesPrices
     * @description fetches last trade prices for multiple tokens from CLOB API
     * @see https://docs.polymarket.com/api-reference/trades/get-last-trades-prices
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string[]} [params.token_ids] array of token IDs to fetch last trade prices for (required)
     * @returns {object} response from the exchange
     */
    async clobPublicGetLastTradesPrices (params = {}) {
        const tokenIds = this.safeValue (params, 'token_ids');
        if (tokenIds === undefined || !Array.isArray (tokenIds) || tokenIds.length === 0) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetLastTradesPrices() requires a token_ids parameter (array of token IDs)');
        }
        // Note: REST API endpoint format: POST /last-trades-prices with JSON body
        // See https://docs.polymarket.com/api-reference/trades/get-last-trades-prices
        // Request body: [{token_id: "..."}, {token_id: "..."}, ...]
        // Response format: {[token_id]: "price", ...}
        const body: any[] = [];
        for (let i = 0; i < tokenIds.length; i++) {
            body.push ({ 'token_id': tokenIds[i] });
        }
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, 'token_ids'));
        return await this.request ('last-trades-prices', [ 'clob', 'public' ], 'POST', remainingParams, undefined, this.json (body));
    }

    /**
     * @method
     * @name polymarket#clobPublicGetTrades
     * @description fetches trades for a specific market from CLOB API
     * @see https://docs.polymarket.com/developers/CLOB/clients/methods-public#trades
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.market] the token ID or condition ID (required)
     * @param {int} [params.limit] maximum number of trades to return (default: 100, max: 500)
     * @param {string} [params.side] filter by side: 'BUY' or 'SELL'
     * @param {int} [params.start_timestamp] start timestamp in seconds
     * @param {int} [params.end_timestamp] end timestamp in seconds
     * @returns {object} response from the exchange
     */
    async clobPublicGetTrades (params = {}) {
        const market = this.safeString (params, 'market');
        if (market === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetTrades() requires a market (token_id or condition_id) parameter');
        }
        // Note: REST API endpoint format: /trades?market={token_id}
        // See https://docs.polymarket.com/developers/CLOB/clients/methods-public#trades
        const request: Dict = {
            'market': market,
        };
        const limit = this.safeInteger (params, 'limit');
        if (limit !== undefined) {
            request['limit'] = Math.min (limit, 500); // Cap at 500
        }
        const side = this.safeString (params, 'side');
        if (side !== undefined) {
            request['side'] = side;
        }
        const startTimestamp = this.safeInteger (params, 'start_timestamp');
        if (startTimestamp !== undefined) {
            request['start_timestamp'] = startTimestamp;
        }
        const endTimestamp = this.safeInteger (params, 'end_timestamp');
        if (endTimestamp !== undefined) {
            request['end_timestamp'] = endTimestamp;
        }
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.extend (request, this.omit (params, [ 'market', 'limit', 'side', 'start_timestamp', 'end_timestamp' ])));
        return await this.request ('trades', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetTickSize
     * @description fetches the tick size for a token from CLOB API
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID (required)
     * @returns {object} response from the exchange
     */
    async clobPublicGetTickSize (params = {}) {
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetTickSize() requires a token_id parameter');
        }
        // Based on get_tick_size() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (GET_TICK_SIZE = "/tick-size")
        const remainingParams = this.extend ({ 'api_type': 'clob' }, params);
        return await this.request ('tick-size', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicGetNegRisk
     * @description fetches the negative risk flag for a token from CLOB API
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] the token ID (required)
     * @returns {object} response from the exchange
     */
    async clobPublicGetNegRisk (params = {}) {
        const tokenId = this.safeString (params, 'token_id');
        if (tokenId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPublicGetNegRisk() requires a token_id parameter');
        }
        // Based on get_neg_risk() from py-clob-client
        // See https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (GET_NEG_RISK = "/neg-risk")
        const remainingParams = this.extend ({ 'api_type': 'clob' }, params);
        return await this.request ('neg-risk', [ 'clob', 'public' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPublicPostSpreads
     * @description fetches bid-ask spreads for multiple tokens from CLOB API
     * @see https://docs.polymarket.com/api-reference/spreads/get-bid-ask-spreads
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string[]} [params.token_ids] array of token IDs to fetch spreads for (required)
     * @returns {object} response from the exchange
     */
    async clobPublicPostSpreads (params = {}) {
        const tokenIds = this.safeValue (params, 'token_ids');
        if (tokenIds === undefined || !Array.isArray (tokenIds) || tokenIds.length === 0) {
            throw new ArgumentsRequired (this.id + ' clobPublicPostSpreads() requires a token_ids parameter (array of token IDs)');
        }
        // Note: REST API endpoint format: POST /spreads
        // See https://docs.polymarket.com/api-reference/spreads/get-bid-ask-spreads
        // Request body: [{token_id: "..."}, {token_id: "..."}, ...]
        // Response format: {[token_id]: "spread", ...}
        const body: any[] = [];
        for (let i = 0; i < tokenIds.length; i++) {
            body.push ({ 'token_id': tokenIds[i] });
        }
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, 'token_ids'));
        return await this.request ('spreads', [ 'clob', 'public' ], 'POST', remainingParams, undefined, this.json (body));
    }

    /**
     * @method
     * @name polymarket#clobPrivateGetOrder
     * @description fetches a specific order by order ID
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (GET_ORDER = "/data/order/")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.order_id] the order ID (required)
     * @returns {object} response from the exchange
     */
    async clobPrivateGetOrder (params = {}) {
        const orderId = this.safeString (params, 'order_id');
        if (orderId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPrivateGetOrder() requires an order_id parameter');
        }
        const path = 'data/order/' + this.encodeURIComponent (orderId);
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, 'order_id'));
        return await this.request (path, [ 'clob', 'private' ], 'GET', remainingParams);
    }

    /**
     * @method
     * @name polymarket#clobPrivateGetOrders
     * @description fetches orders for the authenticated user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (ORDERS = "/data/orders")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] filter orders by token ID
     * @param {string} [params.status] filter orders by status (OPEN, FILLED, CANCELLED, etc.)
     * @returns {object} response from the exchange
     */
    async clobPrivateGetOrders (params = {}) {
        return await this.request ('data/orders', [ 'clob', 'private' ], 'GET', this.extend ({ 'api_type': 'clob' }, params));
    }

    /**
     * @method
     * @name polymarket#clobPrivatePostOrder
     * @description creates a new order
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (POST_ORDER = "/order")
     * @see https://docs.polymarket.com/developers/CLOB/orders/create-order#request-payload-parameters
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {object} [params.order] order object (required)
     * @param {string} [params.owner] api key of order owner (required)
     * @param {string} [params.orderType] order type: "FOK", "GTC", "GTD" (required)
     * @returns {object} response from the exchange
     */
    async clobPrivatePostOrder (params = {}) {
        // Build request payload according to API specification
        // See https://docs.polymarket.com/developers/CLOB/orders/create-order#request-payload-parameters
        const order = this.safeValue (params, 'order');
        if (order === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPrivatePostOrder() requires an order parameter');
        }
        const owner = this.safeString (params, 'owner');
        if (owner === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPrivatePostOrder() requires an owner parameter (API key)');
        }
        const orderType = this.safeString (params, 'orderType');
        if (orderType === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPrivatePostOrder() requires an orderType parameter');
        }
        // Build the complete request payload with top-level fields
        const requestPayload: Dict = {
            'order': order,
            'owner': owner,
            'orderType': orderType,
        };
        // Add optional parameters if provided
        const clientOrderId = this.safeString (params, 'clientOrderId');
        if (clientOrderId !== undefined) {
            requestPayload['clientOrderId'] = clientOrderId;
        }
        const postOnly = this.safeBool (params, 'postOnly');
        if (postOnly !== undefined) {
            requestPayload['postOnly'] = postOnly;
        }
        // Send the complete request payload as JSON body
        const body = this.json (requestPayload);
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, [ 'order', 'owner', 'orderType', 'clientOrderId', 'postOnly' ]));
        return await this.request ('order', [ 'clob', 'private' ], 'POST', remainingParams, undefined, body);
    }

    /**
     * @method
     * @name polymarket#clobPrivatePostOrders
     * @description creates multiple orders in a batch
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (POST_ORDERS = "/orders")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {Array} [params.orders] array of order objects (required)
     * @returns {object} response from the exchange
     */
    async clobPrivatePostOrders (params = {}) {
        const orders = this.safeValue (params, 'orders');
        if (orders === undefined || !Array.isArray (orders)) {
            throw new ArgumentsRequired (this.id + ' clobPrivatePostOrders() requires an orders parameter (array of order objects)');
        }
        const body = this.json (orders);
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, 'orders'));
        return await this.request ('orders', [ 'clob', 'private' ], 'POST', remainingParams, undefined, body);
    }

    /**
     * @method
     * @name polymarket#clobPrivateDeleteOrder
     * @description cancels an order
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (CANCEL = "/order")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.order_id] the order ID to cancel (required)
     * @returns {object} response from the exchange
     */
    async clobPrivateDeleteOrder (params = {}) {
        const orderId = this.safeString (params, 'order_id');
        if (orderId === undefined) {
            throw new ArgumentsRequired (this.id + ' clobPrivateDeleteOrder() requires an order_id parameter');
        }
        const request: Dict = {
            'orderID': orderId,
        };
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, 'order_id'));
        const body = this.json (request);
        return await this.request ('order', [ 'clob', 'private' ], 'DELETE', remainingParams, undefined, body);
    }

    /**
     * @method
     * @name polymarket#clobPrivateDeleteOrders
     * @description cancels multiple orders
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (CANCEL_ORDERS = "/orders")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string[]} [params.order_ids] array of order IDs to cancel (required)
     * @returns {object} response from the exchange
     */
    async clobPrivateDeleteOrders (params = {}) {
        const orderIds = this.safeValue (params, 'order_ids');
        if (orderIds === undefined || !Array.isArray (orderIds)) {
            throw new ArgumentsRequired (this.id + ' clobPrivateDeleteOrders() requires an order_ids parameter (array of order IDs)');
        }
        const body = this.json (orderIds);
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, 'order_ids'));
        return await this.request ('orders', [ 'clob', 'private' ], 'DELETE', remainingParams, undefined, body);
    }

    /**
     * @method
     * @name polymarket#clobPrivateDeleteCancelAll
     * @description cancels all open orders
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (CANCEL_ALL = "/cancel-all")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] optional token ID to cancel all orders for a specific market
     * @returns {object} response from the exchange
     */
    async clobPrivateDeleteCancelAll (params = {}) {
        const body = this.json (params);
        return await this.request ('cancel-all', [ 'clob', 'private' ], 'DELETE', { 'api_type': 'clob' }, undefined, body);
    }

    /**
     * @method
     * @name polymarket#clobPrivateDeleteCancelMarketOrders
     * @description cancels all orders from a market
     * @see https://docs.polymarket.com/developers/CLOB/orders/cancel-market-orders
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.market] condition id of the market
     * @param {string} [params.asset_id] id of the asset/token
     * @returns {object} response from the exchange
     */
    async clobPrivateDeleteCancelMarketOrders (params = {}) {
        const request: Dict = {};
        const market = this.safeString (params, 'market');
        if (market !== undefined) {
            request['market'] = market;
        }
        const assetId = this.safeString (params, 'asset_id');
        if (assetId !== undefined) {
            request['asset_id'] = assetId;
        }
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, [ 'market', 'asset_id' ]));
        const body = this.json (request);
        return await this.request ('cancel-market-orders', [ 'clob', 'private' ], 'DELETE', remainingParams, undefined, body);
    }

    /**
     * @method
     * @name polymarket#clobPrivateGetTrades
     * @description fetches trade history for the authenticated user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py (get_trades method)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] filter trades by token ID
     * @param {int} [params.start_timestamp] start timestamp in seconds
     * @param {string} [params.next_cursor] pagination cursor
     * @returns {object} response from the exchange
     */
    async clobPrivateGetTrades (params = {}) {
        // NOTE: the authenticated L2 endpoint is `/trades` (without the public `/data/` prefix).
        // Using the public path would return all market trades instead of the caller's own fills.
        return await this.request ('trades', [ 'clob', 'private' ], 'GET', this.extend ({ 'api_type': 'clob' }, params));
    }

    /**
     * @method
     * @name polymarket#clobPrivateGetBuilderTrades
     * @description fetches trades originated by the builder
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (GET_BUILDER_TRADES = "/builder-trades")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.token_id] filter trades by token ID
     * @param {int} [params.start_timestamp] start timestamp in seconds
     * @param {string} [params.next_cursor] pagination cursor
     * @returns {object} response from the exchange
     */
    async clobPrivateGetBuilderTrades (params = {}) {
        return await this.request ('builder-trades', [ 'clob', 'private' ], 'GET', this.extend ({ 'api_type': 'clob' }, params));
    }

    /**
     * @method
     * @name polymarket#clobPrivateGetNotifications
     * @description fetches notifications for the authenticated user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (GET_NOTIFICATIONS = "/notifications")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} response from the exchange
     */
    async clobPrivateGetNotifications (params = {}) {
        return await this.request ('notifications', [ 'clob', 'private' ], 'GET', this.extend ({ 'api_type': 'clob' }, params));
    }

    /**
     * @method
     * @name polymarket#clobPrivateDeleteNotifications
     * @description drops notifications for the authenticated user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (DROP_NOTIFICATIONS = "/notifications")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.notification_id] specific notification ID to drop
     * @returns {object} response from the exchange
     */
    async clobPrivateDeleteNotifications (params = {}) {
        return await this.request ('notifications', [ 'clob', 'private' ], 'DELETE', this.extend ({ 'api_type': 'clob' }, params));
    }

    /**
     * @method
     * @name polymarket#clobPrivateGetBalanceAllowance
     * @description fetches balance and allowance for the authenticated user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (GET_BALANCE_ALLOWANCE = "/balance-allowance")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.signature_type] signature type (default: from options.signatureType or options.signatureTypes.EOA).
     * @returns {object} response from the exchange
     */
    async clobPrivateGetBalanceAllowance (params = {}) {
        return await this.request ('balance-allowance', [ 'clob', 'private' ], 'GET', this.extend ({ 'api_type': 'clob' }, params));
    }

    /**
     * @method
     * @name polymarket#clobPrivatePutBalanceAllowance
     * @description updates balance and allowance for the authenticated user
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (UPDATE_BALANCE_ALLOWANCE = "/balance-allowance")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.signature_type] signature type (default: from options.signatureType or options.signatureTypes.EOA).
     * @returns {object} response from the exchange
     */
    async clobPrivatePutBalanceAllowance (params = {}) {
        const body = this.json (params);
        return await this.request ('balance-allowance', [ 'clob', 'private' ], 'PUT', { 'api_type': 'clob' }, undefined, body);
    }

    /**
     * @method
     * @name polymarket#clobPrivateGetIsOrderScoring
     * @description checks if an order is currently scoring
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (IS_ORDER_SCORING = "/is-order-scoring")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.order_id] the order ID (required)
     * @param {string} [params.token_id] the token ID (required)
     * @param {string} [params.side] the side: 'BUY' or 'SELL' (required)
     * @param {string} [params.price] the price (required)
     * @param {string} [params.size] the size (required)
     * @returns {object} response from the exchange
     */
    async clobPrivateGetIsOrderScoring (params = {}) {
        // GET /order-scoring?order_id=...
        return await this.request ('order-scoring', [ 'clob', 'private' ], 'GET', this.extend ({ 'api_type': 'clob' }, params));
    }

    /**
     * @method
     * @name polymarket#clobPrivatePostAreOrdersScoring
     * @description checks if multiple orders are currently scoring
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/endpoints.py (ARE_ORDERS_SCORING = "/are-orders-scoring")
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string[]} [params.orderIds] array of order IDs to check (required)
     * @returns {object} response from the exchange
     */
    async clobPrivatePostAreOrdersScoring (params = {}) {
        const orderIds = this.safeValue2 (params, 'orderIds', 'order_ids');
        if (orderIds === undefined || !Array.isArray (orderIds)) {
            throw new ArgumentsRequired (this.id + ' clobPrivatePostAreOrdersScoring() requires an orderIds parameter (array of order IDs)');
        }
        const body = this.json ({ 'orderIds': orderIds });
        const remainingParams = this.extend ({ 'api_type': 'clob' }, this.omit (params, [ 'orderIds', 'order_ids' ]));
        // POST /orders-scoring with JSON body { orderIds: [...] }
        return await this.request ('orders-scoring', [ 'clob', 'private' ], 'POST', remainingParams, undefined, body);
    }

    /**
     * @method
     * @name polymarket#getMainWalletAddress
     * @description gets main wallet address (walletAddress or options.funder)
     * @returns {string} main wallet address
     */
    getMainWalletAddress () {
        if (this.walletAddress !== undefined && this.walletAddress !== '') {
            return this.walletAddress;
        }
        const funder = this.safeString (this.options, 'funder');
        if (funder !== undefined && funder !== '') {
            return funder;
        }
        throw new ArgumentsRequired (this.id + ' getMainWalletAddress() requires a wallet address. Set `walletAddress` or `options.funder`.');
    }

    /**
     * @method
     * @name polymarket#getProxyWalletAddress
     * @description gets proxy wallet address for Data-API endpoints (falls back to main wallet if not set)
     * @returns {string} proxy wallet address
     */
    getProxyWalletAddress () {
        if (this.uid !== undefined && this.uid !== '') {
            return this.uid;
        }
        const proxyWallet = this.safeString (this.options, 'proxyWallet');
        if (proxyWallet !== undefined && proxyWallet !== '') {
            return proxyWallet;
        }
        // Fall back to main wallet if proxyWallet is not set
        return this.getMainWalletAddress ();
    }

    /**
     * @method
     * @name polymarket#getBuilderWalletAddress
     * @description gets builder wallet address (falls back to main wallet if not set)
     * @returns {string} builder wallet address
     */
    getBuilderWalletAddress () {
        const builderWallet = this.safeString (this.options, 'builderWallet');
        if (builderWallet !== undefined && builderWallet !== '') {
            return builderWallet;
        }
        // Fall back to main wallet if builderWallet is not set
        return this.getMainWalletAddress ();
    }

    /**
     * @method
     * @name polymarket#getUserTotalValue
     * @description fetches total value of a user's positions from Data-API
     * @see https://docs.polymarket.com/api-reference/core/get-total-value-of-a-users-positions
     * @param {string} [userAddress] user wallet address (defaults to getProxyWalletAddress())
     * @returns {object} object with 'value' (number) and 'response' (raw API response)
     */
    async getUserTotalValue (userAddress: string = undefined): Promise<Dict> {
        let address: string = undefined;
        if (userAddress !== undefined) {
            // Use provided address directly (public endpoint, no wallet setup needed)
            address = userAddress;
        } else {
            // Try to get proxy wallet address, but handle case where wallet is not configured
            // This allows public calls without requiring wallet setup
            try {
                address = this.getProxyWalletAddress ();
            } catch (e) {
                // If wallet is not configured, require userAddress parameter for public calls
                throw new ArgumentsRequired (this.id + ' getUserTotalValue() requires a userAddress parameter when wallet is not configured. This is a public endpoint that can query any user address.');
            }
        }
        // Fetch total value from Data-API
        const valueResponse = await this.dataPublicGetTotalValue ({ 'user': address });
        // Response format: [{"user": "0x...", "value": 123}]
        let valueData = valueResponse;
        if (Array.isArray (valueResponse)) {
            if (valueResponse.length > 0) {
                valueData = valueResponse[0];
            } else {
                valueData = {};
            }
        }
        const totalValue = this.safeNumber (valueData, 'value', 0);
        return {
            'value': totalValue,
            'response': valueResponse,
        };
    }

    /**
     * @method
     * @name polymarket#getUserPositions
     * @description fetches current positions for a user from Data-API (defaults to proxy wallet)
     * @see https://docs.polymarket.com/api-reference/core/get-current-positions-for-a-user
     * @param {string} [userAddress] user wallet address (defaults to getProxyWalletAddress())
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} response from the exchange
     */
    async getUserPositions (userAddress: string = undefined, params = {}): Promise<Dict> {
        // TODO add pagination, sort, limit etc https://docs.polymarket.com/api-reference/core/get-current-positions-for-a-user
        let address: string = undefined;
        if (userAddress !== undefined) {
            // Use provided address directly (public endpoint, no wallet setup needed)
            address = userAddress;
        } else {
            // Try to get proxy wallet address, but handle case where wallet is not configured
            // This allows public calls without requiring wallet setup
            try {
                address = this.getProxyWalletAddress ();
            } catch (e) {
                // If wallet is not configured, require userAddress parameter for public calls
                throw new ArgumentsRequired (this.id + ' getUserPositions() requires a userAddress parameter when wallet is not configured. This is a public endpoint that can query any user address.');
            }
        }
        return await this.dataPublicGetPositions (this.extend ({ 'user': address }, params));
    }

    /**
     * @method
     * @name polymarket#getUserClosedPositions
     * @description fetches closed positions for a user from Data-API (defaults to proxy wallet)
     * @see https://docs.polymarket.com/api-reference/core/get-closed-positions-for-a-user
     * @param {string} [userAddress] user wallet address (defaults to getProxyWalletAddress())
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} response from the exchange
     */
    async getUserClosedPositions (userAddress: string = undefined, params = {}): Promise<Dict> {
        // TODO add pagination, sort, limit etc https://docs.polymarket.com/api-reference/core/get-closed-positions-for-a-user
        let address: string = undefined;
        if (userAddress !== undefined) {
            // Use provided address directly (public endpoint, no wallet setup needed)
            address = userAddress;
        } else {
            // Try to get proxy wallet address, but handle case where wallet is not configured
            // This allows public calls without requiring wallet setup
            try {
                address = this.getProxyWalletAddress ();
            } catch (e) {
                // If wallet is not configured, require userAddress parameter for public calls
                throw new ArgumentsRequired (this.id + ' getUserClosedPositions() requires a userAddress parameter when wallet is not configured. This is a public endpoint that can query any user address.');
            }
        }
        return await this.dataPublicGetClosedPositions (this.extend ({ 'user': address }, params));
    }

    /**
     * @method
     * @name polymarket#getUserActivity
     * @description fetches user activity from Data-API (defaults to proxy wallet)
     * @see https://docs.polymarket.com/api-reference/core/get-user-activity
     * @param {string} [userAddress] user wallet address (defaults to getProxyWalletAddress())
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} response from the exchange
     */
    async getUserActivity (userAddress: string = undefined, params = {}): Promise<Dict> {
        let address: string = undefined;
        if (userAddress !== undefined) {
            // Use provided address directly (public endpoint, no wallet setup needed)
            address = userAddress;
        } else {
            // Try to get proxy wallet address, but handle case where wallet is not configured
            // This allows public calls without requiring wallet setup
            try {
                address = this.getProxyWalletAddress ();
            } catch (e) {
                // If wallet is not configured, require userAddress parameter for public calls
                throw new ArgumentsRequired (this.id + ' getUserActivity() requires a userAddress parameter when wallet is not configured. This is a public endpoint that can query any user address.');
            }
        }
        const request: Dict = {
            'user': address,
            'limit': this.safeInteger (params, 'limit', 100),
            'offset': this.safeInteger (params, 'offset', 0),
            'sortBy': this.safeString (params, 'sortBy', 'TIMESTAMP'),
            'sortDirection': this.safeString (params, 'sortDirection', 'DESC'),
        };
        return await this.dataPublicGetActivity (this.extend (request, this.omit (params, [ 'user' ])));
    }

    /**
     * @method
     * @name polymarket#parseUserActivity
     * @description parse a raw user activity record into a trade-like structure consumable by parseTrades
     * @param {object} activity raw activity payload from Data-API
     * @param {object} [market] market structure, when known
     * @returns {object|undefined} normalized activity (only for TRADE records) or undefined
     */
    parseUserActivity (activity: Dict, market: Market = undefined): Dict {
        const activityType = this.safeString (activity, 'type');
        if (activityType !== 'TRADE') {
            return undefined;
        }
        const rawTs = this.safeInteger (activity, 'timestamp');
        let isoTimestamp = this.safeString (activity, 'timestamp');
        if (rawTs !== undefined) {
            const tsMs = (rawTs < 1000000000000) ? rawTs * 1000 : rawTs;
            isoTimestamp = this.iso8601 (tsMs);
        }
        const symbol = (market !== undefined) ? market['symbol'] : this.safeString (activity, 'condition_id');
        return this.extend (activity, {
            'timestamp': isoTimestamp,
            'transactionHash': this.safeString (activity, 'transactionHash'),
            'symbol': symbol,
            'asset': this.safeString (activity, 'asset'),
            'price': this.safeNumber (activity, 'price'),
            'size': this.safeNumber (activity, 'size'),
            'side': this.safeString (activity, 'side'),
        });
    }

    formatAddress (address: string = undefined) {
        if (address === undefined) {
            return undefined;
        }
        if (address.startsWith ('0x')) {
            return address.replace ('0x', '');
        }
        return address;
    }

    normalizeAddress (address: string): string {
        let normalized = String (address).trim ();
        if (!normalized.startsWith ('0x')) {
            normalized = '0x' + normalized;
        }
        return normalized.toLowerCase ();
    }

    hashMessage (message: string): string {
        const binaryMessage = this.encode (message);
        const binaryMessageLength = this.binaryLength (binaryMessage);
        const x19 = this.base16ToBinary ('19');
        const newline = this.base16ToBinary ('0a');
        const prefix = this.binaryConcat (x19, this.encode ('Ethereum Signed Message:'), newline, this.encode (this.numberToString (binaryMessageLength)));
        return '0x' + this.hash (this.binaryConcat (prefix, binaryMessage), keccak, 'hex');
    }

    getContractConfig (chainID: number): Dict {
        const contracts = this.safeValue (this.options, 'contracts', {});
        const chainIdStr = chainID.toString ();
        const contractConfig = this.safeValue (contracts, chainIdStr);
        if (contractConfig === undefined) {
            throw new ExchangeError (this.id + ' getContractConfig() invalid network chainId: ' + chainIdStr);
        }
        return contractConfig;
    }

    signMessage (message: string, privateKey: string): string {
        const hash = this.hashMessage (message);
        return this.signHash (hash, privateKey);
    }

    signHash (hash: string, privateKey: string) {
        const signature = ecdsa (hash.slice (-64), privateKey.slice (-64), secp256k1, undefined);
        const r = signature['r'];
        const s = signature['s'];
        const v = this.intToBase16 (this.sum (27, signature['v']));
        // Convert to lowercase hex (Ethereum standard)
        const finalSignature = ('0x' + r.padStart (64, '0') + s.padStart (64, '0') + v.padStart (2, '0')).toLowerCase ();
        return finalSignature;
    }

    signTypedData (domain: Dict, types: Dict, value: Dict): string {
        // This returns binary data: 0x1901 || hashDomain(domain) || hashStruct(primaryType, types, value)
        const encoded = this.ethEncodeStructuredData (domain, types, value);
        // Hash the encoded binary data with keccak256
        const hash = '0x' + this.hash (encoded, keccak, 'hex');
        // Sign the hash using signHash
        const signature = this.signHash (hash, this.privateKey);
        return signature;
    }

    createLevel1Headers (walletAddress: string, nonce: number = undefined): Dict {
        if (walletAddress === undefined || walletAddress === '') {
            throw new ArgumentsRequired (this.id + ' createLevel1Headers() requires a valid walletAddress');
        }
        const normalizedAddress = this.normalizeAddress (walletAddress);
        const chainId = this.safeInteger (this.options, 'chainId');
        const timestampSeconds = Math.floor (this.milliseconds () / 1000);
        const timestamp = timestampSeconds.toString ();
        let nonceValue = 0;
        if (nonce !== undefined) {
            nonceValue = nonce;
        }
        const clobDomainName = this.safeString (this.options, 'clobDomainName');
        const clobVersion = this.safeString (this.options, 'clobVersion');
        const msgToSign = this.safeString (this.options, 'msgToSign');
        const domain = {
            'name': clobDomainName,
            'version': clobVersion,
            'chainId': chainId,
        };
        // https://github.com/Polymarket/clob-client/blob/b75aec68be17190215b7230372fbedfe85de20ef/src/signing/eip712.ts#L28
        const types = {
            'ClobAuth': [
                { 'name': 'address', 'type': 'address' },
                { 'name': 'timestamp', 'type': 'string' },
                { 'name': 'nonce', 'type': 'uint256' },
                { 'name': 'message', 'type': 'string' },
            ],
        };
        const message = {
            'address': normalizedAddress,
            'timestamp': timestamp,
            'nonce': nonceValue,
            'message': msgToSign,
        };
        const signature = this.signTypedData (domain, types, message);
        const headers = {
            'POLY_ADDRESS': normalizedAddress,
            'POLY_TIMESTAMP': timestamp,
            'POLY_NONCE': nonceValue.toString (),
            'POLY_SIGNATURE': signature,
        };
        return headers;
    }

    /**
     * @method
     * @name polymarket#getClobBaseUrl
     * @description Gets the CLOB API base URL (handles sandbox mode and custom hosts)
     * @param {object} [params] extra parameters
     * @returns {string} base URL for CLOB API
     */
    getClobBaseUrl (params = {}): string {
        const apiType = this.safeString (params, 'api_type', 'clob');
        let baseUrl = this.urls['api'][apiType];
        // Check for sandbox mode
        if (this.isSandboxModeEnabled && this.urls['test'] && this.urls['test'][apiType]) {
            baseUrl = this.urls['test'][apiType];
        }
        if (apiType === 'clob') {
            const customHost = this.safeString (this.options, 'clobHost');
            if (customHost !== undefined) {
                baseUrl = customHost;
            }
        }
        return baseUrl;
    }

    /**
     * @method
     * @name polymarket#parseApiCredentials
     * @description Parses API credentials from API response and caches them
     * @param {object} response API response
     * @returns {object} API credentials {apiKey, secret, passphrase}
     */
    parseApiCredentials (response: any): Dict {
        const apiKey = this.safeString (response, 'apiKey') || this.safeString (response, 'api_key');
        const secret = this.safeString (response, 'secret');
        const passphrase = this.safeString (response, 'passphrase');
        if (!apiKey || !secret || !passphrase) {
            throw new ExchangeError (this.id + ' parseApiCredentials() failed to parse credentials. Response: ' + this.json (response));
        }
        const credentials = {
            'apiKey': apiKey,
            'secret': secret,
            'passphrase': passphrase,
        };
        // Cache credentials in options
        this.options['apiCredentials'] = credentials;
        // Also set them as instance properties for use in sign() method
        this.apiKey = apiKey;
        this.secret = secret;
        this.password = passphrase;
        return credentials;
    }

    /**
     * @method
     * @name polymarket#create_api_key
     * @description Creates a new CLOB API key for the given address
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/authentication
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {number} [params.nonce] optional nonce/timestamp
     * @returns {object} API credentials {apiKey, secret, passphrase}
     * @note Uses manual URL building instead of this.request() because this endpoint requires L1 authentication
     * (POLY_ADDRESS, POLY_SIGNATURE headers) rather than the standard L2 authentication used by this.request()
     */
    async create_api_key (params = {}): Promise<Dict> {
        if (this.privateKey === undefined) {
            throw new ArgumentsRequired (this.id + ' create_api_key() requires a privateKey');
        }
        // Validate privateKey format (should be hex string with 0x prefix, 66 chars total)
        if (!this.privateKey.startsWith ('0x') || this.privateKey.length !== 66) {
            throw new ArgumentsRequired (this.id + ' create_api_key() requires a valid privateKey (0x-prefixed hex string, 66 characters)');
        }
        const walletAddress = this.getMainWalletAddress ();
        // Validate walletAddress format (should be hex string with 0x prefix, 42 chars total)
        if (!walletAddress.startsWith ('0x') || walletAddress.length !== 42) {
            throw new ArgumentsRequired (this.id + ' create_api_key() requires a valid walletAddress (0x-prefixed hex string, 42 characters). Got: ' + walletAddress);
        }
        const baseUrl = this.getClobBaseUrl (params);
        const nonce = this.safeInteger (params, 'nonce');
        const headers = this.createLevel1Headers (walletAddress, nonce);
        const url = baseUrl + '/auth/api-key';
        // POST /auth/api-key (creates new API credentials with L1 authentication)
        const response = await this.fetch (url, 'POST', headers, undefined);
        return this.parseApiCredentials (response);
    }

    /**
     * @method
     * @name polymarket#derive_api_key
     * @description Derives an already existing CLOB API key for the given address and nonce
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @see https://docs.polymarket.com/developers/CLOB/authentication
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {number} [params.nonce] optional nonce/timestamp
     * @returns {object} API credentials {apiKey, secret, passphrase}
     * @note Uses manual URL building instead of this.request() because this endpoint requires L1 authentication
     * (POLY_ADDRESS, POLY_SIGNATURE headers) rather than the standard L2 authentication used by this.request()
     */
    async derive_api_key (params = {}): Promise<Dict> {
        if (this.privateKey === undefined) {
            throw new ArgumentsRequired (this.id + ' derive_api_key() requires a privateKey');
        }
        const walletAddress = this.getMainWalletAddress ();
        const baseUrl = this.getClobBaseUrl (params);
        const nonce = this.safeInteger (params, 'nonce');
        const headers = this.createLevel1Headers (walletAddress, nonce);
        const url = baseUrl + '/auth/derive-api-key';
        // GET /auth/derive-api-key (derives existing API credentials with L1 authentication)
        const response = await this.fetch (url, 'GET', headers, undefined);
        return this.parseApiCredentials (response);
    }

    /**
     * @method
     * @name polymarket#create_or_derive_api_creds
     * @description Creates API creds if not already created for nonce, otherwise derives them
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {number} [params.nonce] optional nonce/timestamp
     * @returns {object} API credentials {apiKey, secret, passphrase}
     */
    async create_or_derive_api_creds (params = {}): Promise<Dict> {
        // Check if credentials are already cached
        const cachedCreds = this.safeDict (this.options, 'apiCredentials');
        if (cachedCreds !== undefined) {
            return cachedCreds;
        }
        // Try create_api_key first, then derive_api_key if create fails
        // Based on py-clob-client client.py: create_or_derive_api_creds()
        try {
            return await this.create_api_key (params);
        } catch (e) {
            // If create fails (e.g., key already exists), try to derive it
            return await this.derive_api_key (params);
        }
    }

    /**
     * @method
     * @name polymarket#setApiCreds
     * @description Sets API credentials (alias for caching credentials)
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/client.py
     * @param {object} credentials API credentials {apiKey, secret, passphrase}
     */
    setApiCreds (credentials: Dict) {
        this.options['apiCredentials'] = credentials;
        this.apiKey = this.safeString (credentials, 'apiKey');
        this.secret = this.safeString (credentials, 'secret');
        this.password = this.safeString (credentials, 'passphrase');
    }

    /**
     * @method
     * @name polymarket#getApiBaseUrl
     * @description Gets the API base URL for the specified API type (handles sandbox mode and custom hosts)
     * @param {object} [params] extra parameters
     * @param {string} [params.api_type] API type ('clob', 'gamma', 'data', etc.)
     * @returns {string} base URL for the API
     */
    getApiBaseUrl (params = {}): string {
        const apiType = this.safeString (params, 'api_type', 'clob');
        // Ensure urls.api exists
        if (this.urls === undefined || this.urls['api'] === undefined) {
            throw new ExchangeError (this.id + ' getApiBaseUrl() failed: urls.api is not initialized. Make sure exchange is properly initialized.');
        }
        // Direct access to nested object property
        let baseUrl = this.urls['api'][apiType];
        // Check for sandbox mode
        if (this.isSandboxModeEnabled && this.urls['test'] && this.urls['test'][apiType]) {
            baseUrl = this.urls['test'][apiType];
        }
        // Allow custom CLOB host override
        if (apiType === 'clob') {
            const customHost = this.safeString (this.options, 'clobHost');
            if (customHost !== undefined) {
                baseUrl = customHost;
            }
        }
        // Ensure we have a valid base URL
        if (baseUrl === undefined) {
            const apiUrls = this.urls['api'] || {};
            const availableTypesList = Object.keys (apiUrls);
            let availableTypes = '';
            if (availableTypesList.length > 0) {
                availableTypes = availableTypesList.join (', ');
            }
            throw new ExchangeError (this.id + ' getApiBaseUrl() failed: API type "' + apiType + '" not found in urls.api. Available types: ' + availableTypes);
        }
        return baseUrl;
    }

    /**
     * @method
     * @name polymarket#buildDefaultHeaders
     * @description Builds default HTTP headers based on py-clob-client helpers.py
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/http_helpers/helpers.py
     * @param {string} method HTTP method ('GET', 'POST', etc.)
     * @param {object} [existingHeaders] existing headers to extend
     * @returns {object} headers dictionary
     */
    buildDefaultHeaders (method: string, existingHeaders: Dict = undefined): Dict {
        if (existingHeaders === undefined) {
            existingHeaders = {};
        }
        const headers = this.extend ({
            'User-Agent': 'ccxt',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Content-Type': 'application/json',
        }, existingHeaders);
        // Add Accept-Encoding for GET requests (as per py-clob-client)
        if (method === 'GET') {
            headers['Accept-Encoding'] = 'gzip';
        }
        return headers;
    }

    /**
     * @method
     * @name polymarket#buildPublicRequest
     * @description Builds a public (unauthenticated) request
     * @param {string} baseUrl API base URL
     * @param {string} pathWithParams path with parameters
     * @param {string} method HTTP method
     * @param {object} queryParams query parameters
     * @param {string} [body] request body
     * @param {object} [headers] request headers
     * @returns {object} request object with url, method, body, and headers
     */
    buildPublicRequest (baseUrl: string, pathWithParams: string, method: string, queryParams: Dict, body: string = undefined, headers: Dict = undefined): Dict {
        headers = this.buildDefaultHeaders (method, headers);
        let url = baseUrl + '/' + pathWithParams;
        if (method === 'GET') {
            if (Object.keys (queryParams).length) {
                url += '?' + this.urlencode (queryParams);
            }
        } else {
            // For POST requests, body should already be set by the calling method
            if (body === undefined && Object.keys (queryParams).length) {
                body = this.json (queryParams);
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    /**
     * @method
     * @name polymarket#ensureApiCredentials
     * @description Ensures API credentials are generated (lazy generation, similar to dYdX's retrieveCredentials)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} API credentials {apiKey, secret, passphrase}
     */
    async ensureApiCredentials (params = {}): Promise<Dict> {
        // Check if credentials are already cached
        const cachedCreds = this.safeDict (this.options, 'apiCredentials');
        if (cachedCreds !== undefined) {
            return cachedCreds;
        }
        // Check if credentials are provided directly (apiKey, secret, password)
        // This allows users to provide credentials directly instead of generating from privateKey
        if (this.apiKey && this.secret && this.password) {
            const directCreds = {
                'apiKey': this.apiKey,
                'secret': this.secret,
                'passphrase': this.password,
            };
            this.setApiCreds (directCreds);
            return directCreds;
        }
        // If direct credentials not provided, check if privateKey is available for generation
        if (this.privateKey === undefined) {
            throw new ArgumentsRequired (this.id + ' ensureApiCredentials() requires either: (1) apiKey + secret + password provided directly, or (2) privateKey to generate credentials');
        }
        // Generate credentials lazily (similar to dYdX's retrieveCredentials pattern)
        // This is called automatically before authenticated requests
        const creds = await this.create_or_derive_api_creds (params);
        this.setApiCreds (creds);
        return creds;
    }

    /**
     * @method
     * @name polymarket#getApiCredentials
     * @description Gets API credentials from cache or instance properties
     * @returns {object} API credentials {apiKey, secret, password}
     */
    getApiCredentials (): Dict {
        let apiKey = this.apiKey;
        let secret = this.secret;
        let password = this.password;
        // Check if credentials are already cached
        const cachedCreds = this.safeDict (this.options, 'apiCredentials');
        if (cachedCreds !== undefined) {
            apiKey = this.safeString (cachedCreds, 'apiKey') || apiKey;
            secret = this.safeString (cachedCreds, 'secret') || secret;
            password = this.safeString (cachedCreds, 'passphrase') || password;
        }
        // If credentials are not available, check if privateKey is set
        // Only throw error if privateKey is set (meaning user wants authenticated requests)
        // This allows public requests to work even when privateKey is set but credentials not yet generated
        if (!apiKey || !secret || !password) {
            if (this.privateKey === undefined) {
                // No privateKey set - this should not happen if called from buildPrivateRequest
                throw new ArgumentsRequired (this.id + ' getApiCredentials() called but no credentials available and no privateKey set. This should only be called for authenticated requests. Provide either: (1) apiKey + secret + password directly, or (2) privateKey to generate credentials.');
            }
            // privateKey is set but credentials not generated yet - this is expected for lazy generation
            // Don't throw error here, let ensureApiCredentials() handle it
            throw new ArgumentsRequired (this.id + ' API credentials not generated. Credentials are automatically generated on first authenticated request, but privateKey is required. Alternatively, provide apiKey + secret + password directly.');
        }
        return { 'apiKey': apiKey, 'secret': secret, 'password': password };
    }

    /**
     * @method
     * @name polymarket#buildRequestPathAndPayload
     * @description Builds the request path and payload for signature
     * @param {string} pathWithParams path with parameters
     * @param {string} method HTTP method
     * @param {object} queryParams query parameters
     * @param {string} [body] request body
     * @returns {object} {requestPath, url, payload, body}
     */
    buildRequestPathAndPayload (pathWithParams: string, method: string, queryParams: Dict, body: string = undefined): Dict {
        // Ensure path doesn't have double slashes (pathWithParams may already start with /)
        const normalizedPath = pathWithParams.startsWith ('/') ? pathWithParams : '/' + pathWithParams;
        const requestPath = normalizedPath;
        let url = requestPath;
        let payload = '';
        if (method === 'GET') {
            if (Object.keys (queryParams).length) {
                const queryString = this.urlencode (queryParams);
                url += '?' + queryString;
                payload = queryString;
            }
        } else {
            // For POST/PUT/DELETE, body is part of the signature
            // Use deterministic JSON serialization (no spaces, compact) matching py-clob-client
            // json.dumps(body, separators=(",", ":"), ensure_ascii=False) produces compact JSON
            if (body === undefined && Object.keys (queryParams).length) {
                // JSON.stringify by default produces compact JSON (no spaces)
                body = JSON.stringify (queryParams);
            }
            // Serialize body deterministically if it's an object
            if (body !== undefined && typeof body === 'object') {
                body = JSON.stringify (body);
            }
            // Use body as payload (quote replacement happens in createLevel2Signature)
            payload = (body !== undefined && body !== '') ? String (body) : '';
        }
        return { 'requestPath': requestPath, 'url': url, 'payload': payload, 'body': body };
    }

    /**
     * @method
     * @name polymarket#createLevel2Signature
     * @description Creates Level 2 authentication signature (HMAC-SHA256)
     * @see https://docs.polymarket.com/developers/CLOB/authentication
     * @param {string} timestamp timestamp string
     * @param {string} method HTTP method
     * @param {string} requestPath request path
     * @param {string} body request body (serialized JSON string)
     * @param {string} secret API secret (base64 encoded, URL-safe)
     * @returns {string} URL-safe base64 encoded signature
     */
    createLevel2Signature (timestamp: string, method: string, requestPath: string, body: string, secret: string): string {
        // Create signature: HMAC-SHA256(timestamp + method + path + body, secret)
        // Based on Polymarket CLOB API L2 authentication (matches py-clob-client build_hmac_signature)
        // Use String(method) to preserve case (don't use toUpperCase())
        const message = String (timestamp) + String (method) + String (requestPath);
        // Only add body if it exists and is not empty
        // NOTE: Replace single quotes with double quotes (matching py-clob-client behavior)
        // This is necessary to generate the same hmac message and typescript
        let messageWithBody = message;
        if (body !== undefined && body !== '') {
            messageWithBody = message + String (body).replaceAll ("'", '"');
        }
        // Generate HMAC and return URL-safe base64
        // Convert URL-safe base64 to standard base64 (replace - with + and _ with /)
        const secretBinary = this.base64ToBinary (String (secret).replaceAll ('-', '+').replaceAll ('_', '/'));
        const hmacResult = this.hmac (this.encode (messageWithBody), secretBinary, sha256, 'base64');
        return hmacResult.replaceAll ('+', '-').replaceAll ('/', '_');
    }

    /**
     * @method
     * @name polymarket#createLevel2Headers
     * @description Creates Level 2 authentication headers
     * @see https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/headers/headers.py
     * @param {string} apiKey API key
     * @param {string} timestamp timestamp string
     * @param {string} signature signature string
     * @param {string} password API passphrase
     * @returns {object} Level 2 headers dictionary
     */
    createLevel2Headers (apiKey: string, timestamp: string, signature: string, password: string): Dict {
        const authHeaders: Dict = {
            'POLY_API_KEY': apiKey,
            'POLY_TIMESTAMP': timestamp,
            'POLY_SIGNATURE': signature,
            'POLY_PASSPHRASE': password, // Passphrase is required for L2 authentication
            'Content-Type': 'application/json',
        };
        // Always include POLY_ADDRESS in Level 2 headers (matches GitHub issue #190 fix)
        // Get wallet address from funder option, walletAddress property, or derive from privateKey
        let walletAddress = this.safeString (this.options, 'funder');
        if (walletAddress === undefined && this.walletAddress !== undefined) {
            walletAddress = this.walletAddress;
        }
        if (walletAddress === undefined && this.privateKey !== undefined) {
            // Derive wallet address from private key if not provided
            walletAddress = this.getMainWalletAddress ();
        }
        if (walletAddress !== undefined) {
            // Normalize and checksum the address (EIP-55)
            walletAddress = this.normalizeAddress (walletAddress);
            authHeaders['POLY_ADDRESS'] = walletAddress;
        }
        // // Add signature type if provided (defaults to EOA from options)
        // const signatureType = this.getSignatureType (params);
        // const eoaSignatureType = this.safeInteger (this.safeDict (this.options, 'signatureTypes', {}), 'EOA', 0);
        // if (signatureType !== eoaSignatureType) {
        //     authHeaders['POLY_SIGNATURE_TYPE'] = signatureType.toString ();
        // }
        // // Add chain ID (defaults to 137 for Polygon mainnet, 80001 for testnet)
        // // chain_id: 137 = Polygon mainnet (default), 80001 = Polygon Mumbai testnet
        // const chainId = this.safeInteger (this.options, 'chainId', 137);
        // authHeaders['POLY_CHAIN_ID'] = chainId.toString ();
        return authHeaders;
    }

    /**
     * @method
     * @name polymarket#buildPrivateRequest
     * @description Builds a private (authenticated) request with L2 authentication
     * @param {string} baseUrl API base URL
     * @param {string} pathWithParams path with parameters
     * @param {string} method HTTP method
     * @param {object} queryParams query parameters
     * @param {string} [body] request body
     * @param {object} [headers] existing headers
     * @returns {object} request object with url, method, body, and headers
     */
    buildPrivateRequest (baseUrl: string, pathWithParams: string, method: string, queryParams: Dict, body: string = undefined, headers: Dict = undefined): Dict {
        // Ensure privateKey is set
        if (this.privateKey === undefined) {
            throw new ArgumentsRequired (this.id + ' requires privateKey for authenticated requests');
        }
        // Get API credentials - this will throw if credentials not generated
        // For lazy generation, ensureApiCredentials() should be called before this
        const creds = this.getApiCredentials ();
        const timestamp = this.nonce ().toString ();
        // Serialize body deterministically if it's an object (matching py-clob-client)
        // Use JSON.stringify which produces compact JSON by default (no spaces)
        // This matches: json.dumps(body, separators=(",", ":"), ensure_ascii=False)
        let serializedBody: string = undefined;
        if (body !== undefined) {
            if (typeof body === 'object') {
                // Deterministic JSON: compact format (no spaces)
                serializedBody = JSON.stringify (body);
            } else {
                serializedBody = String (body);
            }
        } else if (Object.keys (queryParams).length && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
            // If body is undefined but we have queryParams for POST/PUT/DELETE, serialize them
            serializedBody = JSON.stringify (queryParams);
        }
        // Build request path and payload using the serialized body
        const pathAndPayload = this.buildRequestPathAndPayload (pathWithParams, method, queryParams, serializedBody);
        const requestPath = pathAndPayload['requestPath'];
        const requestUrl = pathAndPayload['url'];
        // Use the serialized body for the actual request (exact string that will be sent)
        const finalBody = serializedBody !== undefined ? serializedBody : pathAndPayload['body'];
        const privateUrl = baseUrl + requestUrl;
        // Create Level 2 signature: for GET requests, do NOT include query params in signature
        // For POST/PUT/DELETE, include the serialized body (not query params)
        // This matches py-clob-client: signature = timestamp + method + requestPath [+ body for non-GET]
        const bodyForSignature = (method === 'GET') ? undefined : serializedBody;
        const signature = this.createLevel2Signature (timestamp, method, requestPath, bodyForSignature, creds['secret']);
        // Create Level 2 headers
        const authHeaders = this.createLevel2Headers (creds['apiKey'], timestamp, signature, creds['password']);
        // Merge with existing headers
        headers = this.buildDefaultHeaders (method, headers);
        headers = this.extend (headers, authHeaders);
        return { 'url': privateUrl, 'method': method, 'body': finalBody, 'headers': headers };
    }

    /**
     * @method
     * @name polymarket#sign
     * @description Signs a request for authenticated endpoints
     * @see https://docs.polymarket.com/developers/CLOB/authentication
     * @param {string} path API endpoint path
     * @param {string} api API type ('public' or 'private')
     * @param {string} method HTTP method ('GET', 'POST', etc.)
     * @param {object} params Request parameters
     * @param {object} headers Request headers
     * @param {string} body Request body
     * @returns {object} Signed request with url, method, body, and headers
     */
    sign (path, api: any = [ 'clob', 'public' ], method = 'GET', params = {}, headers = undefined, body = undefined) {
        // Get API base URL
        const baseUrl = this.getApiBaseUrl (params);
        // Build path with parameters
        const pathWithParams = this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));
        // Remove api_type from query params as it's not part of the actual API request
        const queryParams = this.omit (query, [ 'api_type' ]);
        // For public endpoints, no authentication needed
        // api is always an array like ['gamma', 'public'] or ['clob', 'private']
        // The second element is the access level (public/private)
        const accessLevel = this.safeString (api, 1, 'public');
        if (accessLevel === 'public') {
            return this.buildPublicRequest (baseUrl, pathWithParams, method, queryParams, body, headers);
        }
        // For private endpoints, use L2 authentication
        return this.buildPrivateRequest (baseUrl, pathWithParams, method, queryParams, body, headers);
    }

    handleErrors (code: int, reason: string, url: string, method: string, headers: Dict, body: string, response: any, requestHeaders: any, requestBody: any) {
        if (response === undefined) {
            return undefined;
        }
        // Polymarket API errors
        if (code >= 400) {
            // Explicitly check for 401 (Unauthorized) and throw AuthenticationError
            if (code === 401) {
                const authFeedback = this.id + ' ' + method + ' ' + url + ' 401 ' + reason + ' ' + body;
                throw new AuthenticationError (authFeedback);
            }
            // Try to parse error message from response first (can be JSON or text)
            // Check error message BEFORE status code to catch specific errors like "Order not found"
            // that may return 400 status but should throw OrderNotFound instead of BadRequest
            let errorMessage = undefined;
            let errorData = undefined;
            try {
                if (typeof response === 'string') {
                    errorMessage = response;
                } else if (typeof response === 'object') {
                    errorMessage = this.safeString (response, 'error');
                    if (errorMessage === undefined) {
                        errorMessage = this.safeString (response, 'message');
                    }
                    if (errorMessage === undefined) {
                        // If no error/message field, use the whole response as error data
                        errorData = response;
                    }
                }
            } catch (e) {
                errorMessage = body;
            }
            const feedback = this.id + ' ' + (errorMessage || body);
            if (errorMessage !== undefined) {
                // Try exact match first (e.g., "Order not found" -> OrderNotFound)
                this.throwExactlyMatchedException (this.exceptions['exact'], errorMessage, feedback);
                // Then try broad match
                this.throwBroadlyMatchedException (this.exceptions['broad'], errorMessage, feedback);
                // If no match, fall through to status code check
            }
            // Check HTTP status code as fallback (use throwExactlyMatchedException for proper type handling)
            // This handles cases where no specific error message is found in the response
            const codeAsString = code.toString ();
            const statusCodeFeedback = this.id + ' ' + method + ' ' + url + ' ' + codeAsString + ' ' + reason + ' ' + body;
            this.throwExactlyMatchedException (this.exceptions['exact'], codeAsString, statusCodeFeedback);
            // If we reach here, no exception was thrown, so throw a generic error
            if (errorData !== undefined) {
                throw new ExchangeError (this.id + ' ' + this.json (errorData));
            } else {
                throw new ExchangeError (feedback);
            }
        }
        return undefined;
    }
}
