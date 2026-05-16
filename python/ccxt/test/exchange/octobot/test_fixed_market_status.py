# -*- coding: utf-8 -*-

import os
import sys

import pytest

_root = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
)
sys.path.insert(0, _root)

import ccxt  # noqa: E402


def _synthetic_market(info_marker: dict) -> dict:
    return {
        'id': 's',
        'symbol': 'BTC/USDT',
        'base': 'BTC',
        'quote': 'USDT',
        'baseId': 'BTC',
        'quoteId': 'USDT',
        'type': 'spot',
        'spot': True,
        'margin': False,
        'swap': False,
        'future': False,
        'option': False,
        'contract': False,
        'precision': {
            'amount': '0.001',
            'price': '0.01',
        },
        'limits': {
            'amount': {
                'min': '1',
                'max': '10',
            },
            'price': {
                'min': '100',
                'max': '200',
            },
            'cost': {
                'min': 'oops',
                'max': '1e6',
            },
        },
        'contractSize': '100',
        'info': info_marker,
    }


class TestExchangeObGetFixedMarketStatus:
    """Parity with ccxt/ts/src/test/Exchange/ob_tests/test.ob.exchange.marketstatus.ts."""

    def test_fix_market_status_precision_becomes_digit_counts(self):
        info_marker = {'k': 1}
        market = _synthetic_market(info_marker)
        ex = ccxt.Exchange(
            {
                'id': 'ob_ms_test',
                'markets': {'BTC/USDT': market},
                'options': {
                    'octobot': {
                        'fixMarketStatus': True,
                    },
                },
            }
        )
        fixed = ex.ob_get_fixed_market_status('BTC/USDT')
        assert fixed['precision']['amount'] == 3
        assert fixed['precision']['price'] == 2
        assert market['precision']['amount'] == '0.001'

    def test_remove_market_status_price_limits(self):
        info_marker = {}
        market = _synthetic_market(info_marker)
        ex = ccxt.Exchange(
            {
                'id': 'ob_ms_test',
                'markets': {'BTC/USDT': market},
                'options': {
                    'octobot': {
                        'removeMarketStatusPriceLimits': True,
                    },
                },
            }
        )
        fixed = ex.ob_get_fixed_market_status('BTC/USDT')
        assert fixed['limits']['price']['min'] is None
        assert fixed['limits']['price']['max'] is None
        assert market['limits']['price']['min'] == '100'

    def test_adapt_market_status_for_contract_size(self):
        info_marker = {}
        market = _synthetic_market(info_marker)
        ex = ccxt.Exchange(
            {
                'id': 'ob_ms_test',
                'markets': {'BTC/USDT': market},
                'options': {
                    'octobot': {
                        'adaptMarketStatusForContractSize': True,
                    },
                },
            }
        )
        fixed = ex.ob_get_fixed_market_status('BTC/USDT')
        assert fixed['limits']['amount']['min'] == 100
        assert fixed['limits']['amount']['max'] == 1000
        assert fixed['precision']['amount'] == 2

    def test_fix_then_adapt_final_precision_amount_from_contract_size(self):
        info_marker = {}
        market = _synthetic_market(info_marker)
        ex = ccxt.Exchange(
            {
                'id': 'ob_ms_test',
                'markets': {'BTC/USDT': market},
                'options': {
                    'octobot': {
                        'fixMarketStatus': True,
                        'adaptMarketStatusForContractSize': True,
                    },
                },
            }
        )
        fixed = ex.ob_get_fixed_market_status('BTC/USDT')
        assert fixed['precision']['price'] == 2
        assert fixed['precision']['amount'] == 2

    def test_coercion_failure_sets_none(self):
        info_marker = {}
        market = _synthetic_market(info_marker)
        ex = ccxt.Exchange(
            {
                'id': 'ob_ms_test',
                'markets': {'BTC/USDT': market},
                'options': {},
            }
        )
        fixed = ex.ob_get_fixed_market_status('BTC/USDT')
        assert fixed['limits']['cost']['min'] is None
        assert fixed['limits']['cost']['max'] == 1_000_000

    def test_does_not_mutate_cached_market_shares_info(self):
        info_marker = {'tag': 'x'}
        market = _synthetic_market(info_marker)
        before_amount = market['precision']['amount']
        limits_amount_min = market['limits']['amount']['min']
        ex = ccxt.Exchange(
            {
                'id': 'ob_ms_test',
                'markets': {'BTC/USDT': market},
                'options': {
                    'octobot': {
                        'fixMarketStatus': True,
                        'adaptMarketStatusForContractSize': True,
                    },
                },
            }
        )
        fixed = ex.ob_get_fixed_market_status('BTC/USDT')
        assert fixed['info'] is info_marker
        assert before_amount == market['precision']['amount']
        assert limits_amount_min == market['limits']['amount']['min']
        assert fixed['precision'] is not market['precision']
        assert fixed['limits']['amount'] is not market['limits']['amount']
        assert market['limits']['cost']['min'] == 'oops'
        assert fixed['limits']['cost'] is not market['limits']['cost']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
