#![allow(clippy::all)]
#![allow(dead_code)]
#![allow(unreachable_code)]
#![allow(unused_imports)]
#![allow(unused_assignments)]
#![allow(unused_comparisons)]
#![allow(unused_mut)]
#![allow(unused_variables)]

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::BTreeMap;
use std::str::FromStr;

pub type JSON = serde_json::Value;
pub type Array = Vec<Value>;
pub type Object = BTreeMap<String, Value>;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Value {
    Undefined,
    Json(JSON),
}

impl Value {
    pub fn new_object() -> Value {
        Value::Json(json!({}))
    }

    pub fn new_array() -> Value {
        Value::Json(json!([]))
    }

    pub fn null() -> Value {
        Value::Json(json!(null))
    }

    pub fn is_undefined(&self) -> bool {
        matches!(self, Value::Undefined)
    }

    pub fn is_nullish(&self) -> bool {
        matches!(self, Value::Undefined) || matches!(self, Value::Json(JSON::Null))
    }

    pub fn is_nonnullish(&self) -> bool {
        !self.is_nullish()
    }

    pub fn is_truthy(&self) -> bool {
        match self {
            Value::Undefined => false,
            Value::Json(JSON::Null) => false,
            Value::Json(JSON::Bool(b)) => *b,
            Value::Json(JSON::Number(n)) => n.as_f64().unwrap_or(0.0) != 0.0,
            Value::Json(JSON::String(s)) => !s.is_empty(),
            Value::Json(JSON::Array(a)) => !a.is_empty(),
            Value::Json(JSON::Object(o)) => !o.is_empty(),
        }
    }

    pub fn is_falsy(&self) -> bool {
        !self.is_truthy()
    }

    pub fn or_default(&self, default: Value) -> Value {
        if self.is_nullish() {
            default
        } else {
            self.clone()
        }
    }

    pub fn is_number(&self) -> bool {
        matches!(self, Value::Json(JSON::Number(_)))
    }

    pub fn is_string(&self) -> bool {
        matches!(self, Value::Json(JSON::String(_)))
    }

    pub fn is_object(&self) -> bool {
        matches!(self, Value::Json(JSON::Object(_)))
    }

    pub fn to_upper_case(&self) -> Value {
        match self {
            Value::Json(JSON::String(s)) => Value::from(s.to_uppercase()),
            _ => Value::Undefined,
        }
    }

    pub fn unwrap_str(&self) -> &str {
        match self {
            Value::Json(JSON::String(s)) => s,
            _ => "",
        }
    }

    pub fn unwrap_usize(&self) -> usize {
        match self {
            Value::Json(JSON::Number(n)) => n.as_u64().unwrap_or(0) as usize,
            Value::Json(JSON::String(s)) => usize::from_str(s).unwrap_or(0),
            _ => 0,
        }
    }

    pub fn unwrap_bool(&self) -> bool {
        match self {
            Value::Json(JSON::Bool(b)) => *b,
            _ => false,
        }
    }

    pub fn unwrap_precise(&self) -> &Precise {
        static PRECISE: Precise = Precise;
        &PRECISE
    }

    pub fn unwrap_json(&self) -> &serde_json::Value {
        match self {
            Value::Json(v) => v,
            _ => &JSON::Null,
        }
    }

    pub fn unwrap_json_mut(&mut self) -> &mut serde_json::Value {
        match self {
            Value::Json(v) => v,
            Value::Undefined => {
                *self = Value::new_object();
                match self {
                    Value::Json(v) => v,
                    _ => unreachable!(),
                }
            }
        }
    }

    pub fn unwrap_precise_mut(&mut self) -> &mut Precise {
        // Runtime placeholder: return a stable mutable instance without `static mut`.
        Box::leak(Box::new(Precise))
    }

    pub fn len(&self) -> usize {
        match self {
            Value::Json(JSON::Array(a)) => a.len(),
            Value::Json(JSON::Object(o)) => o.len(),
            Value::Json(JSON::String(s)) => s.len(),
            _ => 0,
        }
    }

    pub fn get(&self, _key: Value) -> Value {
        match (self, _key) {
            (Value::Json(JSON::Object(o)), Value::Json(JSON::String(k))) => {
                o.get(&k).cloned().map(Value::Json).unwrap_or(Value::Undefined)
            }
            (Value::Json(JSON::Array(a)), Value::Json(JSON::Number(n))) => {
                let idx = n.as_u64().unwrap_or(0) as usize;
                a.get(idx).cloned().map(Value::Json).unwrap_or(Value::Undefined)
            }
            (Value::Json(JSON::Object(o)), Value::Json(JSON::Number(n))) => {
                let k = n.as_u64().unwrap_or(0).to_string();
                o.get(&k).cloned().map(Value::Json).unwrap_or(Value::Undefined)
            }
            _ => Value::Undefined,
        }
    }

    pub fn set(&mut self, _key: Value, _value: Value) {
        let value_json = match _value {
            Value::Json(v) => v,
            Value::Undefined => JSON::Null,
        };
        match (self, _key) {
            (Value::Json(JSON::Object(o)), Value::Json(JSON::String(k))) => {
                o.insert(k, value_json);
            }
            (Value::Json(JSON::Array(a)), Value::Json(JSON::Number(n))) => {
                let idx = n.as_u64().unwrap_or(0) as usize;
                if idx < a.len() {
                    a[idx] = value_json;
                } else if idx == a.len() {
                    a.push(value_json);
                }
            }
            (Value::Json(JSON::Object(o)), Value::Json(JSON::Number(n))) => {
                let k = n.as_u64().unwrap_or(0).to_string();
                o.insert(k, value_json);
            }
            _ => {}
        }
    }

    pub fn push(&mut self, _value: Value) {
        if let Value::Json(JSON::Array(a)) = self {
            let v = match _value {
                Value::Json(j) => j,
                Value::Undefined => JSON::Null,
            };
            a.push(v);
        }
    }

    pub fn split(&self, _separator: Value) -> Value {
        let sep = match _separator {
            Value::Json(JSON::String(s)) => s,
            _ => String::new(),
        };
        match self {
            Value::Json(JSON::String(s)) => Value::Json(JSON::Array(s.split(&sep).map(|x| json!(x)).collect())),
            _ => Value::Undefined,
        }
    }

    pub fn deep_extend(&self, _args: Value) -> Value {
        // Placeholder for variadic deepExtend; caller should pass already-merged object.
        self.clone()
    }

    pub fn contains_key(&self, _key: Value) -> bool {
        match (self, _key) {
            (Value::Json(JSON::Object(o)), Value::Json(JSON::String(k))) => o.contains_key(&k),
            _ => false,
        }
    }

    pub fn keys(&self) -> Vec<Value> {
        match self {
            Value::Json(JSON::Object(o)) => o.keys().map(|k| Value::from(k.as_str())).collect(),
            _ => vec![],
        }
    }

    pub fn values(&self) -> Vec<Value> {
        match self {
            Value::Json(JSON::Object(o)) => o.values().cloned().map(Value::Json).collect(),
            _ => vec![],
        }
    }

    pub fn to_array(&self, _x: Value) -> Value {
        match self {
            Value::Json(JSON::Array(_)) => self.clone(),
            Value::Json(JSON::Object(o)) => Value::Json(JSON::Array(o.values().cloned().collect())),
            _ => Value::new_array(),
        }
    }

    pub fn index_of(&self, _x: Value) -> Value {
        match (self, _x) {
            (Value::Json(JSON::Array(a)), Value::Json(v)) => {
                for (i, item) in a.iter().enumerate() {
                    if item == &v {
                        return Value::from(i as i64);
                    }
                }
                Value::from(-1i64)
            }
            _ => Value::from(-1i64),
        }
    }

    pub fn join(&self, _glue: Value) -> Value {
        let glue = match _glue {
            Value::Json(JSON::String(s)) => s,
            _ => String::new(),
        };
        match self {
            Value::Json(JSON::Array(a)) => {
                let parts: Vec<String> = a.iter().map(|v| v.to_string()).collect();
                Value::from(parts.join(&glue))
            }
            _ => Value::Undefined,
        }
    }

    pub fn to_string(&self) -> Value {
        match self {
            Value::Json(v) => Value::from(v.to_string()),
            Value::Undefined => Value::from("undefined"),
        }
    }

    pub fn typeof_(&self) -> Value {
        let t = match self {
            Value::Undefined => "undefined",
            Value::Json(JSON::Null) => "null",
            Value::Json(JSON::Bool(_)) => "boolean",
            Value::Json(JSON::Number(_)) => "number",
            Value::Json(JSON::String(_)) => "string",
            Value::Json(JSON::Array(_)) => "array",
            Value::Json(JSON::Object(_)) => "object",
        };
        Value::from(t)
    }

    pub fn slice(&self, _start: Value) -> Value {
        let start = _start.unwrap_usize();
        match self {
            Value::Json(JSON::Array(a)) => {
                let slice = if start < a.len() { a[start..].to_vec() } else { vec![] };
                Value::Json(JSON::Array(slice))
            }
            Value::Json(JSON::String(s)) => Value::from(s.get(start..).unwrap_or("").to_string()),
            _ => Value::Undefined,
        }
    }
}

impl From<i64> for Value {
    fn from(v: i64) -> Self {
        Value::Json(json!(v))
    }
}

impl From<usize> for Value {
    fn from(v: usize) -> Self {
        Value::Json(json!(v))
    }
}

impl From<bool> for Value {
    fn from(v: bool) -> Self {
        Value::Json(json!(v))
    }
}

impl From<&str> for Value {
    fn from(v: &str) -> Self {
        Value::Json(json!(v))
    }
}

impl From<String> for Value {
    fn from(v: String) -> Self {
        Value::Json(json!(v))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Precise;

pub struct Math;

pub fn parse_int(_value: Value, _radix: Value) -> Value {
    match _value {
        Value::Json(JSON::Number(n)) => Value::from(n.as_i64().unwrap_or(0)),
        Value::Json(JSON::String(s)) => {
            let radix = _radix.unwrap_usize();
            let base = if radix == 0 { 10 } else { radix } as u32;
            let v = i64::from_str_radix(s.trim(), base).unwrap_or(0);
            Value::from(v)
        }
        _ => Value::from(0i64),
    }
}

pub fn shift_2(_value: Value) -> (Value, Value) {
    match _value {
        Value::Json(JSON::Array(mut a)) => {
            let first = if !a.is_empty() { Value::Json(a.remove(0)) } else { Value::Undefined };
            let second = if !a.is_empty() { Value::Json(a.remove(0)) } else { Value::Undefined };
            (first, second)
        }
        _ => (Value::Undefined, Value::Undefined),
    }
}

pub fn extend_2(_a: Value, _b: Value) -> Value {
    match (_a, _b) {
        (Value::Json(JSON::Object(mut a)), Value::Json(JSON::Object(b))) => {
            for (k, v) in b {
                a.insert(k, v);
            }
            Value::Json(JSON::Object(a))
        }
        (a, _) => a,
    }
}

pub fn normalize(_value: &Value) -> Option<JSON> {
    match _value {
        Value::Undefined => None,
        Value::Json(v) => Some(v.clone()),
    }
}

pub const PRECISE_BASE: i32 = 10;
pub const TRUNCATE: i32 = 0;
pub const ROUND: i32 = 1;
pub const ROUND_UP: i32 = 2;
pub const ROUND_DOWN: i32 = 3;
pub const DECIMAL_PLACES: i32 = 4;
pub const SIGNIFICANT_DIGITS: i32 = 5;
pub const TICK_SIZE: i32 = 6;
pub const NO_PADDING: i32 = 7;
pub const PAD_WITH_ZERO: i32 = 8;

pub trait ValueTrait {
    fn is_undefined(&self) -> bool;
    fn is_nullish(&self) -> bool;
    fn is_nonnullish(&self) -> bool;
    fn is_truthy(&self) -> bool;
    fn or_default(&self, default: Value) -> Value;
    fn is_number(&self) -> bool;
    fn is_string(&self) -> bool;
    fn is_object(&self) -> bool;
    fn is_falsy(&self) -> bool;
    fn to_upper_case(&self) -> Value;
    fn unwrap_str(&self) -> &str;
    fn unwrap_usize(&self) -> usize;
    fn unwrap_bool(&self) -> bool;
    fn unwrap_precise(&self) -> &Precise;
    fn unwrap_json(&self) -> &serde_json::Value;
    fn unwrap_json_mut(&mut self) -> &mut serde_json::Value;
    fn unwrap_precise_mut(&mut self) -> &mut Precise;
    fn len(&self) -> usize;
    fn get(&self, key: Value) -> Value;
    fn set(&mut self, key: Value, value: Value);
    fn push(&mut self, value: Value);
    fn split(&self, separator: Value) -> Value;
    fn contains_key(&self, key: Value) -> bool;
    fn keys(&self) -> Vec<Value>;
    fn values(&self) -> Vec<Value>;
    fn to_array(&self, x: Value) -> Value;
    fn index_of(&self, x: Value) -> Value;
    fn join(&self, glue: Value) -> Value;
    fn to_string(&self) -> Value;
    fn typeof_(&self) -> Value;
    fn slice(&self, start: Value) -> Value;
}

pub struct ExchangeImpl;

impl ExchangeImpl {
    pub fn init(_value: &mut Value) {
        // TODO: initialize exchange defaults
    }
}

#[async_trait]
pub trait Exchange {
    // METHODS BELOW THIS LINE ARE TRANSPILED FROM JAVASCRIPT
fn describe(&self) -> Value { Value::Undefined }

fn safe_bool_n(&self, mut dictionary_or_list: Value, mut keys: Value, mut default_value: Value) -> Value { Value::Undefined }

fn safe_bool_2(&self, mut dictionary: Value, mut key1: Value, mut key2: Value, mut default_value: Value) -> Value { Value::Undefined }

fn safe_bool(&self, mut dictionary: Value, mut key: Value, mut default_value: Value) -> Value { Value::Undefined }

fn safe_dict_n(&self, mut dictionary_or_list: Value, mut keys: Value, mut default_value: Value) -> Value { Value::Undefined }

fn safe_dict(&self, mut dictionary: Value, mut key: Value, mut default_value: Value) -> Value { Value::Undefined }

fn safe_dict_2(&self, mut dictionary: Value, mut key1: Value, mut key2: Value, mut default_value: Value) -> Value { Value::Undefined }

fn safe_list_n(&self, mut dictionary_or_list: Value, mut keys: Value, mut default_value: Value) -> Value { Value::Undefined }

fn safe_list_2(&self, mut dictionary_or_list: Value, mut key1: Value, mut key2: Value, mut default_value: Value) -> Value { Value::Undefined }

fn safe_list(&self, mut dictionary_or_list: Value, mut key: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_deltas(&mut self, mut orderbook: Value, mut deltas: Value) -> Value { Value::Undefined }

fn handle_delta(&mut self, mut bookside: Value, mut delta: Value) -> Value { Value::Undefined }

fn handle_deltas_with_keys(&mut self, mut book_side: Value, mut deltas: Value, mut price_key: Value, mut amount_key: Value, mut count_or_id_key: Value) -> Value { Value::Undefined }

fn get_cache_index(&mut self, mut orderbook: Value, mut deltas: Value) -> Value { Value::Undefined }

fn arrays_concat(&mut self, mut arrays_of_arrays: Value) -> Value { Value::Undefined }

fn find_timeframe(&mut self, mut timeframe: Value, mut timeframes: Value) -> Value { Value::Undefined }

fn check_proxy_url_settings(&mut self, mut url: Value, mut method: Value, mut headers: Value, mut body: Value) -> Value { Value::Undefined }

fn url_encoder_for_proxy_url(&mut self, mut target_url: Value) -> Value { Value::Undefined }

fn check_proxy_settings(&mut self, mut url: Value, mut method: Value, mut headers: Value, mut body: Value) -> Value { Value::Undefined }

fn check_ws_proxy_settings(&mut self) -> Value { Value::Undefined }

fn check_conflicting_proxies(&mut self, mut proxy_agent_set: Value, mut proxy_url_set: Value) -> Value { Value::Undefined }

fn check_address(&mut self, mut address: Value) -> Value { Value::Undefined }

fn find_message_hashes(&mut self, mut client: Value, mut element: Value) -> Value { Value::Undefined }

fn filter_by_limit(&self, mut array: Value, mut limit: Value, mut key: Value, mut from_start: Value) -> Value { Value::Undefined }

fn filter_by_since_limit(&self, mut array: Value, mut since: Value, mut limit: Value, mut key: Value, mut tail: Value) -> Value { Value::Undefined }

fn filter_by_value_since_limit(&self, mut array: Value, mut field: Value, mut value: Value, mut since: Value, mut limit: Value, mut key: Value, mut tail: Value) -> Value { Value::Undefined }

fn set_sandbox_mode(&mut self, mut enabled: Value) -> Value { Value::Undefined }

fn enable_demo_trading(&mut self, mut enable: Value) -> Value { Value::Undefined }

fn sign(&mut self, mut path: Value, mut api: Value, mut method: Value, mut params: Value, mut headers: Value, mut body: Value) -> Value { Value::Undefined }

async fn fetch_accounts(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_trades(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value {
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        if since.is_nonnullish() {
            request.set("since".into(), since.clone());
            request.set("startTime".into(), since.clone());
        }
        if limit.is_nonnullish() {
            request.set("limit".into(), limit.clone());
        }
        let candidates = vec![
            ("public", "GET", "trades"),
            ("public", "GET", "recent_trades"),
            ("public", "GET", "aggTrades"),
        ];
        for (api_name, method_name, path_name) in candidates {
            let rv = Exchange::request(self, path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() {
                return rv;
            }
        }
        Value::Undefined
    }

async fn fetch_trades_ws(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_liquidations(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_liquidations_for_symbols(&mut self, mut symbols: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_my_liquidations(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_my_liquidations_for_symbols(&mut self, mut symbols: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_trades(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_orders(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_trades(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_trades_for_symbols(&mut self, mut symbols: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_trades_for_symbols(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_my_trades_for_symbols(&mut self, mut symbols: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_orders_for_symbols(&mut self, mut symbols: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_ohlcv_for_symbols(&mut self, mut symbols_and_timeframes: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_ohlcv_for_symbols(&mut self, mut symbols_and_timeframes: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_order_book_for_symbols(&mut self, mut symbols: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_order_book_for_symbols(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_positions(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_ticker(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_mark_price(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_mark_prices(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_deposit_addresses(&mut self, mut codes: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_order_book(&mut self, mut symbol: Value, mut limit: Value, mut params: Value) -> Value {
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map {
                    let kl = k.to_lowercase();
                    if kl == "get" || kl == "post" || kl == "put" || kl == "delete" {
                        if let serde_json::Value::Object(paths) = v {
                            for (p, _cost) in paths {
                                out.push((api_name.to_string(), kl.to_uppercase(), p.clone()));
                            }
                        }
                    } else {
                        collect_routes(v, api_name, out);
                    }
                }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        if limit.is_nonnullish() {
            request.set("limit".into(), limit.clone());
        }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = Exchange::describe(self).get("api".into()) {
            for (api_name, node) in api_map {
                collect_routes(&node, &api_name, &mut dynamic_calls);
            }
        }
        for token in ["depth", "orderbook", "order_book"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') {
                    continue;
                }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = Exchange::request(self, path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() {
                        return rv;
                    }
                }
            }
        }
        let candidates = vec![
            ("public", "GET", "depth"),
            ("public", "GET", "orderbook"),
            ("public", "GET", "order_book"),
        ];
        for (api_name, method_name, path_name) in candidates {
            let rv = Exchange::request(self, path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() {
                return rv;
            }
        }
        Value::Undefined
    }

async fn fetch_order_book_ws(&mut self, mut symbol: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_margin_mode(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_margin_modes(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_rest_order_book_safe(&mut self, mut symbol: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_order_book(&mut self, mut symbol: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_order_book(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_time(&mut self, mut params: Value) -> Value {
        let candidates = vec![
            ("public", "GET", "time"),
            ("public", "GET", "server/time"),
            ("public", "GET", "timestamp"),
        ];
        for (api_name, method_name, path_name) in candidates {
            let rv = Exchange::request(self, path_name.into(), api_name.into(), method_name.into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() {
                return rv;
            }
        }
        Value::Undefined
    }

async fn fetch_trading_limits(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_currency(&self, mut raw_currency: Value) -> Value { Value::Undefined }

fn parse_currencies(&self, mut raw_currencies: Value) -> Value { Value::Undefined }

fn parse_market(&self, mut market: Value) -> Value { Value::Undefined }

fn parse_markets(&self, mut markets: Value) -> Value { Value::Undefined }

fn parse_ticker(&self, mut ticker: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_deposit_address(&self, mut deposit_address: Value, mut currency: Value) -> Value { Value::Undefined }

fn parse_trade(&self, mut trade: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_transaction(&self, mut transaction: Value, mut currency: Value) -> Value { Value::Undefined }

fn parse_transfer(&self, mut transfer: Value, mut currency: Value) -> Value { Value::Undefined }

fn parse_account(&self, mut account: Value) -> Value { Value::Undefined }

fn parse_ledger_entry(&self, mut item: Value, mut currency: Value) -> Value { Value::Undefined }

fn parse_order(&self, mut order: Value, mut market: Value) -> Value { Value::Undefined }

async fn fetch_cross_borrow_rates(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_isolated_borrow_rates(&mut self, mut params: Value) -> Value { Value::Undefined }

fn parse_market_leverage_tiers(&self, mut info: Value, mut market: Value) -> Value { Value::Undefined }

async fn fetch_leverage_tiers(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_position(&self, mut position: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_funding_rate_history(&self, mut info: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_borrow_interest(&self, mut info: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_isolated_borrow_rate(&self, mut info: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_ws_trade(&self, mut trade: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_ws_order(&self, mut order: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_ws_order_trade(&self, mut trade: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_ws_ohlcv(&self, mut ohlcv: Value, mut market: Value) -> Value { Value::Undefined }

async fn fetch_funding_rates(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_funding_intervals(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_funding_rate(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_funding_rates(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_funding_rates_for_symbols(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn transfer(&mut self, mut code: Value, mut amount: Value, mut from_account: Value, mut to_account: Value, mut params: Value) -> Value { Value::Undefined }

async fn withdraw(&mut self, mut code: Value, mut amount: Value, mut address: Value, mut tag: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_deposit_address(&mut self, mut code: Value, mut params: Value) -> Value { Value::Undefined }

async fn set_leverage(&mut self, mut leverage: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_leverage(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_leverages(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn set_position_mode(&mut self, mut hedged: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn add_margin(&mut self, mut symbol: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn reduce_margin(&mut self, mut symbol: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn set_margin(&mut self, mut symbol: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_long_short_ratio(&mut self, mut symbol: Value, mut timeframe: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_long_short_ratio_history(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_margin_adjustment_history(&mut self, mut symbol: Value, mut r#type: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn set_margin_mode(&mut self, mut margin_mode: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_deposit_addresses_by_network(&mut self, mut code: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_open_interest_history(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_open_interest(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_open_interests(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn sign_in(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_payment_methods(&mut self, mut params: Value) -> Value { Value::Undefined }

fn parse_to_int(&self, mut number: Value) -> Value { Value::Undefined }

fn parse_to_numeric(&self, mut number: Value) -> Value { Value::Undefined }

fn is_round_number(&mut self, mut value: Value) -> Value { Value::Undefined }

fn safe_number_omit_zero(&self, mut obj: Value, mut key: Value, mut default_value: Value) -> Value { Value::Undefined }

fn safe_integer_omit_zero(&self, mut obj: Value, mut key: Value, mut default_value: Value) -> Value { Value::Undefined }

fn after_construct(&mut self) -> Value { Value::Undefined }

fn init_rest_rate_limiter(&mut self) -> Value { Value::Undefined }

fn features_generator(&mut self) -> Value { Value::Undefined }

fn features_mapper(&mut self, mut initial_features: Value, mut market_type: Value, mut sub_type: Value) -> Value { Value::Undefined }

fn feature_value(&mut self, mut symbol: Value, mut method_name: Value, mut param_name: Value, mut default_value: Value) -> Value { Value::Undefined }

fn feature_value_by_type(&mut self, mut market_type: Value, mut sub_type: Value, mut method_name: Value, mut param_name: Value, mut default_value: Value) -> Value { Value::Undefined }

fn orderbook_checksum_message(&mut self, mut symbol: Value) -> Value { Value::Undefined }

fn create_networks_by_id_object(&mut self) -> Value { Value::Undefined }

fn get_default_options(&mut self) -> Value { Value::Undefined }

fn safe_ledger_entry(&self, mut entry: Value, mut currency: Value) -> Value { Value::Undefined }

fn safe_currency_structure(&self, mut currency: Value) -> Value { Value::Undefined }

fn safe_market_structure(&self, mut market: Value) -> Value { Value::Undefined }

fn set_markets(&mut self, mut markets: Value, mut currencies: Value) -> Value { Value::Undefined }

fn set_markets_from_exchange(&mut self, mut source_exchange: Value) -> Value { Value::Undefined }

fn get_describe_for_extended_ws_exchange(&mut self, mut current_rest_instance: Value, mut parent_rest_instance: Value, mut ws_base_describe: Value) -> Value { Value::Undefined }

fn safe_balance(&self, mut balance: Value) -> Value { Value::Undefined }

fn safe_order(&self, mut order: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_orders(&self, mut orders: Value, mut market: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn calculate_fee_with_rate(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut taker_or_maker: Value, mut fee_rate: Value, mut params: Value) -> Value { Value::Undefined }

fn calculate_fee(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut taker_or_maker: Value, mut params: Value) -> Value { Value::Undefined }

fn safe_liquidation(&self, mut liquidation: Value, mut market: Value) -> Value { Value::Undefined }

fn safe_trade(&self, mut trade: Value, mut market: Value) -> Value { Value::Undefined }

fn create_ccxt_trade_id(&mut self, mut timestamp: Value, mut side: Value, mut amount: Value, mut price: Value, mut taker_or_maker: Value) -> Value { Value::Undefined }

fn parsed_fee_and_fees(&self, mut container: Value) -> Value { Value::Undefined }

fn parse_fee_numeric(&self, mut fee: Value) -> Value { Value::Undefined }

fn find_nearest_ceiling(&mut self, mut arr: Value, mut provided_value: Value) -> Value { Value::Undefined }

fn invert_flat_string_dictionary(&mut self, mut dict: Value) -> Value { Value::Undefined }

fn reduce_fees_by_currency(&mut self, mut fees: Value) -> Value { Value::Undefined }

fn safe_ticker(&self, mut ticker: Value, mut market: Value) -> Value { Value::Undefined }

async fn fetch_borrow_rate(&mut self, mut code: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn repay_cross_margin(&mut self, mut code: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn repay_isolated_margin(&mut self, mut symbol: Value, mut code: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn borrow_cross_margin(&mut self, mut code: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn borrow_isolated_margin(&mut self, mut symbol: Value, mut code: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn borrow_margin(&mut self, mut code: Value, mut amount: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn repay_margin(&mut self, mut code: Value, mut amount: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_ohlcv(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value {
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map {
                    let kl = k.to_lowercase();
                    if kl == "get" || kl == "post" || kl == "put" || kl == "delete" {
                        if let serde_json::Value::Object(paths) = v {
                            for (p, _cost) in paths {
                                out.push((api_name.to_string(), kl.to_uppercase(), p.clone()));
                            }
                        }
                    } else {
                        collect_routes(v, api_name, out);
                    }
                }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        request.set("timeframe".into(), timeframe.clone());
        request.set("interval".into(), timeframe.clone());
        if since.is_nonnullish() {
            request.set("since".into(), since.clone());
            request.set("startTime".into(), since.clone());
        }
        if limit.is_nonnullish() {
            request.set("limit".into(), limit.clone());
        }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = Exchange::describe(self).get("api".into()) {
            for (api_name, node) in api_map {
                collect_routes(&node, &api_name, &mut dynamic_calls);
            }
        }
        for token in ["klines", "candles", "ohlcv"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') {
                    continue;
                }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = Exchange::request(self, path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() {
                        return rv;
                    }
                }
            }
        }
        let candidates = vec![
            ("public", "GET", "klines"),
            ("public", "GET", "candles"),
            ("public", "GET", "ohlcv"),
        ];
        for (api_name, method_name, path_name) in candidates {
            let rv = Exchange::request(self, path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() {
                return rv;
            }
        }
        Value::Undefined
    }

async fn fetch_ohlcv_ws(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_ohlcv(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn convert_trading_view_to_ohlcv(&self, mut ohlcvs: Value, mut timestamp: Value, mut open: Value, mut high: Value, mut low: Value, mut close: Value, mut volume: Value, mut ms: Value) -> Value { Value::Undefined }

fn convert_ohlcv_to_trading_view(&self, mut ohlcvs: Value, mut timestamp: Value, mut open: Value, mut high: Value, mut low: Value, mut close: Value, mut volume: Value, mut ms: Value) -> Value { Value::Undefined }

async fn fetch_web_endpoint(&mut self, mut method: Value, mut endpoint_method: Value, mut return_as_json: Value, mut start_regex: Value, mut end_regex: Value) -> Value { Value::Undefined }

fn market_ids(&mut self, mut symbols: Value) -> Value { Value::Undefined }

fn currency_ids(&mut self, mut codes: Value) -> Value { Value::Undefined }

fn markets_for_symbols(&mut self, mut symbols: Value) -> Value { Value::Undefined }

fn market_symbols(&self, mut symbols: Value, mut r#type: Value, mut allow_empty: Value, mut same_type_only: Value, mut same_sub_type_only: Value) -> Value { Value::Undefined }

fn market_codes(&mut self, mut codes: Value) -> Value { Value::Undefined }

fn parse_bids_asks(&self, mut bidasks: Value, mut price_key: Value, mut amount_key: Value, mut count_or_id_key: Value) -> Value { Value::Undefined }

async fn fetch_l2_order_book(&mut self, mut symbol: Value, mut limit: Value, mut params: Value) -> Value {
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        if limit.is_nonnullish() {
            request.set("limit".into(), limit.clone());
        }
        let candidates = vec![
            ("public", "GET", "depth"),
            ("public", "GET", "orderbook"),
            ("public", "GET", "order_book"),
        ];
        for (api_name, method_name, path_name) in candidates {
            let rv = Exchange::request(self, path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() {
                return rv;
            }
        }
        Value::Undefined
    }

fn filter_by_symbol(&self, mut objects: Value, mut symbol: Value) -> Value { Value::Undefined }

fn parse_ohlcv(&self, mut ohlcv: Value, mut market: Value) -> Value { Value::Undefined }

fn network_code_to_id(&mut self, mut network_code: Value, mut currency_code: Value) -> Value { Value::Undefined }

fn network_id_to_code(&mut self, mut network_id: Value, mut currency_code: Value) -> Value { Value::Undefined }

fn handle_network_code_and_params(&mut self, mut params: Value) -> Value { Value::Undefined }

fn default_network_code(&mut self, mut currency_code: Value) -> Value { Value::Undefined }

fn select_network_code_from_unified_networks(&mut self, mut currency_code: Value, mut network_code: Value, mut indexed_network_entries: Value) -> Value { Value::Undefined }

fn select_network_id_from_raw_networks(&mut self, mut currency_code: Value, mut network_code: Value, mut indexed_network_entries: Value) -> Value { Value::Undefined }

fn select_network_key_from_networks(&mut self, mut currency_code: Value, mut network_code: Value, mut indexed_network_entries: Value, mut is_indexed_by_unified_network_code: Value) -> Value { Value::Undefined }

fn safe_number_2(&self, mut dictionary: Value, mut key1: Value, mut key2: Value, mut d: Value) -> Value { Value::Undefined }

fn parse_order_book(&self, mut orderbook: Value, mut symbol: Value, mut timestamp: Value, mut bids_key: Value, mut asks_key: Value, mut price_key: Value, mut amount_key: Value, mut count_or_id_key: Value) -> Value { Value::Undefined }

fn parse_ohlcvs(&self, mut ohlcvs: Value, mut market: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut tail: Value) -> Value { Value::Undefined }

fn parse_leverage_tiers(&self, mut response: Value, mut symbols: Value, mut market_id_key: Value) -> Value { Value::Undefined }

async fn load_trading_limits(&mut self, mut symbols: Value, mut reload: Value, mut params: Value) -> Value { Value::Undefined }

fn safe_position(&self, mut position: Value) -> Value { Value::Undefined }

fn parse_positions(&self, mut positions: Value, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_accounts(&self, mut accounts: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_trades_helper(&self, mut is_ws: Value, mut trades: Value, mut market: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_trades(&self, mut trades: Value, mut market: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_ws_trades(&self, mut trades: Value, mut market: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_transactions(&self, mut transactions: Value, mut currency: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_transfers(&self, mut transfers: Value, mut currency: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_ledger(&self, mut data: Value, mut currency: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn nonce(&self) -> Value { Value::Undefined }

fn set_headers(&mut self, mut headers: Value) -> Value { Value::Undefined }

fn currency_id(&mut self, mut code: Value) -> Value { Value::Undefined }

fn market_id(&mut self, mut symbol: Value) -> Value { Value::Undefined }

fn symbol(&self, mut symbol: Value) -> Value { Value::Undefined }

fn handle_param_string(&mut self, mut params: Value, mut param_name: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_param_string_2(&mut self, mut params: Value, mut param_name_1: Value, mut param_name_2: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_param_integer(&mut self, mut params: Value, mut param_name: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_param_integer_2(&mut self, mut params: Value, mut param_name_1: Value, mut param_name_2: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_param_bool(&mut self, mut params: Value, mut param_name: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_param_bool_2(&mut self, mut params: Value, mut param_name_1: Value, mut param_name_2: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_request_network(&mut self, mut params: Value, mut request: Value, mut exchange_specific_key: Value, mut currency_code: Value, mut is_required: Value) -> Value { Value::Undefined }

fn resolve_path(&mut self, mut path: Value, mut params: Value) -> Value { Value::Undefined }

fn get_list_from_object_values(&mut self, mut objects: Value, mut key: Value) -> Value { Value::Undefined }

fn get_symbols_for_market_type(&mut self, mut market_type: Value, mut sub_type: Value, mut symbol_with_active_status: Value, mut symbol_with_unknown_status: Value) -> Value { Value::Undefined }

fn filter_by_array(&self, mut objects: Value, mut key: Value, mut values: Value, mut indexed: Value) -> Value { Value::Undefined }

async fn fetch2(&mut self, mut path: Value, mut api: Value, mut method: Value, mut params: Value, mut headers: Value, mut body: Value, mut config: Value) -> Value { Value::Undefined }

async fn request(&mut self, mut path: Value, mut api: Value, mut method: Value, mut params: Value, mut headers: Value, mut body: Value, mut config: Value) -> Value {
        fn first_string(v: &serde_json::Value) -> Option<String> {
            match v {
                serde_json::Value::String(s) => Some(s.clone()),
                serde_json::Value::Object(map) => {
                    for (_k, vv) in map {
                        if let Some(found) = first_string(vv) {
                            return Some(found);
                        }
                    }
                    None
                }
                serde_json::Value::Array(arr) => {
                    for vv in arr {
                        if let Some(found) = first_string(vv) {
                            return Some(found);
                        }
                    }
                    None
                }
                _ => None,
            }
        }

        let urls_api = Exchange::describe(self).get("urls".into()).get("api".into());
        let mut base = urls_api.get(api.clone());
        if !base.is_string() {
            base = urls_api.get("public".into());
        }
        if !base.is_string() {
            if let Value::Json(json_api) = urls_api.clone() {
                if let Some(found) = first_string(&json_api) {
                    base = Value::from(found);
                }
            }
        }
        if !base.is_string() {
            base = urls_api.clone();
        }
        if !base.is_string() || !path.is_string() {
            eprintln!(
                "ccxt-rs request skipped: base url missing (api='{}', path='{}')",
                api.unwrap_str(),
                path.unwrap_str()
            );
            return Value::Undefined;
        }
        let mut base_url = base.unwrap_str().to_string();
        let hostname = Exchange::describe(self).get("hostname".into());
        if hostname.is_string() {
            base_url = base_url.replace("{hostname}", hostname.unwrap_str());
        }
        // Last-resort placeholder cleanup for templated domains in describe().
        while let Some(start) = base_url.find('{') {
            if let Some(rel_end) = base_url[start..].find('}') {
                let end = start + rel_end;
                let replacement = if hostname.is_string() { hostname.unwrap_str() } else { "" };
                base_url.replace_range(start..=end, replacement);
            } else {
                break;
            }
        }

        let mut url = format!("{}/{}", base_url.trim_end_matches('/'), path.unwrap_str());
        let method_upper = method.unwrap_str().to_uppercase();

        let mut query_pairs: Vec<String> = vec![];
        if let Value::Json(serde_json::Value::Object(map)) = params.clone() {
            for (k, v) in map {
                if v.is_null() {
                    continue;
                }
                let value_str = match v {
                    serde_json::Value::String(s) => s,
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => if b { "true".into() } else { "false".into() },
                    _ => v.to_string(),
                };
                query_pairs.push(format!("{}={}", urlencoding::encode(&k), urlencoding::encode(&value_str)));
            }
        }

        if method_upper == "GET" && !query_pairs.is_empty() {
            url.push('?');
            url.push_str(&query_pairs.join("&"));
        }

        let client = match reqwest::Client::builder()
            .no_proxy()
            .timeout(std::time::Duration::from_secs(20))
            .user_agent("ccxt-rs-smoke/0.1")
            .build()
        {
            Ok(c) => c,
            Err(err) => {
                eprintln!("ccxt-rs request client build failed for {}: {}", url, err);
                return Value::Undefined;
            }
        };
        let mut req = match method_upper.as_str() {
            "POST" => client.post(&url),
            "PUT" => client.put(&url),
            "DELETE" => client.delete(&url),
            _ => client.get(&url),
        };
        if method_upper != "GET" {
            if let Value::Json(serde_json::Value::Object(map)) = params.clone() {
                let body_text = serde_json::to_string(&map).unwrap_or_else(|_| "{}".to_string());
                req = req.header("content-type", "application/json").body(body_text);
            }
        }

        let response = match req.send().await {
            Ok(r) => r,
            Err(err) => {
                eprintln!("ccxt-rs request send failed for {} {}: {}", method_upper, url, err);
                return Value::Undefined;
            }
        };
        let text = match response.text().await {
            Ok(t) => t,
            Err(err) => {
                eprintln!("ccxt-rs request body read failed for {} {}: {}", method_upper, url, err);
                return Value::Undefined;
            }
        };
        match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(json) => Value::Json(json),
            Err(_) => Value::from(text),
        }
    }

async fn load_accounts(&mut self, mut reload: Value, mut params: Value) -> Value { Value::Undefined }

fn build_ohlcvc(&mut self, mut trades: Value, mut timeframe: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }

fn parse_trading_view_ohlcv(&self, mut ohlcvs: Value, mut market: Value, mut timeframe: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }

async fn edit_limit_buy_order(&mut self, mut id: Value, mut symbol: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn edit_limit_sell_order(&mut self, mut id: Value, mut symbol: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn edit_limit_order(&mut self, mut id: Value, mut symbol: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn edit_order(&mut self, mut id: Value, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn edit_order_with_client_order_id(&mut self, mut client_order_id: Value, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn edit_order_ws(&mut self, mut id: Value, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_position(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_position_ws(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_position(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_positions(&mut self, mut symbols: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_position_for_symbols(&mut self, mut symbols: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_positions_for_symbol(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_positions_for_symbol_ws(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_positions(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_positions_ws(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_positions_risk(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_bids_asks(&mut self, mut symbols: Value, mut params: Value) -> Value {
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        if symbols.is_nonnullish() {
            request.set("symbols".into(), symbols.clone());
        }
        let candidates = vec![
            ("public", "GET", "ticker/bookTicker"),
            ("public", "GET", "bookticker"),
            ("public", "GET", "bidsasks"),
            ("public", "GET", "tickers"),
        ];
        for (api_name, method_name, path_name) in candidates {
            let rv = Exchange::request(self, path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() {
                return rv;
            }
        }
        Value::Undefined
    }

async fn fetch_borrow_interest(&mut self, mut code: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_ledger(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_ledger_entry(&mut self, mut id: Value, mut code: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_bid_ask(&self, mut bidask: Value, mut price_key: Value, mut amount_key: Value, mut count_or_id_key: Value) -> Value { Value::Undefined }

fn safe_currency(&self, mut currency_id: Value, mut currency: Value) -> Value { Value::Undefined }

fn safe_market(&self, mut market_id: Value, mut market: Value, mut delimiter: Value, mut market_type: Value) -> Value { Value::Undefined }

fn market_or_null(&mut self, mut symbol: Value) -> Value { Value::Undefined }

fn check_required_credentials(&mut self, mut error: Value) -> Value { Value::Undefined }

fn oath(&mut self) -> Value { Value::Undefined }

async fn fetch_balance(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_balance_ws(&mut self, mut params: Value) -> Value { Value::Undefined }

fn parse_balance(&self, mut response: Value) -> Value { Value::Undefined }

async fn watch_balance(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_partial_balance(&mut self, mut part: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_free_balance(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_used_balance(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_total_balance(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_status(&mut self, mut params: Value) -> Value {
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map {
                    let kl = k.to_lowercase();
                    if kl == "get" || kl == "post" || kl == "put" || kl == "delete" {
                        if let serde_json::Value::Object(paths) = v {
                            for (p, _cost) in paths {
                                out.push((api_name.to_string(), kl.to_uppercase(), p.clone()));
                            }
                        }
                    } else {
                        collect_routes(v, api_name, out);
                    }
                }
            }
        }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = Exchange::describe(self).get("api".into()) {
            for (api_name, node) in api_map {
                collect_routes(&node, &api_name, &mut dynamic_calls);
            }
        }
        for token in ["status", "ping", "time", "system/status"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') {
                    continue;
                }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = Exchange::request(self, path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() {
                        return rv;
                    }
                }
            }
        }
        let candidates = vec![
            ("public", "GET", "status"),
            ("public", "GET", "ping"),
            ("public", "GET", "time"),
            ("sapi", "GET", "system/status"),
        ];
        for (api_name, method_name, path_name) in candidates {
            let rv = Exchange::request(self, path_name.into(), api_name.into(), method_name.into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() {
                return rv;
            }
        }
        Value::Undefined
    }

async fn fetch_transaction_fee(&mut self, mut code: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_transaction_fees(&mut self, mut codes: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_deposit_withdraw_fees(&mut self, mut codes: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_deposit_withdraw_fee(&mut self, mut code: Value, mut params: Value) -> Value { Value::Undefined }

fn get_supported_mapping(&self, mut key: Value, mut mapping: Value) -> Value { Value::Undefined }

async fn fetch_cross_borrow_rate(&mut self, mut code: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_isolated_borrow_rate(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

fn handle_option_and_params(&mut self, mut params: Value, mut method_name: Value, mut option_name: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_option_and_params_2(&mut self, mut params: Value, mut method_name_1: Value, mut option_name_1: Value, mut option_name_2: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_option(&mut self, mut method_name: Value, mut option_name: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_market_type_and_params(&mut self, mut method_name: Value, mut market: Value, mut params: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_sub_type_and_params(&mut self, mut method_name: Value, mut market: Value, mut params: Value, mut default_value: Value) -> Value { Value::Undefined }

fn handle_margin_mode_and_params(&mut self, mut method_name: Value, mut params: Value, mut default_value: Value) -> Value { Value::Undefined }

fn throw_exactly_matched_exception(&mut self, mut exact: Value, mut string: Value, mut message: Value) -> Value { Value::Undefined }

fn throw_broadly_matched_exception(&mut self, mut broad: Value, mut string: Value, mut message: Value) -> Value { Value::Undefined }

fn find_broadly_matched_key(&mut self, mut broad: Value, mut string: Value) -> Value { Value::Undefined }

fn handle_errors(&mut self, mut status_code: Value, mut status_text: Value, mut url: Value, mut method: Value, mut response_headers: Value, mut response_body: Value, mut response: Value, mut request_headers: Value, mut request_body: Value) -> Value { Value::Undefined }

fn calculate_rate_limiter_cost(&mut self, mut api: Value, mut method: Value, mut path: Value, mut params: Value, mut config: Value) -> Value { Value::Undefined }

async fn fetch_ticker(&mut self, mut symbol: Value, mut params: Value) -> Value {
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map {
                    let kl = k.to_lowercase();
                    if kl == "get" || kl == "post" || kl == "put" || kl == "delete" {
                        if let serde_json::Value::Object(paths) = v {
                            for (p, _cost) in paths {
                                out.push((api_name.to_string(), kl.to_uppercase(), p.clone()));
                            }
                        }
                    } else {
                        collect_routes(v, api_name, out);
                    }
                }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = Exchange::describe(self).get("api".into()) {
            for (api_name, node) in api_map {
                collect_routes(&node, &api_name, &mut dynamic_calls);
            }
        }
        for token in ["ticker/24hr", "ticker", "ticker/price", "bookticker", "tickers"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') {
                    continue;
                }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = Exchange::request(self, path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() {
                        return rv;
                    }
                }
            }
        }
        let candidates = vec![
            ("public", "GET", "ticker/24hr"),
            ("public", "GET", "ticker"),
            ("public", "GET", "ticker/price"),
        ];
        for (api_name, method_name, path_name) in candidates {
            let rv = Exchange::request(self, path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() {
                return rv;
            }
        }
        Value::Undefined
    }

async fn fetch_mark_price(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_ticker_ws(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_ticker(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_tickers(&mut self, mut symbols: Value, mut params: Value) -> Value {
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map {
                    let kl = k.to_lowercase();
                    if kl == "get" || kl == "post" || kl == "put" || kl == "delete" {
                        if let serde_json::Value::Object(paths) = v {
                            for (p, _cost) in paths {
                                out.push((api_name.to_string(), kl.to_uppercase(), p.clone()));
                            }
                        }
                    } else {
                        collect_routes(v, api_name, out);
                    }
                }
            }
        }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = Exchange::describe(self).get("api".into()) {
            for (api_name, node) in api_map {
                collect_routes(&node, &api_name, &mut dynamic_calls);
            }
        }
        for token in ["tickers", "ticker/24hr", "ticker", "bookticker"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') {
                    continue;
                }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = Exchange::request(self, path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() {
                        return rv;
                    }
                }
            }
        }
        let candidates = vec![
            ("public", "GET", "ticker/24hr"),
            ("public", "GET", "tickers"),
            ("public", "GET", "ticker"),
        ];
        for (api_name, method_name, path_name) in candidates {
            let rv = Exchange::request(self, path_name.into(), api_name.into(), method_name.into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() {
                return rv;
            }
        }
        Value::Undefined
    }

async fn fetch_mark_prices(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_tickers_ws(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_order_books(&mut self, mut symbols: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_bids_asks(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_tickers(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_tickers(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_order(&mut self, mut id: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_order_with_client_order_id(&mut self, mut client_order_id: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_order_ws(&mut self, mut id: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_order_status(&mut self, mut id: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_unified_order(&mut self, mut order: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_twap_order(&mut self, mut symbol: Value, mut side: Value, mut amount: Value, mut duration: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_convert_trade(&mut self, mut id: Value, mut from_code: Value, mut to_code: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_convert_trade(&mut self, mut id: Value, mut code: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_convert_trade_history(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_position_mode(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_trailing_amount_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trailing_amount: Value, mut trailing_trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_trailing_amount_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trailing_amount: Value, mut trailing_trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_trailing_percent_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trailing_percent: Value, mut trailing_trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_trailing_percent_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trailing_percent: Value, mut trailing_trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_market_order_with_cost(&mut self, mut symbol: Value, mut side: Value, mut cost: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_market_buy_order_with_cost(&mut self, mut symbol: Value, mut cost: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_market_sell_order_with_cost(&mut self, mut symbol: Value, mut cost: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_market_order_with_cost_ws(&mut self, mut symbol: Value, mut side: Value, mut cost: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_trigger_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_trigger_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_stop_loss_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut stop_loss_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_stop_loss_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut stop_loss_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_take_profit_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut take_profit_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_take_profit_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut take_profit_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_order_with_take_profit_and_stop_loss(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut take_profit: Value, mut stop_loss: Value, mut params: Value) -> Value { Value::Undefined }

fn set_take_profit_and_stop_loss_params(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut take_profit: Value, mut stop_loss: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_order_with_take_profit_and_stop_loss_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut take_profit: Value, mut stop_loss: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_orders(&mut self, mut orders: Value, mut params: Value) -> Value { Value::Undefined }

async fn edit_orders(&mut self, mut orders: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_order(&mut self, mut id: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_order_with_client_order_id(&mut self, mut client_order_id: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_order_ws(&mut self, mut id: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_orders(&mut self, mut ids: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_orders_with_client_order_ids(&mut self, mut client_order_ids: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_orders_ws(&mut self, mut ids: Value, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_all_orders(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_all_orders_after(&mut self, mut timeout: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_orders_for_symbols(&mut self, mut orders: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_all_orders_ws(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn cancel_unified_order(&mut self, mut order: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_orders(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_orders_ws(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_order_trades(&mut self, mut id: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_orders(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_open_orders(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_open_orders_ws(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_closed_orders(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_canceled_orders(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_canceled_and_closed_orders(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_closed_orders_ws(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_my_trades(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_my_liquidations(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_liquidations(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_my_trades_ws(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_my_trades(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_greeks(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_all_greeks(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_option_chain(&mut self, mut code: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_option(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_convert_quote(&mut self, mut from_code: Value, mut to_code: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_deposits_withdrawals(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_deposits(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_withdrawals(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_deposits_ws(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_withdrawals_ws(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_funding_rate_history(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_funding_history(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn close_position(&mut self, mut symbol: Value, mut side: Value, mut params: Value) -> Value { Value::Undefined }

async fn close_all_positions(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_l3_order_book(&mut self, mut symbol: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_last_price(&self, mut price: Value, mut market: Value) -> Value { Value::Undefined }

async fn fetch_deposit_address(&mut self, mut code: Value, mut params: Value) -> Value { Value::Undefined }

fn account(&self) -> Value { Value::Undefined }

fn common_currency_code(&self, mut code: Value) -> Value { Value::Undefined }

fn currency(&self, mut code: Value) -> Value { Value::Undefined }

fn market(&self, mut symbol: Value) -> Value { Value::Undefined }

fn create_expired_option_market(&mut self, mut symbol: Value) -> Value { Value::Undefined }

fn is_leveraged_currency(&mut self, mut currency_code: Value, mut check_base_coin: Value, mut existing_currencies: Value) -> Value { Value::Undefined }

fn handle_withdraw_tag_and_params(&mut self, mut tag: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_limit_order(&mut self, mut symbol: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_limit_order_ws(&mut self, mut symbol: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_market_order(&mut self, mut symbol: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_market_order_ws(&mut self, mut symbol: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_limit_buy_order(&mut self, mut symbol: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_limit_buy_order_ws(&mut self, mut symbol: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_limit_sell_order(&mut self, mut symbol: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_limit_sell_order_ws(&mut self, mut symbol: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_market_buy_order(&mut self, mut symbol: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_market_buy_order_ws(&mut self, mut symbol: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_market_sell_order(&mut self, mut symbol: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_market_sell_order_ws(&mut self, mut symbol: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }

fn cost_to_precision(&mut self, mut symbol: Value, mut cost: Value) -> Value { Value::Undefined }

fn price_to_precision(&mut self, mut symbol: Value, mut price: Value) -> Value { Value::Undefined }

fn amount_to_precision(&mut self, mut symbol: Value, mut amount: Value) -> Value { Value::Undefined }

fn fee_to_precision(&mut self, mut symbol: Value, mut fee: Value) -> Value { Value::Undefined }

fn currency_to_precision(&mut self, mut code: Value, mut fee: Value, mut network_code: Value) -> Value { Value::Undefined }

fn force_string(&mut self, mut value: Value) -> Value { Value::Undefined }

fn is_tick_precision(&mut self) -> Value { Value::Undefined }

fn is_decimal_precision(&mut self) -> Value { Value::Undefined }

fn is_significant_precision(&mut self) -> Value { Value::Undefined }

fn safe_number(&self, mut obj: Value, mut key: Value, mut default_number: Value) -> Value { Value::Undefined }

fn safe_number_n(&self, mut obj: Value, mut arr: Value, mut default_number: Value) -> Value { Value::Undefined }

fn parse_precision(&self, mut precision: Value) -> Value { Value::Undefined }

fn integer_precision_to_amount(&mut self, mut precision: Value) -> Value { Value::Undefined }

async fn load_time_difference(&mut self, mut params: Value) -> Value { Value::Undefined }

fn implode_hostname(&mut self, mut url: Value) -> Value { Value::Undefined }

async fn fetch_market_leverage_tiers(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_post_only_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_post_only_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_reduce_only_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_reduce_only_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_stop_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_stop_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_stop_limit_order(&mut self, mut symbol: Value, mut side: Value, mut amount: Value, mut price: Value, mut trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_stop_limit_order_ws(&mut self, mut symbol: Value, mut side: Value, mut amount: Value, mut price: Value, mut trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_stop_market_order(&mut self, mut symbol: Value, mut side: Value, mut amount: Value, mut trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_stop_market_order_ws(&mut self, mut symbol: Value, mut side: Value, mut amount: Value, mut trigger_price: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_sub_account(&mut self, mut name: Value, mut params: Value) -> Value { Value::Undefined }

fn safe_currency_code(&self, mut currency_id: Value, mut currency: Value) -> Value { Value::Undefined }

fn filter_by_symbol_since_limit(&self, mut array: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut tail: Value) -> Value { Value::Undefined }

fn filter_by_currency_since_limit(&self, mut array: Value, mut code: Value, mut since: Value, mut limit: Value, mut tail: Value) -> Value { Value::Undefined }

fn filter_by_symbols_since_limit(&self, mut array: Value, mut symbols: Value, mut since: Value, mut limit: Value, mut tail: Value) -> Value { Value::Undefined }

fn parse_last_prices(&self, mut prices_data: Value, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_tickers(&self, mut tickers: Value, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_deposit_addresses(&self, mut addresses: Value, mut codes: Value, mut indexed: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_borrow_interests(&self, mut response: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_borrow_rate(&self, mut info: Value, mut currency: Value) -> Value { Value::Undefined }

fn parse_borrow_rate_history(&self, mut response: Value, mut code: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }

fn parse_isolated_borrow_rates(&self, mut info: Value) -> Value { Value::Undefined }

fn parse_funding_rate_histories(&self, mut response: Value, mut market: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }

fn safe_symbol(&self, mut market_id: Value, mut market: Value, mut delimiter: Value, mut market_type: Value) -> Value { Value::Undefined }

fn parse_funding_rate(&self, mut contract: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_funding_rates(&self, mut response: Value, mut symbols: Value) -> Value { Value::Undefined }

fn parse_long_short_ratio(&self, mut info: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_long_short_ratio_history(&self, mut response: Value, mut market: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }

fn handle_trigger_prices_and_params(&mut self, mut symbol: Value, mut params: Value, mut omit_params: Value) -> Value { Value::Undefined }

fn handle_trigger_direction_and_params(&mut self, mut params: Value, mut exchange_specific_key: Value, mut allow_empty: Value) -> Value { Value::Undefined }

fn handle_trigger_and_params(&mut self, mut params: Value) -> Value { Value::Undefined }

fn is_trigger_order(&mut self, mut params: Value) -> Value { Value::Undefined }

fn is_post_only(&mut self, mut is_market_order: Value, mut exchange_specific_param: Value, mut params: Value) -> Value { Value::Undefined }

fn handle_post_only(&mut self, mut is_market_order: Value, mut exchange_specific_post_only_option: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_last_prices(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_trading_fees(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_trading_fees_ws(&mut self, mut params: Value) -> Value { Value::Undefined }

async fn fetch_trading_fee(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_convert_currencies(&mut self, mut params: Value) -> Value { Value::Undefined }

fn parse_open_interest(&self, mut interest: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_open_interests(&self, mut response: Value, mut symbols: Value) -> Value { Value::Undefined }

fn parse_open_interests_history(&self, mut response: Value, mut market: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }

async fn fetch_funding_rate(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_funding_interval(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_mark_ohlcv(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_index_ohlcv(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_premium_index_ohlcv(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn handle_time_in_force(&mut self, mut params: Value) -> Value { Value::Undefined }

fn convert_type_to_account(&self, mut account: Value) -> Value { Value::Undefined }

fn check_required_argument(&mut self, mut method_name: Value, mut argument: Value, mut argument_name: Value, mut options: Value) -> Value { Value::Undefined }

fn check_required_margin_argument(&mut self, mut method_name: Value, mut symbol: Value, mut margin_mode: Value) -> Value { Value::Undefined }

fn parse_deposit_withdraw_fees(&self, mut response: Value, mut codes: Value, mut currency_id_key: Value) -> Value { Value::Undefined }

fn parse_deposit_withdraw_fee(&self, mut fee: Value, mut currency: Value) -> Value { Value::Undefined }

fn deposit_withdraw_fee(&mut self, mut info: Value) -> Value { Value::Undefined }

fn assign_default_deposit_withdraw_fees(&mut self, mut fee: Value, mut currency: Value) -> Value { Value::Undefined }

fn parse_income(&self, mut info: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_incomes(&self, mut incomes: Value, mut market: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }

fn get_market_from_symbols(&mut self, mut symbols: Value) -> Value { Value::Undefined }

fn parse_ws_ohlcvs(&self, mut ohlcvs: Value, mut market: Value, mut timeframe: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }

async fn fetch_transactions(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn filter_by_array_positions(&self, mut objects: Value, mut key: Value, mut values: Value, mut indexed: Value) -> Value { Value::Undefined }

fn filter_by_array_tickers(&self, mut objects: Value, mut key: Value, mut values: Value, mut indexed: Value) -> Value { Value::Undefined }

fn create_ohlcv_object(&mut self, mut symbol: Value, mut timeframe: Value, mut data: Value) -> Value { Value::Undefined }

fn handle_max_entries_per_request_and_params(&mut self, mut method: Value, mut max_entries_per_request: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_paginated_call_dynamic(&mut self, mut method: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value, mut max_entries_per_request: Value, mut remove_repeated: Value) -> Value { Value::Undefined }

async fn safe_deterministic_call(&self, mut method: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut timeframe: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_paginated_call_deterministic(&mut self, mut method: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut timeframe: Value, mut params: Value, mut max_entries_per_request: Value) -> Value { Value::Undefined }

async fn fetch_paginated_call_cursor(&mut self, mut method: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value, mut cursor_received: Value, mut cursor_sent: Value, mut cursor_increment: Value, mut max_entries_per_request: Value) -> Value { Value::Undefined }

async fn fetch_paginated_call_incremental(&mut self, mut method: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value, mut page_key: Value, mut max_entries_per_request: Value) -> Value { Value::Undefined }

fn sort_cursor_paginated_result(&mut self, mut result: Value) -> Value { Value::Undefined }

fn remove_repeated_elements_from_array(&mut self, mut input: Value, mut fallback_to_timestamp: Value) -> Value { Value::Undefined }

fn remove_repeated_trades_from_array(&mut self, mut input: Value) -> Value { Value::Undefined }

fn remove_keys_from_dict(&mut self, mut dict: Value, mut remove_keys: Value) -> Value { Value::Undefined }

fn handle_until_option(&mut self, mut key: Value, mut request: Value, mut params: Value, mut multiplier: Value) -> Value { Value::Undefined }

fn safe_open_interest(&self, mut interest: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_liquidation(&self, mut liquidation: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_liquidations(&self, mut liquidations: Value, mut market: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }

fn parse_greeks(&self, mut greeks: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_all_greeks(&self, mut greeks: Value, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_option(&self, mut chain: Value, mut currency: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_option_chain(&self, mut response: Value, mut currency_key: Value, mut symbol_key: Value) -> Value { Value::Undefined }

fn parse_margin_modes(&self, mut response: Value, mut symbols: Value, mut symbol_key: Value, mut market_type: Value) -> Value { Value::Undefined }

fn parse_margin_mode(&self, mut margin_mode: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_leverages(&self, mut response: Value, mut symbols: Value, mut symbol_key: Value, mut market_type: Value) -> Value { Value::Undefined }

fn parse_leverage(&self, mut leverage: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_conversions(&self, mut conversions: Value, mut code: Value, mut from_currency_key: Value, mut to_currency_key: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_conversion(&self, mut conversion: Value, mut from_currency: Value, mut to_currency: Value) -> Value { Value::Undefined }

fn convert_expire_date(&self, mut date: Value) -> Value { Value::Undefined }

fn convert_expire_date_to_market_id_date(&self, mut date: Value) -> Value { Value::Undefined }

fn convert_market_id_expire_date(&self, mut date: Value) -> Value { Value::Undefined }

async fn fetch_position_history(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn load_markets_and_sign_in(&mut self) -> Value { Value::Undefined }

async fn fetch_positions_history(&mut self, mut symbols: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

fn parse_margin_modification(&self, mut data: Value, mut market: Value) -> Value { Value::Undefined }

fn parse_margin_modifications(&self, mut response: Value, mut symbols: Value, mut symbol_key: Value, mut market_type: Value) -> Value { Value::Undefined }

async fn fetch_transfer(&mut self, mut id: Value, mut code: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_transfers(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_ohlcv(&mut self, mut symbol: Value, mut timeframe: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_mark_price(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn watch_mark_prices(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

async fn withdraw_ws(&mut self, mut code: Value, mut amount: Value, mut address: Value, mut tag: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_my_trades(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }

async fn create_orders_ws(&mut self, mut orders: Value, mut params: Value) -> Value { Value::Undefined }

async fn fetch_orders_by_status_ws(&mut self, mut status: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }

async fn un_watch_bids_asks(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }

fn clean_unsubscription(&mut self, mut client: Value, mut sub_hash: Value, mut unsub_hash: Value, mut sub_hash_is_prefix: Value) -> Value { Value::Undefined }

fn clean_cache(&mut self, mut subscription: Value) -> Value { Value::Undefined }

fn timeframe_from_milliseconds(&mut self, mut ms: Value) -> Value { Value::Undefined }

// END TRANSPILED METHODS
}
