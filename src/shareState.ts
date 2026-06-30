import { defaultPolicy, scenarios, type Policy } from './simulation'

export type TabId = 'overview' | 'balances' | 'credit' | 'resources' | 'society' | 'compare'
export type Language = 'zh' | 'en'

export const DEFAULT_CURSOR = 24

export type ShareState = {
  policy: Policy
  activeScenario: string
  activeTab: TabId
  language: Language
  cursor: number
}

const tabIds: TabId[] = ['overview', 'balances', 'credit', 'resources', 'society', 'compare']

const policyUrlParams: Record<keyof Policy, string> = {
  governmentSpending: 'g',
  taxRate: 't',
  jobGuarantee: 'j',
  interestRate: 'r',
  creditImpulse: 'c',
  productivity: 'p',
  importShare: 'm',
  energyCost: 'e',
  automation: 'a',
  exportDemand: 'x',
  transferProgressivity: 'd',
}

const policyUrlEntries = Object.entries(policyUrlParams) as Array<[keyof Policy, string]>

function isTabId(value: string | null): value is TabId {
  return value !== null && tabIds.includes(value as TabId)
}

function isLanguage(value: string | null): value is Language {
  return value === 'zh' || value === 'en'
}

function formatShareNumber(value: number) {
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(2)))
}

export function parseShareState(search: string): ShareState {
  const fallback: ShareState = {
    policy: defaultPolicy,
    activeScenario: scenarios[0].id,
    activeTab: 'overview',
    language: 'en',
    cursor: DEFAULT_CURSOR,
  }

  const params = new URLSearchParams(search)
  const sharedPolicy: Policy = { ...defaultPolicy }
  let hasPolicyOverride = false

  policyUrlEntries.forEach(([key, param]) => {
    const rawValue = params.get(param)
    if (rawValue === null) return
    const parsedValue = Number(rawValue)
    if (!Number.isFinite(parsedValue)) return
    sharedPolicy[key] = parsedValue
    hasPolicyOverride = true
  })

  const scenario = scenarios.find((item) => item.id === params.get('scenario'))
  const tab = params.get('tab')
  const lang = params.get('lang')
  const rawPeriod = params.get('period')
  const period = rawPeriod === null ? Number.NaN : Number(rawPeriod)

  return {
    policy: hasPolicyOverride ? sharedPolicy : scenario?.policy ?? fallback.policy,
    activeScenario: hasPolicyOverride ? 'custom' : scenario?.id ?? fallback.activeScenario,
    activeTab: isTabId(tab) ? tab : fallback.activeTab,
    language: isLanguage(lang) ? lang : fallback.language,
    cursor: Number.isFinite(period) ? Math.max(0, Math.round(period)) : fallback.cursor,
  }
}

export function readInitialAppState(): ShareState {
  if (typeof window === 'undefined') return parseShareState('')
  return parseShareState(window.location.search)
}

export function buildShareUrl(baseHref: string, state: ShareState) {
  const url = new URL(baseHref)
  policyUrlEntries.forEach(([, param]) => url.searchParams.delete(param))
  url.searchParams.set('scenario', state.activeScenario)
  url.searchParams.set('tab', state.activeTab)
  url.searchParams.set('lang', state.language)
  url.searchParams.set('period', String(state.cursor))

  if (state.activeScenario === 'custom') {
    policyUrlEntries.forEach(([key, param]) => {
      url.searchParams.set(param, formatShareNumber(state.policy[key]))
    })
  }

  url.hash = ''
  return url.toString()
}
