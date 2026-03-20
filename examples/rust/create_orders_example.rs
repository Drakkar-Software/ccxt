// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/create-orders-example.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::binance::{Binance, BinanceImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = BinanceImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT".into();

    let rv = exchange.create_orders(symbol.clone(), Value::Undefined).await;
    println!("createOrders: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    // skipped: loadMarkets (not found in transpiled trait)
    let rv = exchange.set_sandbox_mode(Value::Undefined);
    println!("setSandboxMode: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
