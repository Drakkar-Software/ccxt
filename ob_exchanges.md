# OctoBot CCXT `ob_*` exchanges

This document describes how OctoBot extends CCXT through **`ob_*`** exchange classes (TypeScript under `ts/src/ob_*.ts`, transpiled to `python/ccxt/ob_*.py`).


## What an `ob_*` exchange is

An **`ob_*`** class subclasses the upstream CCXT exchange for that venue (for example `ob_coinbase` extends `coinbase`). In `describe()` it sets:

- A distinct **`id`** (typically `ob_<venue>`) and human-readable **`name`** for OctoBot’s fork.
- **`options.octobot`**: a dictionary of OctoBot client options (camelCase keys). OctoBot merges these with **`DEFAULT_EXCHANGE_OPTION_VALUES`** when resolving an option (see below).
- Optionally **`has`** entries that are **not** part of standard CCXT capability discovery but are used by OctoBot’s connector to branch logic or call exchange-specific helpers.

The TypeScript sources are transpiled to Python so OctoBot can load the same behavior via its patched CCXT package.

---

## How `options.octobot` reaches OctoBot

OctoBot stores client-specific settings under `client.options["octobot"]` (constant `CCXT_OCTOBOT_OPTIONS` in `octobot_trading/exchanges/connectors/ccxt/constants.py`).

`get_option_value(client, option_key)`:

1. If `client.options.get("octobot")` exists, returns `octobot_options.get(option_key.value, DEFAULT_EXCHANGE_OPTION_VALUES[option_key])`.
2. Otherwise returns `DEFAULT_EXCHANGE_OPTION_VALUES[option_key]`.

So each key is the **camelCase string** defined by `ExchangeClientOptions` in Python (for example `FIX_MARKET_STATUS` → `"fixMarketStatus"`). Values override defaults only for keys present in the exchange’s `describe()` merge.

---

## `options.octobot` keys (`ExchangeClientOptions`)

Types below follow typical usage; actual runtime types may include `str`, `bool`, `int`, `float`, `None`, or nested dicts (for `supportedElements`).

**Default** values come from **`DEFAULT_EXCHANGE_OPTION_VALUES`** in `OctoBot/packages/trading/octobot_trading/enums.py` (what `get_option_value` falls back to when a key is absent from `client.options["octobot"]`).

| Key (camelCase) | Typical type | Default | Meaning |
|-----------------|-------------|---------|---------|
| `fixMarketStatus` | bool | `False` | When `True`, `get_fixed_market_status` should be used when calling `get_market_status`. |
| `removeMarketStatusPriceLimits` | bool | `False` | When `True`, `get_fixed_market_status` should remove price limits if those limits are invalid. |
| `adaptMarketStatusForContractSize` | bool | `False` | When `True`, `get_fixed_market_status` should adapt amounts for contract size (amounts are not kept as contract size in OctoBot). |
| `includeDisabledSymbolsInAvailableSymbols` | bool | `False` | When `True`, disabled symbols should still be considered (for example exchanges that temporarily disable trading API for some symbols). |
| `enableSpotBuyMarketWithCost` | bool | `False` | When `True`, use `create_market_buy_order_with_cost` for spot buy market orders (helps predict exact spent amount). |
| `requireOrderFeesFromTrades` | bool | `False` | When `True`, `get_order` does not provide fees on closed orders; fees should be recovered via recent trades. |
| `requireClosedOrdersFromRecentTrades` | bool | `False` | When `True`, `get_closed_orders` is not supported; recent trades must be used instead. **Incompatible** with `requireRecentTradesFromClosedOrders`. |
| `requireRecentTradesFromClosedOrders` | bool | `False` | When `True`, `get_my_recent_trades` should use `get_closed_orders`. **Incompatible** with `requireClosedOrdersFromRecentTrades`. |
| `requiresMockedEmptyPosition` | bool | `False` | When `True`, the exchange may not return empty position details for a symbol-specific fetch; OctoBot falls back to a mocked empty position when `get_position` returns `None`. |
| `requiresSymbolForEmptyPosition` | bool | `False` | When `True`, `get_positions()` does not represent empty positions; use `get_position()` per symbol instead. |
| `requiresStopParamToFetchOrder` | bool | `False` | When `True`, `get_order()` needs the stop-related bool parameter to fetch a stop order. |
| `requiresStopParamToCancelOrder` | bool | `False` | When `True`, `cancel_order()` needs the stop-related bool parameter to cancel a stop order. |
| `allowTradesFromClosedOrders` | bool | `False` | When `True`, `get_my_recent_trades` should fall back to `get_closed_orders` when the recent-trades call returns no trades (see `CCXTConnector.get_my_recent_trades`). |
| `supportsSetMarginType` | bool | `True` | Set **`False`** when there is no API to switch cross vs isolated margin. |
| `supportsSetMarginTypeOnOpenPositions` | bool | `True` | Set **`False`** when the exchange refuses margin type changes while a position is open. |
| `expectPossibleNotFoundOrderDuringOrderCreation` | bool | `False` | When `True`, `get_order()` may return “not found” while an order is still being processed right after creation. |
| `alwaysRequiresAuthentication` | bool | `False` | When `True`, normally public endpoints still require authentication. |
| `canMakeAuthenticatedRequestsWhenLoadingMarkets` | bool | `False` | When `True`, loading markets may perform authenticated calls if credentials are set (affects error handling during market load). |
| `isSkippingEmptyCandlesInOhlcvFetch` | bool | `False` | When `True`, the exchange may omit candles with no trades; missing candles in backtesting may be treated as non-fatal. |
| `stopLossEditPriceParam` | str | `"stopLossPrice"` | CCXT parameter name for the stop-loss price when **editing** a stop loss. |
| `stopLossCreatePriceParam` | str | `"stopLossPrice"` | CCXT parameter name for the stop-loss price when **creating** a stop loss. |
| `markPriceInPosition` | bool | `False` | Mark price handling for positions. |
| `markPriceInTicker` | bool | `False` | Mark price present in ticker data. |
| `maxFetchedOhlcvCount` | int or null | `None` | When set to a non-null value, historical OHLCV requests may return nothing for start times that are too early; OctoBot can iterate requests over this window. |
| `createOhlcvFromTickers` | bool | `False` | When `True`, the exchange cannot fetch OHLCV but tickers are available; OHLCV may be synthesized from tickers. |
| `fundingWithMarkPrice` | bool | `False` | Funding rate logic tied to mark price. |
| `fundingInTicker` | bool | `False` | Funding information carried in ticker. |
| `maxIncreasedPositionQuantityMultiplier` | number | `1` | Used when order cost is not accurately computed for an exchange. |
| `supportFetchingCancelledOrders` | bool | `True` | Whether cancelled orders can be fetched reliably. |
| `canHaveDelayedOpenOrders` | bool | `False` | When `True`, `get_open_order()` may return stale data (cancelled or not yet created). |
| `canHaveDelayedCancelledOrders` | bool | `False` | When `True`, `get_cancelled_order()` may return stale open orders. |
| `supportsCustomLimitOrderBookFetch` | bool | `False` | When `True`, the exchange honors the `limit` parameter when fetching order books. |
| `canMissTickersInAllTickers` | bool | `True` | When `True`, `fetch_tickers` may omit symbols; the connector may try to compensate. |
| `localFeesCurrencies` | list/str/null | `None` | Currencies in which fees can be paid locally (for example BNB on Binance). |
| `adjustForTimeDifference` | bool | `False` | When `True`, the client compensates clock skew vs the exchange server. |
| `defaultQuoteCurrency` | str or null | `None` | Default quote asset for market orders when the exchange implies one (for example USDC). |
| `hasBroker` | bool | `False` | When `True`, the exchange supports broker / referral parameters where applicable. |
| `supportedElements` | dict | spot & futures: `orders` `["market","limit"]`, `bundled_orders` `{}` | Declares which order types (and future bundled orders) are supported per trading mode; default matches `DEFAULT_EXCHANGE_OPTION_VALUES`; see § `supportedElements` structure below. |

### `supportedElements` structure

`supportedElements` groups capabilities by trading mode. Keys used by OctoBot match **`ExchangeSupportedElements`**: `spot`, `futures`, `orders`, `bundled_orders`.

Shape (conceptually):

```text
{
  "spot": {
    "orders": [ "<trade order type strings>", ... ],
    "bundled_orders": { ... }
  },
  "futures": {
    "orders": [ ... ],
    "bundled_orders": { ... }
  }
}
```

Order type strings align with `TradeOrderType` in OctoBot (for example `"market"`, `"limit"`, `"stop_loss"`). `supports_order_type` in `ccxt_client_util.py` checks membership of `order_type.value` in the list for the active trading type (`spot` vs `futures`). If no supported-elements structure yields a list, market and limit orders are assumed supported.

Default shapes and lists for `SUPPORTED_ELEMENTS` are defined in **`DEFAULT_EXCHANGE_OPTION_VALUES`** (typically market + limit on spot and futures, empty `bundled_orders`).

---

## OctoBot-specific `has` flags

These keys extend CCXT’s usual `has` map. They advertise behaviors OctoBot’s **`CCXTConnector`** relies on (see `ccxt_connector.py`). If a flag is missing or false, the corresponding connector method may raise **`NotSupported`** or return a conservative default.

| Flag | Role |
|------|------|
| `fetchAccountId` | Exchange implements `fetch_account_id`; OctoBot uses it for a stable account identifier. |
| `fetchPermissions` | Exchange implements `fetch_permissions`; OctoBot maps results to `APIKeyRights`. |
| `getOrdersBrokerParameters` | Exchange implements `get_orders_broker_parameters` for broker/referral order params. |
| `isAuthenticatedRequest` | Exchange implements `is_authenticated_request(url, method, headers, body)` for classifying signed traffic. |
| `supportsNativeEditOrder` | Exchange implements `supports_native_edit_order`; used when native edit order is required. |
| `getMaxOpenOrdersCount` | Exchange implements `get_max_open_orders_count`; otherwise defaults apply per order kind. |
| `fetchStopOrderInDifferentRequest` | Exchange implements `fetch_stop_order_in_different_request(symbol)` when stop orders use a separate fetch path. |
| `usesDemoTradingInsteadOfSandbox` | Exchange implements `uses_demo_trading_instead_of_sandbox` so futures “sandbox” maps to venue demo trading semantics. |

OctoBot still uses standard CCXT **`has`** entries (`fetchBalance`, `fetchOrder`, etc.) for generic routing; those are not duplicated here.

---

## OB-prefixed CCXT errors

Defined in `ccxt/ts/src/base/errors.ts` (and mirrored in Python). They subclass ordinary CCXT errors so callers can distinguish OctoBot-specific conditions.

| Error | Extends | Meaning |
|-------|---------|---------|
| `OBIPWhitelistError` | `AuthenticationError` | API key rejected due to IP whitelist / allowlist restrictions on the exchange side. |
| `OBUntradableSymbol` | `BadRequest` | Symbol cannot be traded in the current context (policy or venue rules). |
| `OBClosedPositionError` | `OperationFailed` | Operation refused because the related position is already closed. |
| `OBOrderUncancellableError` | `OperationFailed` | Cancel refused (for example order already filled or gone); treated specially during `cancel_order`. |
| `OBInternalSyncError` | `OperationFailed` | Exchange-side sync/consistency issue when handling an order request. |
| `OBMaxOpenOrdersReached` | `OperationFailed` | Venue refuses new orders because the maximum open orders for the market was reached. |
