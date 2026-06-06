/// <reference lib="webworker" />
/**
 * OpenSCAD geometry worker. Lazy-loads the vendored openscad-wasm build (served
 * from /wasm/, see docs/research/openscad-wasm.md), runs a .scad source through
 * it with the Manifold backend, and returns the STL bytes.
 *
 * The default openscad-wasm build is single-threaded, so this needs no
 * SharedArrayBuffer or COOP/COEP headers. The STL ArrayBuffer is transferred.
 */

interface OpenSCADInstance {
  FS: {
    writeFile(path: string, data: string): void
    readFile(path: string): Uint8Array
  }
  callMain(args: string[]): number
}

type OpenSCADFactory = (options: { noInitialRun?: boolean }) => Promise<OpenSCADInstance>

interface RenderRequest {
  id: number
  scad: string
}

let factory: OpenSCADFactory | null = null

// Served from public/wasm/ at runtime. Build a full absolute URL so Vite treats
// it as external and does not try to bundle/transform it; @vite-ignore keeps the
// dynamic import opaque. The loader resolves its siblings via import.meta.url.
const LOADER_URL = new URL('/wasm/openscad.js', self.location.origin).href

async function getFactory(): Promise<OpenSCADFactory> {
  if (factory === null) {
    const mod = (await import(/* @vite-ignore */ LOADER_URL)) as { default: OpenSCADFactory }
    factory = mod.default
  }
  return factory
}

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.addEventListener('message', (event: MessageEvent<RenderRequest>) => {
  const { id, scad } = event.data
  void render(id, scad)
})

async function render(id: number, scad: string): Promise<void> {
  try {
    const OpenSCAD = await getFactory()
    const instance = await OpenSCAD({ noInitialRun: true })
    instance.FS.writeFile('/input.scad', scad)
    instance.callMain(['/input.scad', '--enable=manifold', '-o', '/out.stl'])
    const stl = instance.FS.readFile('/out.stl')
    if (stl.byteLength === 0) throw new Error('OpenSCAD produced an empty STL')
    ctx.postMessage({ id, stl }, [stl.buffer])
  } catch (err) {
    ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
