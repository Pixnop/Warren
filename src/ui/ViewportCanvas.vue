<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Viewport, type GizmoMode } from '../viewport/scene'
import type { EditorStore } from '../stores/editor'

const props = defineProps<{ store: EditorStore; mode: GizmoMode }>()

const host = ref<HTMLDivElement | null>(null)
let viewport: Viewport | null = null

onMounted(() => {
  if (host.value === null) return
  viewport = new Viewport(host.value, {
    onSelect: (id) => props.store.selectModule(id),
    onTransform: (id, t) => props.store.setModuleTransform(id, t),
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
})
</script>

<template>
  <div ref="host" class="viewport"></div>
</template>

<style scoped>
.viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
