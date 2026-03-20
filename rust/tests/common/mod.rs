#![allow(dead_code)]

use serde_json::Value as JsonValue;
use std::net::ToSocketAddrs;

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/// Extract f64 from a JSON object by string key. Handles both numeric and
/// string-encoded values (e.g. `"123.45"`).
pub fn safe_f64(obj: &JsonValue, key: &str) -> Option<f64> {
    let v = obj.get(key)?;
    v.as_f64().or_else(|| v.as_str()?.parse::<f64>().ok())
}

/// Extract i64 from a JSON object by string key.
pub fn safe_i64(obj: &JsonValue, key: &str) -> Option<i64> {
    let v = obj.get(key)?;
    v.as_i64().or_else(|| v.as_str()?.parse::<i64>().ok())
}

/// Extract f64 from a JSON array by index. Handles string-encoded numbers.
pub fn safe_f64_at(arr: &JsonValue, index: usize) -> Option<f64> {
    let v = arr.get(index)?;
    v.as_f64().or_else(|| v.as_str()?.parse::<f64>().ok())
}

/// Extract i64 from a JSON array by index.
pub fn safe_i64_at(arr: &JsonValue, index: usize) -> Option<i64> {
    let v = arr.get(index)?;
    v.as_i64().or_else(|| v.as_str()?.parse::<i64>().ok())
}

/// Check if a JSON value is defined (not null and not absent).
fn is_defined(obj: &JsonValue, key: &str) -> bool {
    obj.get(key).map(|v| !v.is_null()).unwrap_or(false)
}

pub fn network_available() -> bool {
    ("api.binance.com", 443).to_socket_addrs().is_ok()
}

// ---------------------------------------------------------------------------
// Timestamp sanity: between Jan 2009 and Jan 2038
// ---------------------------------------------------------------------------

const TS_MIN_MS: i64 = 1_230_940_800_000;  // Jan 2009 in milliseconds
const TS_MAX_MS: i64 = 2_147_483_648_000;  // Jan 2038 in milliseconds
const TS_MIN_S: i64 = 1_230_940_800;       // Jan 2009 in seconds
const TS_MAX_S: i64 = 2_147_483_648;       // Jan 2038 in seconds

fn assert_timestamp_sane(exchange: &str, context: &str, ts: i64) {
    // Handle both millisecond (13+ digits) and second (10 digits) timestamps
    let valid = if ts > TS_MIN_MS {
        ts < TS_MAX_MS
    } else {
        ts > TS_MIN_S && ts < TS_MAX_S
    };
    assert!(
        valid,
        "{exchange}: {context} timestamp {ts} out of sane range"
    );
}

// ---------------------------------------------------------------------------
// describe()
// ---------------------------------------------------------------------------

pub fn assert_describe_shape(exchange: &str, describe: &JsonValue, require_pro: bool) {
    assert!(describe.get("id").is_some(), "{exchange}: describe.id missing");
    assert!(describe.get("name").is_some(), "{exchange}: describe.name missing");
    assert!(describe.get("has").is_some(), "{exchange}: describe.has missing");
    assert!(describe.get("api").is_some(), "{exchange}: describe.api missing");
    assert!(describe.get("urls").is_some(), "{exchange}: describe.urls missing");
    if require_pro {
        let rate_limit = describe.get("rateLimit").and_then(|v| v.as_f64());
        assert!(
            rate_limit.map(|r| r > 0.0).unwrap_or(false),
            "{exchange}: rateLimit should be a positive number"
        );
        assert_eq!(
            describe.get("pro").and_then(|v| v.as_bool()),
            Some(true),
            "{exchange}: expected pro: true in describe()"
        );
    }
}

// ---------------------------------------------------------------------------
// Ticker
// ---------------------------------------------------------------------------

pub fn assert_ticker_shape(exchange: &str, ticker: Option<JsonValue>, expected_symbol: &str) {
    let v = match ticker {
        Some(v) => v,
        None => return,
    };
    let obj = match v.as_object() {
        Some(o) => o,
        None => return, // not an object — nothing to validate
    };

    // 1. Key presence — soft check (raw exchange responses may lack unified keys)
    let has_unified_keys = obj.contains_key("symbol") && obj.contains_key("last");

    // 2. Symbol match (only if unified key is present)
    if let Some(sym) = obj.get("symbol").and_then(|s| s.as_str()) {
        if has_unified_keys {
            assert_eq!(
                sym, expected_symbol,
                "{exchange}: ticker.symbol '{sym}' != expected '{expected_symbol}'"
            );
        }
    }

    // 3. last == close (if both defined)
    if let (Some(last), Some(close)) = (safe_f64(&v, "last"), safe_f64(&v, "close")) {
        assert!(
            (last - close).abs() < 1e-12,
            "{exchange}: ticker.last ({last}) != ticker.close ({close})"
        );
    }

    // 4. Prices > 0 (check both unified and common raw exchange keys)
    for key in &[
        "open", "high", "low", "close", "ask", "bid", "last",
        "openPrice", "highPrice", "lowPrice", "lastPrice", "askPrice", "bidPrice",
    ] {
        if let Some(price) = safe_f64(&v, key) {
            assert!(
                price > 0.0,
                "{exchange}: ticker.{key} ({price}) should be > 0"
            );
        }
    }

    // 5. Volumes >= 0
    for key in &["askVolume", "bidVolume", "baseVolume", "quoteVolume", "volume", "quoteVolume"] {
        if let Some(vol) = safe_f64(&v, key) {
            assert!(
                vol >= 0.0,
                "{exchange}: ticker.{key} ({vol}) should be >= 0"
            );
        }
    }

    // 6. Spread: ask > bid (try unified keys, then raw exchange keys)
    let ask_val = safe_f64(&v, "ask").or_else(|| safe_f64(&v, "askPrice"));
    let bid_val = safe_f64(&v, "bid").or_else(|| safe_f64(&v, "bidPrice"));
    if let (Some(ask), Some(bid)) = (ask_val, bid_val) {
        assert!(
            ask > bid,
            "{exchange}: ticker ask ({ask}) should be > bid ({bid})"
        );
    }

    // 7. OHLC bounds (try unified keys, then raw exchange keys)
    let high_val = safe_f64(&v, "high").or_else(|| safe_f64(&v, "highPrice"));
    let low_val = safe_f64(&v, "low").or_else(|| safe_f64(&v, "lowPrice"));
    if let (Some(high), Some(low)) = (high_val, low_val) {
        if let Some(open) = safe_f64(&v, "open").or_else(|| safe_f64(&v, "openPrice")) {
            assert!(
                open >= low && open <= high,
                "{exchange}: ticker open ({open}) should be between low ({low}) and high ({high})"
            );
        }
        if let Some(close) = safe_f64(&v, "close").or_else(|| safe_f64(&v, "lastPrice")) {
            assert!(
                close >= low && close <= high,
                "{exchange}: ticker close ({close}) should be between low ({low}) and high ({high})"
            );
        }
    }

    // 8. Percentage range
    if let Some(pct) = safe_f64(&v, "percentage") {
        assert!(
            pct >= -100.0 && pct <= 10000.0,
            "{exchange}: ticker.percentage ({pct}) out of range [-100, 10000]"
        );
    }

    // 9. VWAP consistency
    if let Some(vwap) = safe_f64(&v, "vwap") {
        assert!(
            vwap >= 0.0,
            "{exchange}: ticker.vwap ({vwap}) should be >= 0"
        );
        if is_defined(&v, "baseVolume") {
            assert!(
                is_defined(&v, "quoteVolume"),
                "{exchange}: vwap & baseVolume defined but quoteVolume missing"
            );
        }
        if is_defined(&v, "quoteVolume") {
            assert!(
                is_defined(&v, "baseVolume"),
                "{exchange}: vwap & quoteVolume defined but baseVolume missing"
            );
        }
    }

    // 10. Timestamp sanity
    if let Some(ts) = safe_i64(&v, "timestamp") {
        assert_timestamp_sane(exchange, "ticker", ts);
    }
}

// ---------------------------------------------------------------------------
// Order Book
// ---------------------------------------------------------------------------

pub fn assert_order_book_shape(exchange: &str, ob: Option<JsonValue>, expected_symbol: &str) {
    let v = match ob {
        Some(v) => v,
        None => return,
    };
    let obj = match v.as_object() {
        Some(o) => o,
        None => return,
    };

    // 1. Try to find bids/asks arrays (unified or raw format)
    let bids = v.get("bids").and_then(|b| b.as_array());
    let asks = v.get("asks").and_then(|a| a.as_array());

    // If neither bids nor asks exist, this is raw data we can't validate — return
    let (bids, asks) = match (bids, asks) {
        (Some(b), Some(a)) => (b, a),
        _ => return,
    };

    // 2. Symbol match (if present)
    if let Some(sym) = obj.get("symbol").and_then(|s| s.as_str()) {
        assert_eq!(
            sym, expected_symbol,
            "{exchange}: order_book.symbol '{sym}' != expected '{expected_symbol}'"
        );
    }

    // 4. Bids sorted descending + price/amount > 0
    for i in 0..bids.len() {
        let price = safe_f64_at(&bids[i], 0);
        let amount = safe_f64_at(&bids[i], 1);
        if let Some(p) = price {
            assert!(p > 0.0, "{exchange}: bids[{i}] price ({p}) should be > 0");
        }
        if let Some(a) = amount {
            assert!(a > 0.0, "{exchange}: bids[{i}] amount ({a}) should be > 0");
        }
        if i + 1 < bids.len() {
            if let (Some(cur), Some(next)) = (price, safe_f64_at(&bids[i + 1], 0)) {
                assert!(
                    cur > next,
                    "{exchange}: bids not sorted descending: bids[{i}]={cur} <= bids[{}]={next}",
                    i + 1
                );
            }
        }
    }

    // 5. Asks sorted ascending + price/amount > 0
    for i in 0..asks.len() {
        let price = safe_f64_at(&asks[i], 0);
        let amount = safe_f64_at(&asks[i], 1);
        if let Some(p) = price {
            assert!(p > 0.0, "{exchange}: asks[{i}] price ({p}) should be > 0");
        }
        if let Some(a) = amount {
            assert!(a > 0.0, "{exchange}: asks[{i}] amount ({a}) should be > 0");
        }
        if i + 1 < asks.len() {
            if let (Some(cur), Some(next)) = (price, safe_f64_at(&asks[i + 1], 0)) {
                assert!(
                    cur < next,
                    "{exchange}: asks not sorted ascending: asks[{i}]={cur} >= asks[{}]={next}",
                    i + 1
                );
            }
        }
    }

    // 6. Bid-ask spread
    if !bids.is_empty() && !asks.is_empty() {
        if let (Some(best_bid), Some(best_ask)) =
            (safe_f64_at(&bids[0], 0), safe_f64_at(&asks[0], 0))
        {
            assert!(
                best_bid < best_ask,
                "{exchange}: best bid ({best_bid}) should be < best ask ({best_ask})"
            );
        }
    }

    // 7. Timestamp sanity
    if let Some(ts) = safe_i64(&v, "timestamp") {
        assert_timestamp_sane(exchange, "order_book", ts);
    }
}

// ---------------------------------------------------------------------------
// OHLCV
// ---------------------------------------------------------------------------

pub fn assert_ohlcv_shape(exchange: &str, ohlcv: Option<JsonValue>) {
    let v = match ohlcv {
        Some(v) => v,
        None => return,
    };
    let rows = match v.as_array() {
        Some(r) => r,
        None => return,
    };

    for (idx, row) in rows.iter().take(5).enumerate() {
        let arr = match row.as_array() {
            Some(a) => a,
            None => {
                panic!("{exchange}: ohlcv[{idx}] should be an array");
            }
        };

        // 1. Length >= 6
        assert!(
            arr.len() >= 6,
            "{exchange}: ohlcv[{idx}] has {} elements, expected >= 6",
            arr.len()
        );

        // 2. All 6 values defined (not null)
        for i in 0..6 {
            assert!(
                !arr[i].is_null(),
                "{exchange}: ohlcv[{idx}][{i}] should not be null"
            );
        }

        // 3. Timestamp sanity
        if let Some(ts) = safe_i64_at(row, 0) {
            assert_timestamp_sane(exchange, &format!("ohlcv[{idx}]"), ts);
        }

        // 4. OHLC bounds: high >= open, high >= close, low <= open, low <= close
        if let (Some(open), Some(high), Some(low), Some(close)) = (
            safe_f64_at(row, 1),
            safe_f64_at(row, 2),
            safe_f64_at(row, 3),
            safe_f64_at(row, 4),
        ) {
            assert!(
                high >= open,
                "{exchange}: ohlcv[{idx}] high ({high}) < open ({open})"
            );
            assert!(
                high >= close,
                "{exchange}: ohlcv[{idx}] high ({high}) < close ({close})"
            );
            assert!(
                low <= open,
                "{exchange}: ohlcv[{idx}] low ({low}) > open ({open})"
            );
            assert!(
                low <= close,
                "{exchange}: ohlcv[{idx}] low ({low}) > close ({close})"
            );
        }

        // 5. All values >= 0
        for i in 0..6 {
            if let Some(val) = safe_f64_at(row, i) {
                assert!(
                    val >= 0.0,
                    "{exchange}: ohlcv[{idx}][{i}] ({val}) should be >= 0"
                );
            }
        }
    }
}
