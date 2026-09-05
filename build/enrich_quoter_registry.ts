import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript6';

const scriptDirectory = path.dirname (fileURLToPath (import.meta.url));
const alchemyPath = path.join (scriptDirectory, '../ts/src/alchemy.ts');

const ENGINE_QUOTE_FUNCTION = 'quoteExactInputSingle';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const ALGEBRA_INPUT_FIELDS = [ 'tokenIn', 'tokenOut', 'deployer', 'amountIn', 'limitSqrtPrice' ];
const UNISWAPV3_INPUT_FIELDS = [ 'tokenIn', 'tokenOut', 'amountIn', 'fee', 'sqrtPriceLimitX96' ];

const NETWORK_CHAIN_IDS: Record<string, number> = {
    'BASE': 8453,
    'ETH': 1,
};

const ENGINE_QUOTERS: Record<string, Record<string, string>> = {
    'BASE': {
        'uniswapv3': '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    },
    'ETH': {
        'uniswapv3': '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    },
};

const KNOWN_DEX: Record<string, { engine: string; quoter: string; deployer?: string }> = {
    'BASE:HYDREX': {
        'engine': 'algebra',
        'quoter': '0x08b46265643a5389529D6f6616FA4a0d66F13Fdb',
        'deployer': ZERO_ADDRESS,
    },
};

type Registry = Record<string, Record<string, unknown>>;
type Dict = Record<string, unknown>;

function parseLiteralValue (node: ts.Expression): string | number {
    if (ts.isStringLiteral (node)) {
        return node.text;
    }
    if (ts.isNumericLiteral (node)) {
        return Number (node.text);
    }
    throw new Error ('unsupported literal node kind ' + node.kind);
}

function parseObjectLiteral (node: ts.ObjectLiteralExpression): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (let propertyIndex = 0; propertyIndex < node.properties.length; propertyIndex++) {
        const property = node.properties[propertyIndex];
        if (!ts.isPropertyAssignment (property)) {
            continue;
        }
        if (!ts.isStringLiteral (property.name)) {
            continue;
        }
        const propertyKey = property.name.text;
        if (ts.isObjectLiteralExpression (property.initializer)) {
            result[propertyKey] = parseObjectLiteral (property.initializer);
        } else {
            result[propertyKey] = parseLiteralValue (property.initializer);
        }
    }
    return result;
}

function parseRegistryFromSource (sourceContent: string): Registry {
    const sourceFile = ts.createSourceFile ('alchemy.ts', sourceContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let registryMethod: ts.MethodDeclaration | undefined;
    const visit = (node: ts.Node): void => {
        if (ts.isMethodDeclaration (node) && node.name.getText (sourceFile) === 'getDefaultQuoterRegistry') {
            registryMethod = node;
            return;
        }
        ts.forEachChild (node, visit);
    };
    visit (sourceFile);
    if (registryMethod === undefined) {
        throw new Error ('alchemy.ts getDefaultQuoterRegistry method not found');
    }
    const returnStatement = registryMethod.body?.statements.find ((statement) => ts.isReturnStatement (statement));
    if (returnStatement === undefined || !ts.isReturnStatement (returnStatement)) {
        throw new Error ('alchemy.ts getDefaultQuoterRegistry missing return statement');
    }
    const returnExpression = returnStatement.expression;
    if (returnExpression === undefined || !ts.isObjectLiteralExpression (returnExpression)) {
        throw new Error ('alchemy.ts getDefaultQuoterRegistry must return an object literal');
    }
    const parsedRegistry = parseObjectLiteral (returnExpression) as Registry;
    const registry: Registry = {};
    const registryKeys = Object.keys (parsedRegistry);
    for (let keyIndex = 0; keyIndex < registryKeys.length; keyIndex++) {
        const registryKey = registryKeys[keyIndex];
        const entryValue = parsedRegistry[registryKey];
        if (typeof entryValue === 'object' && entryValue !== null && !Array.isArray (entryValue)) {
            registry[registryKey] = entryValue as Record<string, unknown>;
        } else {
            throw new Error ('registry entry ' + registryKey + ' must be an object');
        }
    }
    return registry;
}

function parseDexesFromSource (sourceContent: string): Record<string, string> {
    const sourceFile = ts.createSourceFile ('alchemy.ts', sourceContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let dexesVariable: ts.VariableDeclaration | undefined;
    const visit = (node: ts.Node): void => {
        if (ts.isVariableDeclaration (node) && node.name.getText (sourceFile) === 'dexes') {
            dexesVariable = node;
            return;
        }
        ts.forEachChild (node, visit);
    };
    visit (sourceFile);
    if (dexesVariable === undefined) {
        throw new Error ('alchemy.ts dexes variable not found');
    }
    const initializer = dexesVariable.initializer;
    if (initializer === undefined || !ts.isObjectLiteralExpression (initializer)) {
        throw new Error ('alchemy.ts dexes must be an object literal');
    }
    const dexes: Record<string, string> = {};
    for (let propertyIndex = 0; propertyIndex < initializer.properties.length; propertyIndex++) {
        const property = initializer.properties[propertyIndex];
        if (!ts.isPropertyAssignment (property) || !ts.isStringLiteral (property.name)) {
            continue;
        }
        const dexId = property.name.text;
        if (!ts.isStringLiteral (property.initializer)) {
            throw new Error ('dexes.' + dexId + ' must be a string literal');
        }
        dexes[dexId] = property.initializer.text;
    }
    return dexes;
}

function inferEngine (dexCode: string): string | undefined {
    if (dexCode === 'HYDREX') {
        return 'algebra';
    }
    if (dexCode === 'UNISWAPV3' || dexCode.startsWith ('UNISWAPV3_')) {
        return 'uniswapv3';
    }
    return undefined;
}

function inferFee (dexCode: string): number | undefined {
    if (dexCode === 'UNISWAPV3') {
        return 3000;
    }
    if (dexCode.endsWith ('_500')) {
        return 500;
    }
    if (dexCode.endsWith ('_10000')) {
        return 10000;
    }
    return undefined;
}

function dexIdFromDexCode (dexCode: string): string {
    return dexCode.toLowerCase ();
}

function enrichRegistryEntry (registryKey: string, partial: Record<string, unknown>): Record<string, unknown> {
    const keyParts = registryKey.split (':');
    if (keyParts.length !== 2) {
        throw new Error ('registry key must be NETWORK:DEX, got ' + registryKey);
    }
    const network = keyParts[0];
    const dexCode = keyParts[1];
    const knownDex = KNOWN_DEX[registryKey];
    const chainId = NETWORK_CHAIN_IDS[network] ?? partial['chainId'];
    if (chainId === undefined) {
        throw new Error (
            'unknown network ' + network + ' for ' + registryKey +
            ': add networks and rpcUrls in describe() and NETWORK_CHAIN_IDS in enrich_quoter_registry.ts'
        );
    }
    const engine = knownDex?.engine ?? inferEngine (dexCode) ?? partial['engine'];
    if (engine === undefined) {
        throw new Error (
            'cannot infer engine for ' + registryKey + ': set engine in the stub or add KNOWN_DEX in enrich_quoter_registry.ts'
        );
    }
    const engineName = String (engine);
    const quoter = knownDex?.quoter ?? ENGINE_QUOTERS[network]?.[engineName] ?? partial['quoter'];
    if (quoter === undefined) {
        throw new Error (
            'cannot resolve quoter for ' + registryKey + ': set quoter in the stub or add ENGINE_QUOTERS / KNOWN_DEX'
        );
    }
    const entry: Record<string, unknown> = {
        'engine': engineName,
        'quoter': quoter,
        'chainId': chainId,
    };
    if (engineName === 'uniswapv3') {
        const fee = inferFee (dexCode) ?? partial['fee'];
        if (fee === undefined) {
            throw new Error ('cannot infer fee for uniswapv3 route ' + registryKey);
        }
        entry['fee'] = fee;
    } else if (engineName === 'algebra') {
        entry['deployer'] = knownDex?.deployer ?? partial['deployer'] ?? ZERO_ADDRESS;
    } else {
        throw new Error ('unsupported engine ' + engineName + ' for ' + registryKey);
    }
    return entry;
}

function syncDexesFromRegistry (dexes: Record<string, string>, registry: Registry): Record<string, string> {
    const syncedDexes = { ...dexes };
    const registryKeys = Object.keys (registry);
    for (let keyIndex = 0; keyIndex < registryKeys.length; keyIndex++) {
        const registryKey = registryKeys[keyIndex];
        const dexCode = registryKey.split (':')[1];
        if (dexCode === undefined) {
            throw new Error ('invalid registry key ' + registryKey);
        }
        const dexId = dexIdFromDexCode (dexCode);
        const existingDexId = Object.keys (syncedDexes).find ((candidateId) => syncedDexes[candidateId] === dexCode);
        if (existingDexId === undefined) {
            syncedDexes[dexId] = dexCode;
        }
    }
    return syncedDexes;
}

function validateEngineTemplate (engine: string, abi: any[]): void {
    const quoteFunction = abi.find ((entry) => entry.type === 'function' && entry.name === ENGINE_QUOTE_FUNCTION);
    if (quoteFunction === undefined) {
        throw new Error ('ABI missing ' + ENGINE_QUOTE_FUNCTION);
    }
    const inputComponents = quoteFunction.inputs?.[0]?.components;
    if (!Array.isArray (inputComponents)) {
        throw new Error (engine + ' ABI missing quoteExactInputSingle params struct');
    }
    const fieldNames = inputComponents.map ((component) => component.name);
    const expectedFields = (engine === 'algebra') ? ALGEBRA_INPUT_FIELDS : UNISWAPV3_INPUT_FIELDS;
    for (let fieldIndex = 0; fieldIndex < expectedFields.length; fieldIndex++) {
        const expectedField = expectedFields[fieldIndex];
        if (fieldNames[fieldIndex] !== expectedField) {
            throw new Error (
                engine + ' ABI struct mismatch at index ' + String (fieldIndex) +
                ': expected ' + expectedField + ', got ' + String (fieldNames[fieldIndex])
            );
        }
    }
}

async function fetchSourcifyAbi (chainId: number, quoter: string): Promise<any[]> {
    const sourcifyUrl = 'https://sourcify.dev/server/v2/contract/' + String (chainId) + '/' + quoter + '?fields=abi';
    const response = await fetch (sourcifyUrl);
    if (!response.ok) {
        throw new Error ('Sourcify request failed for ' + quoter + ' on chain ' + String (chainId) + ': HTTP ' + String (response.status));
    }
    const payload = await response.json () as Dict;
    const abi = payload['abi'];
    if (!Array.isArray (abi)) {
        throw new Error ('Sourcify response missing ABI for ' + quoter);
    }
    return abi;
}

function emitRegistryMethodBody (registry: Registry): string {
    const lines = [
        '    getDefaultQuoterRegistry (): Dict {',
        '        return {',
    ];
    const registryKeys = Object.keys (registry).sort ();
    for (let keyIndex = 0; keyIndex < registryKeys.length; keyIndex++) {
        const registryKey = registryKeys[keyIndex];
        const entry = registry[registryKey];
        lines.push ("            '" + registryKey + "': {");
        const orderedEntryKeys = [ 'engine', 'quoter', 'chainId', 'fee', 'deployer' ].filter ((entryKey) => entry[entryKey] !== undefined);
        for (let entryIndex = 0; entryIndex < orderedEntryKeys.length; entryIndex++) {
            const entryKey = orderedEntryKeys[entryIndex];
            const entryValue = entry[entryKey];
            const serializedValue = (typeof entryValue === 'string')
                ? ("'" + entryValue + "'")
                : String (entryValue);
            lines.push ("                '" + entryKey + "': " + serializedValue + ',');
        }
        lines.push ('            },');
    }
    lines.push ('        };');
    lines.push ('    }');
    return lines.join ('\n');
}

function emitDexesBlock (dexes: Record<string, string>): string {
    const lines = [
        '        const dexes: Dict = {',
    ];
    const dexIds = Object.keys (dexes).sort ();
    for (let dexIndex = 0; dexIndex < dexIds.length; dexIndex++) {
        const dexId = dexIds[dexIndex];
        lines.push ("            '" + dexId + "': '" + dexes[dexId] + "',");
    }
    lines.push ('        };');
    return lines.join ('\n');
}

function patchAlchemyRegistryMethod (registry: Registry, sourceContent: string): string {
    const methodStart = '    getDefaultQuoterRegistry (): Dict {';
    const beginIndex = sourceContent.indexOf (methodStart);
    if (beginIndex < 0) {
        throw new Error ('alchemy.ts getDefaultQuoterRegistry method not found');
    }
    const methodEnd = sourceContent.indexOf ('    getQuoterRegistry (): Dict {', beginIndex);
    if (methodEnd < 0) {
        throw new Error ('alchemy.ts getQuoterRegistry method not found after getDefaultQuoterRegistry');
    }
    const replacement = emitRegistryMethodBody (registry) + '\n\n';
    return sourceContent.slice (0, beginIndex) + replacement + sourceContent.slice (methodEnd);
}

function patchAlchemyDexesBlock (dexes: Record<string, string>, sourceContent: string): string {
    const dexesStart = '        const dexes: Dict = {';
    const beginIndex = sourceContent.indexOf (dexesStart);
    if (beginIndex < 0) {
        throw new Error ('alchemy.ts dexes block not found');
    }
    const dexesEnd = sourceContent.indexOf ('        const dexesById: Dict = {};', beginIndex);
    if (dexesEnd < 0) {
        throw new Error ('alchemy.ts dexesById block not found after dexes');
    }
    const replacement = emitDexesBlock (dexes) + '\n';
    return sourceContent.slice (0, beginIndex) + replacement + sourceContent.slice (dexesEnd);
}

function registryEquals (left: Registry, right: Registry): boolean {
    return JSON.stringify (left) === JSON.stringify (right);
}

function dexesEquals (left: Record<string, string>, right: Record<string, string>): boolean {
    return JSON.stringify (left) === JSON.stringify (right);
}

async function main () {
    const checkOnly = process.argv.includes ('--check');
    const sourceContent = fs.readFileSync (alchemyPath, 'utf8');
    const partialRegistry = parseRegistryFromSource (sourceContent);
    const currentDexes = parseDexesFromSource (sourceContent);
    const enrichedRegistry: Registry = {};
    const registryKeys = Object.keys (partialRegistry).sort ();
    for (let keyIndex = 0; keyIndex < registryKeys.length; keyIndex++) {
        const registryKey = registryKeys[keyIndex];
        const partialEntry = partialRegistry[registryKey];
        const enrichedEntry = enrichRegistryEntry (registryKey, partialEntry);
        const chainId = enrichedEntry['chainId'] as number;
        const quoter = String (enrichedEntry['quoter']);
        const engine = String (enrichedEntry['engine']);
        const abi = await fetchSourcifyAbi (chainId, quoter);
        validateEngineTemplate (engine, abi);
        enrichedRegistry[registryKey] = enrichedEntry;
        console.log ('validated ' + registryKey + ' (' + engine + ')');
    }
    const syncedDexes = syncDexesFromRegistry (currentDexes, enrichedRegistry);
    const registryChanged = !registryEquals (partialRegistry, enrichedRegistry);
    const dexesChanged = !dexesEquals (currentDexes, syncedDexes);
    if (checkOnly) {
        if (registryChanged) {
            throw new Error ('registry enrichment would change alchemy.ts; run npm run enrich-quoter-registry without --check');
        }
        if (dexesChanged) {
            throw new Error ('dexes sync would change alchemy.ts; run npm run enrich-quoter-registry without --check');
        }
        console.log ('check passed: registry and dexes are complete');
        return;
    }
    if (!registryChanged && !dexesChanged) {
        console.log ('no changes needed');
        return;
    }
    let patchedContent = sourceContent;
    if (registryChanged) {
        patchedContent = patchAlchemyRegistryMethod (enrichedRegistry, patchedContent);
    }
    if (dexesChanged) {
        patchedContent = patchAlchemyDexesBlock (syncedDexes, patchedContent);
    }
    fs.writeFileSync (alchemyPath, patchedContent, 'utf8');
    console.log ('patched ' + alchemyPath);
}

main ().catch ((error) => {
    console.error (error);
    process.exit (1);
});
