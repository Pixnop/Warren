/**
 * Main-thread client for the OpenSCAD geometry worker. Lazily spawns the worker
 * and exposes a promise-based render. The heavy wasm is loaded inside the worker
 * on first use, so app startup is unaffected (see docs/ARCHITECTURE.md).
 */

interface WorkerResponse {
  id: number
  stl?: Uint8Array
  error?: string
}

let worker: Worker | null = null
let seq = 0
const pending = new Map<
  number,
  { resolve: (stl: Uint8Array) => void; reject: (e: Error) => void }
>()

function getWorker(): Worker {
  if (worker === null) {
    worker = new Worker(new URL('../workers/openscad.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const { id, stl, error } = event.data
      const entry = pending.get(id)
      if (entry === undefined) return
      pending.delete(id)
      if (error !== undefined || stl === undefined) {
        entry.reject(new Error(error ?? 'OpenSCAD render failed'))
      } else {
        entry.resolve(stl)
      }
    })
  }
  return worker
}

/** Render OpenSCAD source to STL bytes in the worker. */
export function renderScadToStl(scad: string): Promise<Uint8Array> {
  const id = ++seq
  return new Promise<Uint8Array>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, scad })
  })
}

/** Tear down the worker (used on unmount / tests). */
export function disposeOpenscadWorker(): void {
  worker?.terminate()
  worker = null
  pending.clear()
}
