<script setup lang="ts">
// Placeholder shell. The real editor (viewport, module palette, inspector)
// is built starting in Phase 2 — see docs/ROADMAP.md.
const docs = [
  ['Architecture', 'docs/ARCHITECTURE.md'],
  ['Data model', 'docs/DATA_MODEL.md'],
  ['Roadmap', 'docs/ROADMAP.md'],
] as const
</script>

<template>
  <main class="shell">
    <h1>Warren</h1>
    <p>Parametric editor for 3D-printable modular rodent tube networks.</p>
    <p class="hint">Scaffold only. Start here:</p>
    <ul>
      <li v-for="[label, path] in docs" :key="path">
        <strong>{{ label }}</strong>
        <code>{{ path }}</code>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.shell {
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1.5rem;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}
h1 {
  margin-bottom: 0.25rem;
}
.hint {
  margin-top: 2rem;
  color: #666;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.25rem 0;
}
code {
  color: #666;
  font-size: 0.9em;
}
</style>
