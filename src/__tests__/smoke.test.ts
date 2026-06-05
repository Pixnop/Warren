import { describe, it, expect } from 'vitest'

// Smoke test: verifies the Vitest + jsdom harness is wired up.
// Real unit tests arrive with Phase 1 (the data model / graph).
describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })

  it('has a DOM (jsdom)', () => {
    const el = document.createElement('div')
    el.textContent = 'warren'
    expect(el.textContent).toBe('warren')
  })
})
