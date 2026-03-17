// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/create-orders-example.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::binance::{Binance, BinanceImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = BinanceImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT".into();

    let rv = Binance::create_orders(&mut exchange, symbol.clone(), Value::Undefined).await;
    println!("createOrders: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Binance::load_markets(&mut exchange, Value::Undefined, Value::Undefined).await;
    println!("loadMarkets: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Binance::set_sandbox_mode(&mut exchange, Value::Undefined);
    println!("setSandboxMode: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
