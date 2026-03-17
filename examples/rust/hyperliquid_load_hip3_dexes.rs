// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/hyperliquid-load-hip3-dexes.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::hyperliquid::{Hyperliquid, HyperliquidImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = HyperliquidImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT".into();

    let rv = Hyperliquid::load_markets(&mut exchange, Value::Undefined, Value::Undefined).await;
    println!("loadMarkets: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
