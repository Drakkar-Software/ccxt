/**
 * Re-run `tsx <script>` after resolving <script> with fs.realpathSync.
 *
 * Needed on Windows when CCXT is accessed through a junction/symlink: `import.meta.url`
 * in the target `.ts` points at the physical path (e.g. D:\…) while `process.argv[1]`
 * may still be the symlinked path (e.g. C:\…), so upstream `isMainEntry()` in
 * `transpile.ts` never runs the main block unless argv uses the same canonical path.
 *
 * Usage (from CCXT repository root, where package.json lives):
 *   node build/launch-tsx-ccxt.mjs build/transpile.ts --python binance
 *   node build/launch-tsx-ccxt.mjs build/transpileWS.ts --python binance
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const targetRelative = process.argv[2]
const passThrough = process.argv.slice(3)

if (!targetRelative) {
    console.error('Usage: node build/launch-tsx-ccxt.mjs <relative-path-to-ts> [...args passed to tsx]')
    process.exit(1)
}

let scriptAbs
try {
    scriptAbs = fs.realpathSync(path.resolve(process.cwd(), targetRelative))
} catch (error) {
    console.error(`Cannot resolve script path: ${targetRelative}`, error.message)
    process.exit(1)
}

const result = spawnSync('npx', ['--yes', 'tsx', scriptAbs, ...passThrough], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
})

process.exit(result.status === null ? 1 : result.status)
