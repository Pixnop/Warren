/**
 * The module registry: the lookup from a ModuleType to its definition, plus the
 * convenience functions the rest of the domain uses (defaults, validation, and
 * port computation for a placed module).
 */

import type { Module, ModuleParameters, ModuleType, Port } from '../types'
import { defaults, validate, type ValidationResult } from './schema'
import type { ModuleDefinition } from './definition'
import { ALL_DEFINITIONS } from './definitions'

const REGISTRY = Object.fromEntries(ALL_DEFINITIONS.map((d) => [d.type, d])) as Record<
  ModuleType,
  ModuleDefinition
>

/** Every registered module type. */
export const MODULE_TYPES: readonly ModuleType[] = ALL_DEFINITIONS.map((d) => d.type)

export function getDefinition(type: ModuleType): ModuleDefinition {
  return REGISTRY[type]
}

export function defaultParameters(type: ModuleType): ModuleParameters {
  return defaults(getDefinition(type).schema)
}

export function validateParameters(type: ModuleType, raw: ModuleParameters): ValidationResult {
  return validate(getDefinition(type).schema, raw)
}

/**
 * The ports of a placed module. Parameters are validated first; if they fail,
 * defaults are used so port ids stay available for referential checks (the
 * parameter errors are reported separately by the graph validator).
 */
export function portsOf(module: Module): Port[] {
  const def = getDefinition(module.type)
  const result = validate(def.schema, module.parameters)
  const params = result.ok ? result.value : defaults(def.schema)
  return def.ports(params)
}
