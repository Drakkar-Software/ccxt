// ---------------------------------------------------------------------------
// Usage: npm run transpileRustWs
// ---------------------------------------------------------------------------

import log from 'ololog';
import ansi from 'ansicolor';
import { createFolderRecursively, overwriteFile } from './fsLocal.js';

ansi.nice;

// WS transpiler skeleton: prepare output folders and placeholder files.
async function main() {
    const rustWsRoot = './rust/src/ws';
    createFolderRecursively(rustWsRoot);

    const placeholder = [
        '// AUTO-GENERATED: WS transpiler skeleton',
        '// TODO: implement WS transpilation from ts/src/pro and js/src/pro',
        '',
    ].join('\n');

    overwriteFile('./rust/src/ws/README.md', placeholder);
    log.bright.yellow('WS transpiler skeleton generated.');
}

if (process.argv[1] && process.argv[1].includes('rustWsTranspiler')) {
    main().catch((err) => {
        log.red('Rust WS transpilation failed');
        throw err;
    });
}
