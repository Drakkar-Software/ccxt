import ccxt from '../../js/ccxt.js';

// AUTO-TRANSPILE #

/**
 * Polymarket Websocket Example
 *
 * This example demonstrates how to use CCXT with Polymarket websocket streams
 * for real-time market data and user events.
 *
 * Features demonstrated:
 * - Watching order book updates (watchOrderBook)
 * - Watching trade updates (watchTrades)
 * - Watching ticker/price updates (watchTicker)
 * - Watching user orders (watchOrders) - requires authentication
 * - Watching user trades (watchMyTrades) - requires authentication
 *
 * Authentication (choose one method):
 *
 * Method 1: Direct API Credentials (recommended if you already have them)
 * - Set POLYMARKET_API_KEY environment variable (your CLOB API key)
 * - Set POLYMARKET_SECRET environment variable (your CLOB API secret)
 * - Set POLYMARKET_PASSWORD environment variable (your CLOB API passphrase)
 * - Set POLYMARKET_FUNDER environment variable (main wallet that holds funds)
 * - Optional: POLYMARKET_PROXY_WALLET (proxy wallet for Data-API endpoints)
 * - Optional: POLYMARKET_BUILDER_WALLET (builder wallet for builder calls)
 *
 * Method 2: Generate from Private Key (lazy generation)
 * - Set POLYMARKET_PRIVATE_KEY environment variable (your wallet's private key)
 * - Set POLYMARKET_FUNDER environment variable (main wallet that holds funds)
 * - Optional: POLYMARKET_PROXY_WALLET (proxy wallet for Data-API endpoints)
 * - Optional: POLYMARKET_BUILDER_WALLET (builder wallet for builder calls)
 * - API credentials are automatically generated on first authenticated request
 *
 * Note: Public websocket methods (watchOrderBook, watchTrades, watchTicker) do not require authentication.
 * Private websocket methods (watchOrders, watchMyTrades) require authentication.
 *
 * Optional:
 * - Set POLYMARKET_CLOB_HOST environment variable (custom CLOB API endpoint, defaults to https://clob.polymarket.com)
 * - Set POLYMARKET_SIGNATURE_TYPE environment variable (0 = EOA default, 1 = Email/Magic wallet, 2 = Browser wallet proxy)
 * - Set POLYMARKET_CHAIN_ID environment variable (137 = Polygon mainnet default, 80001 = Polygon Mumbai testnet)
 * - Set POLYMARKET_SANDBOX environment variable (true/false to enable testnet mode)
 */

async function watchOrderbookExample (exchange: any, symbol: string) {
    // Example: Watch order book updates for a symbol
    console.log (`\n=== Watching Order Book for ${symbol} ===\n`);
    
    try {
        // Get market info to find asset IDs
        const market = exchange.market (symbol);
        const marketInfo = market['info'] || {};
        const assetId = marketInfo['asset_id'];
        
        if (!assetId) {
            console.log (`⚠️  Warning: No asset IDs found for ${symbol}`);
            console.log ('   Order book watching requires a asset_id parameter');
            return;
        }
        
        // Use first asset ID (you can specify which outcome to watch)   
        console.log (`Using asset ID: ${assetId}`);
        console.log (`Watching order book updates... (press Ctrl+C to stop)\n`);
        
        // Watch order book with asset_id parameter
        while (true) {
            try {
                const orderbook = await exchange.watchOrderBook (symbol, undefined, undefined, { 'asset_id': assetId });
                console.log ('Order Book Update:');
                console.log (`  Symbol: ${orderbook['symbol']}`);
                console.log (`  Timestamp: ${orderbook['datetime'] || 'N/A'}`);
                console.log (`  Bids: ${orderbook['bids'].length} levels`);
                console.log (`  Asks: ${orderbook['asks'].length} levels`);
                if (orderbook['bids'].length > 0) {
                    console.log (`  Best Bid: ${orderbook['bids'][0][0]} @ ${orderbook['bids'][0][1]}`);
                }
                if (orderbook['asks'].length > 0) {
                    console.log (`  Best Ask: ${orderbook['asks'][0][0]} @ ${orderbook['asks'][0][1]}`);
                }
                console.log ();
            } catch (e) {
                if (e instanceof Error && e.message.includes ('KeyboardInterrupt')) {
                    console.log ('\nStopped watching order book');
                    break;
                }
                console.log (`Error watching order book: ${e instanceof Error ? e.message : String (e)}`);
                await new Promise ((resolve) => setTimeout (resolve, 1000));
            }
        }
    } catch (e) {
        console.log (`Error in watch_orderbook_example: ${e instanceof Error ? e.message : String (e)}`);
    }
}

async function watchTradesExample (exchange: any, symbol: string) {
    // Example: Watch trade updates for a symbol
    console.log (`\n=== Watching Trades for ${symbol} ===\n`);
    
    try {
        // Get market info to find token IDs
        const market = exchange.market (symbol);
        const marketInfo = market['info'] || {};
        const assetId = marketInfo['asset_id'];
        
        if (!assetId) {
            console.log (`⚠️  Warning: No asset IDs found for ${symbol}`);
            console.log ('   Trade watching requires a asset_id parameter');
            return;
        }
        
        // Use first asset ID
        console.log (`Using asset ID: ${assetId}`);
        console.log (`Watching trade updates... (press Ctrl+C to stop)\n`);
        
        // Watch trades with asset_id parameter
        while (true) {
            try {
                const trades = await exchange.watchTrades (symbol, undefined, undefined, { 'asset_id': assetId });
                if (trades && trades.length > 0) {
                    const latestTrade = trades[trades.length - 1]; // Get most recent trade
                    console.log ('New Trade:');
                    console.log (`  Trade ID: ${latestTrade['id']}`);
                    console.log (`  Symbol: ${latestTrade['symbol']}`);
                    console.log (`  Side: ${latestTrade['side']}`);
                    console.log (`  Price: ${latestTrade['price']}`);
                    console.log (`  Amount: ${latestTrade['amount']}`);
                    console.log (`  Cost: ${latestTrade['cost']}`);
                    console.log (`  Timestamp: ${latestTrade['datetime']}`);
                    console.log ();
                }
            } catch (e) {
                if (e instanceof Error && e.message.includes ('KeyboardInterrupt')) {
                    console.log ('\nStopped watching trades');
                    break;
                }
                console.log (`Error watching trades: ${e instanceof Error ? e.message : String (e)}`);
                await new Promise ((resolve) => setTimeout (resolve, 1000));
            }
        }
    } catch (e) {
        console.log (`Error in watch_trades_example: ${e instanceof Error ? e.message : String (e)}`);
    }
}

async function watchTickerExample (exchange: any, symbol: string) {
    // Example: Watch ticker/price updates for a symbol
    console.log (`\n=== Watching Ticker for ${symbol} ===\n`);
    
    try {
        // Get market info to find asset IDs
        const market = exchange.market (symbol);
        const marketInfo = market['info'] || {};
        const assetId = marketInfo['asset_id'];
        
        if (!assetId) {
            console.log (`⚠️  Warning: No asset IDs found for ${symbol}`);
            console.log ('   Ticker watching requires a asset_id parameter');
            return;
        }
        
        // Use first asset ID
        console.log (`Using asset ID: ${assetId}`);
        console.log (`Watching ticker updates... (press Ctrl+C to stop)\n`);
        
        // Watch ticker with asset_id parameter
        while (true) {
            try {
                const ticker = await exchange.watchTicker (symbol, { 'asset_id': assetId });
                console.log ('Ticker Update:');
                console.log (`  Symbol: ${ticker['symbol']}`);
                console.log (`  Last Price: ${ticker['last'] || 'N/A'}`);
                console.log (`  Bid: ${ticker['bid'] || 'N/A'}`);
                console.log (`  Ask: ${ticker['ask'] || 'N/A'}`);
                console.log (`  Timestamp: ${ticker['datetime'] || 'N/A'}`);
                console.log ();
            } catch (e) {
                if (e instanceof Error && e.message.includes ('KeyboardInterrupt')) {
                    console.log ('\nStopped watching ticker');
                    break;
                }
                console.log (`Error watching ticker: ${e instanceof Error ? e.message : String (e)}`);
                await new Promise ((resolve) => setTimeout (resolve, 1000));
            }
        }
    } catch (e) {
        console.log (`Error in watch_ticker_example: ${e instanceof Error ? e.message : String (e)}`);
    }
}

async function watchOrdersExample (exchange: any) {
    // Example: Watch user orders (requires authentication)
    console.log ('\n=== Watching User Orders ===\n');
    
    try {
        console.log ('Watching order updates... (press Ctrl+C to stop)\n');
        
        while (true) {
            try {
                const orders = await exchange.watchOrders ();
                if (orders && orders.length > 0) {
                    const latestOrder = orders[orders.length - 1]; // Get most recent order
                    console.log ('Order Update:');
                    console.log (`  Order ID: ${latestOrder['id']}`);
                    console.log (`  Symbol: ${latestOrder['symbol']}`);
                    console.log (`  Side: ${latestOrder['side']}`);
                    console.log (`  Type: ${latestOrder['type']}`);
                    console.log (`  Status: ${latestOrder['status']}`);
                    console.log (`  Amount: ${latestOrder['amount']}`);
                    console.log (`  Filled: ${latestOrder['filled']}`);
                    console.log (`  Price: ${latestOrder['price']}`);
                    console.log (`  Timestamp: ${latestOrder['datetime']}`);
                    console.log ();
                }
            } catch (e) {
                if (e instanceof Error && e.message.includes ('KeyboardInterrupt')) {
                    console.log ('\nStopped watching orders');
                    break;
                }
                const errorMessage = e instanceof Error ? e.message : String (e);
                console.log (`Error watching orders: ${errorMessage}`);
                if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                    console.log ('  → This requires authentication. Please set credentials.');
                    break;
                }
                await new Promise ((resolve) => setTimeout (resolve, 1000));
            }
        }
    } catch (e) {
        console.log (`Error in watch_orders_example: ${e instanceof Error ? e.message : String (e)}`);
    }
}

async function watchMyTradesExample (exchange: any) {
    // Example: Watch user trades (requires authentication)
    console.log ('\n=== Watching User Trades ===\n');
    
    try {
        console.log ('Watching trade updates... (press Ctrl+C to stop)\n');
        
        while (true) {
            try {
                const trades = await exchange.watchMyTrades ();
                if (trades && trades.length > 0) {
                    const latestTrade = trades[trades.length - 1]; // Get most recent trade
                    console.log ('Trade Update:');
                    console.log (`  Trade ID: ${latestTrade['id']}`);
                    console.log (`  Symbol: ${latestTrade['symbol']}`);
                    console.log (`  Side: ${latestTrade['side']}`);
                    console.log (`  Price: ${latestTrade['price']}`);
                    console.log (`  Amount: ${latestTrade['amount']}`);
                    console.log (`  Cost: ${latestTrade['cost']}`);
                    const fee = latestTrade['fee'] || {};
                    console.log (`  Fee: ${fee['cost'] || 'N/A'}`);
                    console.log (`  Timestamp: ${latestTrade['datetime']}`);
                    console.log ();
                }
            } catch (e) {
                if (e instanceof Error && e.message.includes ('KeyboardInterrupt')) {
                    console.log ('\nStopped watching trades');
                    break;
                }
                const errorMessage = e instanceof Error ? e.message : String (e);
                console.log (`Error watching trades: ${errorMessage}`);
                if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                    console.log ('  → This requires authentication. Please set credentials.');
                    break;
                }
                await new Promise ((resolve) => setTimeout (resolve, 1000));
            }
        }
    } catch (e) {
        console.log (`Error in watch_my_trades_example: ${e instanceof Error ? e.message : String (e)}`);
    }
}

async function example () {
    // Initialize Polymarket exchange
    const exchangeOptions: any = {
        'enableRateLimit': true, // Enable rate limiting
    };
    
    // Method 1: Direct API credentials (if available)
    const apiKey = process.env.POLYMARKET_API_KEY;
    const secret = process.env.POLYMARKET_SECRET;
    const password = process.env.POLYMARKET_PASSWORD;
    
    // Method 2: Private key authentication (fallback)
    const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
    const funder = process.env.POLYMARKET_FUNDER; // main walletAddress
    const proxyWallet = process.env.POLYMARKET_PROXY_WALLET;
    const builderWallet = process.env.POLYMARKET_BUILDER_WALLET;
    
    // Check which authentication method to use (optional for public websockets)
    let hasAuth = false;
    if (apiKey && secret && password) {
        // Use direct API credentials
        exchangeOptions['apiKey'] = apiKey;
        exchangeOptions['secret'] = secret;
        exchangeOptions['password'] = password;
        hasAuth = true;
        console.log ('Using direct API credentials authentication');
        if (funder || proxyWallet || builderWallet) {
            if (!exchangeOptions['options']) {
                exchangeOptions['options'] = {};
            }
            if (funder) {
                exchangeOptions['walletAddress'] = funder;
                exchangeOptions['options']['funder'] = funder;
            }
            if (proxyWallet) {
                exchangeOptions['options']['proxyWallet'] = proxyWallet;
            }
            if (builderWallet) {
                exchangeOptions['options']['builderWallet'] = builderWallet;
            }
        }
        console.log ('API Key:', apiKey.length > 10 ? apiKey.substring (0, 10) + '...' : apiKey);
    } else if (privateKey) {
        // Use privateKey/walletAddress authentication (will generate credentials)
        exchangeOptions['privateKey'] = privateKey;
        hasAuth = true;
        if (funder || proxyWallet || builderWallet) {
            if (!exchangeOptions['options']) {
                exchangeOptions['options'] = {};
            }
            if (funder) {
                exchangeOptions['walletAddress'] = funder;
                exchangeOptions['options']['funder'] = funder;
            }
            if (proxyWallet) {
                exchangeOptions['options']['proxyWallet'] = proxyWallet;
            }
            if (builderWallet) {
                exchangeOptions['options']['builderWallet'] = builderWallet;
            }
        } else {
            console.log ('⚠️  Warning: POLYMARKET_FUNDER not set. Main wallet address should be set via funder option or walletAddress property');
        }
        console.log ('Using privateKey authentication (credentials will be generated automatically)');
        console.log ('Main wallet (funder):', funder || 'Not set');
        if (proxyWallet) {
            console.log ('Proxy wallet:', proxyWallet);
        }
        if (builderWallet) {
            console.log ('Builder wallet:', builderWallet);
        }
    } else {
        console.log ('⚠️  Note: No authentication credentials provided');
        console.log ('   Public websocket methods (watchOrderBook, watchTrades, watchTicker) will work');
        console.log ('   Private websocket methods (watchOrders, watchMyTrades) require authentication');
        console.log ('   To use private methods, set credentials using:');
        console.log ('     Method 1 (Direct API credentials):');
        console.log ('       - POLYMARKET_API_KEY');
        console.log ('       - POLYMARKET_SECRET');
        console.log ('       - POLYMARKET_PASSWORD');
        console.log ('     Method 2 (Generate from private key):');
        console.log ('       - POLYMARKET_PRIVATE_KEY="0x..."');
        console.log ('       - POLYMARKET_FUNDER (wallet address)');
    }
    
    // Initialize options dict
    if (!exchangeOptions['options']) {
        exchangeOptions['options'] = {};
    }
    
    // Optional: Sandbox/testnet mode
    const sandboxMode = (process.env.POLYMARKET_SANDBOX || 'false').toLowerCase () === 'true';
    if (sandboxMode) {
        exchangeOptions['options']['sandboxMode'] = true;
        exchangeOptions['options']['chainId'] = 80001; // Polygon Mumbai testnet
        exchangeOptions['options']['chainName'] = 'polygon-mumbai';
        console.log ('Using sandbox/testnet mode (Polygon Mumbai)');
    }
    
    // Optional: Custom CLOB API endpoint
    const clobHost = process.env.POLYMARKET_CLOB_HOST;
    if (clobHost) {
        exchangeOptions['options']['clobHost'] = clobHost;
        console.log ('Using custom CLOB host:', clobHost);
    }
    
    const exchange = new ccxt.pro.polymarket (exchangeOptions);

    try {
        console.log ('\n=== Loading Markets ===\n');

        // Load all markets (required for symbol resolution)
        await exchange.loadMarkets ();

        console.log ('Loaded', exchange.symbols.length, 'markets');

        // Get a symbol to watch (use first available symbol or specify one)
        if (exchange.symbols.length === 0) {
            console.log ('⚠️  No markets available');
            return;
        }
        
        // You can specify a symbol here, or use the first one
        let symbol = process.env.POLYMARKET_SYMBOL || exchange.symbols[0];
        if (!exchange.symbols.includes (symbol)) {
            console.log (`⚠️  Symbol ${symbol} not found, using first available symbol`);
            symbol = exchange.symbols[0];
        }
        
        console.log (`Using symbol: ${symbol} (${exchange.markets[symbol]['info']['question']})`);
        
        // Example 1: Watch order book (public, no auth required)
        console.log ('\n' + '='.repeat (60));
        console.log ('Example 1: Watch Order Book (Public)');
        console.log ('='.repeat (60));
        try {
            await watchOrderbookExample (exchange, symbol);
        } catch (e) {
            if (e instanceof Error && e.message.includes ('KeyboardInterrupt')) {
                console.log ('\nStopped by user');
            } else {
                console.log (`Error in order book example: ${e instanceof Error ? e.message : String (e)}`);
            }
        }
        
        // Example 2: Watch trades (public, no auth required)
        console.log ('\n' + '='.repeat (60));
        console.log ('Example 2: Watch Trades (Public)');
        console.log ('='.repeat (60));
        try {
            await watchTradesExample (exchange, symbol);
        } catch (e) {
            if (e instanceof Error && e.message.includes ('KeyboardInterrupt')) {
                console.log ('\nStopped by user');
            } else {
                console.log (`Error in trades example: ${e instanceof Error ? e.message : String (e)}`);
            }
        }
        
        // Example 3: Watch ticker (public, no auth required)
        console.log ('\n' + '='.repeat (60));
        console.log ('Example 3: Watch Ticker (Public)');
        console.log ('='.repeat (60));
        try {
            await watchTickerExample (exchange, symbol);
        } catch (e) {
            if (e instanceof Error && e.message.includes ('KeyboardInterrupt')) {
                console.log ('\nStopped by user');
            } else {
                console.log (`Error in ticker example: ${e instanceof Error ? e.message : String (e)}`);
            }
        }
        
        // Example 4: Watch orders (private, requires auth)
        if (hasAuth) {
            console.log ('\n' + '='.repeat (60));
            console.log ('Example 4: Watch Orders (Private - Requires Auth)');
            console.log ('='.repeat (60));
            try {
                await watchOrdersExample (exchange);
            } catch (e) {
                if (e instanceof Error && e.message.includes ('KeyboardInterrupt')) {
                    console.log ('\nStopped by user');
                } else {
                    console.log (`Error in orders example: ${e instanceof Error ? e.message : String (e)}`);
                }
            }
        } else {
            console.log ('\n' + '='.repeat (60));
            console.log ('Example 4: Watch Orders (Private - Requires Auth)');
            console.log ('='.repeat (60));
            console.log ('⚠️  Skipping - authentication required');
            console.log ('   Set POLYMARKET_API_KEY, POLYMARKET_SECRET, POLYMARKET_PASSWORD');
            console.log ('   OR set POLYMARKET_PRIVATE_KEY and POLYMARKET_FUNDER');
        }
        
        // Example 5: Watch my trades (private, requires auth)
        if (hasAuth) {
            console.log ('\n' + '='.repeat (60));
            console.log ('Example 5: Watch My Trades (Private - Requires Auth)');
            console.log ('='.repeat (60));
            try {
                await watchMyTradesExample (exchange);
            } catch (e) {
                if (e instanceof Error && e.message.includes ('KeyboardInterrupt')) {
                    console.log ('\nStopped by user');
                } else {
                    console.log (`Error in my trades example: ${e instanceof Error ? e.message : String (e)}`);
                }
            }
        } else {
            console.log ('\n' + '='.repeat (60));
            console.log ('Example 5: Watch My Trades (Private - Requires Auth)');
            console.log ('='.repeat (60));
            console.log ('⚠️  Skipping - authentication required');
            console.log ('   Set POLYMARKET_API_KEY, POLYMARKET_SECRET, POLYMARKET_PASSWORD');
            console.log ('   OR set POLYMARKET_PRIVATE_KEY and POLYMARKET_FUNDER');
        }

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String (e);
        console.log ('Error:', errorMessage);
        if (e instanceof ccxt.NetworkError) {
            console.log ('Network error - please check your internet connection');
        } else if (e instanceof ccxt.ExchangeError) {
            console.log ('Exchange error -', errorMessage);
        } else if (e instanceof ccxt.AuthenticationError) {
            console.log ('Authentication error - please check your credentials');
            console.log ('Required (choose one method):');
            console.log ('  Method 1 (Direct API credentials):');
            console.log ('    - apiKey (POLYMARKET_API_KEY)');
            console.log ('    - secret (POLYMARKET_SECRET)');
            console.log ('    - password (POLYMARKET_PASSWORD)');
            console.log ('  Method 2 (Generate from private key):');
            console.log ('    - privateKey (POLYMARKET_PRIVATE_KEY)');
            console.log ('    - walletAddress (POLYMARKET_FUNDER)');
            console.log ('    - API credentials are automatically generated on first authenticated request');
        } else {
            console.log ('Unexpected error:', e);
        }
    } finally {
        await exchange.close ();
    }
}

await example ();

