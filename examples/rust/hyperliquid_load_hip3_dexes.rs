// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/hyperliquid-load-hip3-dexes.ts

use ccxt::exchange::{normalize, Value};
use ccxt::exchanges::hyperliquid::{Hyperliquid, HyperliquidImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = HyperliquidImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT".into();

    // skipped: loadMarkets (not found in transpiled trait)
}
