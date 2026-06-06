<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createEditorStore } from './stores/editor'
import type { GizmoMode } from './viewport/scene'
import ModulePalette from './ui/ModulePalette.vue'
import ModuleInspector from './ui/ModuleInspector.vue'
import ViewportCanvas from './ui/ViewportCanvas.vue'
import logo from './assets/logo.svg'

const store = createEditorStore()
const mode = ref<GizmoMode>('translate')

const canvas = ref<{ previewSelected: () => void; clearPreview: () => void } | null>(null)

// Dev-only affordance: expose the store on window for debugging and verification.
if (import.meta.env.DEV) {
  ;(window as unknown as { warren?: unknown }).warren = store
}

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
  const id = store.selectedId.value
  if ((e.key === 'Delete' || e.key === 'Backspace') && id !== null) {
    store.removeModule(id)
    e.preventDefault()
  } else if (e.key === 'g') {
    mode.value = 'translate'
  } else if (e.key === 'r') {
    mode.value = 'rotate'
  } else if (e.key === 'Escape') {
    store.selectModule(null)
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="app">
    <header class="topbar">
      <img :src="logo" alt="Warren" width="26" height="26" />
      <span class="title">Warren</span>
      <span class="sub">tube network editor</span>
    </header>
    <aside class="left">
      <ModulePalette :store="store" />
    </aside>
    <main class="stage">
      <ViewportCanvas ref="canvas" :store="store" :mode="mode" />
    </main>
    <aside class="right">
      <ModuleInspector
        :store="store"
        :mode="mode"
        @update:mode="mode = $event"
        @preview="canvas?.previewSelected()"
        @clear-preview="canvas?.clearPreview()"
      />
    </aside>
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: 200px 1fr 260px;
  grid-template-rows: 48px 1fr;
  grid-template-areas:
    'top top top'
    'left stage right';
  height: 100vh;
  color: #e6e8ec;
  background: #1a1d22;
}
.topbar {
  grid-area: top;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 1rem;
  border-bottom: 1px solid #2a2e34;
  background: #15181c;
}
.title {
  font-weight: 600;
}
.sub {
  color: #8a909a;
  font-size: 0.85rem;
}
.left {
  grid-area: left;
  border-right: 1px solid #2a2e34;
  overflow-y: auto;
}
.right {
  grid-area: right;
  border-left: 1px solid #2a2e34;
  overflow-y: auto;
}
.stage {
  grid-area: stage;
  position: relative;
  min-width: 0;
  min-height: 0;
}
</style>
