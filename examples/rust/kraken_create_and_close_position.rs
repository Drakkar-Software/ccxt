// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/kraken-create-and-close-position.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::kraken::{Kraken, KrakenImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = KrakenImpl::new(Value::Json(json!({})));
    let symbol: Value = "UNI/USD".into();

    let rv = exchange.create_order(symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("createOrder: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = exchange.fetch_closed_orders(symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("fetchClosedOrders: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = exchange.fetch_positions(symbol.clone(), Value::Undefined).await;
    println!("fetchPositions: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = exchange.fetch_ticker(symbol.clone(), Value::Undefined).await;
    println!("fetchTicker: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    // skipped: loadMarkets (not found in transpiled trait)
    // skipped: market (not found in transpiled trait)
    // skipped: priceToPrecision (not found in transpiled trait)
}
