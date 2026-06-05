<script setup lang="ts">
import { MODULE_TYPES, translation, type ModuleType } from '../domain'
import type { EditorStore } from '../stores/editor'

const props = defineProps<{ store: EditorStore }>()

const LABELS: Record<ModuleType, string> = {
  straight: 'Straight',
  elbow: 'Elbow',
  tee: 'Tee',
  wye: 'Wye',
  transition: 'Transition',
  platform: 'Platform',
  cage_mount: 'Cage mount',
}

function add(type: ModuleType) {
  // Stagger new modules on a coarse grid so they do not stack exactly.
  const n = props.store.project.modules.length
  const x = (n % 5) * 90 - 180
  const y = Math.floor(n / 5) * 90 - 90
  const module = props.store.addModule(type, translation([x, y, 0]))
  props.store.selectModule(module.id)
}
</script>

<template>
  <div class="palette">
    <h2>Modules</h2>
    <button v-for="type in MODULE_TYPES" :key="type" type="button" @click="add(type)">
      {{ LABELS[type] }}
    </button>
  </div>
</template>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem;
}
h2 {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8a909a;
}
button {
  text-align: left;
  padding: 0.55rem 0.7rem;
  border: 1px solid #2f343c;
  border-radius: 6px;
  background: #23272e;
  color: #e6e8ec;
  font: inherit;
  cursor: pointer;
}
button:hover {
  border-color: #fb815e;
  background: #2a2f37;
}
</style>
