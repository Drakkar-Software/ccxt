#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

/// Static response tests for CCXT Rust transpilation.
/// Mirrors Python `test_response_statically`:
///   1. Load ts/src/test/static/markets/<exchange>.json as pre-loaded markets
///   2. Load ts/src/test/static/response/<exchange>.json for httpResponse / parsedResponse pairs
///   3. Call parse_ticker / parse_trade / parse_ohlcv directly with the fixture httpResponse
///   4. Assert unified output matches parsedResponse field-by-field (float tolerance 1e-4 relative)

use ccxt::exchange::{normalize, Value, ValueTrait};
use serde_json::{json, Value as JsonValue};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn load_json_opt(path: &str) -> Option<JsonValue> {
    let s = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&s).ok()
}

fn build_markets_by_id(markets_json: &JsonValue) -> JsonValue {
    let mut mbi_map = serde_json::Map::new();
    if let JsonValue::Object(m) = markets_json {
        for (sym, mkt) in m {
            let id = mkt.get("id").and_then(|v| v.as_str()).unwrap_or(sym.as_str());
            mbi_map
                .entry(id.to_string())
                .or_insert_with(|| JsonValue::Array(vec![]))
                .as_array_mut()
                .unwrap()
                .push(mkt.clone());
        }
    }
    JsonValue::Object(mbi_map)
}

fn market_for(markets_json: &JsonValue, symbol: &str) -> Value {
    markets_json
        .get(symbol)
        .map(|m| Value::Json(m.clone()))
        .unwrap_or(Value::Undefined)
}

/// Deep JSON comparison with 1e-4 relative float tolerance.
fn compare(path: &str, got: &JsonValue, expected: &JsonValue) -> Option<String> {
    match (got, expected) {
        (JsonValue::Null, JsonValue::Null) => None,
        (JsonValue::Bool(a), JsonValue::Bool(b)) => {
            if a == b { None } else { Some(format!("{path}: bool {a} != {b}")) }
        }
        (JsonValue::String(a), JsonValue::String(b)) => {
            if a == b { None } else { Some(format!("{path}: \"{a}\" != \"{b}\"")) }
        }
        (JsonValue::Number(a), JsonValue::Number(b)) => {
            let af = a.as_f64().unwrap_or(0.0);
            let bf = b.as_f64().unwrap_or(0.0);
            let diff = (af - bf).abs();
            let rel = if bf.abs() > 1e-12 { diff / bf.abs() } else { diff };
            if rel < 1e-4 || diff < 1e-9 { None }
            else { Some(format!("{path}: {af} != {bf} (rel {rel:.2e})")) }
        }
        (JsonValue::Object(a), JsonValue::Object(b)) => {
            for (k, bv) in b {
                let av = a.get(k).unwrap_or(&JsonValue::Null);
                if let Some(e) = compare(&format!("{path}.{k}"), av, bv) {
                    return Some(e);
                }
            }
            None
        }
        (JsonValue::Array(a), JsonValue::Array(b)) => {
            if a.len() != b.len() {
                return Some(format!("{path}: array len {} != {}", a.len(), b.len()));
            }
            for (i, (av, bv)) in a.iter().zip(b.iter()).enumerate() {
                if let Some(e) = compare(&format!("{path}[{i}]"), av, bv) {
                    return Some(e);
                }
            }
            None
        }
        _ => Some(format!("{path}: type mismatch: got={got}, expected={expected}")),
    }
}

fn assert_eq_result(label: &str, got: Value, expected: &JsonValue) {
    let got_json = normalize(&got).unwrap_or(JsonValue::Null);
    if let Some(err) = compare(label, &got_json, expected) {
        panic!("{err}\n  GOT:      {got_json}\n  EXPECTED: {expected}");
    }
}

// ---------------------------------------------------------------------------
// Per-method conditional sub-macros.
// Called inside a test body that has `ex`, `fixture`, `markets_json` in scope.
// First arg is `yes` (run) or `no` (skip).
// ---------------------------------------------------------------------------

macro_rules! maybe_ticker_test {
    (yes, $impl_name:ident, $trait_name:ident, $exchange_id:literal, $ex:ident, $fixture:ident, $markets_json:ident) => {
        if let Some(entries) = $fixture["methods"].get("fetchTicker").and_then(|v| v.as_array()) {
            for (idx, entry) in entries.iter().enumerate() {
                if entry.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                    continue;
                }
                let http = entry["httpResponse"].clone();
                let expected = &entry["parsedResponse"];
                let symbol = entry["input"]
                    .as_array()
                    .and_then(|a| a.first())
                    .and_then(|v| v.as_str())
                    .unwrap_or("BTC/USDT");
                let market = market_for(&$markets_json, symbol);
                let result = <$impl_name as $trait_name>::parse_ticker(&mut $ex, Value::Json(http), market);
                assert_eq_result(
                    &format!("{}/fetchTicker[{idx}]", $exchange_id),
                    result,
                    expected,
                );
            }
        }
    };
    (no, $impl_name:ident, $trait_name:ident, $exchange_id:literal, $ex:ident, $fixture:ident, $markets_json:ident) => {};
}

macro_rules! maybe_trade_test {
    (yes, $impl_name:ident, $trait_name:ident, $exchange_id:literal, $ex:ident, $fixture:ident, $markets_json:ident) => {
        if let Some(entries) = $fixture["methods"].get("fetchTrades").and_then(|v| v.as_array()) {
            for (idx, entry) in entries.iter().enumerate() {
                if entry.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                    continue;
                }
                let http = entry["httpResponse"].clone();
                let expected = &entry["parsedResponse"];
                let symbol = entry["input"]
                    .as_array()
                    .and_then(|a| a.first())
                    .and_then(|v| v.as_str())
                    .unwrap_or("BTC/USDT");
                let market = market_for(&$markets_json, symbol);
                if let (Some(raw_arr), Some(exp_arr)) = (http.as_array(), expected.as_array()) {
                    if raw_arr.len() != exp_arr.len() {
                        continue;
                    }
                    for (i, (raw, exp)) in raw_arr.iter().zip(exp_arr.iter()).enumerate() {
                        let result = <$impl_name as $trait_name>::parse_trade(
                            &mut $ex,
                            Value::Json(raw.clone()),
                            market.clone(),
                        );
                        assert_eq_result(
                            &format!("{}/fetchTrades[{idx}][{i}]", $exchange_id),
                            result,
                            exp,
                        );
                    }
                }
            }
        }
    };
    (no, $impl_name:ident, $trait_name:ident, $exchange_id:literal, $ex:ident, $fixture:ident, $markets_json:ident) => {};
}

macro_rules! maybe_ohlcv_test {
    (yes, $impl_name:ident, $trait_name:ident, $exchange_id:literal, $ex:ident, $fixture:ident, $markets_json:ident) => {
        if let Some(entries) = $fixture["methods"].get("fetchOHLCV").and_then(|v| v.as_array()) {
            for (idx, entry) in entries.iter().enumerate() {
                if entry.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                    continue;
                }
                let http = entry["httpResponse"].clone();
                let expected = &entry["parsedResponse"];
                let symbol = entry["input"]
                    .as_array()
                    .and_then(|a| a.first())
                    .and_then(|v| v.as_str())
                    .unwrap_or("BTC/USDT");
                let market = market_for(&$markets_json, symbol);
                if let (Some(raw_arr), Some(exp_arr)) = (http.as_array(), expected.as_array()) {
                    if raw_arr.len() != exp_arr.len() {
                        continue;
                    }
                    for (i, (raw, exp)) in raw_arr.iter().zip(exp_arr.iter()).enumerate() {
                        let result = <$impl_name as $trait_name>::parse_ohlcv(
                            &mut $ex,
                            Value::Json(raw.clone()),
                            market.clone(),
                        );
                        assert_eq_result(
                            &format!("{}/fetchOHLCV[{idx}][{i}]", $exchange_id),
                            result,
                            exp,
                        );
                    }
                }
            }
        }
    };
    (no, $impl_name:ident, $trait_name:ident, $exchange_id:literal, $ex:ident, $fixture:ident, $markets_json:ident) => {};
}

// ---------------------------------------------------------------------------
// Main test generator macro.
// $do_ticker / $do_trade / $do_ohlcv: `yes` or `no`
// Default arm (omitting flags) expands to `yes yes yes`.
// ---------------------------------------------------------------------------

macro_rules! def_exchange_test {
    ($fn_name:ident, $module:ident, $exchange_id:literal, $trait_name:ident, $impl_name:ident,
     $do_ticker:ident, $do_trade:ident, $do_ohlcv:ident) => {
        #[test]
        fn $fn_name() {
            use ccxt::exchanges::$module::{$trait_name, $impl_name};

            let response_path = concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../ts/src/test/static/response/",
                $exchange_id,
                ".json"
            );
            let markets_path = concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../ts/src/test/static/markets/",
                $exchange_id,
                ".json"
            );
            let fixture = match load_json_opt(response_path) {
                Some(f) => f,
                None => return,
            };
            let markets_json = load_json_opt(markets_path).unwrap_or(json!({}));
            let mbi = build_markets_by_id(&markets_json);

            let mut ex = $impl_name::new(Value::Json(json!({})));
            ex.set(Value::from("markets"), Value::Json(markets_json.clone()));
            ex.set(Value::from("markets_by_id"), Value::Json(mbi));

            maybe_ticker_test!($do_ticker, $impl_name, $trait_name, $exchange_id, ex, fixture, markets_json);
            maybe_trade_test!($do_trade, $impl_name, $trait_name, $exchange_id, ex, fixture, markets_json);
            maybe_ohlcv_test!($do_ohlcv, $impl_name, $trait_name, $exchange_id, ex, fixture, markets_json);
        }
    };
    // Default: run all three
    ($fn_name:ident, $module:ident, $exchange_id:literal, $trait_name:ident, $impl_name:ident) => {
        def_exchange_test!(
            $fn_name, $module, $exchange_id, $trait_name, $impl_name,
            yes, yes, yes
        );
    };
}

// ---------------------------------------------------------------------------
// One test per exchange (88 default-compiled exchanges with fixtures).
// Exchanges that don't define a parse method in their own trait use `no` for
// that method to avoid E0576 ("method not found in trait").
//
// Missing parse_ticker: alpaca, bequant, binanceus, coinbaseadvanced, dydx,
//                       gateio, myokx, okxus, woo, woofipro
// Missing parse_trade:  bequant, binanceus, coinbaseadvanced, gateio, myokx, okxus
// Missing parse_ohlcv:  bequant, binanceus, bit2c, bitbns, coinbaseadvanced,
//                       coinmate, deepcoin, deribit, gateio, gemini, latoken,
//                       myokx, okxus, yobit, zaif
// ---------------------------------------------------------------------------

def_exchange_test!(test_static_alpaca,                alpaca,                "alpaca",                Alpaca,                AlpacaImpl,                no,  yes, yes);
def_exchange_test!(test_static_apex,                  apex,                  "apex",                  Apex,                  ApexImpl);
def_exchange_test!(test_static_arkham,                arkham,                "arkham",                Arkham,                ArkhamImpl);
def_exchange_test!(test_static_ascendex,              ascendex,              "ascendex",              Ascendex,              AscendexImpl);
def_exchange_test!(test_static_backpack,              backpack,              "backpack",              Backpack,              BackpackImpl);
def_exchange_test!(test_static_bequant,               bequant,               "bequant",               Bequant,               BequantImpl,               no,  no,  no);
def_exchange_test!(test_static_bigone,                bigone,                "bigone",                Bigone,                BigoneImpl);
def_exchange_test!(test_static_binance,               binance,               "binance",               Binance,               BinanceImpl);
def_exchange_test!(test_static_binanceus,             binanceus,             "binanceus",             Binanceus,             BinanceusImpl,             no,  no,  no);
def_exchange_test!(test_static_bingx,                 bingx,                 "bingx",                 Bingx,                 BingxImpl);
def_exchange_test!(test_static_bit2c,                 bit2c,                 "bit2c",                 Bit2c,                 Bit2cImpl,                 yes, yes, no);
def_exchange_test!(test_static_bitbns,                bitbns,                "bitbns",                Bitbns,                BitbnsImpl,                yes, yes, no);
def_exchange_test!(test_static_bitfinex,              bitfinex,              "bitfinex",              Bitfinex,              BitfinexImpl);
def_exchange_test!(test_static_bitget,                bitget,                "bitget",                Bitget,                BitgetImpl);
def_exchange_test!(test_static_bithumb,               bithumb,               "bithumb",               Bithumb,               BithumbImpl);
def_exchange_test!(test_static_bitmart,               bitmart,               "bitmart",               Bitmart,               BitmartImpl);
def_exchange_test!(test_static_bitmex,                bitmex,                "bitmex",                Bitmex,                BitmexImpl);
def_exchange_test!(test_static_bitopro,               bitopro,               "bitopro",               Bitopro,               BitoproImpl);
def_exchange_test!(test_static_bitrue,                bitrue,                "bitrue",                Bitrue,                BitrueImpl);
def_exchange_test!(test_static_bitso,                 bitso,                 "bitso",                 Bitso,                 BitsoImpl);
def_exchange_test!(test_static_bitstamp,              bitstamp,              "bitstamp",              Bitstamp,              BitstampImpl);
def_exchange_test!(test_static_bitvavo,               bitvavo,               "bitvavo",               Bitvavo,               BitvavoImpl);
def_exchange_test!(test_static_blofin,                blofin,                "blofin",                Blofin,                BlofinImpl);
def_exchange_test!(test_static_btcmarkets,            btcmarkets,            "btcmarkets",            Btcmarkets,            BtcmarketsImpl);
def_exchange_test!(test_static_btcturk,               btcturk,               "btcturk",               Btcturk,               BtcturkImpl);
def_exchange_test!(test_static_bybit,                 bybit,                 "bybit",                 Bybit,                 BybitImpl);
def_exchange_test!(test_static_cex,                   cex,                   "cex",                   Cex,                   CexImpl);
def_exchange_test!(test_static_coinbase,              coinbase,              "coinbase",              Coinbase,              CoinbaseImpl);
def_exchange_test!(test_static_coinbaseadvanced,      coinbaseadvanced,      "coinbaseadvanced",      Coinbaseadvanced,      CoinbaseadvancedImpl,      no,  no,  no);
def_exchange_test!(test_static_coinbaseexchange,      coinbaseexchange,      "coinbaseexchange",      Coinbaseexchange,      CoinbaseexchangeImpl);
def_exchange_test!(test_static_coinbaseinternational, coinbaseinternational, "coinbaseinternational", Coinbaseinternational, CoinbaseinternationalImpl);
def_exchange_test!(test_static_coincatch,             coincatch,             "coincatch",             Coincatch,             CoincatchImpl);
def_exchange_test!(test_static_coinex,                coinex,                "coinex",                Coinex,                CoinexImpl);
def_exchange_test!(test_static_coinmate,              coinmate,              "coinmate",              Coinmate,              CoinmateImpl,              yes, yes, no);
def_exchange_test!(test_static_coinsph,               coinsph,               "coinsph",               Coinsph,               CoinsphImpl);
def_exchange_test!(test_static_cryptocom,             cryptocom,             "cryptocom",             Cryptocom,             CryptocomImpl);
def_exchange_test!(test_static_deepcoin,              deepcoin,              "deepcoin",              Deepcoin,              DeepcoinImpl,              yes, yes, no);
def_exchange_test!(test_static_deribit,               deribit,               "deribit",               Deribit,               DeribitImpl,               yes, yes, no);
def_exchange_test!(test_static_digifinex,             digifinex,             "digifinex",             Digifinex,             DigifinexImpl);
def_exchange_test!(test_static_dydx,                  dydx,                  "dydx",                  Dydx,                  DydxImpl,                  no,  yes, yes);
def_exchange_test!(test_static_exmo,                  exmo,                  "exmo",                  Exmo,                  ExmoImpl);
def_exchange_test!(test_static_gate,                  gate,                  "gate",                  Gate,                  GateImpl);
def_exchange_test!(test_static_gateio,                gateio,                "gateio",                Gateio,                GateioImpl,                no,  no,  no);
def_exchange_test!(test_static_gemini,                gemini,                "gemini",                Gemini,                GeminiImpl,                yes, yes, no);
def_exchange_test!(test_static_hashkey,               hashkey,               "hashkey",               Hashkey,               HashkeyImpl);
def_exchange_test!(test_static_hitbtc,                hitbtc,                "hitbtc",                Hitbtc,                HitbtcImpl);
def_exchange_test!(test_static_hollaex,               hollaex,               "hollaex",               Hollaex,               HollaexImpl);
def_exchange_test!(test_static_htx,                   htx,                   "htx",                   Htx,                   HtxImpl);
def_exchange_test!(test_static_hyperliquid,           hyperliquid,           "hyperliquid",           Hyperliquid,           HyperliquidImpl);
def_exchange_test!(test_static_kraken,                kraken,                "kraken",                Kraken,                KrakenImpl);
def_exchange_test!(test_static_krakenfutures,         krakenfutures,         "krakenfutures",         Krakenfutures,         KrakenfuturesImpl);
def_exchange_test!(test_static_kucoin,                kucoin,                "kucoin",                Kucoin,                KucoinImpl);
def_exchange_test!(test_static_kucoinfutures,         kucoinfutures,         "kucoinfutures",         Kucoinfutures,         KucoinfuturesImpl);
def_exchange_test!(test_static_latoken,               latoken,               "latoken",               Latoken,               LatokenImpl,               yes, yes, no);
def_exchange_test!(test_static_lbank,                 lbank,                 "lbank",                 Lbank,                 LbankImpl);
def_exchange_test!(test_static_luno,                  luno,                  "luno",                  Luno,                  LunoImpl);
def_exchange_test!(test_static_mexc,                  mexc,                  "mexc",                  Mexc,                  MexcImpl);
def_exchange_test!(test_static_myokx,                 myokx,                 "myokx",                 Myokx,                 MyokxImpl,                 no,  no,  no);
def_exchange_test!(test_static_ndax,                  ndax,                  "ndax",                  Ndax,                  NdaxImpl);
def_exchange_test!(test_static_novadax,               novadax,               "novadax",               Novadax,               NovadaxImpl);
def_exchange_test!(test_static_okx,                   okx,                   "okx",                   Okx,                   OkxImpl);
def_exchange_test!(test_static_okxus,                 okxus,                 "okxus",                 Okxus,                 OkxusImpl,                 no,  no,  no);
def_exchange_test!(test_static_oxfun,                 oxfun,                 "oxfun",                 Oxfun,                 OxfunImpl);
def_exchange_test!(test_static_p2b,                   p2b,                   "p2b",                   P2b,                   P2bImpl);
def_exchange_test!(test_static_paradex,               paradex,               "paradex",               Paradex,               ParadexImpl);
def_exchange_test!(test_static_phemex,                phemex,                "phemex",                Phemex,                PhemexImpl);
def_exchange_test!(test_static_poloniex,              poloniex,              "poloniex",              Poloniex,              PoloniexImpl);
def_exchange_test!(test_static_probit,                probit,                "probit",                Probit,                ProbitImpl);
def_exchange_test!(test_static_timex,                 timex,                 "timex",                 Timex,                 TimexImpl);
def_exchange_test!(test_static_toobit,                toobit,                "toobit",                Toobit,                ToobitImpl);
def_exchange_test!(test_static_upbit,                 upbit,                 "upbit",                 Upbit,                 UpbitImpl);
def_exchange_test!(test_static_wavesexchange,         wavesexchange,         "wavesexchange",         Wavesexchange,         WavesexchangeImpl);
def_exchange_test!(test_static_whitebit,              whitebit,              "whitebit",              Whitebit,              WhitebitImpl);
def_exchange_test!(test_static_woo,                   woo,                   "woo",                   Woo,                   WooImpl,                   no,  yes, yes);
def_exchange_test!(test_static_woofipro,              woofipro,              "woofipro",              Woofipro,              WoofiproImpl,              no,  yes, yes);
def_exchange_test!(test_static_xt,                    xt,                    "xt",                    Xt,                    XtImpl);
def_exchange_test!(test_static_yobit,                 yobit,                 "yobit",                 Yobit,                 YobitImpl,                 yes, yes, no);
def_exchange_test!(test_static_zaif,                  zaif,                  "zaif",                  Zaif,                  ZaifImpl,                  yes, yes, no);
def_exchange_test!(test_static_zonda,                 zonda,                 "zonda",                 Zonda,                 ZondaImpl);
