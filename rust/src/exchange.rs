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
use std::time::{SystemTime, UNIX_EPOCH};

pub type JSON = serde_json::Value;
pub struct Array;
impl Array {
    pub fn is_array(v: Value) -> Value {
        match &v {
            Value::Json(serde_json::Value::Array(_)) => true.into(),
            _ => false.into(),
        }
    }
}
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

    pub fn keys(&self) -> Value {
        match self {
            Value::Json(JSON::Object(o)) => {
                let arr: Vec<JSON> = o.keys().map(|k| JSON::String(k.clone())).collect();
                Value::Json(JSON::Array(arr))
            }
            _ => Value::new_array(),
        }
    }

    pub fn values(&self) -> Value {
        match self {
            Value::Json(JSON::Object(o)) => {
                let arr: Vec<JSON> = o.values().cloned().collect();
                Value::Json(JSON::Array(arr))
            }
            _ => Value::new_array(),
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

    pub fn slice(&self, _start: Value, _end: Value) -> Value {
        let start_raw = match &_start {
            Value::Json(JSON::Number(n)) => n.as_i64().unwrap_or(0),
            _ => 0,
        };
        match self {
            Value::Json(JSON::Array(a)) => {
                let len = a.len() as i64;
                let start = if start_raw < 0 { (len + start_raw).max(0) as usize } else { start_raw as usize };
                let end = match &_end {
                    Value::Json(JSON::Number(n)) => {
                        let e = n.as_i64().unwrap_or(len);
                        if e < 0 { (len + e).max(0) as usize } else { (e as usize).min(a.len()) }
                    }
                    _ => a.len(),
                };
                let slice = if start < end && start < a.len() { a[start..end.min(a.len())].to_vec() } else { vec![] };
                Value::Json(JSON::Array(slice))
            }
            Value::Json(JSON::String(s)) => {
                let len = s.len() as i64;
                let start = if start_raw < 0 { (len + start_raw).max(0) as usize } else { start_raw as usize };
                let end = match &_end {
                    Value::Json(JSON::Number(n)) => {
                        let e = n.as_i64().unwrap_or(len);
                        if e < 0 { (len + e).max(0) as usize } else { (e as usize).min(s.len()) }
                    }
                    _ => s.len(),
                };
                Value::from(s.get(start..end.min(s.len())).unwrap_or("").to_string())
            }
            _ => Value::Undefined,
        }
    }

    pub fn neg(&self) -> Value {
        match self {
            Value::Json(JSON::Number(n)) => {
                if let Some(f) = n.as_f64() {
                    Value::from(-f)
                } else {
                    Value::Undefined
                }
            }
            _ => Value::Undefined,
        }
    }

    pub fn starts_with(&self, prefix: Value) -> bool {
        match (self, &prefix) {
            (Value::Json(JSON::String(s)), Value::Json(JSON::String(p))) => s.starts_with(p.as_str()),
            _ => false,
        }
    }

    pub fn ends_with(&self, suffix: Value) -> bool {
        match (self, &suffix) {
            (Value::Json(JSON::String(s)), Value::Json(JSON::String(p))) => s.ends_with(p.as_str()),
            _ => false,
        }
    }

    pub fn replace(&self, from: Value, to: Value) -> Value {
        match (self, &from, &to) {
            (Value::Json(JSON::String(s)), Value::Json(JSON::String(f)), Value::Json(JSON::String(t))) => {
                Value::from(s.replace(f.as_str(), t.as_str()))
            }
            _ => self.clone(),
        }
    }

    pub fn to_lower_case(&self) -> Value {
        match self {
            Value::Json(JSON::String(s)) => Value::from(s.to_lowercase()),
            _ => self.clone(),
        }
    }

    pub fn iter(&self) -> Vec<Value> {
        match self {
            Value::Json(JSON::Array(arr)) => arr.iter().map(|v| Value::Json(v.clone())).collect(),
            _ => vec![],
        }
    }

    pub fn map(&self, _f: impl Fn(Value) -> Value) -> Value {
        match self {
            Value::Json(JSON::Array(arr)) => {
                let result: Vec<JSON> = arr.iter().map(|v| {
                    match _f(Value::Json(v.clone())) {
                        Value::Json(j) => j,
                        _ => JSON::Null,
                    }
                }).collect();
                Value::Json(JSON::Array(result))
            }
            _ => Value::new_array(),
        }
    }

    pub fn filter(&self, _f: impl Fn(&Value) -> bool) -> Value {
        match self {
            Value::Json(JSON::Array(arr)) => {
                let result: Vec<JSON> = arr.iter().filter(|v| _f(&Value::Json((*v).clone()))).cloned().collect();
                Value::Json(JSON::Array(result))
            }
            _ => Value::new_array(),
        }
    }

    pub fn concat(&self, other: Value) -> Value {
        match (self, &other) {
            (Value::Json(JSON::Array(a)), Value::Json(JSON::Array(b))) => {
                let mut result = a.clone();
                result.extend(b.iter().cloned());
                Value::Json(JSON::Array(result))
            }
            (Value::Json(JSON::String(a)), Value::Json(JSON::String(b))) => {
                Value::from(format!("{}{}", a, b))
            }
            _ => self.clone(),
        }
    }

    pub fn reverse(&self) -> Value {
        match self {
            Value::Json(JSON::Array(arr)) => {
                let mut result = arr.clone();
                result.reverse();
                Value::Json(JSON::Array(result))
            }
            _ => self.clone(),
        }
    }

    pub fn sort(&self, _f: impl Fn(&Value, &Value) -> std::cmp::Ordering) -> Value {
        match self {
            Value::Json(JSON::Array(arr)) => {
                let mut result = arr.clone();
                result.sort_by(|a, b| _f(&Value::Json(a.clone()), &Value::Json(b.clone())));
                Value::Json(JSON::Array(result))
            }
            _ => self.clone(),
        }
    }

    pub fn pop(&mut self) -> Value {
        match self {
            Value::Json(JSON::Array(arr)) => {
                arr.pop().map(Value::Json).unwrap_or(Value::Undefined)
            }
            _ => Value::Undefined,
        }
    }

    pub fn shift(&mut self) -> Value {
        match self {
            Value::Json(JSON::Array(arr)) if !arr.is_empty() => {
                Value::Json(arr.remove(0))
            }
            _ => Value::Undefined,
        }
    }

    pub fn parse_float(s: Value) -> Value {
        match &s {
            Value::Json(JSON::String(st)) => {
                st.parse::<f64>().ok().map(Value::from).unwrap_or(Value::Undefined)
            }
            Value::Json(JSON::Number(_)) => s,
            _ => Value::Undefined,
        }
    }

    pub fn parse_int(s: Value, _radix: Value) -> Value {
        match &s {
            Value::Json(JSON::String(st)) => {
                st.parse::<i64>().ok().map(Value::from).unwrap_or(Value::Undefined)
            }
            Value::Json(JSON::Number(n)) => n.as_i64().map(Value::from).unwrap_or(Value::Undefined),
            _ => Value::Undefined,
        }
    }

    pub fn array_concat(a: Value, b: Value) -> Value { a.concat(b) }

    pub fn pad_start(&self, target_len: Value, pad_str: Value) -> Value {
        let s = match self {
            Value::Json(JSON::String(s)) => s.clone(),
            _ => return Value::Undefined,
        };
        let len = match target_len {
            Value::Json(JSON::Number(n)) => n.as_u64().unwrap_or(0) as usize,
            _ => return Value::from(s),
        };
        let pad = match pad_str {
            Value::Json(JSON::String(p)) => p,
            _ => " ".to_string(),
        };
        if s.len() >= len {
            Value::from(s)
        } else {
            let needed = len - s.len();
            let padding: String = pad.chars().cycle().take(needed).collect();
            Value::from(format!("{}{}", padding, s))
        }
    }

    pub fn reduce(&self) -> Value { self.clone() }

    pub fn to_fixed(&self, decimals: Value) -> Value { self.clone() }

}

impl From<i64> for Value {
    fn from(v: i64) -> Self {
        Value::Json(json!(v))
    }
}

impl From<i32> for Value {
    fn from(v: i32) -> Self {
        Value::Json(json!(v as i64))
    }
}

impl From<Value> for serde_json::Value {
    fn from(v: Value) -> serde_json::Value {
        match v {
            Value::Json(j) => j,
            Value::Undefined => serde_json::Value::Null,
        }
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

impl From<f64> for Value {
    fn from(v: f64) -> Self {
        match serde_json::Number::from_f64(v) {
            Some(n) => Value::Json(JSON::Number(n)),
            None => Value::Json(json!(0)),
        }
    }
}

// ---------------------------------------------------------------------------
// usize <-> Value interop — needed because transpiler infers usize for .len()
// ---------------------------------------------------------------------------

impl PartialEq<Value> for usize {
    fn eq(&self, other: &Value) -> bool {
        match other {
            Value::Json(JSON::Number(n)) => n.as_u64().map_or(false, |v| v == *self as u64),
            _ => false,
        }
    }
}

impl PartialOrd<Value> for usize {
    fn partial_cmp(&self, other: &Value) -> Option<std::cmp::Ordering> {
        match other {
            Value::Json(JSON::Number(n)) => {
                n.as_u64().map(|v| (*self as u64).cmp(&v))
            }
            _ => None,
        }
    }
}

impl std::ops::Div<Value> for usize {
    type Output = Value;
    fn div(self, rhs: Value) -> Value {
        match &rhs {
            Value::Json(JSON::Number(n)) => {
                if let Some(d) = n.as_u64() {
                    if d != 0 { Value::from((self as u64 / d) as i64) } else { Value::Undefined }
                } else { Value::Undefined }
            }
            _ => Value::Undefined,
        }
    }
}


// ---------------------------------------------------------------------------
// Arithmetic operators for Value — JS-like coercion semantics
// ---------------------------------------------------------------------------

fn coerce_to_f64(v: &Value) -> Option<f64> {
    match v {
        Value::Json(JSON::Number(n)) => n.as_f64(),
        Value::Json(JSON::String(s)) => s.parse::<f64>().ok(),
        Value::Json(JSON::Bool(b)) => Some(if *b { 1.0 } else { 0.0 }),
        _ => None,
    }
}

/// Returns Some(i64) if value is an integer JSON number, None otherwise.
fn coerce_to_i64(v: &Value) -> Option<i64> {
    match v {
        Value::Json(JSON::Number(n)) => n.as_i64(),
        _ => None,
    }
}

impl IntoIterator for Value {
    type Item = Value;
    type IntoIter = std::vec::IntoIter<Value>;
    fn into_iter(self) -> Self::IntoIter {
        match self {
            Value::Json(JSON::Array(arr)) => arr.into_iter().map(Value::Json).collect::<Vec<_>>().into_iter(),
            Value::Json(JSON::Object(obj)) => obj.keys().map(|k| Value::from(k.as_str())).collect::<Vec<Value>>().into_iter(),
            _ => vec![].into_iter(),
        }
    }
}

impl std::ops::Not for Value {
    type Output = Value;
    fn not(self) -> Value {
        (!self.is_truthy()).into()
    }
}


impl std::ops::Add for Value {
    type Output = Value;
    fn add(self, rhs: Value) -> Value {
        // String concatenation takes precedence if either side is a string
        match (&self, &rhs) {
            (Value::Json(JSON::String(a)), _) => {
                let b = match &rhs {
                    Value::Json(JSON::String(s)) => s.clone(),
                    Value::Json(v) => v.to_string().trim_matches('"').to_string(),
                    Value::Undefined => "undefined".to_string(),
                };
                Value::from(a.clone() + &b)
            }
            (_, Value::Json(JSON::String(b))) => {
                let a = match &self {
                    Value::Json(v) => v.to_string().trim_matches('"').to_string(),
                    Value::Undefined => "undefined".to_string(),
                };
                Value::from(a + b.as_str())
            }
            _ => match (coerce_to_i64(&self), coerce_to_i64(&rhs)) {
                (Some(a), Some(b)) => Value::from(a + b),
                _ => match (coerce_to_f64(&self), coerce_to_f64(&rhs)) {
                    (Some(a), Some(b)) => Value::from(a + b),
                    _ => Value::Undefined,
                },
            },
        }
    }
}

impl std::ops::Sub for Value {
    type Output = Value;
    fn sub(self, rhs: Value) -> Value {
        match (coerce_to_i64(&self), coerce_to_i64(&rhs)) {
            (Some(a), Some(b)) => Value::from(a - b),
            _ => match (coerce_to_f64(&self), coerce_to_f64(&rhs)) {
                (Some(a), Some(b)) => Value::from(a - b),
                _ => Value::Undefined,
            },
        }
    }
}

impl std::ops::Mul for Value {
    type Output = Value;
    fn mul(self, rhs: Value) -> Value {
        match (coerce_to_i64(&self), coerce_to_i64(&rhs)) {
            (Some(a), Some(b)) => Value::from(a * b),
            _ => match (coerce_to_f64(&self), coerce_to_f64(&rhs)) {
                (Some(a), Some(b)) => Value::from(a * b),
                _ => Value::Undefined,
            },
        }
    }
}

impl std::ops::Div for Value {
    type Output = Value;
    fn div(self, rhs: Value) -> Value {
        match (coerce_to_f64(&self), coerce_to_f64(&rhs)) {
            (Some(a), Some(b)) if b != 0.0 => Value::from(a / b),
            _ => Value::Undefined,
        }
    }
}

impl std::ops::Rem for Value {
    type Output = Value;
    fn rem(self, rhs: Value) -> Value {
        match (coerce_to_f64(&self), coerce_to_f64(&rhs)) {
            (Some(a), Some(b)) if b != 0.0 => Value::from(a % b),
            _ => Value::Undefined,
        }
    }
}

impl std::ops::Neg for Value {
    type Output = Value;
    fn neg(self) -> Value {
        match coerce_to_f64(&self) {
            Some(f) => Value::from(-f),
            None => Value::Undefined,
        }
    }
}

/// Partial ordering for Value — numeric or lexicographic
impl PartialOrd for Value {
    fn partial_cmp(&self, other: &Value) -> Option<std::cmp::Ordering> {
        match (coerce_to_f64(self), coerce_to_f64(other)) {
            (Some(a), Some(b)) => a.partial_cmp(&b),
            _ => match (self, other) {
                (Value::Json(JSON::String(a)), Value::Json(JSON::String(b))) => Some(a.cmp(b)),
                _ => None,
            },
        }
    }
}

pub trait BoolExt {
    fn is_truthy(&self) -> bool;
}

impl BoolExt for bool {
    fn is_truthy(&self) -> bool { *self }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Precise;

impl Precise {
    pub fn new(v: Value) -> Value { v }
    pub fn string_add(a: Value, b: Value) -> Value { a + b }
    pub fn string_sub(a: Value, b: Value) -> Value { a - b }
    pub fn string_mul(a: Value, b: Value) -> Value { a * b }
    pub fn string_div(a: Value, b: Value, _precision: Value) -> Value { a / b }
    pub fn string_mod(a: Value, _b: Value) -> Value { a }
    pub fn string_abs(a: Value) -> Value { a }
    pub fn string_neg(a: Value) -> Value { a.neg() }
    pub fn string_eq(a: Value, b: Value) -> bool { a == b }
    pub fn string_equals(a: Value, b: Value) -> bool { a == b }
    pub fn string_gt(a: Value, b: Value) -> bool { a > b }
    pub fn string_ge(a: Value, b: Value) -> bool { a >= b }
    pub fn string_lt(a: Value, b: Value) -> bool { a < b }
    pub fn string_le(a: Value, b: Value) -> bool { a <= b }
    pub fn string_min(a: Value, b: Value) -> Value { if a <= b { a } else { b } }
    pub fn string_max(a: Value, b: Value) -> Value { if a >= b { a } else { b } }
}

pub struct Promise;

impl Promise {
    pub async fn all(values: Value) -> Value { values }
}

pub struct Math;

impl Math {
    pub fn min(a: Value, b: Value) -> Value { if a <= b { a } else { b } }
    pub fn max(a: Value, b: Value) -> Value { if a >= b { a } else { b } }
    pub fn floor(a: Value) -> Value { a }
    pub fn ceil(a: Value) -> Value { a }
    pub fn round(a: Value) -> Value { a }
    pub fn abs(a: Value) -> Value { a }
    pub fn pow(a: Value, _b: Value) -> Value { a }
    pub fn log(a: Value) -> Value { a }
}

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
    fn keys(&self) -> Value;
    fn values(&self) -> Value;
    fn to_array(&self, x: Value) -> Value;
    fn index_of(&self, x: Value) -> Value;
    fn join(&self, glue: Value) -> Value;
    fn to_string(&self) -> Value;
    fn typeof_(&self) -> Value;
    fn slice(&self, start: Value, end: Value) -> Value;
}

pub struct ExchangeImpl;

impl ExchangeImpl {
    /// Initializes exchange defaults (precision modes, padding modes, etc.)
    pub fn init(value: &mut Value) {
        // Set defaults matching Exchange.js constructor
        if value.get(Value::from("precisionMode")).is_nullish() {
            value.set(Value::from("precisionMode"), Value::from(DECIMAL_PLACES as i64));
        }
        if value.get(Value::from("paddingMode")).is_nullish() {
            value.set(Value::from("paddingMode"), Value::from(NO_PADDING as i64));
        }
        if value.get(Value::from("markets")).is_nullish() {
            value.set(Value::from("markets"), Value::new_object());
        }
        if value.get(Value::from("currencies")).is_nullish() {
            value.set(Value::from("currencies"), Value::new_object());
        }
        if value.get(Value::from("markets_by_id")).is_nullish() {
            value.set(Value::from("markets_by_id"), Value::new_object());
        }
        if value.get(Value::from("symbols")).is_nullish() {
            value.set(Value::from("symbols"), Value::Json(JSON::Array(vec![])));
        }
        if value.get(Value::from("ids")).is_nullish() {
            value.set(Value::from("ids"), Value::Json(JSON::Array(vec![])));
        }
    }
}

// ---------------------------------------------------------------------------
// Free helpers used by safe accessor implementations
// ---------------------------------------------------------------------------

pub fn safe_get(dictionary: &Value, key: &Value) -> Value {
    match dictionary {
        Value::Json(serde_json::Value::Object(map)) => {
            if let Value::Json(serde_json::Value::String(k)) = key {
                map.get(k).map(|v| Value::Json(v.clone())).unwrap_or(Value::Undefined)
            } else if let Value::Json(k) = key {
                let k_str = k.to_string();
                let k_str = k_str.trim_matches('"');
                map.get(k_str).map(|v| Value::Json(v.clone())).unwrap_or(Value::Undefined)
            } else {
                Value::Undefined
            }
        }
        Value::Json(serde_json::Value::Array(arr)) => {
            if let Value::Json(serde_json::Value::Number(n)) = key {
                if let Some(i) = n.as_u64() {
                    arr.get(i as usize).map(|v| Value::Json(v.clone())).unwrap_or(Value::Undefined)
                } else {
                    Value::Undefined
                }
            } else {
                Value::Undefined
            }
        }
        _ => Value::Undefined,
    }
}

fn safe_get_from_keys(dictionary: &Value, keys: &[Value]) -> Value {
    for key in keys {
        let v = safe_get(dictionary, key);
        if v.is_nonnullish() {
            return v;
        }
    }
    Value::Undefined
}

pub fn value_to_string_opt(v: &Value) -> Option<String> {
    match v {
        Value::Json(serde_json::Value::String(s)) => Some(s.clone()),
        Value::Json(serde_json::Value::Number(n)) => Some(n.to_string()),
        Value::Json(serde_json::Value::Bool(b)) => Some(b.to_string()),
        _ => None,
    }
}

pub fn value_to_i64_opt(v: &Value) -> Option<i64> {
    match v {
        Value::Json(serde_json::Value::Number(n)) => {
            if let Some(i) = n.as_i64() { return Some(i); }
            if let Some(f) = n.as_f64() { return Some(f as i64); }
            None
        }
        Value::Json(serde_json::Value::String(s)) => s.parse::<f64>().ok().map(|f| f as i64),
        Value::Json(serde_json::Value::Bool(b)) => Some(if *b { 1 } else { 0 }),
        _ => None,
    }
}

pub fn value_to_f64_opt(v: &Value) -> Option<f64> {
    match v {
        Value::Json(serde_json::Value::Number(n)) => n.as_f64(),
        Value::Json(serde_json::Value::String(s)) => s.parse::<f64>().ok(),
        Value::Json(serde_json::Value::Bool(b)) => Some(if *b { 1.0 } else { 0.0 }),
        _ => None,
    }
}

// ---------------------------------------------------------------------------

#[async_trait]
pub trait Exchange: ValueTrait {

    // ---------------------------------------------------------------------------
    // Manually-maintained safe accessor methods — preserved across transpiler runs
    // ---------------------------------------------------------------------------

    fn safe_string(&self, dictionary: Value, key: Value, default_value: Value) -> Value {
        let v = safe_get(&dictionary, &key);
        match &v {
            Value::Undefined | Value::Json(serde_json::Value::Null) => {
                if default_value.is_nullish() { Value::Undefined } else { default_value }
            }
            _ => {
                if let Some(s) = value_to_string_opt(&v) { Value::Json(serde_json::Value::String(s)) }
                else if default_value.is_nullish() { Value::Undefined }
                else { default_value }
            }
        }
    }

    fn safe_string_2(&self, dictionary: Value, key1: Value, key2: Value, default_value: Value) -> Value {
        let v = safe_get_from_keys(&dictionary, &[key1, key2]);
        if v.is_nonnullish() { self.safe_string(dictionary.clone(), {
            // We already have the value; just wrap it
            let _ = &dictionary;
            return match value_to_string_opt(&v) {
                Some(s) => Value::Json(serde_json::Value::String(s)),
                None => default_value,
            };
        }, default_value.clone()) } else { default_value }
    }

    fn safe_string_n(&self, dictionary: Value, keys: Value, default_value: Value) -> Value {
        if let Value::Json(serde_json::Value::Array(arr)) = &keys {
            let key_vals: Vec<Value> = arr.iter().map(|k| Value::Json(k.clone())).collect();
            let v = safe_get_from_keys(&dictionary, &key_vals);
            if v.is_nonnullish() {
                return match value_to_string_opt(&v) {
                    Some(s) => Value::Json(serde_json::Value::String(s)),
                    None => if default_value.is_nullish() { Value::Undefined } else { default_value },
                };
            }
        }
        if default_value.is_nullish() { Value::Undefined } else { default_value }
    }

    fn safe_string_lower(&self, dictionary: Value, key: Value, default_value: Value) -> Value {
        match self.safe_string(dictionary, key, default_value) {
            Value::Json(serde_json::Value::String(s)) => Value::Json(serde_json::Value::String(s.to_lowercase())),
            other => other,
        }
    }

    fn safe_string_lower_2(&self, dictionary: Value, key1: Value, key2: Value, default_value: Value) -> Value {
        match self.safe_string_2(dictionary, key1, key2, default_value) {
            Value::Json(serde_json::Value::String(s)) => Value::Json(serde_json::Value::String(s.to_lowercase())),
            other => other,
        }
    }

    fn safe_string_lower_n(&self, dictionary: Value, keys: Value, default_value: Value) -> Value {
        match self.safe_string_n(dictionary, keys, default_value) {
            Value::Json(serde_json::Value::String(s)) => Value::Json(serde_json::Value::String(s.to_lowercase())),
            other => other,
        }
    }

    fn safe_string_upper(&self, dictionary: Value, key: Value, default_value: Value) -> Value {
        match self.safe_string(dictionary, key, default_value) {
            Value::Json(serde_json::Value::String(s)) => Value::Json(serde_json::Value::String(s.to_uppercase())),
            other => other,
        }
    }

    fn safe_string_upper_2(&self, dictionary: Value, key1: Value, key2: Value, default_value: Value) -> Value {
        match self.safe_string_2(dictionary, key1, key2, default_value) {
            Value::Json(serde_json::Value::String(s)) => Value::Json(serde_json::Value::String(s.to_uppercase())),
            other => other,
        }
    }

    fn safe_string_upper_n(&self, dictionary: Value, keys: Value, default_value: Value) -> Value {
        match self.safe_string_n(dictionary, keys, default_value) {
            Value::Json(serde_json::Value::String(s)) => Value::Json(serde_json::Value::String(s.to_uppercase())),
            other => other,
        }
    }

    fn safe_integer(&self, dictionary: Value, key: Value, default_value: Value) -> Value {
        let v = safe_get(&dictionary, &key);
        match value_to_i64_opt(&v) {
            Some(i) => Value::Json(serde_json::Value::Number(i.into())),
            None => if default_value.is_nullish() { Value::Undefined } else { default_value },
        }
    }

    fn safe_integer_2(&self, dictionary: Value, key1: Value, key2: Value, default_value: Value) -> Value {
        let v1 = self.safe_integer(dictionary.clone(), key1, Value::Undefined);
        if v1.is_nonnullish() { return v1; }
        self.safe_integer(dictionary, key2, default_value)
    }

    fn safe_integer_n(&self, dictionary: Value, keys: Value, default_value: Value) -> Value {
        if let Value::Json(serde_json::Value::Array(arr)) = &keys {
            for k in arr {
                let v = self.safe_integer(dictionary.clone(), Value::Json(k.clone()), Value::Undefined);
                if v.is_nonnullish() { return v; }
            }
        }
        if default_value.is_nullish() { Value::Undefined } else { default_value }
    }

    fn safe_integer_product(&self, dictionary: Value, key: Value, factor: Value, default_value: Value) -> Value {
        match (self.safe_integer(dictionary, key, Value::Undefined), value_to_f64_opt(&factor)) {
            (Value::Json(serde_json::Value::Number(n)), Some(f)) => {
                if let Some(i) = n.as_i64() {
                    let result = (i as f64 * f) as i64;
                    Value::Json(serde_json::Value::Number(result.into()))
                } else { if default_value.is_nullish() { Value::Undefined } else { default_value } }
            }
            _ => if default_value.is_nullish() { Value::Undefined } else { default_value },
        }
    }

    fn safe_integer_product_2(&self, dictionary: Value, key1: Value, key2: Value, factor: Value, default_value: Value) -> Value {
        let v = self.safe_integer_product(dictionary.clone(), key1, factor.clone(), Value::Undefined);
        if v.is_nonnullish() { return v; }
        self.safe_integer_product(dictionary, key2, factor, default_value)
    }

    fn safe_integer_product_n(&self, dictionary: Value, keys: Value, factor: Value, default_value: Value) -> Value {
        if let Value::Json(serde_json::Value::Array(arr)) = &keys {
            for k in arr {
                let v = self.safe_integer_product(dictionary.clone(), Value::Json(k.clone()), factor.clone(), Value::Undefined);
                if v.is_nonnullish() { return v; }
            }
        }
        if default_value.is_nullish() { Value::Undefined } else { default_value }
    }

    fn safe_timestamp(&self, dictionary: Value, key: Value, default_value: Value) -> Value {
        self.safe_integer(dictionary, key, default_value)
    }

    fn safe_timestamp_2(&self, dictionary: Value, key1: Value, key2: Value, default_value: Value) -> Value {
        self.safe_integer_2(dictionary, key1, key2, default_value)
    }

    fn safe_timestamp_n(&self, dictionary: Value, keys: Value, default_value: Value) -> Value {
        self.safe_integer_n(dictionary, keys, default_value)
    }

    fn safe_float(&self, dictionary: Value, key: Value, default_value: Value) -> Value {
        let v = safe_get(&dictionary, &key);
        match value_to_f64_opt(&v) {
            Some(f) => {
                if let Some(n) = serde_json::Number::from_f64(f) {
                    Value::Json(serde_json::Value::Number(n))
                } else { if default_value.is_nullish() { Value::Undefined } else { default_value } }
            }
            None => if default_value.is_nullish() { Value::Undefined } else { default_value },
        }
    }

    fn safe_float_2(&self, dictionary: Value, key1: Value, key2: Value, default_value: Value) -> Value {
        let v1 = self.safe_float(dictionary.clone(), key1, Value::Undefined);
        if v1.is_nonnullish() { return v1; }
        self.safe_float(dictionary, key2, default_value)
    }

    fn safe_float_n(&self, dictionary: Value, keys: Value, default_value: Value) -> Value {
        if let Value::Json(serde_json::Value::Array(arr)) = &keys {
            for k in arr {
                let v = self.safe_float(dictionary.clone(), Value::Json(k.clone()), Value::Undefined);
                if v.is_nonnullish() { return v; }
            }
        }
        if default_value.is_nullish() { Value::Undefined } else { default_value }
    }

    fn safe_value(&self, dictionary: Value, key: Value, default_value: Value) -> Value {
        let v = safe_get(&dictionary, &key);
        if v.is_nonnullish() { v } else { if default_value.is_nullish() { Value::Undefined } else { default_value } }
    }

    fn safe_value_2(&self, dictionary: Value, key1: Value, key2: Value, default_value: Value) -> Value {
        let v1 = self.safe_value(dictionary.clone(), key1, Value::Undefined);
        if v1.is_nonnullish() { return v1; }
        self.safe_value(dictionary, key2, default_value)
    }

    fn safe_value_n(&self, dictionary: Value, keys: Value, default_value: Value) -> Value {
        if let Value::Json(serde_json::Value::Array(arr)) = &keys {
            for k in arr {
                let v = self.safe_value(dictionary.clone(), Value::Json(k.clone()), Value::Undefined);
                if v.is_nonnullish() { return v; }
            }
        }
        if default_value.is_nullish() { Value::Undefined } else { default_value }
    }

    fn parse_number(&self, value: Value, default_value: Value) -> Value {
        match &value {
            Value::Json(serde_json::Value::Number(_)) => value,
            Value::Json(serde_json::Value::String(s)) => {
                match s.parse::<f64>() {
                    Ok(f) => {
                        if let Some(n) = serde_json::Number::from_f64(f) {
                            Value::Json(serde_json::Value::Number(n))
                        } else { if default_value.is_nullish() { Value::Undefined } else { default_value } }
                    }
                    Err(_) => if default_value.is_nullish() { Value::Undefined } else { default_value },
                }
            }
            _ => if default_value.is_nullish() { Value::Undefined } else { default_value },
        }
    }

    fn parse_to_numeric(&self, value: Value, default_value: Value) -> Value {
        self.parse_number(value, default_value)
    }

    fn parse_to_int(&self, value: Value) -> Value {
        match value_to_i64_opt(&value) {
            Some(i) => Value::Json(serde_json::Value::Number(i.into())),
            None => Value::Undefined,
        }
    }

    fn safe_number(&self, obj: Value, key: Value, default_number: Value) -> Value {
        let v = safe_get(&obj, &key);
        self.parse_number(v, default_number)
    }

    fn safe_number_2(&self, dictionary: Value, key1: Value, key2: Value, d: Value) -> Value {
        let v1 = self.safe_number(dictionary.clone(), key1, Value::Undefined);
        if v1.is_nonnullish() { return v1; }
        self.safe_number(dictionary, key2, d)
    }

    fn safe_number_n(&self, obj: Value, arr: Value, default_number: Value) -> Value {
        if let Value::Json(serde_json::Value::Array(keys)) = &arr {
            for k in keys {
                let v = self.safe_number(obj.clone(), Value::Json(k.clone()), Value::Undefined);
                if v.is_nonnullish() { return v; }
            }
        }
        if default_number.is_nullish() { Value::Undefined } else { default_number }
    }

    fn safe_number_omit_zero(&self, obj: Value, key: Value, default_value: Value) -> Value {
        let v = self.safe_number(obj, key, Value::Undefined);
        match &v {
            Value::Json(serde_json::Value::Number(n)) => {
                if n.as_f64().map(|f| f == 0.0).unwrap_or(false) {
                    if default_value.is_nullish() { Value::Undefined } else { default_value }
                } else { v }
            }
            _ => if default_value.is_nullish() { Value::Undefined } else { default_value },
        }
    }

    fn safe_integer_omit_zero(&self, obj: Value, key: Value, default_value: Value) -> Value {
        let v = self.safe_integer(obj, key, Value::Undefined);
        match &v {
            Value::Json(serde_json::Value::Number(n)) => {
                if n.as_i64().map(|i| i == 0).unwrap_or(false) {
                    if default_value.is_nullish() { Value::Undefined } else { default_value }
                } else { v }
            }
            _ => if default_value.is_nullish() { Value::Undefined } else { default_value },
        }
    }

    fn safe_bool(&self, dictionary: Value, key: Value, default_value: Value) -> Value {
        let v = safe_get(&dictionary, &key);
        match &v {
            Value::Json(serde_json::Value::Bool(_)) => v,
            Value::Json(serde_json::Value::Number(n)) => {
                Value::Json(serde_json::Value::Bool(n.as_i64().map(|i| i != 0).unwrap_or(false)))
            }
            Value::Json(serde_json::Value::String(s)) => {
                let sl = s.to_lowercase();
                if sl == "true" || sl == "1" { Value::Json(serde_json::Value::Bool(true)) }
                else if sl == "false" || sl == "0" { Value::Json(serde_json::Value::Bool(false)) }
                else if default_value.is_nullish() { Value::Undefined } else { default_value }
            }
            _ => if default_value.is_nullish() { Value::Undefined } else { default_value },
        }
    }

    fn safe_bool_2(&self, dictionary: Value, key1: Value, key2: Value, default_value: Value) -> Value {
        let v1 = self.safe_bool(dictionary.clone(), key1, Value::Undefined);
        if v1.is_nonnullish() { return v1; }
        self.safe_bool(dictionary, key2, default_value)
    }

    fn safe_bool_n(&self, dictionary_or_list: Value, keys: Value, default_value: Value) -> Value {
        if let Value::Json(serde_json::Value::Array(arr)) = &keys {
            for k in arr {
                let v = self.safe_bool(dictionary_or_list.clone(), Value::Json(k.clone()), Value::Undefined);
                if v.is_nonnullish() { return v; }
            }
        }
        if default_value.is_nullish() { Value::Undefined } else { default_value }
    }

    fn safe_dict(&self, dictionary: Value, key: Value, default_value: Value) -> Value {
        let v = safe_get(&dictionary, &key);
        match &v {
            Value::Json(serde_json::Value::Object(_)) => v,
            _ => if default_value.is_nullish() { Value::Undefined } else { default_value },
        }
    }

    fn safe_dict_2(&self, dictionary: Value, key1: Value, key2: Value, default_value: Value) -> Value {
        let v1 = self.safe_dict(dictionary.clone(), key1, Value::Undefined);
        if v1.is_nonnullish() { return v1; }
        self.safe_dict(dictionary, key2, default_value)
    }

    fn safe_dict_n(&self, dictionary_or_list: Value, keys: Value, default_value: Value) -> Value {
        if let Value::Json(serde_json::Value::Array(arr)) = &keys {
            for k in arr {
                let v = self.safe_dict(dictionary_or_list.clone(), Value::Json(k.clone()), Value::Undefined);
                if v.is_nonnullish() { return v; }
            }
        }
        if default_value.is_nullish() { Value::Undefined } else { default_value }
    }

    fn safe_list(&self, dictionary_or_list: Value, key: Value, default_value: Value) -> Value {
        let v = safe_get(&dictionary_or_list, &key);
        match &v {
            Value::Json(serde_json::Value::Array(_)) => v,
            _ => if default_value.is_nullish() { Value::Undefined } else { default_value },
        }
    }

    fn safe_list_2(&self, dictionary_or_list: Value, key1: Value, key2: Value, default_value: Value) -> Value {
        let v1 = self.safe_list(dictionary_or_list.clone(), key1, Value::Undefined);
        if v1.is_nonnullish() { return v1; }
        self.safe_list(dictionary_or_list, key2, default_value)
    }

    fn safe_list_n(&self, dictionary_or_list: Value, keys: Value, default_value: Value) -> Value {
        if let Value::Json(serde_json::Value::Array(arr)) = &keys {
            for k in arr {
                let v = self.safe_list(dictionary_or_list.clone(), Value::Json(k.clone()), Value::Undefined);
                if v.is_nonnullish() { return v; }
            }
        }
        if default_value.is_nullish() { Value::Undefined } else { default_value }
    }

    // ---------------------------------------------------------------------------
    // Manually-implemented base exchange methods
    // ---------------------------------------------------------------------------

    fn filter_by_limit(&self, mut array: Value, mut limit: Value, mut key: Value, mut from_start: Value) -> Value {
        if key.is_nullish() { key = Value::from("timestamp"); }
        if limit.is_nonnullish() {
            if let Value::Json(JSON::Array(ref arr)) = array {
                let array_length = arr.len();
                if array_length > 0 {
                    let lim = limit.unwrap_usize();
                    let mut ascending = true;
                    let first_val = array.get(Value::from(0i64)).get(key.clone());
                    let last_val = array.get(Value::from((array_length - 1) as i64)).get(key.clone());
                    if first_val.is_nonnullish() && last_val.is_nonnullish() {
                        ascending = first_val <= last_val;
                    }
                    if from_start.is_truthy() {
                        let take = if lim > array_length { array_length } else { lim };
                        if ascending {
                            array = Value::Json(JSON::Array(arr[..take].to_vec()));
                        } else {
                            let start = if array_length > lim { array_length - lim } else { 0 };
                            array = Value::Json(JSON::Array(arr[start..].to_vec()));
                        }
                    } else {
                        if ascending {
                            let start = if array_length > lim { array_length - lim } else { 0 };
                            array = Value::Json(JSON::Array(arr[start..].to_vec()));
                        } else {
                            let take = if lim > array_length { array_length } else { lim };
                            array = Value::Json(JSON::Array(arr[..take].to_vec()));
                        }
                    }
                }
            }
        }
        array
    }

    fn filter_by_since_limit(&self, mut array: Value, mut since: Value, mut limit: Value, mut key: Value, mut tail: Value) -> Value {
        if key.is_nullish() { key = Value::from("timestamp"); }
        let since_is_defined = since.is_nonnullish();
        // toArray
        if let Value::Json(JSON::Array(_)) = &array {} else {
            array = Value::new_array();
        }
        let mut result = array.clone();
        if since_is_defined {
            let mut filtered = vec![];
            if let Value::Json(JSON::Array(ref arr)) = array {
                for entry_json in arr {
                    let entry = Value::Json(entry_json.clone());
                    let value = self.safe_value(entry.clone(), key.clone(), Value::Undefined);
                    if value.is_nonnullish() && value >= since {
                        filtered.push(entry_json.clone());
                    }
                }
            }
            result = Value::Json(JSON::Array(filtered));
        }
        if tail.is_truthy() && limit.is_nonnullish() {
            if let Value::Json(JSON::Array(ref arr)) = result {
                let lim = limit.unwrap_usize();
                let start = if arr.len() > lim { arr.len() - lim } else { 0 };
                return Value::Json(JSON::Array(arr[start..].to_vec()));
            }
            return result;
        }
        let should_filter_from_start = !tail.is_truthy() && since_is_defined;
        self.filter_by_limit(result, limit, key, Value::from(should_filter_from_start))
    }

    fn parse_bid_ask(&self, mut bidask: Value, mut price_key: Value, mut amount_key: Value, mut count_or_id_key: Value) -> Value {
        if price_key.is_nullish() { price_key = Value::from(0i64); }
        if amount_key.is_nullish() { amount_key = Value::from(1i64); }
        if count_or_id_key.is_nullish() { count_or_id_key = Value::from(2i64); }
        let price = self.safe_float(bidask.clone(), price_key, Value::Undefined);
        let amount = self.safe_float(bidask.clone(), amount_key, Value::Undefined);
        let count_or_id = self.safe_integer(bidask, count_or_id_key, Value::Undefined);
        let mut result = Value::Json(json!([
            price.unwrap_json().clone(),
            amount.unwrap_json().clone()
        ]));
        if count_or_id.is_nonnullish() {
            result.push(count_or_id);
        }
        result
    }

    fn parse_bids_asks(&self, mut bidasks: Value, mut price_key: Value, mut amount_key: Value, mut count_or_id_key: Value) -> Value {
        // toArray
        if let Value::Json(JSON::Array(_)) = &bidasks {} else {
            bidasks = Value::new_array();
        }
        let mut result = Value::new_array();
        if let Value::Json(JSON::Array(ref arr)) = bidasks {
            for item in arr {
                let parsed = self.parse_bid_ask(Value::Json(item.clone()), price_key.clone(), amount_key.clone(), count_or_id_key.clone());
                result.push(parsed);
            }
        }
        result
    }

    fn parse_order_book(&self, mut orderbook: Value, mut symbol: Value, mut timestamp: Value, mut bids_key: Value, mut asks_key: Value, mut price_key: Value, mut amount_key: Value, mut count_or_id_key: Value) -> Value {
        if bids_key.is_nullish() { bids_key = Value::from("bids"); }
        if asks_key.is_nullish() { asks_key = Value::from("asks"); }
        if price_key.is_nullish() { price_key = Value::from(0i64); }
        if amount_key.is_nullish() { amount_key = Value::from(1i64); }
        if count_or_id_key.is_nullish() { count_or_id_key = Value::from(2i64); }
        let raw_bids = self.safe_value(orderbook.clone(), bids_key, Value::Json(json!([])));
        let raw_asks = self.safe_value(orderbook, asks_key, Value::Json(json!([])));
        let bids = self.parse_bids_asks(raw_bids, price_key.clone(), amount_key.clone(), count_or_id_key.clone());
        let asks = self.parse_bids_asks(raw_asks, price_key, amount_key, count_or_id_key);
        // Sort bids descending by price (index 0), asks ascending by price
        let mut sorted_bids = if let Value::Json(JSON::Array(mut arr)) = bids {
            arr.sort_by(|a, b| {
                let pa = a.as_array().and_then(|v| v.first()).and_then(|x| x.as_f64()).unwrap_or(0.0);
                let pb = b.as_array().and_then(|v| v.first()).and_then(|x| x.as_f64()).unwrap_or(0.0);
                pb.partial_cmp(&pa).unwrap_or(std::cmp::Ordering::Equal)
            });
            Value::Json(JSON::Array(arr))
        } else { Value::new_array() };
        let mut sorted_asks = if let Value::Json(JSON::Array(mut arr)) = asks {
            arr.sort_by(|a, b| {
                let pa = a.as_array().and_then(|v| v.first()).and_then(|x| x.as_f64()).unwrap_or(0.0);
                let pb = b.as_array().and_then(|v| v.first()).and_then(|x| x.as_f64()).unwrap_or(0.0);
                pa.partial_cmp(&pb).unwrap_or(std::cmp::Ordering::Equal)
            });
            Value::Json(JSON::Array(arr))
        } else { Value::new_array() };
        let mut result = Value::new_object();
        result.set(Value::from("symbol"), symbol);
        result.set(Value::from("bids"), sorted_bids);
        result.set(Value::from("asks"), sorted_asks);
        result.set(Value::from("timestamp"), timestamp.clone());
        result.set(Value::from("datetime"), Value::Undefined);
        result.set(Value::from("nonce"), Value::Undefined);
        result
    }

    // ---------------------------------------------------------------------------
    // Base class defaults — these mirror the default implementations in Exchange.js.
    // Individual exchanges override these via their own trait impls.
    // ---------------------------------------------------------------------------

    /// Default fetchMarkets returns the values of self.markets (empty when not loaded).
    async fn fetch_markets(&mut self, _params: Value) -> Value {
        // In JS: return Object.values(this.markets)
        // Before load_markets is called, this.markets is empty.
        let markets = self.get(Value::from("markets"));
        match &markets {
            Value::Json(JSON::Object(m)) => {
                let vals: Vec<JSON> = m.values().cloned().collect();
                Value::Json(JSON::Array(vals))
            }
            _ => Value::Json(JSON::Array(vec![])),
        }
    }

    /// Binance-specific: fetch dust trade history. Not in base Exchange.js.
    async fn fetch_my_dust_trades(&mut self, _symbol: Value, _since: Value, _limit: Value, _params: Value) -> Value {
        // Exchange-specific (Binance). Base returns undefined.
        Value::Undefined
    }

    /// Exchange-specific position parser (Binance/Aster). Not in base Exchange.js.
    fn parse_account_position(&self, _position: Value, _market: Value) -> Value {
        Value::Undefined
    }

    /// Exchange-specific position risk parser (Binance/Aster). Not in base Exchange.js.
    fn parse_position_risk(&self, _position: Value, _market: Value) -> Value {
        Value::Undefined
    }

    /// Default setMarginMode — throws NotSupported in JS. Returns undefined here.
    async fn set_margin_mode(&mut self, _margin_mode: Value, _symbol: Value, _params: Value) -> Value {
        Value::Undefined
    }

    /// Utility: extract network code by matching a deposit URL against currency network
    /// contract address URLs. Binance-specific but available on base class.
    fn get_network_code_by_network_url(&self, currency_code: Value, deposit_url: Value) -> Value {
        if deposit_url.is_nullish() {
            return Value::Undefined;
        }
        let currencies = self.get(Value::from("currencies"));
        let currency = match &currency_code {
            Value::Json(JSON::String(code)) => {
                currencies.get(Value::from(code.as_str()))
            }
            _ => return Value::Undefined,
        };
        let networks = match &currency {
            v if v.is_nonnullish() => {
                let n = v.get(Value::from("networks"));
                if n.is_nullish() { return Value::Undefined; }
                n
            }
            _ => return Value::Undefined,
        };
        if let Value::Json(JSON::Object(nets)) = &networks {
            for (network_code, network_info) in nets.iter() {
                let info = match network_info.get("info") {
                    Some(v) => v,
                    None => continue,
                };
                let site_url = match info.get("contractAddressUrl").and_then(|v| v.as_str()) {
                    Some(s) => s,
                    None => continue,
                };
                let base_domain = self.get_base_domain_from_url(Value::from(site_url));
                if let (Value::Json(JSON::String(base)), Value::Json(JSON::String(dep))) = (&base_domain, &deposit_url) {
                    if dep.starts_with(base.as_str()) {
                        return Value::from(network_code.as_str());
                    }
                }
            }
        }
        Value::Undefined
    }

    /// Utility: extract scheme + domain from a URL (e.g. "https://example.com/path" -> "https://example.com/")
    fn get_base_domain_from_url(&self, url: Value) -> Value {
        if url.is_nullish() {
            return Value::Undefined;
        }
        match &url {
            Value::Json(JSON::String(s)) => {
                let parts: Vec<&str> = s.split('/').collect();
                let scheme = match parts.first() {
                    Some(s) => *s,
                    None => return Value::Undefined,
                };
                let domain = match parts.get(2) {
                    Some(d) => *d,
                    None => return Value::Undefined,
                };
                Value::from(format!("{}//{}/", scheme, domain))
            }
            _ => Value::Undefined,
        }
    }

    /// Default sign — returns empty request object. Exchanges override with auth logic.
    fn sign(&self, _path: Value, _api: Value, _method: Value, _params: Value, _headers: Value, _body: Value) -> Value {
        Value::new_object()
    }

    /// Default handleErrors — stub that exchanges override with error detection logic.
    fn handle_errors(&mut self, _code: Value, _reason: Value, _url: Value, _method: Value, _headers: Value, _body: Value, _response: Value, _request_headers: Value, _request_body: Value) -> Value {
        Value::Undefined
    }

    /// Default fetchConvertTrade — not supported by default in base Exchange.js.
    async fn fetch_convert_trade(&mut self, _id: Value, _code: Value, _since: Value, _limit: Value, _params: Value) -> Value {
        Value::Undefined
    }

    /// Default fetchConvertTradeHistory — not supported by default in base Exchange.js.
    async fn fetch_convert_trade_history(&mut self, _code: Value, _since: Value, _limit: Value, _params: Value) -> Value {
        Value::Undefined
    }

    /// Default fetchAllGreeks — not supported by default in base Exchange.js.
    async fn fetch_all_greeks(&mut self, _underlying: Value, _params: Value) -> Value {
        Value::Undefined
    }

    /// Default fetchOptionPositions — not supported by default in base Exchange.js.
    async fn fetch_option_positions(&mut self, _symbols: Value, _params: Value) -> Value {
        Value::Undefined
    }

    // ---------------------------------------------------------------------------
    // Runtime methods — defined before the delimiter in Exchange.js, so the
    // transpiler doesn't see them.  Implemented with real logic.
    // ---------------------------------------------------------------------------

    async fn load_markets(&mut self, _reload: Value, _params: Value) -> Value { Value::Undefined }

    fn omit(&self, obj: Value, keys: Value) -> Value {
        match (&obj, &keys) {
            (Value::Json(JSON::Object(o)), Value::Json(JSON::Array(arr))) => {
                let skip: std::collections::HashSet<String> = arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect();
                let filtered: serde_json::Map<String, JSON> = o.iter().filter(|(k, _)| !skip.contains(k.as_str())).map(|(k, v)| (k.clone(), v.clone())).collect();
                Value::Json(JSON::Object(filtered))
            }
            (Value::Json(JSON::Object(o)), Value::Json(JSON::String(s))) => {
                let filtered: serde_json::Map<String, JSON> = o.iter().filter(|(k, _)| k.as_str() != s.as_str()).map(|(k, v)| (k.clone(), v.clone())).collect();
                Value::Json(JSON::Object(filtered))
            }
            _ => obj,
        }
    }

    fn omit_zero(&self, obj: Value) -> Value {
        match &obj {
            Value::Json(JSON::Object(o)) => {
                let filtered: serde_json::Map<String, JSON> = o.iter().filter(|(_, v)| {
                    match v {
                        JSON::Number(n) => n.as_f64().map_or(true, |f| f != 0.0),
                        JSON::String(s) => s != "0",
                        _ => true,
                    }
                }).map(|(k, v)| (k.clone(), v.clone())).collect();
                Value::Json(JSON::Object(filtered))
            }
            _ => obj,
        }
    }

    fn iso8601(&self, ts: Value) -> Value {
        match &ts {
            Value::Json(JSON::Number(n)) => {
                let ms = n.as_i64().unwrap_or(0);
                let secs = ms / 1000;
                let nsecs = ((ms % 1000) * 1_000_000) as u32;
                if let Some(dt) = chrono::DateTime::from_timestamp(secs, nsecs) {
                    Value::from(dt.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string())
                } else {
                    Value::Undefined
                }
            }
            _ => Value::Undefined,
        }
    }

    fn parse8601(&self, s: Value) -> Value {
        match &s {
            Value::Json(JSON::String(st)) => {
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(st) {
                    Value::from(dt.timestamp_millis())
                } else if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(st, "%Y-%m-%dT%H:%M:%S%.fZ") {
                    Value::from(dt.and_utc().timestamp_millis())
                } else if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(st, "%Y-%m-%dT%H:%M:%SZ") {
                    Value::from(dt.and_utc().timestamp_millis())
                } else if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(st, "%Y-%m-%dT%H:%M:%S") {
                    Value::from(dt.and_utc().timestamp_millis())
                } else {
                    Value::Undefined
                }
            }
            _ => Value::Undefined,
        }
    }

    fn milliseconds(&self) -> Value {
        let ms = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as i64;
        Value::from(ms)
    }

    fn number_to_string(&self, v: Value) -> Value {
        match &v {
            Value::Json(JSON::Number(n)) => {
                if let Some(i) = n.as_i64() {
                    Value::from(i.to_string())
                } else if let Some(f) = n.as_f64() {
                    Value::from(format!("{}", f))
                } else {
                    v.to_string()
                }
            }
            _ => v.to_string(),
        }
    }

    fn in_array(&self, needle: Value, haystack: Value) -> Value {
        match (&needle, &haystack) {
            (Value::Json(n), Value::Json(JSON::Array(arr))) => {
                Value::from(arr.contains(n))
            }
            _ => false.into(),
        }
    }

    fn decimal_to_precision(&self, v: Value, _r: Value, _p: Value, _c: Value, _pad: Value) -> Value { v }

    fn uuid22(&self) -> Value {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyz0123456789".chars().collect();
        let s: String = (0..22).map(|_| chars[rng.gen_range(0..chars.len())]).collect();
        Value::from(s)
    }

    fn yymmdd(&self, ts: Value, sep: Value) -> Value {
        let ms = match &ts {
            Value::Json(JSON::Number(n)) => n.as_i64().unwrap_or(0),
            _ => return Value::from(""),
        };
        let separator = match &sep {
            Value::Json(JSON::String(s)) => s.clone(),
            _ => "-".to_string(),
        };
        if let Some(dt) = chrono::DateTime::from_timestamp(ms / 1000, 0) {
            Value::from(format!("{:02}{}{:02}{}{:02}", dt.format("%y"), separator, dt.format("%m"), separator, dt.format("%d")))
        } else {
            Value::from("")
        }
    }

    fn urlencode(&self, params: Value) -> Value {
        match &params {
            Value::Json(JSON::Object(o)) => {
                let parts: Vec<String> = o.iter().map(|(k, v)| {
                    let val = match v {
                        JSON::String(s) => s.clone(),
                        JSON::Number(n) => n.to_string(),
                        JSON::Bool(b) => b.to_string(),
                        JSON::Null => "".to_string(),
                        _ => v.to_string(),
                    };
                    format!("{}={}", urlencoding::encode(k), urlencoding::encode(&val))
                }).collect();
                Value::from(parts.join("&"))
            }
            _ => Value::from(""),
        }
    }

    fn urlencode_with_array_repeat(&self, params: Value) -> Value {
        match &params {
            Value::Json(JSON::Object(o)) => {
                let mut parts: Vec<String> = Vec::new();
                for (k, v) in o.iter() {
                    match v {
                        JSON::Array(arr) => {
                            for item in arr {
                                let val = match item {
                                    JSON::String(s) => s.clone(),
                                    _ => item.to_string(),
                                };
                                parts.push(format!("{}={}", urlencoding::encode(k), urlencoding::encode(&val)));
                            }
                        }
                        _ => {
                            let val = match v {
                                JSON::String(s) => s.clone(),
                                JSON::Number(n) => n.to_string(),
                                JSON::Bool(b) => b.to_string(),
                                _ => v.to_string(),
                            };
                            parts.push(format!("{}={}", urlencoding::encode(k), urlencoding::encode(&val)));
                        }
                    }
                }
                Value::from(parts.join("&"))
            }
            _ => Value::from(""),
        }
    }

    fn rawencode(&self, params: Value) -> Value {
        match &params {
            Value::Json(JSON::Object(o)) => {
                let parts: Vec<String> = o.iter().map(|(k, v)| {
                    let val = match v {
                        JSON::String(s) => s.clone(),
                        JSON::Number(n) => n.to_string(),
                        JSON::Bool(b) => b.to_string(),
                        _ => v.to_string(),
                    };
                    format!("{}={}", k, val)
                }).collect();
                Value::from(parts.join("&"))
            }
            _ => Value::from(""),
        }
    }

    fn encode_uri_component(&self, s: Value) -> Value {
        match &s {
            Value::Json(JSON::String(st)) => Value::from(urlencoding::encode(st).to_string()),
            _ => s,
        }
    }

    fn encode(&self, s: Value) -> Value { s }

    fn sort_by(&self, arr: Value, key: Value, _desc: Value, _dir: Value) -> Value {
        match (&arr, &key) {
            (Value::Json(JSON::Array(a)), Value::Json(JSON::String(k))) => {
                let mut sorted = a.clone();
                let desc = _desc.is_truthy();
                sorted.sort_by(|a, b| {
                    let va = a.get(k.as_str());
                    let vb = b.get(k.as_str());
                    let cmp = match (va, vb) {
                        (Some(JSON::Number(na)), Some(JSON::Number(nb))) => {
                            na.as_f64().unwrap_or(0.0).partial_cmp(&nb.as_f64().unwrap_or(0.0)).unwrap_or(std::cmp::Ordering::Equal)
                        }
                        (Some(JSON::String(sa)), Some(JSON::String(sb))) => sa.cmp(sb),
                        _ => std::cmp::Ordering::Equal,
                    };
                    if desc { cmp.reverse() } else { cmp }
                });
                Value::Json(JSON::Array(sorted))
            }
            _ => arr,
        }
    }

    fn index_by(&self, arr: Value, key: Value) -> Value {
        match (&arr, &key) {
            (Value::Json(JSON::Array(a)), Value::Json(JSON::String(k))) => {
                let mut result = serde_json::Map::new();
                for item in a.iter() {
                    if let Some(JSON::String(val)) = item.get(k.as_str()) {
                        result.insert(val.clone(), item.clone());
                    }
                }
                Value::Json(JSON::Object(result))
            }
            _ => arr,
        }
    }

    fn filter_by(&self, arr: Value, key: Value, value: Value) -> Value {
        match (&arr, &key) {
            (Value::Json(JSON::Array(a)), Value::Json(JSON::String(k))) => {
                let target = match &value {
                    Value::Json(v) => Some(v),
                    _ => None,
                };
                let filtered: Vec<JSON> = a.iter().filter(|item| {
                    match (item.get(k.as_str()), target) {
                        (Some(v), Some(t)) => v == t,
                        _ => false,
                    }
                }).cloned().collect();
                Value::Json(JSON::Array(filtered))
            }
            _ => arr,
        }
    }

    fn group_by(&self, arr: Value, key: Value) -> Value {
        match (&arr, &key) {
            (Value::Json(JSON::Array(a)), Value::Json(JSON::String(k))) => {
                let mut result: serde_json::Map<String, JSON> = serde_json::Map::new();
                for item in a.iter() {
                    let group_key = match item.get(k.as_str()) {
                        Some(JSON::String(s)) => s.clone(),
                        Some(JSON::Number(n)) => n.to_string(),
                        Some(JSON::Bool(b)) => b.to_string(),
                        _ => "undefined".to_string(),
                    };
                    let entry = result.entry(group_key).or_insert_with(|| JSON::Array(vec![]));
                    if let JSON::Array(arr) = entry {
                        arr.push(item.clone());
                    }
                }
                Value::Json(JSON::Object(result))
            }
            _ => arr,
        }
    }

    fn precision_from_string(&self, s: Value) -> Value {
        match &s {
            Value::Json(JSON::String(st)) => {
                if let Some(dot_pos) = st.find('.') {
                    let after_dot = &st[dot_pos + 1..];
                    let trimmed = after_dot.trim_end_matches('0');
                    if trimmed.is_empty() {
                        let zeros = after_dot.len() as i64;
                        Value::from(-zeros)
                    } else {
                        Value::from(trimmed.len() as i64)
                    }
                } else {
                    Value::from(0i64)
                }
            }
            _ => Value::Undefined,
        }
    }

    fn json(&self, v: Value) -> Value {
        match &v {
            Value::Json(j) => Value::from(serde_json::to_string(j).unwrap_or_default()),
            Value::Undefined => Value::from("undefined"),
        }
    }

    fn create_safe_dictionary(&self) -> Value { Value::new_object() }

    fn parse_timeframe(&self, tf: Value) -> Value {
        match &tf {
            Value::Json(JSON::String(s)) => {
                let s = s.trim();
                if s.is_empty() { return Value::Undefined; }
                let (num_str, unit) = s.split_at(s.len() - 1);
                let num: i64 = num_str.parse().unwrap_or(1);
                let multiplier: i64 = match unit {
                    "s" => 1,
                    "m" => 60,
                    "h" => 3600,
                    "d" => 86400,
                    "w" => 604800,
                    "M" => 2592000,
                    "y" => 31536000,
                    _ => return Value::Undefined,
                };
                Value::from(num * multiplier)
            }
            _ => Value::Undefined,
        }
    }

    fn hash(&self, msg: Value, hash_type: Value, enc: Value) -> Value {
        use sha2::{Sha256, Sha384, Sha512, Digest};
        let data = match &msg {
            Value::Json(JSON::String(s)) => s.as_bytes().to_vec(),
            _ => return Value::from(""),
        };
        let hash_name = match &hash_type {
            Value::Json(JSON::String(s)) => s.to_lowercase(),
            _ => "sha256".to_string(),
        };
        let result_bytes: Vec<u8> = match hash_name.as_str() {
            "sha256" => Sha256::digest(&data).to_vec(),
            "sha384" => Sha384::digest(&data).to_vec(),
            "sha512" => Sha512::digest(&data).to_vec(),
            "md5" => {
                use md5::Digest as Md5Digest;
                md5::Md5::digest(&data).to_vec()
            }
            "keccak" => {
                use sha3::Keccak256;
                use sha3::Digest as Sha3Digest;
                Keccak256::digest(&data).to_vec()
            }
            _ => Sha256::digest(&data).to_vec(),
        };
        let encoding = match &enc {
            Value::Json(JSON::String(s)) => s.as_str(),
            _ => "hex",
        };
        match encoding {
            "base64" => {
                Value::from(base64::encode(&result_bytes))
            }
            _ => Value::from(hex::encode(&result_bytes)),
        }
    }

    fn hmac(&self, msg: Value, sec: Value, hash_type: Value, enc: Value) -> Value {
        use hmac::{Hmac, Mac};
        use sha2::{Sha256, Sha384, Sha512};
        let data = match &msg {
            Value::Json(JSON::String(s)) => s.as_bytes().to_vec(),
            _ => return Value::from(""),
        };
        let secret = match &sec {
            Value::Json(JSON::String(s)) => s.as_bytes().to_vec(),
            _ => return Value::from(""),
        };
        let hash_name = match &hash_type {
            Value::Json(JSON::String(s)) => s.to_lowercase(),
            _ => "sha256".to_string(),
        };
        let result_bytes: Vec<u8> = match hash_name.as_str() {
            "sha256" => {
                let mut mac = Hmac::<Sha256>::new_from_slice(&secret).unwrap();
                mac.update(&data);
                mac.finalize().into_bytes().to_vec()
            }
            "sha384" => {
                let mut mac = Hmac::<Sha384>::new_from_slice(&secret).unwrap();
                mac.update(&data);
                mac.finalize().into_bytes().to_vec()
            }
            "sha512" => {
                let mut mac = Hmac::<Sha512>::new_from_slice(&secret).unwrap();
                mac.update(&data);
                mac.finalize().into_bytes().to_vec()
            }
            "md5" => {
                let mut mac = Hmac::<md5::Md5>::new_from_slice(&secret).unwrap();
                mac.update(&data);
                mac.finalize().into_bytes().to_vec()
            }
            _ => {
                let mut mac = Hmac::<Sha256>::new_from_slice(&secret).unwrap();
                mac.update(&data);
                mac.finalize().into_bytes().to_vec()
            }
        };
        let encoding = match &enc {
            Value::Json(JSON::String(s)) => s.as_str(),
            _ => "hex",
        };
        match encoding {
            "base64" => {
                Value::from(base64::encode(&result_bytes))
            }
            _ => Value::from(hex::encode(&result_bytes)),
        }
    }

    fn array_concat(&self, a: Value, b: Value) -> Value { a.concat(b) }
    fn sum(&self, a: Value, b: Value) -> Value { a + b }

    fn parse_json(&self, body: Value) -> Value {
        match &body {
            Value::Json(JSON::String(s)) => {
                match serde_json::from_str::<JSON>(s) {
                    Ok(v) => Value::Json(v),
                    Err(_) => body,
                }
            }
            _ => body,
        }
    }

    fn check_address(&mut self, address: Value) -> Value { address }
    fn network_id_to_code(&self, network_id: Value, _currency_code: Value) -> Value { network_id }
    fn deposit_withdraw_fee(&self, fee: Value) -> Value { fee }

    // --- Utility methods (pre-delimiter methods from Exchange.js) ---

    fn capitalize(&self, mut s: Value) -> Value {
        match &s {
            Value::Json(JSON::String(st)) => {
                if st.is_empty() { return s; }
                let mut chars = st.chars();
                let first = chars.next().unwrap().to_uppercase().to_string();
                Value::from(format!("{}{}", first, chars.as_str()))
            }
            _ => Value::Undefined,
        }
    }

    fn uuid(&self) -> Value {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let bytes: [u8; 16] = rng.r#gen();
        Value::from(format!(
            "{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}",
            u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]),
            u16::from_be_bytes([bytes[4], bytes[5]]),
            u16::from_be_bytes([bytes[6], bytes[7]]) & 0x0fff,
            (u16::from_be_bytes([bytes[8], bytes[9]]) & 0x3fff) | 0x8000,
            u64::from_be_bytes([0, 0, bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]])
        ))
    }

    fn uuid16(&self) -> Value {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let bytes: [u8; 8] = rng.r#gen();
        Value::from(hex::encode(bytes))
    }

    fn uuid5(&self, mut name: Value, mut namespace: Value) -> Value {
        // UUID v5 requires SHA-1 hashing of namespace+name — simplified implementation
        use sha2::{Sha256, Digest};
        let ns = match &namespace {
            Value::Json(JSON::String(s)) => s.clone(),
            _ => "".to_string(),
        };
        let n = match &name {
            Value::Json(JSON::String(s)) => s.clone(),
            _ => "".to_string(),
        };
        let hash = Sha256::digest(format!("{}{}", ns, n).as_bytes());
        Value::from(format!(
            "{:08x}-{:04x}-5{:03x}-{:04x}-{:012x}",
            u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]),
            u16::from_be_bytes([hash[4], hash[5]]),
            u16::from_be_bytes([hash[6], hash[7]]) & 0x0fff,
            (u16::from_be_bytes([hash[8], hash[9]]) & 0x3fff) | 0x8000,
            u64::from_be_bytes([0, 0, hash[10], hash[11], hash[12], hash[13], hash[14], hash[15]])
        ))
    }

    fn base16_to_binary(&self, mut hex_str: Value) -> Value {
        match &hex_str {
            Value::Json(JSON::String(s)) => {
                match hex::decode(s) {
                    Ok(bytes) => {
                        let arr: Vec<JSON> = bytes.iter().map(|b| json!(*b as i64)).collect();
                        Value::Json(JSON::Array(arr))
                    }
                    Err(_) => Value::Undefined,
                }
            }
            _ => Value::Undefined,
        }
    }

    fn int_to_base16(&self, mut num: Value) -> Value {
        match &num {
            Value::Json(JSON::Number(n)) => {
                let i = n.as_i64().unwrap_or(0);
                Value::from(format!("{:x}", i))
            }
            _ => Value::Undefined,
        }
    }

    fn binary_to_base16(&self, mut buff: Value) -> Value {
        match &buff {
            Value::Json(JSON::Array(arr)) => {
                let bytes: Vec<u8> = arr.iter().filter_map(|v| v.as_i64().map(|n| n as u8)).collect();
                Value::from(hex::encode(bytes))
            }
            Value::Json(JSON::String(s)) => Value::from(hex::encode(s.as_bytes())),
            _ => Value::Undefined,
        }
    }

    fn base58_to_binary(&self, mut s: Value) -> Value {
        // Base58 decode (Bitcoin alphabet)
        match &s {
            Value::Json(JSON::String(st)) => {
                let alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
                let mut result = vec![0u8; 0];
                for ch in st.chars() {
                    let digit = match alphabet.find(ch) {
                        Some(d) => d,
                        None => return Value::Undefined,
                    };
                    let mut carry = digit;
                    for byte in result.iter_mut().rev() {
                        carry += (*byte as usize) * 58;
                        *byte = (carry % 256) as u8;
                        carry /= 256;
                    }
                    while carry > 0 {
                        result.insert(0, (carry % 256) as u8);
                        carry /= 256;
                    }
                }
                for ch in st.chars() {
                    if ch == '1' {
                        result.insert(0, 0);
                    } else {
                        break;
                    }
                }
                let arr: Vec<JSON> = result.iter().map(|b| json!(*b as i64)).collect();
                Value::Json(JSON::Array(arr))
            }
            _ => Value::Undefined,
        }
    }

    fn binary_to_base58(&self, mut buff: Value) -> Value {
        let bytes: Vec<u8> = match &buff {
            Value::Json(JSON::Array(arr)) => arr.iter().filter_map(|v| v.as_i64().map(|n| n as u8)).collect(),
            _ => return Value::Undefined,
        };
        let alphabet: Vec<char> = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".chars().collect();
        if bytes.is_empty() { return Value::from(""); }
        let mut digits = vec![0u32];
        for &byte in &bytes {
            let mut carry = byte as u32;
            for d in digits.iter_mut() {
                carry += (*d) * 256;
                *d = carry % 58;
                carry /= 58;
            }
            while carry > 0 {
                digits.push(carry % 58);
                carry /= 58;
            }
        }
        let mut result = String::new();
        for &b in &bytes {
            if b == 0 { result.push('1'); } else { break; }
        }
        for &d in digits.iter().rev() {
            result.push(alphabet[d as usize]);
        }
        Value::from(result)
    }

    fn base64_to_binary(&self, mut s: Value) -> Value {
        match &s {
            Value::Json(JSON::String(st)) => {
                match base64::decode(st) {
                    Ok(bytes) => {
                        let arr: Vec<JSON> = bytes.into_iter().map(|b| json!(b as i64)).collect();
                        Value::Json(JSON::Array(arr))
                    }
                    Err(_) => Value::Undefined,
                }
            }
            _ => Value::Undefined,
        }
    }

    fn string_to_base64(&self, mut s: Value) -> Value {
        match &s {
            Value::Json(JSON::String(st)) => {
                Value::from(base64::encode(st.as_bytes()))
            }
            _ => Value::Undefined,
        }
    }

    fn deep_extend_2(&self, mut a: Value, mut b: Value) -> Value {
        match (&mut a, &b) {
            (Value::Json(JSON::Object(target)), Value::Json(JSON::Object(source))) => {
                for (k, v) in source.iter() {
                    if let Some(JSON::Object(_)) = target.get(k) {
                        if let JSON::Object(_) = v {
                            let merged = self.deep_extend_2(Value::Json(target.get(k).unwrap().clone()), Value::Json(v.clone()));
                            if let Value::Json(merged_json) = merged {
                                target.insert(k.clone(), merged_json);
                            }
                            continue;
                        }
                    }
                    target.insert(k.clone(), v.clone());
                }
                Value::Json(JSON::Object(target.clone()))
            }
            _ => {
                if b.is_undefined() { a } else { b }
            }
        }
    }

    fn extend_1(&self, mut a: Value) -> Value { a }

    fn number_to_be(&self, mut num: Value, mut size: Value) -> Value {
        let n = match &num {
            Value::Json(JSON::Number(v)) => v.as_i64().unwrap_or(0),
            _ => return Value::Undefined,
        };
        let sz = match &size {
            Value::Json(JSON::Number(v)) => v.as_u64().unwrap_or(4) as usize,
            _ => 4,
        };
        let bytes = n.to_be_bytes();
        let start = if 8 > sz { 8 - sz } else { 0 };
        let arr: Vec<JSON> = bytes[start..].iter().take(sz).map(|b| json!(*b as i64)).collect();
        Value::Json(JSON::Array(arr))
    }

    fn binary_concat(&self, mut a: Value, mut b: Value, mut c: Value, mut d: Value) -> Value {
        let mut result: Vec<JSON> = Vec::new();
        for v in [&a, &b, &c, &d] {
            if let Value::Json(JSON::Array(arr)) = v {
                result.extend(arr.iter().cloned());
            } else if let Value::Json(JSON::String(s)) = v {
                result.extend(s.as_bytes().iter().map(|b| json!(*b as i64)));
            }
        }
        Value::Json(JSON::Array(result))
    }

    fn binary_concat_array(&self, mut arr: Value) -> Value {
        let mut result: Vec<JSON> = Vec::new();
        if let Value::Json(JSON::Array(items)) = &arr {
            for item in items {
                if let JSON::Array(bytes) = item {
                    result.extend(bytes.iter().cloned());
                } else if let JSON::String(s) = item {
                    result.extend(s.as_bytes().iter().map(|b| json!(*b as i64)));
                }
            }
        }
        Value::Json(JSON::Array(result))
    }

    fn binary_length(&self, mut buff: Value) -> Value {
        match &buff {
            Value::Json(JSON::Array(arr)) => Value::from(arr.len() as i64),
            Value::Json(JSON::String(s)) => Value::from(s.len() as i64),
            _ => Value::from(0i64),
        }
    }

    fn seconds(&self) -> Value {
        let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64;
        Value::from(secs)
    }

    fn microseconds(&self) -> Value {
        let us = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_micros() as i64;
        Value::from(us)
    }

    fn parse_date(&self, mut date_str: Value) -> Value {
        self.parse8601(date_str)
    }

    fn check_required_dependencies(&self) -> Value { Value::Undefined }

    fn ordered(&self, mut obj: Value) -> Value { obj }

    fn remove0x_prefix(&self, mut hex_str: Value) -> Value {
        match &hex_str {
            Value::Json(JSON::String(s)) => {
                if s.starts_with("0x") || s.starts_with("0X") {
                    Value::from(s[2..].to_string())
                } else {
                    hex_str
                }
            }
            _ => Value::Undefined,
        }
    }

    fn yyyymmdd(&self, mut timestamp: Value, mut infix: Value) -> Value {
        let ms = match &timestamp {
            Value::Json(JSON::Number(n)) => n.as_i64().unwrap_or(0),
            _ => return Value::Undefined,
        };
        let sep = match &infix {
            Value::Json(JSON::String(s)) => s.clone(),
            _ => "-".to_string(),
        };
        if let Some(dt) = chrono::DateTime::from_timestamp(ms / 1000, 0) {
            Value::from(format!("{:04}{}{:02}{}{:02}", dt.format("%Y"), sep, dt.format("%m"), sep, dt.format("%d")))
        } else {
            Value::Undefined
        }
    }

    fn ymd(&self, mut timestamp: Value, mut infix: Value, mut pad: Value) -> Value {
        self.yyyymmdd(timestamp, infix)
    }

    fn reduce(&self, mut arr: Value, mut callback: Value, mut initial: Value) -> Value {
        // Cannot implement dynamically with Value callbacks; return initial
        initial
    }

    fn convert_to_big_int(&self, mut value: Value) -> Value {
        match &value {
            Value::Json(JSON::String(s)) => {
                if let Ok(n) = s.parse::<i64>() {
                    Value::from(n)
                } else {
                    value
                }
            }
            _ => value,
        }
    }

    // Crypto-specific methods that require specialized libraries not yet integrated
    fn axolotl(&self, mut payload: Value, mut key: Value, mut algo: Value) -> Value { Value::Undefined }
    fn eth_encode_structured_data(&self, mut domain: Value, mut message_types: Value, mut message_data: Value) -> Value { Value::Undefined }
    fn eth_abi_encode(&self, mut types: Value, mut args: Value) -> Value { Value::Undefined }
    fn starknet_sign(&self, mut msg: Value, mut private_key: Value) -> Value { Value::Undefined }
    fn starknet_encode_structured_data(&self, mut domain: Value, mut types: Value, mut data: Value, mut private_key: Value) -> Value { Value::Undefined }

    fn rand_number(&self, mut n: Value) -> Value {
        use rand::Rng;
        let max = match &n {
            Value::Json(JSON::Number(v)) => v.as_i64().unwrap_or(1000000),
            _ => 1000000,
        };
        let mut rng = rand::thread_rng();
        Value::from(rng.gen_range(0..max))
    }

    fn random_bytes(&self, mut size: Value) -> Value {
        use rand::Rng;
        let sz = match &size {
            Value::Json(JSON::Number(n)) => n.as_u64().unwrap_or(16) as usize,
            _ => 16,
        };
        let mut rng = rand::thread_rng();
        let bytes: Vec<u8> = (0..sz).map(|_| rng.r#gen()).collect();
        let arr: Vec<JSON> = bytes.iter().map(|b| json!(*b as i64)).collect();
        Value::Json(JSON::Array(arr))
    }

    // dYdX protocol-specific methods — require protobuf and chain-specific logic
    fn to_dydx_long(&self, mut value: Value) -> Value { Value::Undefined }
    fn encode_dydx_tx_for_signing(&self, mut msg: Value) -> Value { Value::Undefined }
    fn encode_dydx_tx_for_simulation(&self, mut msg: Value) -> Value { Value::Undefined }
    fn encode_dydx_tx_raw(&self, mut sign_doc: Value, mut signature: Value) -> Value { Value::Undefined }
    fn load_dydx_protos(&self) -> Value { Value::Undefined }
    fn retrieve_dydx_credentials(&self) -> Value { Value::Undefined }
    fn retrieve_stark_account(&self, mut params: Value) -> Value { Value::Undefined }
    fn get_zk_contract_signature_obj(&self, mut seeds: Value, mut contract: Value) -> Value { Value::Undefined }
    fn get_zk_transfer_signature_obj(&self, mut seeds: Value, mut transfer: Value) -> Value { Value::Undefined }

    fn sort(&self, mut arr: Value) -> Value {
        match &mut arr {
            Value::Json(JSON::Array(a)) => {
                a.sort_by(|x, y| {
                    match (x, y) {
                        (JSON::Number(a), JSON::Number(b)) => a.as_f64().unwrap_or(0.0).partial_cmp(&b.as_f64().unwrap_or(0.0)).unwrap_or(std::cmp::Ordering::Equal),
                        (JSON::String(a), JSON::String(b)) => a.cmp(b),
                        _ => std::cmp::Ordering::Equal,
                    }
                });
                Value::Json(JSON::Array(a.clone()))
            }
            _ => arr,
        }
    }

    fn sort_by_2(&self, mut arr: Value, mut key1: Value, mut key2: Value) -> Value {
        match (&mut arr, &key1, &key2) {
            (Value::Json(JSON::Array(a)), Value::Json(JSON::String(k1)), Value::Json(JSON::String(k2))) => {
                a.sort_by(|x, y| {
                    let cmp1 = match (x.get(k1.as_str()), y.get(k1.as_str())) {
                        (Some(JSON::Number(a)), Some(JSON::Number(b))) => a.as_f64().unwrap_or(0.0).partial_cmp(&b.as_f64().unwrap_or(0.0)).unwrap_or(std::cmp::Ordering::Equal),
                        (Some(JSON::String(a)), Some(JSON::String(b))) => a.cmp(b),
                        _ => std::cmp::Ordering::Equal,
                    };
                    if cmp1 != std::cmp::Ordering::Equal { return cmp1; }
                    match (x.get(k2.as_str()), y.get(k2.as_str())) {
                        (Some(JSON::Number(a)), Some(JSON::Number(b))) => a.as_f64().unwrap_or(0.0).partial_cmp(&b.as_f64().unwrap_or(0.0)).unwrap_or(std::cmp::Ordering::Equal),
                        (Some(JSON::String(a)), Some(JSON::String(b))) => a.cmp(b),
                        _ => std::cmp::Ordering::Equal,
                    }
                });
                Value::Json(JSON::Array(a.clone()))
            }
            _ => arr,
        }
    }

    fn unique(&self, mut arr: Value) -> Value {
        match &arr {
            Value::Json(JSON::Array(a)) => {
                let mut seen = Vec::new();
                let mut result = Vec::new();
                for item in a.iter() {
                    if !seen.contains(item) {
                        seen.push(item.clone());
                        result.push(item.clone());
                    }
                }
                Value::Json(JSON::Array(result))
            }
            _ => arr,
        }
    }

    fn keysort(&self, mut obj: Value) -> Value {
        match &obj {
            Value::Json(JSON::Object(o)) => {
                let sorted: serde_json::Map<String, JSON> = o.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
                Value::Json(JSON::Object(sorted))
            }
            _ => obj,
        }
    }

    fn implode_params(&self, mut url: Value, mut params: Value) -> Value {
        match (&url, &params) {
            (Value::Json(JSON::String(u)), Value::Json(JSON::Object(p))) => {
                let mut result = u.clone();
                for (k, v) in p.iter() {
                    let placeholder = format!("{{{}}}", k);
                    let val = match v {
                        JSON::String(s) => s.clone(),
                        JSON::Number(n) => n.to_string(),
                        JSON::Bool(b) => b.to_string(),
                        _ => continue,
                    };
                    result = result.replace(&placeholder, &val);
                }
                Value::from(result)
            }
            _ => url,
        }
    }

    fn set_property(&mut self, mut obj: Value, mut key: Value, mut value: Value) -> Value {
        obj.set(key, value);
        Value::Undefined
    }

    fn to_fixed(&self, mut value: Value, mut decimals: Value) -> Value {
        let num = match &value {
            Value::Json(JSON::Number(n)) => n.as_f64().unwrap_or(0.0),
            Value::Json(JSON::String(s)) => s.parse::<f64>().unwrap_or(0.0),
            _ => return Value::Undefined,
        };
        let dec = match &decimals {
            Value::Json(JSON::Number(n)) => n.as_u64().unwrap_or(8) as usize,
            _ => 8,
        };
        Value::from(format!("{:.prec$}", num, prec = dec))
    }

    fn decode(&self, mut data: Value) -> Value {
        match &data {
            Value::Json(JSON::Array(arr)) => {
                let bytes: Vec<u8> = arr.iter().filter_map(|v| v.as_i64().map(|n| n as u8)).collect();
                Value::from(String::from_utf8_lossy(&bytes).to_string())
            }
            _ => data,
        }
    }

    fn fix_stringified_json_members(&self, mut content: Value) -> Value { content }

    fn map_to_safe_map(&self, mut obj: Value) -> Value { obj }

    fn string_to_chars_array(&self, mut s: Value) -> Value {
        match &s {
            Value::Json(JSON::String(st)) => {
                let arr: Vec<JSON> = st.chars().map(|c| json!(c.to_string())).collect();
                Value::Json(JSON::Array(arr))
            }
            _ => Value::Undefined,
        }
    }

    fn packb(&self, mut data: Value) -> Value { data }

    fn array_slice(&self, mut arr: Value, mut start: Value, mut end: Value) -> Value {
        arr.slice(start, end)
    }

    fn futures_transfer(&mut self, mut code: Value, mut amount: Value, mut type_: Value, mut params: Value) -> Value { Value::Undefined }

    fn handle_trigger_prices(&mut self, mut params: Value) -> Value { params }

    fn class_method(&self) -> Value { Value::Undefined }

    fn pad_start(&self, mut s: Value, mut target_len: Value, mut pad_str: Value) -> Value {
        s.pad_start(target_len, pad_str)
    }

    fn is_empty(&self, mut value: Value) -> Value {
        match &value {
            Value::Undefined => true.into(),
            Value::Json(JSON::Null) => true.into(),
            Value::Json(JSON::String(s)) => (s.is_empty()).into(),
            Value::Json(JSON::Array(a)) => (a.is_empty()).into(),
            Value::Json(JSON::Object(o)) => (o.is_empty()).into(),
            _ => false.into(),
        }
    }

    // ---------------------------------------------------------------------------
    // METHODS BELOW THIS LINE ARE TRANSPILED FROM JAVASCRIPT
    fn describe(&self) -> Value { Value::Undefined }


    /// Returns {bool | undefined}
    ///
    /// @ignore
    /// Safely extract boolean value from dictionary or list
    

    /// Returns {bool | undefined}
    ///
    /// @ignore
    /// Safely extract boolean value from dictionary or list
    

    /// Returns {bool | undefined}
    ///
    /// @ignore
    /// Safely extract boolean value from dictionary or list
    

    /// Returns {object | undefined}
    ///
    /// @ignore
    /// Safely extract a dictionary from dictionary or list
    

    /// Returns {object | undefined}
    ///
    /// @ignore
    /// Safely extract a dictionary from dictionary or list
    

    /// Returns {object | undefined}
    ///
    /// @ignore
    /// Safely extract a dictionary from dictionary or list
    

    /// Returns {Array | undefined}
    ///
    /// @ignore
    /// Safely extract an Array from dictionary or list
    

    /// Returns {Array | undefined}
    ///
    /// @ignore
    /// Safely extract an Array from dictionary or list
    

    /// Returns {Array | undefined}
    ///
    /// @ignore
    /// Safely extract an Array from dictionary or list
    

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


    

    fn find_message_hashes(&mut self, mut client: Value, mut element: Value) -> Value { Value::Undefined }


    

    

    fn filter_by_value_since_limit(&self, mut array: Value, mut field: Value, mut value: Value, mut since: Value, mut limit: Value, mut key: Value, mut tail: Value) -> Value { Value::Undefined }


    fn set_sandbox_mode(&mut self, mut enabled: Value) -> Value { Value::Undefined }


    fn enable_demo_trading(&mut self, mut enable: Value) -> Value { Value::Undefined }


    

    async fn fetch_accounts(&mut self, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_trades(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value {
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        if since.is_nonnullish() { request.set("since".into(), since.clone()); request.set("startTime".into(), since.clone()); }
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let candidates = vec![("public", "GET", "trades"), ("public", "GET", "recent_trades"), ("public", "GET", "aggTrades")];
        for (api_name, method_name, path_name) in candidates {
            let rv = self.request(path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
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
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = self.get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["depth", "orderbook", "order_book"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if api_name.as_str() != "public" { continue; }
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = self.request(path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("public", "GET", "depth"), ("public", "GET", "orderbook"), ("public", "GET", "order_book")];
        for (api_name, method_name, path_name) in candidates {
            let rv = self.request(path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
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
        let candidates = vec![("public", "GET", "time"), ("public", "GET", "server/time"), ("public", "GET", "timestamp")];
        for (api_name, method_name, path_name) in candidates {
            let rv = self.request(path_name.into(), api_name.into(), method_name.into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }


    async fn fetch_trading_limits(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }


    fn parse_currency(&self, mut raw_currency: Value) -> Value { Value::Undefined }


    fn parse_currencies(&self, mut raw_currencies: Value) -> Value { Value::Undefined }


    fn parse_market(&self, mut market: Value) -> Value { Value::Undefined }


    fn parse_markets(&self, mut markets: Value) -> Value { Value::Undefined }


    fn parse_ticker(&self, mut ticker: Value, mut market: Value) -> Value { Value::Undefined }


    fn parse_deposit_address(&mut self, mut deposit_address: Value, mut currency: Value) -> Value { Value::Undefined }


    fn parse_trade(&mut self, mut trade: Value, mut market: Value) -> Value { Value::Undefined }


    fn parse_transaction(&self, mut transaction: Value, mut currency: Value) -> Value { Value::Undefined }


    fn parse_transfer(&self, mut transfer: Value, mut currency: Value) -> Value { Value::Undefined }


    fn parse_account(&self, mut account: Value) -> Value { Value::Undefined }


    fn parse_ledger_entry(&self, mut item: Value, mut currency: Value) -> Value { Value::Undefined }


    fn parse_order(&mut self, mut order: Value, mut market: Value) -> Value { Value::Undefined }


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


    /// Returns a list of [margin structures](https://docs.ccxt.com/?id=margin-loan-structure)
    ///
    /// Fetches the history of margin added or reduced from contract isolated positions
    ///
    /// # Arguments
    ///
    /// * `[symbol]` {string} - unified market symbol
    /// * `[type]` {string} - "add" or "reduce"
    /// * `[since]` {int} - timestamp in ms of the earliest change to fetch
    /// * `[limit]` {int} - the maximum amount of changes to fetch
    /// * `params` {object} - extra parameters specific to the exchange api endpoint
    async fn fetch_margin_adjustment_history(&mut self, mut symbol: Value, mut r#type: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    

    async fn fetch_deposit_addresses_by_network(&mut self, mut code: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_open_interest_history(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_open_interest(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_open_interests(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }


    async fn sign_in(&mut self, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_payment_methods(&mut self, mut params: Value) -> Value { Value::Undefined }


    

    

    fn is_round_number(&mut self, mut value: Value) -> Value { Value::Undefined }


    

    

    fn after_construct(&mut self) -> Value { Value::Undefined }


    fn init_rest_rate_limiter(&mut self) -> Value { Value::Undefined }


    fn features_generator(&mut self) -> Value { Value::Undefined }


    fn features_mapper(&mut self, mut initial_features: Value, mut market_type: Value, mut sub_type: Value) -> Value { Value::Undefined }


    /// Returns returns feature value
    ///
    /// This method is a very deterministic to help users to know what feature is supported by the exchange
    ///
    /// # Arguments
    ///
    /// * `[symbol]` {string} - unified symbol
    /// * `[methodName]` {string} - view currently supported methods: https://docs.ccxt.com/#/README?id=features
    /// * `[paramName]` {string} - unified param value, like: `triggerPrice`, `stopLoss.triggerPrice` (check docs for supported param names)
    /// * `[defaultValue]` {object} - return default value if no result found
    fn feature_value(&mut self, mut symbol: Value, mut method_name: Value, mut param_name: Value, mut default_value: Value) -> Value { Value::Undefined }


    /// Returns returns feature value
    ///
    /// This method is a very deterministic to help users to know what feature is supported by the exchange
    ///
    /// # Arguments
    ///
    /// * `[marketType]` {string} - supported only: "spot", "swap", "future"
    /// * `[subType]` {string} - supported only: "linear", "inverse"
    /// * `[methodName]` {string} - view currently supported methods: https://docs.ccxt.com/#/README?id=features
    /// * `[paramName]` {string} - unified param value (check docs for supported param names)
    /// * `[defaultValue]` {object} - return default value if no result found
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


    fn safe_order(&mut self, mut order: Value, mut market: Value) -> Value { Value::Undefined }


    fn parse_orders(&mut self, mut orders: Value, mut market: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    fn calculate_fee_with_rate(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut taker_or_maker: Value, mut fee_rate: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns contains the rate, the percentage multiplied to the order amount to obtain the fee amount, and cost, the total value of the fee in units of the quote currency, for the order
    ///
    /// Calculates the presumptive fee that would be charged for an order
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified market symbol
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade, in units of the base currency on most exchanges, or number of contracts
    /// * `price` {float} - the price for the order to be filled at, in units of the quote currency
    /// * `takerOrMaker` {string} - 'taker' or 'maker'
    /// * `params` {object} - 
    fn calculate_fee(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut taker_or_maker: Value, mut params: Value) -> Value { Value::Undefined }


    fn safe_liquidation(&self, mut liquidation: Value, mut market: Value) -> Value { Value::Undefined }


    fn safe_trade(&mut self, mut trade: Value, mut market: Value) -> Value { Value::Undefined }


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
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        request.set("interval".into(), timeframe.clone());
        if since.is_nonnullish() { request.set("since".into(), since.clone()); request.set("startTime".into(), since.clone()); }
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = self.get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["klines", "candles", "ohlcv"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                // Skip non-public APIs (futures, options, etc.) — they require
                // different params (e.g. 'pair' instead of 'symbol') and are not
                // appropriate for generic spot OHLCV fetching.
                if api_name.as_str() != "public" { continue; }
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = self.request(path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("public", "GET", "klines"), ("public", "GET", "candles"), ("public", "GET", "ohlcv")];
        for (api_name, method_name, path_name) in candidates {
            let rv = self.request(path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
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


    

    async fn fetch_l2_order_book(&mut self, mut symbol: Value, mut limit: Value, mut params: Value) -> Value {
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let candidates = vec![("public", "GET", "depth"), ("public", "GET", "orderbook"), ("public", "GET", "order_book")];
        for (api_name, method_name, path_name) in candidates {
            let rv = self.request(path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }


    fn filter_by_symbol(&self, mut objects: Value, mut symbol: Value) -> Value { Value::Undefined }


    fn parse_ohlcv(&self, mut ohlcv: Value, mut market: Value) -> Value { Value::Undefined }


    /// Returns exchange-specific network id
    ///
    /// @ignore
    /// Tries to convert the provided networkCode (which is expected to be an unified network code) to a network id. In order to achieve this, derived class needs to have 'options->networks' defined.
    ///
    /// # Arguments
    ///
    /// * `networkCode` {string} - unified network code
    /// * `currencyCode` {string} - unified currency code, but this argument is not required by default, unless there is an exchange (like huobi) that needs an override of the method to be able to pass currencyCode argument additionally
    fn network_code_to_id(&mut self, mut network_code: Value, mut currency_code: Value) -> Value { Value::Undefined }


    /// Returns unified network code
    ///
    /// @ignore
    /// Tries to convert the provided exchange-specific networkId to an unified network Code. In order to achieve this, derived class needs to have "options['networksById']" defined.
    ///
    /// # Arguments
    ///
    /// * `networkId` {string} - exchange specific network id/title, like: TRON, Trc-20, usdt-erc20, etc
    /// * `currencyCode` {string|undefined} - unified currency code, but this argument is not required by default, unless there is an exchange (like huobi) that needs an override of the method to be able to pass currencyCode argument additionally
    

    fn handle_network_code_and_params(&mut self, mut params: Value) -> Value { Value::Undefined }


    fn default_network_code(&mut self, mut currency_code: Value) -> Value { Value::Undefined }


    fn select_network_code_from_unified_networks(&mut self, mut currency_code: Value, mut network_code: Value, mut indexed_network_entries: Value) -> Value { Value::Undefined }


    fn select_network_id_from_raw_networks(&mut self, mut currency_code: Value, mut network_code: Value, mut indexed_network_entries: Value) -> Value { Value::Undefined }


    fn select_network_key_from_networks(&mut self, mut currency_code: Value, mut network_code: Value, mut indexed_network_entries: Value, mut is_indexed_by_unified_network_code: Value) -> Value { Value::Undefined }


    

    

    fn parse_ohlcvs(&self, mut ohlcvs: Value, mut market: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut tail: Value) -> Value { Value::Undefined }


    fn parse_leverage_tiers(&self, mut response: Value, mut symbols: Value, mut market_id_key: Value) -> Value { Value::Undefined }


    async fn load_trading_limits(&mut self, mut symbols: Value, mut reload: Value, mut params: Value) -> Value { Value::Undefined }


    fn safe_position(&self, mut position: Value) -> Value { Value::Undefined }


    fn parse_positions(&self, mut positions: Value, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }


    fn parse_accounts(&self, mut accounts: Value, mut params: Value) -> Value { Value::Undefined }


    fn parse_trades_helper(&self, mut is_ws: Value, mut trades: Value, mut market: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    fn parse_trades(&mut self, mut trades: Value, mut market: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


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

        let urls_api = self.get("urls".into()).get("api".into());
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
        let hostname = self.get("hostname".into());
        if hostname.is_string() {
            base_url = base_url.replace("{hostname}", hostname.unwrap_str());
        }
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
                if v.is_null() { continue; }
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


    /// Returns a list of [position structure](https://docs.ccxt.com/?id=position-structure) with maximum 3 items - possible one position for "one-way" mode, and possible two positions (long & short) for "two-way" (a.k.a. hedge) mode
    ///
    /// Fetches all open positions for specific symbol, unlike fetchPositions (which is designed to work with multiple symbols) so this method might be preffered for one-market position, because of less rate-limit consumption and speed
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified market symbol
    /// * `params` {object} - extra parameters specific to the endpoint
    async fn fetch_positions_for_symbol(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a list of [position structure](https://docs.ccxt.com/?id=position-structure) with maximum 3 items - possible one position for "one-way" mode, and possible two positions (long & short) for "two-way" (a.k.a. hedge) mode
    ///
    /// Fetches all open positions for specific symbol, unlike fetchPositions (which is designed to work with multiple symbols) so this method might be preffered for one-market position, because of less rate-limit consumption and speed
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified market symbol
    /// * `params` {object} - extra parameters specific to the endpoint
    async fn fetch_positions_for_symbol_ws(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_positions(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_positions_ws(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_positions_risk(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_bids_asks(&mut self, mut symbols: Value, mut params: Value) -> Value {
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        if symbols.is_nonnullish() { request.set("symbols".into(), symbols.clone()); }
        let candidates = vec![("public", "GET", "ticker/bookTicker"), ("public", "GET", "bookticker"), ("public", "GET", "bidsasks"), ("public", "GET", "tickers")];
        for (api_name, method_name, path_name) in candidates {
            let rv = self.request(path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }


    async fn fetch_borrow_interest(&mut self, mut code: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_ledger(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_ledger_entry(&mut self, mut id: Value, mut code: Value, mut params: Value) -> Value { Value::Undefined }


    

    fn safe_currency(&self, mut currency_id: Value, mut currency: Value) -> Value { Value::Undefined }


    fn safe_market(&self, mut market_id: Value, mut market: Value, mut delimiter: Value, mut market_type: Value) -> Value { Value::Undefined }


    fn market_or_null(&mut self, mut symbol: Value) -> Value { Value::Undefined }


    /// Returns true if all required credentials have been set, otherwise false or an error is thrown is param error=true
    ///
    /// @ignore
    ///
    /// # Arguments
    ///
    /// * `error` {boolean} - throw an error that a credential is required if true
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
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as Exchange>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["status", "ping", "time", "system/status"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = self.request(path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("public", "GET", "status"), ("public", "GET", "ping"), ("public", "GET", "time"), ("sapi", "GET", "system/status")];
        for (api_name, method_name, path_name) in candidates {
            let rv = self.request(path_name.into(), api_name.into(), method_name.into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
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


    /// Returns {[string, object]} the market type and params with type and defaultType omitted
    ///
    /// @ignore
    ///
    /// # Arguments
    ///
    /// * `the` methodName - method calling handleMarketTypeAndParams
    /// * `market` {Market} - 
    /// * `params` {object} - 
    /// * `[params.type]` {string} - type assigned by user
    /// * `[params.defaultType]` {string} - same as params.type
    /// * `[defaultValue]` {string} - assigned programatically in the method calling handleMarketTypeAndParams
    fn handle_market_type_and_params(&mut self, mut method_name: Value, mut market: Value, mut params: Value, mut default_value: Value) -> Value { Value::Undefined }


    fn handle_sub_type_and_params(&mut self, mut method_name: Value, mut market: Value, mut params: Value, mut default_value: Value) -> Value { Value::Undefined }


    /// Returns the marginMode in lowercase as specified by params["marginMode"], params["defaultMarginMode"] this.options["marginMode"] or this.options["defaultMarginMode"]
    ///
    /// @ignore
    ///
    /// # Arguments
    ///
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    fn handle_margin_mode_and_params(&mut self, mut method_name: Value, mut params: Value, mut default_value: Value) -> Value { Value::Undefined }


    fn throw_exactly_matched_exception(&mut self, mut exact: Value, mut string: Value, mut message: Value) -> () { }


    fn throw_broadly_matched_exception(&mut self, mut broad: Value, mut string: Value, mut message: Value) -> () { }


    fn find_broadly_matched_key(&mut self, mut broad: Value, mut string: Value) -> Value { Value::Undefined }


    

    fn calculate_rate_limiter_cost(&mut self, mut api: Value, mut method: Value, mut path: Value, mut params: Value, mut config: Value) -> Value { Value::Undefined }


    async fn fetch_ticker(&mut self, mut symbol: Value, mut params: Value) -> Value {
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = self.get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["ticker/24hr", "ticker", "ticker/price", "bookticker", "tickers"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if api_name.as_str() != "public" { continue; }
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = self.request(path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("public", "GET", "ticker/24hr"), ("public", "GET", "ticker"), ("public", "GET", "ticker/price")];
        for (api_name, method_name, path_name) in candidates {
            let rv = self.request(path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }


    async fn fetch_mark_price(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_ticker_ws(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }


    async fn watch_ticker(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_tickers(&mut self, mut symbols: Value, mut params: Value) -> Value {
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as Exchange>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["tickers", "ticker/24hr", "ticker", "bookticker"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = self.request(path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("public", "GET", "ticker/24hr"), ("public", "GET", "tickers"), ("public", "GET", "ticker")];
        for (api_name, method_name, path_name) in candidates {
            let rv = self.request(path_name.into(), api_name.into(), method_name.into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
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


    

    

    async fn fetch_position_mode(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a trailing order by providing the symbol, type, side, amount, price and trailingAmount
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency, or number of contracts
    /// * `[price]` {float} - the price for the order to be filled at, in units of the quote currency, ignored in market orders
    /// * `trailingAmount` {float} - the quote amount to trail away from the current market price
    /// * `[trailingTriggerPrice]` {float} - the price to activate a trailing order, default uses the price argument
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_trailing_amount_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trailing_amount: Value, mut trailing_trigger_price: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a trailing order by providing the symbol, type, side, amount, price and trailingAmount
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency, or number of contracts
    /// * `[price]` {float} - the price for the order to be filled at, in units of the quote currency, ignored in market orders
    /// * `trailingAmount` {float} - the quote amount to trail away from the current market price
    /// * `[trailingTriggerPrice]` {float} - the price to activate a trailing order, default uses the price argument
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_trailing_amount_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trailing_amount: Value, mut trailing_trigger_price: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a trailing order by providing the symbol, type, side, amount, price and trailingPercent
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency, or number of contracts
    /// * `[price]` {float} - the price for the order to be filled at, in units of the quote currency, ignored in market orders
    /// * `trailingPercent` {float} - the percent to trail away from the current market price
    /// * `[trailingTriggerPrice]` {float} - the price to activate a trailing order, default uses the price argument
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_trailing_percent_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trailing_percent: Value, mut trailing_trigger_price: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a trailing order by providing the symbol, type, side, amount, price and trailingPercent
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency, or number of contracts
    /// * `[price]` {float} - the price for the order to be filled at, in units of the quote currency, ignored in market orders
    /// * `trailingPercent` {float} - the percent to trail away from the current market price
    /// * `[trailingTriggerPrice]` {float} - the price to activate a trailing order, default uses the price argument
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_trailing_percent_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trailing_percent: Value, mut trailing_trigger_price: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a market order by providing the symbol, side and cost
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `side` {string} - 'buy' or 'sell'
    /// * `cost` {float} - how much you want to trade in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_market_order_with_cost(&mut self, mut symbol: Value, mut side: Value, mut cost: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a market buy order by providing the symbol and cost
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `cost` {float} - how much you want to trade in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_market_buy_order_with_cost(&mut self, mut symbol: Value, mut cost: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a market sell order by providing the symbol and cost
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `cost` {float} - how much you want to trade in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_market_sell_order_with_cost(&mut self, mut symbol: Value, mut cost: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a market order by providing the symbol, side and cost
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `side` {string} - 'buy' or 'sell'
    /// * `cost` {float} - how much you want to trade in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_market_order_with_cost_ws(&mut self, mut symbol: Value, mut side: Value, mut cost: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a trigger stop order (type 1)
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency or the number of contracts
    /// * `[price]` {float} - the price to fulfill the order, in units of the quote currency, ignored in market orders
    /// * `triggerPrice` {float} - the price to trigger the stop order, in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_trigger_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trigger_price: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a trigger stop order (type 1)
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency or the number of contracts
    /// * `[price]` {float} - the price to fulfill the order, in units of the quote currency, ignored in market orders
    /// * `triggerPrice` {float} - the price to trigger the stop order, in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_trigger_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut trigger_price: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a trigger stop loss order (type 2)
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency or the number of contracts
    /// * `[price]` {float} - the price to fulfill the order, in units of the quote currency, ignored in market orders
    /// * `stopLossPrice` {float} - the price to trigger the stop loss order, in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_stop_loss_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut stop_loss_price: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a trigger stop loss order (type 2)
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency or the number of contracts
    /// * `[price]` {float} - the price to fulfill the order, in units of the quote currency, ignored in market orders
    /// * `stopLossPrice` {float} - the price to trigger the stop loss order, in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_stop_loss_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut stop_loss_price: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a trigger take profit order (type 2)
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency or the number of contracts
    /// * `[price]` {float} - the price to fulfill the order, in units of the quote currency, ignored in market orders
    /// * `takeProfitPrice` {float} - the price to trigger the take profit order, in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_take_profit_order(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut take_profit_price: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a trigger take profit order (type 2)
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency or the number of contracts
    /// * `[price]` {float} - the price to fulfill the order, in units of the quote currency, ignored in market orders
    /// * `takeProfitPrice` {float} - the price to trigger the take profit order, in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_take_profit_order_ws(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut take_profit_price: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create an order with a stop loss or take profit attached (type 3)
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency or the number of contracts
    /// * `[price]` {float} - the price to fulfill the order, in units of the quote currency, ignored in market orders
    /// * `[takeProfit]` {float} - the take profit price, in units of the quote currency
    /// * `[stopLoss]` {float} - the stop loss price, in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    /// * `[params.takeProfitType]` {string} - *not available on all exchanges* 'limit' or 'market'
    /// * `[params.stopLossType]` {string} - *not available on all exchanges* 'limit' or 'market'
    /// * `[params.takeProfitPriceType]` {string} - *not available on all exchanges* 'last', 'mark' or 'index'
    /// * `[params.stopLossPriceType]` {string} - *not available on all exchanges* 'last', 'mark' or 'index'
    /// * `[params.takeProfitLimitPrice]` {float} - *not available on all exchanges* limit price for a limit take profit order
    /// * `[params.stopLossLimitPrice]` {float} - *not available on all exchanges* stop loss for a limit stop loss order
    /// * `[params.takeProfitAmount]` {float} - *not available on all exchanges* the amount for a take profit
    /// * `[params.stopLossAmount]` {float} - *not available on all exchanges* the amount for a stop loss
    async fn create_order_with_take_profit_and_stop_loss(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut take_profit: Value, mut stop_loss: Value, mut params: Value) -> Value { Value::Undefined }


    fn set_take_profit_and_stop_loss_params(&mut self, mut symbol: Value, mut r#type: Value, mut side: Value, mut amount: Value, mut price: Value, mut take_profit: Value, mut stop_loss: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create an order with a stop loss or take profit attached (type 3)
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to create an order in
    /// * `type` {string} - 'market' or 'limit'
    /// * `side` {string} - 'buy' or 'sell'
    /// * `amount` {float} - how much you want to trade in units of the base currency or the number of contracts
    /// * `[price]` {float} - the price to fulfill the order, in units of the quote currency, ignored in market orders
    /// * `[takeProfit]` {float} - the take profit price, in units of the quote currency
    /// * `[stopLoss]` {float} - the stop loss price, in units of the quote currency
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    /// * `[params.takeProfitType]` {string} - *not available on all exchanges* 'limit' or 'market'
    /// * `[params.stopLossType]` {string} - *not available on all exchanges* 'limit' or 'market'
    /// * `[params.takeProfitPriceType]` {string} - *not available on all exchanges* 'last', 'mark' or 'index'
    /// * `[params.stopLossPriceType]` {string} - *not available on all exchanges* 'last', 'mark' or 'index'
    /// * `[params.takeProfitLimitPrice]` {float} - *not available on all exchanges* limit price for a limit take profit order
    /// * `[params.stopLossLimitPrice]` {float} - *not available on all exchanges* stop loss for a limit stop loss order
    /// * `[params.takeProfitAmount]` {float} - *not available on all exchanges* the amount for a take profit
    /// * `[params.stopLossAmount]` {float} - *not available on all exchanges* the amount for a stop loss
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


    

    async fn fetch_option_chain(&mut self, mut code: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_option(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }


    async fn fetch_convert_quote(&mut self, mut from_code: Value, mut to_code: Value, mut amount: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a list of [transaction structures](https://docs.ccxt.com/?id=transaction-structure)
    ///
    /// Fetch history of deposits and withdrawals
    ///
    /// # Arguments
    ///
    /// * `[code]` {string} - unified currency code for the currency of the deposit/withdrawals, default is undefined
    /// * `[since]` {int} - timestamp in ms of the earliest deposit/withdrawal, default is undefined
    /// * `[limit]` {int} - max number of deposit/withdrawals to return, default is undefined
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
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


    fn create_expired_option_market(&self, mut symbol: Value) -> Value { Value::Undefined }


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


    

    

    /// Returns a string number equal to 1e-precision
    ///
    /// @ignore
    ///
    /// # Arguments
    ///
    /// * `precision` {string} - The number of digits to the right of the decimal
    fn parse_precision(&self, mut precision: Value) -> Value { Value::Undefined }


    /// Returns a string number equal to 1e-precision
    ///
    /// @ignore
    /// Handles positive & negative numbers too. parsePrecision() does not handle negative numbers, but this method handles
    ///
    /// # Arguments
    ///
    /// * `precision` {string} - The number of digits to the right of the decimal
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


    /// Returns {[string, object]} the trigger-direction value and omited params
    ///
    /// @ignore
    fn handle_trigger_direction_and_params(&mut self, mut params: Value, mut exchange_specific_key: Value, mut allow_empty: Value) -> Value { Value::Undefined }


    fn handle_trigger_and_params(&mut self, mut params: Value) -> Value { Value::Undefined }


    fn is_trigger_order(&mut self, mut params: Value) -> Value { Value::Undefined }


    /// Returns true if a post only order, false otherwise
    ///
    /// @ignore
    ///
    /// # Arguments
    ///
    /// * `type` {string} - Order type
    /// * `exchangeSpecificParam` {boolean} - exchange specific postOnly
    /// * `[params]` {object} - exchange specific params
    fn is_post_only(&mut self, mut is_market_order: Value, mut exchange_specific_param: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns {Array}
    ///
    /// @ignore
    ///
    /// # Arguments
    ///
    /// * `type` {string} - Order type
    /// * `exchangeSpecificBoolean` {boolean} - exchange specific postOnly
    /// * `[params]` {object} - exchange specific params
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


    /// Returns a list of candles ordered as timestamp, open, high, low, close, undefined
    ///
    /// Fetches historical mark price candlestick data containing the open, high, low, and close price of a market
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to fetch OHLCV data for
    /// * `timeframe` {string} - the length of time each candle represents
    /// * `[since]` {int} - timestamp in ms of the earliest candle to fetch
    /// * `[limit]` {int} - the maximum amount of candles to fetch
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn fetch_mark_ohlcv(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns {} A list of candles ordered as timestamp, open, high, low, close, undefined
    ///
    /// Fetches historical index price candlestick data containing the open, high, low, and close price of a market
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to fetch OHLCV data for
    /// * `timeframe` {string} - the length of time each candle represents
    /// * `[since]` {int} - timestamp in ms of the earliest candle to fetch
    /// * `[limit]` {int} - the maximum amount of candles to fetch
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn fetch_index_ohlcv(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a list of candles ordered as timestamp, open, high, low, close, undefined
    ///
    /// Fetches historical premium index price candlestick data containing the open, high, low, and close price of a market
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to fetch OHLCV data for
    /// * `timeframe` {string} - the length of time each candle represents
    /// * `[since]` {int} - timestamp in ms of the earliest candle to fetch
    /// * `[limit]` {int} - the maximum amount of candles to fetch
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn fetch_premium_index_ohlcv(&mut self, mut symbol: Value, mut timeframe: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns returns the exchange specific value for timeInForce
    ///
    /// @ignore
    /// Must add timeInForce to this.options to use this method
    fn handle_time_in_force(&mut self, mut params: Value) -> Value { Value::Undefined }


    /// Returns the exchange specific account name or the isolated margin id for transfers
    ///
    /// @ignore
    /// Must add accountsByType to this.options to use this method
    ///
    /// # Arguments
    ///
    /// * `account` {string} - key for account name in this.options['accountsByType']
    fn convert_type_to_account(&self, mut account: Value) -> Value { Value::Undefined }


    /// Returns {undefined}
    ///
    /// @ignore
    ///
    /// # Arguments
    ///
    /// * `methodName` {string} - the name of the method that the argument is being checked for
    /// * `argument` {string} - the argument's actual value provided
    /// * `argumentName` {string} - the name of the argument being checked (for logging purposes)
    /// * `options` {string[]} - a list of options that the argument can be
    fn check_required_argument(&mut self, mut method_name: Value, mut argument: Value, mut argument_name: Value, mut options: Value) -> Value { Value::Undefined }


    /// @ignore
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market
    /// * `methodName` {string} - name of the method that requires a symbol
    /// * `marginMode` {string} - is either 'isolated' or 'cross'
    fn check_required_margin_argument(&mut self, mut method_name: Value, mut symbol: Value, mut margin_mode: Value) -> Value { Value::Undefined }


    /// Returns objects with withdraw and deposit fees, indexed by currency codes
    ///
    /// @ignore
    ///
    /// # Arguments
    ///
    /// * `response` {object[]|object} - unparsed response from the exchange
    /// * `codes` {string[]|undefined} - the unified currency codes to fetch transactions fees for, returns all currencies when undefined
    /// * `currencyIdKey` {str} - *should only be undefined when response is a dictionary* the object key that corresponds to the currency id
    fn parse_deposit_withdraw_fees(&mut self, mut response: Value, mut codes: Value, mut currency_id_key: Value) -> Value { Value::Undefined }


    fn parse_deposit_withdraw_fee(&mut self, mut fee: Value, mut currency: Value) -> Value { Value::Undefined }


    

    /// Returns a deposit withdraw fee structure
    ///
    /// @ignore
    /// Takes a depositWithdrawFee structure and assigns the default values for withdraw and deposit
    ///
    /// # Arguments
    ///
    /// * `fee` {object} - A deposit withdraw fee structure
    /// * `currency` {object} - A currency structure, the response from this.currency ()
    fn assign_default_deposit_withdraw_fees(&mut self, mut fee: Value, mut currency: Value) -> Value { Value::Undefined }


    fn parse_income(&self, mut info: Value, mut market: Value) -> Value { Value::Undefined }


    /// Returns an array of [funding history structures](https://docs.ccxt.com/?id=funding-history-structure)
    ///
    /// @ignore
    /// Parses funding fee info from exchange response
    ///
    /// # Arguments
    ///
    /// * `incomes` {object[]} - each item describes once instance of currency being received or paid
    /// * `market` {object} - ccxt market
    /// * `[since]` {int} - when defined, the response items are filtered to only include items after this timestamp
    /// * `[limit]` {int} - limits the number of items in the response
    fn parse_incomes(&self, mut incomes: Value, mut market: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }


    fn get_market_from_symbols(&mut self, mut symbols: Value) -> Value { Value::Undefined }


    fn parse_ws_ohlcvs(&self, mut ohlcvs: Value, mut market: Value, mut timeframe: Value, mut since: Value, mut limit: Value) -> Value { Value::Undefined }


    /// Returns a list of [transaction structures](https://docs.ccxt.com/?id=transaction-structure)
    ///
    /// *DEPRECATED* use fetchDepositsWithdrawals instead
    /// @deprecated
    ///
    /// # Arguments
    ///
    /// * `code` {string} - unified currency code for the currency of the deposit/withdrawals, default is undefined
    /// * `[since]` {int} - timestamp in ms of the earliest deposit/withdrawal, default is undefined
    /// * `[limit]` {int} - max number of deposit/withdrawals to return, default is undefined
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn fetch_transactions(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    /// @ignore
    /// Typed wrapper for filterByArray that returns a list of positions
    fn filter_by_array_positions(&self, mut objects: Value, mut key: Value, mut values: Value, mut indexed: Value) -> Value { Value::Undefined }


    /// @ignore
    /// Typed wrapper for filterByArray that returns a dictionary of tickers
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


    /// Returns an array of [liquidation structures](https://docs.ccxt.com/?id=liquidation-structure)
    ///
    /// @ignore
    /// Parses liquidation info from the exchange response
    ///
    /// # Arguments
    ///
    /// * `liquidations` {object[]} - each item describes an instance of a liquidation event
    /// * `market` {object} - ccxt market
    /// * `[since]` {int} - when defined, the response items are filtered to only include items after this timestamp
    /// * `[limit]` {int} - limits the number of items in the response
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


    /// Returns a list of [position structures](https://docs.ccxt.com/?id=position-structure)
    ///
    /// Fetches the history of margin added or reduced from contract isolated positions
    ///
    /// # Arguments
    ///
    /// * `[symbol]` {string} - unified market symbol
    /// * `[since]` {int} - timestamp in ms of the position
    /// * `[limit]` {int} - the maximum amount of candles to fetch, default=1000
    /// * `params` {object} - extra parameters specific to the exchange api endpoint
    async fn fetch_position_history(&mut self, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    async fn load_markets_and_sign_in(&mut self) -> Value { Value::Undefined }


    /// Returns a list of [position structures](https://docs.ccxt.com/?id=position-structure)
    ///
    /// Fetches the history of margin added or reduced from contract isolated positions
    ///
    /// # Arguments
    ///
    /// * `[symbol]` {string} - unified market symbol
    /// * `[since]` {int} - timestamp in ms of the position
    /// * `[limit]` {int} - the maximum amount of candles to fetch, default=1000
    /// * `params` {object} - extra parameters specific to the exchange api endpoint
    async fn fetch_positions_history(&mut self, mut symbols: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    fn parse_margin_modification(&self, mut data: Value, mut market: Value) -> Value { Value::Undefined }


    fn parse_margin_modifications(&self, mut response: Value, mut symbols: Value, mut symbol_key: Value, mut market_type: Value) -> Value { Value::Undefined }


    /// Returns a [transfer structure](https://docs.ccxt.com/?id=transfer-structure)
    ///
    /// Fetches a transfer
    ///
    /// # Arguments
    ///
    /// * `id` {string} - transfer id
    /// * `code` {[string]} - unified currency code
    /// * `params` {object} - extra parameters specific to the exchange api endpoint
    async fn fetch_transfer(&mut self, mut id: Value, mut code: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a [transfer structure](https://docs.ccxt.com/?id=transfer-structure)
    ///
    /// Fetches a transfer
    ///
    /// # Arguments
    ///
    /// * `id` {string} - transfer id
    /// * `[since]` {int} - timestamp in ms of the earliest transfer to fetch
    /// * `[limit]` {int} - the maximum amount of transfers to fetch
    /// * `params` {object} - extra parameters specific to the exchange api endpoint
    async fn fetch_transfers(&mut self, mut code: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a list of candles ordered as timestamp, open, high, low, close, volume
    ///
    /// Watches historical candlestick data containing the open, high, low, and close price, and the volume of a market
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to fetch OHLCV data for
    /// * `timeframe` {string} - the length of time each candle represents
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn un_watch_ohlcv(&mut self, mut symbol: Value, mut timeframe: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a [ticker structure](https://docs.ccxt.com/?id=ticker-structure)
    ///
    /// Watches a mark price for a specific market
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to fetch the ticker for
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn watch_mark_price(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a [ticker structure](https://docs.ccxt.com/?id=ticker-structure)
    ///
    /// Watches the mark price for all markets
    ///
    /// # Arguments
    ///
    /// * `symbols` {string[]} - unified symbol of the market to fetch the ticker for
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn watch_mark_prices(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a [transaction structure](https://docs.ccxt.com/?id=transaction-structure)
    ///
    /// Make a withdrawal
    ///
    /// # Arguments
    ///
    /// * `code` {string} - unified currency code
    /// * `amount` {float} - the amount to withdraw
    /// * `address` {string} - the address to withdraw to
    /// * `tag` {string} - 
    /// * `[params]` {object} - extra parameters specific to the bitvavo api endpoint
    async fn withdraw_ws(&mut self, mut code: Value, mut amount: Value, mut address: Value, mut tag: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a list of [order structures](https://docs.ccxt.com/?id=order-structure)
    ///
    /// UnWatches information on multiple trades made by the user
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified market symbol of the market orders were made in
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn un_watch_my_trades(&mut self, mut symbol: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns an [order structure](https://docs.ccxt.com/?id=order-structure)
    ///
    /// Create a list of trade orders
    ///
    /// # Arguments
    ///
    /// * `orders` {Array} - list of orders to create, each object should contain the parameters required by createOrder, namely symbol, type, side, amount, price and params
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn create_orders_ws(&mut self, mut orders: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a dictionary of [order book structures](https://docs.ccxt.com/?id=order-book-structure) indexed by market symbols
    ///
    /// Watches information on open orders with bid (buy) and ask (sell) prices, volumes and other data
    ///
    /// # Arguments
    ///
    /// * `symbol` {string} - unified symbol of the market to fetch the order book for
    /// * `[limit]` {int} - the maximum amount of order book entries to return
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn fetch_orders_by_status_ws(&mut self, mut status: Value, mut symbol: Value, mut since: Value, mut limit: Value, mut params: Value) -> Value { Value::Undefined }


    /// Returns a [ticker structure](https://docs.ccxt.com/?id=ticker-structure)
    ///
    /// UnWatches best bid & ask for symbols
    ///
    /// # Arguments
    ///
    /// * `symbols` {string[]} - unified symbol of the market to fetch the ticker for
    /// * `[params]` {object} - extra parameters specific to the exchange API endpoint
    async fn un_watch_bids_asks(&mut self, mut symbols: Value, mut params: Value) -> Value { Value::Undefined }


    fn clean_unsubscription(&mut self, mut client: Value, mut sub_hash: Value, mut unsub_hash: Value, mut sub_hash_is_prefix: Value) -> Value { Value::Undefined }


    fn clean_cache(&mut self, mut subscription: Value) -> Value { Value::Undefined }


    fn timeframe_from_milliseconds(&mut self, mut ms: Value) -> Value { Value::Undefined }


// END TRANSPILED METHODS
}
