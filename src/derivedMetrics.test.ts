import { describe, expect, it } from 'vitest'
import {
  buildComparisonCases,
  buildComparisonSeries,
  deriveSocialActors,
  type PolicyScoreKey,
  type SocialActorId,
} from './derivedMetrics'
import { runSimulation, scenarios } from './simulation'

const colors = ['#2563eb', '#0f766e', '#b45309']

const testCopy = {
  socialActors: {
    income: 'income',
    outflow: 'outflow',
    balance: 'balance',
    policy: 'policy',
    risk: 'risk',
    wages: 'wages',
    consumption: 'consumption',
    interestIncome: 'interest',
    assetPrice: 'assets',
    sales: 'sales',
    creditCreation: 'credit',
    taxRecovery: 'tax',
    importReceipts: 'imports',
    platformRents: 'rents',
    deposits: 'deposits',
    loans: 'loans',
    reserves: 'reserves',
    debt: 'debt',
    fiscalInjection: 'fiscal',
    wagePressure: 'wage share',
  },
  policies: {
    governmentSpending: 'spending',
    taxRate: 'tax rate',
    jobGuarantee: 'job guarantee',
    interestRate: 'rate',
    creditImpulse: 'credit impulse',
    productivity: 'productivity',
    importShare: 'import share',
    energyCost: 'energy cost',
    automation: 'automation',
  },
  metrics: {
    unemployment: 'unemployment',
    inflation: 'inflation',
    capacityUse: 'capacity use',
    privateNfa: 'private nfa',
  },
  chart: {
    inequality: 'inequality',
    firmDeposits: 'firm deposits',
    currentAccount: 'current account',
    exchangeRate: 'exchange rate',
  },
  flows: {
    governmentSpending: 'government spending',
    exportIncome: 'export income',
  },
  status: {
    contraction: 'contraction',
    expansion: 'expansion',
    distributionPressure: 'distribution pressure',
  },
}

const scoreKeys: PolicyScoreKey[] = [
  'employment',
  'priceStability',
  'realResources',
  'externalBalance',
  'distribution',
  'financialStability',
]

describe('comparison metrics', () => {
  it('builds scored policy cases at the requested cursor', () => {
    const inputs = scenarios.slice(0, 3).map((scenario) => ({
      id: scenario.id,
      label: scenario.name,
      policy: scenario.policy,
    }))
    const cases = buildComparisonCases(inputs, 24, 12, colors)

    expect(cases).toHaveLength(3)
    cases.forEach((item, index) => {
      expect(item.color).toBe(colors[index])
      expect(item.series).toHaveLength(25)
      expect(item.terminal).toBe(item.series[12])
      expect(item.scores.map((score) => score.key)).toEqual(scoreKeys)
      expect(item.totalScore).toBeGreaterThanOrEqual(0)
      expect(item.totalScore).toBeLessThanOrEqual(100)
      item.scores.forEach((score) => {
        expect(score.score).toBeGreaterThanOrEqual(0)
        expect(score.score).toBeLessThanOrEqual(100)
      })
    })
  })

  it('builds chart rows for every visible period', () => {
    const inputs = scenarios.slice(0, 2).map((scenario) => ({
      id: scenario.id,
      label: scenario.name,
      policy: scenario.policy,
    }))
    const cases = buildComparisonCases(inputs, 18, 9, colors)
    const gdpRows = buildComparisonSeries(cases, 9, 'gdp')
    const stressRows = buildComparisonSeries(cases, 9, 'stress')

    expect(gdpRows).toHaveLength(10)
    expect(stressRows).toHaveLength(10)
    expect(gdpRows[9].period).toBe(9)
    cases.forEach((item) => {
      expect(gdpRows[9][item.gdpKey]).toBe(item.series[9].nominalGdp)
      expect(stressRows[9][item.inflationKey]).toBe(item.series[9].inflation)
      expect(stressRows[9][item.unemploymentKey]).toBe(item.series[9].unemployment)
    })
  })
})

describe('social actor map', () => {
  it('returns one populated card model for every social actor', () => {
    const series = runSimulation(scenarios[0].policy, 12)
    const actors = deriveSocialActors(series[12], scenarios[0].policy, testCopy)
    const ids = actors.map((actor) => actor.id)
    const expectedIds: SocialActorId[] = [
      'workers',
      'assetHouseholds',
      'firms',
      'banks',
      'state',
      'foreign',
      'platform',
    ]

    expect(ids).toEqual(expectedIds)
    actors.forEach((actor) => {
      expect(actor.rows).toHaveLength(5)
      actor.rows.forEach(([label, value]) => {
        expect(label.length).toBeGreaterThan(0)
        expect(value.length).toBeGreaterThan(0)
      })
    })
  })
})
