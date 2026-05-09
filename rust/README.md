# ccxt-rust

Rust crate generated from the ccxt TypeScript/JavaScript source. Exposes all REST and
pro/WebSocket exchanges as native Rust types via the `Exchange` trait.

## File ownership — what is hand-written vs generated

### `src/exchange.rs` — split ownership

Everything **before** line 2825 and **after** the `// END TRANSPILED METHODS` marker is
**durable hand-written code**. It includes the `Value` enum, the `Exchange` trait definition,
all `safe_*` accessors, the HTTP `request()` implementation, `load_markets`, and the
post-marker helpers (`lm_parse_*`, etc.).

The band between the two markers is **regenerated on every `npm run transpileRust` run**
via a regex replace in `build/rustTranspiler.ts` (see `transpileBaseMethods()`). Never
hand-edit anything inside that band — changes will be overwritten.

```
exchange.rs
├── lines 1–2824   ← hand-written, durable
│   ├── Value enum + ValueTrait
│   ├── Exchange trait (method signatures)
│   ├── safe_* family
│   ├── request() HTTP impl
│   └── load_markets default impl
├── // METHODS BELOW THIS LINE ARE TRANSPILED FROM JAVASCRIPT
├── lines 2825–EOF_MARKER ← REGENERATED, never hand-edit
│   └── transpiled default method bodies
└── // END TRANSPILED METHODS
    └── lines after marker ← hand-written, durable
        └── lm_parse_* helpers
```

### `src/exchanges/*.rs` and `src/pro/*.rs` — fully generated

These 100+ files are produced by the transpiler and must never be edited by hand.
To retranspile a single exchange:

```bash
cd ccxt
npm run transpileRustFor -- binance          # REST
npm run transpileRustForWs -- binance        # pro/WS
```

To retranspile all exchanges:

```bash
npm run transpileRust
npm run transpileRustWs
```

## Adding a method that the transpiler can't handle

There are two mechanisms in `build/rustTranspiler.ts`:

### `HANDWRITTEN_METHODS` (lines ~454–770)

A map from JS method name → a function returning the full Rust method body as a string.
Used when the transpiler can emit a *working* body but the JS pattern is too complex for
the current visitor (e.g. dynamic API route discovery). The transpiler calls this function
instead of visiting the JS AST node.

Add an entry here when:
- The JS method uses patterns the transpiler doesn't yet handle (object spread, try/catch
  with typed errors, complex destructuring)
- You want a consistent hand-optimized body across all exchanges

After adding a `HANDWRITTEN_METHODS` entry, retranspile all exchanges (`npm run transpileRust`)
so the new body is emitted into every `src/exchanges/<exchange>.rs` file.

### `MANUALLY_IMPLEMENTED_METHODS` (lines ~29–55)

A set of method names the transpiler **skips entirely** — it emits no body for these methods.
The Exchange trait stub returns `Value::Undefined`. Per-exchange overrides are expected to
live in the hand-written section of `exchange.rs` or in future per-exchange impl blocks.

Add a name here only as a last resort, when even a generic fallback body would be wrong
for too many exchanges (e.g. `sign`, `handleErrors` — authentication schemes vary per exchange).

## Building

```bash
# REST exchanges only (default)
cargo check

# All REST exchanges (gated by feature)
cargo check --features full-exchanges

# Pro/WS exchanges
cargo check --features full-pro

# Full build
cargo build --features full-pro
```

## Tests

```bash
# Unit tests (Value semantics, safe_* accessors, fixture parsing)
cargo test

# Gated integration tests
cargo test --features full-exchanges
```
