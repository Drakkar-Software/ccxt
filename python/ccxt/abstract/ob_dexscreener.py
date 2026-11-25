from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_latest_dex_search = publicGetLatestDexSearch = Entry('latest/dex/search', 'public', 'GET', {'cost': 1})
    public_get_tokens_v1_chainid_tokenaddresses = publicGetTokensV1ChainIdTokenAddresses = Entry('tokens/v1/{chainId}/{tokenAddresses}', 'public', 'GET', {'cost': 1})
    public_get_latest_dex_pairs_chainid_pairid = publicGetLatestDexPairsChainIdPairId = Entry('latest/dex/pairs/{chainId}/{pairId}', 'public', 'GET', {'cost': 1})
