from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_coins = publicGetCoins = Entry('coins', 'public', 'GET', {})
    public_get_coin = publicGetCoin = Entry('coin', 'public', 'GET', {})
    public_get_trade = publicGetTrade = Entry('trade', 'public', 'GET', {})
    public_get_new_rate = publicGetNewRate = Entry('new_rate', 'public', 'GET', {})
    public_get_exchanges = publicGetExchanges = Entry('exchanges', 'public', 'GET', {})
    public_post_new_trade = publicPostNewTrade = Entry('new_trade', 'public', 'POST', {})
