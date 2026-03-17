//! Public data smoke tests for pro-flagged exchanges.
//!
//! Requires the `full-exchanges` Cargo feature:
//!   cargo test --test pro_public_data --features full-exchanges
//!
//! Each test:
//!   1. Calls describe() and asserts the shape including `pro: true`.
//!   2. If network is reachable, calls fetch_ticker + fetch_order_book and
//!      validates any returned JSON against a loose shape contract.
//!   3. If network is not reachable the test prints a skip notice and exits.
//!
//! All network assertions are "optional" – a None response (error / unsupported)
//! is treated as a pass so that the suite stays green in offline CI.

use ccxt::exchange::{normalize, Value};
use serde_json::{json, Value as JsonValue};
use std::net::ToSocketAddrs;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

fn network_available() -> bool {
    ("api.binance.com", 443).to_socket_addrs().is_ok()
}

fn assert_pro_describe(exchange: &str, d: &JsonValue) {
    assert!(d.get("id").is_some(), "{exchange}: describe.id missing");
    assert!(d.get("name").is_some(), "{exchange}: describe.name missing");
    assert!(d.get("has").is_some(), "{exchange}: describe.has missing");
    assert!(d.get("api").is_some(), "{exchange}: describe.api missing");
    assert!(d.get("urls").is_some(), "{exchange}: describe.urls missing");
    let rate_limit = d.get("rateLimit").and_then(|v| v.as_f64());
    assert!(
        rate_limit.map(|r| r > 0.0).unwrap_or(false),
        "{exchange}: rateLimit should be a positive number"
    );
    assert_eq!(
        d.get("pro").and_then(|v| v.as_bool()),
        Some(true),
        "{exchange}: expected pro: true in describe()"
    );
}

fn check_optional_ticker(exchange: &str, ticker: Option<JsonValue>) {
    if let Some(v) = ticker {
        if let Some(o) = v.as_object() {
            if let Some(sym) = o.get("symbol") {
                assert!(sym.is_string(), "{exchange}: ticker.symbol should be a string");
            }
        }
    }
}

fn check_optional_order_book(exchange: &str, ob: Option<JsonValue>) {
    if let Some(v) = ob {
        if let Some(o) = v.as_object() {
            if let Some(bids) = o.get("bids") {
                assert!(bids.is_array(), "{exchange}: order_book.bids should be an array");
            }
            if let Some(asks) = o.get("asks") {
                assert!(asks.is_array(), "{exchange}: order_book.asks should be an array");
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Core macro: asserts describe shape, then optionally runs live API calls
// ---------------------------------------------------------------------------

macro_rules! pro_test_body {
    ($trait_path:path, $impl_path:path, $name:expr, $symbol:expr) => {{
        let mut ex = <$impl_path>::new(Value::Json(json!({})));

        // describe() is a pure computation – always assert
        let desc = <$impl_path as $trait_path>::describe(&ex);
        let desc_json =
            normalize(&desc).expect(concat!($name, ": describe() returned None"));
        assert_pro_describe($name, &desc_json);

        // Skip live API calls when offline
        if !network_available() {
            eprintln!("SKIP {}: network unavailable", $name);
            return;
        }

        let ticker = <$impl_path as $trait_path>::fetch_ticker(
            &mut ex,
            $symbol.into(),
            Value::Undefined,
        )
        .await;
        check_optional_ticker($name, normalize(&ticker));

        let ob = <$impl_path as $trait_path>::fetch_order_book(
            &mut ex,
            $symbol.into(),
            Value::from(5usize),
            Value::Undefined,
        )
        .await;
        check_optional_order_book($name, normalize(&ob));
    }};
}

// ---------------------------------------------------------------------------
// Pro exchange tests  (all gated behind full-exchanges feature)
// ---------------------------------------------------------------------------

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_htx() {
    pro_test_body!(
        ccxt::exchanges::htx::Htx,
        ccxt::exchanges::htx::HtxImpl,
        "htx",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_mexc() {
    pro_test_body!(
        ccxt::exchanges::mexc::Mexc,
        ccxt::exchanges::mexc::MexcImpl,
        "mexc",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitget() {
    pro_test_body!(
        ccxt::exchanges::bitget::Bitget,
        ccxt::exchanges::bitget::BitgetImpl,
        "bitget",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitmex() {
    pro_test_body!(
        ccxt::exchanges::bitmex::Bitmex,
        ccxt::exchanges::bitmex::BitmexImpl,
        "bitmex",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_deribit() {
    pro_test_body!(
        ccxt::exchanges::deribit::Deribit,
        ccxt::exchanges::deribit::DeribitImpl,
        "deribit",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinex() {
    pro_test_body!(
        ccxt::exchanges::coinex::Coinex,
        ccxt::exchanges::coinex::CoinexImpl,
        "coinex",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_whitebit() {
    pro_test_body!(
        ccxt::exchanges::whitebit::Whitebit,
        ccxt::exchanges::whitebit::WhitebitImpl,
        "whitebit",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bingx() {
    pro_test_body!(
        ccxt::exchanges::bingx::Bingx,
        ccxt::exchanges::bingx::BingxImpl,
        "bingx",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitmart() {
    pro_test_body!(
        ccxt::exchanges::bitmart::Bitmart,
        ccxt::exchanges::bitmart::BitmartImpl,
        "bitmart",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitfinex() {
    pro_test_body!(
        ccxt::exchanges::bitfinex::Bitfinex,
        ccxt::exchanges::bitfinex::BitfinexImpl,
        "bitfinex",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitstamp() {
    pro_test_body!(
        ccxt::exchanges::bitstamp::Bitstamp,
        ccxt::exchanges::bitstamp::BitstampImpl,
        "bitstamp",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_poloniex() {
    pro_test_body!(
        ccxt::exchanges::poloniex::Poloniex,
        ccxt::exchanges::poloniex::PoloniexImpl,
        "poloniex",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_gemini() {
    pro_test_body!(
        ccxt::exchanges::gemini::Gemini,
        ccxt::exchanges::gemini::GeminiImpl,
        "gemini",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitvavo() {
    pro_test_body!(
        ccxt::exchanges::bitvavo::Bitvavo,
        ccxt::exchanges::bitvavo::BitvavoImpl,
        "bitvavo",
        "BTC/EUR"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_woo() {
    pro_test_body!(
        ccxt::exchanges::woo::Woo,
        ccxt::exchanges::woo::WooImpl,
        "woo",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_cryptocom() {
    pro_test_body!(
        ccxt::exchanges::cryptocom::Cryptocom,
        ccxt::exchanges::cryptocom::CryptocomImpl,
        "cryptocom",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_blofin() {
    pro_test_body!(
        ccxt::exchanges::blofin::Blofin,
        ccxt::exchanges::blofin::BlofinImpl,
        "blofin",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_upbit() {
    pro_test_body!(
        ccxt::exchanges::upbit::Upbit,
        ccxt::exchanges::upbit::UpbitImpl,
        "upbit",
        "BTC/KRW"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bithumb() {
    pro_test_body!(
        ccxt::exchanges::bithumb::Bithumb,
        ccxt::exchanges::bithumb::BithumbImpl,
        "bithumb",
        "BTC/KRW"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_woofipro() {
    pro_test_body!(
        ccxt::exchanges::woofipro::Woofipro,
        ccxt::exchanges::woofipro::WoofiproImpl,
        "woofipro",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_binanceusdm() {
    pro_test_body!(
        ccxt::exchanges::binanceusdm::Binanceusdm,
        ccxt::exchanges::binanceusdm::BinanceusdmImpl,
        "binanceusdm",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_binancecoinm() {
    pro_test_body!(
        ccxt::exchanges::binancecoinm::Binancecoinm,
        ccxt::exchanges::binancecoinm::BinancecoinmImpl,
        "binancecoinm",
        "BTC/USD:BTC"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_krakenfutures() {
    pro_test_body!(
        ccxt::exchanges::krakenfutures::Krakenfutures,
        ccxt::exchanges::krakenfutures::KrakenfuturesImpl,
        "krakenfutures",
        "BTC/USD:USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_kucoinfutures() {
    pro_test_body!(
        ccxt::exchanges::kucoinfutures::Kucoinfutures,
        ccxt::exchanges::kucoinfutures::KucoinfuturesImpl,
        "kucoinfutures",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitrue() {
    pro_test_body!(
        ccxt::exchanges::bitrue::Bitrue,
        ccxt::exchanges::bitrue::BitrueImpl,
        "bitrue",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_hollaex() {
    pro_test_body!(
        ccxt::exchanges::hollaex::Hollaex,
        ccxt::exchanges::hollaex::HollaexImpl,
        "hollaex",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_probit() {
    pro_test_body!(
        ccxt::exchanges::probit::Probit,
        ccxt::exchanges::probit::ProbitImpl,
        "probit",
        "BTC/USDT"
    );
}
