# -*- coding: utf-8 -*-

"""CCXT: CryptoCurrency eXchange Trading Library (Async)"""

# -----------------------------------------------------------------------------

__version__ = '4.5.51'

# -----------------------------------------------------------------------------

from ccxt.async_support.base.exchange import Exchange                   # noqa: F401

from ccxt.base.decimal_to_precision import decimal_to_precision  # noqa: F401
from ccxt.base.decimal_to_precision import TRUNCATE              # noqa: F401
from ccxt.base.decimal_to_precision import ROUND                 # noqa: F401
from ccxt.base.decimal_to_precision import TICK_SIZE             # noqa: F401
from ccxt.base.decimal_to_precision import DECIMAL_PLACES        # noqa: F401
from ccxt.base.decimal_to_precision import SIGNIFICANT_DIGITS    # noqa: F401
from ccxt.base.decimal_to_precision import NO_PADDING            # noqa: F401
from ccxt.base.decimal_to_precision import PAD_WITH_ZERO         # noqa: F401

from ccxt.base import errors                                # noqa: F401
from ccxt.base.errors import BaseError                                # noqa: F401
from ccxt.base.errors import ExchangeError                            # noqa: F401
from ccxt.base.errors import AuthenticationError                      # noqa: F401
from ccxt.base.errors import PermissionDenied                         # noqa: F401
from ccxt.base.errors import AccountNotEnabled                        # noqa: F401
from ccxt.base.errors import AccountSuspended                         # noqa: F401
from ccxt.base.errors import OBIPWhitelistError                       # noqa: F401
from ccxt.base.errors import ArgumentsRequired                        # noqa: F401
from ccxt.base.errors import BadRequest                               # noqa: F401
from ccxt.base.errors import BadSymbol                                # noqa: F401
from ccxt.base.errors import OBUntradableSymbol                       # noqa: F401
from ccxt.base.errors import OBClosedPositionError                    # noqa: F401
from ccxt.base.errors import OBOrderUncancellableError                # noqa: F401
from ccxt.base.errors import OBInternalSyncError                      # noqa: F401
from ccxt.base.errors import OBMaxOpenOrdersReached                   # noqa: F401
from ccxt.base.errors import OperationRejected                        # noqa: F401
from ccxt.base.errors import NoChange                                 # noqa: F401
from ccxt.base.errors import MarginModeAlreadySet                     # noqa: F401
from ccxt.base.errors import MarketClosed                             # noqa: F401
from ccxt.base.errors import ManualInteractionNeeded                  # noqa: F401
from ccxt.base.errors import RestrictedLocation                       # noqa: F401
from ccxt.base.errors import InsufficientFunds                        # noqa: F401
from ccxt.base.errors import InvalidAddress                           # noqa: F401
from ccxt.base.errors import AddressPending                           # noqa: F401
from ccxt.base.errors import InvalidOrder                             # noqa: F401
from ccxt.base.errors import OrderNotFound                            # noqa: F401
from ccxt.base.errors import OrderNotCached                           # noqa: F401
from ccxt.base.errors import OrderImmediatelyFillable                 # noqa: F401
from ccxt.base.errors import OrderNotFillable                         # noqa: F401
from ccxt.base.errors import DuplicateOrderId                         # noqa: F401
from ccxt.base.errors import ContractUnavailable                      # noqa: F401
from ccxt.base.errors import NotSupported                             # noqa: F401
from ccxt.base.errors import InvalidProxySettings                     # noqa: F401
from ccxt.base.errors import ExchangeClosedByUser                     # noqa: F401
from ccxt.base.errors import OperationFailed                          # noqa: F401
from ccxt.base.errors import NetworkError                             # noqa: F401
from ccxt.base.errors import DDoSProtection                           # noqa: F401
from ccxt.base.errors import RateLimitExceeded                        # noqa: F401
from ccxt.base.errors import ExchangeNotAvailable                     # noqa: F401
from ccxt.base.errors import OnMaintenance                            # noqa: F401
from ccxt.base.errors import InvalidNonce                             # noqa: F401
from ccxt.base.errors import ChecksumError                            # noqa: F401
from ccxt.base.errors import RequestTimeout                           # noqa: F401
from ccxt.base.errors import BadResponse                              # noqa: F401
from ccxt.base.errors import NullResponse                             # noqa: F401
from ccxt.base.errors import CancelPending                            # noqa: F401
from ccxt.base.errors import UnsubscribeError                         # noqa: F401
from ccxt.base.errors import error_hierarchy                          # noqa: F401


from ccxt.async_support.aftermath import aftermath                              # noqa: F401
from ccxt.async_support.alpaca import alpaca                                    # noqa: F401
from ccxt.async_support.apex import apex                                        # noqa: F401
from ccxt.async_support.arkham import arkham                                    # noqa: F401
from ccxt.async_support.ascendex import ascendex                                # noqa: F401
from ccxt.async_support.aster import aster                                      # noqa: F401
from ccxt.async_support.backpack import backpack                                # noqa: F401
from ccxt.async_support.bequant import bequant                                  # noqa: F401
from ccxt.async_support.bigone import bigone                                    # noqa: F401
from ccxt.async_support.binance import binance                                  # noqa: F401
from ccxt.async_support.binancecoinm import binancecoinm                        # noqa: F401
from ccxt.async_support.binanceus import binanceus                              # noqa: F401
from ccxt.async_support.binanceusdm import binanceusdm                          # noqa: F401
from ccxt.async_support.bingx import bingx                                      # noqa: F401
from ccxt.async_support.bit2c import bit2c                                      # noqa: F401
from ccxt.async_support.bitbank import bitbank                                  # noqa: F401
from ccxt.async_support.bitbns import bitbns                                    # noqa: F401
from ccxt.async_support.bitfinex import bitfinex                                # noqa: F401
from ccxt.async_support.bitflyer import bitflyer                                # noqa: F401
from ccxt.async_support.bitget import bitget                                    # noqa: F401
from ccxt.async_support.bithumb import bithumb                                  # noqa: F401
from ccxt.async_support.bitmart import bitmart                                  # noqa: F401
from ccxt.async_support.bitmex import bitmex                                    # noqa: F401
from ccxt.async_support.bitopro import bitopro                                  # noqa: F401
from ccxt.async_support.bitrue import bitrue                                    # noqa: F401
from ccxt.async_support.bitso import bitso                                      # noqa: F401
from ccxt.async_support.bitstamp import bitstamp                                # noqa: F401
from ccxt.async_support.bitteam import bitteam                                  # noqa: F401
from ccxt.async_support.bittrade import bittrade                                # noqa: F401
from ccxt.async_support.bitvavo import bitvavo                                  # noqa: F401
from ccxt.async_support.blockchaincom import blockchaincom                      # noqa: F401
from ccxt.async_support.blofin import blofin                                    # noqa: F401
from ccxt.async_support.btcbox import btcbox                                    # noqa: F401
from ccxt.async_support.btcmarkets import btcmarkets                            # noqa: F401
from ccxt.async_support.btcturk import btcturk                                  # noqa: F401
from ccxt.async_support.bullish import bullish                                  # noqa: F401
from ccxt.async_support.bybit import bybit                                      # noqa: F401
from ccxt.async_support.bydfi import bydfi                                      # noqa: F401
from ccxt.async_support.cex import cex                                          # noqa: F401
from ccxt.async_support.changenow import changenow                              # noqa: F401
from ccxt.async_support.coinbase import coinbase                                # noqa: F401
from ccxt.async_support.coinbaseadvanced import coinbaseadvanced                # noqa: F401
from ccxt.async_support.coinbaseexchange import coinbaseexchange                # noqa: F401
from ccxt.async_support.coinbaseinternational import coinbaseinternational      # noqa: F401
from ccxt.async_support.coingecko import coingecko                              # noqa: F401
from ccxt.async_support.coincheck import coincheck                              # noqa: F401
from ccxt.async_support.coinex import coinex                                    # noqa: F401
from ccxt.async_support.coinmate import coinmate                                # noqa: F401
from ccxt.async_support.coinmetro import coinmetro                              # noqa: F401
from ccxt.async_support.coinone import coinone                                  # noqa: F401
from ccxt.async_support.coinsph import coinsph                                  # noqa: F401
from ccxt.async_support.coinspot import coinspot                                # noqa: F401
from ccxt.async_support.cryptocom import cryptocom                              # noqa: F401
from ccxt.async_support.cryptomus import cryptomus                              # noqa: F401
from ccxt.async_support.deepcoin import deepcoin                                # noqa: F401
from ccxt.async_support.delta import delta                                      # noqa: F401
from ccxt.async_support.deribit import deribit                                  # noqa: F401
from ccxt.async_support.derive import derive                                    # noqa: F401
from ccxt.async_support.defillama import defillama                              # noqa: F401
from ccxt.async_support.dexscreener import dexscreener                            # noqa: F401
from ccxt.async_support.digifinex import digifinex                              # noqa: F401
from ccxt.async_support.dydx import dydx                                        # noqa: F401
from ccxt.async_support.exmo import exmo                                        # noqa: F401
from ccxt.async_support.exolix import exolix                                    # noqa: F401
from ccxt.async_support.fmfwio import fmfwio                                    # noqa: F401
from ccxt.async_support.foxbit import foxbit                                    # noqa: F401
from ccxt.async_support.gate import gate                                        # noqa: F401
from ccxt.async_support.gateio import gateio                                    # noqa: F401
from ccxt.async_support.gemini import gemini                                    # noqa: F401
from ccxt.async_support.grvt import grvt                                        # noqa: F401
from ccxt.async_support.hashkey import hashkey                                  # noqa: F401
from ccxt.async_support.hibachi import hibachi                                  # noqa: F401
from ccxt.async_support.hitbtc import hitbtc                                    # noqa: F401
from ccxt.async_support.hollaex import hollaex                                  # noqa: F401
from ccxt.async_support.htx import htx                                          # noqa: F401
from ccxt.async_support.huobi import huobi                                      # noqa: F401
from ccxt.async_support.hyperliquid import hyperliquid                          # noqa: F401
from ccxt.async_support.independentreserve import independentreserve            # noqa: F401
from ccxt.async_support.indodax import indodax                                  # noqa: F401
from ccxt.async_support.kraken import kraken                                    # noqa: F401
from ccxt.async_support.krakenfutures import krakenfutures                      # noqa: F401
from ccxt.async_support.kucoin import kucoin                                    # noqa: F401
from ccxt.async_support.kucoinfutures import kucoinfutures                      # noqa: F401
from ccxt.async_support.latoken import latoken                                  # noqa: F401
from ccxt.async_support.lbank import lbank                                      # noqa: F401
from ccxt.async_support.lighter import lighter                                  # noqa: F401
from ccxt.async_support.luno import luno                                        # noqa: F401
from ccxt.async_support.mercado import mercado                                  # noqa: F401
from ccxt.async_support.mexc import mexc                                        # noqa: F401
from ccxt.async_support.modetrade import modetrade                              # noqa: F401
from ccxt.async_support.myokx import myokx                                      # noqa: F401
from ccxt.async_support.ndax import ndax                                        # noqa: F401
from ccxt.async_support.novadax import novadax                                  # noqa: F401
from ccxt.async_support.ob_ascendex import ob_ascendex                          # noqa: F401
from ccxt.async_support.ob_binance import ob_binance                            # noqa: F401
from ccxt.async_support.ob_binanceus import ob_binanceus                        # noqa: F401
from ccxt.async_support.ob_bingx import ob_bingx                                # noqa: F401
from ccxt.async_support.ob_bitfinex import ob_bitfinex                          # noqa: F401
from ccxt.async_support.ob_bitget import ob_bitget                              # noqa: F401
from ccxt.async_support.ob_bitmart import ob_bitmart                            # noqa: F401
from ccxt.async_support.ob_bitmex import ob_bitmex                              # noqa: F401
from ccxt.async_support.ob_bitso import ob_bitso                                # noqa: F401
from ccxt.async_support.ob_bitstamp import ob_bitstamp                          # noqa: F401
from ccxt.async_support.ob_bybit import ob_bybit                                # noqa: F401
from ccxt.async_support.ob_changenow import ob_changenow                        # noqa: F401
from ccxt.async_support.ob_coinbase import ob_coinbase                          # noqa: F401
from ccxt.async_support.ob_coinex import ob_coinex                              # noqa: F401
from ccxt.async_support.ob_coingecko import ob_coingecko                        # noqa: F401
from ccxt.async_support.ob_cryptocom import ob_cryptocom                        # noqa: F401
from ccxt.async_support.ob_dexscreener import ob_dexscreener                  # noqa: F401
from ccxt.async_support.ob_defillama import ob_defillama                      # noqa: F401
from ccxt.async_support.ob_exolix import ob_exolix                            # noqa: F401
from ccxt.async_support.ob_gateio import ob_gateio                              # noqa: F401
from ccxt.async_support.ob_hitbtc import ob_hitbtc                              # noqa: F401
from ccxt.async_support.ob_hollaex import ob_hollaex                            # noqa: F401
from ccxt.async_support.ob_htx import ob_htx                                    # noqa: F401
from ccxt.async_support.ob_hyperliquid import ob_hyperliquid                    # noqa: F401
from ccxt.async_support.ob_kraken import ob_kraken                              # noqa: F401
from ccxt.async_support.ob_kucoin import ob_kucoin                              # noqa: F401
from ccxt.async_support.ob_kucoinfutures import ob_kucoinfutures                # noqa: F401
from ccxt.async_support.ob_lbank import ob_lbank                                # noqa: F401
from ccxt.async_support.ob_mexc import ob_mexc                                  # noqa: F401
from ccxt.async_support.ob_myokx import ob_myokx                                # noqa: F401
from ccxt.async_support.ob_ndax import ob_ndax                                  # noqa: F401
from ccxt.async_support.ob_okx import ob_okx                                    # noqa: F401
from ccxt.async_support.ob_okxus import ob_okxus                                # noqa: F401
from ccxt.async_support.ob_phemex import ob_phemex                              # noqa: F401
from ccxt.async_support.ob_poloniex import ob_poloniex                          # noqa: F401
from ccxt.async_support.ob_simpleswap import ob_simpleswap                      # noqa: F401
from ccxt.async_support.ob_trocador import ob_trocador                          # noqa: F401
from ccxt.async_support.ob_upbit import ob_upbit                                # noqa: F401
from ccxt.async_support.ob_wavesexchange import ob_wavesexchange                # noqa: F401
from ccxt.async_support.ob_wizardswap import ob_wizardswap                      # noqa: F401
from ccxt.async_support.okx import okx                                          # noqa: F401
from ccxt.async_support.okxus import okxus                                      # noqa: F401
from ccxt.async_support.onetrading import onetrading                            # noqa: F401
from ccxt.async_support.oxfun import oxfun                                      # noqa: F401
from ccxt.async_support.p2b import p2b                                          # noqa: F401
from ccxt.async_support.pacifica import pacifica                                # noqa: F401
from ccxt.async_support.paradex import paradex                                  # noqa: F401
from ccxt.async_support.paymium import paymium                                  # noqa: F401
from ccxt.async_support.phemex import phemex                                    # noqa: F401
from ccxt.async_support.poloniex import poloniex                                # noqa: F401
from ccxt.async_support.simpleswap import simpleswap                            # noqa: F401
from ccxt.async_support.tokocrypto import tokocrypto                            # noqa: F401
from ccxt.async_support.toobit import toobit                                    # noqa: F401
from ccxt.async_support.trocador import trocador                                # noqa: F401
from ccxt.async_support.upbit import upbit                                      # noqa: F401
from ccxt.async_support.wavesexchange import wavesexchange                      # noqa: F401
from ccxt.async_support.weex import weex                                        # noqa: F401
from ccxt.async_support.whitebit import whitebit                                # noqa: F401
from ccxt.async_support.wizardswap import wizardswap                            # noqa: F401
from ccxt.async_support.woo import woo                                          # noqa: F401
from ccxt.async_support.woofipro import woofipro                                # noqa: F401
from ccxt.async_support.xt import xt                                            # noqa: F401
from ccxt.async_support.yobit import yobit                                      # noqa: F401
from ccxt.async_support.zaif import zaif                                        # noqa: F401
from ccxt.async_support.zebpay import zebpay                                    # noqa: F401
from ccxt.async_support.zonda import zonda                                      # noqa: F401

exchanges = [
    'aftermath',
    'alpaca',
    'apex',
    'arkham',
    'ascendex',
    'aster',
    'backpack',
    'bequant',
    'bigone',
    'binance',
    'binancecoinm',
    'binanceus',
    'binanceusdm',
    'bingx',
    'bit2c',
    'bitbank',
    'bitbns',
    'bitfinex',
    'bitflyer',
    'bitget',
    'bithumb',
    'bitmart',
    'bitmex',
    'bitopro',
    'bitrue',
    'bitso',
    'bitstamp',
    'bitteam',
    'bittrade',
    'bitvavo',
    'blockchaincom',
    'blofin',
    'btcbox',
    'btcmarkets',
    'btcturk',
    'bullish',
    'bybit',
    'bydfi',
    'cex',
    'changenow',
    'coinbase',
    'coinbaseadvanced',
    'coinbaseexchange',
    'coinbaseinternational',
    'coingecko',
    'coincheck',
    'coinex',
    'coinmate',
    'coinmetro',
    'coinone',
    'coinsph',
    'coinspot',
    'cryptocom',
    'cryptomus',
    'deepcoin',
    'delta',
    'deribit',
    'derive',
    'defillama',
    'dexscreener',
    'digifinex',
    'dydx',
    'exmo',
    'exolix',
    'fmfwio',
    'foxbit',
    'gate',
    'gateio',
    'gemini',
    'grvt',
    'hashkey',
    'hibachi',
    'hitbtc',
    'hollaex',
    'htx',
    'huobi',
    'hyperliquid',
    'independentreserve',
    'indodax',
    'kraken',
    'krakenfutures',
    'kucoin',
    'kucoinfutures',
    'latoken',
    'lbank',
    'lighter',
    'luno',
    'mercado',
    'mexc',
    'modetrade',
    'myokx',
    'ndax',
    'novadax',
    'ob_ascendex',
    'ob_binance',
    'ob_binanceus',
    'ob_bingx',
    'ob_bitfinex',
    'ob_bitget',
    'ob_bitmart',
    'ob_bitmex',
    'ob_bitso',
    'ob_bitstamp',
    'ob_bybit',
    'ob_changenow',
    'ob_coinbase',
    'ob_coinex',
    'ob_coingecko',
    'ob_cryptocom',
    'ob_dexscreener',
    'ob_defillama',
    'ob_exolix',
    'ob_gateio',
    'ob_hitbtc',
    'ob_hollaex',
    'ob_htx',
    'ob_hyperliquid',
    'ob_kraken',
    'ob_kucoin',
    'ob_kucoinfutures',
    'ob_lbank',
    'ob_mexc',
    'ob_myokx',
    'ob_ndax',
    'ob_okx',
    'ob_okxus',
    'ob_phemex',
    'ob_poloniex',
    'ob_simpleswap',
    'ob_trocador',
    'ob_upbit',
    'ob_wavesexchange',
    'ob_wizardswap',
    'okx',
    'okxus',
    'onetrading',
    'oxfun',
    'p2b',
    'pacifica',
    'paradex',
    'paymium',
    'phemex',
    'poloniex',
    'simpleswap',
    'tokocrypto',
    'toobit',
    'trocador',
    'upbit',
    'wavesexchange',
    'weex',
    'whitebit',
    'wizardswap',
    'woo',
    'woofipro',
    'xt',
    'yobit',
    'zaif',
    'zebpay',
    'zonda',
]

base = [
    'Exchange',
    'exchanges',
    'decimal_to_precision',
]

__all__ = base + errors.__all__ + exchanges
