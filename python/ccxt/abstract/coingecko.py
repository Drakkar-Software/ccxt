from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_coins_list = publicGetCoinsList = Entry('coins/list', 'public', 'GET', {})
    public_get_coins_markets = publicGetCoinsMarkets = Entry('coins/markets', 'public', 'GET', {})
    public_get_coins_id = publicGetCoinsId = Entry('coins/{id}', 'public', 'GET', {})
    public_get_onchain_networks_network_tokens_address = publicGetOnchainNetworksNetworkTokensAddress = Entry('onchain/networks/{network}/tokens/{address}', 'public', 'GET', {})
