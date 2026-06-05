import { describe, it, expect } from 'vitest'
import { defaults, validate, type ParamSchema } from '../schema'

const schema: ParamSchema = {
  length: { kind: 'number', default: 100, min: 1, max: 250 },
  vents: { kind: 'boolean', default: false },
  section: { kind: 'enum', default: 'round', values: ['round', 'square'] },
}

describe('defaults', () => {
  it('returns every parameter at its default value', () => {
    expect(defaults(schema)).toEqual({ length: 100, vents: false, section: 'round' })
  })
})

describe('validate', () => {
  it('fills missing parameters from defaults', () => {
    const result = validate(schema, { length: 50 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({ length: 50, vents: false, section: 'round' })
    }
  })

  it('accepts a fully specified valid record', () => {
    const result = validate(schema, { length: 200, vents: true, section: 'square' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.section).toBe('square')
  })

  it('rejects a value of the wrong type', () => {
    const result = validate(schema, { length: 'tall' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/length/)
  })

  it('rejects a number below min', () => {
    const result = validate(schema, { length: 0 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/length/)
  })

  it('rejects a number above max', () => {
    const result = validate(schema, { length: 9999 })
    expect(result.ok).toBe(false)
  })

  it('rejects an enum value outside the allowed set', () => {
    const result = validate(schema, { section: 'triangle' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/section/)
  })

  it('rejects unknown parameter keys', () => {
    const result = validate(schema, { bogus: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/bogus/)
  })

  it('reports all errors at once, not just the first', () => {
    const result = validate(schema, { length: 'x', section: 'triangle' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})
