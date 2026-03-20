// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/fetch-ohlcv.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::okx::{Okx, OkxImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = OkxImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT".into();

    let rv = exchange.fetch_ohlcv(symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("fetchOHLCV: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    // skipped: milliseconds (not found in transpiled trait)
}
