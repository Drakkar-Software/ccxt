# -*- coding: utf-8 -*-

"""CCXT: CryptoCurrency eXchange Trading Library"""

# MIT License
# Copyright (c) 2017 Igor Kroitor
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

# ----------------------------------------------------------------------------

__version__ = '4.5.68'

# ----------------------------------------------------------------------------

from ccxt.base.exchange import Exchange                     # noqa: F401
from ccxt.base.precise import Precise                       # noqa: F401

from ccxt.base.decimal_to_precision import decimal_to_precision  # noqa: F401
from ccxt.base.decimal_to_precision import TRUNCATE              # noqa: F401
from ccxt.base.decimal_to_precision import ROUND                 # noqa: F401
from ccxt.base.decimal_to_precision import ROUND_UP              # noqa: F401
from ccxt.base.decimal_to_precision import ROUND_DOWN            # noqa: F401
from ccxt.base.decimal_to_precision import DECIMAL_PLACES        # noqa: F401
from ccxt.base.decimal_to_precision import SIGNIFICANT_DIGITS    # noqa: F401
from ccxt.base.decimal_to_precision import TICK_SIZE             # noqa: F401
from ccxt.base.decimal_to_precision import NO_PADDING            # noqa: F401
from ccxt.base.decimal_to_precision import PAD_WITH_ZERO         # noqa: F401

from ccxt.base import errors
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

from ccxt.alpaca import alpaca                                        # noqa: F401
from ccxt.apex import apex                                            # noqa: F401
from ccxt.aster import aster                                          # noqa: F401
from ccxt.backpack import backpack                                    # noqa: F401
from ccxt.bequant import bequant                                      # noqa: F401
from ccxt.bigone import bigone                                        # noqa: F401
from ccxt.binance import binance                                      # noqa: F401
from ccxt.binancecoinm import binancecoinm                            # noqa: F401
from ccxt.binanceus import binanceus                                  # noqa: F401
from ccxt.binanceusdm import binanceusdm                              # noqa: F401
from ccxt.bingx import bingx                                          # noqa: F401
from ccxt.bit2c import bit2c                                          # noqa: F401
from ccxt.bitbank import bitbank                                      # noqa: F401
from ccxt.bitbns import bitbns                                        # noqa: F401
from ccxt.bitfinex import bitfinex                                    # noqa: F401
from ccxt.bitflyer import bitflyer                                    # noqa: F401
from ccxt.bitget import bitget                                        # noqa: F401
from ccxt.bithumb import bithumb                                      # noqa: F401
from ccxt.bitmart import bitmart                                      # noqa: F401
from ccxt.bitmex import bitmex                                        # noqa: F401
from ccxt.bitopro import bitopro                                      # noqa: F401
from ccxt.bitrue import bitrue                                        # noqa: F401
from ccxt.bitso import bitso                                          # noqa: F401
from ccxt.bitstamp import bitstamp                                    # noqa: F401
from ccxt.bitteam import bitteam                                      # noqa: F401
from ccxt.bittrade import bittrade                                    # noqa: F401
from ccxt.bitvavo import bitvavo                                      # noqa: F401
from ccxt.blockchaincom import blockchaincom                          # noqa: F401
from ccxt.blofin import blofin                                        # noqa: F401
from ccxt.btcbox import btcbox                                        # noqa: F401
from ccxt.btcmarkets import btcmarkets                                # noqa: F401
from ccxt.btcturk import btcturk                                      # noqa: F401
from ccxt.bullish import bullish                                      # noqa: F401
from ccxt.bybit import bybit                                          # noqa: F401
from ccxt.bybiteu import bybiteu                                      # noqa: F401
from ccxt.bydfi import bydfi                                          # noqa: F401
from ccxt.cex import cex                                              # noqa: F401
from ccxt.changenow import changenow                                  # noqa: F401
from ccxt.coinbase import coinbase                                    # noqa: F401
from ccxt.coinbaseexchange import coinbaseexchange                    # noqa: F401
from ccxt.coinbaseinternational import coinbaseinternational          # noqa: F401
from ccxt.coincheck import coincheck                                  # noqa: F401
from ccxt.coinex import coinex                                        # noqa: F401
from ccxt.coingecko import coingecko                                  # noqa: F401
from ccxt.coinmate import coinmate                                    # noqa: F401
from ccxt.coinone import coinone                                      # noqa: F401
from ccxt.coinsph import coinsph                                      # noqa: F401
from ccxt.coinspot import coinspot                                    # noqa: F401
from ccxt.cryptocom import cryptocom                                  # noqa: F401
from ccxt.cryptomus import cryptomus                                  # noqa: F401
from ccxt.deepcoin import deepcoin                                    # noqa: F401
from ccxt.defillama import defillama                                  # noqa: F401
from ccxt.delta import delta                                          # noqa: F401
from ccxt.deribit import deribit                                      # noqa: F401
from ccxt.derive import derive                                        # noqa: F401
from ccxt.dexscreener import dexscreener                              # noqa: F401
from ccxt.digifinex import digifinex                                  # noqa: F401
from ccxt.dydx import dydx                                            # noqa: F401
from ccxt.exmo import exmo                                            # noqa: F401
from ccxt.extended import extended                                    # noqa: F401
from ccxt.fmfwio import fmfwio                                        # noqa: F401
from ccxt.foxbit import foxbit                                        # noqa: F401
from ccxt.gate import gate                                            # noqa: F401
from ccxt.gateeu import gateeu                                        # noqa: F401
from ccxt.gemini import gemini                                        # noqa: F401
from ccxt.grvt import grvt                                            # noqa: F401
from ccxt.hashkey import hashkey                                      # noqa: F401
from ccxt.hibachi import hibachi                                      # noqa: F401
from ccxt.hitbtc import hitbtc                                        # noqa: F401
from ccxt.hollaex import hollaex                                      # noqa: F401
from ccxt.htx import htx                                              # noqa: F401
from ccxt.hyperliquid import hyperliquid                              # noqa: F401
from ccxt.independentreserve import independentreserve                # noqa: F401
from ccxt.indodax import indodax                                      # noqa: F401
from ccxt.kraken import kraken                                        # noqa: F401
from ccxt.krakenfutures import krakenfutures                          # noqa: F401
from ccxt.kucoin import kucoin                                        # noqa: F401
from ccxt.kucoineu import kucoineu                                    # noqa: F401
from ccxt.kucoinfutures import kucoinfutures                          # noqa: F401
from ccxt.latoken import latoken                                      # noqa: F401
from ccxt.lbank import lbank                                          # noqa: F401
from ccxt.lighter import lighter                                      # noqa: F401
from ccxt.luno import luno                                            # noqa: F401
from ccxt.mercado import mercado                                      # noqa: F401
from ccxt.mexc import mexc                                            # noqa: F401
from ccxt.modetrade import modetrade                                  # noqa: F401
from ccxt.mudrex import mudrex                                        # noqa: F401
from ccxt.myokx import myokx                                          # noqa: F401
from ccxt.ndax import ndax                                            # noqa: F401
from ccxt.ob_ascendex import ob_ascendex                              # noqa: F401
from ccxt.ob_binance import ob_binance                                # noqa: F401
from ccxt.ob_binanceus import ob_binanceus                            # noqa: F401
from ccxt.ob_bingx import ob_bingx                                    # noqa: F401
from ccxt.ob_bitfinex import ob_bitfinex                              # noqa: F401
from ccxt.ob_bitget import ob_bitget                                  # noqa: F401
from ccxt.ob_bitmart import ob_bitmart                                # noqa: F401
from ccxt.ob_bitmex import ob_bitmex                                  # noqa: F401
from ccxt.ob_bitso import ob_bitso                                    # noqa: F401
from ccxt.ob_bitstamp import ob_bitstamp                              # noqa: F401
from ccxt.ob_bybit import ob_bybit                                    # noqa: F401
from ccxt.ob_changenow import ob_changenow                            # noqa: F401
from ccxt.ob_coinbase import ob_coinbase                              # noqa: F401
from ccxt.ob_coinex import ob_coinex                                  # noqa: F401
from ccxt.ob_coingecko import ob_coingecko                            # noqa: F401
from ccxt.ob_cryptocom import ob_cryptocom                            # noqa: F401
from ccxt.ob_defillama import ob_defillama                            # noqa: F401
from ccxt.ob_dexscreener import ob_dexscreener                        # noqa: F401
from ccxt.ob_gateio import ob_gateio                                  # noqa: F401
from ccxt.ob_hitbtc import ob_hitbtc                                  # noqa: F401
from ccxt.ob_hollaex import ob_hollaex                                # noqa: F401
from ccxt.ob_htx import ob_htx                                        # noqa: F401
from ccxt.ob_hyperliquid import ob_hyperliquid                        # noqa: F401
from ccxt.ob_kraken import ob_kraken                                  # noqa: F401
from ccxt.ob_kucoin import ob_kucoin                                  # noqa: F401
from ccxt.ob_kucoinfutures import ob_kucoinfutures                    # noqa: F401
from ccxt.ob_lbank import ob_lbank                                    # noqa: F401
from ccxt.ob_mexc import ob_mexc                                      # noqa: F401
from ccxt.ob_myokx import ob_myokx                                    # noqa: F401
from ccxt.ob_ndax import ob_ndax                                      # noqa: F401
from ccxt.ob_okx import ob_okx                                        # noqa: F401
from ccxt.ob_okxus import ob_okxus                                    # noqa: F401
from ccxt.ob_phemex import ob_phemex                                  # noqa: F401
from ccxt.ob_poloniex import ob_poloniex                              # noqa: F401
from ccxt.ob_upbit import ob_upbit                                    # noqa: F401
from ccxt.ob_wavesexchange import ob_wavesexchange                    # noqa: F401
from ccxt.ob_wizardswap import ob_wizardswap                          # noqa: F401
from ccxt.okx import okx                                              # noqa: F401
from ccxt.okxus import okxus                                          # noqa: F401
from ccxt.onetrading import onetrading                                # noqa: F401
from ccxt.p2b import p2b                                              # noqa: F401
from ccxt.pacifica import pacifica                                    # noqa: F401
from ccxt.paradex import paradex                                      # noqa: F401
from ccxt.paymium import paymium                                      # noqa: F401
from ccxt.phemex import phemex                                        # noqa: F401
from ccxt.poloniex import poloniex                                    # noqa: F401
from ccxt.tokocrypto import tokocrypto                                # noqa: F401
from ccxt.toobit import toobit                                        # noqa: F401
from ccxt.upbit import upbit                                          # noqa: F401
from ccxt.weex import weex                                            # noqa: F401
from ccxt.whitebit import whitebit                                    # noqa: F401
from ccxt.wizardswap import wizardswap                                # noqa: F401
from ccxt.woo import woo                                              # noqa: F401
from ccxt.woofipro import woofipro                                    # noqa: F401
from ccxt.xt import xt                                                # noqa: F401
from ccxt.zaif import zaif                                            # noqa: F401
from ccxt.zebpay import zebpay                                        # noqa: F401

exchanges = [
    'alpaca',
    'apex',
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
    'bybiteu',
    'bydfi',
    'cex',
    'changenow',
    'coinbase',
    'coinbaseexchange',
    'coinbaseinternational',
    'coincheck',
    'coinex',
    'coingecko',
    'coinmate',
    'coinone',
    'coinsph',
    'coinspot',
    'cryptocom',
    'cryptomus',
    'deepcoin',
    'defillama',
    'delta',
    'deribit',
    'derive',
    'dexscreener',
    'digifinex',
    'dydx',
    'exmo',
    'extended',
    'fmfwio',
    'foxbit',
    'gate',
    'gateeu',
    'gemini',
    'grvt',
    'hashkey',
    'hibachi',
    'hitbtc',
    'hollaex',
    'htx',
    'hyperliquid',
    'independentreserve',
    'indodax',
    'kraken',
    'krakenfutures',
    'kucoin',
    'kucoineu',
    'kucoinfutures',
    'latoken',
    'lbank',
    'lighter',
    'luno',
    'mercado',
    'mexc',
    'modetrade',
    'mudrex',
    'myokx',
    'ndax',
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
    'ob_defillama',
    'ob_dexscreener',
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
    'ob_upbit',
    'ob_wavesexchange',
    'ob_wizardswap',
    'okx',
    'okxus',
    'onetrading',
    'p2b',
    'pacifica',
    'paradex',
    'paymium',
    'phemex',
    'poloniex',
    'tokocrypto',
    'toobit',
    'upbit',
    'weex',
    'whitebit',
    'wizardswap',
    'woo',
    'woofipro',
    'xt',
    'zaif',
    'zebpay',
]

base = [
    'Exchange',
    'Precise',
    'exchanges',
    'decimal_to_precision',
]

__all__ = base + errors.__all__ + exchanges
