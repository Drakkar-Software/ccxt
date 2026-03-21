// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/build-ohlcv-bars.ts

use ccxt::exchange::{normalize, Value};
use ccxt::pro::binance::{Binance, BinanceImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = BinanceImpl::new(Value::Json(json!({})));
    let symbol: Value = "OGN/USDT".into();

    // skipped: buildOHLCVC (not found in transpiled trait)
    // skipped: fetchTrades (not found in transpiled trait)
    // skipped: filterBySinceLimit (not found in transpiled trait)
    // skipped: milliseconds (not found in transpiled trait)
    let rv = exchange.watch_trades(symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("watchTrades: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
