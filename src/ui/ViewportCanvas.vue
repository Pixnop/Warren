<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { Viewport, type GizmoMode } from '../viewport/scene'
import { renderScadToStl, disposeOpenscadWorker } from '../geometry/openscad'
import { analyzeMesh, disposeManifoldWorker } from '../geometry/manifold'
import { scadForModule } from '../domain'
import type { EditorStore } from '../stores/editor'

const props = defineProps<{ store: EditorStore; mode: GizmoMode }>()

const host = ref<HTMLDivElement | null>(null)
const busy = ref(false)
const meshInfo = ref<string | null>(null)
let viewport: Viewport | null = null
const loader = new STLLoader()

const formatSize = (s: readonly [number, number, number]) =>
  `${Math.round(s[0])} × ${Math.round(s[1])} × ${Math.round(s[2])}`

onMounted(() => {
  if (host.value === null) return
  viewport = new Viewport(host.value, {
    onSelect: (id) => props.store.selectModule(id),
    onTransform: (id, t) => props.store.setModuleTransform(id, t),
    onConnect: (a, b) => props.store.addConnection(a, b),
    getProject: () => props.store.project,
  })
  viewport.syncModules(props.store.project.modules)
  viewport.setSelected(props.store.selectedId.value)
  viewport.setGizmoMode(props.mode)

  watch(
    () => props.store.project.modules,
    (mods) => viewport?.syncModules(mods),
    { deep: true },
  )
  watch(
    () => props.store.selectedId.value,
    (id) => viewport?.setSelected(id),
  )
  watch(
    () => props.mode,
    (m) => viewport?.setGizmoMode(m),
  )
})

onBeforeUnmount(() => {
  viewport?.dispose()
  viewport = null
  disposeOpenscadWorker()
  disposeManifoldWorker()
})

/** Render the selected module's real OpenSCAD geometry and show it. */
async function previewSelected(): Promise<void> {
  const id = props.store.selectedId.value
  if (id === null || viewport === null || busy.value) return
  const module = props.store.project.modules.find((m) => m.id === id)
  if (module === undefined) return
  busy.value = true
  meshInfo.value = null
  try {
    const stl = await renderScadToStl(scadForModule(module))
    viewport?.setRealMesh(id, loader.parse(stl.buffer as ArrayBuffer))
    try {
      const report = await analyzeMesh(stl)
      meshInfo.value = report.empty
        ? '⚠ not a closed manifold'
        : `✓ manifold · genus ${report.genus} · ${report.triangles.toLocaleString()} tris · ${formatSize(report.size)} mm`
    } catch {
      meshInfo.value = null
    }
  } catch (e) {
    console.error('[warren] HD preview failed', e)
  } finally {
    busy.value = false
  }
}

function clearPreview(): void {
  const id = props.store.selectedId.value
  if (id !== null) viewport?.setRealMesh(id, null)
  meshInfo.value = null
}

defineExpose({ previewSelected, clearPreview, busy })
</script>

<template>
  <div ref="host" class="viewport">
    <div v-if="busy" class="busy">Generating geometry…</div>
    <div v-if="meshInfo !== null" class="mesh-info">{{ meshInfo }}</div>
  </div>
</template>

<style scoped>
.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.busy {
  position: absolute;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  background: #23272e;
  color: #fb815e;
  font:
    0.85rem system-ui,
    sans-serif;
  pointer-events: none;
}
.mesh-info {
  position: absolute;
  bottom: 0.75rem;
  left: 0.75rem;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  background: #1f2730cc;
  color: #b9bec6;
  font:
    0.8rem ui-monospace,
    monospace;
  pointer-events: none;
}
</style>
