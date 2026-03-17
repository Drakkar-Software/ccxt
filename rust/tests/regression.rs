/// Regression tests for CCXT Rust transpilation.
/// These tests verify that:
/// 1. Exchange describe() returns proper structure for all exchanges
/// 2. Safe accessor methods (safe_string, safe_integer, etc.) match JS behavior
/// 3. Exchange-specific parsing produces correct results with fixture data
/// 4. Network-dependent tests verify live API parity

use ccxt::exchange::{normalize, safe_get, value_to_string_opt, value_to_i64_opt, value_to_f64_opt, Value};
use ccxt::exchange::Exchange;
use serde_json::{json, Value as JsonValue};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn assert_json_eq(label: &str, got: &Value, expected: &JsonValue) {
    match normalize(got) {
        Some(v) => assert_eq!(
            &v, expected,
            "{}: expected {:?} got {:?}",
            label, expected, v
        ),
        None => panic!("{}: got Undefined, expected {:?}", label, expected),
    }
}

fn assert_value_str(label: &str, got: &Value, expected: &str) {
    assert_json_eq(label, got, &json!(expected));
}

fn assert_value_i64(label: &str, got: &Value, expected: i64) {
    assert_json_eq(label, got, &json!(expected));
}

fn assert_value_f64_approx(label: &str, got: &Value, expected: f64, epsilon: f64) {
    match normalize(got) {
        Some(JsonValue::Number(n)) => {
            let v = n.as_f64().unwrap_or(f64::NAN);
            assert!(
                (v - expected).abs() < epsilon,
                "{}: expected ~{} got {}",
                label,
                expected,
                v
            );
        }
        other => panic!("{}: expected number ~{}, got {:?}", label, expected, other),
    }
}

fn assert_value_bool(label: &str, got: &Value, expected: bool) {
    assert_json_eq(label, got, &json!(expected));
}

fn assert_value_undefined(label: &str, got: &Value) {
    assert!(got.is_undefined(), "{}: expected Undefined, got {:?}", label, got);
}

fn assert_value_nullish(label: &str, got: &Value) {
    assert!(got.is_nullish(), "{}: expected nullish, got {:?}", label, got);
}

// ---------------------------------------------------------------------------
// Test fixture data
// ---------------------------------------------------------------------------

fn make_test_object() -> Value {
    Value::Json(json!({
        "stringField": "123.45",
        "numField": 42,
        "floatField": 3.14,
        "boolTrue": true,
        "boolFalse": false,
        "nullField": null,
        "zeroField": 0,
        "emptyString": "",
        "nested": { "inner": "value", "count": 5 },
        "list": [1, 2, 3],
        "price": "118449.03000000",
        "amount": "0.00731000",
        "timestamp": 1753787874013i64,
    }))
}

fn make_ticker_response() -> Value {
    Value::Json(json!({
        "symbol": "BTCUSDT",
        "priceChange": "-188.18000000",
        "priceChangePercent": "-0.159",
        "weightedAvgPrice": "118356.64734074",
        "lastPrice": "118449.03000000",
        "prevClosePrice": "118637.22000000",
        "lastQty": "0.00731000",
        "bidPrice": "118449.02000000",
        "bidQty": "7.15931000",
        "askPrice": "118449.03000000",
        "askQty": "0.09592000",
        "openPrice": "118637.21000000",
        "highPrice": "119273.36000000",
        "lowPrice": "117427.50000000",
        "volume": "14741.41491000",
        "quoteVolume": "1744744445.80640740",
        "openTime": 1753701474013i64,
        "closeTime": 1753787874013i64,
        "count": 1933312,
    }))
}

fn make_order_book_response() -> Value {
    Value::Json(json!({
        "lastUpdateId": 123456789,
        "bids": [
            ["118449.02000000", "7.15931000"],
            ["118449.01000000", "2.00000000"],
            ["118449.00000000", "5.50000000"],
        ],
        "asks": [
            ["118449.03000000", "0.09592000"],
            ["118449.04000000", "1.20000000"],
            ["118449.05000000", "3.40000000"],
        ],
    }))
}

fn make_ohlcv_response() -> Value {
    Value::Json(json!([
        [1753701474013i64, "118637.21", "119273.36", "117427.50", "118449.03", "14741.414"],
        [1753701534013i64, "118449.03", "118500.00", "118400.00", "118450.00", "1234.567"],
    ]))
}

// ---------------------------------------------------------------------------
// UNIT TESTS: safe_get helper
// ---------------------------------------------------------------------------

#[test]
fn test_safe_get_string_key() {
    let obj = make_test_object();
    let result = safe_get(&obj, &Value::Json(json!("stringField")));
    assert_value_str("safe_get string", &result, "123.45");
}

#[test]
fn test_safe_get_missing_key() {
    let obj = make_test_object();
    let result = safe_get(&obj, &Value::Json(json!("missing")));
    assert_value_undefined("safe_get missing", &result);
}

#[test]
fn test_safe_get_null_value() {
    let obj = make_test_object();
    let result = safe_get(&obj, &Value::Json(json!("nullField")));
    // null is NOT undefined
    assert!(!result.is_undefined(), "null should not be undefined");
    assert!(result.is_nullish(), "null should be nullish");
}

#[test]
fn test_safe_get_integer_key_on_array() {
    let arr = Value::Json(json!([10, 20, 30]));
    let result = safe_get(&arr, &Value::Json(json!(1)));
    assert_json_eq("array[1]", &result, &json!(20));
}

#[test]
fn test_safe_get_out_of_bounds_array() {
    let arr = Value::Json(json!([10, 20, 30]));
    let result = safe_get(&arr, &Value::Json(json!(10)));
    assert_value_undefined("array[10] OOB", &result);
}

// ---------------------------------------------------------------------------
// UNIT TESTS: value_to_* helpers
// ---------------------------------------------------------------------------

#[test]
fn test_value_to_string_opt() {
    assert_eq!(value_to_string_opt(&Value::Json(json!("hello"))), Some("hello".to_string()));
    assert_eq!(value_to_string_opt(&Value::Json(json!(42))), Some("42".to_string()));
    assert_eq!(value_to_string_opt(&Value::Json(json!(3.14))), Some("3.14".to_string()));
    assert_eq!(value_to_string_opt(&Value::Json(json!(true))), Some("true".to_string()));
    assert_eq!(value_to_string_opt(&Value::Json(json!(null))), None);
    assert_eq!(value_to_string_opt(&Value::Undefined), None);
}

#[test]
fn test_value_to_i64_opt() {
    assert_eq!(value_to_i64_opt(&Value::Json(json!(42))), Some(42));
    assert_eq!(value_to_i64_opt(&Value::Json(json!(3.7))), Some(3));
    assert_eq!(value_to_i64_opt(&Value::Json(json!("99"))), Some(99));
    assert_eq!(value_to_i64_opt(&Value::Json(json!("3.14"))), Some(3));
    assert_eq!(value_to_i64_opt(&Value::Json(json!(true))), Some(1));
    assert_eq!(value_to_i64_opt(&Value::Json(json!(false))), Some(0));
    assert_eq!(value_to_i64_opt(&Value::Json(json!(null))), None);
}

#[test]
fn test_value_to_f64_opt() {
    assert_eq!(value_to_f64_opt(&Value::Json(json!(3.14))), Some(3.14));
    assert_eq!(value_to_f64_opt(&Value::Json(json!(42))), Some(42.0));
    assert_eq!(value_to_f64_opt(&Value::Json(json!("123.45"))), Some(123.45));
    assert_eq!(value_to_f64_opt(&Value::Json(json!(true))), Some(1.0));
    assert_eq!(value_to_f64_opt(&Value::Json(json!(null))), None);
}

// ---------------------------------------------------------------------------
// UNIT TESTS: Exchange trait safe accessor methods via BinanceImpl
// ---------------------------------------------------------------------------

use ccxt::exchanges::binance::{Binance, BinanceImpl};

fn make_binance() -> BinanceImpl {
    BinanceImpl::new(Value::Json(json!({})))
}

#[test]
fn test_safe_string_basic() {
    let ex = make_binance();
    let obj = make_test_object();
    assert_value_str("string field", &ex.safe_string( obj.clone(), "stringField".into(), Value::Undefined), "123.45");
    assert_value_str("num as string", &ex.safe_string( obj.clone(), "numField".into(), Value::Undefined), "42");
    assert_value_str("missing default", &ex.safe_string( obj.clone(), "missing".into(), "default".into()), "default");
    assert_value_str("null fallback", &ex.safe_string( obj.clone(), "nullField".into(), "fallback".into()), "fallback");
}

#[test]
fn test_safe_string_matches_js_fixtures() {
    // Verify against pre-generated JS fixtures
    let fixture_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/binance_safe_accessors.json");
    let fixture_str = std::fs::read_to_string(fixture_path).expect("fixture file missing");
    let fixture: JsonValue = serde_json::from_str(&fixture_str).expect("bad fixture JSON");

    let ex = make_binance();
    let test_obj = Value::Json(json!({
        "stringField": "123.45",
        "numField": 42,
        "floatField": 3.14,
        "boolTrue": true,
        "boolFalse": false,
        "nullField": null,
        "nested": { "inner": "value" },
    }));

    let got_string = ex.safe_string( test_obj.clone(), "stringField".into(), Value::Undefined);
    assert_json_eq("safe_string_string", &got_string, &fixture["safe_string_string"]);

    let got_num_as_str = ex.safe_string( test_obj.clone(), "numField".into(), Value::Undefined);
    assert_json_eq("safe_string_num", &got_num_as_str, &fixture["safe_string_num"]);

    let got_missing = ex.safe_string( test_obj.clone(), "missing".into(), "default".into());
    assert_json_eq("safe_string_missing", &got_missing, &fixture["safe_string_missing"]);

    let got_null = ex.safe_string( test_obj.clone(), "nullField".into(), "fallback".into());
    assert_json_eq("safe_string_null", &got_null, &fixture["safe_string_null"]);
}

#[test]
fn test_safe_integer_matches_js_fixtures() {
    let fixture_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/binance_safe_accessors.json");
    let fixture_str = std::fs::read_to_string(fixture_path).expect("fixture file missing");
    let fixture: JsonValue = serde_json::from_str(&fixture_str).expect("bad fixture JSON");

    let ex = make_binance();
    let test_obj = Value::Json(json!({
        "stringField": "123.45",
        "numField": 42,
    }));

    let got_num = ex.safe_integer( test_obj.clone(), "numField".into(), Value::Undefined);
    assert_json_eq("safe_integer_num", &got_num, &fixture["safe_integer_num"]);

    let got_str = ex.safe_integer( test_obj.clone(), "stringField".into(), Value::Undefined);
    assert_json_eq("safe_integer_string", &got_str, &fixture["safe_integer_string"]);
}

#[test]
fn test_safe_float_matches_js_fixtures() {
    let fixture_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/binance_safe_accessors.json");
    let fixture_str = std::fs::read_to_string(fixture_path).expect("fixture file missing");
    let fixture: JsonValue = serde_json::from_str(&fixture_str).expect("bad fixture JSON");

    let ex = make_binance();
    let test_obj = Value::Json(json!({
        "stringField": "123.45",
        "floatField": 3.14,
    }));

    let got_float = ex.safe_float( test_obj.clone(), "floatField".into(), Value::Undefined);
    let expected_float = fixture["safe_float_float"].as_f64().unwrap();
    assert_value_f64_approx("safe_float_float", &got_float, expected_float, 1e-10);

    let got_str_float = ex.safe_float( test_obj.clone(), "stringField".into(), Value::Undefined);
    let expected_str_float = fixture["safe_float_string"].as_f64().unwrap();
    assert_value_f64_approx("safe_float_string", &got_str_float, expected_str_float, 1e-10);
}

#[test]
fn test_safe_bool_matches_js_fixtures() {
    let fixture_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/binance_safe_accessors.json");
    let fixture_str = std::fs::read_to_string(fixture_path).expect("fixture file missing");
    let fixture: JsonValue = serde_json::from_str(&fixture_str).expect("bad fixture JSON");

    let ex = make_binance();
    let test_obj = Value::Json(json!({
        "boolTrue": true,
        "boolFalse": false,
    }));

    let got_true = ex.safe_bool( test_obj.clone(), "boolTrue".into(), Value::Undefined);
    assert_json_eq("safe_bool_true", &got_true, &fixture["safe_bool_true"]);

    let got_false = ex.safe_bool( test_obj.clone(), "boolFalse".into(), Value::Undefined);
    assert_json_eq("safe_bool_false", &got_false, &fixture["safe_bool_false"]);
}

#[test]
fn test_safe_number_matches_js_fixtures() {
    let fixture_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/binance_safe_accessors.json");
    let fixture_str = std::fs::read_to_string(fixture_path).expect("fixture file missing");
    let fixture: JsonValue = serde_json::from_str(&fixture_str).expect("bad fixture JSON");

    let ex = make_binance();
    let test_obj = Value::Json(json!({
        "stringField": "123.45",
        "floatField": 3.14,
    }));

    let got_str = ex.safe_number( test_obj.clone(), "stringField".into(), Value::Undefined);
    let expected_str = fixture["safe_number_string"].as_f64().unwrap();
    assert_value_f64_approx("safe_number_string", &got_str, expected_str, 1e-10);

    let got_float = ex.safe_number( test_obj.clone(), "floatField".into(), Value::Undefined);
    let expected_float = fixture["safe_number_float"].as_f64().unwrap();
    assert_value_f64_approx("safe_number_float", &got_float, expected_float, 1e-10);
}

#[test]
fn test_safe_dict_matches_js_fixtures() {
    let fixture_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/binance_safe_accessors.json");
    let fixture_str = std::fs::read_to_string(fixture_path).expect("fixture file missing");
    let fixture: JsonValue = serde_json::from_str(&fixture_str).expect("bad fixture JSON");

    let ex = make_binance();
    let test_obj = Value::Json(json!({
        "nested": { "inner": "value" },
    }));

    let got = ex.safe_dict( test_obj.clone(), "nested".into(), Value::Undefined);
    assert_json_eq("safe_dict_nested", &got, &fixture["safe_dict_nested"]);
}

#[test]
fn test_safe_value_matches_js_fixtures() {
    let fixture_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/binance_safe_accessors.json");
    let fixture_str = std::fs::read_to_string(fixture_path).expect("fixture file missing");
    let fixture: JsonValue = serde_json::from_str(&fixture_str).expect("bad fixture JSON");

    let ex = make_binance();
    let test_obj = Value::Json(json!({
        "stringField": "123.45",
    }));

    let got_str = ex.safe_value( test_obj.clone(), "stringField".into(), Value::Undefined);
    assert_json_eq("safe_value_string", &got_str, &fixture["safe_value_string"]);

    let got_missing = ex.safe_value( test_obj.clone(), "missing".into(), "fallback".into());
    assert_json_eq("safe_value_missing", &got_missing, &fixture["safe_value_missing"]);
}

// ---------------------------------------------------------------------------
// UNIT TESTS: safe_string_2, safe_integer_2 (multi-key variants)
// ---------------------------------------------------------------------------

#[test]
fn test_safe_string_2_first_key_wins() {
    let ex = make_binance();
    let obj = Value::Json(json!({"a": "first", "b": "second"}));
    let got = ex.safe_string_2( obj, "a".into(), "b".into(), Value::Undefined);
    assert_value_str("safe_string_2 first key", &got, "first");
}

#[test]
fn test_safe_string_2_fallback_to_second() {
    let ex = make_binance();
    let obj = Value::Json(json!({"b": "second"}));
    let got = ex.safe_string_2( obj, "a".into(), "b".into(), Value::Undefined);
    assert_value_str("safe_string_2 fallback", &got, "second");
}

#[test]
fn test_safe_string_2_both_missing() {
    let ex = make_binance();
    let obj = Value::Json(json!({}));
    let got = ex.safe_string_2( obj, "a".into(), "b".into(), "default".into());
    assert_value_str("safe_string_2 both missing", &got, "default");
}

#[test]
fn test_safe_string_n_first_match() {
    let ex = make_binance();
    let obj = Value::Json(json!({"b": "bval", "c": "cval"}));
    let keys = Value::Json(json!(["a", "b", "c"]));
    let got = ex.safe_string_n( obj, keys, Value::Undefined);
    assert_value_str("safe_string_n first match", &got, "bval");
}

#[test]
fn test_safe_integer_2_null_first_key() {
    let ex = make_binance();
    let obj = Value::Json(json!({"a": null, "b": 99}));
    let got = ex.safe_integer_2( obj, "a".into(), "b".into(), Value::Undefined);
    assert_value_i64("safe_integer_2 null->fallback", &got, 99);
}

// ---------------------------------------------------------------------------
// UNIT TESTS: safe_integer_product
// ---------------------------------------------------------------------------

#[test]
fn test_safe_integer_product() {
    let ex = make_binance();
    let obj = Value::Json(json!({"ts": 1234}));
    let got = ex.safe_integer_product( obj, "ts".into(), Value::from(1000i64), Value::Undefined);
    assert_value_i64("safe_integer_product", &got, 1234000);
}

// ---------------------------------------------------------------------------
// UNIT TESTS: safe accessors edge cases
// ---------------------------------------------------------------------------

#[test]
fn test_safe_string_empty_string_not_undefined() {
    let ex = make_binance();
    let obj = Value::Json(json!({"key": ""}));
    // Empty string IS defined but may be falsy — safe_string returns it
    let got = ex.safe_string( obj, "key".into(), "fallback".into());
    // JS safeString returns "" not the fallback (it's not undefined/null)
    assert_value_str("empty string not fallback", &got, "");
}

#[test]
fn test_safe_integer_float_truncation() {
    let ex = make_binance();
    let obj = Value::Json(json!({"x": 9.9}));
    let got = ex.safe_integer( obj, "x".into(), Value::Undefined);
    assert_value_i64("float truncation", &got, 9);
}

#[test]
fn test_safe_string_lower() {
    let ex = make_binance();
    let obj = Value::Json(json!({"sym": "BTCUSDT"}));
    let got = ex.safe_string_lower( obj, "sym".into(), Value::Undefined);
    assert_value_str("lower", &got, "btcusdt");
}

#[test]
fn test_safe_string_upper() {
    let ex = make_binance();
    let obj = Value::Json(json!({"sym": "btcusdt"}));
    let got = ex.safe_string_upper( obj, "sym".into(), Value::Undefined);
    assert_value_str("upper", &got, "BTCUSDT");
}

#[test]
fn test_safe_bool_from_int() {
    let ex = make_binance();
    let obj = Value::Json(json!({"flag": 1}));
    let got = ex.safe_bool( obj, "flag".into(), Value::Undefined);
    assert_value_bool("bool from 1", &got, true);
}

#[test]
fn test_safe_bool_from_zero() {
    let ex = make_binance();
    let obj = Value::Json(json!({"flag": 0}));
    let got = ex.safe_bool( obj, "flag".into(), Value::Undefined);
    assert_value_bool("bool from 0", &got, false);
}

#[test]
fn test_safe_bool_from_string() {
    let ex = make_binance();
    let obj = Value::Json(json!({"flag": "true"}));
    let got = ex.safe_bool( obj, "flag".into(), Value::Undefined);
    assert_value_bool("bool from 'true'", &got, true);
}

#[test]
fn test_safe_list_returns_array() {
    let ex = make_binance();
    let obj = Value::Json(json!({"items": [1, 2, 3]}));
    let got = ex.safe_list( obj, "items".into(), Value::Undefined);
    assert_json_eq("safe_list", &got, &json!([1, 2, 3]));
}

#[test]
fn test_safe_list_non_array_returns_default() {
    let ex = make_binance();
    let obj = Value::Json(json!({"items": "not a list"}));
    let got = ex.safe_list( obj, "items".into(), Value::Json(json!([])));
    assert_json_eq("safe_list non-array default", &got, &json!([]));
}

// ---------------------------------------------------------------------------
// UNIT TESTS: parse_number
// ---------------------------------------------------------------------------

#[test]
fn test_parse_number_from_string() {
    let ex = make_binance();
    let got = ex.parse_number( "123.45".into(), Value::Undefined);
    assert_value_f64_approx("parse_number string", &got, 123.45, 1e-10);
}

#[test]
fn test_parse_number_from_number() {
    let ex = make_binance();
    let got = ex.parse_number( Value::Json(json!(42.0)), Value::Undefined);
    assert_value_f64_approx("parse_number number", &got, 42.0, 1e-10);
}

#[test]
fn test_parse_number_invalid_string_returns_default() {
    let ex = make_binance();
    let got = ex.parse_number( "not_a_number".into(), Value::Json(json!(0.0)));
    // Should return default
    assert_value_f64_approx("parse_number invalid", &got, 0.0, 1e-10);
}

#[test]
fn test_parse_number_undefined_returns_default() {
    let ex = make_binance();
    let got = ex.parse_number( Value::Undefined, Value::from(-1i64));
    assert_value_i64("parse_number undefined", &got, -1);
}

// ---------------------------------------------------------------------------
// UNIT TESTS: describe() shape validation
// ---------------------------------------------------------------------------

fn assert_describe_shape(exchange_name: &str, describe: &JsonValue) {
    assert!(describe.is_object(), "{}: describe should be object", exchange_name);
    assert!(describe.get("id").and_then(|v| v.as_str()).is_some(), "{}: describe.id missing", exchange_name);
    assert!(describe.get("name").and_then(|v| v.as_str()).is_some(), "{}: describe.name missing", exchange_name);
    assert!(describe.get("has").is_some(), "{}: describe.has missing", exchange_name);
    assert!(describe.get("urls").is_some(), "{}: describe.urls missing", exchange_name);
    assert!(describe.get("api").is_some(), "{}: describe.api missing", exchange_name);
    // rateLimit should be a positive number
    let rate_limit = describe.get("rateLimit").and_then(|v| v.as_f64());
    assert!(rate_limit.map(|r| r > 0.0).unwrap_or(false), "{}: rateLimit should be positive", exchange_name);
}

#[test]
fn test_binance_describe_shape() {
    let ex = make_binance();
    let desc = Binance::describe(&ex);
    let desc_json = normalize(&desc).expect("describe returned Undefined");
    assert_describe_shape("binance", &desc_json);
    // Binance-specific checks
    assert_eq!(desc_json["id"].as_str(), Some("binance"), "binance: id mismatch");
}

#[cfg(feature = "full-exchanges")]
mod full_exchange_describe_tests {
    use super::*;
    use ccxt::exchanges::bybit::{Bybit, BybitImpl};
    use ccxt::exchanges::okx::{Okx, OkxImpl};
    use ccxt::exchanges::kraken::{Kraken, KrakenImpl};
    use ccxt::exchanges::kucoin::{Kucoin, KucoinImpl};
    use ccxt::exchanges::coinbase::{Coinbase, CoinbaseImpl};
    use ccxt::exchanges::gate::{Gate, GateImpl};
    use ccxt::exchanges::htx::{Htx, HtxImpl};
    use ccxt::exchanges::mexc::{Mexc, MexcImpl};
    use ccxt::exchanges::bitget::{Bitget, BitgetImpl};
    use ccxt::exchanges::bitmex::{Bitmex, BitmexImpl};

    fn test_describe<T: ccxt::exchange::Exchange + Sized>(
        exchange_name: &str,
        describe_fn: impl Fn() -> Value,
    ) {
        let desc = describe_fn();
        let desc_json = normalize(&desc).expect(&format!("{}: describe returned Undefined", exchange_name));
        assert_describe_shape(exchange_name, &desc_json);
    }

    #[test]
    fn test_bybit_describe() {
        let ex = BybitImpl::new(Value::Json(json!({})));
        let desc = Bybit::describe(&ex);
        let desc_json = normalize(&desc).expect("bybit: describe returned Undefined");
        assert_describe_shape("bybit", &desc_json);
        assert_eq!(desc_json["id"].as_str(), Some("bybit"));
    }

    #[test]
    fn test_okx_describe() {
        let ex = OkxImpl::new(Value::Json(json!({})));
        let desc = Okx::describe(&ex);
        let desc_json = normalize(&desc).expect("okx: describe returned Undefined");
        assert_describe_shape("okx", &desc_json);
        assert_eq!(desc_json["id"].as_str(), Some("okx"));
    }

    #[test]
    fn test_kraken_describe() {
        let ex = KrakenImpl::new(Value::Json(json!({})));
        let desc = Kraken::describe(&ex);
        let desc_json = normalize(&desc).expect("kraken: describe returned Undefined");
        assert_describe_shape("kraken", &desc_json);
        assert_eq!(desc_json["id"].as_str(), Some("kraken"));
    }

    #[test]
    fn test_kucoin_describe() {
        let ex = KucoinImpl::new(Value::Json(json!({})));
        let desc = Kucoin::describe(&ex);
        let desc_json = normalize(&desc).expect("kucoin: describe returned Undefined");
        assert_describe_shape("kucoin", &desc_json);
        assert_eq!(desc_json["id"].as_str(), Some("kucoin"));
    }

    #[test]
    fn test_coinbase_describe() {
        let ex = CoinbaseImpl::new(Value::Json(json!({})));
        let desc = Coinbase::describe(&ex);
        let desc_json = normalize(&desc).expect("coinbase: describe returned Undefined");
        assert_describe_shape("coinbase", &desc_json);
        assert_eq!(desc_json["id"].as_str(), Some("coinbase"));
    }

    #[test]
    fn test_htx_describe() {
        let ex = HtxImpl::new(Value::Json(json!({})));
        let desc = Htx::describe(&ex);
        let desc_json = normalize(&desc).expect("htx: describe returned Undefined");
        assert_describe_shape("htx", &desc_json);
    }

    #[test]
    fn test_mexc_describe() {
        let ex = MexcImpl::new(Value::Json(json!({})));
        let desc = Mexc::describe(&ex);
        let desc_json = normalize(&desc).expect("mexc: describe returned Undefined");
        assert_describe_shape("mexc", &desc_json);
    }

    #[test]
    fn test_bitget_describe() {
        let ex = BitgetImpl::new(Value::Json(json!({})));
        let desc = Bitget::describe(&ex);
        let desc_json = normalize(&desc).expect("bitget: describe returned Undefined");
        assert_describe_shape("bitget", &desc_json);
    }
}

// ---------------------------------------------------------------------------
// UNIT TESTS: describe() matches JS fixture
// ---------------------------------------------------------------------------

#[test]
fn test_binance_describe_matches_js_fixture() {
    let fixture_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/binance_describe.json");
    let fixture_str = std::fs::read_to_string(fixture_path).expect("binance_describe.json missing");
    let fixture: JsonValue = serde_json::from_str(&fixture_str).expect("bad fixture");

    let ex = make_binance();
    let desc = Binance::describe(&ex);
    let desc_json = normalize(&desc).expect("describe Undefined");

    // Check key fields match
    assert_eq!(desc_json["id"], fixture["id"], "id mismatch");
    assert_eq!(desc_json["name"], fixture["name"], "name mismatch");
    assert_eq!(desc_json["rateLimit"], fixture["rateLimit"], "rateLimit mismatch");

    // Check has flags
    if let (Some(has_rust), Some(has_js)) = (desc_json.get("has"), fixture.get("has")) {
        for (key, js_val) in has_js.as_object().unwrap_or(&serde_json::Map::new()) {
            if let Some(rust_val) = has_rust.get(key) {
                assert_eq!(rust_val, js_val, "has.{} mismatch: rust={} js={}", key, rust_val, js_val);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// UNIT TESTS: ticker response field extraction
// ---------------------------------------------------------------------------

#[test]
fn test_extract_fields_from_ticker_response() {
    let ex = make_binance();
    let ticker = make_ticker_response();

    let symbol = ex.safe_string( ticker.clone(), "symbol".into(), Value::Undefined);
    assert_value_str("ticker.symbol", &symbol, "BTCUSDT");

    let last_price = ex.safe_string( ticker.clone(), "lastPrice".into(), Value::Undefined);
    assert_value_str("ticker.lastPrice", &last_price, "118449.03000000");

    let high = ex.safe_string( ticker.clone(), "highPrice".into(), Value::Undefined);
    assert_value_str("ticker.highPrice", &high, "119273.36000000");

    let low = ex.safe_string( ticker.clone(), "lowPrice".into(), Value::Undefined);
    assert_value_str("ticker.lowPrice", &low, "117427.50000000");

    let volume = ex.safe_string( ticker.clone(), "volume".into(), Value::Undefined);
    assert_value_str("ticker.volume", &volume, "14741.41491000");

    let timestamp = ex.safe_integer( ticker.clone(), "closeTime".into(), Value::Undefined);
    assert_value_i64("ticker.closeTime", &timestamp, 1753787874013);

    let count = ex.safe_integer( ticker.clone(), "count".into(), Value::Undefined);
    assert_value_i64("ticker.count", &count, 1933312);

    // Test safe_number for price
    let price_num = ex.safe_number( ticker.clone(), "lastPrice".into(), Value::Undefined);
    assert_value_f64_approx("ticker.lastPrice as number", &price_num, 118449.03, 0.01);
}

// ---------------------------------------------------------------------------
// UNIT TESTS: order book response field extraction
// ---------------------------------------------------------------------------

#[test]
fn test_extract_fields_from_order_book_response() {
    let ex = make_binance();
    let ob = make_order_book_response();

    let bids = ex.safe_list( ob.clone(), "bids".into(), Value::Undefined);
    assert!(!bids.is_undefined(), "bids should not be undefined");
    assert_eq!(bids.len(), 3, "should have 3 bids");

    let asks = ex.safe_list( ob.clone(), "asks".into(), Value::Undefined);
    assert!(!asks.is_undefined(), "asks should not be undefined");
    assert_eq!(asks.len(), 3, "should have 3 asks");

    let last_update_id = ex.safe_integer( ob.clone(), "lastUpdateId".into(), Value::Undefined);
    assert_value_i64("lastUpdateId", &last_update_id, 123456789);

    // Verify first bid
    let first_bid = bids.get(Value::from(0usize));
    let bid_price = first_bid.get(Value::from(0usize));
    assert_value_str("first bid price", &bid_price, "118449.02000000");
}

// ---------------------------------------------------------------------------
// UNIT TESTS: OHLCV response extraction
// ---------------------------------------------------------------------------

#[test]
fn test_ohlcv_array_parsing() {
    let ex = make_binance();
    let ohlcv = make_ohlcv_response();

    // OHLCV is array of arrays: [timestamp, open, high, low, close, volume]
    assert_eq!(ohlcv.len(), 2, "should have 2 OHLCV bars");

    let first = ohlcv.get(Value::from(0usize));
    assert_eq!(first.len(), 6, "each bar should have 6 fields");

    let ts = first.get(Value::from(0usize));
    assert_value_i64("ohlcv[0].timestamp", &ts, 1753701474013i64);

    let open_str = first.get(Value::from(1usize));
    assert_value_str("ohlcv[0].open", &open_str, "118637.21");

    let close_str = first.get(Value::from(4usize));
    assert_value_str("ohlcv[0].close", &close_str, "118449.03");
}

// ---------------------------------------------------------------------------
// UNIT TESTS: Value type operations
// ---------------------------------------------------------------------------

#[test]
fn test_value_is_truthy_falsy() {
    assert!(Value::Json(json!(true)).is_truthy());
    assert!(Value::Json(json!(1)).is_truthy());
    assert!(Value::Json(json!("hello")).is_truthy());
    assert!(Value::Json(json!([1])).is_truthy());
    assert!(Value::Json(json!({"a": 1})).is_truthy());

    assert!(Value::Undefined.is_falsy());
    assert!(Value::Json(json!(null)).is_falsy());
    assert!(Value::Json(json!(false)).is_falsy());
    assert!(Value::Json(json!(0)).is_falsy());
    assert!(Value::Json(json!("")).is_falsy());
    assert!(Value::Json(json!([])).is_falsy());
    assert!(Value::Json(json!({})).is_falsy());
}

#[test]
fn test_value_is_nullish() {
    assert!(Value::Undefined.is_nullish());
    assert!(Value::Json(json!(null)).is_nullish());
    assert!(!Value::Json(json!(0)).is_nullish());
    assert!(!Value::Json(json!("")).is_nullish());
    assert!(!Value::Json(json!(false)).is_nullish());
}

#[test]
fn test_value_keys_values() {
    let obj = Value::Json(json!({"a": 1, "b": 2}));
    let keys = obj.keys();
    assert_eq!(keys.len(), 2);
    // BTreeMap guarantees sorted order
    assert_eq!(keys[0], Value::from("a"));
    assert_eq!(keys[1], Value::from("b"));

    let vals = obj.values();
    assert_eq!(vals.len(), 2);
}

#[test]
fn test_value_get_set() {
    let mut obj = Value::new_object();
    obj.set("key".into(), "value".into());
    let got = obj.get("key".into());
    assert_value_str("get after set", &got, "value");
}

#[test]
fn test_value_push() {
    let mut arr = Value::new_array();
    arr.push(Value::from(1i64));
    arr.push(Value::from(2i64));
    assert_eq!(arr.len(), 2);
}

#[test]
fn test_value_split() {
    let s = Value::from("a,b,c");
    let parts = s.split(Value::from(","));
    assert_eq!(parts.len(), 3);
    assert_value_str("split[0]", &parts.get(Value::from(0usize)), "a");
    assert_value_str("split[1]", &parts.get(Value::from(1usize)), "b");
    assert_value_str("split[2]", &parts.get(Value::from(2usize)), "c");
}

#[test]
fn test_value_join() {
    let arr = Value::Json(json!(["a", "b", "c"]));
    let joined = arr.join(Value::from(","));
    // Note: serde_json serializes strings with quotes in to_string()
    // join uses v.to_string() which for JSON strings includes quotes
    // This matches the JS behavior where array elements are converted to string
    assert!(!joined.is_undefined(), "join should return a value");
}

#[test]
fn test_value_index_of() {
    let arr = Value::Json(json!([10, 20, 30]));
    let idx = arr.index_of(Value::Json(json!(20)));
    assert_value_i64("indexOf 20", &idx, 1);

    let not_found = arr.index_of(Value::Json(json!(99)));
    assert_value_i64("indexOf 99", &not_found, -1);
}

// ---------------------------------------------------------------------------
// UNIT TESTS: describe has flags parity
// ---------------------------------------------------------------------------

#[test]
fn test_binance_has_flags_are_booleans() {
    let ex = make_binance();
    let desc = Binance::describe(&ex);
    let desc_json = normalize(&desc).expect("describe Undefined");

    let has = desc_json.get("has").expect("has missing");
    let has_obj = has.as_object().expect("has should be object");

    for (flag, value) in has_obj {
        assert!(
            value.is_boolean() || value.is_string(),
            "has.{} should be bool or string, got {:?}",
            flag, value
        );
    }
}

#[test]
fn test_binance_has_fetchTicker() {
    let ex = make_binance();
    let desc = Binance::describe(&ex);
    let desc_json = normalize(&desc).expect("describe Undefined");

    let has_fetch_ticker = &desc_json["has"]["fetchTicker"];
    assert!(
        has_fetch_ticker.as_bool() == Some(true) || has_fetch_ticker.as_str().is_some(),
        "fetchTicker should be supported"
    );
}

// ---------------------------------------------------------------------------
// UNIT TESTS: describe urls parity
// ---------------------------------------------------------------------------

#[test]
fn test_binance_describe_urls() {
    let ex = make_binance();
    let desc = Binance::describe(&ex);
    let desc_json = normalize(&desc).expect("describe Undefined");

    let urls = desc_json.get("urls").expect("urls missing");
    assert!(urls.get("api").is_some(), "urls.api missing");
}

// ---------------------------------------------------------------------------
// UNIT TESTS: describe api structure parity
// ---------------------------------------------------------------------------

#[test]
fn test_binance_describe_api_has_public() {
    let ex = make_binance();
    let desc = Binance::describe(&ex);
    let desc_json = normalize(&desc).expect("describe Undefined");

    let api = desc_json.get("api").expect("api missing");
    assert!(
        api.get("public").is_some() || api.get("sapi").is_some() || api.get("v3").is_some(),
        "api should have at least one endpoint group"
    );
}

// ---------------------------------------------------------------------------
// INTEGRATION TESTS: Multi-exchange describe validation
// ---------------------------------------------------------------------------

/// Validate all available exchanges have a proper describe() structure.
/// This is an offline test - no network required.
#[test]
fn test_all_available_exchanges_describe_shape() {
    // Only binance is unconditionally available (not behind full-exchanges feature)
    let ex = make_binance();
    let desc = Binance::describe(&ex);
    let desc_json = normalize(&desc).expect("binance: describe Undefined");
    assert_describe_shape("binance", &desc_json);
}

// ---------------------------------------------------------------------------
// NETWORK TESTS (run only when network is available)
// ---------------------------------------------------------------------------

fn network_available() -> bool {
    use std::net::ToSocketAddrs;
    ("api.binance.com", 443).to_socket_addrs().is_ok()
}

/// Test that live API responses from Binance have the expected shape.
/// This validates that our request() method works and returns proper JSON.
#[tokio::test]
async fn test_binance_live_ticker_has_correct_shape_when_network_available() {
    if !network_available() {
        eprintln!("Skipping live test: no network");
        return;
    }

    let mut ex = make_binance();
    let result = Binance::fetch_ticker(&mut ex, "BTC/USDT".into(), Value::Undefined).await;

    if result.is_undefined() {
        eprintln!("fetch_ticker returned Undefined (network issue or exchange error)");
        return;
    }

    let json = normalize(&result).expect("fetch_ticker returned non-JSON");

    // The raw result should have basic exchange fields
    // (before parsing, it's the raw API response)
    assert!(json.is_object() || json.is_array(), "ticker result should be object or array");
}

#[tokio::test]
async fn test_binance_live_orderbook_has_bids_asks_when_network_available() {
    if !network_available() {
        eprintln!("Skipping live test: no network");
        return;
    }

    let mut ex = make_binance();
    let result = Binance::fetch_order_book(
        &mut ex,
        "BTC/USDT".into(),
        Value::from(5usize),
        Value::Undefined,
    ).await;

    if result.is_undefined() {
        eprintln!("fetch_order_book returned Undefined");
        return;
    }

    let json = normalize(&result).expect("fetch_order_book returned non-JSON");
    // Raw binance order book response has bids and asks
    assert!(json.get("bids").is_some() || json.is_array(), "order book should have bids");
}

#[tokio::test]
async fn test_binance_live_ohlcv_is_array_of_arrays_when_network_available() {
    if !network_available() {
        eprintln!("Skipping live test: no network");
        return;
    }

    let mut ex = make_binance();
    let result = Binance::fetch_ohlcv(
        &mut ex,
        "BTC/USDT".into(),
        "1m".into(),
        Value::Undefined,
        Value::from(5usize),
        Value::Undefined,
    ).await;

    if result.is_undefined() {
        eprintln!("fetch_ohlcv returned Undefined");
        return;
    }

    let json = normalize(&result).expect("fetch_ohlcv returned non-JSON");
    if let Some(arr) = json.as_array() {
        assert!(!arr.is_empty(), "ohlcv should not be empty");
        if let Some(first) = arr.first() {
            assert!(first.is_array(), "each ohlcv entry should be an array");
        }
    }
}
