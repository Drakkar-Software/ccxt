from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_currencies = publicGetCurrencies = Entry('currencies', 'public', 'GET', {})
    public_get_currencies_code_networks = publicGetCurrenciesCodeNetworks = Entry('currencies/{code}/networks', 'public', 'GET', {})
    public_get_currencies_networks = publicGetCurrenciesNetworks = Entry('currencies/networks', 'public', 'GET', {})
    public_get_rate = publicGetRate = Entry('rate', 'public', 'GET', {})
    public_get_transactions_id = publicGetTransactionsId = Entry('transactions/{id}', 'public', 'GET', {})
    public_post_transactions = publicPostTransactions = Entry('transactions', 'public', 'POST', {})
