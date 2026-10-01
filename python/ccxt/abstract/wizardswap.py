from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_currencies = publicGetCurrencies = Entry('currencies', 'public', 'GET', {})
    public_get_currency = publicGetCurrency = Entry('currency', 'public', 'GET', {})
    public_get_currency_symbol = publicGetCurrencySymbol = Entry('currency/{symbol}', 'public', 'GET', {})
    public_get_pairs = publicGetPairs = Entry('pairs', 'public', 'GET', {})
    public_get_pairs_symbol = publicGetPairsSymbol = Entry('pairs/{symbol}', 'public', 'GET', {})
    public_get_exchange_id = publicGetExchangeId = Entry('exchange/{id}', 'public', 'GET', {})
    public_post_estimate = publicPostEstimate = Entry('estimate', 'public', 'POST', {})
    public_post_exchange = publicPostExchange = Entry('exchange', 'public', 'POST', {})
