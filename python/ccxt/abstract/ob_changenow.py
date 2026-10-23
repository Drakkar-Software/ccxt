from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_currencies = publicGetCurrencies = Entry('currencies', 'public', 'GET', {})
    public_get_currencies_to_ticker = publicGetCurrenciesToTicker = Entry('currencies-to/{ticker}', 'public', 'GET', {})
    public_get_min_amount_from_to = publicGetMinAmountFromTo = Entry('min-amount/{from}_{to}', 'public', 'GET', {})
    public_get_exchange_amount_amount_from_to = publicGetExchangeAmountAmountFromTo = Entry('exchange-amount/{amount}/{from}_{to}', 'public', 'GET', {})
    public_get_exchange_amount_fixed_rate_amount_from_to = publicGetExchangeAmountFixedRateAmountFromTo = Entry('exchange-amount/fixed-rate/{amount}/{from}_{to}', 'public', 'GET', {})
    public_get_market_info_available_pairs = publicGetMarketInfoAvailablePairs = Entry('market-info/available-pairs', 'public', 'GET', {})
    private_get_transactions_apikey = privateGetTransactionsApiKey = Entry('transactions/{apiKey}', 'private', 'GET', {})
    private_get_transactions_id_apikey = privateGetTransactionsIdApiKey = Entry('transactions/{id}/{apiKey}', 'private', 'GET', {})
    private_get_market_info_fixed_rate_apikey = privateGetMarketInfoFixedRateApiKey = Entry('market-info/fixed-rate/{apiKey}', 'private', 'GET', {})
    private_post_transactions_apikey = privatePostTransactionsApiKey = Entry('transactions/{apiKey}', 'private', 'POST', {})
