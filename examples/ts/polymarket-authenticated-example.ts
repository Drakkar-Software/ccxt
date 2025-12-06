import { polymarket, NetworkError, ExchangeError, AuthenticationError } from '../../js/ccxt.js';

// AUTO-TRANSPILE #

/**
 * Polymarket Authenticated Example
 *
 * This example demonstrates how to use CCXT with Polymarket authenticated endpoints,
 * requiring API credentials for private operations.
 *
 * Features demonstrated:
 * - Fetching balance and allowance
 * - Fetching orders (all orders and open orders)
 * - Fetching user trades
 * - Fetching notifications
 * - Fetching user positions
 * - Fetching user total value
 * - Fetching trading fees for markets
 * - Checking order scoring status
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
 * - API credentials are automatically generated from private key using create_or_derive_api_creds()
 *
 * Optional:
 * - Set POLYMARKET_CLOB_HOST environment variable (custom CLOB API endpoint, defaults to https://clob.polymarket.com)
 * - Set POLYMARKET_SIGNATURE_TYPE environment variable (0 = EOA default, 1 = Email/Magic wallet, 2 = Browser wallet proxy)
 * - Set POLYMARKET_CHAIN_ID environment variable (137 = Polygon mainnet default, 80001 = Polygon Mumbai testnet)
 * - Set POLYMARKET_SANDBOX environment variable (true/false to enable testnet mode)
 */

async function example () {
    // Initialize Polymarket exchange with authentication
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

    // Check which authentication method to use
    if (apiKey && secret && password) {
        // Use direct API credentials
        exchangeOptions['apiKey'] = apiKey;
        exchangeOptions['secret'] = secret;
        exchangeOptions['password'] = password;
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
        console.log ('⚠️  Error: Authentication credentials required');
        console.log ('   Method 1 (Direct API credentials):');
        console.log ('     - Set POLYMARKET_API_KEY');
        console.log ('     - Set POLYMARKET_SECRET');
        console.log ('     - Set POLYMARKET_PASSWORD');
        console.log ('   Method 2 (Generate from private key):');
        console.log ('     - Set POLYMARKET_PRIVATE_KEY="0x..."');
        console.log ('     - Set POLYMARKET_FUNDER (wallet address)');
        console.log ('     - Optional: POLYMARKET_PROXY_WALLET');
        console.log ('     - Optional: POLYMARKET_BUILDER_WALLET');
        return;
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

    // Optional: For proxy wallets (email/Magic wallets or browser extension wallets)
    const signatureType = process.env.POLYMARKET_SIGNATURE_TYPE;
    const chainId = process.env.POLYMARKET_CHAIN_ID;

    // Set signature type (default: 0 for EOA)
    // 0 = EOA (Externally Owned Account) - MetaMask, hardware wallets, direct private key control
    // 1 = Email/Magic wallet signatures (delegated signing)
    // 2 = Browser wallet proxy signatures (proxy contract, not direct wallet connections)
    if (signatureType) {
        const signatureTypeInt = parseInt (signatureType, 10);
        exchangeOptions['options']['signatureType'] = signatureTypeInt;
        console.log ('Using signature type:', signatureTypeInt);
    }

    // Set chain ID (default: 137 for Polygon mainnet, 80001 for testnet)
    // 137 = Polygon mainnet (default), 80001 = Polygon Mumbai testnet
    if (chainId && !sandboxMode) { // Don't override if sandbox mode is set
        const chainIdInt = parseInt (chainId, 10);
        exchangeOptions['options']['chainId'] = chainIdInt;
        const chainName = chainIdInt === 80001 ? 'polygon-mumbai' : 'polygon-mainnet';
        exchangeOptions['options']['chainName'] = chainName;
        console.log ('Using chain ID:', chainIdInt, `(${chainName})`);
    }

    const exchange = new polymarket (exchangeOptions);

    // Optional: Generate and display API credentials using CCXT
    // This is useful if you want to see the API credentials that can be used with Method 1
    if (privateKey && !(apiKey && secret && password)) {
        try {
            console.log ('\n=== Generating API Credentials with CCXT ===\n');
            
            // Generate or derive API credentials
            const creds = await exchange.create_or_derive_api_creds ();
            exchange.setApiCreds (creds);
            
            console.log ('Generated API Credentials:');
            console.log (creds);
            console.log ('\n✅ API credentials set on CCXT exchange client');
            console.log ('   API Key:', creds['apiKey'] ? (creds['apiKey'].length > 10 ? creds['apiKey'].substring (0, 10) + '...' : creds['apiKey']) : 'N/A');
        } catch (e) {
            console.log ('⚠️  Warning: Could not generate API credentials:', e instanceof Error ? e.message : String (e));
            console.log ('   This is optional - CCXT will generate credentials automatically if needed');
        }
    }

    try {
        console.log ('\n=== Loading Markets ===\n');

        // Load all markets (required for symbol resolution)
        await exchange.loadMarkets ();

        console.log ('Loaded', exchange.symbols.length, 'markets');

        // Example 1: Fetch balance and allowance
        console.log ('\n=== Fetching Balance ===\n');

        try {
            const balance = await exchange.fetchBalance ();
            console.log ('Balance:');
            console.log ('  USDC Free:', balance['USDC'] ? balance['USDC']['free'] : 'N/A');
            console.log ('  USDC Total:', balance['USDC'] ? balance['USDC']['total'] : 'N/A');
            if (balance['USDC'] && balance['USDC']['allowance'] !== undefined) {
                console.log ('  USDC Allowance:', balance['USDC']['allowance']);
            }
            console.log ('  Raw response:', balance['info']);
        } catch (e) {
            console.log ('Error fetching balance:', e instanceof Error ? e.message : String (e));
            const errorMessage = e instanceof Error ? e.message : String (e);
            if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                console.log ('  → This is likely due to missing or invalid credentials');
                console.log ('  → Stopping example due to authentication error');
                throw e; // Stop execution on authentication error
            }
            throw e; // Stop execution on any error
        }

        // Example 2: Fetch all orders
        console.log ('\n=== Fetching All Orders ===\n');

        try {
            const orders = await exchange.fetchOrders ();
            console.log ('Fetched', orders.length, 'orders');
            if (orders.length > 0) {
                console.log ('\nFirst 3 orders:');
                for (let i = 0; i < Math.min (3, orders.length); i++) {
                    const order = orders[i];
                    console.log ('  Order ID:', order['id']);
                    console.log ('    Symbol:', order['symbol']);
                    console.log ('    Side:', order['side']);
                    console.log ('    Type:', order['type']);
                    console.log ('    Status:', order['status']);
                    console.log ('    Amount:', order['amount']);
                    console.log ('    Filled:', order['filled']);
                    console.log ('    Price:', order['price']);
                    console.log ('    Created:', order['datetime']);
                    console.log ();
                }
            } else {
                console.log ('  No orders found');
            }
        } catch (e) {
            console.log ('Error fetching orders:', e instanceof Error ? e.message : String (e));
            const errorMessage = e instanceof Error ? e.message : String (e);
            if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                console.log ('  → This is likely due to missing or invalid credentials');
            }
        }

        // Example 3: Fetch open orders
        console.log ('\n=== Fetching Open Orders ===\n');

        try {
            const openOrders = await exchange.fetchOpenOrders ();
            console.log ('Fetched', openOrders.length, 'open orders');
            if (openOrders.length > 0) {
                console.log ('\nOpen orders:');
                for (let i = 0; i < Math.min (5, openOrders.length); i++) {
                    const order = openOrders[i];
                    console.log ('  Order ID:', order['id']);
                    console.log ('    Symbol:', order['symbol']);
                    console.log ('    Side:', order['side']);
                    console.log ('    Amount:', order['amount']);
                    console.log ('    Filled:', order['filled']);
                    console.log ('    Price:', order['price']);
                    console.log ();
                }
            } else {
                console.log ('  No open orders found');
            }
        } catch (e) {
            console.log ('Error fetching open orders:', e instanceof Error ? e.message : String (e));
            const errorMessage = e instanceof Error ? e.message : String (e);
            if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                console.log ('  → This is likely due to missing or invalid credentials');
            }
        }

        // Example 4: Fetch user trades
        console.log ('\n=== Fetching User Trades ===\n');

        try {
            // Fetch recent trades (limit to 10 for example)
            const myTrades = await exchange.fetchMyTrades (undefined, undefined, 10);
            console.log ('Fetched', myTrades.length, 'trades');
            if (myTrades.length > 0) {
                console.log ('\nRecent trades:');
                for (let i = 0; i < Math.min (5, myTrades.length); i++) {
                    const trade = myTrades[i];
                    console.log ('  Trade ID:', trade['id']);
                    console.log ('    Symbol:', trade['symbol']);
                    console.log ('    Side:', trade['side']);
                    console.log ('    Amount:', trade['amount']);
                    console.log ('    Price:', trade['price']);
                    console.log ('    Cost:', trade['cost']);
                    console.log ('    Fee:', trade['fee']);
                    console.log ('    Date:', trade['datetime']);
                    console.log ();
                }
            } else {
                console.log ('  No trades found');
            }
        } catch (e) {
            console.log ('Error fetching trades:', e instanceof Error ? e.message : String (e));
            const errorMessage = e instanceof Error ? e.message : String (e);
            if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                console.log ('  → This is likely due to missing or invalid credentials');
            }
        }

        // Example 5: Fetch notifications
        console.log ('\n=== Fetching Notifications ===\n');

        try {
            const notifications = await exchange.getNotifications ();
            console.log ('Notifications response:');
            // Notifications response format may vary
            if (typeof notifications === 'object' && notifications !== null && !Array.isArray (notifications)) {
                if ('data' in notifications) {
                    const notificationList = notifications['data'] as any[];
                    console.log ('  Count:', notificationList.length);
                    if (notificationList.length > 0) {
                        console.log ('\n  First notification:');
                        console.log ('    ', notificationList[0]);
                    }
                } else {
                    console.log ('  Response:', notifications);
                }
            } else if (Array.isArray (notifications)) {
                console.log ('  Count:', notifications.length);
                if (notifications.length > 0) {
                    console.log ('\n  First notification:');
                    console.log ('    ', notifications[0]);
                }
            } else {
                console.log ('  Response:', notifications);
            }
        } catch (e) {
            console.log ('Error fetching notifications:', e instanceof Error ? e.message : String (e));
            const errorMessage = e instanceof Error ? e.message : String (e);
            if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                console.log ('  → This is likely due to missing or invalid credentials');
            }
        }

        // Example 6: Fetch user positions
        console.log ('\n=== Fetching User Positions ===\n');

        try {
            // Fetch current positions (defaults to proxy wallet if not specified)
            const positions = await exchange.getUserPositions ();
            console.log ('Fetched', positions.length, 'positions');
            if (positions.length > 0) {
                console.log ('\nCurrent positions:');
                for (let i = 0; i < Math.min (5, positions.length); i++) {
                    const position = positions[i];
                    console.log ('  Position:');
                    console.log ('    Asset:', position['asset'] || 'N/A');
                    console.log ('    Condition ID:', position['conditionId'] || 'N/A');
                    console.log ('    Size:', position['size'] || 'N/A');
                    console.log ('    Average Price:', position['avgPrice'] || 'N/A');
                    console.log ('    Current Price:', position['curPrice'] || 'N/A');
                    console.log ('    Current Value:', position['currentValue'] || 'N/A');
                    console.log ('    Initial Value:', position['initialValue'] || 'N/A');
                    console.log ('    Cash PnL:', position['cashPnl'] || 'N/A');
                    console.log ('    Percent PnL:', position['percentPnl'] || 'N/A');
                    console.log ('    Title:', position['title'] || 'N/A');
                    console.log ('    Outcome:', position['outcome'] || 'N/A');
                    console.log ('    Redeemable:', position['redeemable'] || false);
                    console.log ('    Mergeable:', position['mergeable'] || false);
                    console.log ();
                }
            } else {
                console.log ('  No positions found');
            }
        } catch (e) {
            console.log ('Error fetching positions:', e instanceof Error ? e.message : String (e));
            const errorMessage = e instanceof Error ? e.message : String (e);
            if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                console.log ('  → This is likely due to missing or invalid credentials');
            }
        }

        // Example 7: Fetch user total value
        console.log ('\n=== Fetching User Total Value ===\n');

        try {
            const totalValueData = await exchange.getUserTotalValue ();
            console.log ('Total Value:', totalValueData['value'] || 'N/A');
        } catch (e) {
            console.log ('Error fetching total value:', e instanceof Error ? e.message : String (e));
            const errorMessage = e instanceof Error ? e.message : String (e);
            if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                console.log ('  → This is likely due to missing or invalid credentials');
            }
        }

        // Example 8: Check order scoring (single order)
        console.log ('\n=== Checking Order Scoring (Single Order) ===\n');

        try {
            // First, try to get an order ID from recent orders
            const orders = await exchange.fetchOrders (undefined, undefined, 1);
            if (orders.length > 0) {
                const order = orders[0];
                const orderId = order['id'];
                const tokenId = order['info'] && typeof order['info'] === 'object' ? order['info']['token_id'] : undefined;
                const side = order['side'].toUpperCase (); // Convert to BUY/SELL
                const price = String (order['price']);
                const size = String (order['amount']);

                if (tokenId) {
                    console.log ('Checking scoring status for order:', orderId);
                    const scoringResult = await exchange.isOrderScoring ({
                        'order_id': orderId,
                        'token_id': tokenId,
                        'side': side,
                        'price': price,
                        'size': size,
                    });
                    console.log ('  Scoring result:', scoringResult);
                } else {
                    console.log ('  Order does not have token_id, skipping scoring check');
                }
            } else {
                console.log ('  No orders found to check scoring status');
                console.log ('  Note: To test order scoring, you need at least one order');
            }
        } catch (e) {
            console.log ('Error checking order scoring:', e instanceof Error ? e.message : String (e));
            const errorMessage = e instanceof Error ? e.message : String (e);
            if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                console.log ('  → This is likely due to missing or invalid credentials');
            } else if (errorMessage.includes ('order_id') || errorMessage.toLowerCase ().includes ('required')) {
                console.log ('  → No orders available to check scoring status');
            }
        }

        // Example 9: Check order scoring (multiple orders)
        console.log ('\n=== Checking Order Scoring (Multiple Orders) ===\n');

        try {
            // Fetch recent orders
            const orders = await exchange.fetchOrders (undefined, undefined, 5);
            if (orders.length > 0) {
                const orderIds = orders.map ((order) => order['id']);
                console.log ('Checking scoring status for', orderIds.length, 'orders');
                const scoringResult = await exchange.areOrdersScoring ({
                    'order_ids': orderIds,
                });
                console.log ('  Scoring result:', scoringResult);
            } else {
                console.log ('  No orders found to check scoring status');
                console.log ('  Note: To test order scoring, you need at least one order');
            }
        } catch (e) {
            console.log ('Error checking orders scoring:', e instanceof Error ? e.message : String (e));
            const errorMessage = e instanceof Error ? e.message : String (e);
            if (errorMessage.includes ('Authentication') || errorMessage.includes ('401') || errorMessage.includes ('403')) {
                console.log ('  → This is likely due to missing or invalid credentials');
            } else if (errorMessage.includes ('order_ids') || errorMessage.toLowerCase ().includes ('required')) {
                console.log ('  → No orders available to check scoring status');
            }
        }

        // Example 10: Fetch orders filtered by symbol
        console.log ('\n=== Fetching Orders by Symbol ===\n');

        if (exchange.symbols.length > 0) {
            const symbol = exchange.symbols[0];
            console.log ('Fetching orders for symbol:', symbol);
            try {
                const symbolOrders = await exchange.fetchOrders (symbol);
                console.log ('  Found', symbolOrders.length, 'orders for', symbol);
                if (symbolOrders.length > 0) {
                    console.log ('  First order:');
                    const order = symbolOrders[0];
                    console.log ('    ID:', order['id']);
                    console.log ('    Status:', order['status']);
                    console.log ('    Side:', order['side']);
                }
            } catch (e) {
                console.log ('  Error:', e instanceof Error ? e.message : String (e));
            }
        }

        // Example 11: Fetch trades filtered by symbol
        console.log ('\n=== Fetching Trades by Symbol ===\n');

        if (exchange.symbols.length > 0) {
            const symbol = exchange.symbols[0];
            console.log ('Fetching trades for symbol:', symbol);
            try {
                const symbolTrades = await exchange.fetchMyTrades (symbol, undefined, 5);
                console.log ('  Found', symbolTrades.length, 'trades for', symbol);
                if (symbolTrades.length > 0) {
                    console.log ('  Recent trades:');
                    for (let i = 0; i < Math.min (3, symbolTrades.length); i++) {
                        const trade = symbolTrades[i];
                        console.log ('    ', trade['side'], trade['amount'], '@', trade['price'], 'on', trade['datetime']);
                    }
                }
            } catch (e) {
                console.log ('  Error:', e instanceof Error ? e.message : String (e));
            }
        }

        // Example 12: Fetch trading fee for a market
        console.log ('\n=== Fetching Trading Fee ===\n');

        if (exchange.symbols.length > 0) {
            const symbol = exchange.symbols[0];
            const market = exchange.markets[symbol];
            const clobTokenIds = market['info']['clobTokenIds'];

            if (clobTokenIds && clobTokenIds.length > 0) {
                console.log ('Fetching trading fee for:', symbol);
                console.log ('Token ID:', clobTokenIds[0]);

                try {
                    const fee = await exchange.fetchTradingFee (symbol, {
                        'token_id': clobTokenIds[0],
                    });
                    console.log ('Trading Fee:');
                    console.log ('  Symbol:', fee['symbol'] || 'N/A');
                    console.log ('  Maker Fee:', fee['maker'] || 'N/A');
                    console.log ('  Taker Fee:', fee['taker'] || 'N/A');
                    console.log ('  Percentage:', fee['percentage'] || 'N/A');
                } catch (e) {
                    console.log ('Error fetching trading fee:', e instanceof Error ? e.message : String (e));
                }
            } else {
                console.log ('Market', symbol, 'does not have CLOB token ID for trading fee');
            }
        }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String (e);
        console.log ('Error:', errorMessage);
        if (e instanceof NetworkError) {
            console.log ('Network error - please check your internet connection');
        } else if (e instanceof ExchangeError) {
            console.log ('Exchange error -', errorMessage);
        } else if (e instanceof AuthenticationError) {
            console.log ('Authentication error - please check your credentials');
            console.log ('Required (choose one method):');
            console.log ('  Method 1 (Direct API credentials):');
            console.log ('    - apiKey (POLYMARKET_API_KEY)');
            console.log ('    - secret (POLYMARKET_SECRET)');
            console.log ('    - password (POLYMARKET_PASSWORD)');
            console.log ('  Method 2 (Generate from private key):');
            console.log ('    - privateKey (POLYMARKET_PRIVATE_KEY)');
            console.log ('    - walletAddress (POLYMARKET_FUNDER)');
            console.log ('    - Optional: POLYMARKET_PROXY_WALLET');
            console.log ('    - Optional: POLYMARKET_BUILDER_WALLET');
            console.log ('    - API credentials are automatically generated on first authenticated request');
        } else {
            console.log ('Unexpected error:', e);
        }
    } finally {
        await exchange.close ();
    }
}

await example ();

