<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { Viewport, type GizmoMode } from '../viewport/scene'
import { renderScadToStl, disposeOpenscadWorker } from '../geometry/openscad'
import { scadForModule } from '../domain'
import type { EditorStore } from '../stores/editor'

const props = defineProps<{ store: EditorStore; mode: GizmoMode }>()

const host = ref<HTMLDivElement | null>(null)
const busy = ref(false)
let viewport: Viewport | null = null
const loader = new STLLoader()

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
})

/** Render the selected module's real OpenSCAD geometry and show it. */
async function previewSelected(): Promise<void> {
  const id = props.store.selectedId.value
  if (id === null || viewport === null || busy.value) return
  const module = props.store.project.modules.find((m) => m.id === id)
  if (module === undefined) return
  busy.value = true
  try {
    const stl = await renderScadToStl(scadForModule(module))
    const geometry = loader.parse(stl.buffer as ArrayBuffer)
    viewport?.setRealMesh(id, geometry)
  } catch (e) {
    console.error('[warren] HD preview failed', e)
  } finally {
    busy.value = false
  }
}

function clearPreview(): void {
  const id = props.store.selectedId.value
  if (id !== null) viewport?.setRealMesh(id, null)
}

defineExpose({ previewSelected, clearPreview, busy })
</script>

<template>
  <div ref="host" class="viewport">
    <div v-if="busy" class="busy">Generating geometry…</div>
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
</style>
