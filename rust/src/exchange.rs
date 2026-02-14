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
        unimplemented!()
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
        unimplemented!()
    }

    pub fn is_string(&self) -> bool {
        unimplemented!()
    }

    pub fn is_object(&self) -> bool {
        unimplemented!()
    }

    pub fn to_upper_case(&self) -> Value {
        unimplemented!()
    }

    pub fn unwrap_str(&self) -> &str {
        unimplemented!()
    }

    pub fn unwrap_usize(&self) -> usize {
        unimplemented!()
    }

    pub fn unwrap_bool(&self) -> bool {
        unimplemented!()
    }

    pub fn unwrap_precise(&self) -> &Precise {
        unimplemented!()
    }

    pub fn unwrap_json(&self) -> &serde_json::Value {
        unimplemented!()
    }

    pub fn unwrap_json_mut(&mut self) -> &mut serde_json::Value {
        unimplemented!()
    }

    pub fn unwrap_precise_mut(&mut self) -> &mut Precise {
        unimplemented!()
    }

    pub fn len(&self) -> usize {
        unimplemented!()
    }

    pub fn get(&self, _key: Value) -> Value {
        unimplemented!()
    }

    pub fn set(&mut self, _key: Value, _value: Value) {
        unimplemented!()
    }

    pub fn push(&mut self, _value: Value) {
        unimplemented!()
    }

    pub fn split(&self, _separator: Value) -> Value {
        unimplemented!()
    }

    pub fn contains_key(&self, _key: Value) -> bool {
        unimplemented!()
    }

    pub fn keys(&self) -> Vec<Value> {
        unimplemented!()
    }

    pub fn values(&self) -> Vec<Value> {
        unimplemented!()
    }

    pub fn to_array(&self, _x: Value) -> Value {
        unimplemented!()
    }

    pub fn index_of(&self, _x: Value) -> Value {
        unimplemented!()
    }

    pub fn join(&self, _glue: Value) -> Value {
        unimplemented!()
    }

    pub fn to_string(&self) -> Value {
        unimplemented!()
    }

    pub fn typeof_(&self) -> Value {
        unimplemented!()
    }

    pub fn slice(&self, _start: Value) -> Value {
        unimplemented!()
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
    unimplemented!()
}

pub fn shift_2(_value: Value) -> (Value, Value) {
    unimplemented!()
}

pub fn extend_2(_a: Value, _b: Value) -> Value {
    unimplemented!()
}

pub fn normalize(_value: &Value) -> Option<JSON> {
    unimplemented!()
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
    // END TRANSPILED METHODS
}
