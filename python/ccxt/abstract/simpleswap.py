from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_v3_currencies = publicGetV3Currencies = Entry('v3/currencies', 'public', 'GET', {})
    public_get_v3_currencies_ticker_network = publicGetV3CurrenciesTickerNetwork = Entry('v3/currencies/{ticker}/{network}', 'public', 'GET', {})
    public_get_v3_pairs = publicGetV3Pairs = Entry('v3/pairs', 'public', 'GET', {})
    public_get_v3_pairs_ticker_network = publicGetV3PairsTickerNetwork = Entry('v3/pairs/{ticker}/{network}', 'public', 'GET', {})
    public_get_v3_estimates = publicGetV3Estimates = Entry('v3/estimates', 'public', 'GET', {})
    public_get_v3_ranges = publicGetV3Ranges = Entry('v3/ranges', 'public', 'GET', {})
    public_get_v3_exchanges_check = publicGetV3ExchangesCheck = Entry('v3/exchanges/check', 'public', 'GET', {})
    public_get_v3_exchanges_publicid = publicGetV3ExchangesPublicId = Entry('v3/exchanges/{publicId}', 'public', 'GET', {})
    public_get_v3_exchanges = publicGetV3Exchanges = Entry('v3/exchanges', 'public', 'GET', {})
    public_post_v3_exchanges = publicPostV3Exchanges = Entry('v3/exchanges', 'public', 'POST', {})
