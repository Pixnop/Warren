// Downloads the vendored openscad-wasm artifacts into public/wasm/.
// These are NOT committed (see .gitignore and docs/research/openscad-wasm.md);
// run `pnpm fetch-wasm` after cloning, before using the HD preview / export.
//
// openscad-wasm has no official npm package; the official distribution is the
// GitHub release artifacts. Pinned to the 2022.03.20 release.

import { mkdir, writeFile } from 'node:fs/promises'

const RELEASE = '2022.03.20'
const BASE = `https://github.com/openscad/openscad-wasm/releases/download/${RELEASE}/`
const FILES = ['openscad.js', 'openscad.wasm.js', 'openscad.wasm']
const OUT = 'public/wasm'

await mkdir(OUT, { recursive: true })

for (const file of FILES) {
  const res = await fetch(BASE + file)
  if (!res.ok) {
    throw new Error(`failed to download ${file}: HTTP ${res.status}`)
  }
  const bytes = Buffer.from(await res.arrayBuffer())
  await writeFile(`${OUT}/${file}`, bytes)
  console.log(`fetched ${file} (${bytes.length} bytes)`)
}

console.log(`\nopenscad-wasm ${RELEASE} vendored into ${OUT}/`)
