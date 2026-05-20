from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_tokens_v1_chainid_tokenaddresses = publicGetTokensV1ChainIdTokenAddresses = Entry('tokens/v1/{chainId}/{tokenAddresses}', 'public', 'GET', {})
    public_get_token_pairs_v1_chainid_tokenaddress = publicGetTokenPairsV1ChainIdTokenAddress = Entry('token-pairs/v1/{chainId}/{tokenAddress}', 'public', 'GET', {})
    public_get_latest_dex_pairs_chainid_pairid = publicGetLatestDexPairsChainIdPairId = Entry('latest/dex/pairs/{chainId}/{pairId}', 'public', 'GET', {})
