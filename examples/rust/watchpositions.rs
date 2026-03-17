// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/watchPositions.ts

use ccxt::exchange::{normalize, Value};
use ccxt::pro::binanceusdm::{Binanceusdm, BinanceusdmImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = BinanceusdmImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT".into();

    let rv = Binanceusdm::watch_positions(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("watchPositions: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
