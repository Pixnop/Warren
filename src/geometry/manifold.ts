/**
 * Main-thread client for the manifold-3d worker. Validates a mesh (clean,
 * non-empty manifold + topology + bounding size). Used as the export gate and
 * surfaced in the HD preview.
 */

import type { MeshReport } from '../workers/manifold.worker'

export type { MeshReport }

interface WorkerResponse {
  id: number
  report?: MeshReport
  error?: string
}

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve: (r: MeshReport) => void; reject: (e: Error) => void }>()

function getWorker(): Worker {
  if (worker === null) {
    worker = new Worker(new URL('../workers/manifold.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const { id, report, error } = event.data
      const entry = pending.get(id)
      if (entry === undefined) return
      pending.delete(id)
      if (error !== undefined || report === undefined) {
        entry.reject(new Error(error ?? 'mesh analysis failed'))
      } else {
        entry.resolve(report)
      }
    })
  }
  return worker
}

/** Validate an STL mesh and report its manifold-ness, topology, and size. */
export function analyzeMesh(stl: Uint8Array): Promise<MeshReport> {
  const id = ++seq
  return new Promise<MeshReport>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, stl })
  })
}

export function disposeManifoldWorker(): void {
  worker?.terminate()
  worker = null
  pending.clear()
}
