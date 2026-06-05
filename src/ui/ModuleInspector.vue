<script setup lang="ts">
import { computed } from 'vue'
import type { EditorStore } from '../stores/editor'
import type { GizmoMode } from '../viewport/scene'

const props = defineProps<{ store: EditorStore; mode: GizmoMode }>()
const emit = defineEmits<{ 'update:mode': [GizmoMode] }>()

const selected = computed(() => props.store.selectedModule.value)
const report = computed(() => props.store.report.value)

function remove() {
  if (selected.value !== null) props.store.removeModule(selected.value.id)
}
</script>

<template>
  <div class="inspector">
    <h2>Inspector</h2>

    <section v-if="selected !== null" class="selection">
      <div class="row">
        <span>Type</span><strong>{{ selected.type }}</strong>
      </div>
      <div class="row">
        <span>Id</span><code>{{ selected.id }}</code>
      </div>

      <div class="modes">
        <button
          type="button"
          :class="{ active: mode === 'translate' }"
          @click="emit('update:mode', 'translate')"
        >
          Move
        </button>
        <button
          type="button"
          :class="{ active: mode === 'rotate' }"
          @click="emit('update:mode', 'rotate')"
        >
          Rotate
        </button>
      </div>

      <button type="button" class="danger" @click="remove">Delete</button>
    </section>

    <p v-else class="empty">Click a module to select it.</p>

    <section class="status">
      <h2>Status</h2>
      <p :class="{ bad: !report.ok }">
        {{ report.ok ? 'Valid' : `${report.errors.length} error(s)` }}
        <template v-if="report.warnings.length > 0">
          / {{ report.warnings.length }} warning(s)
        </template>
      </p>
      <ul v-if="report.errors.length > 0">
        <li v-for="(e, i) in report.errors" :key="i">{{ e.message }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.75rem;
}
h2 {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8a909a;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 0.2rem 0;
  font-size: 0.9rem;
}
.row span {
  color: #8a909a;
}
code {
  color: #b9bec6;
}
.modes {
  display: flex;
  gap: 0.4rem;
  margin: 0.6rem 0;
}
.modes button {
  flex: 1;
  padding: 0.4rem;
  border: 1px solid #2f343c;
  border-radius: 6px;
  background: #23272e;
  color: #e6e8ec;
  font: inherit;
  cursor: pointer;
}
.modes button.active {
  border-color: #fb815e;
  color: #fb815e;
}
.danger {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #5a2f2f;
  border-radius: 6px;
  background: #2a2020;
  color: #f0a08a;
  font: inherit;
  cursor: pointer;
}
.danger:hover {
  border-color: #fb815e;
}
.empty {
  color: #8a909a;
  font-size: 0.9rem;
}
.status p {
  margin: 0;
  font-size: 0.9rem;
  color: #7fd18a;
}
.status p.bad {
  color: #f0a08a;
}
.status ul {
  margin: 0.4rem 0 0;
  padding-left: 1rem;
  font-size: 0.8rem;
  color: #f0a08a;
}
</style>
