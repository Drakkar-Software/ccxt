mod common;

use ccxt::exchange::{normalize, Value};
use serde_json::{json, Value as JsonValue};

#[derive(Debug)]
struct PublicSuite {
    describe: Value,
    status: Value,
    ticker: Value,
    tickers: Value,
    order_book: Value,
    ohlcv: Value,
}

fn assert_optional_status_shape(exchange: &str, status: Option<JsonValue>) {
    if let Some(v) = status {
        if let Some(obj) = v.as_object() {
            if let Some(s) = obj.get("status") {
                assert!(s.is_string(), "{exchange}: status.status should be string");
            }
        }
    }
}

fn assert_optional_tickers_shape(exchange: &str, tickers: Option<JsonValue>) {
    if let Some(v) = tickers {
        assert!(
            v.is_object() || v.is_array() || v.is_string() || v.is_number() || v.is_boolean() || v.is_null(),
            "{exchange}: tickers returned unexpected JSON type"
        );
    }
}

macro_rules! run_suite {
    ($trait_path:path, $impl_path:path, $symbol:expr) => {{
        let mut exchange = <$impl_path>::new(Value::Json(json!({})));
        let describe = <$impl_path as $trait_path>::describe(&exchange);
        let status = <$impl_path as $trait_path>::fetch_status(&mut exchange, Value::Undefined).await;
        let ticker =
            <$impl_path as $trait_path>::fetch_ticker(&mut exchange, $symbol.into(), Value::Undefined).await;
        let tickers = <$impl_path as $trait_path>::fetch_tickers(
            &mut exchange,
            Value::Json(json!([$symbol])),
            Value::Undefined,
        )
        .await;
        let order_book = <$impl_path as $trait_path>::fetch_order_book(
            &mut exchange,
            $symbol.into(),
            Value::from(10usize),
            Value::Undefined,
        )
        .await;
        let ohlcv = <$impl_path as $trait_path>::fetch_ohlcv(
            &mut exchange,
            $symbol.into(),
            "1m".into(),
            Value::Undefined,
            Value::from(5usize),
            Value::Undefined,
        )
        .await;

        PublicSuite {
            describe,
            status,
            ticker,
            tickers,
            order_book,
            ohlcv,
        }
    }};
}

fn assert_suite(exchange: &str, suite: PublicSuite, symbol: &str) {
    let describe = normalize(&suite.describe).expect("describe should always be JSON");
    common::assert_describe_shape(exchange, &describe, false);
    assert_optional_status_shape(exchange, normalize(&suite.status));
    common::assert_ticker_shape(exchange, normalize(&suite.ticker), symbol);
    assert_optional_tickers_shape(exchange, normalize(&suite.tickers));
    common::assert_order_book_shape(exchange, normalize(&suite.order_book), symbol);
    common::assert_ohlcv_shape(exchange, normalize(&suite.ohlcv));
}

#[tokio::test]
async fn public_data_smoke_binance() {
    let suite = run_suite!(
        ccxt::exchanges::binance::Binance,
        ccxt::exchanges::binance::BinanceImpl,
        "BTC/USDT"
    );
    assert_suite("binance", suite, "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn public_data_smoke_multi_exchange() {
    assert_suite(
        "bybit",
        run_suite!(
            ccxt::exchanges::bybit::Bybit,
            ccxt::exchanges::bybit::BybitImpl,
            "BTC/USDT:USDT"
        ),
        "BTC/USDT:USDT",
    );
    assert_suite(
        "okx",
        run_suite!(ccxt::exchanges::okx::Okx, ccxt::exchanges::okx::OkxImpl, "BTC/USDT"),
        "BTC/USDT",
    );
    assert_suite(
        "kraken",
        run_suite!(
            ccxt::exchanges::kraken::Kraken,
            ccxt::exchanges::kraken::KrakenImpl,
            "BTC/USD"
        ),
        "BTC/USD",
    );
    assert_suite(
        "coinbase",
        run_suite!(
            ccxt::exchanges::coinbase::Coinbase,
            ccxt::exchanges::coinbase::CoinbaseImpl,
            "BTC/USD"
        ),
        "BTC/USD",
    );
    assert_suite(
        "kucoin",
        run_suite!(
            ccxt::exchanges::kucoin::Kucoin,
            ccxt::exchanges::kucoin::KucoinImpl,
            "BTC/USDT"
        ),
        "BTC/USDT",
    );
    assert_suite(
        "gateio",
        run_suite!(
            ccxt::exchanges::gateio::Gateio,
            ccxt::exchanges::gateio::GateioImpl,
            "BTC/USDT"
        ),
        "BTC/USDT",
    );
    assert_suite(
        "dydx",
        run_suite!(
            ccxt::exchanges::dydx::Dydx,
            ccxt::exchanges::dydx::DydxImpl,
            "BTC/USDC:USDC"
        ),
        "BTC/USDC:USDC",
    );
    assert_suite(
        "hyperliquid",
        run_suite!(
            ccxt::exchanges::hyperliquid::Hyperliquid,
            ccxt::exchanges::hyperliquid::HyperliquidImpl,
            "BTC/USDC:USDC"
        ),
        "BTC/USDC:USDC",
    );
}

#[tokio::test]
async fn strict_public_data_binance_should_return_json() {
    if !common::network_available() {
        eprintln!("skipping strict_public_data_binance_should_return_json: no DNS/network");
        return;
    }
    let suite = run_suite!(
        ccxt::exchanges::binance::Binance,
        ccxt::exchanges::binance::BinanceImpl,
        "BTC/USDT"
    );
    assert!(normalize(&suite.status).is_some(), "status should be JSON");
    assert!(normalize(&suite.ticker).is_some(), "ticker should be JSON");
    assert!(normalize(&suite.tickers).is_some(), "tickers should be JSON");
    assert!(normalize(&suite.order_book).is_some(), "order_book should be JSON");
    assert!(normalize(&suite.ohlcv).is_some(), "ohlcv should be JSON");
}
