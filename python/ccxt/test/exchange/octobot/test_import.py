# -*- coding: utf-8 -*-

import importlib
import os
import sys
import traceback

import pytest

root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
print("found root: ", root)
sys.path.append(root)
import ccxt as _ccxt_module
import ccxt.async_support as _async_ccxt_module

_SYNC_CCXT_IMPORT_TRACEBACK = None
_ASYNC_CCXT_IMPORT_TRACEBACK = None
SYNC_OB_EXCHANGES = []
ASYNC_OB_EXCHANGES = []
MIN_EXPECTED_OB_EXCHANGES = 2

try:
    SYNC_OB_EXCHANGES = sorted(
        exchange_id for exchange_id in _ccxt_module.exchanges if exchange_id.startswith('ob_')
    )
except Exception:
    _SYNC_CCXT_IMPORT_TRACEBACK = traceback.format_exc()
    SYNC_OB_EXCHANGES = []

try:
    ASYNC_OB_EXCHANGES = sorted(
        exchange_id for exchange_id in _async_ccxt_module.exchanges if exchange_id.startswith('ob_')
    )
except Exception:
    _ASYNC_CCXT_IMPORT_TRACEBACK = traceback.format_exc()
    ASYNC_OB_EXCHANGES = []


def _format_ob_exchange_import_error(qualified_module: str, exchange_name: str) -> str:
    """Build a failure message that points agents at the TS source and retranspile command."""
    ts_relative_path = f'ccxt/ts/src/{exchange_name}.ts'
    message_lines = [
        f'Failed to import `{qualified_module}`.',
        '',
        'This Python module is generated from TypeScript. Do NOT edit the .py file directly.',
        f'TypeScript source: {ts_relative_path}',
        f'After editing the .ts source, retranspile via ccxt/build/transpile-exchange-python.ps1 {exchange_name}.',
        '',
        'Original traceback:',
        traceback.format_exc(),
    ]
    return '\n'.join(message_lines)


def _format_package_import_error(
    package_label: str,
    init_py_relative_path: str,
    traceback_text: str,
) -> str:
    """Explain package-level import failures and tie them back to TS sources."""
    message_lines = [
        f'Failed to import `{package_label}`.',
        '',
        f'The failure occurred while executing imports in `{init_py_relative_path}`.',
        'Each `from ccxt.<name> import <name>` (or the async_support equivalent) corresponds to '
        'generated Python from `ccxt/ts/src/<name>.ts`.',
        'Edit the TypeScript source and retranspile; do not hand-edit generated `.py` files.',
        '',
        'Original traceback:',
        traceback_text,
    ]
    return '\n'.join(message_lines)


def _format_missing_ob_exchanges_error(package_label: str, discovered_count: int) -> str:
    message_lines = [
        f'Only {discovered_count} `ob_` exchanges were discovered in `{package_label}.exchanges`.',
        f'Expected at least {MIN_EXPECTED_OB_EXCHANGES}.',
        '',
        'This usually means package imports were partially broken and exchange exports did not load.',
        'Fix the underlying TypeScript source and retranspile generated Python modules.',
    ]
    return '\n'.join(message_lines)


def test_ccxt_package_imports_cleanly():
    if _SYNC_CCXT_IMPORT_TRACEBACK is None:
        return
    failure_message = _format_package_import_error(
        'ccxt',
        'ccxt/python/ccxt/__init__.py',
        _SYNC_CCXT_IMPORT_TRACEBACK,
    )
    raise AssertionError(failure_message)


def test_ccxt_async_package_imports_cleanly():
    if _ASYNC_CCXT_IMPORT_TRACEBACK is None:
        return
    failure_message = _format_package_import_error(
        'ccxt.async_support',
        'ccxt/python/ccxt/async_support/__init__.py',
        _ASYNC_CCXT_IMPORT_TRACEBACK,
    )
    raise AssertionError(failure_message)


def test_minimum_sync_ob_exchanges_discovered():
    if _SYNC_CCXT_IMPORT_TRACEBACK is not None:
        return
    if len(SYNC_OB_EXCHANGES) >= MIN_EXPECTED_OB_EXCHANGES:
        return
    raise AssertionError(_format_missing_ob_exchanges_error('ccxt', len(SYNC_OB_EXCHANGES)))


def test_minimum_async_ob_exchanges_discovered():
    if _ASYNC_CCXT_IMPORT_TRACEBACK is not None:
        return
    if len(ASYNC_OB_EXCHANGES) >= MIN_EXPECTED_OB_EXCHANGES:
        return
    raise AssertionError(_format_missing_ob_exchanges_error('ccxt.async_support', len(ASYNC_OB_EXCHANGES)))


@pytest.mark.parametrize('exchange_name', SYNC_OB_EXCHANGES)
def test_ob_sync_import(exchange_name):
    assert _SYNC_CCXT_IMPORT_TRACEBACK is None, (
        'ccxt package failed to import; fix test_ccxt_package_imports_cleanly first.'
    )
    qualified_module = f'ccxt.{exchange_name}'
    try:
        exchange_module = importlib.import_module(qualified_module)
        getattr(exchange_module, exchange_name)
    except Exception:
        raise AssertionError(_format_ob_exchange_import_error(qualified_module, exchange_name))


@pytest.mark.parametrize('exchange_name', ASYNC_OB_EXCHANGES)
def test_ob_async_import(exchange_name):
    assert _ASYNC_CCXT_IMPORT_TRACEBACK is None, (
        'ccxt.async_support package failed to import; fix test_ccxt_async_package_imports_cleanly first.'
    )
    qualified_module = f'ccxt.async_support.{exchange_name}'
    try:
        exchange_module = importlib.import_module(qualified_module)
        getattr(exchange_module, exchange_name)
    except Exception:
        raise AssertionError(_format_ob_exchange_import_error(qualified_module, exchange_name))
