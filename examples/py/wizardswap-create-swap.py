# WizardSwap — create a swap order and poll until finished
# No API key needed
#
# ⚠ This example actually creates a real swap.
#   You must send the exact deposit amount within 15 minutes.
#
# Usage:
#   python examples/py/wizardswap-create-swap.py <BTC_ADDRESS> [XMR_AMOUNT]
#
# Example:
#   python examples/py/wizardswap-create-swap.py bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh 0.5

import sys
import time
import ccxt


def main():
    if len(sys.argv) < 2:
        print('Usage: python examples/py/wizardswap-create-swap.py <BTC_ADDRESS> [XMR_AMOUNT]')
        sys.exit(1)

    btc_address = sys.argv[1]
    xmr_amount = float(sys.argv[2]) if len(sys.argv) > 2 else 0.1

    exchange = ccxt.wizardswap()
    exchange.load_markets()

    # 1. Estimate
    print(f'Estimating {xmr_amount} XMR -> BTC …')
    ticker = exchange.fetch_ticker('XMR/BTC', {'amount_from': str(xmr_amount)})
    print(f'  Estimated receive: ~{ticker["last"]} BTC (2.2% fee included)\n')

    # 2. Create exchange
    print('Creating swap order…')
    order = exchange.create_order('XMR/BTC', 'market', 'sell', xmr_amount, None, {
        'address_to': btc_address,
    })

    print(f'  Order ID:         {order["id"]}')
    print(f'  Deposit address:  {order["info"]["address_from"]}')
    if order['info'].get('extra_id_from'):
        print(f'  Extra ID / Memo:  {order["info"]["extra_id_from"]}')
    print(f'  Send exactly:     {xmr_amount} XMR')
    print(f'  Expected receive: ~{order["price"]} BTC -> {btc_address}')
    print(f'  You have 15 minutes to send the deposit!\n')

    input('  Press Enter once sent to start polling…\n')

    # 3. Poll
    print('Polling for status (Ctrl+C to stop)…')
    terminal = {'closed', 'canceled'}
    poll_interval = 20

    while True:
        status = exchange.fetch_order(order['id'])
        raw_status = status['info']['status']
        print(f'  [status] {raw_status}  (unified: {status["status"]})')

        if status['status'] in terminal:
            if raw_status == 'finished':
                print(f'\nSwap finished!')
                print(f'  BTC received: {status["info"]["amount_to"]}')
                print(f'  Payout tx:    {status["info"]["tx_to"]}')
            else:
                print(f'\nSwap ended with status: {raw_status}')
            break

        time.sleep(poll_interval)


if __name__ == '__main__':
    main()
