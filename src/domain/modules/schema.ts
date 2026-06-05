/**
 * A tiny parameter-schema engine for module definitions.
 *
 * Each module type declares a ParamSchema (see docs/MODULES.md). The engine
 * provides defaults and validation/normalization of a raw parameter record into
 * a trusted one. Framework-free and pure.
 */

import type { ModuleParameters } from '../types'

export interface NumberSpec {
  kind: 'number'
  default: number
  min?: number
  max?: number
}

export interface BooleanSpec {
  kind: 'boolean'
  default: boolean
}

export interface EnumSpec {
  kind: 'enum'
  default: string
  values: readonly string[]
}

export type ParamSpec = NumberSpec | BooleanSpec | EnumSpec

export type ParamSchema = Record<string, ParamSpec>

export type ValidationResult =
  | { ok: true; value: ModuleParameters }
  | { ok: false; errors: string[] }

/** The default parameter record for a schema. */
export function defaults(schema: ParamSchema): ModuleParameters {
  const out: ModuleParameters = {}
  for (const [key, spec] of Object.entries(schema)) {
    out[key] = spec.default
  }
  return out
}

/**
 * Validate and normalize a raw parameter record against a schema. Missing
 * parameters are filled from defaults; unknown keys and type/range violations
 * are errors. All errors are collected, not just the first.
 */
export function validate(schema: ParamSchema, raw: ModuleParameters): ValidationResult {
  const errors: string[] = []
  const value: ModuleParameters = defaults(schema)

  for (const [key, input] of Object.entries(raw)) {
    const spec = schema[key]
    if (spec === undefined) {
      errors.push(`unknown parameter: ${key}`)
      continue
    }
    const error = checkOne(key, spec, input)
    if (error !== null) {
      errors.push(error)
    } else {
      value[key] = input
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, value }
}

function checkOne(key: string, spec: ParamSpec, input: number | string | boolean): string | null {
  switch (spec.kind) {
    case 'number':
      if (typeof input !== 'number' || Number.isNaN(input)) {
        return `${key}: expected a number, got ${describe(input)}`
      }
      if (spec.min !== undefined && input < spec.min) {
        return `${key}: ${input} is below minimum ${spec.min}`
      }
      if (spec.max !== undefined && input > spec.max) {
        return `${key}: ${input} is above maximum ${spec.max}`
      }
      return null
    case 'boolean':
      if (typeof input !== 'boolean') {
        return `${key}: expected a boolean, got ${describe(input)}`
      }
      return null
    case 'enum':
      if (typeof input !== 'string' || !spec.values.includes(input)) {
        return `${key}: expected one of ${spec.values.join(', ')}, got ${describe(input)}`
      }
      return null
  }
}

function describe(input: number | string | boolean): string {
  return typeof input === 'string' ? `'${input}'` : String(input)
}
