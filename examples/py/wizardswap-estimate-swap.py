# WizardSwap — estimate a swap rate
# No API key needed
#
# Usage:  python examples/py/wizardswap-estimate-swap.py [BASE/QUOTE] [amount]
# E.g.:   python examples/py/wizardswap-estimate-swap.py XMR/BTC 1

import sys
import ccxt

def main():
    symbol = sys.argv[1] if len(sys.argv) > 1 else 'XMR/BTC'
    amount_from = sys.argv[2] if len(sys.argv) > 2 else '1'

    exchange = ccxt.wizardswap()

    # Load markets (fetches currencies automatically)
    exchange.load_markets()

    print(f'Estimating {amount_from} {symbol} swap on WizardSwap…')

    ticker = exchange.fetch_ticker(symbol, {'amount_from': amount_from})

    base, quote = symbol.split('/')
    print(f'  Estimated receive: ~{ticker["last"]} {quote}')
    print(f'  Fee:               2.2% (included in estimate)')
    print(f'  Full response: {ticker["info"]}')


if __name__ == '__main__':
    main()
