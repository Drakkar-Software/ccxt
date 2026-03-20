// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/phemex-create-order-position-with-takeprofit-stoploss.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::phemex::{Phemex, PhemexImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = PhemexImpl::new(Value::Json(json!({})));
    let symbol: Value = "XRP/USDT:USDT".into();

    // skipped: cancel_order (not found in transpiled trait)
    let rv = exchange.create_order(symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("createOrder: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = exchange.fetch_open_orders(symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("fetchOpenOrders: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    // skipped: loadMarkets (not found in transpiled trait)
}
