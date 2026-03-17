// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/build-ohlcv-bars.ts

use ccxt::exchange::{normalize, Value};
use ccxt::pro::binance::{Binance, BinanceImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = BinanceImpl::new(Value::Json(json!({})));
    let symbol: Value = "OGN/USDT".into();

    let rv = Binance::build_ohlcvc(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined);
    println!("buildOHLCVC: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Binance::fetch_trades(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("fetchTrades: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Binance::filter_by_since_limit(&mut exchange, Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined);
    println!("filterBySinceLimit: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    // skipped: milliseconds (not found in transpiled trait)
    let rv = Binance::watch_trades(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("watchTrades: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
