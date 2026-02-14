// ---------------------------------------------------------------------------
// Usage: npm run transpileRustWs
// ---------------------------------------------------------------------------

import log from 'ololog';
import ansi from 'ansicolor';
import RustTranspiler from './rustTranspiler.js';

ansi.nice;

// WS transpiler: generate WS exchange modules from js/src/pro.
async function main() {
    const force = process.argv.includes('--force');
    const transpiler = new RustTranspiler();
    await transpiler.transpileWs(force);
    log.bright.green('Rust WS transpilation complete.');
}

if (process.argv[1] && process.argv[1].includes('rustWsTranspiler')) {
    main().catch((err) => {
        log.red('Rust WS transpilation failed');
        throw err;
    });
}
