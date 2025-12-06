// ----------------------------------------------------------------------------

import polymarketRest from '../polymarket.js';
import { NotSupported, ExchangeError, AuthenticationError, ArgumentsRequired } from '../base/errors.js';
import { ArrayCache, ArrayCacheBySymbolById } from '../base/ws/Cache.js';
import type { Int, Str, OrderBook, Order, Trade, Ticker, Balances, Dict, Bool } from '../base/types.js';
import Client from '../base/ws/Client.js';

// ----------------------------------------------------------------------------

export default class polymarket extends polymarketRest {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'has': {
                'ws': true,
                'watchBalance': false,
                'watchTicker': true,
                'watchTickers': false,
                'watchTrades': true,
                'watchTradesForSymbols': false,
                'watchMyTrades': true,
                'watchOrders': true,
                'watchOrderBook': true,
                'watchOHLCV': false,
                'watchMarkets': true,
            },
            'urls': {
                'api': {
                    'ws': {
                        'market': 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
                        'user': 'wss://ws-subscriptions-clob.polymarket.com/ws/user',
                        'liveData': 'wss://ws-live-data.polymarket.com',
                    },
                },
            },
            'options': {
                'wsMarketChannelType': 'MARKET',
                'wsUserChannelType': 'USER',
                'ws': {
                    'options': {
                        'headers': { 'Origin': 'https://polymarket.com' },
                    },
                },
            },
            'streaming': {
            },
        });
    }

    /**
     * @method
     * @name polymarket#watchOrderBook
     * @description watches information on open orders with bid (buy) and ask (sell) prices, volumes and other data
     * @param {string} symbol unified symbol of the market to fetch the order book for
     * @param {int} [limit] the maximum amount of order book entries to return
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.asset_id] the asset ID for the specific outcome (required if market has multiple outcomes)
     * @returns {object} A dictionary of [order book structures]{@link https://docs.ccxt.com/#/?id=order-book-structure} indexed by market symbols
     */
    async watchOrderBook (symbol: string, limit: Int = undefined, params = {}): Promise<OrderBook> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const marketInfo = this.safeDict (market, 'info', {});
        const clobTokenIds = this.safeValue (marketInfo, 'clobTokenIds', []);
        let assetId = this.safeString2 (params, 'asset_id', 'token_id'); // Support both for backward compatibility
        // If asset_id not provided, use first token ID from market
        if (assetId === undefined) {
            if (Array.isArray (clobTokenIds) && clobTokenIds.length > 0) {
                assetId = clobTokenIds[0];
            } else {
                throw new ArgumentsRequired (this.id + ' watchOrderBook() requires asset_id parameter when market has multiple outcomes');
            }
        }
        const url = this.urls['api']['ws']['market'];
        const messageHash = 'orderbook:' + symbol + ':' + assetId;
        const request: Dict = {
            'type': this.options['wsMarketChannelType'],
            'assets_ids': [ assetId ],
        };
        const subscription: Dict = {
            'symbol': symbol,
            'asset_id': assetId,
        };
        const orderbook = await this.watch (url, messageHash, request, messageHash, subscription);
        return orderbook.limit (limit);
    }

    /**
     * @method
     * @name polymarket#watchTrades
     * @description get the list of most recent trades for a particular symbol
     * @param {string} symbol unified symbol of the market to fetch trades for
     * @param {int} [since] timestamp in ms of the earliest trade to fetch
     * @param {int} [limit] the maximum amount of trades to fetch
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.asset_id] the asset ID for the specific outcome (required if market has multiple outcomes)
     * @returns {object[]} a list of [trade structures]{@link https://docs.ccxt.com/#/?id=public-trades}
     */
    async watchTrades (symbol: string, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const marketInfo = this.safeDict (market, 'info', {});
        const clobTokenIds = this.safeValue (marketInfo, 'clobTokenIds', []);
        let assetId = this.safeString2 (params, 'asset_id', 'token_id'); // Support both for backward compatibility
        // If asset_id not provided, use first token ID from market
        if (assetId === undefined) {
            if (Array.isArray (clobTokenIds) && clobTokenIds.length > 0) {
                assetId = clobTokenIds[0];
            } else {
                throw new ArgumentsRequired (this.id + ' watchTrades() requires asset_id parameter when market has multiple outcomes');
            }
        }
        const url = this.urls['api']['ws']['market'];
        const messageHash = 'trades:' + symbol + ':' + assetId;
        const request: Dict = {
            'type': this.options['wsMarketChannelType'],
            'assets_ids': [ assetId ],
        };
        const subscription: Dict = {
            'symbol': symbol,
            'asset_id': assetId,
        };
        const trades = await this.watch (url, messageHash, request, messageHash, subscription);
        if (this.newUpdates) {
            limit = trades.getLimit (symbol, limit);
        }
        return this.filterBySymbolSinceLimit (trades, symbol, since, limit, true);
    }

    /**
     * @method
     * @name polymarket#watchTicker
     * @description watches a price ticker, a statistical calculation with the information calculated over the past 24 hours for a specific market
     * @param {string} symbol unified symbol of the market to fetch the ticker for
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.asset_id] the asset ID for the specific outcome (required if market has multiple outcomes)
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/#/?id=ticker-structure}
     */
    async watchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const marketInfo = this.safeDict (market, 'info', {});
        const clobTokenIds = this.safeValue (marketInfo, 'clobTokenIds', []);
        let assetId = this.safeString2 (params, 'asset_id', 'token_id'); // Support both for backward compatibility
        // If asset_id not provided, use first token ID from market
        if (assetId === undefined) {
            if (Array.isArray (clobTokenIds) && clobTokenIds.length > 0) {
                assetId = clobTokenIds[0];
            } else {
                throw new ArgumentsRequired (this.id + ' watchTicker() requires asset_id parameter when market has multiple outcomes');
            }
        }
        const url = this.urls['api']['ws']['market'];
        const messageHash = 'ticker:' + symbol + ':' + assetId;
        const request: Dict = {
            'type': this.options['wsMarketChannelType'],
            'assets_ids': [ assetId ],
            'custom_feature_enabled': false,
        };
        const subscription: Dict = {
            'symbol': symbol,
            'asset_id': assetId,
        };
        return await this.watch (url, messageHash, request, messageHash, subscription);
    }

    /**
     * @method
     * @name polymarket#watchMarkets
     * @description watches for new and resolved markets
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {boolean} [params.custom_feature_enabled] enable custom features like market updates (default false)
     * @returns {object} A dictionary of [market structures]{@link https://docs.ccxt.com/#/?id=market-structure} indexed by market symbols
     */
    async watchMarkets (params = {}): Promise<any> {
        await this.loadMarkets ();
        const customFeatureEnabled = this.safeBool (params, 'custom_feature_enabled', false);
        const url = this.urls['api']['ws']['market'];
        const messageHash = 'markets';
        const request: Dict = {
            'type': this.options['wsMarketChannelType'],
            'custom_feature_enabled': customFeatureEnabled,
        };
        const subscription: Dict = {
            'custom_feature_enabled': customFeatureEnabled,
        };
        return await this.watch (url, messageHash, request, messageHash, subscription);
    }

    /**
     * @method
     * @name polymarket#watchOrders
     * @description watches information on an order made by the user
     * @param {string} [symbol] unified symbol of the market the order was made in
     * @param {int} [since] timestamp in ms of the earliest order to watch
     * @param {int} [limit] the maximum amount of orders to watch
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} An [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
     */
    async watchOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        await this.authenticate (params);
        let messageHash = 'orders';
        const url = this.urls['api']['ws']['user'];
        let request: Dict = {
            'type': this.options['wsUserChannelType'],
        };
        if (symbol !== undefined) {
            symbol = this.safeSymbol (symbol);
            messageHash = messageHash + ':' + symbol;
            const market = this.market (symbol);
            const marketInfo = this.safeDict (market, 'info', {});
            const conditionId = this.safeString (marketInfo, 'condition_id', market['id']);
            if (conditionId !== undefined) {
                request['markets'] = [ conditionId ];
            }
        }
        const orders = await this.watch (url, messageHash, request, messageHash);
        if (this.newUpdates) {
            limit = orders.getLimit (symbol, limit);
        }
        return this.filterBySymbolSinceLimit (orders, symbol, since, limit, true);
    }

    /**
     * @method
     * @name polymarket#watchMyTrades
     * @description get the list of trades associated with the user
     * @param {string} [symbol] unified symbol of the market to fetch trades for
     * @param {int} [since] timestamp in ms of the earliest trade to fetch
     * @param {int} [limit] the maximum amount of trades to fetch
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [trade structures]{@link https://docs.ccxt.com/#/?id=public-trades}
     */
    async watchMyTrades (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        await this.authenticate (params);
        let messageHash = 'myTrades';
        const url = this.urls['api']['ws']['user'];
        let request: Dict = {
            'type': this.options['wsUserChannelType'],
        };
        if (symbol !== undefined) {
            symbol = this.safeSymbol (symbol);
            messageHash = messageHash + ':' + symbol;
            const market = this.market (symbol);
            const marketInfo = this.safeDict (market, 'info', {});
            const conditionId = this.safeString (marketInfo, 'condition_id', market['id']);
            if (conditionId !== undefined) {
                request['markets'] = [ conditionId ];
            }
        }
        const trades = await this.watch (url, messageHash, request, messageHash);
        if (this.newUpdates) {
            limit = trades.getLimit (symbol, limit);
        }
        return this.filterBySymbolSinceLimit (trades, symbol, since, limit, true);
    }

    handleOrderBook (client: Client, message) {
        //
        // Market websocket order book event:
        //     {
        //         "event_type": "book",
        //         "asset_id": "0x...",
        //         "bids": [[price, size], ...],
        //         "asks": [[price, size], ...],
        //         "timestamp": 1234567890
        //     }
        //
        // Or array of events:
        //     [{...}, {...}]
        //
        let messages = [];
        if (Array.isArray (message)) {
            messages = message;
        } else {
            messages = [ message ];
        }
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const eventType = this.safeString (msg, 'event_type');
            if (eventType !== 'book') {
                continue;
            }
            const assetId = this.safeString (msg, 'asset_id');
            // Find symbol and asset_id from subscriptions
            let symbol = undefined;
            let subscriptionAssetId = undefined;
            const subscriptionKeys = Object.keys (client.subscriptions);
            for (let j = 0; j < subscriptionKeys.length; j++) {
                const subscribeHash = subscriptionKeys[j];
                const subscription = client.subscriptions[subscribeHash];
                if (subscription != null) {
                    const subAssetId = this.safeString2 (subscription, 'asset_id', 'token_id'); // Support both for backward compatibility
                    if (subAssetId === assetId) {
                        symbol = this.safeString (subscription, 'symbol');
                        subscriptionAssetId = subAssetId;
                        break;
                    }
                }
            }
            if (symbol === undefined) {
                // Try to resolve from asset_id
                const market = this.safeMarket (assetId);
                symbol = market['symbol'];
                subscriptionAssetId = assetId;
            }
            const messageHash = 'orderbook:' + symbol + ':' + subscriptionAssetId;
            if (!(symbol in this.orderbooks)) {
                this.orderbooks[symbol] = this.orderBook ({});
            }
            const orderbook = this.orderbooks[symbol];
            // Polymarket docs use `buys`/`sells` with OrderSummary objects, but some payloads use `bids`/`asks`
            const rawBids = this.safeValue2 (msg, 'bids', 'buys', []);
            const rawAsks = this.safeValue2 (msg, 'asks', 'sells', []);
            const bids = [];
            const bidLevels = this.toArray (rawBids);
            for (let j = 0; j < bidLevels.length; j++) {
                const level = bidLevels[j];
                if (Array.isArray (level)) {
                    bids.push (level);
                } else if (typeof level === 'object') {
                    const price = this.safeString (level, 'price');
                    const size = this.safeString (level, 'size');
                    if (price !== undefined && size !== undefined) {
                        bids.push ([ price, size ]);
                    }
                }
            }
            const asks = [];
            const askLevels = this.toArray (rawAsks);
            for (let j = 0; j < askLevels.length; j++) {
                const level = askLevels[j];
                if (Array.isArray (level)) {
                    asks.push (level);
                } else if (typeof level === 'object') {
                    const price = this.safeString (level, 'price');
                    const size = this.safeString (level, 'size');
                    if (price !== undefined && size !== undefined) {
                        asks.push ([ price, size ]);
                    }
                }
            }
            const rawTimestamp = this.safeInteger (msg, 'timestamp');
            let timestamp = undefined;
            if (rawTimestamp !== undefined) {
                if (rawTimestamp > 1000000000000) {
                    timestamp = rawTimestamp;
                } else {
                    timestamp = rawTimestamp * 1000;
                }
            }
            let datetime = undefined;
            if (timestamp !== undefined) {
                datetime = this.iso8601 (timestamp);
            }
            const snapshot = this.parseOrderBook ({ 'bids': bids, 'asks': asks }, symbol, timestamp);
            orderbook.reset (snapshot);
            orderbook['symbol'] = symbol;
            orderbook['timestamp'] = timestamp;
            orderbook['datetime'] = datetime;
            client.resolve (orderbook, messageHash);
        }
    }

    handlePriceChangeOrderBook (client: Client, message) {
        //
        // Market websocket price_change event for orderbook updates:
        //     {
        //         "event_type": "price_change",
        //         "market": "0x...",
        //         "price_changes": [
        //             {
        //                 "asset_id": "0x...",
        //                 "price": "0.5",
        //                 "size": "200",
        //                 "side": "BUY",
        //                 "hash": "0x...",
        //                 "best_bid": "0.5",
        //                 "best_ask": "1"
        //             }
        //         ],
        //         "timestamp": "1757908892351"
        //     }
        //
        // Docs: https://docs.polymarket.com/developers/CLOB/websocket/market-channel#price-change-message
        //
        let messages = [];
        if (Array.isArray (message)) {
            messages = message;
        } else {
            messages = [ message ];
        }
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const eventType = this.safeString (msg, 'event_type');
            if (eventType !== 'price_change') {
                continue;
            }
            const priceChanges = this.safeValue (msg, 'price_changes', []);
            if (!Array.isArray (priceChanges) || priceChanges.length === 0) {
                continue;
            }
            const rawTimestamp = this.safeInteger (msg, 'timestamp');
            let timestamp = undefined;
            if (rawTimestamp !== undefined) {
                if (rawTimestamp > 1000000000000) {
                    timestamp = rawTimestamp;
                } else {
                    timestamp = rawTimestamp * 1000;
                }
            }
            // Process each price change
            for (let k = 0; k < priceChanges.length; k++) {
                const priceChange = priceChanges[k];
                const assetId = this.safeString (priceChange, 'asset_id');
                if (assetId === undefined) {
                    continue;
                }
                // Find symbol and asset_id from subscriptions
                let symbol = undefined;
                let subscriptionAssetId = undefined;
                const subscriptionKeys = Object.keys (client.subscriptions);
                for (let j = 0; j < subscriptionKeys.length; j++) {
                    const subscribeHash = subscriptionKeys[j];
                    const subscription = client.subscriptions[subscribeHash];
                    if (subscription != null) {
                        const subAssetId = this.safeString2 (subscription, 'asset_id', 'token_id');
                        if (subAssetId === assetId) {
                            symbol = this.safeString (subscription, 'symbol');
                            subscriptionAssetId = subAssetId;
                            break;
                        }
                    }
                }
                if (symbol === undefined) {
                    // Try to resolve from asset_id
                    const market = this.safeMarket (assetId);
                    symbol = market['symbol'];
                    subscriptionAssetId = assetId;
                }
                const messageHash = 'orderbook:' + symbol + ':' + subscriptionAssetId;
                // Get or create orderbook
                if (!(symbol in this.orderbooks)) {
                    this.orderbooks[symbol] = this.orderBook ({});
                }
                const orderbook = this.orderbooks[symbol];
                // Get price and size from price change
                const price = this.safeString (priceChange, 'price');
                const size = this.safeString (priceChange, 'size');
                const side = this.safeString (priceChange, 'side', '').toUpperCase ();
                if (price === undefined) {
                    continue;
                }
                // Convert size to number for comparison
                const sizeNum = this.safeNumber (priceChange, 'size', 0);
                // Update orderbook side based on side field
                if (side === 'BUY') {
                    // Update bids side
                    if (sizeNum === 0) {
                        // Remove price level if size is 0
                        orderbook['bids'].storeArray ([ price, '0' ]);
                    } else {
                        // Update or add price level
                        orderbook['bids'].storeArray ([ price, size ]);
                    }
                } else if (side === 'SELL') {
                    // Update asks side
                    if (sizeNum === 0) {
                        // Remove price level if size is 0
                        orderbook['asks'].storeArray ([ price, '0' ]);
                    } else {
                        // Update or add price level
                        orderbook['asks'].storeArray ([ price, size ]);
                    }
                }
                // Update timestamp
                if (timestamp !== undefined) {
                    orderbook['timestamp'] = timestamp;
                    orderbook['datetime'] = this.iso8601 (timestamp);
                }
                orderbook['symbol'] = symbol;
                client.resolve (orderbook, messageHash);
            }
        }
    }

    handleTrades (client: Client, message) {
        //
        // Market websocket trade event:
        //     {
        //         "event_type": "trade",
        //         "asset_id": "0x...",
        //         "trade_id": "0x...",
        //         "price": "0.5",
        //         "size": "100",
        //         "side": "buy",
        //         "timestamp": 1234567890
        //     }
        //
        let messages = [];
        if (Array.isArray (message)) {
            messages = message;
        } else {
            messages = [ message ];
        }
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const eventType = this.safeString (msg, 'event_type');
            if (eventType !== 'trade') {
                continue;
            }
            const assetId = this.safeString (msg, 'asset_id');
            // Find symbol and asset_id from subscriptions
            let symbol = undefined;
            let subscriptionAssetId = undefined;
            const subscriptionKeys = Object.keys (client.subscriptions);
            for (let j = 0; j < subscriptionKeys.length; j++) {
                const subscribeHash = subscriptionKeys[j];
                const subscription = client.subscriptions[subscribeHash];
                if (typeof subscription === 'object') {
                    const subAssetId = this.safeString2 (subscription, 'asset_id', 'token_id'); // Support both for backward compatibility
                    if (subAssetId === assetId) {
                        symbol = this.safeString (subscription, 'symbol');
                        subscriptionAssetId = subAssetId;
                        break;
                    }
                }
            }
            if (symbol === undefined) {
                // Try to resolve from asset_id
                const market = this.safeMarket (assetId);
                symbol = market['symbol'];
                subscriptionAssetId = assetId;
            }
            const messageHash = 'trades:' + symbol + ':' + subscriptionAssetId;
            let stored = this.safeValue (this.trades, symbol);
            if (stored === undefined) {
                const limit = this.safeInteger (this.options, 'tradesLimit', 1000);
                stored = new ArrayCache (limit);
                this.trades[symbol] = stored;
            }
            const market = this.market (symbol);
            const trade = this.parseTrade (msg, market);
            // Normalize WS timestamp (Polymarket typically sends ms timestamps in WS payloads)
            const rawTimestamp = this.safeInteger (msg, 'timestamp');
            let wsTimestamp = undefined;
            if (rawTimestamp !== undefined) {
                if (rawTimestamp > 1000000000000) {
                    wsTimestamp = rawTimestamp;
                } else {
                    wsTimestamp = rawTimestamp * 1000;
                }
            }
            if (wsTimestamp !== undefined) {
                trade['timestamp'] = wsTimestamp;
                trade['datetime'] = this.iso8601 (wsTimestamp);
            }
            stored.append (trade);
            client.resolve (stored, messageHash);
        }
    }

    handleTicker (client: Client, message) {
        //
        // Market websocket ticker events:
        //     {
        //         "event_type": "price_change",
        //         "asset_id": "0x...",
        //         "price": "0.5",
        //         "timestamp": 1234567890
        //     }
        //     {
        //         "event_type": "last_trade_price",
        //         "asset_id": "0x...",
        //         "price": "0.5",
        //         "timestamp": 1234567890
        //     }
        //
        let messages = [];
        if (Array.isArray (message)) {
            messages = message;
        } else {
            messages = [ message ];
        }
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const eventType = this.safeString (msg, 'event_type');
            if (eventType !== 'price_change' && eventType !== 'last_trade_price') {
                continue;
            }
            // `last_trade_price` is per-asset, but `price_change` can be a batch containing `price_changes[]`.
            // Docs: https://docs.polymarket.com/developers/CLOB/websocket/market-channel#price-change-message
            const rawTimestamp = this.safeInteger (msg, 'timestamp');
            let timestamp = undefined;
            if (rawTimestamp !== undefined) {
                if (rawTimestamp > 1000000000000) {
                    timestamp = rawTimestamp;
                } else {
                    timestamp = rawTimestamp * 1000;
                }
            }
            const priceChanges = this.safeValue (msg, 'price_changes');
            let updates: any[] = [];
            if (eventType === 'price_change' && Array.isArray (priceChanges)) {
                updates = priceChanges;
            } else {
                updates = [ msg ];
            }
            for (let k = 0; k < updates.length; k++) {
                const update = updates[k];
                const assetId = this.safeString (update, 'asset_id', this.safeString (msg, 'asset_id'));
                if (assetId === undefined) {
                    continue;
                }
                // Find symbol and asset_id from subscriptions
                let symbol = undefined;
                let subscriptionAssetId = undefined;
                const subscriptionKeys = Object.keys (client.subscriptions);
                for (let j = 0; j < subscriptionKeys.length; j++) {
                    const subscribeHash = subscriptionKeys[j];
                    const subscription = client.subscriptions[subscribeHash];
                    if (typeof subscription === 'object') {
                        const subAssetId = this.safeString2 (subscription, 'asset_id', 'token_id'); // Support both for backward compatibility
                        if (subAssetId === assetId) {
                            symbol = this.safeString (subscription, 'symbol');
                            subscriptionAssetId = subAssetId;
                            break;
                        }
                    }
                }
                if (symbol === undefined) {
                    // Try to resolve from asset_id
                    const market = this.safeMarket (assetId);
                    symbol = market['symbol'];
                    subscriptionAssetId = assetId;
                }
                const messageHash = 'ticker:' + symbol + ':' + subscriptionAssetId;
                const market = this.market (symbol);
                const prev = this.safeValue (this.tickers, symbol, {});
                const last = this.safeNumber (update, 'price', this.safeNumber (msg, 'price', this.safeNumber (prev, 'last')));
                const bid = this.safeNumber (update, 'best_bid', this.safeNumber (prev, 'bid', last));
                const ask = this.safeNumber (update, 'best_ask', this.safeNumber (prev, 'ask', last));
                let info = msg;
                if (eventType === 'price_change') {
                    info = update;
                }
                let datetime = undefined;
                if (timestamp !== undefined) {
                    datetime = this.iso8601 (timestamp);
                }
                const ticker: Ticker = {
                    'symbol': symbol,
                    'info': info,
                    'timestamp': timestamp,
                    'datetime': datetime,
                    'last': last,
                    'bid': bid,
                    'bidVolume': undefined,
                    'ask': ask,
                    'askVolume': undefined,
                    'high': undefined,
                    'low': undefined,
                    'open': undefined,
                    'close': last,
                    'previousClose': undefined,
                    'change': undefined,
                    'percentage': undefined,
                    'average': undefined,
                    'baseVolume': undefined,
                    'quoteVolume': undefined,
                    'vwap': undefined,
                    'indexPrice': undefined,
                    'markPrice': undefined,
                };
                this.tickers[symbol] = ticker;
                client.resolve (ticker, messageHash);
            }
        }
    }

    handleOrders (client: Client, message) {
        //
        // User websocket order event:
        //     {
        //         "event_type": "order",
        //         "order_id": "0x...",
        //         "asset_id": "0x...",
        //         "side": "buy",
        //         "price": "0.5",
        //         "size": "100",
        //         "status": "open",
        //         "timestamp": 1234567890
        //     }
        //
        const eventType = this.safeString (message, 'event_type');
        if (eventType !== 'order') {
            return;
        }
        const messageHash = 'orders';
        let stored = this.orders;
        if (stored === undefined) {
            const limit = this.safeInteger (this.options, 'ordersLimit', 1000);
            stored = new ArrayCacheBySymbolById (limit);
            this.orders = stored;
        }
        const order = this.parseOrder (message);
        const rawTimestamp = this.safeInteger (message, 'timestamp');
        let wsTimestamp = undefined;
        if (rawTimestamp !== undefined) {
            if (rawTimestamp > 1000000000000) {
                wsTimestamp = rawTimestamp;
            } else {
                wsTimestamp = rawTimestamp * 1000;
            }
        }
        if (wsTimestamp !== undefined) {
            order['timestamp'] = wsTimestamp;
            order['datetime'] = this.iso8601 (wsTimestamp);
        }
        const orderSymbols: Dict = {};
        orderSymbols[order['symbol']] = true;
        stored.append (order);
        const unique = Object.keys (orderSymbols);
        for (let i = 0; i < unique.length; i++) {
            const symbol = unique[i];
            const symbolSpecificMessageHash = messageHash + ':' + symbol;
            client.resolve (stored, symbolSpecificMessageHash);
        }
        client.resolve (stored, messageHash);
    }

    handleMyTrades (client: Client, message) {
        //
        // User websocket trade event:
        //     {
        //         "event_type": "trade",
        //         "trade_id": "0x...",
        //         "asset_id": "0x...",
        //         "side": "buy",
        //         "price": "0.5",
        //         "size": "100",
        //         "timestamp": 1234567890
        //     }
        //
        const eventType = this.safeString (message, 'event_type');
        if (eventType !== 'trade') {
            return;
        }
        const messageHash = 'myTrades';
        let stored = this.myTrades;
        if (stored === undefined) {
            const limit = this.safeInteger (this.options, 'tradesLimit', 1000);
            stored = new ArrayCacheBySymbolById (limit);
            this.myTrades = stored;
        }
        const trade = this.parseTrade (message);
        const rawTimestamp = this.safeInteger (message, 'timestamp');
        let wsTimestamp = undefined;
        if (rawTimestamp !== undefined) {
            if (rawTimestamp > 1000000000000) {
                wsTimestamp = rawTimestamp;
            } else {
                wsTimestamp = rawTimestamp * 1000;
            }
        }
        if (wsTimestamp !== undefined) {
            trade['timestamp'] = wsTimestamp;
            trade['datetime'] = this.iso8601 (wsTimestamp);
        }
        const tradeSymbols: Dict = {};
        tradeSymbols[trade['symbol']] = true;
        stored.append (trade);
        const unique = Object.keys (tradeSymbols);
        const uniqueLength = unique.length;
        if (uniqueLength === 0) {
            return;
        }
        for (let i = 0; i < unique.length; i++) {
            const symbol = unique[i];
            const symbolSpecificMessageHash = messageHash + ':' + symbol;
            client.resolve (stored, symbolSpecificMessageHash);
        }
        client.resolve (stored, messageHash);
    }

    handleMessage (client: Client, message) {
        //
        // Market websocket messages can be:
        //     - Single event object: {"event_type": "book", ...}
        //     - Array of events: [{"event_type": "book", ...}, ...]
        //     - Ready event: {"event": "ready"} or similar (check Python code)
        //
        // User websocket messages:
        //     - Single event object: {"event_type": "order", ...}
        //
        // Check for ready event first (Polymarket may send this)
        const event = this.safeString (message, 'event');
        if (event === 'ready' || event === 'connected') {
            // Connection ready - subscriptions are sent automatically by base watch() method
            return;
        }
        if (Array.isArray (message)) {
            // Handle array of events (market websocket)
            this.handleMarketEvents (client, message);
        } else {
            const eventType = this.safeString (message, 'event_type');
            const url = client.url;
            // Determine which websocket based on URL
            if (url.indexOf ('/ws/market') >= 0) {
                // Market websocket
                this.handleMarketEvent (client, message, eventType);
            } else if (url.indexOf ('/ws/user') >= 0) {
                // User websocket
                this.handleUserEvent (client, message, eventType);
            } else if (url.indexOf ('ws-live-data') >= 0) {
                // Live data websocket - not implemented yet
                if (this.verbose) {
                    this.log ('Live data websocket message:', message);
                }
            }
        }
    }

    handleMarketEvents (client: Client, messages: any[]) {
        // Handle array of market events
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const eventType = this.safeString (msg, 'event_type');
            this.handleMarketEvent (client, msg, eventType);
        }
    }

    handleMarketEvent (client: Client, message: any, eventType: string) {
        if (eventType === 'book') {
            this.handleOrderBook (client, message);
        } else if (eventType === 'trade') {
            this.handleTrades (client, message);
        } else if (eventType === 'price_change') {
            // price_change updates both orderbook and ticker
            this.handlePriceChangeOrderBook (client, message);
            this.handleTicker (client, message);
        } else if (eventType === 'last_trade_price') {
            this.handleTicker (client, message);
        } else if (eventType === 'tick_size_change') {
            // Tick size change - can be used to update ticker
            if (this.verbose) {
                this.log ('Tick size change event:', message);
            }
        } else if (eventType === 'new_market') {
            const marketsSubscription = this.safeValue (client.subscriptions, 'markets');
            const customFeatureEnabled = marketsSubscription ? this.safeBool (marketsSubscription, 'custom_feature_enabled', false) : false;
            if (customFeatureEnabled) {
                this.handleNewMarket (client, message);
            }
        } else if (eventType === 'market_resolved') {
            const marketsSubscription = this.safeValue (client.subscriptions, 'markets');
            const customFeatureEnabled = marketsSubscription ? this.safeBool (marketsSubscription, 'custom_feature_enabled', false) : false;
            if (customFeatureEnabled) {
                this.handleMarketResolved (client, message);
            }
        } else {
            // Unknown event type, log but don't error
            if (this.verbose) {
                this.log ('Unknown market websocket event type:', eventType, message);
            }
        }
    }

    handleUserEvent (client: Client, message: any, eventType: string) {
        if (eventType === 'order') {
            this.handleOrders (client, message);
        } else if (eventType === 'trade') {
            this.handleMyTrades (client, message);
        } else {
            // Unknown event type, log but don't error
            if (this.verbose) {
                this.log ('Unknown user websocket event type:', eventType, message);
            }
        }
    }

    handleNewMarket (client: Client, message) {
        // Handle new market event
        // Docs: https://docs.polymarket.com/developers/CLOB/websocket/market-channel#new_market-message
        const marketData = this.safeDict (message, 'market', {});
        const marketId = this.safeString (marketData, 'id');
        if (marketId) {
            // Update marketUpdates cache
            if (!this.marketUpdates) {
                this.marketUpdates = {};
            }
            this.marketUpdates[marketId] = {
                'event_type': 'new_market',
                'market': marketData,
            };
            client.resolve (this.marketUpdates, 'markets');
        }
    }

    handleMarketResolved (client: Client, message) {
        // Handle market resolved event
        // Docs: https://docs.polymarket.com/developers/CLOB/websocket/market-channel#market_resolved-message
        const marketData = this.safeDict (message, 'market', {});
        const marketId = this.safeString (marketData, 'id');
        if (marketId) {
            // Update marketUpdates cache
            if (!this.marketUpdates) {
                this.marketUpdates = {};
            }
            this.marketUpdates[marketId] = {
                'event_type': 'market_resolved',
                'market': marketData,
            };
            client.resolve (this.marketUpdates, 'markets');
        }
    }

    async authenticate (params = {}) {
        const url = this.urls['api']['ws']['user'];
        const client = this.client (url);
        const messageHash = 'authenticated';
        let future = this.safeValue (client.subscriptions, messageHash);
        if (future === undefined) {
            // Get API credentials
            const creds = await this.ensureApiCredentials (params);
            // Build auth payload matching Python implementation
            // auth=creds.model_dump(by_alias=True) in Python becomes:
            const auth: Dict = {
                'apiKey': creds['apiKey'],
                'secret': creds['secret'],
                'passphrase': creds['passphrase'],
            };
            const request: Dict = {
                'auth': auth,
                'type': this.options['wsUserChannelType'],
            };
            future = await this.watch (url, messageHash, request, messageHash);
            client.subscriptions[messageHash] = future;
        }
        return future;
    }

    async watch (url: string, messageHash: string, message = undefined, subscribeHash = undefined, subscription = undefined) {
        const client = this.client (url);
        if (subscribeHash === undefined) {
            subscribeHash = messageHash;
        }
        // Handle market channel subscriptions with dynamic subscribe/unsubscribe (following onetrading pattern)
        if (subscription !== undefined && url.indexOf ('/ws/market') >= 0) {
            // Use wsMarketChannelType for subscription hash
            const channelSubscriptionHash = this.options['wsMarketChannelType'];
            // Extract asset_id from message or subscription
            let assetId: string | undefined = undefined;
            if (message && typeof message === 'object') {
                const assetsIds = this.safeValue (message, 'assets_ids', []);
                if (Array.isArray (assetsIds) && assetsIds.length > 0) {
                    assetId = this.safeString (assetsIds, 0);
                }
            }
            if (assetId === undefined) {
                assetId = this.safeString2 (subscription, 'asset_id', 'token_id');
            }
            if (assetId !== undefined) {
                // Get existing subscription or create new one
                let channelSubscription = this.safeValue (client.subscriptions, channelSubscriptionHash, {});
                if (typeof channelSubscription !== 'object' || Array.isArray (channelSubscription)) {
                    channelSubscription = {};
                }
                // Check if we're already connected
                const isConnected = client.connection && client.connection.readyState === 1; // WebSocket.OPEN = 1
                // Check if asset_id needs to be added
                const needsSubscribe = !(assetId in channelSubscription);
                if (isConnected && needsSubscribe) {
                    // Connection exists and asset_id not subscribed - use dynamic subscribe
                    await this.subscribeToAssetIds ([ assetId ]);
                }
                // Add asset_id to subscription tracking
                channelSubscription[assetId] = true;
                client.subscriptions[channelSubscriptionHash] = channelSubscription;
                // Build message with all subscribed asset_ids (following onetrading pattern)
                const allAssetIds = Object.keys (channelSubscription);
                if (message && typeof message === 'object') {
                    message['assets_ids'] = allAssetIds;
                    message['type'] = this.options['wsMarketChannelType'];
                }
                // Store individual subscription info for message routing
                if (!(subscribeHash in client.subscriptions)) {
                    client.subscriptions[subscribeHash] = subscription;
                }
            }
        }
        return await super.watch (url, messageHash, message, subscribeHash, subscription);
    }

    /**
     * @method
     * @name polymarket#subscribeToAssetIds
     * @description Dynamically subscribe to additional asset IDs on an existing market channel connection
     * @param {string[]} asset_ids list of asset IDs to subscribe to
     * @param {object} [params] extra parameters
     * @returns {Promise<void>}
     */
    async subscribeToAssetIds (asset_ids: string[], params = {}) {
        const url = this.urls['api']['ws']['market'];
        const client = this.client (url);
        if (!(client.connection && client.connection.readyState === 1)) {
            throw new ExchangeError (this.id + ' subscribeToAssetIds() requires an active WebSocket connection');
        }
        const channelSubscriptionHash = this.options['wsMarketChannelType'];
        let channelSubscription = this.safeValue (client.subscriptions, channelSubscriptionHash, {});
        if (typeof channelSubscription !== 'object' || Array.isArray (channelSubscription)) {
            channelSubscription = {};
        }
        // Filter out already subscribed asset_ids
        const newAssetIds = []
        for (let i = 0; i < asset_ids.length; i++) {
            const aid = asset_ids[i];
            if (!(aid in channelSubscription)) {
                newAssetIds.push (aid);
            }
        }
        if (newAssetIds.length === 0) {
            return; // All already subscribed
        }
        const request: Dict = {
            'assets_ids': newAssetIds,
            'operation': 'subscribe',
        };
        await client.send (request);
        // Track newly subscribed asset_ids
        for (let i = 0; i < newAssetIds.length; i++) {
            const aid = newAssetIds[i];
            channelSubscription[aid] = true;
        }
        client.subscriptions[channelSubscriptionHash] = channelSubscription;
    }

    /**
     * @method
     * @name polymarket#unsubscribeFromAssetIds
     * @description Dynamically unsubscribe from asset IDs on an existing market channel connection
     * @param {string[]} asset_ids list of asset IDs to unsubscribe from
     * @param {object} [params] extra parameters
     * @returns {Promise<void>}
     */
    async unsubscribeFromAssetIds (asset_ids: string[], params = {}) {
        const url = this.urls['api']['ws']['market'];
        const client = this.client (url);
        if (!(client.connection && client.connection.readyState === 1)) {
            throw new ExchangeError (this.id + ' unsubscribeFromAssetIds() requires an active WebSocket connection');
        }
        const channelSubscriptionHash = this.options['wsMarketChannelType'];
        let channelSubscription = this.safeValue (client.subscriptions, channelSubscriptionHash, {});
        if (typeof channelSubscription !== 'object' || Array.isArray (channelSubscription)) {
            channelSubscription = {};
        }
        // Filter to only unsubscribe from actually subscribed asset_ids
        const subscribedAssetIds = []
        for (let i = 0; i < asset_ids.length; i++) {
            const aid = asset_ids[i];
            if (aid in channelSubscription) {
                subscribedAssetIds.push(aid);
            }
        }
        if (subscribedAssetIds.length === 0) {
            return; // None are subscribed
        }
        const request = {}
        request['assets_ids'] = subscribedAssetIds;
        request['operation'] = 'unsubscribe';
        await client.send (request);
        // Remove from tracking
        for (let i = 0; i < subscribedAssetIds.length; i++) {
            const aid = subscribedAssetIds[i];
            delete channelSubscription[aid];
        }
        client.subscriptions[channelSubscriptionHash] = channelSubscription;
    }

    onConnected (client: Client) {
        // Called when websocket connection is established
        // The base watch() method will send the message automatically
        // The message parameter passed to watch() is sent when the connection opens
        // This is equivalent to the on_open handler in the example code
        super.onConnected (client);
    }
}

