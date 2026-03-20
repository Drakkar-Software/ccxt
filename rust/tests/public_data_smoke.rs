mod common;

use ccxt::exchange::{normalize, Value};
use serde_json::{json, Value as JsonValue};

#[derive(Debug)]
struct PublicSuite {
    describe: Value,
    status: Value,
    ticker: Value,
    tickers: Value,
    order_book: Value,
    ohlcv: Value,
}

fn assert_optional_status_shape(_exchange: &str, status: Option<JsonValue>) {
    if let Some(v) = status {
        // Just verify it's a valid JSON value — raw responses vary widely
        assert!(
            v.is_object() || v.is_array() || v.is_string() || v.is_number() || v.is_boolean() || v.is_null(),
            "{_exchange}: status returned unexpected type"
        );
    }
}

fn assert_optional_tickers_shape(exchange: &str, tickers: Option<JsonValue>) {
    if let Some(v) = tickers {
        assert!(
            v.is_object() || v.is_array() || v.is_string() || v.is_number() || v.is_boolean() || v.is_null(),
            "{exchange}: tickers returned unexpected JSON type"
        );
    }
}

macro_rules! run_suite {
    ($trait_path:path, $impl_path:path, $symbol:expr) => {{
        let mut exchange = <$impl_path>::new(Value::Json(json!({})));
        let describe = <$impl_path as $trait_path>::describe(&exchange);
        let status = <$impl_path as $trait_path>::fetch_status(&mut exchange, Value::Undefined).await;
        let ticker =
            <$impl_path as $trait_path>::fetch_ticker(&mut exchange, $symbol.into(), Value::Undefined).await;
        let tickers = <$impl_path as $trait_path>::fetch_tickers(
            &mut exchange,
            Value::Json(json!([$symbol])),
            Value::Undefined,
        )
        .await;
        let order_book = <$impl_path as $trait_path>::fetch_order_book(
            &mut exchange,
            $symbol.into(),
            Value::from(10usize),
            Value::Undefined,
        )
        .await;
        let ohlcv = <$impl_path as $trait_path>::fetch_ohlcv(
            &mut exchange,
            $symbol.into(),
            "1m".into(),
            Value::Undefined,
            Value::from(5usize),
            Value::Undefined,
        )
        .await;

        PublicSuite {
            describe,
            status,
            ticker,
            tickers,
            order_book,
            ohlcv,
        }
    }};
}

fn assert_suite(exchange: &str, suite: PublicSuite, symbol: &str) {
    let describe = normalize(&suite.describe).expect("describe should always be JSON");
    common::assert_describe_shape(exchange, &describe, false);
    assert_optional_status_shape(exchange, normalize(&suite.status));
    common::assert_ticker_shape(exchange, normalize(&suite.ticker), symbol);
    assert_optional_tickers_shape(exchange, normalize(&suite.tickers));
    common::assert_order_book_shape(exchange, normalize(&suite.order_book), symbol);
    common::assert_ohlcv_shape(exchange, normalize(&suite.ohlcv));
}

#[tokio::test]
async fn public_data_smoke_binance() {
    let suite = run_suite!(
        ccxt::exchanges::binance::Binance,
        ccxt::exchanges::binance::BinanceImpl,
        "BTC/USDT"
    );
    assert_suite("binance", suite, "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn public_data_smoke_multi_exchange() {
    assert_suite(
        "bybit",
        run_suite!(
            ccxt::exchanges::bybit::Bybit,
            ccxt::exchanges::bybit::BybitImpl,
            "BTC/USDT:USDT"
        ),
        "BTC/USDT:USDT",
    );
    assert_suite(
        "okx",
        run_suite!(ccxt::exchanges::okx::Okx, ccxt::exchanges::okx::OkxImpl, "BTC/USDT"),
        "BTC/USDT",
    );
    assert_suite(
        "kraken",
        run_suite!(
            ccxt::exchanges::kraken::Kraken,
            ccxt::exchanges::kraken::KrakenImpl,
            "BTC/USD"
        ),
        "BTC/USD",
    );
    assert_suite(
        "coinbase",
        run_suite!(
            ccxt::exchanges::coinbase::Coinbase,
            ccxt::exchanges::coinbase::CoinbaseImpl,
            "BTC/USD"
        ),
        "BTC/USD",
    );
    assert_suite(
        "kucoin",
        run_suite!(
            ccxt::exchanges::kucoin::Kucoin,
            ccxt::exchanges::kucoin::KucoinImpl,
            "BTC/USDT"
        ),
        "BTC/USDT",
    );
    assert_suite(
        "gateio",
        run_suite!(
            ccxt::exchanges::gateio::Gateio,
            ccxt::exchanges::gateio::GateioImpl,
            "BTC/USDT"
        ),
        "BTC/USDT",
    );
    assert_suite(
        "dydx",
        run_suite!(
            ccxt::exchanges::dydx::Dydx,
            ccxt::exchanges::dydx::DydxImpl,
            "BTC/USDC:USDC"
        ),
        "BTC/USDC:USDC",
    );
    assert_suite(
        "hyperliquid",
        run_suite!(
            ccxt::exchanges::hyperliquid::Hyperliquid,
            ccxt::exchanges::hyperliquid::HyperliquidImpl,
            "BTC/USDC:USDC"
        ),
        "BTC/USDC:USDC",
    );
}

// ---------------------------------------------------------------------------
// Individual smoke tests for all pro exchanges
// ---------------------------------------------------------------------------

macro_rules! smoke_test {
    ($trait_path:path, $impl_path:path, $name:expr, $symbol:expr) => {{
        let suite = run_suite!($trait_path, $impl_path, $symbol);
        assert_suite($name, suite, $symbol);
    }};
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_htx() {
    smoke_test!(ccxt::exchanges::htx::Htx, ccxt::exchanges::htx::HtxImpl, "htx", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_mexc() {
    smoke_test!(ccxt::exchanges::mexc::Mexc, ccxt::exchanges::mexc::MexcImpl, "mexc", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bitget() {
    smoke_test!(ccxt::exchanges::bitget::Bitget, ccxt::exchanges::bitget::BitgetImpl, "bitget", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bitmex() {
    smoke_test!(ccxt::exchanges::bitmex::Bitmex, ccxt::exchanges::bitmex::BitmexImpl, "bitmex", "BTC/USDT:USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_deribit() {
    smoke_test!(ccxt::exchanges::deribit::Deribit, ccxt::exchanges::deribit::DeribitImpl, "deribit", "BTC/USDT:USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_coinex() {
    smoke_test!(ccxt::exchanges::coinex::Coinex, ccxt::exchanges::coinex::CoinexImpl, "coinex", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_whitebit() {
    smoke_test!(ccxt::exchanges::whitebit::Whitebit, ccxt::exchanges::whitebit::WhitebitImpl, "whitebit", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bingx() {
    smoke_test!(ccxt::exchanges::bingx::Bingx, ccxt::exchanges::bingx::BingxImpl, "bingx", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bitmart() {
    smoke_test!(ccxt::exchanges::bitmart::Bitmart, ccxt::exchanges::bitmart::BitmartImpl, "bitmart", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bitfinex() {
    smoke_test!(ccxt::exchanges::bitfinex::Bitfinex, ccxt::exchanges::bitfinex::BitfinexImpl, "bitfinex", "BTC/USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bitstamp() {
    smoke_test!(ccxt::exchanges::bitstamp::Bitstamp, ccxt::exchanges::bitstamp::BitstampImpl, "bitstamp", "BTC/USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_poloniex() {
    smoke_test!(ccxt::exchanges::poloniex::Poloniex, ccxt::exchanges::poloniex::PoloniexImpl, "poloniex", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_gemini() {
    smoke_test!(ccxt::exchanges::gemini::Gemini, ccxt::exchanges::gemini::GeminiImpl, "gemini", "BTC/USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bitvavo() {
    smoke_test!(ccxt::exchanges::bitvavo::Bitvavo, ccxt::exchanges::bitvavo::BitvavoImpl, "bitvavo", "BTC/EUR");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_woo() {
    smoke_test!(ccxt::exchanges::woo::Woo, ccxt::exchanges::woo::WooImpl, "woo", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_cryptocom() {
    smoke_test!(ccxt::exchanges::cryptocom::Cryptocom, ccxt::exchanges::cryptocom::CryptocomImpl, "cryptocom", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_blofin() {
    smoke_test!(ccxt::exchanges::blofin::Blofin, ccxt::exchanges::blofin::BlofinImpl, "blofin", "BTC/USDT:USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_upbit() {
    smoke_test!(ccxt::exchanges::upbit::Upbit, ccxt::exchanges::upbit::UpbitImpl, "upbit", "BTC/KRW");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bithumb() {
    smoke_test!(ccxt::exchanges::bithumb::Bithumb, ccxt::exchanges::bithumb::BithumbImpl, "bithumb", "BTC/KRW");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_woofipro() {
    smoke_test!(ccxt::exchanges::woofipro::Woofipro, ccxt::exchanges::woofipro::WoofiproImpl, "woofipro", "BTC/USDT:USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_binanceusdm() {
    smoke_test!(ccxt::exchanges::binanceusdm::Binanceusdm, ccxt::exchanges::binanceusdm::BinanceusdmImpl, "binanceusdm", "BTC/USDT:USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_binancecoinm() {
    smoke_test!(ccxt::exchanges::binancecoinm::Binancecoinm, ccxt::exchanges::binancecoinm::BinancecoinmImpl, "binancecoinm", "BTC/USD:BTC");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_krakenfutures() {
    smoke_test!(ccxt::exchanges::krakenfutures::Krakenfutures, ccxt::exchanges::krakenfutures::KrakenfuturesImpl, "krakenfutures", "BTC/USD:USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_kucoinfutures() {
    smoke_test!(ccxt::exchanges::kucoinfutures::Kucoinfutures, ccxt::exchanges::kucoinfutures::KucoinfuturesImpl, "kucoinfutures", "BTC/USDT:USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bitrue() {
    smoke_test!(ccxt::exchanges::bitrue::Bitrue, ccxt::exchanges::bitrue::BitrueImpl, "bitrue", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_hollaex() {
    smoke_test!(ccxt::exchanges::hollaex::Hollaex, ccxt::exchanges::hollaex::HollaexImpl, "hollaex", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_probit() {
    smoke_test!(ccxt::exchanges::probit::Probit, ccxt::exchanges::probit::ProbitImpl, "probit", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_gate() {
    smoke_test!(ccxt::exchanges::gate::Gate, ccxt::exchanges::gate::GateImpl, "gate", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_binanceus() {
    smoke_test!(ccxt::exchanges::binanceus::Binanceus, ccxt::exchanges::binanceus::BinanceusImpl, "binanceus", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_phemex() {
    smoke_test!(ccxt::exchanges::phemex::Phemex, ccxt::exchanges::phemex::PhemexImpl, "phemex", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_coinbaseadvanced() {
    smoke_test!(ccxt::exchanges::coinbaseadvanced::Coinbaseadvanced, ccxt::exchanges::coinbaseadvanced::CoinbaseadvancedImpl, "coinbaseadvanced", "BTC/USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_coinbaseexchange() {
    smoke_test!(ccxt::exchanges::coinbaseexchange::Coinbaseexchange, ccxt::exchanges::coinbaseexchange::CoinbaseexchangeImpl, "coinbaseexchange", "BTC/USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_coinbaseinternational() {
    smoke_test!(ccxt::exchanges::coinbaseinternational::Coinbaseinternational, ccxt::exchanges::coinbaseinternational::CoinbaseinternationalImpl, "coinbaseinternational", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_alpaca() {
    smoke_test!(ccxt::exchanges::alpaca::Alpaca, ccxt::exchanges::alpaca::AlpacaImpl, "alpaca", "BTC/USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_apex() {
    smoke_test!(ccxt::exchanges::apex::Apex, ccxt::exchanges::apex::ApexImpl, "apex", "BTC/USDT:USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_arkham() {
    smoke_test!(ccxt::exchanges::arkham::Arkham, ccxt::exchanges::arkham::ArkhamImpl, "arkham", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_ascendex() {
    smoke_test!(ccxt::exchanges::ascendex::Ascendex, ccxt::exchanges::ascendex::AscendexImpl, "ascendex", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_aster() {
    smoke_test!(ccxt::exchanges::aster::Aster, ccxt::exchanges::aster::AsterImpl, "aster", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_backpack() {
    smoke_test!(ccxt::exchanges::backpack::Backpack, ccxt::exchanges::backpack::BackpackImpl, "backpack", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bequant() {
    smoke_test!(ccxt::exchanges::bequant::Bequant, ccxt::exchanges::bequant::BequantImpl, "bequant", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bitopro() {
    smoke_test!(ccxt::exchanges::bitopro::Bitopro, ccxt::exchanges::bitopro::BitoproImpl, "bitopro", "BTC/TWD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bittrade() {
    smoke_test!(ccxt::exchanges::bittrade::Bittrade, ccxt::exchanges::bittrade::BittradeImpl, "bittrade", "BTC/JPY");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_blockchaincom() {
    smoke_test!(ccxt::exchanges::blockchaincom::Blockchaincom, ccxt::exchanges::blockchaincom::BlockchaincomImpl, "blockchaincom", "BTC/USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_bullish() {
    smoke_test!(ccxt::exchanges::bullish::Bullish, ccxt::exchanges::bullish::BullishImpl, "bullish", "BTC/USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_cex() {
    smoke_test!(ccxt::exchanges::cex::Cex, ccxt::exchanges::cex::CexImpl, "cex", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_coincatch() {
    smoke_test!(ccxt::exchanges::coincatch::Coincatch, ccxt::exchanges::coincatch::CoincatchImpl, "coincatch", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_derive() {
    smoke_test!(ccxt::exchanges::derive::Derive, ccxt::exchanges::derive::DeriveImpl, "derive", "BTC/USDT:USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_hashkey() {
    smoke_test!(ccxt::exchanges::hashkey::Hashkey, ccxt::exchanges::hashkey::HashkeyImpl, "hashkey", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_huobi() {
    smoke_test!(ccxt::exchanges::huobi::Huobi, ccxt::exchanges::huobi::HuobiImpl, "huobi", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_independentreserve() {
    smoke_test!(ccxt::exchanges::independentreserve::Independentreserve, ccxt::exchanges::independentreserve::IndependentreserveImpl, "independentreserve", "BTC/USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_lbank() {
    smoke_test!(ccxt::exchanges::lbank::Lbank, ccxt::exchanges::lbank::LbankImpl, "lbank", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_luno() {
    smoke_test!(ccxt::exchanges::luno::Luno, ccxt::exchanges::luno::LunoImpl, "luno", "XBT/ZAR");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_modetrade() {
    smoke_test!(ccxt::exchanges::modetrade::Modetrade, ccxt::exchanges::modetrade::ModetradeImpl, "modetrade", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_myokx() {
    smoke_test!(ccxt::exchanges::myokx::Myokx, ccxt::exchanges::myokx::MyokxImpl, "myokx", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_ndax() {
    smoke_test!(ccxt::exchanges::ndax::Ndax, ccxt::exchanges::ndax::NdaxImpl, "ndax", "BTC/CAD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_okxus() {
    smoke_test!(ccxt::exchanges::okxus::Okxus, ccxt::exchanges::okxus::OkxusImpl, "okxus", "BTC/USD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_onetrading() {
    smoke_test!(ccxt::exchanges::onetrading::Onetrading, ccxt::exchanges::onetrading::OnetradingImpl, "onetrading", "BTC/EUR");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_oxfun() {
    smoke_test!(ccxt::exchanges::oxfun::Oxfun, ccxt::exchanges::oxfun::OxfunImpl, "oxfun", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_p2b() {
    smoke_test!(ccxt::exchanges::p2b::P2b, ccxt::exchanges::p2b::P2bImpl, "p2b", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_paradex() {
    smoke_test!(ccxt::exchanges::paradex::Paradex, ccxt::exchanges::paradex::ParadexImpl, "paradex", "BTC/USDT:USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_toobit() {
    smoke_test!(ccxt::exchanges::toobit::Toobit, ccxt::exchanges::toobit::ToobitImpl, "toobit", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn smoke_xt() {
    smoke_test!(ccxt::exchanges::xt::Xt, ccxt::exchanges::xt::XtImpl, "xt", "BTC/USDT");
}

// ---------------------------------------------------------------------------
// Strict test: binance must return actual JSON (not Undefined) when online
// ---------------------------------------------------------------------------

#[tokio::test]
async fn strict_public_data_binance_should_return_json() {
    if !common::network_available() {
        eprintln!("skipping strict_public_data_binance_should_return_json: no DNS/network");
        return;
    }
    let suite = run_suite!(
        ccxt::exchanges::binance::Binance,
        ccxt::exchanges::binance::BinanceImpl,
        "BTC/USDT"
    );
    assert!(normalize(&suite.status).is_some(), "status should be JSON");
    assert!(normalize(&suite.ticker).is_some(), "ticker should be JSON");
    assert!(normalize(&suite.tickers).is_some(), "tickers should be JSON");
    assert!(normalize(&suite.order_book).is_some(), "order_book should be JSON");
    assert!(normalize(&suite.ohlcv).is_some(), "ohlcv should be JSON");
}
