// ---------------------------------------------------------------------------
// Usage: npm run transpileRust
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import log from 'ololog';
import ansi from 'ansicolor';
import { fileURLToPath, pathToFileURL } from 'url';
import { parse } from 'acorn';
import { walkRecursive, walkSimple } from './rustAstWalk.js';
import { unCamelCase } from '../js/src/base/functions.js';
import { createFolderRecursively, overwriteFile, replaceInFile } from './fsLocal.js';

ansi.nice;

type Dict<T = string> = { [key: string]: T };

const pythonCodingUtf8 = '# -*- coding: utf-8 -*-'; // kept for parity with existing build scripts
const baseExchangeJsFile = './js/src/base/Exchange.js';

const metaFileUrl = import.meta.url;
const __dirname = path.dirname(fileURLToPath(metaFileUrl));

const FUNCTION_INFO: Record<string, Record<string, { paramsCount: number; async: boolean }>> = {};

// Methods that are manually implemented in the Exchange trait (in exchange.rs)
// and should NOT be auto-generated as stubs by the transpiler.
const MANUALLY_IMPLEMENTED_METHODS = new Set([
    'safeString', 'safeString2', 'safeStringN',
    'safeStringLower', 'safeStringLower2', 'safeStringLowerN',
    'safeStringUpper', 'safeStringUpper2', 'safeStringUpperN',
    'safeInteger', 'safeInteger2', 'safeIntegerN',
    'safeIntegerProduct', 'safeIntegerProduct2', 'safeIntegerProductN',
    'safeTimestamp', 'safeTimestamp2', 'safeTimestampN',
    'safeFloat', 'safeFloat2', 'safeFloatN',
    'safeValue', 'safeValue2', 'safeValueN',
    'parseNumber', 'parseToInt', 'parseToNumeric',
    'safeNumber', 'safeNumber2', 'safeNumberN', 'safeNumberOmitZero',
    'safeIntegerOmitZero',
    'safeBool', 'safeBool2', 'safeBoolN',
    'safeDict', 'safeDict2', 'safeDictN',
    'safeList', 'safeList2', 'safeListN',
    'filterByLimit', 'filterBySinceLimit',
    'parseBidAsk', 'parseBidsAsks', 'parseOrderBook',
    'checkAddress', 'networkIdToCode', 'depositWithdrawFee',
    'parseJson',
    // Methods with compilation issues (usize/Value, mutability, .length field)
    // Stubbed until transpiler handles these patterns
    'fetchMarkets', 'fetchMyDustTrades', 'parseAccountPosition',
    'parsePositionRisk', 'setMarginMode', 'getNetworkCodeByNetworkUrl',
    'getBaseDomainFromUrl', 'sign', 'handleErrors',
    'fetchConvertTrade', 'fetchConvertTradeHistory',
    'fetchAllGreeks', 'fetchOptionPositions',
]);

function isUpperCase(x: string) {
    return x && x.length > 0 && x[0] === x.toUpperCase()[0];
}

function capitalizeFirstLetter(l: string) {
    return l.charAt(0).toUpperCase() + l.slice(1);
}

function uncapitalizeFirstLetter(l: string) {
    return l.charAt(0).toLowerCase() + l.slice(1);
}

function isUndefined(node: any) {
    return node.type === 'Identifier' && node.name === 'undefined';
}

function functionIsAsync(node: any) {
    if (node.type !== 'FunctionDeclaration') {
        throw new Error('Unexpected node type');
    }
    let rv = false;
    walkSimple(node, {
        AwaitExpression() {
            rv = true;
        },
    });
    return rv;
}

function isAllCaps(x: string) {
    if (!x) return false;
    for (let i = 0; i < x.length; i++) {
        if (x[i] !== x[i].toUpperCase()) return false;
    }
    return true;
}

function unCamelCamelCase(x: string) {
    return !x || x.length === 0 || isUpperCase(x) ? x : unCamelCase(x);
}

function getFunctionNameFromCallee(node: any) {
    switch (node.type) {
        case 'MemberExpression':
            if (node.property.type !== 'Identifier') {
                throw new Error('Unexpected MemberExpression');
            }
            return node.property.name;
        case 'Identifier':
            return node.name;
        default:
            throw new Error('Unexpected callee type');
    }
}

function transformIdentifier(name: string) {
    switch (name) {
        case 'type':
            return 'r#type';
        case 'final':
            return 'r#final';
        case 'match':
            return 'r#match';
        default:
            return unCamelCamelCase(name);
    }
}

function quoteString(str: string) {
    return str.includes('"') ? `r#"${str}"#` : `"${str}"`;
}

function getCalleeFunctionName(node: any) {
    if (node.type !== 'CallExpression') {
        throw new Error('Unexpected node type');
    }
    switch (node.callee.type) {
        case 'MemberExpression':
            if (node.callee.property.type !== 'Identifier') {
                throw new Error('Unexpected MemberExpression');
            }
            return node.callee.property.name;
        case 'Identifier':
            return node.callee.name;
        default:
            throw new Error('Unexpected callee type');
    }
}

function getReturnType(node: any) {
    if (node.type !== 'CallExpression') {
        throw new Error('Unexpected node type');
    }

    const fname = getCalleeFunctionName(node);
    switch (fname) {
        case 'stringEquals':
        case 'stringEq':
        case 'stringGt':
        case 'stringGe':
        case 'stringLt':
        case 'stringLe':
        case 'startsWith':
        case 'endsWith':
            return 'bool';
        default:
            return 'value';
    }
}

function toCamelCase(input: string) {
    return input
        .split(/[^a-zA-Z0-9]+/g)
        .filter(Boolean)
        .map((part, idx) =>
            idx === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join('');
}

function isObjectLike(x: any) {
    return x !== null && typeof x === 'object';
}

function enumerateApiMethodMapping(
    api: any,
    apiName?: string,
    method?: string,
    keyPrefixes?: string[],
    pathPrefix?: string,
    recursionState?: { seen: WeakSet<object>; depth: number }
) {
    const rv: Record<string, { apiName: string; method: string; path: string }> = {};
    if (!isObjectLike(api)) {
        return rv;
    }

    const state = recursionState || { seen: new WeakSet<object>(), depth: 0 };
    if (state.depth > 24) {
        return rv;
    }

    const apiObj = api as object;
    if (state.seen.has(apiObj)) {
        return rv;
    }
    state.seen.add(apiObj);

    for (let [k, v] of Object.entries(api)) {
        if (!apiName) {
            Object.assign(
                rv,
                enumerateApiMethodMapping(v, k, method, [...(keyPrefixes || []), k], pathPrefix, {
                    seen: state.seen,
                    depth: state.depth + 1,
                })
            );
        } else if (!method) {
            if (['get', 'post', 'put', 'delete'].includes(k.toLowerCase())) {
                Object.assign(
                    rv,
                    enumerateApiMethodMapping(v, apiName, k, [...(keyPrefixes || []), k], pathPrefix, {
                        seen: state.seen,
                        depth: state.depth + 1,
                    })
                );
            } else {
                Object.assign(
                    rv,
                    enumerateApiMethodMapping(v, apiName, undefined, [...(keyPrefixes || []), k], pathPrefix, {
                        seen: state.seen,
                        depth: state.depth + 1,
                    })
                );
            }
        } else {
            if (Array.isArray(api)) {
                k = v as string;
            }
            let k1 = toCamelCase(
                (k as string)
                    .split('/')
                    .map((x) => x.replace('{', '').replace('}', ''))
                    .join('_')
            );
            if (pathPrefix) {
                k1 = capitalizeFirstLetter(k1);
            }
            const methodKey = toCamelCase([...(keyPrefixes || []), k1].join('_'));
            rv[methodKey] = {
                apiName,
                method: method!,
                path: (pathPrefix || '') + k,
            };
        }
    }
    return rv;
}

function parseJs(code: string) {
    return parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
    }) as any;
}

function getClassNode(code: string) {
    const ast = parseJs(code);
    for (const node of ast.body) {
        if (node.type === 'ExportDefaultDeclaration') {
            if (node.declaration && (node.declaration.type === 'ClassDeclaration' || node.declaration.type === 'ClassExpression')) {
                return node.declaration;
            }
        }
        if (node.type === 'ClassDeclaration') {
            return node;
        }
    }
    throw new Error('No class declaration found');
}

function analyzeClassFromAst(className: string, classNode: any) {
    if (FUNCTION_INFO[className]) return;
    FUNCTION_INFO[className] = {};
    for (const el of classNode.body.body) {
        if (el.type !== 'MethodDefinition') continue;
        if (el.kind !== 'method') continue;
        if (!el.key || el.key.type !== 'Identifier') continue;
        const name = el.key.name;
        const params = el.value?.params || [];
        if (params.some((p: any) => p.type === 'RestElement')) continue;
        const paramsCount = params.filter((p: any) => !(p.type === 'Identifier' && p.name === '$default')).length;
        FUNCTION_INFO[className][name] = {
            paramsCount,
            async: !!el.value?.async,
        };
    }
}

function getArgumentCount(className: string, node: any) {
    if (node.type !== 'CallExpression') {
        throw new Error('Unexpected node type');
    }
    const argCounts: Dict<number> = {
        fetchAccounts: 1,
        fetchBorrowRates: 1,
        fetchDepositAddresses: 2,
        fetchTradingLimits: 2,
        parseDepositAddress: 2,
        parseFundingRateHistory: 2,
        parseFundingHistory: 2,
        parseLedgerEntry: 2,
        parsePosition: 2,
        stringDiv: 3,
        throttle: 1,
        totp: 1,
        // safe* methods have 3 params (dictionary, key, defaultValue) but are
        // often called with 2 in JS (default is undefined)
        safeString: 3, safeString2: 4, safeStringN: 3,
        safeStringLower: 3, safeStringLower2: 4, safeStringLowerN: 3,
        safeStringUpper: 3, safeStringUpper2: 4, safeStringUpperN: 3,
        safeInteger: 3, safeInteger2: 4, safeIntegerN: 3,
        safeIntegerProduct: 4, safeIntegerProduct2: 5, safeIntegerProductN: 4,
        safeTimestamp: 3, safeTimestamp2: 4, safeTimestampN: 3,
        safeFloat: 3, safeFloat2: 4, safeFloatN: 3,
        safeValue: 3, safeValue2: 4, safeValueN: 3,
        safeNumber: 3, safeNumber2: 4, safeNumberN: 3,
        safeBool: 3, safeBool2: 4, safeBoolN: 3,
        safeDict: 3, safeDict2: 4, safeDictN: 3,
        safeList: 3, safeList2: 4, safeListN: 3,
        safeNumberOmitZero: 3, safeIntegerOmitZero: 3,
        // Other methods with optional params
        loadMarkets: 2, omit: 2, iso8601: 1, milliseconds: 0,
        numberToString: 1, inArray: 2, decimalToPrecision: 5,
        sortBy: 4, indexBy: 2, filterBy: 3, groupBy: 2,
        filterByLimit: 4, filterBySinceLimit: 5,
        parseBidAsk: 4, parseBidsAsks: 4, parseOrderBook: 8,
        filterByArray: 4, filterByArrayPositions: 4, filterByArrayTickers: 4,
        // WS methods with optional trailing params
        watch: 5, watchMultiple: 5,
        orderBook: 2, loadAccounts: 2, checkRequiredCredentials: 1,
        spawn: 2,
        parseOHLCV: 2, parseOHLCVs: 6, parseTrade: 2, parseOrder: 2, parseTicker: 2,
        parseTrades: 5, parseOrders: 5,
        resolve: 2,
        marketSymbols: 5,
        handleMarketTypeAndParams: 4, handleSubTypeAndParams: 4, handleMarginModeAndParams: 3,
        handleOptionAndParams: 4,
        cleanUnsubscription: 4,
        delay: 3,
        findTimeframe: 2,
        fetchPositions: 2,
        filterBySymbolSinceLimit: 5, filterBySymbolsSinceLimit: 5, filterByCurrencySinceLimit: 5,
        indexedOrderBook: 2, countedOrderBook: 2,
        safeTicker: 2, safeOrder: 2, safeLiquidation: 2, safeTrade: 2,
        isLinear: 2, isInverse: 2,
        lockId: 1, unlockId: 1,
        parseNumber: 2, parseToInt: 1, parseToNumeric: 2, parseInt: 2,
        json: 1, encode: 1, urlencode: 1, rawencode: 1,
        hash: 3, hmac: 4, jwt: 4,
        encodeURIComponent: 1, uuid22: 0, yymmdd: 2,
        precisionFromString: 1, createSafeDictionary: 0,
        sign: 6, handleErrors: 9,
        throwExactlyMatchedException: 3, throwBroadlyMatchedException: 3,
        parseJson: 1, arrayConcat: 2, binaryConcat: 4,
        urlencodeWithArrayRepeat: 1, parse8601: 1,
        safeMarket: 4, safeCurrency: 2, safeCurrencyCode: 2, safeSymbol: 4,
        ethEncodeStructuredData: 3, getZkContractSignatureObj: 2, getZkTransferSignatureObj: 2,
        encodeDydxTxRaw: 2, randNumber: 1,
        // Methods where FUNCTION_INFO['Exchange'] isn't available in WS-only transpilation:
        parsePositionRisk: 2, parseLiquidation: 2, parseTransaction: 2,
        parseFundingRate: 2, parseFundingRateHistory: 2, parsePosition: 2,
        convertFromRawQuantity: 3, currencyToPrecision: 3,
        handleDeltasWithKeys: 5,
        safeMarketCustom: 3,
        isBinaryMessage: 1, decodeProtoMsg: 1,
        authenticateRest: 0, signIn: 1,
        reject: 2, reset: 1, resolve: 2,
        createOrderRequest: 6,
        parseWsOhlcvs: 5, parseWsOHLCVs: 5, parseWsTrades: 5,
        handleOption: 3,
        parseOrderTypeTimeInForceAndPostOnly: 3,
        customParseBidAsk: 4,
        fetchPosition: 2, createAuthToken: 1,
    };
    const fname = getCalleeFunctionName(node);
    // argCounts overrides take priority (hand-tuned for Rust signatures)
    if (argCounts[fname] !== undefined) {
        return argCounts[fname];
    }
    const rv = FUNCTION_INFO[className]?.[fname] || FUNCTION_INFO['Exchange']?.[fname];
    if (!rv) {
        return node.arguments.length;
    }
    return rv.paramsCount;
}

function getBaseClassName(classNode: any) {
    const sc = classNode.superClass;
    if (!sc) return undefined;
    if (sc.type === 'Identifier') return sc.name;
    if (sc.type === 'MemberExpression' && sc.property?.type === 'Identifier') return sc.property.name;
    return undefined;
}

function getMethodStrings(code: string, classNode: any, startOffset = 0) {
    const methods: string[] = [];
    for (const el of classNode.body.body) {
        if (el.type !== 'MethodDefinition') continue;
        if (el.kind !== 'method') continue;
        if (el.key?.type !== 'Identifier') continue;
        if (el.key.name === 'constructor') continue;
        if (el.start < startOffset) continue;
        const raw = code.slice(el.start, el.end);
        methods.push(raw);
    }
    return methods;
}

function transpileMethodToRust(opts: {
    className: string;
    method: string;
    baseMethodNames: string[];
    baseClassName?: string;
    apiMethods: Set<string>;
    exchangeDescribe?: any;
    isInherited?: boolean;
    ownMethodNames?: Set<string>;
}) {
    const { className, method, baseMethodNames, baseClassName, apiMethods, exchangeDescribe } = opts;

    let srcMethod = method.trim().startsWith('async ')
        ? method.replace(/^\s*async\s+/, 'async function ')
        : `function ${method}`;

    const comments: any[] = [];
    const ast = parse(srcMethod, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        onComment: comments,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
    }) as any;

    // ---------------------------------------------------------------------------
    // Hand-written Rust bodies for critical methods whose JS source depends on
    // runtime that is not yet implemented (loadMarkets, fetch, etc.).
    // These are keyed by JS function name and return the full Rust method body
    // (including signature).  When a method is listed here the transpiler emits
    // the hand-written version instead of walking the JS AST.
    // ---------------------------------------------------------------------------
    const HANDWRITTEN_METHODS: Record<string, (header: string, requestCall?: string) => string> = {
        request: (header, requestCall) => header + `{
        fn first_string(v: &serde_json::Value) -> Option<String> {
            match v {
                serde_json::Value::String(s) => Some(s.clone()),
                serde_json::Value::Object(map) => {
                    for (_k, vv) in map {
                        if let Some(found) = first_string(vv) {
                            return Some(found);
                        }
                    }
                    None
                }
                serde_json::Value::Array(arr) => {
                    for vv in arr {
                        if let Some(found) = first_string(vv) {
                            return Some(found);
                        }
                    }
                    None
                }
                _ => None,
            }
        }

        let urls_api = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("urls".into()).get("api".into());
        let mut base = urls_api.get(api.clone());
        if !base.is_string() {
            base = urls_api.get("public".into());
        }
        if !base.is_string() {
            if let Value::Json(json_api) = urls_api.clone() {
                if let Some(found) = first_string(&json_api) {
                    base = Value::from(found);
                }
            }
        }
        if !base.is_string() {
            base = urls_api.clone();
        }
        if !base.is_string() || !path.is_string() {
            eprintln!(
                "ccxt-rs request skipped: base url missing (api='{}', path='{}')",
                api.unwrap_str(),
                path.unwrap_str()
            );
            return Value::Undefined;
        }
        let mut base_url = base.unwrap_str().to_string();
        let hostname = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("hostname".into());
        if hostname.is_string() {
            base_url = base_url.replace("{hostname}", hostname.unwrap_str());
        }
        while let Some(start) = base_url.find('{') {
            if let Some(rel_end) = base_url[start..].find('}') {
                let end = start + rel_end;
                let replacement = if hostname.is_string() { hostname.unwrap_str() } else { "" };
                base_url.replace_range(start..=end, replacement);
            } else {
                break;
            }
        }

        let mut url = format!("{}/{}", base_url.trim_end_matches('/'), path.unwrap_str());
        let method_upper = method.unwrap_str().to_uppercase();

        let mut query_pairs: Vec<String> = vec![];
        if let Value::Json(serde_json::Value::Object(map)) = params.clone() {
            for (k, v) in map {
                if v.is_null() { continue; }
                let value_str = match v {
                    serde_json::Value::String(s) => s,
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => if b { "true".into() } else { "false".into() },
                    _ => v.to_string(),
                };
                query_pairs.push(format!("{}={}", urlencoding::encode(&k), urlencoding::encode(&value_str)));
            }
        }

        if method_upper == "GET" && !query_pairs.is_empty() {
            url.push('?');
            url.push_str(&query_pairs.join("&"));
        }

        let client = match reqwest::Client::builder()
            .no_proxy()
            .timeout(std::time::Duration::from_secs(20))
            .user_agent("ccxt-rs-smoke/0.1")
            .build()
        {
            Ok(c) => c,
            Err(err) => {
                eprintln!("ccxt-rs request client build failed for {}: {}", url, err);
                return Value::Undefined;
            }
        };
        let mut req = match method_upper.as_str() {
            "POST" => client.post(&url),
            "PUT" => client.put(&url),
            "DELETE" => client.delete(&url),
            _ => client.get(&url),
        };
        if method_upper != "GET" {
            if let Value::Json(serde_json::Value::Object(map)) = params.clone() {
                let body_text = serde_json::to_string(&map).unwrap_or_else(|_| "{}".to_string());
                req = req.header("content-type", "application/json").body(body_text);
            }
        }

        let response = match req.send().await {
            Ok(r) => r,
            Err(err) => {
                eprintln!("ccxt-rs request send failed for {} {}: {}", method_upper, url, err);
                return Value::Undefined;
            }
        };
        let text = match response.text().await {
            Ok(t) => t,
            Err(err) => {
                eprintln!("ccxt-rs request body read failed for {} {}: {}", method_upper, url, err);
                return Value::Undefined;
            }
        };
        match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(json) => Value::Json(json),
            Err(_) => Value::from(text),
        }
    }\n`,
        fetchStatus: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["status", "ping", "time", "system/status"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("public", "GET", "status"), ("public", "GET", "ping"), ("public", "GET", "time"), ("sapi", "GET", "system/status")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchTicker: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["ticker/24hr", "ticker", "ticker/price", "bookticker", "tickers"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("public", "GET", "ticker/24hr"), ("public", "GET", "ticker"), ("public", "GET", "ticker/price")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchTickers: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["tickers", "ticker/24hr", "ticker", "bookticker"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("public", "GET", "ticker/24hr"), ("public", "GET", "tickers"), ("public", "GET", "ticker")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchOrderBook: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["depth", "orderbook", "order_book"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("public", "GET", "depth"), ("public", "GET", "orderbook"), ("public", "GET", "order_book")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchOHLCV: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        request.set("timeframe".into(), timeframe.clone());
        request.set("interval".into(), timeframe.clone());
        if since.is_nonnullish() { request.set("since".into(), since.clone()); request.set("startTime".into(), since.clone()); }
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["klines", "candles", "ohlcv"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("public", "GET", "klines"), ("public", "GET", "candles"), ("public", "GET", "ohlcv")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchTime: (header, requestCall) => header + `{
        let candidates = vec![("public", "GET", "time"), ("public", "GET", "server/time"), ("public", "GET", "timestamp")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), params.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchTrades: (header, requestCall) => header + `{
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        if since.is_nonnullish() { request.set("since".into(), since.clone()); request.set("startTime".into(), since.clone()); }
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let candidates = vec![("public", "GET", "trades"), ("public", "GET", "recent_trades"), ("public", "GET", "aggTrades")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchL2OrderBook: (header, requestCall) => header + `{
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let candidates = vec![("public", "GET", "depth"), ("public", "GET", "orderbook"), ("public", "GET", "order_book")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchBidsAsks: (header, requestCall) => header + `{
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        if symbols.is_nonnullish() { request.set("symbols".into(), symbols.clone()); }
        let candidates = vec![("public", "GET", "ticker/bookTicker"), ("public", "GET", "bookticker"), ("public", "GET", "bidsasks"), ("public", "GET", "tickers")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchBalance: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["account/balance", "balance", "wallet/balance", "accounts/balance", "account"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.ends_with(&format!("/{}", token)) || p.contains(&format!("/{}/", token)) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("private", "GET", "balance"), ("private", "GET", "account/balance"), ("private", "GET", "wallet/balance")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchMyTrades: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        if symbol.is_nonnullish() { request.set("symbol".into(), symbol.clone()); }
        if since.is_nonnullish() { request.set("since".into(), since.clone()); request.set("startTime".into(), since.clone()); }
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["mytrades", "my_trades", "trades/history", "fills", "user/trades", "executions"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.ends_with(&format!("/{}", token)) || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("private", "GET", "myTrades"), ("private", "GET", "fills"), ("private", "GET", "trades/history")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchOrders: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        if symbol.is_nonnullish() { request.set("symbol".into(), symbol.clone()); }
        if since.is_nonnullish() { request.set("since".into(), since.clone()); request.set("startTime".into(), since.clone()); }
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["allorders", "all_orders", "orders/history", "orders"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.ends_with(&format!("/{}", token)) || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("private", "GET", "allOrders"), ("private", "GET", "orders"), ("private", "GET", "orders/history")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchOpenOrders: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        if symbol.is_nonnullish() { request.set("symbol".into(), symbol.clone()); }
        if since.is_nonnullish() { request.set("since".into(), since.clone()); }
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["openorders", "open_orders", "orders/open", "orders/active"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.ends_with(&format!("/{}", token)) || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("private", "GET", "openOrders"), ("private", "GET", "orders/open"), ("private", "GET", "orders/active")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchClosedOrders: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        if symbol.is_nonnullish() { request.set("symbol".into(), symbol.clone()); }
        if since.is_nonnullish() { request.set("since".into(), since.clone()); request.set("startTime".into(), since.clone()); }
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["closedorders", "closed_orders", "orders/closed", "orders/history"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.ends_with(&format!("/{}", token)) || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("private", "GET", "closedOrders"), ("private", "GET", "orders/closed"), ("private", "GET", "orders/history")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchPositions: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        if symbols.is_nonnullish() { request.set("symbols".into(), symbols.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["positions", "position", "positionrisk", "position_risk"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.ends_with(&format!("/{}", token)) || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("private", "GET", "positions"), ("private", "GET", "positionRisk"), ("fapi", "GET", "positionRisk")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        createOrder: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("symbol".into(), symbol.clone());
        request.set("type".into(), r#type.clone());
        request.set("side".into(), side.clone());
        request.set("amount".into(), amount.clone());
        if price.is_nonnullish() { request.set("price".into(), price.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["order", "orders"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "POST" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.ends_with(&format!("/{}", token)) || p.ends_with(&format!("/{}", "orders")) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("private", "POST", "order"), ("private", "POST", "orders")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        cancelOrder: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        request.set("orderId".into(), id.clone());
        if symbol.is_nonnullish() { request.set("symbol".into(), symbol.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["order", "orders"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "DELETE" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.ends_with(&format!("/{}", token)) || p.ends_with(&format!("/{}", "orders")) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("private", "DELETE", "order"), ("private", "DELETE", "orders")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchDeposits: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        if code.is_nonnullish() { request.set("coin".into(), code.clone()); request.set("currency".into(), code.clone()); }
        if since.is_nonnullish() { request.set("since".into(), since.clone()); request.set("startTime".into(), since.clone()); }
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["deposits", "deposit/history", "deposit_history", "capital/deposit/hisrec"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.ends_with(&format!("/{}", token)) || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("sapi", "GET", "capital/deposit/hisrec"), ("private", "GET", "deposits"), ("private", "GET", "deposit/history")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
        fetchWithdrawals: (header, requestCall) => header + `{
        fn collect_routes(node: &serde_json::Value, api_name: &str, out: &mut Vec<(String, String, String)>) {
            if let serde_json::Value::Object(map) = node {
                for (k, v) in map { let kl = k.to_lowercase(); if kl == "get" || kl == "post" || kl == "put" || kl == "delete" { if let serde_json::Value::Object(paths) = v { for (p, _cost) in paths { out.push((api_name.to_string(), kl.to_uppercase(), p.clone())); } } } else { collect_routes(v, api_name, out); } }
            }
        }
        let mut request = if params.is_object() { params.clone() } else { Value::new_object() };
        if code.is_nonnullish() { request.set("coin".into(), code.clone()); request.set("currency".into(), code.clone()); }
        if since.is_nonnullish() { request.set("since".into(), since.clone()); request.set("startTime".into(), since.clone()); }
        if limit.is_nonnullish() { request.set("limit".into(), limit.clone()); }
        let mut dynamic_calls: Vec<(String, String, String)> = vec![];
        if let Value::Json(serde_json::Value::Object(api_map)) = <Self as ${capitalizeFirstLetter(className)}>::describe(self).get("api".into()) {
            for (api_name, node) in api_map { collect_routes(&node, &api_name, &mut dynamic_calls); }
        }
        for token in ["withdrawals", "withdraw/history", "withdrawal_history", "capital/withdraw/history"] {
            for (api_name, method_name, path_name) in &dynamic_calls {
                if method_name.as_str() != "GET" || path_name.contains('{') { continue; }
                let p = path_name.to_lowercase();
                if p == token || p.ends_with(&format!("/{}", token)) || p.contains(token) {
                    let rv = ${requestCall || 'self.request('}path_name.clone().into(), api_name.clone().into(), method_name.clone().into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
                    if !rv.is_undefined() { return rv; }
                }
            }
        }
        let candidates = vec![("sapi", "GET", "capital/withdraw/history"), ("private", "GET", "withdrawals"), ("private", "GET", "withdraw/history")];
        for (api_name, method_name, path_name) in candidates {
            let rv = ${requestCall || 'self.request('}path_name.into(), api_name.into(), method_name.into(), request.clone(), Value::Undefined, Value::Undefined, Value::Undefined).await;
            if !rv.is_undefined() { return rv; }
        }
        Value::Undefined
    }\n`,
    };

    const output = { value: '' };
    let currentOutput = output;

    const emit = (x: string) => {
        currentOutput.value += x;
    };

    const asType = (state: any, type?: string) => ({
        ...state,
        asType: type,
    });

    const withNewOutput = (node: any, state: any, c: any) => {
        const oldOutput = currentOutput;
        const rv = { value: '' };
        currentOutput = rv;
        c(node, asType(state));
        currentOutput = oldOutput;
        return rv.value;
    };

    const indent = (state: any) => {
        emit(' '.repeat(state.indentLevel * state.indentSize));
    };

    // Build a lowercase set for case-insensitive dispatch matching
    // (enumerateApiMethodMapping generates slightly different casing than JS source)
    const apiMethodsLower = new Set([...apiMethods].map(m => m.toLowerCase()));

    // Regex to detect API dispatch method names by convention
    // Matches patterns like privateGetFoo, publicPostBar, sapiGetBaz, v1_01PrivateGetFoo, traderPrivatePatchFoo, etc.
    const dispatchMethodPattern = /^(?:public|private|sapi|dapi|fapi|papi|eapi|v\d|trader)/i;

    const isDispatchCall = (node: any) => {
        if (node.type !== 'CallExpression') {
            throw new Error('Unexpected node type');
        }
        if (
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'ThisExpression' &&
            node.callee.property.type === 'Identifier'
        ) {
            if (node.callee.property.name === 'method' && node.callee.computed) return true;
            if (node.callee.computed) return false;
            const name = node.callee.property.name;
            // Explicit match against known API methods
            if (apiMethodsLower.has(name.toLowerCase())) return true;
            // Pattern-based fallback: detect dispatch calls by naming convention
            if (dispatchMethodPattern.test(name)) return true;
            return false;
        }
        return false;
    };

    const isOverridenMethodCall = (node: any) => {
        if (className === 'Exchange') return false;
        if (
            !node.callee.computed &&
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'ThisExpression' &&
            node.callee.property.type === 'Identifier'
        ) {
            const fname = node.callee.property.name;
            // Only use UFCS for methods the exchange's own trait defines,
            // to avoid ambiguity between Exchange and the exchange-specific trait.
            if (opts.ownMethodNames?.has(fname)) return true;
            // Also match methods only known through FUNCTION_INFO (not in base, not manually implemented)
            if (!baseMethodNames?.includes(fname) && !MANUALLY_IMPLEMENTED_METHODS.has(fname) && FUNCTION_INFO[className]?.[fname]) return true;
            return false;
        }
        return false;
    };

    const parseAndEmitDocComment = (comment: any, state: any) => {
        let lines = comment.value.split('\n');
        lines = lines.slice(1, lines.length - 1);
        lines = lines.map((l: string) => l.replace(/{@link ([^}]+)}/g, '($1)'));

        const returns: string[] = [];
        const params: string[] = [];
        const descriptions: string[] = [];
        const otherTags: string[] = [];
        const otherText: string[] = [];

        for (const line of lines) {
            const line1 = line.replace(/^\s*\*\s*/g, '');
            if (line1.includes('@method') || line1.includes('@name')) {
                // ignore
            } else if (line1.includes('@return')) {
                returns.push(line1);
            } else if (line1.includes('@param')) {
                params.push(line1);
            } else if (line1.includes('@description')) {
                descriptions.push(line1);
            } else if (line1.includes('@ignore')) {
                otherTags.push(line1);
            } else {
                otherText.push(line1);
            }
        }

        if (returns.length > 0) {
            indent(state);
            emit(
                '/// Returns ' +
                    returns.map((x) => uncapitalizeFirstLetter(x.replace('@returns ', '').replace('@return ', '').replace(/{[\w|\[\]]+} /, ''))).join('; ')
            );
            emit('\n');

            indent(state);
            emit('///\n');
        }

        for (const line of otherTags) {
            indent(state);
            emit(`/// ${line}\n`);
        }

        for (const line of descriptions) {
            indent(state);
            emit(`/// ${capitalizeFirstLetter(line.replace('@description ', ''))}\n`);
        }

        for (const line of otherText) {
            indent(state);
            emit(`/// ${line}\n`);
        }

        if (params.length > 0) {
            indent(state);
            emit('///\n');
            indent(state);
            emit('/// # Arguments\n');
            indent(state);
            emit('///\n');
            for (const line of params) {
                indent(state);
                const line1 = line.replace('@param ', '');
                const words = line1.split(' ');
                const paramType = words.shift();
                const paramName = words.shift();
                emit('/// * `' + paramName + '` ' + paramType + ' - ' + words.join(' ') + '\n');
            }
        }
    };

    const varTypes: Dict<string> = {};

    const inferType = (node: any) => {
        switch (node.type) {
            case 'Identifier':
                return varTypes[node.name];
            case 'MemberExpression':
                if (!node.computed && node.property.type === 'Identifier' && node.property.name.toLowerCase().endsWith('length')) {
                    return 'usize';
                }
                return undefined;
            default:
                return undefined;
        }
    };

    // Conservative inference hook (inspired by TS-based transpiler):
    // only infer usize when initializer is clearly index-like.
    const inferVarDeclType = (init: any) => {
        if (!init) return 'value';
        if (init.type === 'Literal' && typeof init.value === 'number' && Number.isInteger(init.value) && init.value >= 0) {
            return 'usize';
        }
        if (
            init.type === 'MemberExpression' &&
            !init.computed &&
            init.property?.type === 'Identifier' &&
            init.property.name.toLowerCase().endsWith('length')
        ) {
            return 'usize';
        }
        return 'value';
    };

    let tryCounter = 0;

    walkRecursive(
        ast,
        {
            indentLevel: 1,
            indentSize: 4,
            asType: undefined,
        },
        {
            FunctionDeclaration(node: any, state: any, c: any) {
                if (comments[0] && comments[0].type === 'Block' && (comments[0].value.includes('@method') || comments[0].value.includes('@param'))) {
                    parseAndEmitDocComment(comments[0], state);
                    comments.shift();
                }

                const params: string[] = [];
                const defaultValues: Dict<any> = {};
                for (const param of node.params) {
                    switch (param.type) {
                        case 'Identifier':
                            params.push(transformIdentifier(param.name));
                            break;
                        case 'AssignmentPattern': {
                            const n = transformIdentifier(param.left.name);
                            params.push(n);
                            if (!isUndefined(param.right)) {
                                defaultValues[n] = param.right;
                            }
                            break;
                        }
                        default:
                            throw new Error('Unsupported parameter type: ' + param.type);
                    }
                }

                indent(state);
                let retType = 'Value';
                const fname = node.id.name;
                const isAsync = node.async;
                let isSelfImmutable = false;
                if (
                    fname.startsWith('safe') ||
                    fname.startsWith('parseWs') ||
                    fname.startsWith('filter') ||
                    fname === 'marketSymbols' ||
                    fname.startsWith('convert') ||
                    fname === 'commonCurrencyCode' ||
                    fname === 'market' ||
                    fname === 'getSupportedMapping' ||
                    fname === 'describe' ||
                    fname === 'nonce' ||
                    fname === 'symbol' ||
                    fname === 'account' ||
                    fname === 'currency' ||
                    fname === 'sign' ||
                    fname === 'encode' ||
                    fname === 'hash' ||
                    fname === 'hmac' ||
                    fname === 'createExpiredOptionMarket' ||
                    fname === 'getNetworkCodeByNetworkUrl' ||
                    // Pure formatters / converters that may be called inside safe* args:
                    fname.endsWith('ToPrecision') ||
                    fname.startsWith('parseToNumeric') ||
                    fname.startsWith('parseToInt') ||
                    fname.startsWith('from') ||
                    fname.startsWith('getPrivateType') ||
                    // Parse methods that transform without mutating self.
                    // Exclude parseWS* (uppercase) — those update this.balance etc directly.
                    (fname.startsWith('parse') && !fname.startsWith('parseWS')) ||
                    // Currency/precision converters and trade helpers called from parseWs* context:
                    fname.endsWith('FromPrecision') ||
                    fname.endsWith('OrMaker') ||
                    fname.endsWith('Url') ||
                    fname === 'calculateFee' ||
                    // Pure lookup/conversion/formatting helpers (no state mutation):
                    fname.startsWith('find') ||
                    fname.startsWith('format') ||
                    fname.startsWith('calculate') ||
                    // Specific well-known pure helpers that don't match prefixes above:
                    fname === 'coinToMarketId' ||
                    fname === 'getDelistedMarketById' ||
                    fname === 'findMarketByAltnameOrId' ||
                    fname === 'getSymbolFromAssetPair' ||
                    fname === 'marketCodes' ||
                    fname === 'assignDefaultDepositWithdrawFees' ||
                    fname === 'getMarketFromSymbols' ||
                    fname === 'hashMessage' ||
                    fname === 'signHash'
                ) {
                    isSelfImmutable = true;
                }
                // Override: if the body makes calls to known &mut self methods, it must be &mut self.
                // Walk the AST to find: this.mutatingMethod() or this[variable]() (computed dispatch).
                if (isSelfImmutable && node.body) {
                    const mutatingMethodNames = new Set([
                        'dispatch', 'request', 'loadMarkets', 'loadAccounts',
                        'handleOptionAndParams', 'handleOptionAndParams2', 'handleOption',
                        'handleMarketTypeAndParams', 'handleSubTypeAndParams',
                        'handleMarginModeAndParams',
                    ]);
                    const bodyHasMutatingCall = (n: any): boolean => {
                        if (!n || typeof n !== 'object') return false;
                        if (n.type === 'CallExpression' && n.callee?.type === 'MemberExpression') {
                            const callee = n.callee;
                            if (callee.object?.type === 'ThisExpression') {
                                // this[variable]() — computed dispatch
                                if (callee.computed) return true;
                                // this.mutatingMethod()
                                if (callee.property?.type === 'Identifier' && mutatingMethodNames.has(callee.property.name)) return true;
                            }
                        }
                        // Recurse into all child nodes
                        for (const key of Object.keys(n)) {
                            const child = n[key];
                            if (Array.isArray(child)) {
                                if (child.some((c: any) => bodyHasMutatingCall(c))) return true;
                            } else if (child && typeof child === 'object' && child.type) {
                                if (bodyHasMutatingCall(child)) return true;
                            }
                        }
                        return false;
                    };
                    if (bodyHasMutatingCall(node.body)) {
                        isSelfImmutable = false;
                    }
                }

                if (fname.startsWith('throw')) {
                    retType = '()';
                }

                if (fname === 'describe' && exchangeDescribe) {
                    emit('fn describe(&self) -> Value {\n');
                    indent({
                        ...state,
                        indentLevel: state.indentLevel + 1,
                    });
                    emit('Value::Json(serde_json::Value::from_str(r###"');
                    emit(
                        JSON.stringify(exchangeDescribe, null, 4)
                            .split('\n')
                            .join('\n' + ' '.repeat(state.indentSize * (state.indentLevel + 1)))
                    );
                    emit('"###).unwrap())\n');
                    indent(state);
                    emit('}');
                    return;
                }

                // Skip methods that are manually implemented in exchange.rs
                if (MANUALLY_IMPLEMENTED_METHODS.has(fname)) {
                    return;
                }

                const headerStr =
                    `${isAsync ? 'async ' : ''}fn ${unCamelCamelCase(fname)}(&${isSelfImmutable ? '' : 'mut '}self` +
                    (params.length ? `, ${params.map((x: string) => `mut ${x}: Value`).join(', ')}` : '') +
                    `) -> ${retType} `;

                // Use hand-written Rust body for methods whose JS depends on unimplemented runtime
                if (HANDWRITTEN_METHODS[fname]) {
                    const hasOwnRequest = opts.ownMethodNames?.has('request');
                    const reqCall = hasOwnRequest
                        ? `<Self as ${capitalizeFirstLetter(className)}>::request(self,`
                        : 'self.request(';
                    emit(HANDWRITTEN_METHODS[fname](headerStr, reqCall));
                    return;
                }

                // Base Exchange class methods depend on runtime state (this.markets, etc.)
                // that isn't implemented yet — emit stubs for them.
                // Only exchange-specific overrides get fully transpiled bodies.
                if (className === 'Exchange' || opts.isInherited) {
                    if (retType === '()') {
                        emit(headerStr + '{ }\n');
                    } else {
                        emit(headerStr + '{ Value::Undefined }\n');
                    }
                    return;
                }

                emit(`${isAsync ? 'async ' : ''}fn ${unCamelCamelCase(fname)}(&${isSelfImmutable ? '' : 'mut '}self`);
                if (params.length > 0) {
                    emit(', ');
                    emit(`${params.map((x) => `mut ${x}: Value`).join(', ')}`);
                }
                emit(`) -> ${retType} `);

                if (node.body.body.length === 0 && retType === 'Value') {
                    emit('{ Value::Undefined }');
                } else {
                    let appendBlock = undefined;
                    if (retType === 'Value' && node.body.body.length > 0 && node.body.body[node.body.body.length - 1].type !== 'ReturnStatement') {
                        appendBlock = 'Value::Undefined';
                    }
                    c(
                        node.body,
                        asType({
                            ...state,
                            defaultValues,
                            functionName: fname,
                            isAsyncFunction: isAsync,
                            indentLevel: state.indentLevel + 1,
                            appendBlock,
                        })
                    );
                }
            },

            BlockStatement(node: any, state: any, c: any) {
                emit('{\n');
                const appendBlock = state.appendBlock;
                state.appendBlock = undefined;

                if (state.defaultValues) {
                    for (const [name, value] of Object.entries(state.defaultValues)) {
                        indent(state);
                        emit(`${name} = ${name}.or_default(`);
                        c(value, asType(state, 'value'));
                        emit(');\n');
                    }
                }

                state = {
                    ...state,
                    defaultValues: undefined,
                };

                for (const stmt of node.body) {
                    while (comments[0] && comments[0].start < stmt.start) {
                        switch (comments[0].type) {
                            case 'Line':
                                indent(state);
                                emit('//');
                                emit(comments[0].value);
                                emit('\n');
                                comments.shift();
                                break;
                            case 'Block':
                                indent(state);
                                emit('/*');
                                const lines = comments[0].value.split('\n');
                                for (let i = 0; i < lines.length; i++) {
                                    emit(lines[i]);
                                    if (i < lines.length - 1) {
                                        emit('\n');
                                    }
                                }
                                emit('*/\n');
                                comments.shift();
                                break;
                            default:
                                throw new Error('Unsupported comment type: ' + comments[0].type);
                        }
                    }
                    indent(state);
                    c(stmt, asType(state));
                    emit(';\n');
                }

                if (appendBlock) {
                    indent(state);
                    emit(appendBlock);
                    emit('\n');
                }

                indent({
                    ...state,
                    indentLevel: state.indentLevel - 1,
                });
                emit('}');
            },

            ThrowStatement(node: any, state: any, c: any) {
                if (state.tryLabel) {
                    // Inside a try block — capture error value and break out of labeled block
                    emit(`{ ${state.tryErrorVar} = `);
                    const arg = node.argument;
                    if (arg.type === 'NewExpression' && arg.callee.type === 'Identifier') {
                        // throw new ErrorClass(msg, ...) → use first arg as error value
                        if (arg.arguments.length > 0) {
                            c(arg.arguments[0], asType(state, 'value'));
                        } else {
                            emit(`Value::from("${arg.callee.name}")`);
                        }
                    } else {
                        c(arg, asType(state, 'value'));
                    }
                    emit(`; break ${state.tryLabel}; }`);
                } else {
                    // Outside any try block — return undefined (can't propagate without Result types)
                    emit('return Value::Undefined');
                }
            },

            NewExpression(node: any, state: any, c: any) {
                // Dynamic constructor (e.g., new broad[key](msg)): not expressible in Rust types
                // Fall back to passing the first argument directly (error stubs all return msg)
                if (node.callee.type === 'MemberExpression' && node.callee.computed) {
                    if (node.arguments.length >= 1) {
                        c(node.arguments[0], asType(state));
                    } else {
                        emit('Value::Undefined');
                    }
                    return;
                }
                // ArrayCache types: ignore limit arg (WS stubs use 0-arg ::new())
                const CACHE_TYPES = new Set(['ArrayCache', 'ArrayCacheByTimestamp', 'ArrayCacheBySymbolById', 'ArrayCacheBySymbolBySide']);
                if (node.callee.type === 'Identifier' && CACHE_TYPES.has(node.callee.name)) {
                    emit(`${node.callee.name}::new()`);
                    return;
                }
                c(node.callee, asType(state));
                emit('::new(');
                for (let i = 0; i < node.arguments.length; i++) {
                    const arg = node.arguments[i];
                    c(arg, asType(state, 'value'));
                    if (i < node.arguments.length - 1) {
                        emit(', ');
                    }
                }
                emit(')');
            },

            ExpressionStatement(node: any, state: any, c: any) {
                c(node.expression, asType(state));
            },

            AwaitExpression(node: any, state: any, c: any) {
                const callee = node.argument.callee;
                let shouldAwait = true;
                if (
                    callee?.object?.type === 'ThisExpression' &&
                    callee?.property?.type === 'Identifier' &&
                    callee?.property?.name === 'market'
                ) {
                    shouldAwait = false;
                }

                c(
                    node.argument,
                    asType(
                        {
                            ...state,
                            awaited: shouldAwait,
                        },
                        state.asType
                    )
                );
            },

            AssignmentExpression(node: any, state: any, c: any) {
                if (
                    node.left.type === 'MemberExpression' &&
                    node.left.object.type === 'ThisExpression' &&
                    node.left.property.type === 'Identifier' &&
                    node.left.property.name === 'number' &&
                    node.right.type === 'Identifier' &&
                    node.right.name === 'String'
                ) {
                    emit('self.set_number_mode("String".into())');
                    return;
                }

                if (node.left.type === 'MemberExpression') {
                    c(node.left.object, asType(state));
                    emit('.set(');
                    switch (node.left.property.type) {
                        case 'Literal':
                            c(node.left.property, asType(state));
                            emit('.into()');
                            break;
                        case 'Identifier':
                            if (node.left.computed) {
                                c(node.left.property, asType(state, 'value'));
                            } else {
                                emit('"');
                                c(node.left.property, asType(state));
                                emit('".into()');
                            }
                            break;
                        default:
                            c(node.left.property, asType(state));
                            break;
                    }
                    emit(', ');
                    c(node.right, asType(state, 'value'));
                    emit(')');
                    return;
                }

                let destructure = 0;
                if (node.left.type === 'ArrayPattern') {
                    destructure = node.left.elements.length;
                    emit('(');
                    for (let i = 0; i < node.left.elements.length; i++) {
                        const el = node.left.elements[i];
                        c(el, asType(state));
                        if (i < node.left.elements.length - 1) {
                            emit(', ');
                        }
                    }
                    emit(')');
                } else {
                    c(node.left, asType(state));
                }

                emit(' ');

                switch (node.operator) {
                    case '=':
                        emit(node.operator);
                        break;
                    case '+=':
                        emit('= ');
                        c(node.left, asType(state));
                        emit(' + ');
                        break;
                    case '-=':
                        emit('= ');
                        c(node.left, asType(state));
                        emit(' - ');
                        break;
                    case '*=':
                        emit('= ');
                        c(node.left, asType(state));
                        emit(' * ');
                        break;
                    case '/=':
                        emit('= ');
                        c(node.left, asType(state));
                        emit(' / ');
                        break;
                    default:
                        throw new Error('Unexpected assignment operator');
                }
                emit(' ');

                if (destructure > 0) {
                    emit(`shift_${destructure}(`);
                    c(node.right, asType(state, 'value'));
                    emit(')');
                } else {
                    // Use usize context when assigning to a known usize variable
                    const lhsName = node.left.type === 'Identifier' ? node.left.name : undefined;
                    const rhsType = lhsName && (varTypes[lhsName] === 'usize' || varTypes[transformIdentifier(lhsName)] === 'usize') ? 'usize' : 'value';
                    c(node.right, asType(state, rhsType));
                }
            },

            VariableDeclaration(node: any, state: any, c: any) {
                for (const decl of node.declarations) {
                    c(decl, asType(state));
                }
            },

            VariableDeclarator(node: any, state: any, c: any) {
                switch (node.id.type) {
                    case 'Identifier': {
                        const ident = transformIdentifier(node.id.name);
                        const inferredType = state.parent?.type === 'ForStatement' ? 'usize' : inferVarDeclType(node.init);
                        if (inferredType === 'usize') {
                            emit(`let mut ${ident}: usize = `);
                            if (node.init) {
                                c(node.init, asType(state, 'usize'));
                            } else {
                                emit('0');
                            }
                            varTypes[ident] = 'usize';
                            varTypes[node.id.name] = 'usize'; // also store JS camelCase for Identifier lookups
                        } else {
                            emit(`let mut ${ident}: Value = `);
                            if (node.init) {
                                c(node.init, asType(state, 'value'));
                            } else {
                                emit('Value::Undefined');
                            }
                            varTypes[ident] = 'value';
                            varTypes[node.id.name] = 'value'; // also store JS camelCase
                        }
                        break;
                    }
                    case 'ArrayPattern': {
                        emit('let (');
                        for (let i = 0; i < node.id.elements.length; i++) {
                            const el = node.id.elements[i];
                            emit('mut ');
                            c(el, asType(state));
                            if (i < node.id.elements.length - 1) {
                                emit(', ');
                            }
                        }
                        emit(') = ');
                        emit(`shift_${node.id.elements.length}(`);
                        if (node.init) {
                            c(node.init, asType(state, 'value'));
                        } else {
                            emit('Value::new_array()');
                        }
                        emit(')');
                        break;
                    }
                    default:
                        throw new Error('Unexpected VariableDeclarator');
                }
            },

            Literal(node: any, state: any) {
                switch (typeof node.value) {
                    case 'number':
                        switch (state.asType) {
                            case undefined:
                            case 'usize':
                                break;
                            case 'property':
                            case 'rvalue':
                            case 'value':
                                emit('Value::from(');
                                break;
                            default:
                                throw new Error('Unexpected literal type');
                        }
                        emit(node.value.toString());
                        if (node.value < -2147483648 || node.value > 2147483647) {
                            emit('i64');
                        }
                        switch (state.asType) {
                            case undefined:
                            case 'usize':
                                break;
                            case 'property':
                            case 'rvalue':
                            case 'value':
                                emit(')');
                                break;
                            default:
                                throw new Error('Unexpected literal type');
                        }
                        break;
                    case 'string':
                        switch (state.asType) {
                            case undefined:
                                break;
                            case 'value':
                            case 'rvalue':
                            case 'property':
                                emit('Value::from(');
                                break;
                            default:
                                throw new Error('Unexpected literal type');
                        }
                        emit(quoteString(node.value));
                        switch (state.asType) {
                            case undefined:
                                break;
                            case 'value':
                            case 'rvalue':
                            case 'property':
                                emit(')');
                                break;
                            default:
                                throw new Error('Unexpected literal type');
                        }
                        break;
                    case 'boolean':
                        switch (state.asType) {
                            case undefined:
                            case 'bool':
                                emit(node.value ? 'true' : 'false');
                                break;
                            case 'rvalue':
                            case 'value':
                                emit(node.value ? 'Value::from(true)' : 'Value::from(false)');
                                break;
                            default:
                                throw new Error('Unexpected literal type');
                        }
                        break;
                    case 'object':
                        if (node.value === null) {
                            emit('Value::null()');
                        } else {
                            throw new Error('Unexpected literal type');
                        }
                        break;
                    default:
                        throw new Error('Unexpected literal type');
                }
            },

            ConditionalExpression(node: any, state: any, c: any) {
                emit('if ');
                c(node.test, asType(state, 'bool'));
                emit(' { ');
                c(node.consequent, asType(state, 'value'));
                emit(' } else { ');
                c(node.alternate, asType(state, 'value'));
                emit(' }');
            },

            UnaryExpression(node: any, state: any, c: any) {
                switch (node.operator) {
                    case '!':
                        switch (state.asType) {
                            case 'value':
                                emit('Value::from(');
                                break;
                            case 'bool':
                            case undefined:
                                break;
                            default:
                                throw new Error('Unexpected asType');
                        }
                        emit(node.operator);
                        c(node.argument, asType(state, 'bool'));
                        switch (state.asType) {
                            case 'value':
                                emit(')');
                                break;
                            case 'bool':
                            case undefined:
                                break;
                            default:
                                throw new Error('Unexpected asType');
                        }
                        break;
                    case 'typeof':
                        c(node.argument, asType(state));
                        emit('.typeof_()');
                        break;
                    case '-':
                        c(node.argument, asType(state, 'value'));
                        emit('.neg()');
                        break;
                    case '+':
                        // unary plus: no-op
                        c(node.argument, asType(state, 'value'));
                        break;
                    default:
                        // fallback for unsupported unary operators (e.g., void, delete, ~)
                        c(node.argument, asType(state, 'value'));
                }
            },

            IfStatement(node: any, state: any, c: any) {
                emit('if ');
                c(node.test, asType(state, 'bool'));
                emit(' ');
                c(
                    node.consequent,
                    asType({
                        ...state,
                        indentLevel: state.indentLevel + 1,
                    })
                );
                if (node.alternate) {
                    emit(' else ');
                    if (node.alternate.type === 'IfStatement') {
                        c(
                            node.alternate,
                            asType({
                                ...state,
                                indentLevel: state.indentLevel,
                            })
                        );
                    } else {
                        c(
                            node.alternate,
                            asType({
                                ...state,
                                indentLevel: state.indentLevel + 1,
                            })
                        );
                    }
                }
            },

            LogicalExpression(node: any, state: any, c: any) {
                switch (node.operator) {
                    case '&&':
                    case '||':
                        switch (state.asType) {
                            case 'rvalue':
                            case 'value':
                                // Emit as Value-preserving conditional: `(if lhs.is_truthy() { lhs } else { rhs })`
                                // Parens required so serde_json json! macro doesn't misparse { } as object literal.
                                if (node.operator === '||') {
                                    emit('(if ');
                                    c(node.left, asType(state, 'bool'));
                                    emit(' { ');
                                    c(node.left, asType(state, 'value'));
                                    emit(' } else { ');
                                    c(node.right, asType(state, 'value'));
                                    emit(' })');
                                } else {
                                    // &&: if lhs falsy return lhs; else return rhs
                                    emit('(if ');
                                    c(node.left, asType(state, 'bool'));
                                    emit(' { ');
                                    c(node.right, asType(state, 'value'));
                                    emit(' } else { ');
                                    c(node.left, asType(state, 'value'));
                                    emit(' })');
                                }
                                break;
                            case undefined:
                            case 'bool':
                                c(node.left, asType(state, 'bool'));
                                emit(' ');
                                emit(node.operator);
                                emit(' ');
                                c(node.right, asType(state, 'bool'));
                                break;
                            default:
                                throw new Error('Unexpected logical expression type');
                        }
                        break;
                    case '??':
                        // Nullish coalescing: a ?? b → (if a is defined use a, else b)
                        // Parens prevent json! macro from misparising { } as object literal.
                        emit('(if ');
                        c(node.left, asType(state, 'bool'));
                        emit('.is_nonnullish() { ');
                        c(node.left, asType(state, 'value'));
                        emit(' } else { ');
                        c(node.right, asType(state, 'value'));
                        emit(' })');
                        break;
                    default:
                        throw new Error('Unexpected logical operator');
                }
            },

            BinaryExpression(node: any, state: any, c: any) {
                switch (node.operator) {
                    case 'in':
                        c(node.right, asType(state));
                        emit('.contains_key(');
                        c(node.left, asType(state, 'value'));
                        emit(')');
                        switch (state.asType) {
                            case undefined:
                            case 'bool':
                                break;
                            case 'value':
                                emit('.into()');
                                break;
                            default:
                                throw new Error('Unexpected asType');
                        }
                        break;
                    case '===':
                    case '!==':
                    case '==':
                    case '!=':
                    case '>':
                    case '<':
                    case '>=':
                    case '<=':
                        if (state.asType === 'value') emit('Value::from(');
                        const desiredExpressionType = inferType(node.left) || 'value';
                        c(node.left, asType(state, desiredExpressionType));
                        if (
                            (node.operator === '===' || node.operator === '==' || node.operator === '!==' || node.operator === '!=') &&
                            node.right.name === 'undefined'
                        ) {
                            if (node.operator === '===' || node.operator === '==') {
                                emit('.is_nullish()');
                            } else {
                                emit('.is_nonnullish()');
                            }
                        } else {
                            emit(' ');
                            if (node.operator === '===') emit('==');
                            else if (node.operator === '!==') emit('!=');
                            else emit(node.operator);
                            emit(' ');
                            // When left is usize but right is NOT usize, emit right as 'value'
                            // so the PartialEq<Value>/PartialOrd<Value> for usize impls handle comparison.
                            const rhsInferred = inferType(node.right);
                            const rhsType = (desiredExpressionType === 'usize' && rhsInferred !== 'usize') ? 'value' : desiredExpressionType;
                            c(node.right, asType(state, rhsType));
                        }
                        if (state.asType === 'value') emit(')');
                        break;
                    case '+':
                    case '-':
                    case '*':
                    case '/':
                    case '%': {
                        const arithType = state.asType === 'usize' ? 'usize' : 'value';
                        c(node.left, asType(state, arithType));
                        emit(' ');
                        emit(node.operator);
                        emit(' ');
                        c(node.right, asType(state, arithType));
                        break;
                    }
                    case 'instanceof':
                        // x instanceof Error → always false in Value runtime
                        if (state.asType === 'value') emit('Value::from(');
                        emit('false');
                        if (state.asType === 'value') emit(')');
                        break;
                    default:
                        throw new Error('Unexpected binary operator: ' + node.operator);
                }
            },

            CallExpression(node: any, state: any, c: any) {
                // Handle x.call(this, ...) — dynamic dispatch stub; can't pass &mut self as Value
                if (
                    node.callee.type === 'MemberExpression' &&
                    !node.callee.computed &&
                    node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'call' &&
                    node.arguments.length > 0 &&
                    node.arguments[0].type === 'ThisExpression'
                ) {
                    emit('Value::Undefined');
                    return;
                }
                // Handle this.clone(x) — exchange deep-clone helper; translate to x.clone()
                if (
                    node.callee.type === 'MemberExpression' &&
                    !node.callee.computed &&
                    node.callee.object.type === 'ThisExpression' &&
                    node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'clone' &&
                    node.arguments.length >= 1
                ) {
                    c(node.arguments[0], asType(state, 'value'));
                    return;
                }
                // Handle static method calls: Object.keys(x) → x.keys(), etc.
                if (
                    node.callee.type === 'MemberExpression' &&
                    node.callee.object.type === 'Identifier' &&
                    !node.callee.computed
                ) {
                    const objName = node.callee.object.name;
                    const methodName = node.callee.property.name;
                    if (objName === 'Object' && (methodName === 'keys' || methodName === 'values' || methodName === 'entries') && node.arguments.length >= 1) {
                        c(node.arguments[0], asType(state, 'value'));
                        emit(`.${methodName}()`);
                        if (state.awaited) emit('.await');
                        return;
                    }
                    if (objName === 'JSON' && methodName === 'stringify' && node.arguments.length >= 1) {
                        c(node.arguments[0], asType(state, 'value'));
                        emit('.to_string()');
                        if (state.awaited) emit('.await');
                        return;
                    }
                    if (objName === 'JSON' && methodName === 'parse' && node.arguments.length >= 1) {
                        emit('self.parse_json(');
                        c(node.arguments[0], asType(state, 'value'));
                        emit(')');
                        if (state.awaited) emit('.await');
                        return;
                    }
                }

                let argCounts = getArgumentCount(className, node);
                // Ensure minimum arg counts for Value methods that need padding
                const valueMethodMinArgs: Dict<number> = { slice: 2 };
                const calledName = getFunctionNameFromCallee(node.callee);
                if (calledName && valueMethodMinArgs[calledName] && argCounts < valueMethodMinArgs[calledName]) {
                    argCounts = valueMethodMinArgs[calledName];
                }
                const retType = getReturnType(node);
                let shouldAwait = state.awaited;

                state = {
                    ...state,
                    awaited: undefined,
                };

                if (isDispatchCall(node)) {
                    if (node.callee.property.name === 'method' && node.callee.computed) {
                        emit(`self.dispatch(` + node.callee.property.name + `, `);
                    } else {
                        emit(`self.dispatch("` + node.callee.property.name + `".into(), `);
                    }
                    argCounts = 2;
                } else {
                    if (isOverridenMethodCall(node)) {
                        // Use UFCS to disambiguate between Exchange and exchange-specific trait
                        emit('<Self as ' + capitalizeFirstLetter(className) + '>::');
                        c(node.callee.property, asType({ ...state, parent: node }));
                        emit('(self');
                        if (argCounts > 0) emit(', ');
                    } else {
                        c(node.callee, asType({ ...state, parent: node }));
                        emit('(');
                        if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Super') {
                            emit('self');
                            if (argCounts > 0) emit(', ');
                        }
                    }
                }
                for (let i = 0; i < argCounts; i++) {
                    const arg = node.arguments[i];
                    if (!arg) {
                        emit('Value::Undefined');
                    } else {
                        c(arg, asType(state, 'value'));
                    }
                    if (i < argCounts - 1) emit(', ');
                }
                emit(')');
                switch (state.asType) {
                    case undefined:
                    case 'rvalue':
                        break;
                    case 'value':
                        if (retType === 'bool') emit('.into()');
                        break;
                    case 'usize':
                        emit('.unwrap_usize()');
                        break;
                    case 'bool':
                        if (retType !== 'bool') emit('.is_truthy()');
                        break;
                    default:
                        throw new Error('Unexpected asType');
                }

                const fname = getFunctionNameFromCallee(node.callee);
                if (fname === 'cancelOrder' || fname === 'fetchTransactionFees' || fname === 'fetchTransactionFee') {
                    shouldAwait = true;
                }
                // Always await dispatch calls — Rust can't store futures in Value
                if (isDispatchCall(node)) {
                    shouldAwait = true;
                }
                if (shouldAwait) emit('.await');
            },

            MemberExpression(node: any, state: any, c: any) {
                if (node.property.type === 'Literal' || (node.object.type === 'ThisExpression' && state.parent?.type !== 'CallExpression')) {
                    c(node.object, asType(state));
                    emit('.get(');
                    if (node.computed && node.property.type === 'Identifier') {
                        c(node.property, asType(state, 'rvalue'));
                    } else {
                        c(node.property, asType(state, 'property'));
                    }
                    emit(')');
                    switch (state.asType) {
                        case undefined:
                        case 'rvalue':
                        case 'value':
                        case 'property':
                            break;
                        case 'bool':
                            emit('.is_truthy()');
                            break;
                        case 'usize':
                            emit('.unwrap_usize()');
                            break;
                        default:
                            throw new Error('Unexpected asType');
                    }
                } else if (node.property.type === 'Identifier' && node.property.name === 'length') {
                    if (state.asType === 'value' || state.asType === 'rvalue') emit('Value::from(');
                    c(node.object, asType(state, undefined));
                    emit('.len()');
                    switch (state.asType) {
                        case 'usize':
                        case undefined:
                            break;
                        case 'rvalue':
                        case 'value':
                            emit(')');
                            break;
                        case 'bool':
                            emit(' > 0');
                            break;
                        default:
                            throw new Error('Unexpected asType');
                    }
                } else if (node.property.type === 'Identifier' && varTypes[node.property.name] === 'usize') {
                    c(node.object, asType(state));
                    emit('.get(');
                    c(node.property, asType(state));
                    emit('.into())');
                } else if (state.parent?.type === 'CallExpression' && node.property.type === 'Identifier' && node.property.name === 'extend') {
                    if (state.parent.arguments.length === 1) {
                        c(node.object, asType(state));
                        emit('.extend_1');
                    } else if (state.parent.arguments.length === 2) {
                        emit('extend_2');
                    } else {
                        throw new Error('Unsupported extend call');
                    }
                } else if (state.parent?.type === 'CallExpression' && node.property.type === 'Identifier' && node.property.name === 'deepExtend') {
                    if (state.parent.arguments.length === 2) {
                        c(node.object, asType(state));
                        emit('.deep_extend_2');
                    } else if (state.parent.arguments.length === 3) {
                        c(node.object, asType(state));
                        emit('.deep_extend_3');
                    } else if (state.parent.arguments.length === 4) {
                        c(node.object, asType(state));
                        emit('.deep_extend_4');
                    } else {
                        // fallback to variadic deep extend helper (to be implemented in rust runtime)
                        c(node.object, asType(state));
                        emit('.deep_extend');
                    }
                } else {
                    if (node.object.type === 'Identifier' && isUpperCase(node.object.name)) {
                        c(node.object, asType(state));
                        emit('::');
                        c(node.property, asType(state));
                    } else if (node.object.type === 'Super') {
                        c(node.object, asType(state));
                        emit('::');
                        c(node.property, asType(state));
                    } else {
                        if (state.parent?.type !== 'CallExpression') {
                            c(node.object, asType(state));
                            emit('.get(');
                            if (node.computed) {
                                // computed: obj[expr] — use the expression as a value key
                                c(node.property, asType(state, node.property.type === 'Identifier' ? 'rvalue' : 'value'));
                                emit('.clone()');
                            } else {
                                // non-computed: obj.prop — use the property name as a string key
                                c(node.property, asType(state, 'property'));
                            }
                            emit(')');
                            switch (state.asType) {
                                case 'bool':
                                    emit('.is_truthy()');
                                    break;
                                case 'value':
                                case 'rvalue':
                                case undefined:
                                    break;
                                default:
                                    throw new Error('Unexpected asType');
                            }
                        } else {
                            c(node.object, asType({ ...state, parent: node }));
                            emit('.');
                            c(node.property, asType({ ...state, parent: node }));
                        }
                    }
                }
            },

            ThisExpression() {
                emit('self');
            },

            Identifier(node: any, state: any) {
                if (state.asType === 'property') {
                    emit(`"${node.name}".into()`);
                    return;
                }
                switch (node.name) {
                    case 'undefined':
                        emit('Value::Undefined');
                        break;
                    case 'null':
                        emit('Value::Json(json!(null))');
                        break;
                    case 'true':
                    case 'false':
                        emit(node.name);
                        switch (state.asType) {
                            case 'bool':
                            case undefined:
                                break;
                            case 'value':
                                emit('.into()');
                                break;
                            default:
                                throw new Error(`Unsupported type ${state.asType}`);
                        }
                        break;
                    default:
                        if (isAllCaps(node.name) && varTypes[node.name] === undefined) {
                            emit(node.name);
                            switch (state.asType) {
                                case undefined:
                                case 'value':
                                    emit('.into()');
                                    break;
                                default:
                                    throw new Error(`Unsupported type ${state.asType}`);
                            }
                        } else {
                            switch (state.asType) {
                                case 'property':
                                    emit('"');
                                    break;
                                case undefined:
                                case 'bool':
                                case 'rvalue':
                                case 'usize':
                                case 'value':
                                case 'member':
                                    break;
                                default:
                                    throw new Error(`Unsupported type ${state.asType}`);
                            }
                            let isValueType = false;
                            if (varTypes[node.name] === 'usize') {
                                if (state.asType === 'value' || state.asType === 'rvalue') emit('Value::from(');
                                emit(transformIdentifier(node.name));
                                isValueType = true;
                            } else {
                                switch (node.name) {
                                    case 'length':
                                        if (varTypes['length'] !== undefined) {
                                            // locally declared variable named 'length'
                                            emit(transformIdentifier(node.name));
                                        } else {
                                            if (state.asType === 'value' || state.asType === 'rvalue') emit('Value::from(');
                                            emit('len()');
                                            isValueType = true;
                                        }
                                        break;
                                    case 'apiKey':
                                        emit(node.name);
                                        break;
                                    default:
                                        emit(transformIdentifier(node.name));
                                        break;
                                }
                            }
                            switch (state.asType) {
                                case 'property':
                                    emit('".into()');
                                    break;
                                case 'usize':
                                    if (varTypes[node.name] !== 'usize') emit('.unwrap_usize()');
                                    break;
                                case 'bool':
                                    if (varTypes[node.name] === 'usize') emit(' != 0');
                                    else emit('.is_truthy()');
                                    break;
                                case 'rvalue':
                                case 'value':
                                    if (isValueType) emit(')');
                                    else emit('.clone()');
                                    break;
                                case 'member':
                                case undefined:
                                    break;
                                default:
                                    throw new Error(`Unsupported type ${state.asType}`);
                            }
                        }
                }
            },

            ReturnStatement(node: any, state: any, c: any) {
                emit('return ');
                if (node.argument) {
                    // In async fn, a bare `return this.watchX(...)` returns a future in Rust.
                    // Auto-await any direct self method call not already wrapped in AwaitExpression.
                    const isUnawaited = state.isAsyncFunction &&
                        node.argument.type === 'CallExpression' &&
                        node.argument.callee?.type === 'MemberExpression' &&
                        (node.argument.callee.object.type === 'ThisExpression' || node.argument.callee.object.type === 'Super');
                    c(node.argument, asType({ ...state, awaited: isUnawaited ? true : state.awaited }, 'value'));
                } else {
                    emit('Value::Undefined');
                }
            },

            UpdateExpression(node: any, state: any, c: any) {
                c(node.argument, asType(state));
                switch (node.operator) {
                    case '++':
                        emit(' += 1');
                        break;
                    case '--':
                        emit(' -= 1');
                        break;
                    default:
                        throw new Error('Unsupported update operator: ' + node.operator);
                }
            },

            ArrayExpression(node: any, state: any, c: any) {
                if (node.elements.length === 0) {
                    emit('Value::new_array()');
                    return;
                }
                emit('Value::Json(serde_json::Value::Array(vec![');
                for (let i = 0; i < node.elements.length; i++) {
                    const element = node.elements[i];
                    if (!element) {
                        emit('Value::Undefined');
                    } else {
                        const isAsyncSelfCall = state.isAsyncFunction &&
                            element.type === 'CallExpression' &&
                            element.callee?.type === 'MemberExpression' &&
                            (element.callee.object.type === 'ThisExpression' || element.callee.object.type === 'Super');
                        emit('(');
                        c(element, asType({ ...state, awaited: isAsyncSelfCall ? true : state.awaited }, 'value'));
                        emit(').into()');
                    }
                    if (i < node.elements.length - 1) emit(', ');
                }
                emit(']))');
            },

            ForStatement(node: any, state: any, c: any) {
                c(node.init, asType({ ...state, parent: node }));
                emit(';\n');
                indent(state);
                emit('while ');
                c(node.test, asType(state, 'bool'));
                emit(' ');
                const updateOutput = withNewOutput(node.update, state, c);
                c(
                    node.body,
                    asType({
                        ...state,
                        indentLevel: state.indentLevel + 1,
                        appendBlock: updateOutput + ';',
                    })
                );
            },

            WhileStatement(node: any, state: any, c: any) {
                emit('while ');
                c(node.test, asType(state, 'bool'));
                c(
                    node.body,
                    asType({
                        ...state,
                        indentLevel: state.indentLevel + 1,
                    })
                );
            },

            ContinueStatement() {
                emit('continue');
            },

            BreakStatement() {
                emit('break');
            },

            ObjectExpression(node: any, state: any, c: any) {
                if (node.properties.length === 0) {
                    emit('Value::new_object()');
                    return;
                }
                emit('Value::Json(normalize(&Value::Json(json!({');
                emit('\n');
                const state1 = asType({ ...state, indentLevel: state.indentLevel + 1 });
                for (let i = 0; i < node.properties.length; i++) {
                    const node1 = node.properties[i];
                    switch (node1.type) {
                        case 'Property':
                            indent(state1);
                            // Handle both Literal keys (key.value) and Identifier keys (key.name)
                            const keyStr = node1.key.value !== undefined ? node1.key.value : node1.key.name;
                            const escapedKey = String(keyStr).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                            emit(`"${escapedKey}": `);
                            c(node1.value, asType(state1, 'value'));
                            if (i < node.properties.length - 1) emit(',\n');
                            break;
                        case 'SpreadElement':
                            // {...obj} in object literal — skip in JSON context
                            indent(state1);
                            emit('// spread element omitted in JSON literal\n');
                            break;
                        default:
                            throw new Error('Unsupported object expression type: ' + node1.type);
                    }
                }
                emit('\n');
                indent(state);
                emit('}))).unwrap())');
            },

            Super() {
                if (!baseClassName) throw new Error('Super not allowed here');
                // Pro exchanges extend REST classes imported as `xxxRest`; resolve via Exchange base
                if (baseClassName.endsWith('Rest')) {
                    emit('Exchange');
                } else {
                    emit(baseClassName);
                }
            },

            TryStatement(node: any, state: any, c: any) {
                if (node.handler) {
                    const tryIdx = tryCounter++;
                    const tryLabel = `'try_block_${tryIdx}`;
                    const tryErrorVar = `__try_error_${tryIdx}`;
                    const innerState = { ...state, tryLabel, tryErrorVar, indentLevel: state.indentLevel + 1 };

                    // First line: no leading indent (parent BlockStatement already emitted it)
                    emit(`let mut ${tryErrorVar}: Value = Value::Undefined;\n`);

                    // Labeled block for try body
                    indent(state);
                    emit(`${tryLabel}: {\n`);
                    for (const stmt of node.block.body) {
                        indent(innerState);
                        c(stmt, asType(innerState));
                        emit(';\n');
                    }
                    indent(state);
                    emit('}\n');

                    // Catch body — original state (no tryLabel so throws inside catch escape)
                    indent(state);
                    emit(`if !${tryErrorVar}.is_undefined() {\n`);
                    const catchBodyState = { ...state, indentLevel: state.indentLevel + 1 };
                    const handler = node.handler;
                    if (handler.param && handler.param.type === 'Identifier') {
                        indent(catchBodyState);
                        emit(`let mut ${transformIdentifier(handler.param.name)} = ${tryErrorVar}.clone();\n`);
                    }
                    for (const stmt of handler.body.body) {
                        indent(catchBodyState);
                        c(stmt, asType(catchBodyState));
                        emit(';\n');
                    }
                    indent(state);
                    emit('}');
                    // Parent BlockStatement appends ';\n' after TryStatement returns
                } else {
                    // No handler: emit try body inline
                    for (const stmt of node.block.body) {
                        indent(state);
                        c(stmt, asType(state));
                        emit(';\n');
                    }
                }

                if (node.finalizer) {
                    emit('\n');
                    for (const stmt of node.finalizer.body) {
                        indent(state);
                        c(stmt, asType(state));
                        emit(';\n');
                    }
                }
            },

            SpreadElement(node: any, state: any, c: any) {
                // In most contexts spread is used in object/array literals; emit the inner value
                c(node.argument, asType(state, 'value'));
            },

            ArrowFunctionExpression(node: any, state: any, c: any) {
                emit('|');
                for (let i = 0; i < node.params.length; i++) {
                    const param = node.params[i];
                    if (param.type === 'AssignmentPattern') {
                        emit('mut ');
                        c(param.left, asType(state));
                    } else {
                        emit('mut ');
                        c(param, asType(state));
                    }
                    if (i < node.params.length - 1) emit(', ');
                }
                emit('| ');
                if (node.body.type === 'BlockStatement') {
                    c(node.body, asType({ ...state, indentLevel: state.indentLevel + 1 }));
                } else {
                    c(node.body, asType(state, 'value'));
                }
            },

            FunctionExpression(node: any, state: any, c: any) {
                // Treat like arrow function (closure)
                emit('|');
                for (let i = 0; i < node.params.length; i++) {
                    const param = node.params[i];
                    if (param.type === 'AssignmentPattern') {
                        emit('mut ');
                        c(param.left, asType(state));
                    } else {
                        emit('mut ');
                        c(param, asType(state));
                    }
                    if (i < node.params.length - 1) emit(', ');
                }
                emit('| ');
                if (node.body.type === 'BlockStatement') {
                    c(node.body, asType({ ...state, indentLevel: state.indentLevel + 1 }));
                } else {
                    c(node.body, asType(state, 'value'));
                }
            },

            TemplateLiteral(node: any, state: any, c: any) {
                if (node.expressions.length === 0) {
                    // Simple template literal with no interpolation
                    const raw = node.quasis[0].value.cooked || node.quasis[0].value.raw;
                    emit(`Value::from("${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`);
                } else {
                    emit('Value::from(format!("');
                    for (let i = 0; i < node.quasis.length; i++) {
                        const cooked = node.quasis[i].value.cooked || node.quasis[i].value.raw;
                        emit(cooked.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\{/g, '{{').replace(/\}/g, '}}'));
                        if (i < node.expressions.length) {
                            emit('{}');
                        }
                    }
                    emit('"');
                    for (const expr of node.expressions) {
                        emit(', ');
                        c(expr, asType(state, 'value'));
                    }
                    emit('))');
                }
            },

            ForInStatement(node: any, state: any, c: any) {
                if (node.left.type === 'VariableDeclaration' && node.left.declarations[0]) {
                    emit('for mut ');
                    c(node.left.declarations[0].id, asType(state));
                } else {
                    c(node.left, asType(state));
                }
                emit(' in ');
                c(node.right, asType(state));
                emit('.keys() ');
                c(node.body, asType({ ...state, indentLevel: state.indentLevel + 1 }));
            },

            ForOfStatement(node: any, state: any, c: any) {
                if (node.left.type === 'VariableDeclaration' && node.left.declarations[0]) {
                    emit('for mut ');
                    c(node.left.declarations[0].id, asType(state));
                } else {
                    c(node.left, asType(state));
                }
                emit(' in ');
                c(node.right, asType(state));
                emit('.iter() ');
                c(node.body, asType({ ...state, indentLevel: state.indentLevel + 1 }));
            },

            SwitchStatement(node: any, state: any, c: any) {
                // Emit as if-else chain
                let first = true;
                for (const caseNode of node.cases) {
                    if (caseNode.test) {
                        indent(state);
                        emit(first ? 'if ' : ' else if ');
                        c(node.discriminant, asType(state, 'value'));
                        emit(' == ');
                        c(caseNode.test, asType(state, 'value'));
                        emit(' {\n');
                        first = false;
                    } else {
                        // default case
                        if (!first) {
                            indent(state);
                            emit(' else {\n');
                        } else {
                            emit('{\n');
                        }
                    }
                    const innerState = { ...state, indentLevel: state.indentLevel + 1 };
                    for (const stmt of caseNode.consequent) {
                        if (stmt.type === 'BreakStatement') continue; // skip break in if-else
                        indent(innerState);
                        c(stmt, asType(innerState));
                        emit(';\n');
                    }
                    indent(state);
                    emit('}');
                }
                emit('\n');
            },

            Program(node: any, state: any, c: any) {
                for (const child of node.body) {
                    c(child, state);
                }
            },
        }
    );

    return currentOutput.value + '\n';
}

function generateRustDispatchFunction(className: string, apiMethods: Record<string, { apiName: string; method: string; path: string }>, ownMethodNames: Set<string>) {
    const capitalizedClassName = capitalizeFirstLetter(className);
    const hasOwnRequest = ownMethodNames.has('request');
    const requestCall = hasOwnRequest
        ? `<Self as ${capitalizedClassName}>::request(self, `
        : `self.request(`;
    const bodyParts = [
        `
async fn dispatch(&mut self, method: Value, params: Value, context: Value) -> Value {
    match method {
        Value::Json(serde_json::Value::String(ref m)) => {
            match m.as_str() {`,
    ];
    for (const [k, v] of Object.entries(apiMethods)) {
        bodyParts.push(
            `                "${k}" => ${requestCall}"${v.path}".into(), "${v.apiName}".into(), "${v.method.toUpperCase()}".into(), params, Value::Undefined, Value::Undefined, Value::Undefined).await,`
        );
    }
    bodyParts.push(`                _ => panic!("Unknown API method: {}", m),
            }
        },
        _ => panic!("dispatch: method must be a string, got {:?}", method)
    }
}`);
    return bodyParts.map((part) => part.split('\n').map((l) => `    ${l}`).join('\n')).join('\n');
}

class RustTranspiler {
    sanitizeRustOutput(code: string) {
        return code
            .replace(/\.function\s+toString\(\)\s*\{\s*\[native code\]\s*\}\(\)/g, '.to_string()')
            .replace(/\bfunction\s+toString\(\)\s*\{\s*\[native code\]\s*\}\(\)/g, 'to_string()')
            .replace(/JSON\.into\(\)::parse/g, 'JSON::parse')
            // Built-in call normalization pass (safe textual rewrites only).
            .replace(/\.toString\(\)/g, '.to_string()')
            .replace(/\.toUpperCase\(\)/g, '.to_upper_case()')
            .replace(/\.toLowerCase\(\)/g, '.to_lower_case()')
            // Fix crypto hash identifiers used as values (not calls) — they are 0-arg functions
            .replace(/\b(keccak|secp256k1|sha256|sha384|sha512|md5|ed25519)\b(?!\s*\()/g, '$1()')
            // Fix error type constructors used as bare values in JSON (describe) — replace with string names
            .replace(/": (BadRequest|InvalidOrder|ExchangeError|InsufficientFunds|OrderNotFound|AuthenticationError|PermissionDenied|ExchangeNotAvailable|ArgumentsRequired|RateLimitExceeded|OrderNotFillable|OrderImmediatelyFillable|NotSupported|DuplicateOrderId)\b/g, '": "$1"')
;
    }

    createRustClass(className: string, baseClass: string, body: string[], methods: string[]) {
        const bodyAsString = body.join('\n');
        const capitalizedClassName = capitalizeFirstLetter(className);
        const rustBaseTrait = 'Exchange';

        const header = [
            '#![allow(clippy::all)]',
            '#![allow(dead_code)]',
            '#![allow(unreachable_code)]',
            '#![allow(unused_imports)]',
            '#![allow(unused_assignments)]',
            '#![allow(unused_comparisons)]',
            '#![allow(unused_mut)]',
            '#![allow(unused_variables)]',
            '',
            'use async_trait::async_trait;',
            'use std::str::FromStr;',
            'use serde::{Deserialize, Serialize};',
            'use serde_json::json;',
            'use crate::exchange::{Exchange, ExchangeImpl, Precise, Value, ValueTrait, BoolExt, JSON, Array, Object, Math, Promise, parse_int, shift_2, extend_2, normalize};',
            'use crate::ws::{ArrayCache, ArrayCacheByTimestamp, ArrayCacheBySymbolById, ArrayCacheBySymbolBySide};',
            '// Crypto hash identifiers',
            'fn sha256() -> Value { Value::from("sha256") }',
            'fn sha384() -> Value { Value::from("sha384") }',
            'fn sha512() -> Value { Value::from("sha512") }',
            'fn md5() -> Value { Value::from("md5") }',
            'fn ed25519() -> Value { Value::from("ed25519") }',
            'fn rsa(msg: Value, secret: Value, _hash: Value) -> Value { msg }',
            'fn eddsa(msg: Value, secret: Value, _curve: Value) -> Value { msg }',
            'fn secp256k1() -> Value { Value::from("secp256k1") }',
            'fn keccak() -> Value { Value::from("keccak") }',
            'fn ecdsa(msg: Value, secret: Value, algo: Value, hash_fn: Value) -> Value { msg }',
            'fn totp(secret: Value) -> Value { Value::Undefined }',
            'fn jwt(data: Value, secret: Value, hash: Value, is_rsa: Value) -> Value { Value::Undefined }',
            'fn parse_float(value: Value) -> Value { value }',
            'fn decimals(value: Value) -> Value { Value::from(0) }',
            'fn shift_1(value: Value) -> Value { value }',
            'fn shift_3(value: Value) -> (Value, Value, Value) { (value.clone(), Value::Undefined, Value::Undefined) }',
            'fn shift_4(value: Value) -> (Value, Value, Value, Value) { (value.clone(), Value::Undefined, Value::Undefined, Value::Undefined) }',
            '// Error type constructors (stub structs with ::new for transpiled `new ErrorType(msg)` patterns)',
            'macro_rules! error_stub { ($name:ident) => { pub struct $name; impl $name { pub fn new(msg: Value) -> Value { msg } } }; }',
            'error_stub!(BadRequest);',
            'error_stub!(InvalidOrder);',
            'error_stub!(ExchangeError);',
            'error_stub!(InsufficientFunds);',
            'error_stub!(OrderNotFound);',
            'error_stub!(AuthenticationError);',
            'error_stub!(PermissionDenied);',
            'error_stub!(ExchangeNotAvailable);',
            'error_stub!(ArgumentsRequired);',
            'error_stub!(RateLimitExceeded);',
            'error_stub!(OrderNotFillable);',
            'error_stub!(OrderImmediatelyFillable);',
            'error_stub!(NotSupported);',
            'error_stub!(DuplicateOrderId);',
            'error_stub!(UnsubscribeError);',
            'error_stub!(ChecksumError);',
            'error_stub!(InvalidNonce);',
            'error_stub!(BadSymbol);',
            '// Array-like type stubs (Bids/Asks order book sides)',
            'macro_rules! array_side_stub { ($name:ident) => { pub struct $name; impl $name { pub fn new(data: Value, _limit: Value) -> Value { data } } }; }',
            'array_side_stub!(Bids);',
            'array_side_stub!(Asks);',
            '',
            'use crate::exchange::{PRECISE_BASE, TRUNCATE, ROUND, ROUND_UP, ROUND_DOWN};',
            'use crate::exchange::{DECIMAL_PLACES, SIGNIFICANT_DIGITS, TICK_SIZE, NO_PADDING, PAD_WITH_ZERO};',
            '',
            '// PLEASE DO NOT EDIT THIS FILE, IT IS GENERATED AND WILL BE OVERWRITTEN:',
            '// https://github.com/ccxt/ccxt/blob/master/CONTRIBUTING.md#how-to-contribute-code',
            '',
            '#[async_trait(?Send)]',
            `pub trait ${capitalizedClassName} : ${rustBaseTrait} {`,
        ];

        const footer = [
            '}',
            '',
            '#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]',
            `pub struct ${capitalizedClassName}Impl(Value);`,
            `impl Exchange for ${capitalizedClassName}Impl {
    fn describe(&self) -> Value { ${capitalizedClassName}::describe(self) }
}`,
            `impl ${capitalizedClassName} for ${capitalizedClassName}Impl {}`,
            `impl ValueTrait for ${capitalizedClassName}Impl {
    fn is_undefined(&self) -> bool { self.0.is_undefined() }
    fn is_nullish(&self) -> bool { self.0.is_nullish() }
    fn is_nonnullish(&self) -> bool { self.0.is_nonnullish() }
    fn is_truthy(&self) -> bool { self.0.is_truthy() }
    fn or_default(&self, default: Value) -> Value { self.0.or_default(default) }
    fn is_number(&self) -> bool { self.0.is_number() }
    fn is_string(&self) -> bool { self.0.is_string() }
    fn is_object(&self) -> bool { self.0.is_object() }
    fn is_falsy(&self) -> bool { self.0.is_falsy() }
    fn to_upper_case(&self) -> Value { self.0.to_upper_case() }
    fn unwrap_str(&self) -> &str { self.0.unwrap_str() }
    fn unwrap_usize(&self) -> usize { self.0.unwrap_usize() }
    fn unwrap_bool(&self) -> bool { self.0.unwrap_bool() }
    fn unwrap_precise(&self) -> &Precise { self.0.unwrap_precise() }
    fn unwrap_json(&self) -> &serde_json::Value { self.0.unwrap_json() }
    fn unwrap_json_mut(&mut self) -> &mut serde_json::Value { self.0.unwrap_json_mut() }
    fn unwrap_precise_mut(&mut self) -> &mut Precise { self.0.unwrap_precise_mut() }
    fn len(&self) -> usize { self.0.len() }
    fn get(&self, key: Value) -> Value { self.0.get(key) }
    fn set(&mut self, key: Value, value: Value) { self.0.set(key, value) }
    fn push(&mut self, value: Value) { self.0.push(value) }
    fn split(&self, separator: Value) -> Value { self.0.split(separator) }
    fn contains_key(&self, key: Value) -> bool { self.0.contains_key(key) }
    fn keys(&self) -> Value { self.0.keys() }
    fn values(&self) -> Value { self.0.values() }
    fn to_array(&self, x: Value) -> Value { self.0.to_array(x) }
    fn index_of(&self, x: Value) -> Value { self.0.index_of(x) }
    fn join(&self, glue: Value) -> Value { self.0.join(glue) }
    fn to_string(&self) -> Value { self.0.to_string() }
    fn typeof_(&self) -> Value { self.0.typeof_() }
    fn slice(&self, start: Value, end: Value) -> Value { self.0.slice(start, end) }
}`,
            '',
            `impl ${capitalizedClassName}Impl {`,
            `    pub fn new(params: Value) -> Self {`,
            `        let mut rv = ${capitalizedClassName}Impl(match params {`,
            `            Value::Json(_) => params,`,
            `            _ => Value::new_object()`,
            `        });`,
            `        ExchangeImpl::init(&mut rv.0);`,
            ``,
            `        let config_entries = ${capitalizedClassName}::describe(&rv);`,
            `        for k in config_entries.keys() {`,
            `            rv.set(k.clone(), config_entries.get(k).clone());`,
            `        }`,
            `        rv`,
            `    }`,
            '}',
            '',
            '',
        ];

        const result = header.join('\n') + '\n' + bodyAsString + '\n' + footer.join('\n');
        return this.sanitizeRustOutput(result);
    }

    getClassInfo(contents: string) {
        const classNode = getClassNode(contents);
        const className = classNode.id?.name;
        if (!className) throw new Error('Unnamed class');
        const baseClass = getBaseClassName(classNode) || 'Exchange';
        analyzeClassFromAst(className, classNode);
        return { classNode, className, baseClass };
    }

    transpileClass(contents: string, exchangeDescribe: any, baseMethodNames: string[]) {
        const { classNode, className, baseClass } = this.getClassInfo(contents);
        const methods = getMethodStrings(contents, classNode);
        const apiMethodsMap = exchangeDescribe?.api ? enumerateApiMethodMapping(exchangeDescribe.api) : {};
        const apiMethods = new Set(Object.keys(apiMethodsMap));

        const rust: string[] = [];
        const methodNames: string[] = [];

        // Pre-compute own method names for disambiguation (exclude manually-implemented ones
        // which won't appear in the generated trait)
        const ownMethodNames = new Set<string>();
        for (const m of methods) {
            const nameMatch = /\b([a-zA-Z0-9_]+)\s*\(/.exec(m.replace(/^async\s+/, ''));
            if (nameMatch && !MANUALLY_IMPLEMENTED_METHODS.has(nameMatch[1])) {
                ownMethodNames.add(nameMatch[1]);
            }
        }

        for (const m of methods) {
            const nameMatch = /\b([a-zA-Z0-9_]+)\s*\(/.exec(m.replace(/^async\s+/, ''));
            if (nameMatch) methodNames.push(nameMatch[1]);
            rust.push(
                transpileMethodToRust({
                    className,
                    method: m,
                    baseMethodNames,
                    baseClassName: baseClass,
                    apiMethods,
                    exchangeDescribe,
                    ownMethodNames,
                })
            );
        }

        // Inherited base methods are available from the Exchange supertrait —
        // no need to re-emit them in the derived exchange trait.
        // This avoids E0034 (multiple applicable items) ambiguity.

        // Always generate dispatch — even for exchanges without explicit api
        // (pattern-based fallback in isDispatchCall may emit self.dispatch() calls)
        rust.push(generateRustDispatchFunction(className, apiMethodsMap, ownMethodNames));

        return {
            rust: this.createRustClass(className, baseClass, rust, methodNames),
            className,
            baseClass,
        };
    }

    baseMethodsMap: Record<string, string> = {};
    baseMethodNames: string[] = [];

    transpileBaseMethods() {
        const contents = fs.readFileSync(baseExchangeJsFile, 'utf8');
        const delimiter = '// METHODS BELOW THIS LINE ARE TRANSPILED FROM TYPESCRIPT';
        const delimiterIndex = contents.indexOf(delimiter);
        if (delimiterIndex < 0) {
            throw new Error(`Delimiter not found in ${baseExchangeJsFile}`);
        }

        const { classNode, className } = this.getClassInfo(contents);
        const methods = getMethodStrings(contents, classNode, delimiterIndex);

        const rust: string[] = [];
        for (const m of methods) {
            const nameMatch = /\b([a-zA-Z0-9_]+)\s*\(/.exec(m.replace(/^async\s+/, ''));
            if (nameMatch) {
                this.baseMethodsMap[nameMatch[1]] = m;
                this.baseMethodNames.push(nameMatch[1]);
            }
            rust.push(
                transpileMethodToRust({
                    className,
                    method: m,
                    baseMethodNames: [],
                    baseClassName: undefined,
                    apiMethods: new Set(),
                    exchangeDescribe: undefined,
                })
            );
        }

        const rustFile = './rust/src/exchange.rs';
        const rustDelimiter = '// METHODS BELOW THIS LINE ARE TRANSPILED FROM JAVASCRIPT';
        const rustEndDelimiter = '// END TRANSPILED METHODS';
        // Use [ \t]* to handle any leading whitespace on the delimiter line
        const re = new RegExp(`[ \\t]*${rustDelimiter}[\\s\\S]*${rustEndDelimiter}`);
        const replacement = `    ${rustDelimiter}\n${this.sanitizeRustOutput(rust.join('\n'))}\n${rustEndDelimiter}`;
        replaceInFile(rustFile, re, replacement);
    }

    async transpileDerivedExchangeFiles(jsFolder: string, rustFolder: string, force = false) {
        const entries = fs.readdirSync(jsFolder).filter((f) => f.endsWith('.js'));
        const exchanges = JSON.parse(fs.readFileSync('./exchanges.json', 'utf8'));
        const ids: string[] = exchanges?.ids || [];

        const classes: Record<string, string> = {};
        const transpiled: string[] = [];
        const allModules: string[] = [];

        for (const filename of entries) {
            const id = path.basename(filename, '.js');
            if (ids.length > 0 && !ids.includes(id)) continue;
            allModules.push(id);

            const jsPath = path.join(jsFolder, filename);
            const rustPath = path.join(rustFolder, `${id}.rs`);

            const jsMtime = fs.statSync(jsPath).mtime.getTime();
            const rustMtime = fs.existsSync(rustPath) ? fs.statSync(rustPath).mtime.getTime() : 0;
            if (!force && jsMtime <= rustMtime) continue;

            log.cyan('Transpiling from', filename.yellow);

            const contents = fs.readFileSync(jsPath, 'utf8');
            const absPath = path.resolve(jsPath);
            let exchangeDescribe: any = undefined;
            try {
                const module = await import(pathToFileURL(absPath).href);
                const klass = module?.default;
                const exchange = klass ? new klass() : undefined;
                exchangeDescribe = exchange?.describe?.() ?? undefined;
            } catch (e: any) {
                log.yellow(`Skipping runtime describe() for ${filename}: ${e?.message || e}`);
            }

            const { rust, className, baseClass } = this.transpileClass(contents, exchangeDescribe, this.baseMethodNames);
            overwriteFile(rustPath, rust);
            fs.utimesSync(rustPath, new Date(), new Date(jsMtime));

            classes[className] = baseClass;
            transpiled.push(id);
        }

        return { classes, transpiled, allModules };
    }

    exportRustModules(file: string, moduleNames: string[], alwaysOn: string[] = []) {
        const header = '// AUTO-GENERATED: rust exchange modules\n';
        const always = new Set(alwaysOn);
        const body = moduleNames
            .map((m) => (always.has(m) ? `pub mod ${m};` : `#[cfg(feature = "full-exchanges")]\npub mod ${m};`))
            .join('\n');

        // Only generate create_exchange for the REST exchanges file (not pro)
        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        const factory = alwaysOn.length > 0
            ? `
/// Create a boxed exchange by lowercase name. Returns \`None\` for unknown names.
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
${moduleNames
    .map((m) => {
        const impl_name = capitalize(m) + 'Impl';
        const prefix = always.has(m) ? '' : '        #[cfg(feature = "full-exchanges")]\n';
        return `${prefix}        "${m}" => make!(${m}, ${impl_name}),`;
    })
    .join('\n')}
        _ => None,
    }
}`
            : '';

        overwriteFile(file, header + body + '\n' + factory + '\n');
    }

    async transpileFor(exchangeId: string, ws = false) {
        const jsFolder = ws ? './js/src/pro' : './js/src';
        const rustFolder = ws ? './rust/src/pro' : './rust/src/exchanges';
        const jsPath = path.join(jsFolder, `${exchangeId}.js`);
        if (!fs.existsSync(jsPath)) {
            throw new Error(`Exchange JS not found: ${jsPath}`);
        }
        this.transpileBaseMethods();
        const contents = fs.readFileSync(jsPath, 'utf8');
        const absPath = path.resolve(jsPath);
        let exchangeDescribe: any = undefined;
        try {
            const module = await import(pathToFileURL(absPath).href);
            const klass = module?.default;
            const exchange = klass ? new klass() : undefined;
            exchangeDescribe = exchange?.describe?.() ?? undefined;
        } catch (e: any) {
            log.yellow(`Skipping runtime describe() for ${exchangeId}: ${e?.message || e}`);
        }
        const rustPath = path.join(rustFolder, `${exchangeId}.rs`);
        const { rust } = this.transpileClass(contents, exchangeDescribe, this.baseMethodNames);
        overwriteFile(rustPath, rust);
        const jsMtime = fs.statSync(jsPath).mtime.getTime();
        fs.utimesSync(rustPath, new Date(), new Date(jsMtime));
        log.bright.green(`Transpiled ${exchangeId} → ${rustPath}`);
    }

    async transpileEverything(force = false) {
        const rustRoot = './rust';
        const rustSrc = './rust/src';
        const rustExchanges = './rust/src/exchanges';
        const rustPro = './rust/src/pro';

        createFolderRecursively(rustRoot);
        createFolderRecursively(rustSrc);
        createFolderRecursively(rustExchanges);
        createFolderRecursively(rustPro);

        this.transpileBaseMethods();

        const { allModules } = await this.transpileDerivedExchangeFiles('./js/src', rustExchanges, force);

        this.exportRustModules('./rust/src/exchanges/mod.rs', allModules, ['binance']);
        await this.transpileWs(force);

        const libFile = './rust/src/lib.rs';
        const libBody = [
            '#![recursion_limit = "4096"]',
            '// AUTO-GENERATED: rust crate entry',
            'pub mod exchange;',
            'pub mod exchanges;',
            '#[cfg(feature = "full-pro")]',
            'pub mod pro;',
            'pub mod ws;',
            '',
        ].join('\n');
        overwriteFile(libFile, libBody);

        this.transpileExamples(force);

        log.bright.green('Rust transpilation complete.');
    }

    async transpileWs(force = false) {
        const rustPro = './rust/src/pro';
        createFolderRecursively(rustPro);

        const { allModules } = await this.transpileDerivedExchangeFiles('./js/src/pro', rustPro, force);
        this.exportRustModules('./rust/src/pro/mod.rs', allModules);
    }

    getRustTraitNameFromExchangeId(exchangeId: string) {
        return exchangeId.charAt(0).toUpperCase() + exchangeId.slice(1);
    }

    transpileExamples(force = false) {
        const tsExamplesFolder = './examples/ts';
        const rustExamplesFolder = './examples/rust';
        createFolderRecursively(rustExamplesFolder);

        if (!fs.existsSync(tsExamplesFolder)) {
            return;
        }

        const alwaysOnExchanges = new Set(['binance']);
        const generated: Array<{ name: string; requiredFeature?: string }> = [];

        const files = fs
            .readdirSync(tsExamplesFolder)
            .filter((f) => f.endsWith('.ts'))
            .sort();
        for (const file of files) {
            const inputPath = path.join(tsExamplesFolder, file);
            const outputName = path
                .basename(file, '.ts')
                .replace(/[^a-zA-Z0-9_]+/g, '_')
                .replace(/^(\d)/, '_$1')
                .toLowerCase();
            const outputPath = path.join(rustExamplesFolder, `${outputName}.rs`);

            const inMtime = fs.statSync(inputPath).mtime.getTime();
            const outMtime = fs.existsSync(outputPath) ? fs.statSync(outputPath).mtime.getTime() : 0;
            if (!force && inMtime <= outMtime) {
                continue;
            }

            const tsCode = fs.readFileSync(inputPath, 'utf8');

            const isPro = /new\s+ccxt\.pro\.[a-zA-Z0-9_]+\s*\(/.test(tsCode);
            const exchangeMatch = /new\s+ccxt(?:\.pro)?\.([a-zA-Z0-9_]+)\s*\(/.exec(tsCode);
            if (!exchangeMatch) {
                const placeholder = [
                    '// AUTO-GENERATED: transpiled from TypeScript examples/',
                    `// Source: examples/ts/${file}`,
                    '',
                    '#[tokio::main]',
                    'async fn main() {',
                    `    println!("No exchange constructor detected in ${file}; generated placeholder.");`,
                    '}',
                    '',
                ].join('\n');
                overwriteFile(outputPath, placeholder);
                fs.utimesSync(outputPath, new Date(), new Date(inMtime));
                generated.push({ name: outputName });
                continue;
            }
            const exchangeId = exchangeMatch[1];
            const exchangeModulePath = isPro ? `./rust/src/pro/${exchangeId}.rs` : `./rust/src/exchanges/${exchangeId}.rs`;
            if (!fs.existsSync(exchangeModulePath)) {
                const placeholder = [
                    '// AUTO-GENERATED: transpiled from TypeScript examples/',
                    `// Source: examples/ts/${file}`,
                    '',
                    '#[tokio::main]',
                    'async fn main() {',
                    `    println!("No transpiled Rust module for exchange '${exchangeId}' (${isPro ? 'pro' : 'rest'}); generated placeholder.");`,
                    '}',
                    '',
                ].join('\n');
                overwriteFile(outputPath, placeholder);
                fs.utimesSync(outputPath, new Date(), new Date(inMtime));
                generated.push({ name: outputName });
                continue;
            }
            let classNameKey = exchangeId;
            try {
                const sourcePath = isPro ? `./js/src/pro/${exchangeId}.js` : `./js/src/${exchangeId}.js`;
                if (fs.existsSync(sourcePath)) {
                    const src = fs.readFileSync(sourcePath, 'utf8');
                    const classNode = getClassNode(src);
                    const className = classNode.id?.name;
                    if (className) {
                        classNameKey = className;
                        analyzeClassFromAst(className, classNode);
                    }
                }
            } catch (_) {
                // Best-effort extraction only; keep fallback.
            }

            const methodNames = new Set<string>();
            const exchangeVars = new Set<string>();
            let m: RegExpExecArray | null = null;
            const ctorVarRegex = /\b(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*new\s+ccxt(?:\.pro)?\.[a-zA-Z0-9_]+\s*\(/g;
            while ((m = ctorVarRegex.exec(tsCode)) !== null) {
                exchangeVars.add(m[1]);
            }
            if (exchangeVars.size === 0) {
                exchangeVars.add('exchange');
            }
            const varsAlternation = Array.from(exchangeVars).join('|');
            const methodRegex = new RegExp(`\\b(?:${varsAlternation})\\.([a-zA-Z][A-Za-z0-9_]*)\\s*\\(`, 'g');
            while ((m = methodRegex.exec(tsCode)) !== null) {
                methodNames.add(m[1]);
            }

            if (methodNames.size === 0) {
                const placeholder = [
                    '// AUTO-GENERATED: transpiled from TypeScript examples/',
                    `// Source: examples/ts/${file}`,
                    '',
                    `use ${isPro ? `ccxt::pro::${exchangeId}` : `ccxt::exchanges::${exchangeId}`}::{${this.getRustTraitNameFromExchangeId(exchangeId)}Impl};`,
                    'use ccxt::exchange::Value;',
                    'use serde_json::json;',
                    '',
                    '#[tokio::main]',
                    'async fn main() {',
                    `    let _exchange = ${this.getRustTraitNameFromExchangeId(exchangeId)}Impl::new(Value::Json(json!({})));`,
                    `    println!("No exchange method calls detected in ${file}; generated placeholder.");`,
                    '}',
                    '',
                ].join('\n');
                overwriteFile(outputPath, placeholder);
                fs.utimesSync(outputPath, new Date(), new Date(inMtime));
                const reqFeat0 = isPro ? 'full-pro' : (!alwaysOnExchanges.has(exchangeId) ? 'full-exchanges' : undefined);
                generated.push({ name: outputName, requiredFeature: reqFeat0 });
                continue;
            }

            const symbolMatch = /const\s+symbol\s*=\s*['"]([^'"]+)['"]/.exec(tsCode);
            const symbol = symbolMatch?.[1] || 'BTC/USDT';

            const traitName = this.getRustTraitNameFromExchangeId(exchangeId);
            const importPath = isPro ? `ccxt::pro::${exchangeId}` : `ccxt::exchanges::${exchangeId}`;
            const classFns = {
                ...(FUNCTION_INFO['Exchange'] || {}),
                ...(FUNCTION_INFO[classNameKey] || {}),
                ...(FUNCTION_INFO[traitName] || {}),
                ...(FUNCTION_INFO[exchangeId] || {}),
            };
            // Filter to only methods that actually exist in the generated Rust trait file
            const rustSource = fs.readFileSync(exchangeModulePath, 'utf8');
            const rustMethodNames = new Set<string>();
            for (const m of rustSource.matchAll(/fn\s+([a-z_][a-z0-9_]*)\s*\(/g)) {
                rustMethodNames.add(m[1]);
            }
            const exampleBody: string[] = [];
            exampleBody.push('// AUTO-GENERATED: transpiled from TypeScript examples/');
            exampleBody.push(`// Source: examples/ts/${file}`);
            exampleBody.push('');
            exampleBody.push('use ccxt::exchange::{normalize, Value};');
            exampleBody.push(`use ${importPath}::{${traitName}, ${traitName}Impl};`);
            exampleBody.push('use serde_json::json;');
            exampleBody.push('');
            exampleBody.push('#[tokio::main]');
            exampleBody.push('async fn main() {');
            exampleBody.push(`    let mut exchange = ${traitName}Impl::new(Value::Json(json!({})));`);
            exampleBody.push(`    let symbol: Value = "${symbol}".into();`);
            exampleBody.push('');

            const orderedMethods = Array.from(methodNames).sort();
            for (const method of orderedMethods) {
                const fnInfo = classFns[method];
                const rustName = unCamelCase(method);
                if (!fnInfo || !rustMethodNames.has(rustName)) {
                    exampleBody.push(`    // skipped: ${method} (not found in transpiled trait)`);
                    continue;
                }
                const args: string[] = [];
                const needsSymbol =
                    /^(fetch|watch|create|cancel|edit|parse)/.test(method) ||
                    method.toLowerCase().includes('ticker') ||
                    method.toLowerCase().includes('orderbook') ||
                    method.toLowerCase().includes('ohlcv') ||
                    method.toLowerCase().includes('trade');
                for (let i = 0; i < fnInfo.paramsCount; i++) {
                    if (i === 0 && needsSymbol) {
                        args.push('symbol.clone()');
                    } else {
                        args.push('Value::Undefined');
                    }
                }
                const argsExpr = args.length > 0 ? args.join(', ') : '';
                if (fnInfo.async) {
                    exampleBody.push(`    let rv = exchange.${rustName}(${argsExpr}).await;`);
                } else {
                    exampleBody.push(`    let rv = exchange.${rustName}(${argsExpr});`);
                }
                exampleBody.push(
                    `    println!("${method}: {}", normalize(&rv).map(|v| v.to_string()).unwrap_or_else(|| "undefined".into()));`
                );
            }

            exampleBody.push('}');
            exampleBody.push('');
            overwriteFile(outputPath, exampleBody.join('\n'));
            fs.utimesSync(outputPath, new Date(), new Date(inMtime));
            const reqFeat = isPro ? 'full-pro' : (!alwaysOnExchanges.has(exchangeId) ? 'full-exchanges' : undefined);
            generated.push({ name: outputName, requiredFeature: reqFeat });
        }

        if (generated.length > 0) {
            this.updateCargoExamples(generated);
            log.cyan(`Transpiled Rust examples: ${generated.length}`);
        }
    }

    updateCargoExamples(examples: Array<{ name: string; requiredFeature?: string }>) {
        const cargoPath = './rust/Cargo.toml';
        if (!fs.existsSync(cargoPath)) return;
        const cargo = fs.readFileSync(cargoPath, 'utf8');
        const startMarker = '# AUTO-GENERATED RUST EXAMPLES START';
        const endMarker = '# AUTO-GENERATED RUST EXAMPLES END';
        const block = [
            startMarker,
            ...examples
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((ex) => {
                    let entry = `[[example]]\nname = "${ex.name}"\npath = "../examples/rust/${ex.name}.rs"`;
                    if (ex.requiredFeature) {
                        entry += `\nrequired-features = ["${ex.requiredFeature}"]`;
                    }
                    return entry;
                }),
            endMarker,
        ].join('\n\n');
        const markerRegex = new RegExp(`${startMarker}[\\s\\S]*${endMarker}`, 'm');
        const next = markerRegex.test(cargo) ? cargo.replace(markerRegex, block) : `${cargo.trimEnd()}\n\n${block}\n`;
        overwriteFile(cargoPath, next);
    }
}

if (process.argv[1] && process.argv[1].includes('rustTranspiler')) {
    const force = process.argv.includes('--force');
    const ws = process.argv.includes('--ws');
    const exchangeIdx = process.argv.indexOf('--exchange');
    if (exchangeIdx >= 0) {
        const exchangeId = process.argv[exchangeIdx + 1];
        if (!exchangeId) {
            log.red('Usage: tsx build/rustTranspiler.ts --exchange <id> [--ws]');
            process.exit(1);
        }
        const transpiler = new RustTranspiler();
        transpiler.transpileFor(exchangeId, ws).catch((err) => {
            log.red(`Rust transpilation failed for ${exchangeId}`);
            throw err;
        });
    } else {
        const transpiler = new RustTranspiler();
        transpiler.transpileEverything(force).catch((err) => {
            log.red('Rust transpilation failed');
            throw err;
        });
    }
}

export default RustTranspiler;
