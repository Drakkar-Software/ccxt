from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_market_markets = publicGetMarketMarkets = Entry('market/markets', 'public', 'GET', {'cost': 1})
    public_get_market_ticker = publicGetMarketTicker = Entry('market/ticker', 'public', 'GET', {'cost': 1})
    private_get_account_balance = privateGetAccountBalance = Entry('account/balance', 'private', 'GET', {'cost': 1})
    private_get_trading_orders = privateGetTradingOrders = Entry('trading/orders', 'private', 'GET', {'cost': 1})
    private_get_trading_order_id = privateGetTradingOrderId = Entry('trading/order/{id}', 'private', 'GET', {'cost': 1})
    private_get_trading_order_estimate = privateGetTradingOrderEstimate = Entry('trading/order/estimate', 'private', 'GET', {'cost': 1})
    private_post_trading_order = privatePostTradingOrder = Entry('trading/order', 'private', 'POST', {'cost': 1})
