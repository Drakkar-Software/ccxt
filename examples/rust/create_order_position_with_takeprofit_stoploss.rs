// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/create-order-position-with-takeprofit-stoploss.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::okx::{Okx, OkxImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = OkxImpl::new(Value::Json(json!({})));
    let symbol: Value = "DOGE/USDT:USDT".into();

    // skipped: cancel_order (not found in transpiled trait)
    let rv = exchange.create_order(symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("createOrder: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = exchange.fetch_open_orders(symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("fetchOpenOrders: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = exchange.fetch_ticker(symbol.clone(), Value::Undefined).await;
    println!("fetchTicker: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    // skipped: loadMarkets (not found in transpiled trait)
    let rv = exchange.market(Value::Undefined);
    println!("market: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = exchange.price_to_precision(Value::Undefined, Value::Undefined);
    println!("priceToPrecision: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
