# Rust Transpiler: Remaining Work

## Current Status

- **RUST_STUB_MODE removed** — transpiler now generates real JS→Rust code for exchange-specific methods
- **binance.rs compiles** — 202 real functions, 0 stub bodies, 13,477 lines
- **Default tests pass** — 112/112 (regression + smoke + live)
- **Other exchanges don't compile yet** — ~15,983 errors with `--features full-exchanges`

## What Was Done

1. Removed `RUST_STUB_MODE` flag from `build/rustTranspiler.ts`
2. Base Exchange class methods stay as stubs (runtime not ready), exchange overrides get real code
3. Inherited base methods removed from exchange traits (available via Exchange supertrait)
4. Added AST visitors: SpreadElement, ArrowFunction, TemplateLiteral, ForOf/ForIn, SwitchStatement
5. Fixed TryStatement to emit try block inline (catch as comment)
6. Fixed dispatch call matching (case-insensitive API method names)
7. Fixed method call generation: UFCS for overrides, instance calls for inherited
8. Added `BoolExt`, `From<i32>`, `From<Value> for serde_json::Value`, `IntoIterator for Value`
9. Added `Precise` static methods, `Math` methods, `Array::is_array`, `Promise::all`
10. Added runtime stub methods for pre-delimiter Exchange.js functions
11. Fixed argument count table for safe* methods and utilities
12. Made Exchange require ValueTrait supertrait
13. Fixed usize/rvalue paren mismatch in Identifier emitter

## Step-by-Step to Fix Remaining Exchanges

### Step 1: Identify common error patterns across exchanges

```bash
cd rust
cargo check --features full-exchanges 2>&1 | grep "^error\[" | sed 's/:.*//; s/error\[//; s/\]//' | sort | uniq -c | sort -rn
```

Expected top errors: E0061 (wrong arg count), E0308 (type mismatch), E0576 (method not in trait), E0599 (method not found), E0425 (missing value/function)

### Step 2: Fix missing methods on Exchange trait

Many exchanges call methods defined before the delimiter in Exchange.js (e.g., `loadMarkets`, `omit`, `iso8601`). These were added as stubs for binance but other exchanges may need more.

```bash
# Find all unique missing methods
cargo check --features full-exchanges 2>&1 | grep "no method named" | sed "s/.*no method named \`//; s/\`.*//" | sort | uniq -c | sort -rn | head -30
```

For each missing method:
1. Check if it's defined before the delimiter in Exchange.js → add stub to exchange.rs (before the transpiler delimiter)
2. Check if it's a dispatch method (sapi_*, dapi_*, etc.) → verify `isDispatchCall` catches it
3. Add the method name to `MANUALLY_IMPLEMENTED_METHODS` in the transpiler if it conflicts

### Step 3: Fix E0576 (method not in trait)

These happen when `<Self as ExchangeName>::method()` is used but the method was added to `MANUALLY_IMPLEMENTED_METHODS` (so it's not generated in the exchange trait).

Fix: ensure `ownMethodNames` correctly excludes `MANUALLY_IMPLEMENTED_METHODS` entries. Already done but may need exchange-specific additions.

### Step 4: Fix E0425 (missing values — crypto functions)

Exchanges import crypto functions like `sha256`, `ed25519`, `rsa`, `eddsa`. These are emitted as free functions in the transpiler header.

```bash
cargo check --features full-exchanges 2>&1 | grep "error\[E0425\]" | sed "s/.*cannot find value \`//; s/\`.*//" | sort | uniq -c | sort -rn
```

For each missing identifier, add a stub function to the transpiler's header section (line ~2213 in rustTranspiler.ts).

### Step 5: Fix E0061 (wrong argument count)

The `argCounts` table in `getArgumentCount()` (line ~345 in rustTranspiler.ts) needs entries for methods where JS uses fewer args than the Rust signature expects.

```bash
cargo check --features full-exchanges 2>&1 | grep "error\[E0061\]" -A5 | grep "self\.\|Precise\|parse_int" | sed 's/.*self\.//; s/(.*//; s/ .*//' | sort | uniq -c | sort -rn
```

Add entries to the `argCounts` dict for each method.

### Step 6: Fix E0308 (type mismatches)

Common patterns:
- **`usize` vs `Value`** — transpiler infers `usize` for loop counters but compares with `Value`. Fix in transpiler's `inferVarDeclType` or add type conversion.
- **`bool` vs `Value`** — methods like `in_array` return `Value` but used as `bool`. Already fixed for binance.
- **Missing `.await`** — async dispatch calls in non-await context. Already fixed by always awaiting dispatch calls.
- **`.length` field** — should be `.len()`. The transpiler's MemberExpression handler should catch this but some edge cases remain.

### Step 7: Fix E0596/E0499 (mutability)

- **E0596** (`&self` calling `&mut self` method) — add method name to the `isSelfImmutable = false` override list in transpiler
- **E0499** (double mutable borrow) — `self.set(key, self.get(other))` borrows self both mutably and immutably. Needs let-binding: `let tmp = self.get(other); self.set(key, tmp);`. Hard to fix automatically.

### Step 8: Add problematic methods to MANUALLY_IMPLEMENTED_METHODS

For methods that can't be transpiled correctly (borrow checker issues, complex patterns), add them to `MANUALLY_IMPLEMENTED_METHODS` and provide stubs in exchange.rs.

### Step 9: Retranspile and iterate

```bash
# Touch all JS files to force retranspile
find js/src -maxdepth 1 -name "*.js" -exec touch {} +
find js/src/pro -maxdepth 1 -name "*.js" -exec touch {} +

# Retranspile
npm run transpileRust

# Check compilation
cd rust && cargo check --features full-exchanges 2>&1 | grep "^error\[" | wc -l

# Run tests
cargo test --features full-exchanges
```

## Key Files

| File | Purpose |
|------|---------|
| `build/rustTranspiler.ts` | The JS→Rust transpiler |
| `rust/src/exchange.rs` | Base Exchange trait + Value type + runtime stubs |
| `rust/src/exchanges/*.rs` | Generated exchange implementations |
| `rust/src/pro/*.rs` | Generated pro/WebSocket implementations |
| `rust/tests/regression.rs` | Unit tests for Value type and safe accessors |
| `rust/tests/public_data_smoke.rs` | Live API smoke tests |
| `rust/tests/pro_public_data.rs` | Pro exchange smoke tests |

## Architecture

```
JS Source (Exchange.js, binance.js, ...)
    ↓ transpileMethodToRust()
Rust Code (exchange.rs, exchanges/binance.rs, ...)

Method resolution:
- MANUALLY_IMPLEMENTED_METHODS → skip (hand-written in exchange.rs)
- HANDWRITTEN_METHODS (request, fetchTicker, etc.) → emit hand-written HTTP logic
- className === 'Exchange' || isInherited → emit { Value::Undefined } stub
- Otherwise → full AST walk → real Rust code
```
