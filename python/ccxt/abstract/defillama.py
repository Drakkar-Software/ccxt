from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_prices_current_coins = publicGetPricesCurrentCoins = Entry('prices/current/{coins}', 'public', 'GET', {'cost': 1})
    public_get_prices_historical_timestamp_coins = publicGetPricesHistoricalTimestampCoins = Entry('prices/historical/{timestamp}/{coins}', 'public', 'GET', {'cost': 1})
    public_get_batchhistorical = publicGetBatchHistorical = Entry('batchHistorical', 'public', 'GET', {'cost': 1})
    public_get_chart_coins = publicGetChartCoins = Entry('chart/{coins}', 'public', 'GET', {'cost': 1})
    public_get_percentage_coins = publicGetPercentageCoins = Entry('percentage/{coins}', 'public', 'GET', {'cost': 1})
    public_get_prices_first_coins = publicGetPricesFirstCoins = Entry('prices/first/{coins}', 'public', 'GET', {'cost': 1})
    public_get_block_chain_timestamp = publicGetBlockChainTimestamp = Entry('block/{chain}/{timestamp}', 'public', 'GET', {'cost': 1})
