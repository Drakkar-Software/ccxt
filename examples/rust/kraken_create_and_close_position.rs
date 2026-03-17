// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/kraken-create-and-close-position.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::kraken::{Kraken, KrakenImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = KrakenImpl::new(Value::Json(json!({})));
    let symbol: Value = "UNI/USD".into();

    let rv = Kraken::create_order(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("createOrder: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kraken::fetch_closed_orders(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("fetchClosedOrders: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kraken::fetch_positions(&mut exchange, symbol.clone(), Value::Undefined).await;
    println!("fetchPositions: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kraken::fetch_ticker(&mut exchange, symbol.clone(), Value::Undefined).await;
    println!("fetchTicker: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kraken::load_markets(&mut exchange, Value::Undefined, Value::Undefined).await;
    println!("loadMarkets: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kraken::market(&mut exchange, Value::Undefined);
    println!("market: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kraken::price_to_precision(&mut exchange, Value::Undefined, Value::Undefined);
    println!("priceToPrecision: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
