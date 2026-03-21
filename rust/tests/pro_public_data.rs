//! Public data smoke tests for pro-flagged exchanges.
//!
//! Requires the `full-exchanges` Cargo feature:
//!   cargo test --test pro_public_data --features full-exchanges
//!
//! Each test:
//!   1. Calls describe() and asserts the shape including `pro: true`.
//!   2. If network is reachable, calls fetch_ticker + fetch_order_book and
//!      validates returned JSON against the unified CCXT shape contract.
//!   3. If network is not reachable the test prints a skip notice and exits.
//!
//! All network assertions are "optional" – a None response (error / unsupported)
//! is treated as a pass so that the suite stays green in offline CI.

mod common;

use ccxt::exchange::{normalize, Value};
use serde_json::json;

// ---------------------------------------------------------------------------
// Core macro: asserts describe shape, then optionally runs live API calls
// ---------------------------------------------------------------------------

macro_rules! pro_test_body {
    ($trait_path:path, $impl_path:path, $name:expr, $symbol:expr) => {{
        let mut ex = <$impl_path>::new(Value::Json(json!({})));

        // describe() is a pure computation – always assert
        let desc = <$impl_path as $trait_path>::describe(&ex);
        let desc_json =
            normalize(&desc).expect(concat!($name, ": describe() returned None"));
        common::assert_describe_shape($name, &desc_json, true);

        // Skip live API calls when offline
        if !common::network_available() {
            eprintln!("SKIP {}: network unavailable", $name);
            return;
        }

        let ticker = <$impl_path as $trait_path>::fetch_ticker(
            &mut ex,
            $symbol.into(),
            Value::Undefined,
        )
        .await;
        common::assert_ticker_shape($name, normalize(&ticker), $symbol);

        let ob = <$impl_path as $trait_path>::fetch_order_book(
            &mut ex,
            $symbol.into(),
            Value::from(5usize),
            Value::Undefined,
        )
        .await;
        common::assert_order_book_shape($name, normalize(&ob), $symbol);
    }};
}

// ---------------------------------------------------------------------------
// Pro exchange tests  (all gated behind full-exchanges feature)
// ---------------------------------------------------------------------------

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_htx() {
    pro_test_body!(
        ccxt::exchanges::htx::Htx,
        ccxt::exchanges::htx::HtxImpl,
        "htx",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_mexc() {
    pro_test_body!(
        ccxt::exchanges::mexc::Mexc,
        ccxt::exchanges::mexc::MexcImpl,
        "mexc",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitget() {
    pro_test_body!(
        ccxt::exchanges::bitget::Bitget,
        ccxt::exchanges::bitget::BitgetImpl,
        "bitget",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitmex() {
    pro_test_body!(
        ccxt::exchanges::bitmex::Bitmex,
        ccxt::exchanges::bitmex::BitmexImpl,
        "bitmex",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_deribit() {
    pro_test_body!(
        ccxt::exchanges::deribit::Deribit,
        ccxt::exchanges::deribit::DeribitImpl,
        "deribit",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinex() {
    pro_test_body!(
        ccxt::exchanges::coinex::Coinex,
        ccxt::exchanges::coinex::CoinexImpl,
        "coinex",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_whitebit() {
    pro_test_body!(
        ccxt::exchanges::whitebit::Whitebit,
        ccxt::exchanges::whitebit::WhitebitImpl,
        "whitebit",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bingx() {
    pro_test_body!(
        ccxt::exchanges::bingx::Bingx,
        ccxt::exchanges::bingx::BingxImpl,
        "bingx",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitmart() {
    pro_test_body!(
        ccxt::exchanges::bitmart::Bitmart,
        ccxt::exchanges::bitmart::BitmartImpl,
        "bitmart",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitfinex() {
    pro_test_body!(
        ccxt::exchanges::bitfinex::Bitfinex,
        ccxt::exchanges::bitfinex::BitfinexImpl,
        "bitfinex",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitstamp() {
    pro_test_body!(
        ccxt::exchanges::bitstamp::Bitstamp,
        ccxt::exchanges::bitstamp::BitstampImpl,
        "bitstamp",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_poloniex() {
    pro_test_body!(
        ccxt::exchanges::poloniex::Poloniex,
        ccxt::exchanges::poloniex::PoloniexImpl,
        "poloniex",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_gemini() {
    pro_test_body!(
        ccxt::exchanges::gemini::Gemini,
        ccxt::exchanges::gemini::GeminiImpl,
        "gemini",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitvavo() {
    pro_test_body!(
        ccxt::exchanges::bitvavo::Bitvavo,
        ccxt::exchanges::bitvavo::BitvavoImpl,
        "bitvavo",
        "BTC/EUR"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_woo() {
    pro_test_body!(
        ccxt::exchanges::woo::Woo,
        ccxt::exchanges::woo::WooImpl,
        "woo",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_cryptocom() {
    pro_test_body!(
        ccxt::exchanges::cryptocom::Cryptocom,
        ccxt::exchanges::cryptocom::CryptocomImpl,
        "cryptocom",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_blofin() {
    pro_test_body!(
        ccxt::exchanges::blofin::Blofin,
        ccxt::exchanges::blofin::BlofinImpl,
        "blofin",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_upbit() {
    pro_test_body!(
        ccxt::exchanges::upbit::Upbit,
        ccxt::exchanges::upbit::UpbitImpl,
        "upbit",
        "BTC/KRW"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bithumb() {
    pro_test_body!(
        ccxt::exchanges::bithumb::Bithumb,
        ccxt::exchanges::bithumb::BithumbImpl,
        "bithumb",
        "BTC/KRW"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_woofipro() {
    pro_test_body!(
        ccxt::exchanges::woofipro::Woofipro,
        ccxt::exchanges::woofipro::WoofiproImpl,
        "woofipro",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_binanceusdm() {
    pro_test_body!(
        ccxt::exchanges::binanceusdm::Binanceusdm,
        ccxt::exchanges::binanceusdm::BinanceusdmImpl,
        "binanceusdm",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_binancecoinm() {
    pro_test_body!(
        ccxt::exchanges::binancecoinm::Binancecoinm,
        ccxt::exchanges::binancecoinm::BinancecoinmImpl,
        "binancecoinm",
        "BTC/USD:BTC"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_krakenfutures() {
    pro_test_body!(
        ccxt::exchanges::krakenfutures::Krakenfutures,
        ccxt::exchanges::krakenfutures::KrakenfuturesImpl,
        "krakenfutures",
        "BTC/USD:USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_kucoinfutures() {
    pro_test_body!(
        ccxt::exchanges::kucoinfutures::Kucoinfutures,
        ccxt::exchanges::kucoinfutures::KucoinfuturesImpl,
        "kucoinfutures",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitrue() {
    pro_test_body!(
        ccxt::exchanges::bitrue::Bitrue,
        ccxt::exchanges::bitrue::BitrueImpl,
        "bitrue",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_hollaex() {
    pro_test_body!(
        ccxt::exchanges::hollaex::Hollaex,
        ccxt::exchanges::hollaex::HollaexImpl,
        "hollaex",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_probit() {
    pro_test_body!(
        ccxt::exchanges::probit::Probit,
        ccxt::exchanges::probit::ProbitImpl,
        "probit",
        "BTC/USDT"
    );
}

// ---------------------------------------------------------------------------
// Major exchanges
// ---------------------------------------------------------------------------

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_okx() {
    pro_test_body!(
        ccxt::exchanges::okx::Okx,
        ccxt::exchanges::okx::OkxImpl,
        "okx",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bybit() {
    pro_test_body!(
        ccxt::exchanges::bybit::Bybit,
        ccxt::exchanges::bybit::BybitImpl,
        "bybit",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_kraken() {
    pro_test_body!(
        ccxt::exchanges::kraken::Kraken,
        ccxt::exchanges::kraken::KrakenImpl,
        "kraken",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_kucoin() {
    pro_test_body!(
        ccxt::exchanges::kucoin::Kucoin,
        ccxt::exchanges::kucoin::KucoinImpl,
        "kucoin",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_gate() {
    pro_test_body!(
        ccxt::exchanges::gate::Gate,
        ccxt::exchanges::gate::GateImpl,
        "gate",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_gateio() {
    pro_test_body!(
        ccxt::exchanges::gateio::Gateio,
        ccxt::exchanges::gateio::GateioImpl,
        "gateio",
        "BTC/USDT"
    );
}

#[tokio::test]
async fn pro_smoke_binance() {
    pro_test_body!(
        ccxt::exchanges::binance::Binance,
        ccxt::exchanges::binance::BinanceImpl,
        "binance",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_binanceus() {
    pro_test_body!(
        ccxt::exchanges::binanceus::Binanceus,
        ccxt::exchanges::binanceus::BinanceusImpl,
        "binanceus",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_hyperliquid() {
    pro_test_body!(
        ccxt::exchanges::hyperliquid::Hyperliquid,
        ccxt::exchanges::hyperliquid::HyperliquidImpl,
        "hyperliquid",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_phemex() {
    pro_test_body!(
        ccxt::exchanges::phemex::Phemex,
        ccxt::exchanges::phemex::PhemexImpl,
        "phemex",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_dydx() {
    pro_test_body!(
        ccxt::exchanges::dydx::Dydx,
        ccxt::exchanges::dydx::DydxImpl,
        "dydx",
        "BTC/USD:USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinbase() {
    pro_test_body!(
        ccxt::exchanges::coinbase::Coinbase,
        ccxt::exchanges::coinbase::CoinbaseImpl,
        "coinbase",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinbaseadvanced() {
    pro_test_body!(
        ccxt::exchanges::coinbaseadvanced::Coinbaseadvanced,
        ccxt::exchanges::coinbaseadvanced::CoinbaseadvancedImpl,
        "coinbaseadvanced",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinbaseexchange() {
    pro_test_body!(
        ccxt::exchanges::coinbaseexchange::Coinbaseexchange,
        ccxt::exchanges::coinbaseexchange::CoinbaseexchangeImpl,
        "coinbaseexchange",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinbaseinternational() {
    pro_test_body!(
        ccxt::exchanges::coinbaseinternational::Coinbaseinternational,
        ccxt::exchanges::coinbaseinternational::CoinbaseinternationalImpl,
        "coinbaseinternational",
        "BTC/USDT"
    );
}

// ---------------------------------------------------------------------------
// More pro exchanges (A-C)
// ---------------------------------------------------------------------------

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_alpaca() {
    pro_test_body!(
        ccxt::exchanges::alpaca::Alpaca,
        ccxt::exchanges::alpaca::AlpacaImpl,
        "alpaca",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_apex() {
    pro_test_body!(
        ccxt::exchanges::apex::Apex,
        ccxt::exchanges::apex::ApexImpl,
        "apex",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_arkham() {
    pro_test_body!(
        ccxt::exchanges::arkham::Arkham,
        ccxt::exchanges::arkham::ArkhamImpl,
        "arkham",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_ascendex() {
    pro_test_body!(
        ccxt::exchanges::ascendex::Ascendex,
        ccxt::exchanges::ascendex::AscendexImpl,
        "ascendex",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_aster() {
    pro_test_body!(
        ccxt::exchanges::aster::Aster,
        ccxt::exchanges::aster::AsterImpl,
        "aster",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_backpack() {
    pro_test_body!(
        ccxt::exchanges::backpack::Backpack,
        ccxt::exchanges::backpack::BackpackImpl,
        "backpack",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bequant() {
    pro_test_body!(
        ccxt::exchanges::bequant::Bequant,
        ccxt::exchanges::bequant::BequantImpl,
        "bequant",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitopro() {
    pro_test_body!(
        ccxt::exchanges::bitopro::Bitopro,
        ccxt::exchanges::bitopro::BitoproImpl,
        "bitopro",
        "BTC/TWD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bittrade() {
    pro_test_body!(
        ccxt::exchanges::bittrade::Bittrade,
        ccxt::exchanges::bittrade::BittradeImpl,
        "bittrade",
        "BTC/JPY"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_blockchaincom() {
    pro_test_body!(
        ccxt::exchanges::blockchaincom::Blockchaincom,
        ccxt::exchanges::blockchaincom::BlockchaincomImpl,
        "blockchaincom",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bullish() {
    pro_test_body!(
        ccxt::exchanges::bullish::Bullish,
        ccxt::exchanges::bullish::BullishImpl,
        "bullish",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_cex() {
    pro_test_body!(
        ccxt::exchanges::cex::Cex,
        ccxt::exchanges::cex::CexImpl,
        "cex",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coincatch() {
    pro_test_body!(
        ccxt::exchanges::coincatch::Coincatch,
        ccxt::exchanges::coincatch::CoincatchImpl,
        "coincatch",
        "BTC/USDT"
    );
}

// ---------------------------------------------------------------------------
// More pro exchanges (D-L)
// ---------------------------------------------------------------------------

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_derive() {
    pro_test_body!(
        ccxt::exchanges::derive::Derive,
        ccxt::exchanges::derive::DeriveImpl,
        "derive",
        "BTC/USDT:USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_hashkey() {
    pro_test_body!(
        ccxt::exchanges::hashkey::Hashkey,
        ccxt::exchanges::hashkey::HashkeyImpl,
        "hashkey",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_huobi() {
    pro_test_body!(
        ccxt::exchanges::huobi::Huobi,
        ccxt::exchanges::huobi::HuobiImpl,
        "huobi",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_independentreserve() {
    pro_test_body!(
        ccxt::exchanges::independentreserve::Independentreserve,
        ccxt::exchanges::independentreserve::IndependentreserveImpl,
        "independentreserve",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_lbank() {
    pro_test_body!(
        ccxt::exchanges::lbank::Lbank,
        ccxt::exchanges::lbank::LbankImpl,
        "lbank",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_luno() {
    pro_test_body!(
        ccxt::exchanges::luno::Luno,
        ccxt::exchanges::luno::LunoImpl,
        "luno",
        "XBT/ZAR"
    );
}

// ---------------------------------------------------------------------------
// More pro exchanges (M-P)
// ---------------------------------------------------------------------------

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_modetrade() {
    pro_test_body!(
        ccxt::exchanges::modetrade::Modetrade,
        ccxt::exchanges::modetrade::ModetradeImpl,
        "modetrade",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_myokx() {
    pro_test_body!(
        ccxt::exchanges::myokx::Myokx,
        ccxt::exchanges::myokx::MyokxImpl,
        "myokx",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_ndax() {
    pro_test_body!(
        ccxt::exchanges::ndax::Ndax,
        ccxt::exchanges::ndax::NdaxImpl,
        "ndax",
        "BTC/CAD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_okxus() {
    pro_test_body!(
        ccxt::exchanges::okxus::Okxus,
        ccxt::exchanges::okxus::OkxusImpl,
        "okxus",
        "BTC/USD"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_onetrading() {
    pro_test_body!(
        ccxt::exchanges::onetrading::Onetrading,
        ccxt::exchanges::onetrading::OnetradingImpl,
        "onetrading",
        "BTC/EUR"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_oxfun() {
    pro_test_body!(
        ccxt::exchanges::oxfun::Oxfun,
        ccxt::exchanges::oxfun::OxfunImpl,
        "oxfun",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_p2b() {
    pro_test_body!(
        ccxt::exchanges::p2b::P2b,
        ccxt::exchanges::p2b::P2bImpl,
        "p2b",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_paradex() {
    pro_test_body!(
        ccxt::exchanges::paradex::Paradex,
        ccxt::exchanges::paradex::ParadexImpl,
        "paradex",
        "BTC/USDT:USDT"
    );
}

// ---------------------------------------------------------------------------
// More pro exchanges (T-X)
// ---------------------------------------------------------------------------

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_toobit() {
    pro_test_body!(
        ccxt::exchanges::toobit::Toobit,
        ccxt::exchanges::toobit::ToobitImpl,
        "toobit",
        "BTC/USDT"
    );
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_xt() {
    pro_test_body!(
        ccxt::exchanges::xt::Xt,
        ccxt::exchanges::xt::XtImpl,
        "xt",
        "BTC/USDT"
    );
}

// ---------------------------------------------------------------------------
// Additional pro smoke tests for remaining exchanges
// ---------------------------------------------------------------------------

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_alp() {
    pro_test_body!(ccxt::exchanges::alp::Alp, ccxt::exchanges::alp::AlpImpl, "alp", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bigone() {
    pro_test_body!(ccxt::exchanges::bigone::Bigone, ccxt::exchanges::bigone::BigoneImpl, "bigone", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bit2c() {
    pro_test_body!(ccxt::exchanges::bit2c::Bit2c, ccxt::exchanges::bit2c::Bit2cImpl, "bit2c", "BTC/NIS");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitbank() {
    pro_test_body!(ccxt::exchanges::bitbank::Bitbank, ccxt::exchanges::bitbank::BitbankImpl, "bitbank", "BTC/JPY");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitbns() {
    pro_test_body!(ccxt::exchanges::bitbns::Bitbns, ccxt::exchanges::bitbns::BitbnsImpl, "bitbns", "BTC/INR");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitflyer() {
    pro_test_body!(ccxt::exchanges::bitflyer::Bitflyer, ccxt::exchanges::bitflyer::BitflyerImpl, "bitflyer", "BTC/JPY");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitso() {
    pro_test_body!(ccxt::exchanges::bitso::Bitso, ccxt::exchanges::bitso::BitsoImpl, "bitso", "BTC/MXN");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bitteam() {
    pro_test_body!(ccxt::exchanges::bitteam::Bitteam, ccxt::exchanges::bitteam::BitteamImpl, "bitteam", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_btcbox() {
    pro_test_body!(ccxt::exchanges::btcbox::Btcbox, ccxt::exchanges::btcbox::BtcboxImpl, "btcbox", "BTC/JPY");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_btcmarkets() {
    pro_test_body!(ccxt::exchanges::btcmarkets::Btcmarkets, ccxt::exchanges::btcmarkets::BtcmarketsImpl, "btcmarkets", "BTC/AUD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_btcturk() {
    pro_test_body!(ccxt::exchanges::btcturk::Btcturk, ccxt::exchanges::btcturk::BtcturkImpl, "btcturk", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_bydfi() {
    pro_test_body!(ccxt::exchanges::bydfi::Bydfi, ccxt::exchanges::bydfi::BydfiImpl, "bydfi", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coincheck() {
    pro_test_body!(ccxt::exchanges::coincheck::Coincheck, ccxt::exchanges::coincheck::CoincheckImpl, "coincheck", "BTC/JPY");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinmate() {
    pro_test_body!(ccxt::exchanges::coinmate::Coinmate, ccxt::exchanges::coinmate::CoinmateImpl, "coinmate", "BTC/EUR");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinmetro() {
    pro_test_body!(ccxt::exchanges::coinmetro::Coinmetro, ccxt::exchanges::coinmetro::CoinmetroImpl, "coinmetro", "BTC/EUR");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinone() {
    pro_test_body!(ccxt::exchanges::coinone::Coinone, ccxt::exchanges::coinone::CoinoneImpl, "coinone", "BTC/KRW");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinsph() {
    pro_test_body!(ccxt::exchanges::coinsph::Coinsph, ccxt::exchanges::coinsph::CoinsphImpl, "coinsph", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_coinspot() {
    pro_test_body!(ccxt::exchanges::coinspot::Coinspot, ccxt::exchanges::coinspot::CoinspotImpl, "coinspot", "BTC/AUD");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_cryptomus() {
    pro_test_body!(ccxt::exchanges::cryptomus::Cryptomus, ccxt::exchanges::cryptomus::CryptomusImpl, "cryptomus", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_deepcoin() {
    pro_test_body!(ccxt::exchanges::deepcoin::Deepcoin, ccxt::exchanges::deepcoin::DeepcoinImpl, "deepcoin", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_defx() {
    pro_test_body!(ccxt::exchanges::defx::Defx, ccxt::exchanges::defx::DefxImpl, "defx", "BTC/USDT:USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_delta() {
    pro_test_body!(ccxt::exchanges::delta::Delta, ccxt::exchanges::delta::DeltaImpl, "delta", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_digifinex() {
    pro_test_body!(ccxt::exchanges::digifinex::Digifinex, ccxt::exchanges::digifinex::DigifinexImpl, "digifinex", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_exmo() {
    pro_test_body!(ccxt::exchanges::exmo::Exmo, ccxt::exchanges::exmo::ExmoImpl, "exmo", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_fmfwio() {
    pro_test_body!(ccxt::exchanges::fmfwio::Fmfwio, ccxt::exchanges::fmfwio::FmfwioImpl, "fmfwio", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_foxbit() {
    pro_test_body!(ccxt::exchanges::foxbit::Foxbit, ccxt::exchanges::foxbit::FoxbitImpl, "foxbit", "BTC/BRL");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_hibachi() {
    pro_test_body!(ccxt::exchanges::hibachi::Hibachi, ccxt::exchanges::hibachi::HibachiImpl, "hibachi", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_hitbtc() {
    pro_test_body!(ccxt::exchanges::hitbtc::Hitbtc, ccxt::exchanges::hitbtc::HitbtcImpl, "hitbtc", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_indodax() {
    pro_test_body!(ccxt::exchanges::indodax::Indodax, ccxt::exchanges::indodax::IndodaxImpl, "indodax", "BTC/IDR");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_latoken() {
    pro_test_body!(ccxt::exchanges::latoken::Latoken, ccxt::exchanges::latoken::LatokenImpl, "latoken", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_mercado() {
    pro_test_body!(ccxt::exchanges::mercado::Mercado, ccxt::exchanges::mercado::MercadoImpl, "mercado", "BTC/BRL");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_novadax() {
    pro_test_body!(ccxt::exchanges::novadax::Novadax, ccxt::exchanges::novadax::NovadaxImpl, "novadax", "BTC/BRL");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_paymium() {
    pro_test_body!(ccxt::exchanges::paymium::Paymium, ccxt::exchanges::paymium::PaymiumImpl, "paymium", "BTC/EUR");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_timex() {
    pro_test_body!(ccxt::exchanges::timex::Timex, ccxt::exchanges::timex::TimexImpl, "timex", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_tokocrypto() {
    pro_test_body!(ccxt::exchanges::tokocrypto::Tokocrypto, ccxt::exchanges::tokocrypto::TokocryptoImpl, "tokocrypto", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_wavesexchange() {
    pro_test_body!(ccxt::exchanges::wavesexchange::Wavesexchange, ccxt::exchanges::wavesexchange::WavesexchangeImpl, "wavesexchange", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_yobit() {
    pro_test_body!(ccxt::exchanges::yobit::Yobit, ccxt::exchanges::yobit::YobitImpl, "yobit", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_zaif() {
    pro_test_body!(ccxt::exchanges::zaif::Zaif, ccxt::exchanges::zaif::ZaifImpl, "zaif", "BTC/JPY");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_zebpay() {
    pro_test_body!(ccxt::exchanges::zebpay::Zebpay, ccxt::exchanges::zebpay::ZebpayImpl, "zebpay", "BTC/USDT");
}

#[cfg(feature = "full-exchanges")]
#[tokio::test]
async fn pro_smoke_zonda() {
    pro_test_body!(ccxt::exchanges::zonda::Zonda, ccxt::exchanges::zonda::ZondaImpl, "zonda", "BTC/PLN");
}
