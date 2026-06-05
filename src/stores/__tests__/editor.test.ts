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
