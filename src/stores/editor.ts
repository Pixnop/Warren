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
  splitStraight,
  validateProject,
  type Connection,
  type Mat4,
  type Module,
  type ModuleType,
  type PortRef,
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
  addConnection(a: PortRef, b: PortRef): Connection
  /** Replace an oversized straight with a connected chain of sub-straights.
   *  Returns true if a split was applied. */
  splitModule(id: string): boolean
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

  let connCounter = project.connections.reduce((max, c) => {
    const match = /^c(\d+)$/.exec(c.id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  const nextConnId = () => `c${++connCounter}`

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

  function addConnection(a: PortRef, b: PortRef): Connection {
    const connection: Connection = { id: nextConnId(), a, b }
    project.connections.push(connection)
    return connection
  }

  function splitModule(id: string): boolean {
    const module = project.modules.find((m) => m.id === id)
    if (module === undefined) return false
    const result = splitStraight(module, project.settings.printBox)
    if (result === null) return false

    const firstId = result.modules[0]!.id
    const lastId = result.modules[result.modules.length - 1]!.id

    // Reassign the original module's external connections to the chain ends:
    // its 'a' port becomes the first piece, its 'b' port the last.
    for (const c of project.connections) {
      for (const ref of [c.a, c.b]) {
        if (ref.moduleId === id) ref.moduleId = ref.portId === 'a' ? firstId : lastId
      }
    }

    const index = project.modules.findIndex((m) => m.id === id)
    if (index >= 0) project.modules.splice(index, 1)
    project.modules.push(...result.modules)
    project.connections.push(...result.connections)
    if (selectedId.value === id) selectedId.value = firstId
    return true
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
    addConnection,
    splitModule,
    toJSON,
  }
}
