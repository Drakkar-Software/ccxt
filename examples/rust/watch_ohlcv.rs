// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/watch-OHLCV.ts

use ccxt::exchange::{normalize, Value};
use ccxt::pro::binance::{Binance, BinanceImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = BinanceImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT".into();

    let rv = Binance::watch_ohlcv(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("watchOHLCV: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
