// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/fetch-first-ohlcv-timestamp.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::binance::{Binance, BinanceImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = BinanceImpl::new(Value::Json(json!({})));
    let symbol: Value = "TRUMP/USDT".into();

    // skipped: iso8601 (not found in transpiled trait)
    // skipped: loadMarkets (not found in transpiled trait)
    let rv = exchange.market(Value::Undefined);
    println!("market: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
