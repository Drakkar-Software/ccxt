// AUTO-GENERATED: transpiled from TypeScript examples/
// Source: examples/ts/watch-Trades-For-Symbols.ts

use ccxt::exchange::{normalize, Value};
use ccxt::pro::binance::{Binance, BinanceImpl};
use serde_json::json;

#[tokio::main]
async fn main() {
    let mut exchange = BinanceImpl::new(Value::Json(json!({})));
    let symbol: Value = "BTC/USDT".into();

    let rv = exchange.watch_trades_for_symbols(symbol.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
    println!("watchTradesForSymbols: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));
}
