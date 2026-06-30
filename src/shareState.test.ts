import { describe, expect, it } from 'vitest'
import { defaultPolicy, scenarios, type Policy } from './simulation'
import { buildShareUrl, parseShareState } from './shareState'

describe('share state', () => {
  it('defaults to the English baseline experiment without URL params', () => {
    const state = parseShareState('')

    expect(state.language).toBe('en')
    expect(state.activeTab).toBe('overview')
    expect(state.activeScenario).toBe(scenarios[0].id)
    expect(state.cursor).toBe(24)
    expect(state.policy).toEqual(defaultPolicy)
  })

  it('restores a preset scenario link without custom policy params', () => {
    const state = parseShareState('?scenario=external-constraint&tab=compare&lang=zh&period=42')
    const scenario = scenarios.find((item) => item.id === 'external-constraint')

    expect(state.language).toBe('zh')
    expect(state.activeTab).toBe('compare')
    expect(state.activeScenario).toBe('external-constraint')
    expect(state.cursor).toBe(42)
    expect(state.policy).toEqual(scenario?.policy)
  })

  it('round-trips custom policy links', () => {
    const policy: Policy = {
      ...defaultPolicy,
      governmentSpending: 123.45,
      taxRate: 27,
      creditImpulse: -2.5,
      automation: 61,
    }

    const url = buildShareUrl('https://example.com/mmt-economy-lab/?g=999#old', {
      policy,
      activeScenario: 'custom',
      activeTab: 'resources',
      language: 'en',
      cursor: 8,
    })
    const parsedUrl = new URL(url)
    const restored = parseShareState(parsedUrl.search)

    expect(parsedUrl.hash).toBe('')
    expect(parsedUrl.searchParams.get('g')).toBe('123.45')
    expect(parsedUrl.searchParams.get('c')).toBe('-2.5')
    expect(restored.activeScenario).toBe('custom')
    expect(restored.activeTab).toBe('resources')
    expect(restored.cursor).toBe(8)
    expect(restored.policy).toEqual(policy)
  })
})
