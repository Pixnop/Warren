/// <reference lib="webworker" />
/**
 * manifold-3d geometry worker. Loads an STL mesh (produced by the OpenSCAD
 * worker), builds a Manifold from it, and reports whether it is a clean,
 * non-empty manifold plus its topology and bounding size. This is the export
 * validation gate (see docs/ARCHITECTURE.md export flow) and Warren's first use
 * of manifold-3d (ADR-0004).
 */

import Module from 'manifold-3d'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

export interface MeshReport {
  triangles: number
  genus: number
  empty: boolean
  status: string
  size: [number, number, number]
}

interface AnalyzeRequest {
  id: number
  stl: Uint8Array
}

let toplevel: Awaited<ReturnType<typeof Module>> | null = null

async function getToplevel(): Promise<NonNullable<typeof toplevel>> {
  if (toplevel === null) {
    toplevel = await Module()
    toplevel.setup()
  }
  return toplevel
}

const loader = new STLLoader()
const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.addEventListener('message', (event: MessageEvent<AnalyzeRequest>) => {
  void analyze(event.data.id, event.data.stl)
})

async function analyze(id: number, stl: Uint8Array): Promise<void> {
  try {
    const { Manifold, Mesh } = await getToplevel()
    const geometry = loader.parse(stl.buffer as ArrayBuffer)
    const position = geometry.getAttribute('position').array as Float32Array

    // STL is non-indexed (one vertex per triangle corner); merge() welds the
    // coincident positions so the result is a closed manifold.
    const numVert = position.length / 3
    const triVerts = new Uint32Array(numVert)
    for (let i = 0; i < numVert; i++) triVerts[i] = i

    const mesh = new Mesh({ numProp: 3, vertProperties: position, triVerts })
    mesh.merge()
    const manifold = new Manifold(mesh)
    const box = manifold.boundingBox()

    const report: MeshReport = {
      triangles: manifold.numTri(),
      genus: manifold.genus(),
      empty: manifold.isEmpty(),
      status: String(manifold.status()),
      size: [box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]],
    }
    ;(manifold as unknown as { delete(): void }).delete()
    ctx.postMessage({ id, report })
  } catch (err) {
    ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
