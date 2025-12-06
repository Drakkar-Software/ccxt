import { polymarket, NetworkError, ExchangeError } from '../../js/ccxt.js';

// AUTO-TRANSPILE #

/**
 * Polymarket Example
 *
 * This example demonstrates how to use CCXT with Polymarket,
 * a decentralized prediction market platform.
 *
 * Features demonstrated:
 * - Fetching markets (prediction markets)
 * - Fetching order books for specific outcomes
 * - Fetching tickers for markets
 * - Working with market metadata (outcomes, token IDs, etc.)
 * - Fetching public trades for markets
 * - Fetching trading fees for markets
 * - Fetching user positions from Data-API
 * - Fetching user total value from Data-API
 * - Fetching open interest for markets
 */

async function example () {
    // Initialize Polymarket exchange
    const exchange = new polymarket ({
        'enableRateLimit': true, // Enable rate limiting
    });

    try {
        console.log ('\n=== Loading Markets ===\n');

        // Load all markets
        await exchange.loadMarkets ();

        console.log ('Loaded', exchange.symbols.length, 'markets');
        console.log ('\nFirst 5 markets:');
        for (let i = 0; i < Math.min (5, exchange.symbols.length); i++) {
            const symbol = exchange.symbols[i];
            const market = exchange.markets[symbol];
            console.log ('  -', symbol);
            console.log ('    ID:', market['id']);
            console.log ('    Question:', market['info']['question']);
            if (market['info']['outcomes']) {
                console.log ('    Outcomes:', market['info']['outcomes'].join (', '));
            }
        }

        // Example 1: Fetch a specific market's ticker
        console.log ('\n=== Fetching Ticker ===\n');

        if (exchange.symbols.length > 0) {
            const symbol = exchange.symbols[0];
            console.log ('Fetching ticker for:', symbol);

            const ticker = await exchange.fetchTicker (symbol);
            console.log ('Ticker data:');
            console.log ('  Symbol:', ticker['symbol']);
            console.log ('  Last Price:', ticker['last']);
            console.log ('  Bid:', ticker['bid']);
            console.log ('  Ask:', ticker['ask']);
            console.log ('  Volume:', ticker['baseVolume']);
            if (ticker['info']['volume24hr']) {
                console.log ('  24h Volume:', ticker['info']['volume24hr']);
            }
        }

        // Example 2: Fetch order book for a market
        console.log ('\n=== Fetching Order Book ===\n');

        if (exchange.symbols.length > 0) {
            const symbol = exchange.symbols[0];
            const market = exchange.markets[symbol];

            // Check if market has CLOB token IDs
            const clobTokenIds = market['info']['clobTokenIds'];

            if (clobTokenIds && clobTokenIds.length > 0) {
                console.log ('Fetching order book for:', symbol);
                console.log ('Token ID:', clobTokenIds[0]);

                // Fetch order book using the token ID
                const orderbook = await exchange.fetchOrderBook (symbol, undefined, {
                    'token_id': clobTokenIds[0],
                });

                console.log ('Order Book:');
                console.log ('  Bids:', orderbook['bids'].length, 'levels');
                if (orderbook['bids'].length > 0) {
                    console.log ('    Best bid:', orderbook['bids'][0]);
                }
                console.log ('  Asks:', orderbook['asks'].length, 'levels');
                if (orderbook['asks'].length > 0) {
                    console.log ('    Best ask:', orderbook['asks'][0]);
                }
            } else {
                console.log ('Market', symbol, 'does not have CLOB order book available');
            }
        }

        // Example 3: Fetch all tickers
        console.log ('\n=== Fetching All Tickers ===\n');

        console.log ('Fetching tickers for first 3 markets...');
        const symbolsToFetch = exchange.symbols.slice (0, 3);
        console.log ('Symbols to fetch:', symbolsToFetch);
        const tickers = await exchange.fetchTickers (symbolsToFetch);

        console.log ('Fetched', Object.keys (tickers).length, 'tickers:');
        for (const symbol in tickers) {
            const ticker = tickers[symbol];
            console.log ('  ', symbol, '- Last:', ticker['last'], 'Volume:', ticker['baseVolume']);
        }

        // Example 4: Filter markets by criteria
        console.log ('\n=== Filtering Markets ===\n');

        // Find markets with high volume
        const marketsWithVolume: string[] = [];
        for (let i = 0; i < exchange.symbols.length; i++) {
            const symbol = exchange.symbols[i];
            const volume = exchange.markets[symbol]['info']['volume'];
            if (volume && parseFloat (volume) > 10000) {
                marketsWithVolume.push (symbol);
            }
        }

        console.log ('Markets with volume > 10,000:', marketsWithVolume.length);
        if (marketsWithVolume.length > 0) {
            console.log ('Examples:');
            for (let i = 0; i < Math.min (3, marketsWithVolume.length); i++) {
                const symbol = marketsWithVolume[i];
                const market = exchange.markets[symbol];
                console.log ('  -', symbol, 'Volume:', market['info']['volume']);
            }
        }

        // Example 5: Access market metadata
        console.log ('\n=== Market Metadata ===\n');

        if (exchange.symbols.length > 0) {
            const symbol = exchange.symbols[0];
            const market = exchange.markets[symbol];
            const info = market['info'];

            console.log ('Market:', symbol);
            console.log ('  Question:', info['question']);
            console.log ('  Category:', info['category']);
            console.log ('  Active:', info['active']);
            console.log ('  Closed:', info['closed']);
            console.log ('  Outcomes:', info['outcomes']);
            if (info['outcomePrices']) {
                console.log ('  Outcome Prices:', info['outcomePrices']);
            }
            if (info['clobTokenIds']) {
                console.log ('  CLOB Token IDs:', info['clobTokenIds']);
            }
            if (info['endDateIso']) {
                console.log ('  End Date:', info['endDateIso']);
            }
            if (info['liquidity']) {
                console.log ('  Liquidity:', info['liquidity']);
            }
        }

        // Example 6: Fetch trades for a market
        console.log ('\n=== Fetching Trades ===\n');

        if (exchange.symbols.length > 0) {
            const symbol = exchange.symbols[0];
            const market = exchange.markets[symbol];
            const clobTokenIds = market['info']['clobTokenIds'];

            if (clobTokenIds && clobTokenIds.length > 0) {
                console.log ('Fetching recent trades for:', symbol);
                console.log ('Token ID:', clobTokenIds[0]);

                try {
                    const trades = await exchange.fetchTrades (symbol, undefined, 5);
                    console.log ('Fetched', trades.length, 'trades:');
                    for (let i = 0; i < Math.min (5, trades.length); i++) {
                        const trade = trades[i];
                        console.log ('  Trade ID:', trade['id'] || 'N/A');
                        console.log ('    Side:', trade['side'] || 'N/A');
                        console.log ('    Amount:', trade['amount'] || 'N/A');
                        console.log ('    Price:', trade['price'] || 'N/A');
                        console.log ('    Cost:', trade['cost'] || 'N/A');
                        console.log ('    Date:', trade['datetime'] || 'N/A');
                        console.log ();
                    }
                } catch (e) {
                    console.log ('Error fetching trades:', e instanceof Error ? e.message : String (e));
                }
            } else {
                console.log ('Market', symbol, 'does not have CLOB token ID for trades');
            }
        }

        // Example 7: Fetch trading fee for a market
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

        // Example 8: Fetch OHLCV (candlestick) data
        console.log ('\n=== Fetching OHLCV Data ===\n');

        if (exchange.symbols.length > 0) {
            const symbol = exchange.symbols[0];
            const market = exchange.markets[symbol];
            const clobTokenIds = market['info']['clobTokenIds'];

            if (clobTokenIds && clobTokenIds.length > 0) {
                console.log ('Fetching OHLCV data for:', symbol);
                console.log ('Token ID:', clobTokenIds[0]);

                // Fetch OHLCV data (1 hour candles)
                const ohlcv = await exchange.fetchOHLCV (symbol, '1h', undefined, 10, {
                    'token_id': clobTokenIds[0],
                });

                console.log ('Fetched', ohlcv.length, 'candles:');
                for (let i = 0; i < Math.min (5, ohlcv.length); i++) {
                    const candle = ohlcv[i];
                    const timestamp = candle[0];
                    const openPrice = candle[1];
                    const high = candle[2];
                    const low = candle[3];
                    const close = candle[4];
                    const volume = candle[5];
                    console.log (`  ${exchange.iso8601 (timestamp)}: O=${openPrice}, H=${high}, L=${low}, C=${close}, V=${volume}`);
                }
            } else {
                console.log ('Market', symbol, 'does not have CLOB token ID for OHLCV data');
            }
        }

        // Example 9: Fetch user positions
        console.log ('\n=== Fetching User Positions ===\n');

        const userAddress = '0x29c5fb6caaa7fc4235358dc79fcd0584162e2788';
        console.log ('Fetching positions for user:', userAddress);

        try {
            const positions = await exchange.getUserPositions (userAddress);
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
                console.log ('  No positions found for this user');
            }
        } catch (e) {
            console.log ('Error fetching positions:', e instanceof Error ? e.message : String (e));
        }

        // Example 10: Fetch user total value
        console.log ('\n=== Fetching User Total Value ===\n');

        const userAddress2 = '0x29c5fb6caaa7fc4235358dc79fcd0584162e2788';
        console.log ('Fetching total value for user:', userAddress2);

        try {
            const totalValueData = await exchange.getUserTotalValue (userAddress2);
            console.log ('Total Value:', totalValueData['value'] || 'N/A');
        } catch (e) {
            console.log ('Error fetching total value:', e instanceof Error ? e.message : String (e));
        }

        // Example 11: Fetch open interest for a market
        console.log ('\n=== Fetching Open Interest ===\n');

        if (exchange.symbols.length > 0) {
            const symbol = exchange.symbols[0];
            console.log ('Fetching open interest for:', symbol);
            try {
                const openInterest = await exchange.fetchOpenInterest (symbol);
                console.log ('Open Interest:');
                console.log ('  Symbol:', openInterest['symbol'] || 'N/A');
                console.log ('  Open Interest Amount:', openInterest['openInterestAmount'] || 'N/A');
                console.log ('  Open Interest Value:', openInterest['openInterestValue'] || 'N/A');
            } catch (e) {
                console.log ('Error fetching open interest:', e instanceof Error ? e.message : String (e));
            }
        }

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String (e);
        console.log ('Error:', errorMessage);
        if (e instanceof NetworkError) {
            console.log ('Network error - please check your internet connection');
        } else if (e instanceof ExchangeError) {
            console.log ('Exchange error -', errorMessage);
        } else {
            console.log ('Unexpected error:', e);
        }
    } finally {
        await exchange.close ();
    }
}

await example ();

