/**
 * The reactive editor store: the bridge between the framework-free domain graph
 * (src/domain) and the Vue UI plus Three.js viewport. It holds one reactive
 * Project and the mutations the editor needs, keeping the graph valid and
 * re-serializable. See docs/ARCHITECTURE.md (domain/state layer).
 */

import { computed, reactive, ref, type ComputedRef, type Ref } from 'vue'
import {
  CURRENT_SCHEMA_VERSION,
  IDENTITY,
  defaultParameters,
  serialize,
  validateProject,
  type Mat4,
  type Module,
  type ModuleType,
  type Project,
  type ProjectSettings,
  type ValidationReport,
} from '../domain'

const APP_VERSION = '0.0.0'

const DEFAULT_SETTINGS: ProjectSettings = {
  cage: { dimensions: [400, 300, 400], barSpacing: 12.5, barDiameter: 3 },
  printBox: { size: [250, 250, 250], margin: 3 },
  material: 'PETG',
  defaultWallThickness: 3,
}

export function createEmptyProject(name = 'Untitled'): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    name,
    settings: structuredClone(DEFAULT_SETTINGS),
    modules: [],
    connections: [],
  }
}

export interface EditorStore {
  project: Project
  selectedId: Ref<string | null>
  selectedModule: ComputedRef<Module | null>
  report: ComputedRef<ValidationReport>
  addModule(type: ModuleType, transform?: Mat4): Module
  removeModule(id: string): void
  selectModule(id: string | null): void
  setModuleTransform(id: string, transform: Mat4): void
  toJSON(): string
}

export function createEditorStore(initial?: Project): EditorStore {
  const project = reactive<Project>(initial ?? createEmptyProject()) as Project
  const selectedId: Ref<string | null> = ref(null)

  // Stable, deterministic ids. Start beyond any existing mN id.
  let counter = project.modules.reduce((max, m) => {
    const match = /^m(\d+)$/.exec(m.id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  const nextId = () => `m${++counter}`

  function addModule(type: ModuleType, transform: Mat4 = IDENTITY): Module {
    const module: Module = {
      id: nextId(),
      type,
      parameters: defaultParameters(type),
      transform,
    }
    project.modules.push(module)
    return module
  }

  function removeModule(id: string): void {
    const index = project.modules.findIndex((m) => m.id === id)
    if (index >= 0) project.modules.splice(index, 1)
    project.connections = project.connections.filter(
      (c) => c.a.moduleId !== id && c.b.moduleId !== id,
    )
    if (selectedId.value === id) selectedId.value = null
  }

  function selectModule(id: string | null): void {
    selectedId.value = id
  }

  function setModuleTransform(id: string, transform: Mat4): void {
    const module = project.modules.find((m) => m.id === id)
    if (module) module.transform = transform
  }

  const selectedModule = computed<Module | null>(
    () => project.modules.find((m) => m.id === selectedId.value) ?? null,
  )

  const report = computed<ValidationReport>(() => validateProject(project))

  function toJSON(): string {
    return serialize(project)
  }

  return {
    project,
    selectedId,
    selectedModule,
    report,
    addModule,
    removeModule,
    selectModule,
    setModuleTransform,
    toJSON,
  }
}
