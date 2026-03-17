// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/create-trailing-percent-order.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::bingx::{Bingx, BingxImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = BingxImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT:USDT".into();

    let rv = Bingx::create_order(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("createOrder: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Bingx::create_trailing_percent_order(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("createTrailingPercentOrder: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Bingx::load_markets(&mut exchange, Value::Undefined, Value::Undefined).await;
    println!("loadMarkets: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Bingx::set_sandbox_mode(&mut exchange, Value::Undefined);
    println!("setSandboxMode: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
