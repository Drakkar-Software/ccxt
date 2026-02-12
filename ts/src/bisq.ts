//  ---------------------------------------------------------------------------

import Exchange from './abstract/bisq.js';
import { ExchangeError, AuthenticationError, BadRequest, PermissionDenied, OrderNotFound, RateLimitExceeded, ExchangeNotAvailable, NotSupported } from './base/errors.js';
import { Precise } from './base/Precise.js';
import type { Balances, Dict, Int, Market, Num, Order, OrderBook, OrderSide, OrderType, Trade, Ticker, Tickers, int } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class bisq
 * @augments Exchange
 */
export default class bisq extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'bisq',
            'name': 'Bisq',
            'countries': [ 'CH' ],
            // The Bisq daemon enforces per-RPC rate limits (configurable via CLI, defaults below).
            // rateLimit = 1000ms (1 call/second baseline for most endpoints)
            // GetOffers / GetBsqSwapOffers: maxGetoffersCallsPerSecond = 1 → 1 call/s
            //   weight = 2  →  2000ms gap (2× safety margin over the 1s limit)
            // GetTrades: maxGettradesCallsPerSecond = 1 → 1 call/s
            //   weight = 2 for the same reason
            // All other endpoints have no documented per-RPC limit: weight = 1
            'rateLimit': 1000,
            'version': 'v1',
            'certified': false,
            'pro': false,
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'cancelOrder': true,
                'createOrder': true,
                'fetchBalance': true,
                'fetchMarkets': true,
                'fetchMyTrades': true,
                'fetchOHLCV': false,
                'fetchOpenOrders': true,
                'fetchOrderBook': true,
                'fetchOrders': false,
                'fetchTicker': true,
                'fetchTickers': false,
                'fetchTrades': false,
            },
            'urls': {
                'logo': 'https://bisq.network/images/bisq-mark.svg',
                'api': {
                    // HTTP gateway/proxy endpoint (grpc-gateway / envoy grpc-web bridge)
                    // Mainnet defaults: gateway :8080, daemon gRPC :9998
                    'rest': 'http://127.0.0.1:8080',
                    // Native Bisq daemon gRPC endpoint (not directly usable by CCXT REST transport)
                    'grpc': 'http://127.0.0.1:9998',
                },
                'test': {
                    // Testnet/stagenet defaults (BTC_TESTNET, BTC_REGTEST, BTC_DAO_BETANET, …)
                    // Run a second daemon on offset ports so mainnet and testnet can coexist.
                    // gateway :8090, daemon gRPC :9999
                    'rest': 'http://127.0.0.1:8090',
                    'grpc': 'http://127.0.0.1:9999',
                },
                'www': 'https://bisq.network',
                'doc': [
                    'https://github.com/bisq-network/bisq/blob/master/proto/src/main/proto/grpc.proto',
                    'https://github.com/bisq-network/bisq/blob/master/proto/src/main/proto/pb.proto',
                    'https://bisq-network.github.io/slate/#grpc-messages',
                    'https://bisq-network.github.io/slate/#python-api-rpc-examples',
                ],
            },
            'requiredCredentials': {
                'apiKey': false,
                'secret': false,
                'uid': false,
                'password': false, // bisq local daemon can operate without auth
            },
            'api': {
                'private': {
                    'post': {
                        'disputeagents/registerdisputeagent': 1,
                        'getversion/getversion': 1,
                        'help/getmethodhelp': 1,
                        'offers/getoffers': 2,       // 1 call/s daemon limit → weight 2 = 2s gap
                        'offers/getoffer': 1,
                        'offers/getoffercategory': 1,
                        'offers/getmyoffers': 1,
                        'offers/getmyoffer': 1,
                        'offers/getbsqswapoffers': 2, // same RPC rate-limit group as getoffers
                        'offers/getbsqswapoffer': 1,
                        'offers/getmybsqswapoffers': 1,
                        'offers/getmybsqswapoffer': 1,
                        'offers/editoffer': 1,
                        'offers/createbsqswapoffer': 1,
                        'offers/createoffer': 1,
                        'offers/canceloffer': 1,
                        'paymentaccounts/createcryptocurrencypaymentaccount': 1,
                        'paymentaccounts/createpaymentaccount': 1,
                        'paymentaccounts/getcryptocurrencypaymentmethods': 1,
                        'paymentaccounts/getpaymentaccountform': 1,
                        'paymentaccounts/getpaymentaccounts': 1,
                        'paymentaccounts/getpaymentmethods': 2, // 1 call/s daemon limit → weight 2 = 2s gap
                        'price/getaveragebsqtradeprice': 1,
                        'price/getmarketprice': 1,
                        'shutdownserver/stop': 1,
                        'trades/closetrade': 1,
                        'trades/confirmpaymentreceived': 1,
                        'trades/confirmpaymentstarted': 1,
                        'trades/failtrade': 1,
                        'trades/gettrade': 1,
                        'trades/gettrades': 2,        // 1 call/s daemon limit → weight 2 = 2s gap
                        'trades/takeoffer': 1,
                        'trades/unfailtrade': 1,
                        'trades/withdrawfunds': 1,
                        'wallets/getaddressbalance': 1,
                        'wallets/getbalances': 1,
                        'wallets/getfundingaddresses': 1,
                        'wallets/getnetwork': 1,
                        'wallets/gettransaction': 1,
                        'wallets/gettxfeerate': 1,
                        'wallets/getunusedbsqaddress': 1,
                        'wallets/lockwallet': 1,
                        'wallets/removewalletpassword': 1,
                        'wallets/sendbsq': 1,
                        'wallets/sendbtc': 1,
                        'wallets/settxfeeratepreference': 1,
                        'wallets/setwalletpassword': 1,
                        'wallets/unlockwallet': 1,
                        'wallets/unsettxfeeratepreference': 1,
                        'wallets/verifybsqsenttoaddress': 1,
                    },
                },
            },
            'timeframes': {
                '1y': '1y',
                '1M': '1M',
                '1w': '1w',
                '1d': '1d',
                '1h': '1h',
                '10m': '10m',
            },
            'options': {
                // Select HTTP endpoint key from urls.api for this adapter transport.
                // Use a grpc-gateway/grpc-web proxy endpoint, not the native daemon gRPC port.
                'apiTransport': 'rest',
                'defaultQuoteCurrencies': [ 'BSQ', 'USD', 'EUR' ],
                'minAmount': '0.0001',
                'buyerSecurityDepositPct': 15,
                'makerFeeCurrencyCode': 'BTC',
                'takerFeeCurrencyCode': 'BTC',
                'passwordHeaders': [ 'password', 'Grpc-Metadata-password' ],
                'rpcPaths': {
                    'disputeagents/registerdisputeagent': 'api/v1/dispute-agents/register',
                    'getversion/getversion': 'api/v1/version',
                    'help/getmethodhelp': 'api/v1/help/{methodName}',
                    'offers/getoffers': 'api/v1/offers',
                    'offers/getoffer': 'api/v1/offers/{id}',
                    'offers/getoffercategory': 'api/v1/offers/{id}/category',
                    'offers/getmyoffers': 'api/v1/my-offers',
                    'offers/getmyoffer': 'api/v1/my-offers/{id}',
                    'offers/getbsqswapoffers': 'api/v1/offers/bsq-swap',
                    'offers/getbsqswapoffer': 'api/v1/offers/bsq-swap/{id}',
                    'offers/getmybsqswapoffers': 'api/v1/my-offers/bsq-swap',
                    'offers/getmybsqswapoffer': 'api/v1/my-offers/bsq-swap/{id}',
                    'offers/editoffer': 'api/v1/offers/{id}',
                    'offers/createbsqswapoffer': 'api/v1/offers/bsq-swap',
                    'offers/createoffer': 'api/v1/offers',
                    'offers/canceloffer': 'api/v1/offers/{id}',
                    'paymentaccounts/createcryptocurrencypaymentaccount': 'api/v1/payment-accounts/crypto',
                    'paymentaccounts/createpaymentaccount': 'api/v1/payment-accounts',
                    'paymentaccounts/getcryptocurrencypaymentmethods': 'api/v1/payment-methods/crypto',
                    'paymentaccounts/getpaymentaccountform': 'api/v1/payment-account-form',
                    'paymentaccounts/getpaymentaccounts': 'api/v1/payment-accounts',
                    'paymentaccounts/getpaymentmethods': 'api/v1/payment-methods',
                    'price/getaveragebsqtradeprice': 'api/v1/price/bsq/average',
                    'price/getmarketprice': 'api/v1/price/{currency_code}',
                    'shutdownserver/stop': 'api/v1/shutdown',
                    'trades/closetrade': 'api/v1/trades/{tradeId}/close',
                    'trades/confirmpaymentreceived': 'api/v1/trades/{tradeId}/payment-received',
                    'trades/confirmpaymentstarted': 'api/v1/trades/{tradeId}/payment-started',
                    'trades/failtrade': 'api/v1/trades/{tradeId}/fail',
                    'trades/gettrade': 'api/v1/trades/{tradeId}',
                    'trades/gettrades': 'api/v1/trades',
                    'trades/takeoffer': 'api/v1/trades',
                    'trades/unfailtrade': 'api/v1/trades/{tradeId}/unfail',
                    'trades/withdrawfunds': 'api/v1/trades/{tradeId}/withdraw',
                    'wallets/getaddressbalance': 'api/v1/wallet/addresses/{address}/balance',
                    'wallets/getbalances': 'api/v1/wallet/balances',
                    'wallets/getfundingaddresses': 'api/v1/wallet/addresses',
                    'wallets/getnetwork': 'api/v1/wallet/network',
                    'wallets/gettransaction': 'api/v1/wallet/transactions/{txId}',
                    'wallets/gettxfeerate': 'api/v1/wallet/tx-fee-rate',
                    'wallets/getunusedbsqaddress': 'api/v1/wallet/bsq/unused-address',
                    'wallets/lockwallet': 'api/v1/wallet/lock',
                    'wallets/removewalletpassword': 'api/v1/wallet/password',
                    'wallets/sendbsq': 'api/v1/wallet/bsq/send',
                    'wallets/sendbtc': 'api/v1/wallet/btc/send',
                    'wallets/settxfeeratepreference': 'api/v1/wallet/tx-fee-rate',
                    'wallets/setwalletpassword': 'api/v1/wallet/password',
                    'wallets/unlockwallet': 'api/v1/wallet/unlock',
                    'wallets/unsettxfeeratepreference': 'api/v1/wallet/tx-fee-rate',
                    'wallets/verifybsqsenttoaddress': 'api/v1/wallet/bsq/verify',
                },
                'rpcMethods': {
                    'getversion/getversion': 'GET',
                    'help/getmethodhelp': 'GET',
                    'offers/getoffers': 'GET',
                    'offers/getoffer': 'GET',
                    'offers/getoffercategory': 'GET',
                    'offers/getmyoffers': 'GET',
                    'offers/getmyoffer': 'GET',
                    'offers/getbsqswapoffers': 'GET',
                    'offers/getbsqswapoffer': 'GET',
                    'offers/getmybsqswapoffers': 'GET',
                    'offers/getmybsqswapoffer': 'GET',
                    'offers/editoffer': 'PATCH',
                    'offers/canceloffer': 'DELETE',
                    'paymentaccounts/getcryptocurrencypaymentmethods': 'GET',
                    'paymentaccounts/getpaymentaccountform': 'GET',
                    'paymentaccounts/getpaymentaccounts': 'GET',
                    'paymentaccounts/getpaymentmethods': 'GET',
                    'price/getaveragebsqtradeprice': 'GET',
                    'price/getmarketprice': 'GET',
                    'trades/gettrade': 'GET',
                    'trades/gettrades': 'GET',
                    'wallets/getaddressbalance': 'GET',
                    'wallets/getbalances': 'GET',
                    'wallets/getfundingaddresses': 'GET',
                    'wallets/getnetwork': 'GET',
                    'wallets/gettransaction': 'GET',
                    'wallets/gettxfeerate': 'GET',
                    'wallets/getunusedbsqaddress': 'GET',
                    'wallets/removewalletpassword': 'DELETE',
                    'wallets/settxfeeratepreference': 'PUT',
                    'wallets/unsettxfeeratepreference': 'DELETE',
                    'wallets/verifybsqsenttoaddress': 'GET',
                },
            },
            'exceptions': {
                'exact': {
                    '3': BadRequest,
                    '5': OrderNotFound,
                    '7': PermissionDenied,
                    '8': RateLimitExceeded,
                    '14': ExchangeNotAvailable,
                    '16': AuthenticationError,
                },
                'broad': {
                    // Bisq daemon returns gRPC code 7 (PERMISSION_DENIED) for per-endpoint rate limits
                    // (e.g. GetOffers is capped at 1 call/second). The message makes the intent clear.
                    'maximum allowed number of': RateLimitExceeded,
                    // Returned by Price.GetMarketPrice when daemon price feed is temporarily empty.
                    'price feed service has no prices': ExchangeNotAvailable,
                },
            },
            'features': {
                'spot': {
                    'sandbox': true,
                    'createOrder': {
                        'marginMode': false,
                        'triggerPrice': false,
                        'triggerDirection': false,
                        'triggerPriceType': undefined,
                        'stopLossPrice': false,
                        'takeProfitPrice': false,
                        'attachedStopLossTakeProfit': undefined,
                        'timeInForce': {
                            'IOC': false,
                            'FOK': false,
                            'PO': false,
                            'GTD': false,
                        },
                        'hedged': false,
                        'trailing': false,
                        'leverage': false,
                        'marketBuyByCost': false,
                        'marketBuyRequiresPrice': false,
                        'selfTradePrevention': false,
                        'iceberg': false,
                    },
                    'createOrders': undefined,
                    'fetchMyTrades': {
                        'marginMode': false,
                        'limit': undefined,
                        'daysBack': undefined,
                        'untilDays': undefined,
                        'symbolRequired': false,
                    },
                    'fetchOrder': undefined,
                    'fetchOpenOrders': {
                        'marginMode': false,
                        'limit': undefined,
                        'trigger': false,
                        'trailing': false,
                        'symbolRequired': false,
                    },
                    'fetchOrders': undefined,
                    'fetchClosedOrders': undefined,
                    'fetchOHLCV': undefined,
                },
                'swap': {
                    'linear': undefined,
                    'inverse': undefined,
                },
                'future': {
                    'linear': undefined,
                    'inverse': undefined,
                },
            },
        });
    }

    satoshisToAmount (satoshis: string): string {
        if (satoshis === undefined) {
            return undefined;
        }
        return Precise.stringDiv (satoshis, '100000000');
    }

    safeList2 (object: Dict, key1: string, key2: string, defaultValue = []) {
        const value = this.safeList (object, key1);
        if (value !== undefined) {
            return value;
        }
        return this.safeList (object, key2, defaultValue);
    }

    amountToSatoshis (symbol: string, amount: Num): string {
        const amountString = this.amountToPrecision (symbol, amount);
        return Precise.stringMul (amountString, '100000000');
    }

    safeOfferPrice (offer: Dict): string {
        return this.safeString2 (offer, 'price', 'trigger_price');
    }

    parseBisqTrade (trade: Dict, market: Market = undefined): Trade {
        const offer = this.safeDict2 (trade, 'offer', 'offer_info', {});
        const quoteId = this.safeString2 (offer, 'counter_currency_code', 'counterCurrencyCode');
        let marketId = undefined;
        if (quoteId !== undefined) {
            marketId = 'BTC/' + quoteId;
        }
        const symbol = this.safeSymbol (marketId, market);
        const direction = this.safeStringUpper2 (offer, 'direction', 'offer_direction');
        const side: OrderSide = (direction === 'BUY') ? 'buy' : 'sell';
        const amountAsLong = this.safeString2 (trade, 'trade_amount_as_long', 'tradeAmountAsLong');
        const amount = this.satoshisToAmount (amountAsLong);
        const price = this.safeString2 (trade, 'trade_price', 'tradePrice');
        const cost = (amount !== undefined) && (price !== undefined) ? Precise.stringMul (amount, price) : undefined;
        const timestamp = this.safeIntegerN (trade, [ 'date', 'take_offer_date', 'takeOfferDate' ]);
        return this.safeTrade ({
            'id': this.safeString2 (trade, 'trade_id', 'tradeId'),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'order': this.safeString2 (offer, 'id', 'offer_id'),
            'type': 'limit',
            'side': side,
            'price': price,
            'amount': amount,
            'cost': cost,
            'takerOrMaker': undefined,
            'fee': undefined,
            'fees': undefined,
            'info': trade,
        }, market);
    }

    parseBisqOrder (offer: Dict, market: Market = undefined): Order {
        const quoteId = this.safeString2 (offer, 'counter_currency_code', 'counterCurrencyCode');
        let marketId = undefined;
        if (quoteId !== undefined) {
            marketId = 'BTC/' + quoteId;
        }
        const symbol = this.safeSymbol (marketId, market);
        const direction = this.safeStringUpper2 (offer, 'direction', 'offer_direction');
        const side: OrderSide = (direction === 'BUY') ? 'buy' : 'sell';
        const amount = this.satoshisToAmount (this.safeString2 (offer, 'amount_as_long', 'amountAsLong'));
        const remaining = this.satoshisToAmount (this.safeString2 (offer, 'remaining_amount_as_long', 'remainingAmountAsLong'));
        const statusRaw = this.safeStringUpper2 (offer, 'state', 'status');
        let status = undefined;
        if (statusRaw !== undefined) {
            if ((statusRaw.indexOf ('AVAILABLE') >= 0) || (statusRaw.indexOf ('OPEN') >= 0)) {
                status = 'open';
            } else if ((statusRaw.indexOf ('REMOVED') >= 0) || (statusRaw.indexOf ('CANCELED') >= 0) || (statusRaw.indexOf ('CANCELLED') >= 0)) {
                status = 'canceled';
            } else if ((statusRaw.indexOf ('CLOSED') >= 0) || (statusRaw.indexOf ('TAKEN') >= 0)) {
                status = 'closed';
            }
        }
        const timestamp = this.safeIntegerN (offer, [ 'date', 'creation_date', 'creationDate' ]);
        const price = this.safeOfferPrice (offer);
        return this.safeOrder ({
            'id': this.safeString2 (offer, 'id', 'offer_id'),
            'clientOrderId': undefined,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'lastUpdateTimestamp': undefined,
            'status': status,
            'symbol': symbol,
            'type': 'limit',
            'timeInForce': undefined,
            'postOnly': true,
            'side': side,
            'price': price,
            'triggerPrice': undefined,
            'amount': amount,
            'cost': undefined,
            'average': undefined,
            'filled': undefined,
            'remaining': remaining,
            'reduceOnly': undefined,
            'trades': undefined,
            'fee': undefined,
            'fees': undefined,
            'stopPrice': undefined,
            'takeProfitPrice': undefined,
            'stopLossPrice': undefined,
            'info': offer,
        }, market);
    }

    parseBisqMarket (quoteCode: string): Market {
        const quote = this.safeCurrencyCode (quoteCode);
        const symbol = 'BTC/' + quote;
        return this.safeMarketStructure ({
            'id': quoteCode,
            'symbol': symbol,
            'base': 'BTC',
            'quote': quote,
            'baseId': 'BTC',
            'quoteId': quoteCode,
            'active': true,
            'type': 'spot',
            'spot': true,
            'margin': false,
            'swap': false,
            'future': false,
            'option': false,
            'precision': {
                'amount': 8,
                'price': 8,
            },
            'limits': {
                'amount': {
                    'min': this.parseNumber (this.safeString (this.options, 'minAmount')),
                    'max': undefined,
                },
                'price': {
                    'min': undefined,
                    'max': undefined,
                },
                'cost': {
                    'min': undefined,
                    'max': undefined,
                },
            },
        });
    }

    /**
     * @method
     * @name bisq#fetchMarkets
     * @description retrieves data on all markets for bisq from configured payment accounts
     * @see https://bisq-network.github.io/slate/#service-paymentaccounts
     * @see https://bisq-network.github.io/slate/#service-offers
     * @note specific behavior: derives `BTC/<quote>` markets from PaymentAccounts currencies and falls back to `options.defaultQuoteCurrencies`
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} an array of objects representing market data
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        let quoteIds: string[] = [];
        // Try to get markets from payment accounts if credentials are available
        if (this.password) {
            try {
                const response = await this.privatePostPaymentaccountsGetpaymentaccounts (params);
                const accounts = this.safeList2 (response, 'payment_accounts', 'paymentAccounts', []);
                const codes: Dict = {};
                for (let i = 0; i < accounts.length; i++) {
                    const account = this.safeDict (accounts, i, {});
                    const selected = this.safeDict2 (account, 'selected_trade_currency', 'selectedTradeCurrency', {});
                    const selectedCode = this.safeString (selected, 'code');
                    if (selectedCode !== undefined) {
                        codes[selectedCode] = true;
                    }
                    const tradeCurrencies = this.safeList2 (account, 'trade_currencies', 'tradeCurrencies', []);
                    for (let j = 0; j < tradeCurrencies.length; j++) {
                        const tradeCurrency = this.safeDict (tradeCurrencies, j, {});
                        const code = this.safeString (tradeCurrency, 'code');
                        if (code !== undefined) {
                            codes[code] = true;
                        }
                    }
                }
                quoteIds = Object.keys (codes);
            } catch (e) {
                quoteIds = [];
            }
        }
        // Use fallback currencies if no quoteIds obtained
        if (quoteIds.length === 0) {
            const fallbackQuoteIds = this.safeList (this.options, 'defaultQuoteCurrencies', []);
            for (let i = 0; i < fallbackQuoteIds.length; i++) {
                const code = this.safeString (fallbackQuoteIds, i);
                if (code !== undefined) {
                    quoteIds.push (code);
                }
            }
        }
        const result = [];
        for (let i = 0; i < quoteIds.length; i++) {
            const quoteId = this.safeString (quoteIds, i);
            if ((quoteId !== undefined) && (quoteId !== 'BTC')) {
                result.push (this.parseBisqMarket (quoteId));
            }
        }
        return result;
    }

    /**
     * @method
     * @name bisq#fetchTicker
     * @description fetches a price ticker for a market symbol
     * @see https://bisq-network.github.io/slate/#rpc-method-getmarketprice
     * @note specific behavior: maps to `Price.GetMarketPrice` and returns `last/close` only (Bisq does not provide OHLC/24h stats here)
     * @param {string} symbol unified market symbol
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'currency_code': market['quoteId'],
        };
        const response = await this.privatePostPriceGetmarketprice (this.extend (request, params));
        const timestamp = this.milliseconds ();
        const last = this.safeString (response, 'price');
        return this.safeTicker ({
            'symbol': market['symbol'],
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': undefined,
            'low': undefined,
            'bid': undefined,
            'bidVolume': undefined,
            'ask': undefined,
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': undefined,
            'quoteVolume': undefined,
            'info': response,
        }, market);
    }

    /**
     * @method
     * @name bisq#fetchTickers
     * @description fetches price tickers for multiple markets, not supported by Bisq
     * @see https://bisq-network.github.io/slate/#rpc-method-getmarketprice
     * @param {string[]} [symbols] unified market symbols
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a dictionary of ticker structures
     */
    async fetchTickers (symbols: string[] = undefined, params = {}): Promise<Tickers> {
        throw new NotSupported (this.id + ' fetchTickers() is not supported, use fetchTicker() instead');
    }

    /**
     * @method
     * @name bisq#fetchOrderBook
     * @description fetches information on open orders with bid and ask prices/volumes
     * @see https://bisq-network.github.io/slate/#service-offers
     * @note specific behavior: for `BTC/BSQ` it uses `Offers.GetBsqSwapOffers`; for other symbols it uses `Offers.GetOffers` with `BUY` and `SELL`, then assembles CCXT order book
     * @param {string} symbol unified symbol of the market to fetch the order book for
     * @param {int} [limit] not used by the exchange
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order book structure]{@link https://docs.ccxt.com/?id=order-book-structure}
     */
    async fetchOrderBook (symbol: string, limit: Int = undefined, params = {}): Promise<OrderBook> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const isBsqSwap = market['quoteId'] === 'BSQ';
        const requestBase = isBsqSwap ? {} : {
            'currency_code': market['quoteId'],
        };
        const buyRequest = this.extend (requestBase, {
            'direction': 'BUY',
        });
        const sellRequest = this.extend (requestBase, {
            'direction': 'SELL',
        });
        const buyResponse = isBsqSwap ? await this.privatePostOffersGetbsqswapoffers (this.extend (buyRequest, params)) : await this.privatePostOffersGetoffers (this.extend (buyRequest, params));
        const sellResponse = isBsqSwap ? await this.privatePostOffersGetbsqswapoffers (this.extend (sellRequest, params)) : await this.privatePostOffersGetoffers (this.extend (sellRequest, params));
        let buyOffers = this.safeList2 (buyResponse, 'offers', 'bsq_swap_offers', []);
        let sellOffers = this.safeList2 (sellResponse, 'offers', 'bsq_swap_offers', []);
        if (buyOffers.length === 0) {
            buyOffers = this.safeList (buyResponse, 'bsqSwapOffers', []);
        }
        if (sellOffers.length === 0) {
            sellOffers = this.safeList (sellResponse, 'bsqSwapOffers', []);
        }
        let bids = [];
        let asks = [];
        for (let i = 0; i < buyOffers.length; i++) {
            const offer = this.safeDict (buyOffers, i, {});
            const price = this.safeOfferPrice (offer);
            const amount = this.satoshisToAmount (this.safeString2 (offer, 'amount_as_long', 'amountAsLong'));
            if ((price !== undefined) && (amount !== undefined)) {
                bids.push ([ this.parseNumber (price), this.parseNumber (amount) ]);
            }
        }
        for (let i = 0; i < sellOffers.length; i++) {
            const offer = this.safeDict (sellOffers, i, {});
            const price = this.safeOfferPrice (offer);
            const amount = this.satoshisToAmount (this.safeString2 (offer, 'amount_as_long', 'amountAsLong'));
            if ((price !== undefined) && (amount !== undefined)) {
                asks.push ([ this.parseNumber (price), this.parseNumber (amount) ]);
            }
        }
        if (limit !== undefined) {
            bids = this.arraySlice (bids, 0, limit);
            asks = this.arraySlice (asks, 0, limit);
        }
        return this.parseOrderBook ({
            'bids': bids,
            'asks': asks,
        }, market['symbol'], this.milliseconds (), 'bids', 'asks', 0, 1);
    }

    /**
     * @method
     * @name bisq#fetchTrades
     * @description get the list of most recent trades for a symbol
     * @see https://bisq-network.github.io/slate/#service-trades
     * @note specific behavior: not supported, Bisq `Trades.GetTrades` is private and exposed through `fetchMyTrades`
     * @param {string} symbol unified market symbol
     * @param {int} [since] not used by the exchange
     * @param {int} [limit] not used by the exchange
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [trade structures]{@link https://docs.ccxt.com/?id=trade-structure}
     */
    async fetchTrades (symbol: string, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        throw new NotSupported (this.id + ' fetchTrades() is not supported, use fetchMyTrades() instead');
    }

    /**
     * @method
     * @name bisq#fetchMyTrades
     * @description get the list of user trades
     * @see https://bisq-network.github.io/slate/#rpc-method-gettrades
     * @note specific behavior: uses private `Trades.GetTrades` with category `CLOSED`; optionally filters by symbol
     * @param {string} [symbol] unified market symbol
     * @param {int} [since] not used by the exchange
     * @param {int} [limit] not used by the exchange
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [trade structures]{@link https://docs.ccxt.com/?id=trade-structure}
     */
    async fetchMyTrades (symbol: string = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        await this.loadMarkets ();
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
        }
        const request = {
            'category': 'CLOSED',
        };
        const response = await this.privatePostTradesGettrades (this.extend (request, params));
        const trades = this.safeList (response, 'trades', []);
        const result = [];
        for (let i = 0; i < trades.length; i++) {
            const trade = this.safeDict (trades, i, {});
            const parsed = this.parseBisqTrade (trade, market);
            if ((symbol === undefined) || (parsed['symbol'] === symbol)) {
                result.push (parsed);
            }
        }
        return this.filterBySymbolSinceLimit (result, symbol, since, limit);
    }

    /**
     * @method
     * @name bisq#fetchBalance
     * @description query account balances
     * @see https://bisq-network.github.io/slate/#service-wallets
     * @note specific behavior: maps `Wallets.GetBalances` into CCXT balances for BTC and BSQ
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [balance structure]{@link https://docs.ccxt.com/?id=balance-structure}
     */
    async fetchBalance (params = {}): Promise<Balances> {
        await this.loadMarkets ();
        const response = await this.privatePostWalletsGetbalances (params);
        const balances = this.safeDict (response, 'balances', {});
        const result: Dict = {
            'info': response,
        };
        const btc = this.safeDict (balances, 'btc', {});
        const bsq = this.safeDict (balances, 'bsq', {});
        const accountBtc = this.account ();
        accountBtc['free'] = this.safeString2 (btc, 'available_balance', 'availableBalance');
        accountBtc['used'] = this.safeString2 (btc, 'reserved_balance', 'reservedBalance');
        accountBtc['total'] = this.safeString2 (btc, 'total_available_balance', 'totalAvailableBalance');
        result['BTC'] = accountBtc;
        const accountBsq = this.account ();
        accountBsq['free'] = this.safeString2 (bsq, 'available_confirmed_balance', 'availableConfirmedBalance');
        accountBsq['used'] = this.safeString2 (bsq, 'unverified_balance', 'unverifiedBalance');
        accountBsq['total'] = this.safeString2 (bsq, 'total_available_balance', 'totalAvailableBalance');
        result['BSQ'] = accountBsq;
        return this.safeBalance (result);
    }

    /**
     * @method
     * @name bisq#createOrder
     * @description create a new Bisq offer, or take an existing Bisq offer when `params.offerId` is provided
     * @see https://bisq-network.github.io/slate/#service-offers
     * @see https://bisq-network.github.io/slate/#service-trades
     * @note specific behavior: without `offerId` it uses `Offers.CreateOffer`; with `offerId` it uses `Trades.TakeOffer`
     * @param {string} symbol unified market symbol
     * @param {string} type `limit` only
     * @param {string} side `buy` or `sell`
     * @param {number} amount amount of BTC
     * @param {number} [price] quote currency amount per BTC
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: Num, price: Num = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        if (type !== 'limit') {
            throw new ExchangeError (this.id + ' createOrder() supports only limit orders');
        }
        const offerIdToTake = this.safeString2 (params, 'offerId', 'offer_id');
        if (offerIdToTake !== undefined) {
            const paramsOmitted = this.omit (params, [ 'offerId', 'offer_id' ]);
            const paymentAccountId = this.safeString2 (paramsOmitted, 'paymentAccountId', 'payment_account_id');
            if (paymentAccountId === undefined) {
                throw new ExchangeError (this.id + ' createOrder() taking an offer requires params.paymentAccountId');
            }
            const takerFeeCurrencyCode = this.safeString2 (paramsOmitted, 'takerFeeCurrencyCode', 'taker_fee_currency_code', this.safeString (this.options, 'takerFeeCurrencyCode'));
            const request = {
                'offer_id': offerIdToTake,
                'payment_account_id': paymentAccountId,
                'taker_fee_currency_code': takerFeeCurrencyCode,
                'amount': this.amountToSatoshis (symbol, amount),
            };
            const response = await this.privatePostTradesTakeoffer (this.extend (request, this.omit (paramsOmitted, [ 'paymentAccountId', 'payment_account_id', 'takerFeeCurrencyCode', 'taker_fee_currency_code' ])));
            const now = this.milliseconds ();
            return this.safeOrder ({
                'id': this.safeString2 (response, 'trade_id', 'tradeId'),
                'clientOrderId': undefined,
                'timestamp': now,
                'datetime': this.iso8601 (now),
                'lastTradeTimestamp': undefined,
                'status': 'open',
                'symbol': market['symbol'],
                'type': type,
                'timeInForce': undefined,
                'postOnly': false,
                'side': side,
                'price': (price === undefined) ? undefined : this.priceToPrecision (symbol, price),
                'triggerPrice': undefined,
                'amount': this.amountToPrecision (symbol, amount),
                'cost': undefined,
                'average': undefined,
                'filled': undefined,
                'remaining': undefined,
                'reduceOnly': undefined,
                'trades': undefined,
                'fee': undefined,
                'fees': undefined,
                'info': response,
            }, market);
        }
        const useMarketBasedPrice = this.safeBool2 (params, 'useMarketBasedPrice', 'use_market_based_price', false);
        const marketPriceMarginPct = this.safeNumber2 (params, 'marketPriceMarginPct', 'market_price_margin_pct', 0);
        if (!useMarketBasedPrice && (price === undefined)) {
            throw new ExchangeError (this.id + ' createOrder() requires a price for fixed-price offers, or params.useMarketBasedPrice=true for market-priced offers');
        }
        const paymentAccountId = this.safeString2 (params, 'paymentAccountId', 'payment_account_id');
        if (paymentAccountId === undefined) {
            throw new ExchangeError (this.id + ' createOrder() creating an offer requires params.paymentAccountId');
        }
        const minAmount = this.safeNumber2 (params, 'minAmount', 'min_amount', amount);
        const buyerSecurityDepositPct = this.safeInteger2 (params, 'buyerSecurityDepositPct', 'buyer_security_deposit_pct', this.safeInteger (this.options, 'buyerSecurityDepositPct'));
        const makerFeeCurrencyCode = this.safeString2 (params, 'makerFeeCurrencyCode', 'maker_fee_currency_code', this.safeString (this.options, 'makerFeeCurrencyCode'));
        const request: Dict = {
            'currency_code': market['quoteId'],
            'direction': side.toUpperCase (),
            'use_market_based_price': useMarketBasedPrice,
            'market_price_margin_pct': marketPriceMarginPct,
            'amount': this.amountToSatoshis (symbol, amount),
            'min_amount': this.amountToSatoshis (symbol, minAmount),
            'buyer_security_deposit_pct': buyerSecurityDepositPct,
            'trigger_price': '0',
            'payment_account_id': paymentAccountId,
            'maker_fee_currency_code': makerFeeCurrencyCode,
        };
        if (!useMarketBasedPrice) {
            request['price'] = this.priceToPrecision (symbol, price);
        }
        const response = await this.privatePostOffersCreateoffer (this.extend (request, this.omit (params, [
            'minAmount',
            'min_amount',
            'buyerSecurityDepositPct',
            'buyer_security_deposit_pct',
            'paymentAccountId',
            'payment_account_id',
            'makerFeeCurrencyCode',
            'maker_fee_currency_code',
            'useMarketBasedPrice',
            'use_market_based_price',
            'marketPriceMarginPct',
            'market_price_margin_pct',
        ])));
        const offer = this.safeDict (response, 'offer', {});
        const parsed = this.parseBisqOrder (offer, market);
        parsed['info'] = response;
        return parsed;
    }

    /**
     * @method
     * @name bisq#cancelOrder
     * @description cancel an open order
     * @see https://bisq-network.github.io/slate/#service-offers
     * @note specific behavior: maps to `Offers.CancelOffer`
     * @param {string} id order id
     * @param {string} [symbol] not used by the exchange
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async cancelOrder (id: string, symbol: string = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        const request = {
            'id': id,
        };
        const response = await this.privatePostOffersCanceloffer (this.extend (request, params));
        return this.safeOrder ({
            'id': id,
            'status': 'canceled',
            'info': response,
        });
    }

    /**
     * @method
     * @name bisq#fetchOpenOrders
     * @description fetch all currently open orders
     * @see https://bisq-network.github.io/slate/#service-offers
     * @note specific behavior: iterates known markets and directions, calling `Offers.GetMyOffers`, and keeps only open states
     * @param {string} [symbol] unified market symbol
     * @param {int} [since] not used by the exchange
     * @param {int} [limit] not used by the exchange
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [order structures]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchOpenOrders (symbol: string = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        await this.loadMarkets ();
        const result = [];
        let markets: Market[] = [];
        if (symbol !== undefined) {
            markets = [ this.market (symbol) ];
        } else {
            const symbols = this.symbols;
            for (let i = 0; i < symbols.length; i++) {
                markets.push (this.market (symbols[i]));
            }
        }
        for (let i = 0; i < markets.length; i++) {
            const market = markets[i];
            for (let j = 0; j < 2; j++) {
                const direction = (j === 0) ? 'BUY' : 'SELL';
                const request = {
                    'direction': direction,
                    'currency_code': market['quoteId'],
                };
                const response = await this.privatePostOffersGetmyoffers (this.extend (request, params));
                const offers = this.safeList (response, 'offers', []);
                for (let k = 0; k < offers.length; k++) {
                    const offer = this.safeDict (offers, k, {});
                    const parsed = this.parseBisqOrder (offer, market);
                    if (parsed['status'] === 'open') {
                        result.push (parsed);
                    }
                }
            }
        }
        return this.filterBySymbolSinceLimit (result, symbol, since, limit);
    }

    handleErrors (statusCode: int, statusText: string, url: string, method: string, responseHeaders: Dict, responseBody: string, response: Dict, requestHeaders: Dict, requestBody: string) {
        if (response === undefined) {
            return;
        }
        const errorCode = this.safeString (response, 'code');
        if ((errorCode !== undefined) && (errorCode !== '0')) {
            const feedback = this.id + ' ' + responseBody;
            const message = this.safeString (response, 'message');
            // Check broad exceptions first: some gRPC codes (e.g. 7 = PERMISSION_DENIED) are reused
            // by the Bisq daemon for rate-limit violations; the message disambiguates.
            this.throwBroadlyMatchedException (this.exceptions['broad'], message, feedback);
            this.throwExactlyMatchedException (this.exceptions['exact'], errorCode, feedback);
            throw new ExchangeError (feedback);
        }
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined): Dict {
        // Bisq auth is password metadata; for HTTP gateway compatibility we set both plain and Grpc-Metadata-prefixed headers.
        const apiTransport = this.safeString (this.options, 'apiTransport', 'rest');
        let url = this.safeString (this.urls['api'], apiTransport);
        if (url === undefined) {
            throw new ExchangeError (this.id + ' sign() missing urls.api.' + apiTransport + ' endpoint');
        }
        if (url.indexOf (':9998') >= 0) {
            throw new ExchangeError (this.id + ' uses HTTP transport and cannot call native Bisq gRPC daemon directly. Configure urls.api.rest to a gRPC HTTP gateway/proxy (for example grpc-gateway or envoy grpc-web), and keep daemon gRPC on :9998 behind it.');
        }
        const rpcPaths = this.safeDict (this.options, 'rpcPaths', {});
        const rawPath = this.safeString (rpcPaths, path, path);
        const rpcMethods = this.safeDict (this.options, 'rpcMethods', {});
        method = this.safeString (rpcMethods, path, method);
        url += '/' + this.implodeParams (rawPath, params);
        const payload = this.omit (params, this.extractParams (rawPath));
        headers = {
            'Content-Type': 'application/json',
        };
        if ((api === 'private') && this.password) {
            const passwordHeaders = this.safeList (this.options, 'passwordHeaders', [ 'password' ]);
            for (let i = 0; i < passwordHeaders.length; i++) {
                const headerName = this.safeString (passwordHeaders, i);
                if (headerName === undefined) {
                    continue;
                }
                headers[headerName] = this.password;
            }
        }
        if (method !== 'GET') {
            body = this.json (payload);
        } else {
            const query = this.urlencode (payload);
            if (query.length > 0) {
                url += '?' + query;
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }
}
