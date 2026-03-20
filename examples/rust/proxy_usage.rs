// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/proxy-usage.ts

use ccxt::exchange::{normalize, Value};
use ccxt::pro::kucoin::{Kucoin, KucoinImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = KucoinImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT".into();

    // skipped: close (not found in transpiled trait)
    // skipped: fetch (not found in transpiled trait)
    // skipped: loadHttpProxyAgent (not found in transpiled trait)
    // skipped: loadMarkets (not found in transpiled trait)
    // skipped: watch (not found in transpiled trait)
    let rv = exchange.watch_ticker(symbol.clone(), Value::Undefined).await;
    println!("watchTicker: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
