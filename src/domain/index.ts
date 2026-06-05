/**
 * Public API of the domain layer: the framework-free core (graph types, module
 * library, validation, serialization, and the math it rests on). Nothing here
 * imports Vue or Three.js. See docs/ARCHITECTURE.md.
 */

export * from './math'

export type {
  Gender,
  SectionShape,
  Section,
  Port,
  ModuleType,
  ModuleParameters,
  Module,
  PortRef,
  Connection,
  Material,
  PrintBox,
  CageSpec,
  ProjectSettings,
  Project,
} from './types'

export {
  MODULE_TYPES,
  getDefinition,
  defaultParameters,
  validateParameters,
  portsOf,
} from './modules/registry'
export type { ModuleDefinition } from './modules/definition'
export type { ParamSchema, ParamSpec, ValidationResult } from './modules/schema'

export { validateProject, POSITION_TOLERANCE, AXIS_TOLERANCE, SECTION_TOLERANCE } from './validate'
export type { Issue, IssueCode, Severity, ValidationReport } from './validate'

export {
  serialize,
  deserialize,
  runMigrations,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
} from './serialize'
export type { Migration, DeserializeResult } from './serialize'
