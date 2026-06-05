/**
 * Project serialization. A project is exactly its JSON tree (see
 * docs/DATA_MODEL.md), so serialize is JSON.stringify and deserialize is
 * parse + migrate + structural check + graph validation.
 */

import type { Project } from './types'
import { validateProject, type ValidationReport } from './validate'

/** Bump when the on-disk schema changes; add a matching MIGRATIONS step. */
export const CURRENT_SCHEMA_VERSION = 1

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>

/**
 * Maps a from-version to a function that upgrades the raw document by one
 * version. Empty until a v2 schema exists; the seam is here so adding a
 * migration later is a one-line change.
 */
export const MIGRATIONS: Record<number, Migration> = {}

export type DeserializeResult =
  | { ok: true; project: Project; report: ValidationReport }
  | { ok: false; errors: string[] }

export function serialize(project: Project): string {
  return JSON.stringify(project, null, 2)
}

/** Apply step migrations from `fromVersion` up to (not past) `toVersion`. */
export function runMigrations(
  data: Record<string, unknown>,
  fromVersion: number,
  toVersion: number,
  migrations: Record<number, Migration> = MIGRATIONS,
): Record<string, unknown> {
  let current = data
  for (let v = fromVersion; v < toVersion; v++) {
    const step = migrations[v]
    if (step === undefined) {
      throw new Error(`no migration from schema version ${v}`)
    }
    current = step(current)
  }
  return current
}

export function deserialize(json: string): DeserializeResult {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch (e) {
    return { ok: false, errors: [`invalid JSON: ${(e as Error).message}`] }
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, errors: ['project must be a JSON object'] }
  }
  const obj = data as Record<string, unknown>

  const version = obj.schemaVersion
  if (typeof version !== 'number') {
    return { ok: false, errors: ['missing or invalid schemaVersion'] }
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `unsupported schema version ${version} (this build supports up to ${CURRENT_SCHEMA_VERSION})`,
      ],
    }
  }

  let migrated = obj
  if (version < CURRENT_SCHEMA_VERSION) {
    try {
      migrated = runMigrations(obj, version, CURRENT_SCHEMA_VERSION)
    } catch (e) {
      return { ok: false, errors: [(e as Error).message] }
    }
  }

  const shapeErrors = checkShape(migrated)
  if (shapeErrors.length > 0) {
    return { ok: false, errors: shapeErrors }
  }

  const project = migrated as unknown as Project
  return { ok: true, project, report: validateProject(project) }
}

function checkShape(o: Record<string, unknown>): string[] {
  const errors: string[] = []
  if (typeof o.name !== 'string') errors.push('missing or invalid name')
  if (typeof o.appVersion !== 'string') errors.push('missing or invalid appVersion')
  if (typeof o.settings !== 'object' || o.settings === null) errors.push('missing settings')
  if (!Array.isArray(o.modules)) errors.push('modules must be an array')
  if (!Array.isArray(o.connections)) errors.push('connections must be an array')
  return errors
}
