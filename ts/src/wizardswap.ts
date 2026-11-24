
//  ---------------------------------------------------------------------------

import Exchange from './abstract/wizardswap.js';
import { ExchangeError, BadRequest, ArgumentsRequired, InvalidOrder, NotSupported, OrderNotFound } from './base/errors.js';
import { TICK_SIZE } from './base/functions/number.js';
import type { Market, Str, Dict, Ticker, Num, Currencies, int, Order, OrderType, OrderSide } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class wizardswap
 * @augments Exchange
 * @description WizardSwap - No-account, no-API-key cryptocurrency swap service
 * with own liquidity pool. Fixed 2.2% fee, floating rate only.
 * Docs: https://www.wizardswap.io/api
 */
export default class wizardswap extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'wizardswap',
            'name': 'WizardSwap',
            'countries': [ ],   // decentralized, no jurisdiction
            'rateLimit': 1000,
            'version': 'v1',
            'certified': false,
            'pro': false,
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'cancelOrder': false,
                'createDepositAddress': false,
                'createOrder': true,
                'fetchBalance': false,
                'fetchCurrencies': true,
                'fetchDepositAddress': false,
                'fetchDepositAddresses': false,
                'fetchDepositAddressesByNetwork': false,
                'fetchFundingHistory': false,
                'fetchFundingRate': false,
                'fetchFundingRateHistory': false,
                'fetchFundingRates': false,
                'fetchIndexOHLCV': false,
                'fetchMarkets': true,
                'fetchMarkOHLCV': false,
                'fetchOpenInterestHistory': false,
                'fetchOrder': true,
                'fetchOrderBook': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchTicker': true,
                'fetchTrades': false,
                'fetchTradingFee': false,
                'fetchTradingFees': false,
                'transfer': false,
            },
            'urls': {
                'logo': 'https://www.wizardswap.io/favicon.ico',
                'api': {
                    'rest': 'https://www.wizardswap.io/api',
                },
                'www': 'https://www.wizardswap.io',
                'status': 'https://www.wizardswap.io/action=get_status',
                'doc': [
                    'https://www.wizardswap.io/api',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'currency',
                        'currency/{symbol}',
                        'pairs',
                        'pairs/{symbol}',
                    ],
                    'post': [
                        'estimate',
                        'exchange',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'percentage': true,
                    'maker': this.parseNumber ('0.022'),
                    'taker': this.parseNumber ('0.022'),
                },
            },
            // WizardSwap does not support OHLCV, but OctoBot requires at least
            // one time frame for exchange manager initialization.
            'timeframes': {
                '1d': '1d',
            },
            'precisionMode': TICK_SIZE,
            'requiredCredentials': {
                'apiKey': false,
                'secret': false,
            },
            'features': {
                'spot': {
                    'sandbox': false,
                    'createOrder': {
                        'marginMode': false,
                        'triggerPrice': false,
                        'triggerPriceType': undefined,
                        'triggerDirection': false,
                        'stopLossPrice': false,
                        'takeProfitPrice': false,
                        'attachedStopLossTakeProfit': undefined,
                        'timeInForce': {
                            'IOC': false,
                            'FOK': false,
                            'PO': false,
                            'GTD': false,
                        },
                        'hedged': false,
                        'leverage': false,
                        'marketBuyRequiresPrice': false,
                        'marketBuyByCost': false,
                        'selfTradePrevention': false,
                        'trailing': false,
                        'iceberg': false,
                    },
                    'createOrders': undefined,
                    'fetchMyTrades': undefined,
                    'fetchOrder': {
                        'marginMode': false,
                        'trigger': false,
                        'trailing': false,
                        'symbolRequired': false,
                    },
                    'fetchOpenOrders': undefined,
                    'fetchOrders': undefined,
                    'fetchClosedOrders': undefined,
                    'fetchOHLCV': undefined,
                },
                'swap': {
                    'linear': undefined,
                    'inverse': undefined,
                },
                'future': {
                    'linear': undefined,
                    'inverse': undefined,
                },
            },
            'options': {
                // Route via Tor hidden service; requires a SOCKS proxy at the transport layer.
                'useOnion': false,
                'onionUrl': 'http://wizardswgtu2ovor7r2esg3cxdpt7tv4nrugi32lldv53zmtonbz6sid.onion/api',
                // Hardcoded fallback when GET /currency is unreachable (e.g. DDoS-Guard blocks GET).
                'defaultCurrencyIds': [
                    'btc', 'xmr', 'eth', 'ltc', 'bch', 'doge',
                    'zec', 'dash', 'firo', 'part', 'pivx', 'zano',
                ],
                // WizardSwap statuses mapped to ccxt unified statuses
                'statusMapping': {
                    'waiting': 'open',
                    'confirming': 'open',
                    'exchanging': 'open',
                    'sending': 'open',
                    'finished': 'closed',
                    'failed': 'canceled',
                    'refunded': 'canceled',
                    'verifying': 'open',
                },
                // Use website form POST for create/fetch when REST /api/exchange is unavailable.
                'websiteFormBackup': false,
                'websiteFormUserAgent': (
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36'
                ),
            },
        });
    }

    websiteFormBackupEnabled (): boolean {
        return this.safeBool (this.options, 'websiteFormBackup', false);
    }

    ensureWebsiteUserAgent () {
        if (!this.websiteFormBackupEnabled ()) {
            return;
        }
        const browserUserAgent = this.safeString (this.options, 'websiteFormUserAgent');
        if (browserUserAgent === undefined) {
            return;
        }
        if (this.userAgent !== browserUserAgent) {
            this.userAgent = browserUserAgent;
        }
    }

    wizardswapOrderPageUrl (id: string): string {
        const www = this.safeString (this.urls, 'www', 'https://www.wizardswap.io');
        const base = www.endsWith ('/') ? www : www + '/';
        return base + 'id=' + id;
    }

    wizardswapStatusUrl (): string {
        return this.safeString (this.urls, 'status', 'https://www.wizardswap.io/action=get_status');
    }

    websiteIndexOfInsensitive (haystack: string, needle: string): number {
        return haystack.toLowerCase ().indexOf (needle.toLowerCase ());
    }

    websiteTrimLeft (text: string): string {
        let startIndex = 0;
        while (startIndex < text.length) {
            const character = text[startIndex];
            if (character === ' ' || character === '\t' || character === '\n' || character === '\r') {
                startIndex += 1;
            } else {
                break;
            }
        }
        return text.slice (startIndex);
    }

    websiteLeadingAlphanumericId (text: string): Str {
        let id = '';
        for (let charIndex = 0; charIndex < text.length; charIndex++) {
            const character = text[charIndex];
            const isUpper = (character >= 'A' && character <= 'Z');
            const isDigit = (character >= '0' && character <= '9');
            if (isUpper || isDigit) {
                id += character;
            } else if (id.length > 0) {
                break;
            }
        }
        return id === '' ? undefined : id;
    }

    parseWebsiteCsrfToken (html: string): string {
        const tokenField = 'name="token"';
        const fieldIndex = html.indexOf (tokenField);
        if (fieldIndex < 0) {
            throw new InvalidOrder (this.id + ' createOrder() failed: homepage has no CSRF token');
        }
        const chunk = html.slice (fieldIndex, fieldIndex + 120);
        const valueMarker = 'value="';
        const valueIndex = chunk.indexOf (valueMarker);
        if (valueIndex < 0) {
            throw new InvalidOrder (this.id + ' createOrder() failed: homepage has no CSRF token');
        }
        const afterValue = chunk.slice (valueIndex + valueMarker.length);
        const endQuote = afterValue.indexOf ('"');
        if (endQuote < 0) {
            throw new InvalidOrder (this.id + ' createOrder() failed: homepage has no CSRF token');
        }
        return afterValue.slice (0, endQuote);
    }

    parseWebsiteCreateOrderId (responseOrError: any): string {
        const candidates: string[] = [];
        if (typeof responseOrError === 'string') {
            candidates.push (responseOrError);
        } else if (responseOrError !== undefined && responseOrError !== null) {
            const message = this.safeString (responseOrError, 'message');
            if (message !== undefined) {
                candidates.push (message);
            }
        }
        const redirectNeedle = 'redirect to id=';
        const exchangeIdNeedle = 'Exchange ID:';
        for (let i = 0; i < candidates.length; i++) {
            const text = candidates[i];
            const redirectIndex = this.websiteIndexOfInsensitive (text, redirectNeedle);
            if (redirectIndex >= 0) {
                const afterRedirect = text.slice (redirectIndex + redirectNeedle.length);
                const orderId = this.websiteLeadingAlphanumericId (afterRedirect);
                if (orderId !== undefined) {
                    return orderId;
                }
            }
            const exchangeIdIndex = this.websiteIndexOfInsensitive (text, exchangeIdNeedle);
            if (exchangeIdIndex >= 0) {
                const afterLabel = text.slice (exchangeIdIndex + exchangeIdNeedle.length);
                const orderId = this.websiteLeadingAlphanumericId (this.websiteTrimLeft (afterLabel));
                if (orderId !== undefined) {
                    return orderId;
                }
            }
        }
        throw new InvalidOrder (this.id + ' createOrder() failed: exchange response has no order id');
    }

    parseWebsiteStatusText (statusText: Str): Str {
        if (statusText === undefined) {
            return undefined;
        }
        const lowered = statusText.trim ().toLowerCase ();
        if (lowered.startsWith ('waiting')) {
            return 'waiting';
        }
        if (lowered.startsWith ('confirming')) {
            return 'confirming';
        }
        if (lowered.startsWith ('exchanging')) {
            return 'exchanging';
        }
        if (lowered.startsWith ('sending')) {
            return 'sending';
        }
        if (lowered.startsWith ('completed') || lowered.startsWith ('finished')) {
            return 'finished';
        }
        if (lowered.startsWith ('failed')) {
            return 'failed';
        }
        if (lowered.startsWith ('refunded')) {
            return 'refunded';
        }
        if (lowered.startsWith ('verifying')) {
            return 'verifying';
        }
        return undefined;
    }

    parseWebsiteHtmlField (html: string, fieldId: string): Str {
        const idMarker = 'id="' + fieldId + '"';
        const fieldIndex = html.indexOf (idMarker);
        if (fieldIndex < 0) {
            return undefined;
        }
        const chunk = html.slice (fieldIndex, fieldIndex + 400);
        const tagEnd = chunk.indexOf ('>');
        const valueMarker = 'value="';
        const valueIndex = chunk.indexOf (valueMarker);
        if (valueIndex >= 0 && (tagEnd < 0 || valueIndex < tagEnd)) {
            const afterValue = chunk.slice (valueIndex + valueMarker.length);
            const endQuote = afterValue.indexOf ('"');
            if (endQuote >= 0) {
                const value = afterValue.slice (0, endQuote).trim ();
                return value === '' ? undefined : value;
            }
        }
        if (tagEnd < 0) {
            return undefined;
        }
        const inner = chunk.slice (tagEnd + 1);
        const closeTag = inner.indexOf ('<');
        if (closeTag < 0) {
            return undefined;
        }
        const text = inner.slice (0, closeTag).trim ();
        return text === '' ? undefined : text;
    }

    parseWebsiteStatusHeading (html: string): Str {
        const marker = '<h2 id="status"';
        const markerIndex = html.indexOf (marker);
        if (markerIndex < 0) {
            return undefined;
        }
        const chunk = html.slice (markerIndex, markerIndex + 200);
        const tagEnd = chunk.indexOf ('>');
        if (tagEnd < 0) {
            return undefined;
        }
        const inner = chunk.slice (tagEnd + 1);
        const closeTag = inner.indexOf ('<');
        if (closeTag < 0) {
            return undefined;
        }
        return inner.slice (0, closeTag).trim ();
    }

    parseWebsiteMinimumCurrency (html: string): Str {
        const label = 'Minimum ';
        const labelIndex = html.indexOf (label);
        if (labelIndex < 0) {
            return undefined;
        }
        const rest = html.slice (labelIndex + label.length);
        let currency = '';
        for (let charIndex = 0; charIndex < rest.length; charIndex++) {
            const character = rest[charIndex];
            if (character >= 'A' && character <= 'Z') {
                currency += character;
            } else {
                break;
            }
        }
        return currency === '' ? undefined : currency.toLowerCase ();
    }

    parseWebsiteAmountToBeSent (html: string): Dict {
        const label = 'Amount to be sent:';
        const labelIndex = html.indexOf (label);
        if (labelIndex < 0) {
            return undefined;
        }
        const rest = this.websiteTrimLeft (html.slice (labelIndex + label.length));
        let amount = '';
        let amountEndIndex = 0;
        for (let charIndex = 0; charIndex < rest.length; charIndex++) {
            const character = rest[charIndex];
            if ((character >= '0' && character <= '9') || character === '.') {
                amount += character;
                amountEndIndex = charIndex + 1;
            } else {
                break;
            }
        }
        let currency = '';
        const afterAmount = this.websiteTrimLeft (rest.slice (amountEndIndex));
        for (let charIndex = 0; charIndex < afterAmount.length; charIndex++) {
            const character = afterAmount[charIndex];
            if (character >= 'A' && character <= 'Z') {
                currency += character;
            } else {
                break;
            }
        }
        if (amount === '' || currency === '') {
            return undefined;
        }
        return {
            'amount_to': amount,
            'currency_to': currency.toLowerCase (),
        };
    }

    async fetchWebsiteOrderStatus (id: string): Promise<Dict> {
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
        };
        const body = this.urlencode ({ 'id': id });
        const response = await this.fetch (this.wizardswapStatusUrl (), 'POST', headers, body);
        if (typeof response === 'string') {
            if (response.indexOf ('Invalid exchange ID') >= 0) {
                throw new OrderNotFound (this.id + ' order ' + id + ' not found');
            }
            throw new ExchangeError (this.id + ' unexpected status response: ' + response.slice (0, 80));
        }
        if (response === undefined || typeof response !== 'object') {
            throw new ExchangeError (this.id + ' unexpected status response type');
        }
        return response as Dict;
    }

    async fetchWebsiteOrderPage (id: string): Promise<Dict> {
        const html = await this.fetch (this.wizardswapOrderPageUrl (id), 'GET', undefined, undefined);
        if (typeof html !== 'string') {
            throw new ExchangeError (this.id + ' unexpected order page response type');
        }
        const exchangeIdLabel = 'Exchange ID: ' + id;
        if (html.indexOf (exchangeIdLabel) < 0 && html.indexOf (id) < 0) {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        const exchangeIdNeedle = 'Exchange ID:';
        const exchangeIdIndex = this.websiteIndexOfInsensitive (html, exchangeIdNeedle);
        let parsedId = id;
        if (exchangeIdIndex >= 0) {
            const afterLabel = html.slice (exchangeIdIndex + exchangeIdNeedle.length);
            const pageId = this.websiteLeadingAlphanumericId (this.websiteTrimLeft (afterLabel));
            if (pageId !== undefined) {
                parsedId = pageId;
            }
        }
        if (parsedId !== id) {
            throw new ExchangeError (this.id + ' order page id mismatch');
        }
        const statusText = this.parseWebsiteStatusHeading (html);
        const amountToPart = this.parseWebsiteAmountToBeSent (html);
        const currencyFrom = this.parseWebsiteMinimumCurrency (html);
        const page: Dict = {
            'id': parsedId,
            'status_text': statusText,
            'amount_from': this.parseWebsiteHtmlField (html, 'amount_a'),
            'address_from': this.parseWebsiteHtmlField (html, 'deposit_address'),
            'address_to': this.parseWebsiteHtmlField (html, 'receiver_address'),
        };
        if (currencyFrom !== undefined) {
            page['currency_from'] = currencyFrom;
        }
        if (amountToPart !== undefined) {
            page['amount_to'] = amountToPart['amount_to'];
            page['currency_to'] = amountToPart['currency_to'];
        }
        return page;
    }

    mergeWebsiteOrderParts (statusPart: Dict, pagePart: Dict, id: string): Dict {
        const merged: Dict = { 'id': id };
        if (statusPart !== undefined) {
            const statusKeys = [ 'status', 'status_text', 'refund_txid', 'deposit_txid', 'txid', 'confirmations', 'remaining_deposit' ];
            for (let i = 0; i < statusKeys.length; i++) {
                const key = statusKeys[i];
                const value = this.safeValue (statusPart, key);
                if (value !== undefined) {
                    merged[key] = value;
                }
            }
        }
        if (pagePart !== undefined) {
            const pageKeys = [ 'status_text', 'amount_from', 'amount_to', 'address_from', 'address_to', 'currency_from', 'currency_to' ];
            for (let i = 0; i < pageKeys.length; i++) {
                const key = pageKeys[i];
                const value = this.safeValue (pagePart, key);
                if (value !== undefined && value !== '') {
                    merged[key] = value;
                }
            }
        }
        return merged;
    }

    normalizeWebsiteOrder (raw: Dict, market: Market = undefined): Dict {
        let status = this.safeString (raw, 'status');
        if (status === undefined) {
            status = this.parseWebsiteStatusText (this.safeString (raw, 'status_text'));
        }
        let currencyFrom = this.safeString (raw, 'currency_from');
        let currencyTo = this.safeString (raw, 'currency_to');
        if (market !== undefined) {
            if (currencyFrom === undefined) {
                currencyFrom = this.safeString (market, 'baseId');
            }
            if (currencyTo === undefined) {
                currencyTo = this.safeString (market, 'quoteId');
            }
        }
        const amountFrom = this.safeString2 (raw, 'amount_from', 'expected_amount');
        const amountTo = this.safeString (raw, 'amount_to');
        const normalized: Dict = {
            'id': this.safeString (raw, 'id'),
            'status': status,
            'currency_from': currencyFrom,
            'currency_to': currencyTo,
            'amount_from': amountFrom,
            'expected_amount': amountFrom,
            'amount_to': amountTo,
            'address_from': this.safeString (raw, 'address_from'),
            'address_to': this.safeString (raw, 'address_to'),
            'timestamp': this.safeString (raw, 'timestamp'),
            'updated_at': this.safeString (raw, 'updated_at'),
            'info_source': 'website',
        };
        return normalized;
    }

    isWebsiteOrderUsable (order: Dict): boolean {
        const orderId = this.safeString (order, 'id');
        const status = this.safeString (order, 'status');
        const addressFrom = this.safeString (order, 'address_from');
        return (orderId !== undefined) && (status !== undefined) && (addressFrom !== undefined) && (addressFrom !== '');
    }

    websiteOrderTimestampString (): string {
        const iso = this.iso8601 (this.milliseconds ());
        return iso.slice (0, 19).replace ('T', ' ');
    }

    async requestWebsiteOrder (id: string, market: Market = undefined): Promise<Dict> {
        this.ensureWebsiteUserAgent ();
        let statusPart = undefined;
        let pagePart = undefined;
        try {
            statusPart = await this.fetchWebsiteOrderStatus (id);
        } catch (e) {
            statusPart = undefined;
        }
        try {
            pagePart = await this.fetchWebsiteOrderPage (id);
        } catch (e) {
            pagePart = undefined;
        }
        const merged = this.mergeWebsiteOrderParts (statusPart, pagePart, id);
        const normalized = this.normalizeWebsiteOrder (merged, market);
        if (!this.isWebsiteOrderUsable (normalized)) {
            throw new ExchangeError (this.id + ' website order ' + id + ' incomplete');
        }
        return normalized;
    }

    async createOrderViaWebsiteForm (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num, params: Dict, market: Market): Promise<Order> {
        this.ensureWebsiteUserAgent ();
        const addressTo = this.safeString (params, 'address_to');
        const refundAddress = this.safeString (params, 'refund_address', '');
        const extraIdTo = this.safeString (params, 'extra_id_to');
        const refundExtraId = this.safeString (params, 'refund_extra_id');
        if ((extraIdTo !== undefined) || (refundExtraId !== undefined)) {
            throw new NotSupported (this.id + ' createOrder() website form does not support extra_id/refund_extra_id');
        }
        const www = this.safeString (this.urls, 'www', 'https://www.wizardswap.io');
        const homeHtml = await this.fetch (www, 'GET', undefined, undefined);
        if (typeof homeHtml !== 'string') {
            throw new InvalidOrder (this.id + ' createOrder() failed: unexpected homepage response');
        }
        const csrfToken = this.parseWebsiteCsrfToken (homeHtml);
        const estimateResponse = await this.publicPostEstimate ({
            'currency_from': market['baseId'],
            'currency_to': market['quoteId'],
            'amount_from': this.numberToString (amount),
        });
        const amountTo = this.safeString2 (estimateResponse, 'estimated_amount', 'amount_to');
        if (amountTo === undefined) {
            throw new InvalidOrder (this.id + ' createOrder() failed: estimate missing amount_to');
        }
        const formBody = this.urlencode ({
            'amount_a': this.numberToString (amount),
            'crypto_a': market['baseId'].toUpperCase (),
            'amount_b': amountTo,
            'crypto_b': market['quoteId'].toUpperCase (),
            'refund_address': refundAddress,
            'address': addressTo,
            'token': csrfToken,
            'exchange': 'submit',
        });
        const formHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': www,
            'Referer': www + '/',
        };
        let orderId = undefined;
        try {
            const formResponse = await this.fetch (www, 'POST', formHeaders, formBody);
            orderId = this.parseWebsiteCreateOrderId (formResponse);
        } catch (e) {
            try {
                orderId = this.parseWebsiteCreateOrderId (e);
            } catch (ignored) {
                const lastHeaders = this.last_response_headers;
                if (lastHeaders !== undefined) {
                    const locationHeader = this.safeString2 (lastHeaders, 'Location', 'location');
                    if (locationHeader !== undefined) {
                        orderId = this.parseWebsiteCreateOrderId (locationHeader);
                    } else {
                        throw e;
                    }
                } else {
                    throw e;
                }
            }
        }
        let rawOrder = await this.requestWebsiteOrder (orderId, market);
        if (this.safeString (rawOrder, 'timestamp') === undefined) {
            rawOrder['timestamp'] = this.websiteOrderTimestampString ();
        }
        if (this.safeString (rawOrder, 'address_to') === undefined) {
            rawOrder['address_to'] = addressTo;
        }
        return this.parseOrder (rawOrder, market);
    }

    async fetchOrderViaApi (id: string, params = {}): Promise<Order> {
        let response = undefined;
        try {
            response = await this.publicPostExchange (this.extend ({ 'id': id }, params));
        } catch (e) {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        //
        //  {
        //      "id": "08A75WA1",
        //      "timestamp": "2026-03-24 21:48:22",
        //      "updated_at": "2026-03-24 22:48:22",
        //      "currency_from": "xmr",
        //      "currency_to": "btc",
        //      "amount_from": "0.1000...",
        //      "amount_to": "0.000467720...",
        //      "expected_amount": "0.1000...",
        //      "address_from": "88hsysd...",
        //      "address_to": "1Bitcoin...",
        //      "extra_id_from": "",
        //      "extra_id_to": "",
        //      "tx_from": "",
        //      "tx_to": "",
        //      "status": "waiting",
        //      "refund_address": null,
        //      "refund_extra_id": "",
        //      "currencies": [ { "symbol": "xmr", ... }, { "symbol": "btc", ... } ]
        //  }
        //
        if (response === undefined || typeof response !== 'object') {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        // The API returns a dict with status=null for nonexistent orders
        const responseStatus = this.safeString (response, 'status');
        if (responseStatus === undefined) {
            throw new OrderNotFound (this.id + ' order ' + id + ' not found');
        }
        return this.parseOrder (response);
    }

    /**
     * @method
     * @name wizardswap#fetchCurrencies
     * @description fetches all available currencies on the exchange
     * @see https://www.wizardswap.io/api
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an associative dictionary of currencies
     */
    async fetchCurrencies (params = {}): Promise<Currencies> {
        //
        // GET /api/currency returns an array of currency objects, e.g.:
        //  {
        //      "symbol": "btc",
        //      "has_extra_id": false,
        //      "name": "Bitcoin",
        //      "warnings_from": [],
        //      "warnings_to": [],
        //      "validation_address": "...",
        //      "validation_extra": null,
        //      "address_explorer": null,
        //      "tx_explorer": "https://...",
        //      "image": "https://..."
        //  }
        // Legacy fields (decimals, minamt, enabled, maintenance) may still be parsed when present.
        //
        const richResponse = await this.publicGetCurrency (params);
        if (Array.isArray (richResponse) && richResponse.length > 0) {
            return this.parseRichCurrencies (richResponse);
        }
        // Last resort: use hardcoded list
        const defaultIds = this.safeList (this.options, 'defaultCurrencyIds', []);
        return this.parseSimpleCurrencies (defaultIds);
    }

    parseRichCurrencies (response) {
        const result: Dict = {};
        for (let i = 0; i < response.length; i++) {
            const entry = response[i];
            const rawSymbol = this.safeString (entry, 'symbol');
            if (rawSymbol === undefined) {
                continue;
            }
            const currencyId = rawSymbol.toLowerCase ();
            const code = this.safeCurrencyCode (currencyId);
            const enabled = this.safeInteger (entry, 'enabled', 1);
            const maintenance = this.safeInteger (entry, 'maintenance', 0);
            const active = (enabled === 1) && (maintenance === 0);
            const decimals = this.safeInteger (entry, 'decimals');
            let precision = undefined;
            if (decimals !== undefined) {
                precision = this.parseNumber (this.parsePrecision (this.safeString (entry, 'decimals')));
            }
            const minAmt = this.safeNumber (entry, 'minamt');
            result[code] = this.safeCurrencyStructure ({
                'id': currencyId,
                'code': code,
                'name': this.safeString (entry, 'name'),
                'active': active,
                'deposit': active,
                'withdraw': active,
                'fee': undefined,
                'precision': precision,
                'limits': {
                    'amount': { 'min': minAmt, 'max': undefined },
                    'withdraw': { 'min': minAmt, 'max': undefined },
                },
                'info': entry,
            });
        }
        return result;
    }

    parseSimpleCurrencies (currencyIds) {
        const result: Dict = {};
        for (let i = 0; i < currencyIds.length; i++) {
            const currencyId = currencyIds[i];
            const code = this.safeCurrencyCode (currencyId);
            result[code] = this.safeCurrencyStructure ({
                'id': currencyId,
                'code': code,
                'name': undefined,
                'active': true,
                'deposit': true,
                'withdraw': true,
                'fee': undefined,
                'precision': undefined,
                'limits': {
                    'amount': { 'min': undefined, 'max': undefined },
                    'withdraw': { 'min': undefined, 'max': undefined },
                },
                'info': currencyId,
            });
        }
        return result;
    }

    /**
     * @method
     * @name wizardswap#fetchMarkets
     * @description retrieves all available swap pairs from /pairs and /currency
     * @see https://www.wizardswap.io/api
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Market[]} an array of objects representing market data
     */
    async fetchMarkets (params = {}): Promise<Market[]> {
        let currencies = this.safeDict (this.options, 'cachedCurrencies');
        if (!currencies) {
            currencies = await this.fetchCurrencies (params);
        }
        //
        // GET /api/pairs returns:
        // {
        //     "part": ["pivx","xmr","zec","dash","btc","ltc","eth","firo","zano","bch"],
        //     "xmr":  ["part","pivx","zec","dash","btc","ltc","eth","firo","zano","bch"],
        //     ...
        // }
        //
        const pairsData = await this.publicGetPairs (params);
        const result = [];
        if (pairsData !== undefined && typeof pairsData === 'object') {
            const baseIds = Object.keys (pairsData);
            for (let i = 0; i < baseIds.length; i++) {
                const baseId = baseIds[i];
                const baseCode = this.safeCurrencyCode (baseId);
                const quoteIds = this.safeList (pairsData, baseId, []);
                for (let j = 0; j < quoteIds.length; j++) {
                    const quoteId = quoteIds[j];
                    const quoteCode = this.safeCurrencyCode (quoteId);
                    const baseCurrency = this.safeDict (currencies, baseCode, {});
                    const quoteCurrency = this.safeDict (currencies, quoteCode, {});
                    result.push (this.buildMarketEntry (baseId, quoteId, baseCode, quoteCode, baseCurrency, quoteCurrency));
                }
            }
        } else {
            // Fallback: build from currencies (N*(N-1) pairs)
            const codes = Object.keys (currencies);
            for (let i = 0; i < codes.length; i++) {
                const baseCode = codes[i];
                const baseCurrency = currencies[baseCode];
                const baseId = this.safeString (baseCurrency, 'id');
                for (let j = 0; j < codes.length; j++) {
                    if (i === j) {
                        continue;
                    }
                    const quoteCode = codes[j];
                    const quoteCurrency = currencies[quoteCode];
                    const quoteId = this.safeString (quoteCurrency, 'id');
                    result.push (this.buildMarketEntry (baseId, quoteId, baseCode, quoteCode, baseCurrency, quoteCurrency));
                }
            }
        }
        return result;
    }

    buildMarketEntry (baseId, quoteId, baseCode, quoteCode, baseCurrency, quoteCurrency) {
        const symbol = baseCode + '/' + quoteCode;
        const baseMinAmt = this.safeNumber (this.safeDict (this.safeDict (baseCurrency, 'limits', {}), 'amount', {}), 'min');
        return {
            'id': baseId + '_' + quoteId,
            'symbol': symbol,
            'base': baseCode,
            'quote': quoteCode,
            'baseId': baseId,
            'quoteId': quoteId,
            'settle': undefined,
            'settleId': undefined,
            'type': 'spot',
            'spot': true,
            'margin': false,
            'swap': false,
            'future': false,
            'option': false,
            'active': true,
            'contract': false,
            'linear': undefined,
            'inverse': undefined,
            'contractSize': undefined,
            'expiry': undefined,
            'expiryDatetime': undefined,
            'strike': undefined,
            'optionType': undefined,
            'taker': this.parseNumber ('0.022'),
            'maker': this.parseNumber ('0.022'),
            'percentage': true,
            'tierBased': false,
            'feeSide': 'get',
            'precision': {
                'amount': this.safeNumber (baseCurrency, 'precision'),
                'price': this.safeNumber (quoteCurrency, 'precision'),
            },
            'limits': {
                'leverage': { 'min': undefined, 'max': undefined },
                'amount': { 'min': baseMinAmt, 'max': undefined },
                'price': { 'min': undefined, 'max': undefined },
                'cost': { 'min': undefined, 'max': undefined },
            },
            'created': undefined,
            'info': {
                'baseId': baseId,
                'quoteId': quoteId,
            },
        };
    }

    /**
     * @method
     * @name wizardswap#fetchTicker
     * @description fetches a price ticker / estimate for a swap pair
     * @see https://www.wizardswap.io/api
     * @param {string} symbol unified market symbol, e.g. 'XMR/BTC'
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.amount_from] amount to estimate, defaults to '1'
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const amountFrom = this.safeString (params, 'amount_from', '1');
        params = this.omit (params, 'amount_from');
        const request: Dict = {
            'currency_from': market['baseId'],
            'currency_to': market['quoteId'],
            'amount_from': amountFrom,
        };
        const response = await this.publicPostEstimate (this.extend (request, params));
        //
        //  { "estimated_amount": "0.00476907" }  (live)
        //  { "amount_to": 0.00476907 }             (docs)
        //
        return this.parseTicker (response, market);
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        const currencyFrom = this.safeString (ticker, 'currency_from');
        const currencyTo = this.safeString (ticker, 'currency_to');
        let symbol = this.safeString (market, 'symbol');
        if (currencyFrom !== undefined && currencyTo !== undefined) {
            const baseCode = this.safeCurrencyCode (currencyFrom);
            const quoteCode = this.safeCurrencyCode (currencyTo);
            symbol = baseCode + '/' + quoteCode;
        }
        const last = this.safeStringN (ticker, [ 'estimated_amount', 'amount_to', 'rate' ]);
        return this.safeTicker ({
            'symbol': symbol,
            'timestamp': undefined,
            'datetime': undefined,
            'high': undefined,
            'low': undefined,
            'bid': last,
            'bidVolume': undefined,
            'ask': last,
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': undefined,
            'quoteVolume': undefined,
            'info': ticker,
        }, market);
    }

    /**
     * @method
     * @name wizardswap#createOrder
     * @description create a swap order on WizardSwap (no API key needed)
     * @see https://www.wizardswap.io/api
     * @param {string} symbol unified market symbol, e.g. 'XMR/BTC'
     * @param {string} type order type – only 'market' is supported (floating rate)
     * @param {string} side 'buy' or 'sell' – for swaps this is always 'sell' (sell base for quote)
     * @param {float} amount amount of the base currency to send
     * @param {float} [price] not used for WizardSwap
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} params.address_to destination address for the quote currency
     * @param {string} [params.refund_address] refund address for the base currency
     * @param {string} [params.extra_id_to] recipient Extra ID when the quote currency requires it
     * @param {string} [params.refund_extra_id] refund Extra ID for the base currency
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const addressTo = this.safeString (params, 'address_to');
        if (addressTo === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder() requires params.address_to – the destination address for the received currency');
        }
        if (this.websiteFormBackupEnabled ()) {
            const formParams = this.extend ({
                'address_to': addressTo,
            }, params);
            return await this.createOrderViaWebsiteForm (symbol, type, side, amount, price, formParams, market);
        }
        const request: Dict = {
            'currency_from': market['baseId'],
            'currency_to': market['quoteId'],
            'amount_from': this.numberToString (amount),
            'address_to': addressTo,
        };
        const refundAddress = this.safeString (params, 'refund_address');
        if (refundAddress !== undefined) {
            request['refund_address'] = refundAddress;
        }
        const extraIdTo = this.safeString (params, 'extra_id_to');
        if (extraIdTo !== undefined) {
            request['extra_id_to'] = extraIdTo;
        }
        const refundExtraId = this.safeString (params, 'refund_extra_id');
        if (refundExtraId !== undefined) {
            request['refund_extra_id'] = refundExtraId;
        }
        params = this.omit (params, [ 'address_to', 'refund_address', 'extra_id_to', 'refund_extra_id' ]);
        // ob_wizardswap enables maxRetriesOnFailure for fetch2 (HTTP/network failures only).
        // Missing order id is a successful HTTP response without an id — retry here at createOrder level.
        // Rejected swaps (False) fail immediately; exhausted missing-id retries throw InvalidOrder
        // with a stable message.
        const maxRetries = this.safeInteger (this.options, 'maxRetriesOnFailure', 0);
        const retryDelay = this.safeInteger (this.options, 'maxRetriesOnFailureDelay', 0);
        const extendedRequest = this.extend (request, params);
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const response = await this.publicPostExchange (extendedRequest);
            if (String (response).toLowerCase () === 'false') {
                throw new InvalidOrder (this.id + ' createOrder() failed: exchange returned False (order rejected)');
            }
            const orderId = this.safeString (response, 'id');
            if (orderId !== undefined && orderId !== '') {
                //
                //  {
                //      "id": "08A75WA1",
                //      "type": "fixed",
                //      "timestamp": "2026-03-24 21:48:22",
                //      "updated_at": "2026-03-24 22:48:21",
                //      "currency_from": "xmr",
                //      "amount_from": "0.1000...",
                //      "expected_amount": "0.1000...",
                //      "amount_to": "0.000467720...",
                //      "address_from": "88hsysd...",
                //      "address_to": "1Bitcoin...",
                //      "extra_id_from": "",
                //      "extra_id_to": "",
                //      "tx_from": "",
                //      "tx_to": "",
                //      "status": "waiting",
                //      "refund_address": null,
                //      "refund_extra_id": "",
                //      "currencies": { ... }
                //  }
                //
                // Note: create response may omit currency_to; pass market to parseOrder.
                return this.parseOrder (response, market);
            }
            if (attempt < maxRetries) {
                this.log ('createOrder missing id, retrying ...');
                if (retryDelay) {
                    await this.sleep (retryDelay);
                }
                continue;
            }
            throw new InvalidOrder (this.id + ' createOrder() failed: exchange response has no order id');
        }
        throw new InvalidOrder (this.id + ' createOrder() failed: exchange response has no order id');
    }

    /**
     * @method
     * @name wizardswap#fetchOrder
     * @description fetch the status of a WizardSwap exchange/swap order
     * @see https://www.wizardswap.io/api
     * @param {string} id the order / exchange id
     * @param {string} [symbol] unified market symbol (optional)
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    async fetchOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        let market = undefined;
        if (symbol !== undefined) {
            await this.loadMarkets ();
            market = this.market (symbol);
        }
        if (this.websiteFormBackupEnabled ()) {
            try {
                const rawOrder = await this.requestWebsiteOrder (id, market);
                return this.parseOrder (rawOrder, market);
            } catch (e) {
                return await this.fetchOrderViaApi (id, params);
            }
        }
        return await this.fetchOrderViaApi (id, params);
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const id = this.safeString (order, 'id');
        const currencyFrom = this.safeString (order, 'currency_from');
        const currencyTo = this.safeString (order, 'currency_to');
        let parsedSymbol = undefined;
        if (currencyFrom !== undefined && currencyTo !== undefined) {
            const baseCode = this.safeCurrencyCode (currencyFrom);
            const quoteCode = this.safeCurrencyCode (currencyTo);
            parsedSymbol = baseCode + '/' + quoteCode;
        }
        // Prefer parsed symbol from response, fall back to market
        let symbol = parsedSymbol;
        if (symbol === undefined) {
            symbol = this.safeString (market, 'symbol');
        }
        const rawStatus = this.safeString (order, 'status');
        const status = this.parseOrderStatus (rawStatus);
        const amountFrom = this.safeString2 (order, 'expected_amount', 'amount_from');
        const amountTo = this.safeString (order, 'amount_to');
        // Parse timestamp from "2026-03-24 21:48:22" format
        const timestampStr = this.safeString (order, 'timestamp');
        let timestamp = undefined;
        if (timestampStr !== undefined) {
            timestamp = this.parse8601 (timestampStr.replace (' ', 'T') + 'Z');
        }
        const updatedAtStr = this.safeString (order, 'updated_at');
        let lastUpdateTimestamp = undefined;
        if (updatedAtStr !== undefined) {
            lastUpdateTimestamp = this.parse8601 (updatedAtStr.replace (' ', 'T') + 'Z');
        }
        return this.safeOrder ({
            'id': id,
            'clientOrderId': undefined,
            'info': order,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'lastUpdateTimestamp': lastUpdateTimestamp,
            'symbol': symbol,
            'type': 'market',
            'timeInForce': undefined,
            'postOnly': undefined,
            'side': 'sell',
            'price': amountTo,       // estimated receive amount
            'stopPrice': undefined,
            'triggerPrice': undefined,
            'amount': amountFrom,     // amount sent
            'cost': undefined,
            'average': undefined,
            'filled': undefined,
            'remaining': undefined,
            'status': status,
            'fee': {
                'currency': undefined,
                'cost': undefined,
                'rate': this.parseNumber ('0.022'),
            },
            'trades': undefined,
        }, market);
    }

    parseOrderStatus (status: Str): Str {
        const statuses: Dict = this.safeDict (this.options, 'statusMapping', {});
        return this.safeString (statuses, status, status);
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        const useOnion = this.safeBool (this.options, 'useOnion', false);
        let baseUrl = this.urls['api']['rest'];
        if (useOnion) {
            baseUrl = this.safeString (this.options, 'onionUrl', baseUrl);
        }
        let url = baseUrl + '/' + this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));
        if (method === 'POST' && this.apiKey && (query['api_key'] === undefined)) {
            query['api_key'] = this.apiKey;
        }
        if (method === 'GET') {
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else if (method === 'POST') {
            if (Object.keys (query).length) {
                body = this.json (query);
                headers = {
                    'Content-Type': 'application/json',
                };
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (httpCode: int, reason: string, url: string, method: string, headers: Dict, body: string, response, requestHeaders, requestBody) {
        if (response === undefined) {
            return undefined;
        }
        //
        // error responses from WizardSwap:
        //  { "error": "some error message" }
        //
        const error = this.safeString (response, 'error');
        if (error !== undefined) {
            throw new ExchangeError (this.id + ' ' + error);
        }
        const message = this.safeString (response, 'message');
        if (message !== undefined && httpCode >= 400) {
            throw new BadRequest (this.id + ' ' + message);
        }
        return undefined;
    }
}
