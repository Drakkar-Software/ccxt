//! Live public endpoint tests — mirrors real example usage patterns.
//!
//! Exchanges are instantiated and called exactly as in examples/rust/*.rs:
//!
//!   let mut exchange = BinanceImpl::new(Value::Json(json!({})));
//!   let ticker = exchange.fetch_ticker("BTC/USDT".into(), Value::Undefined).await;
//!
//! A single `def_live_tests!` macro generates the full test suite for any
//! exchange. Adding a new exchange is one line:
//!
//!   def_live_tests!(myexchange, "myexchange", MyExchangeImpl, MyExchange, "BTC/USDT");
//!
//! Trait import note: only the exchange-specific trait is imported at module
//! scope. This removes ambiguity so `.method()` calls route to the real
//! exchange implementation rather than the base stub. `fetch_markets` is
//! Exchange-only and uses a scoped import block inside the test body.
//!
//! Each live test skips gracefully when no network is available.
//!
//! Run:
//!   cargo test --test live_public_endpoints -- --nocapture
//!   cargo test --features full-exchanges --test live_public_endpoints -- --nocapture

mod common;

use ccxt::exchange::{normalize, Value};
use serde_json::json;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Skip the calling test when there is no internet connection.
macro_rules! require_network {
    () => {
        if !common::network_available() {
            eprintln!("SKIP: no network connection");
            return;
        }
    };
}

/// Generate a complete test module for one exchange.
///
/// Parameters:
///   $mod_name    — module name (Rust ident, e.g. `binance`)
///   $exchange_id — display name for error messages (e.g. `"binance"`)
///   $impl_path   — full path to the impl struct (e.g. `ccxt::exchanges::binance::BinanceImpl`)
///   $trait_path  — full path to the exchange trait  (e.g. `ccxt::exchanges::binance::Binance`)
///   $symbol      — trading pair to test against      (e.g. `"BTC/USDT"`)
macro_rules! def_live_tests {
    ($mod_name:ident, $exchange_id:literal, $impl_path:path, $trait_path:path, $symbol:literal) => {
        mod $mod_name {
            use super::*;
            use $trait_path;

            #[tokio::test]
            async fn fetch_ticker() {
                require_network!();
                let mut exchange = <$impl_path>::new(Value::Json(json!({})));
                let ticker = exchange.fetch_ticker($symbol.into(), Value::Undefined).await;
                let result = normalize(&ticker);
                println!(
                    "{} fetch_ticker: {}",
                    $exchange_id,
                    result
                        .as_ref()
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "undefined".into())
                );
                common::assert_ticker_shape($exchange_id, result, $symbol);
            }

            #[tokio::test]
            async fn fetch_order_book() {
                require_network!();
                let mut exchange = <$impl_path>::new(Value::Json(json!({})));
                let ob = exchange
                    .fetch_order_book($symbol.into(), Value::from(10usize), Value::Undefined)
                    .await;
                let result = normalize(&ob);
                let bid_count = result
                    .as_ref()
                    .and_then(|v| v.get("bids"))
                    .and_then(|b| b.as_array())
                    .map(|a| a.len())
                    .unwrap_or(0);
                let ask_count = result
                    .as_ref()
                    .and_then(|v| v.get("asks"))
                    .and_then(|a| a.as_array())
                    .map(|a| a.len())
                    .unwrap_or(0);
                println!("{} fetch_order_book: {bid_count} bids, {ask_count} asks", $exchange_id);
                common::assert_order_book_shape($exchange_id, result, $symbol);
            }

            #[tokio::test]
            async fn fetch_ohlcv() {
                require_network!();
                let mut exchange = <$impl_path>::new(Value::Json(json!({})));
                let ohlcv = exchange
                    .fetch_ohlcv(
                        $symbol.into(),
                        "1m".into(),
                        Value::Undefined,
                        Value::from(5usize),
                        Value::Undefined,
                    )
                    .await;
                let result = normalize(&ohlcv);
                let candle_count = result
                    .as_ref()
                    .and_then(|v| v.as_array())
                    .map(|a| a.len())
                    .unwrap_or(0);
                println!("{} fetch_ohlcv: {candle_count} candles", $exchange_id);
                common::assert_ohlcv_shape($exchange_id, result);
            }

            #[tokio::test]
            async fn fetch_markets() {
                require_network!();
                let mut exchange = <$impl_path>::new(Value::Json(json!({})));
                let markets = {
                    use ccxt::exchange::Exchange;
                    exchange.fetch_markets(Value::Undefined).await
                };
                let result = normalize(&markets);
                let count = result
                    .as_ref()
                    .and_then(|v| v.as_array())
                    .map(|a| a.len())
                    .unwrap_or(0);
                println!("{} fetch_markets: {count} markets", $exchange_id);
                if count > 0 {
                    let first = result.as_ref().and_then(|v| v.get(0));
                    assert!(
                        first
                            .and_then(|m| m.get("symbol").or_else(|| m.get("id")))
                            .is_some(),
                        "{}: market entry missing symbol/id field",
                        $exchange_id
                    );
                }
            }

            /// One instance, all public endpoints in sequence — mirrors a real
            /// application or example script using the library.
            #[tokio::test]
            async fn full_public_session() {
                let mut exchange = <$impl_path>::new(Value::Json(json!({})));

                // describe() is pure (offline) — assert it before requiring network
                let describe_val = exchange.describe();
                let describe = normalize(&describe_val)
                    .expect(concat!($exchange_id, ": describe() returned None"));
                common::assert_describe_shape($exchange_id, &describe, false);
                println!(
                    "{}: id={}, name={}",
                    $exchange_id,
                    describe.get("id").and_then(|v| v.as_str()).unwrap_or("?"),
                    describe.get("name").and_then(|v| v.as_str()).unwrap_or("?"),
                );

                require_network!();

                let ticker = exchange.fetch_ticker($symbol.into(), Value::Undefined).await;
                common::assert_ticker_shape($exchange_id, normalize(&ticker), $symbol);
                println!("{} fetch_ticker: ok", $exchange_id);

                let ob = exchange
                    .fetch_order_book($symbol.into(), Value::from(10usize), Value::Undefined)
                    .await;
                common::assert_order_book_shape($exchange_id, normalize(&ob), $symbol);
                println!("{} fetch_order_book: ok", $exchange_id);

                let ohlcv = exchange
                    .fetch_ohlcv(
                        $symbol.into(),
                        "1m".into(),
                        Value::Undefined,
                        Value::from(5usize),
                        Value::Undefined,
                    )
                    .await;
                common::assert_ohlcv_shape($exchange_id, normalize(&ohlcv));
                println!("{} fetch_ohlcv: ok", $exchange_id);

                let markets = {
                    use ccxt::exchange::Exchange;
                    exchange.fetch_markets(Value::Undefined).await
                };
                let market_count = normalize(&markets)
                    .as_ref()
                    .and_then(|v| v.as_array())
                    .map(|a| a.len())
                    .unwrap_or(0);
                println!("{} fetch_markets: {market_count} markets", $exchange_id);
            }
        }
    };
}

// ---------------------------------------------------------------------------
// Always-available exchange (no feature flag required)
// ---------------------------------------------------------------------------

def_live_tests!(
    binance,
    "binance",
    ccxt::exchanges::binance::BinanceImpl,
    ccxt::exchanges::binance::Binance,
    "BTC/USDT"
);

// ---------------------------------------------------------------------------
// Full exchange suite (requires --features full-exchanges)
// ---------------------------------------------------------------------------

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    bybit,
    "bybit",
    ccxt::exchanges::bybit::BybitImpl,
    ccxt::exchanges::bybit::Bybit,
    "BTC/USDT"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    okx,
    "okx",
    ccxt::exchanges::okx::OkxImpl,
    ccxt::exchanges::okx::Okx,
    "BTC/USDT"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    kraken,
    "kraken",
    ccxt::exchanges::kraken::KrakenImpl,
    ccxt::exchanges::kraken::Kraken,
    "BTC/USD"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    coinbase,
    "coinbase",
    ccxt::exchanges::coinbase::CoinbaseImpl,
    ccxt::exchanges::coinbase::Coinbase,
    "BTC/USDT"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    gate,
    "gate",
    ccxt::exchanges::gate::GateImpl,
    ccxt::exchanges::gate::Gate,
    "BTC/USDT"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    kucoin,
    "kucoin",
    ccxt::exchanges::kucoin::KucoinImpl,
    ccxt::exchanges::kucoin::Kucoin,
    "BTC/USDT"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    mexc,
    "mexc",
    ccxt::exchanges::mexc::MexcImpl,
    ccxt::exchanges::mexc::Mexc,
    "BTC/USDT"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    bitget,
    "bitget",
    ccxt::exchanges::bitget::BitgetImpl,
    ccxt::exchanges::bitget::Bitget,
    "BTC/USDT"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    htx,
    "htx",
    ccxt::exchanges::htx::HtxImpl,
    ccxt::exchanges::htx::Htx,
    "BTC/USDT"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    cryptocom,
    "crypto.com",
    ccxt::exchanges::cryptocom::CryptocomImpl,
    ccxt::exchanges::cryptocom::Cryptocom,
    "BTC/USDT"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    bitstamp,
    "bitstamp",
    ccxt::exchanges::bitstamp::BitstampImpl,
    ccxt::exchanges::bitstamp::Bitstamp,
    "BTC/USD"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    bitfinex,
    "bitfinex",
    ccxt::exchanges::bitfinex::BitfinexImpl,
    ccxt::exchanges::bitfinex::Bitfinex,
    "BTC/USDT"
);

#[cfg(feature = "full-exchanges")]
def_live_tests!(
    bitmex,
    "bitmex",
    ccxt::exchanges::bitmex::BitmexImpl,
    ccxt::exchanges::bitmex::Bitmex,
    "BTC/USDT:USDT"
);
