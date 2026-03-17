// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/proxy-usage.ts

use ccxt::exchange::{normalize, Value};
use ccxt::pro::kucoin::{Kucoin, KucoinImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = KucoinImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT".into();

    let rv = Kucoin::close(&mut exchange).await;
    println!("close: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kucoin::fetch(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("fetch: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kucoin::load_http_proxy_agent(&mut exchange).await;
    println!("loadHttpProxyAgent: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kucoin::load_markets(&mut exchange, Value::Undefined, Value::Undefined).await;
    println!("loadMarkets: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kucoin::watch(&mut exchange, symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined, Value::Undefined);
    println!("watch: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
    let rv = Kucoin::watch_ticker(&mut exchange, symbol.clone(), Value::Undefined).await;
    println!("watchTicker: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
