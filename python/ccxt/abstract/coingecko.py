from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_coins_list = publicGetCoinsList = Entry('coins/list', 'public', 'GET', {})
    public_get_coins_markets = publicGetCoinsMarkets = Entry('coins/markets', 'public', 'GET', {})
