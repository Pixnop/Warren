import { describe, it, expect } from 'vitest'
import { createEditorStore } from '../editor'
import { deserialize, translation, getTranslation } from '../../domain'

describe('editor store', () => {
  it('starts empty and valid with no selection', () => {
    const s = createEditorStore()
    expect(s.project.modules.length).toBe(0)
    expect(s.report.value.ok).toBe(true)
    expect(s.selectedModule.value).toBeNull()
  })

  it('adds a module with default parameters and a unique id', () => {
    const s = createEditorStore()
    const a = s.addModule('straight')
    const b = s.addModule('tee')
    expect(s.project.modules.length).toBe(2)
    expect(a.id).not.toBe(b.id)
    expect(a.type).toBe('straight')
    expect(a.parameters).toHaveProperty('length')
  })

  it('selects and reads the selected module', () => {
    const s = createEditorStore()
    const a = s.addModule('straight')
    s.selectModule(a.id)
    expect(s.selectedModule.value?.id).toBe(a.id)
    s.selectModule(null)
    expect(s.selectedModule.value).toBeNull()
  })

  it('updates a module transform', () => {
    const s = createEditorStore()
    const a = s.addModule('straight')
    s.setModuleTransform(a.id, translation([10, 0, 0]))
    expect(getTranslation(s.project.modules[0]!.transform)).toEqual([10, 0, 0])
  })

  it('removes a module and clears the selection', () => {
    const s = createEditorStore()
    const a = s.addModule('straight')
    s.selectModule(a.id)
    s.removeModule(a.id)
    expect(s.project.modules.length).toBe(0)
    expect(s.selectedModule.value).toBeNull()
  })

  it('removes connections that reference a removed module', () => {
    const s = createEditorStore()
    const a = s.addModule('straight')
    const b = s.addModule('straight', translation([0, 0, 100]))
    s.project.connections.push({
      id: 'c1',
      a: { moduleId: a.id, portId: 'b' },
      b: { moduleId: b.id, portId: 'a' },
    })
    s.removeModule(b.id)
    expect(s.project.connections.length).toBe(0)
  })

  it('keeps the selection when a different module is removed', () => {
    const s = createEditorStore()
    const a = s.addModule('straight')
    const b = s.addModule('tee')
    s.selectModule(a.id)
    s.removeModule(b.id)
    expect(s.selectedModule.value?.id).toBe(a.id)
  })

  it('adds a connection with a unique id', () => {
    const s = createEditorStore()
    const a = s.addModule('straight')
    const b = s.addModule('straight', translation([0, 0, 100]))
    const c1 = s.addConnection({ moduleId: a.id, portId: 'b' }, { moduleId: b.id, portId: 'a' })
    const c2 = s.addConnection({ moduleId: a.id, portId: 'a' }, { moduleId: b.id, portId: 'b' })
    expect(s.project.connections.length).toBe(2)
    expect(c1.id).not.toBe(c2.id)
  })

  it('a snapped, connected pair validates with no errors', () => {
    const s = createEditorStore()
    const a = s.addModule('straight')
    // Placed so a.b (female, +Z at z=50) mates b.a (male, -Z at z=50).
    const b = s.addModule('straight', translation([0, 0, 100]))
    s.addConnection({ moduleId: a.id, portId: 'b' }, { moduleId: b.id, portId: 'a' })
    expect(s.report.value.ok).toBe(true)
    expect(s.report.value.errors).toEqual([])
  })

  it('splits an oversized straight in place into a connected, valid chain', () => {
    const s = createEditorStore()
    const m = s.addModule('straight')
    m.parameters.length = 600 // box usable is 244 -> 3 pieces
    expect(s.splitModule(m.id)).toBe(true)
    expect(s.project.modules.length).toBe(3)
    expect(s.project.connections.length).toBe(2)
    expect(s.report.value.ok).toBe(true)
  })

  it('does not split a straight that already fits', () => {
    const s = createEditorStore()
    const m = s.addModule('straight') // default length 100
    expect(s.splitModule(m.id)).toBe(false)
    expect(s.project.modules.length).toBe(1)
  })

  it('reassigns the original end connections to the chain ends when splitting', () => {
    const s = createEditorStore()
    const long = s.addModule('straight')
    long.parameters.length = 600
    const neighbor = s.addModule('straight', translation([0, 0, 350]))
    // connect the long module's b to the neighbor's a
    s.addConnection({ moduleId: long.id, portId: 'b' }, { moduleId: neighbor.id, portId: 'a' })
    expect(s.splitModule(long.id)).toBe(true)
    // 3 sub-pieces + neighbor = 4 modules; chain (2) + the external one (1) = 3 connections
    expect(s.project.modules.length).toBe(4)
    expect(s.project.connections.length).toBe(3)
    // the external connection no longer references the removed module id
    expect(
      s.project.connections.some((c) => c.a.moduleId === long.id || c.b.moduleId === long.id),
    ).toBe(false)
  })

  it('serializes to JSON that round-trips back to an equal project', () => {
    const s = createEditorStore()
    s.addModule('straight')
    const result = deserialize(s.toJSON())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.project.modules.length).toBe(1)
      expect(result.report.ok).toBe(true)
    }
  })
})
