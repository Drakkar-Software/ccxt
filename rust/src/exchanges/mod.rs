// AUTO-GENERATED: rust exchange modules
#[cfg(feature = "full-exchanges")]
pub mod alpaca;
#[cfg(feature = "full-exchanges")]
pub mod apex;
#[cfg(feature = "full-exchanges")]
pub mod arkham;
#[cfg(feature = "full-exchanges")]
pub mod ascendex;
#[cfg(feature = "full-exchanges")]
pub mod backpack;
#[cfg(feature = "full-exchanges")]
pub mod bequant;
#[cfg(feature = "full-exchanges")]
pub mod bigone;
pub mod binance;
#[cfg(feature = "full-exchanges")]
pub mod binancecoinm;
#[cfg(feature = "full-exchanges")]
pub mod binanceus;
#[cfg(feature = "full-exchanges")]
pub mod binanceusdm;
#[cfg(feature = "full-exchanges")]
pub mod bingx;
#[cfg(feature = "full-exchanges")]
pub mod bit2c;
#[cfg(feature = "full-exchanges")]
pub mod bitbank;
#[cfg(feature = "full-exchanges")]
pub mod bitbns;
#[cfg(feature = "full-exchanges")]
pub mod bitfinex;
#[cfg(feature = "full-exchanges")]
pub mod bitflyer;
#[cfg(feature = "full-exchanges")]
pub mod bitget;
#[cfg(feature = "full-exchanges")]
pub mod bithumb;
#[cfg(feature = "full-exchanges")]
pub mod bitmart;
#[cfg(feature = "full-exchanges")]
pub mod bitmex;
#[cfg(feature = "full-exchanges")]
pub mod bitopro;
#[cfg(feature = "full-exchanges")]
pub mod bitrue;
#[cfg(feature = "full-exchanges")]
pub mod bitso;
#[cfg(feature = "full-exchanges")]
pub mod bitstamp;
#[cfg(feature = "full-exchanges")]
pub mod bitteam;
#[cfg(feature = "full-exchanges")]
pub mod bittrade;
#[cfg(feature = "full-exchanges")]
pub mod bitvavo;
#[cfg(feature = "full-exchanges")]
pub mod blockchaincom;
#[cfg(feature = "full-exchanges")]
pub mod blofin;
#[cfg(feature = "full-exchanges")]
pub mod btcbox;
#[cfg(feature = "full-exchanges")]
pub mod btcmarkets;
#[cfg(feature = "full-exchanges")]
pub mod btcturk;
#[cfg(feature = "full-exchanges")]
pub mod bullish;
#[cfg(feature = "full-exchanges")]
pub mod bybit;
#[cfg(feature = "full-exchanges")]
pub mod cex;
#[cfg(feature = "full-exchanges")]
pub mod coinbase;
#[cfg(feature = "full-exchanges")]
pub mod coinbaseadvanced;
#[cfg(feature = "full-exchanges")]
pub mod coinbaseexchange;
#[cfg(feature = "full-exchanges")]
pub mod coinbaseinternational;
#[cfg(feature = "full-exchanges")]
pub mod coincatch;
#[cfg(feature = "full-exchanges")]
pub mod coincheck;
#[cfg(feature = "full-exchanges")]
pub mod coinex;
#[cfg(feature = "full-exchanges")]
pub mod coinmate;
#[cfg(feature = "full-exchanges")]
pub mod coinmetro;
#[cfg(feature = "full-exchanges")]
pub mod coinone;
#[cfg(feature = "full-exchanges")]
pub mod coinsph;
#[cfg(feature = "full-exchanges")]
pub mod coinspot;
#[cfg(feature = "full-exchanges")]
pub mod cryptocom;
#[cfg(feature = "full-exchanges")]
pub mod cryptomus;
#[cfg(feature = "full-exchanges")]
pub mod deepcoin;
#[cfg(feature = "full-exchanges")]
pub mod defx;
#[cfg(feature = "full-exchanges")]
pub mod delta;
#[cfg(feature = "full-exchanges")]
pub mod deribit;
#[cfg(feature = "full-exchanges")]
pub mod derive;
#[cfg(feature = "full-exchanges")]
pub mod digifinex;
#[cfg(feature = "full-exchanges")]
pub mod dydx;
#[cfg(feature = "full-exchanges")]
pub mod exmo;
#[cfg(feature = "full-exchanges")]
pub mod fmfwio;
#[cfg(feature = "full-exchanges")]
pub mod foxbit;
#[cfg(feature = "full-exchanges")]
pub mod gate;
#[cfg(feature = "full-exchanges")]
pub mod gateio;
#[cfg(feature = "full-exchanges")]
pub mod gemini;
#[cfg(feature = "full-exchanges")]
pub mod hashkey;
#[cfg(feature = "full-exchanges")]
pub mod hibachi;
#[cfg(feature = "full-exchanges")]
pub mod hitbtc;
#[cfg(feature = "full-exchanges")]
pub mod hollaex;
#[cfg(feature = "full-exchanges")]
pub mod htx;
#[cfg(feature = "full-exchanges")]
pub mod huobi;
#[cfg(feature = "full-exchanges")]
pub mod hyperliquid;
#[cfg(feature = "full-exchanges")]
pub mod independentreserve;
#[cfg(feature = "full-exchanges")]
pub mod indodax;
#[cfg(feature = "full-exchanges")]
pub mod kraken;
#[cfg(feature = "full-exchanges")]
pub mod krakenfutures;
#[cfg(feature = "full-exchanges")]
pub mod kucoin;
#[cfg(feature = "full-exchanges")]
pub mod kucoinfutures;
#[cfg(feature = "full-exchanges")]
pub mod latoken;
#[cfg(feature = "full-exchanges")]
pub mod lbank;
#[cfg(feature = "full-exchanges")]
pub mod luno;
#[cfg(feature = "full-exchanges")]
pub mod mercado;
#[cfg(feature = "full-exchanges")]
pub mod mexc;
#[cfg(feature = "full-exchanges")]
pub mod modetrade;
#[cfg(feature = "full-exchanges")]
pub mod myokx;
#[cfg(feature = "full-exchanges")]
pub mod ndax;
#[cfg(feature = "full-exchanges")]
pub mod novadax;
#[cfg(feature = "full-exchanges")]
pub mod okx;
#[cfg(feature = "full-exchanges")]
pub mod okxus;
#[cfg(feature = "full-exchanges")]
pub mod onetrading;
#[cfg(feature = "full-exchanges")]
pub mod oxfun;
#[cfg(feature = "full-exchanges")]
pub mod p2b;
#[cfg(feature = "full-exchanges")]
pub mod paradex;
#[cfg(feature = "full-exchanges")]
pub mod paymium;
#[cfg(feature = "full-exchanges")]
pub mod phemex;
#[cfg(feature = "full-exchanges")]
pub mod poloniex;
#[cfg(feature = "full-exchanges")]
pub mod probit;
#[cfg(feature = "full-exchanges")]
pub mod timex;
#[cfg(feature = "full-exchanges")]
pub mod tokocrypto;
#[cfg(feature = "full-exchanges")]
pub mod toobit;
#[cfg(feature = "full-exchanges")]
pub mod upbit;
#[cfg(feature = "full-exchanges")]
pub mod wavesexchange;
#[cfg(feature = "full-exchanges")]
pub mod whitebit;
#[cfg(feature = "full-exchanges")]
pub mod woo;
#[cfg(feature = "full-exchanges")]
pub mod woofipro;
#[cfg(feature = "full-exchanges")]
pub mod xt;
#[cfg(feature = "full-exchanges")]
pub mod yobit;
#[cfg(feature = "full-exchanges")]
pub mod zaif;
#[cfg(feature = "full-exchanges")]
pub mod zonda;

/// Create a boxed ccxt exchange by lowercase name string.
///
/// Returns `None` for unknown exchange names. Config is the JSON config value
/// passed to the exchange constructor (apiKey, secret, password, options, etc.).
pub fn create_exchange(
    name: &str,
    config: crate::exchange::Value,
) -> Option<Box<dyn crate::exchange::Exchange + Send>> {
    macro_rules! make {
        ($mod:ident, $impl:ident) => {
            Some(Box::new($mod::$impl::new(config)) as Box<dyn crate::exchange::Exchange + Send>)
        };
    }
    match name.to_lowercase().as_str() {
        "binance" => make!(binance, BinanceImpl),
        #[cfg(feature = "full-exchanges")]
        "alpaca" => make!(alpaca, AlpacaImpl),
        #[cfg(feature = "full-exchanges")]
        "apex" => make!(apex, ApexImpl),
        #[cfg(feature = "full-exchanges")]
        "arkham" => make!(arkham, ArkhamImpl),
        #[cfg(feature = "full-exchanges")]
        "ascendex" => make!(ascendex, AscendexImpl),
        #[cfg(feature = "full-exchanges")]
        "backpack" => make!(backpack, BackpackImpl),
        #[cfg(feature = "full-exchanges")]
        "bequant" => make!(bequant, BequantImpl),
        #[cfg(feature = "full-exchanges")]
        "bigone" => make!(bigone, BigoneImpl),
        #[cfg(feature = "full-exchanges")]
        "binancecoinm" => make!(binancecoinm, BinancecoinmImpl),
        #[cfg(feature = "full-exchanges")]
        "binanceus" => make!(binanceus, BinanceusImpl),
        #[cfg(feature = "full-exchanges")]
        "binanceusdm" => make!(binanceusdm, BinanceusdmImpl),
        #[cfg(feature = "full-exchanges")]
        "bingx" => make!(bingx, BingxImpl),
        #[cfg(feature = "full-exchanges")]
        "bit2c" => make!(bit2c, Bit2cImpl),
        #[cfg(feature = "full-exchanges")]
        "bitbank" => make!(bitbank, BitbankImpl),
        #[cfg(feature = "full-exchanges")]
        "bitbns" => make!(bitbns, BitbnsImpl),
        #[cfg(feature = "full-exchanges")]
        "bitfinex" => make!(bitfinex, BitfinexImpl),
        #[cfg(feature = "full-exchanges")]
        "bitflyer" => make!(bitflyer, BitflyerImpl),
        #[cfg(feature = "full-exchanges")]
        "bitget" => make!(bitget, BitgetImpl),
        #[cfg(feature = "full-exchanges")]
        "bithumb" => make!(bithumb, BithumbImpl),
        #[cfg(feature = "full-exchanges")]
        "bitmart" => make!(bitmart, BitmartImpl),
        #[cfg(feature = "full-exchanges")]
        "bitmex" => make!(bitmex, BitmexImpl),
        #[cfg(feature = "full-exchanges")]
        "bitopro" => make!(bitopro, BitoproImpl),
        #[cfg(feature = "full-exchanges")]
        "bitrue" => make!(bitrue, BitrueImpl),
        #[cfg(feature = "full-exchanges")]
        "bitso" => make!(bitso, BitsoImpl),
        #[cfg(feature = "full-exchanges")]
        "bitstamp" => make!(bitstamp, BitstampImpl),
        #[cfg(feature = "full-exchanges")]
        "bitteam" => make!(bitteam, BitteamImpl),
        #[cfg(feature = "full-exchanges")]
        "bittrade" => make!(bittrade, BittradeImpl),
        #[cfg(feature = "full-exchanges")]
        "bitvavo" => make!(bitvavo, BitvavoImpl),
        #[cfg(feature = "full-exchanges")]
        "blockchaincom" => make!(blockchaincom, BlockchaincomImpl),
        #[cfg(feature = "full-exchanges")]
        "blofin" => make!(blofin, BlofinImpl),
        #[cfg(feature = "full-exchanges")]
        "btcbox" => make!(btcbox, BtcboxImpl),
        #[cfg(feature = "full-exchanges")]
        "btcmarkets" => make!(btcmarkets, BtcmarketsImpl),
        #[cfg(feature = "full-exchanges")]
        "btcturk" => make!(btcturk, BtcturkImpl),
        #[cfg(feature = "full-exchanges")]
        "bullish" => make!(bullish, BullishImpl),
        #[cfg(feature = "full-exchanges")]
        "bybit" => make!(bybit, BybitImpl),
        #[cfg(feature = "full-exchanges")]
        "cex" => make!(cex, CexImpl),
        #[cfg(feature = "full-exchanges")]
        "coinbase" => make!(coinbase, CoinbaseImpl),
        #[cfg(feature = "full-exchanges")]
        "coinbaseadvanced" => make!(coinbaseadvanced, CoinbaseadvancedImpl),
        #[cfg(feature = "full-exchanges")]
        "coinbaseexchange" => make!(coinbaseexchange, CoinbaseexchangeImpl),
        #[cfg(feature = "full-exchanges")]
        "coinbaseinternational" => make!(coinbaseinternational, CoinbaseinternationalImpl),
        #[cfg(feature = "full-exchanges")]
        "coincatch" => make!(coincatch, CoincatchImpl),
        #[cfg(feature = "full-exchanges")]
        "coincheck" => make!(coincheck, CoincheckImpl),
        #[cfg(feature = "full-exchanges")]
        "coinex" => make!(coinex, CoinexImpl),
        #[cfg(feature = "full-exchanges")]
        "coinmate" => make!(coinmate, CoinmateImpl),
        #[cfg(feature = "full-exchanges")]
        "coinmetro" => make!(coinmetro, CoinmetroImpl),
        #[cfg(feature = "full-exchanges")]
        "coinone" => make!(coinone, CoinoneImpl),
        #[cfg(feature = "full-exchanges")]
        "coinsph" => make!(coinsph, CoinsphImpl),
        #[cfg(feature = "full-exchanges")]
        "coinspot" => make!(coinspot, CoinspotImpl),
        #[cfg(feature = "full-exchanges")]
        "cryptocom" | "crypto.com" => make!(cryptocom, CryptocomImpl),
        #[cfg(feature = "full-exchanges")]
        "cryptomus" => make!(cryptomus, CryptomusImpl),
        #[cfg(feature = "full-exchanges")]
        "deepcoin" => make!(deepcoin, DeepcoinImpl),
        #[cfg(feature = "full-exchanges")]
        "defx" => make!(defx, DefxImpl),
        #[cfg(feature = "full-exchanges")]
        "delta" => make!(delta, DeltaImpl),
        #[cfg(feature = "full-exchanges")]
        "deribit" => make!(deribit, DeribitImpl),
        #[cfg(feature = "full-exchanges")]
        "derive" => make!(derive, DeriveImpl),
        #[cfg(feature = "full-exchanges")]
        "digifinex" => make!(digifinex, DigifinexImpl),
        #[cfg(feature = "full-exchanges")]
        "dydx" => make!(dydx, DydxImpl),
        #[cfg(feature = "full-exchanges")]
        "exmo" => make!(exmo, ExmoImpl),
        #[cfg(feature = "full-exchanges")]
        "fmfwio" => make!(fmfwio, FmfwioImpl),
        #[cfg(feature = "full-exchanges")]
        "foxbit" => make!(foxbit, FoxbitImpl),
        #[cfg(feature = "full-exchanges")]
        "gate" => make!(gate, GateImpl),
        #[cfg(feature = "full-exchanges")]
        "gateio" => make!(gateio, GateioImpl),
        #[cfg(feature = "full-exchanges")]
        "gemini" => make!(gemini, GeminiImpl),
        #[cfg(feature = "full-exchanges")]
        "hashkey" => make!(hashkey, HashkeyImpl),
        #[cfg(feature = "full-exchanges")]
        "hibachi" => make!(hibachi, HibachiImpl),
        #[cfg(feature = "full-exchanges")]
        "hitbtc" => make!(hitbtc, HitbtcImpl),
        #[cfg(feature = "full-exchanges")]
        "hollaex" => make!(hollaex, HollaexImpl),
        #[cfg(feature = "full-exchanges")]
        "htx" => make!(htx, HtxImpl),
        #[cfg(feature = "full-exchanges")]
        "huobi" => make!(huobi, HuobiImpl),
        #[cfg(feature = "full-exchanges")]
        "hyperliquid" => make!(hyperliquid, HyperliquidImpl),
        #[cfg(feature = "full-exchanges")]
        "independentreserve" => make!(independentreserve, IndependentreserveImpl),
        #[cfg(feature = "full-exchanges")]
        "indodax" => make!(indodax, IndodaxImpl),
        #[cfg(feature = "full-exchanges")]
        "kraken" => make!(kraken, KrakenImpl),
        #[cfg(feature = "full-exchanges")]
        "krakenfutures" => make!(krakenfutures, KrakenfuturesImpl),
        #[cfg(feature = "full-exchanges")]
        "kucoin" => make!(kucoin, KucoinImpl),
        #[cfg(feature = "full-exchanges")]
        "kucoinfutures" => make!(kucoinfutures, KucoinfuturesImpl),
        #[cfg(feature = "full-exchanges")]
        "latoken" => make!(latoken, LatokenImpl),
        #[cfg(feature = "full-exchanges")]
        "lbank" => make!(lbank, LbankImpl),
        #[cfg(feature = "full-exchanges")]
        "luno" => make!(luno, LunoImpl),
        #[cfg(feature = "full-exchanges")]
        "mercado" => make!(mercado, MercadoImpl),
        #[cfg(feature = "full-exchanges")]
        "mexc" => make!(mexc, MexcImpl),
        #[cfg(feature = "full-exchanges")]
        "modetrade" => make!(modetrade, ModetradeImpl),
        #[cfg(feature = "full-exchanges")]
        "myokx" => make!(myokx, MyokxImpl),
        #[cfg(feature = "full-exchanges")]
        "ndax" => make!(ndax, NdaxImpl),
        #[cfg(feature = "full-exchanges")]
        "novadax" => make!(novadax, NovadaxImpl),
        #[cfg(feature = "full-exchanges")]
        "okx" => make!(okx, OkxImpl),
        #[cfg(feature = "full-exchanges")]
        "okxus" => make!(okxus, OkxusImpl),
        #[cfg(feature = "full-exchanges")]
        "onetrading" => make!(onetrading, OnetradingImpl),
        #[cfg(feature = "full-exchanges")]
        "oxfun" => make!(oxfun, OxfunImpl),
        #[cfg(feature = "full-exchanges")]
        "p2b" => make!(p2b, P2bImpl),
        #[cfg(feature = "full-exchanges")]
        "paradex" => make!(paradex, ParadexImpl),
        #[cfg(feature = "full-exchanges")]
        "paymium" => make!(paymium, PaymiumImpl),
        #[cfg(feature = "full-exchanges")]
        "phemex" => make!(phemex, PhemexImpl),
        #[cfg(feature = "full-exchanges")]
        "poloniex" => make!(poloniex, PoloniexImpl),
        #[cfg(feature = "full-exchanges")]
        "probit" => make!(probit, ProbitImpl),
        #[cfg(feature = "full-exchanges")]
        "timex" => make!(timex, TimexImpl),
        #[cfg(feature = "full-exchanges")]
        "tokocrypto" => make!(tokocrypto, TokocryptoImpl),
        #[cfg(feature = "full-exchanges")]
        "toobit" => make!(toobit, ToobitImpl),
        #[cfg(feature = "full-exchanges")]
        "upbit" => make!(upbit, UpbitImpl),
        #[cfg(feature = "full-exchanges")]
        "wavesexchange" => make!(wavesexchange, WavesexchangeImpl),
        #[cfg(feature = "full-exchanges")]
        "whitebit" => make!(whitebit, WhitebitImpl),
        #[cfg(feature = "full-exchanges")]
        "woo" => make!(woo, WooImpl),
        #[cfg(feature = "full-exchanges")]
        "woofipro" => make!(woofipro, WoofiproImpl),
        #[cfg(feature = "full-exchanges")]
        "xt" => make!(xt, XtImpl),
        #[cfg(feature = "full-exchanges")]
        "yobit" => make!(yobit, YobitImpl),
        #[cfg(feature = "full-exchanges")]
        "zaif" => make!(zaif, ZaifImpl),
        #[cfg(feature = "full-exchanges")]
        "zonda" => make!(zonda, ZondaImpl),
        _ => None,
    }
}
