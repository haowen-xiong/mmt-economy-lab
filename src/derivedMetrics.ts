import {
  clamp,
  formatMoney,
  formatPercent,
  runSimulation,
  type EconomyPoint,
  type Policy,
} from './simulation'

export type Tone = 'blue' | 'green' | 'amber' | 'red'

export type SocialActorId =
  | 'workers'
  | 'assetHouseholds'
  | 'firms'
  | 'banks'
  | 'state'
  | 'foreign'
  | 'platform'

export type SocialActorRow = [string, string]

export type SocialActorView = {
  id: SocialActorId
  tone: Tone
  rows: SocialActorRow[]
}

type SocialActorCopy = {
  socialActors: Record<
    | 'income'
    | 'outflow'
    | 'balance'
    | 'policy'
    | 'risk'
    | 'wages'
    | 'consumption'
    | 'interestIncome'
    | 'assetPrice'
    | 'sales'
    | 'creditCreation'
    | 'taxRecovery'
    | 'importReceipts'
    | 'platformRents'
    | 'deposits'
    | 'loans'
    | 'reserves'
    | 'debt'
    | 'fiscalInjection'
    | 'wagePressure',
    string
  >
  policies: Record<
    | 'governmentSpending'
    | 'taxRate'
    | 'jobGuarantee'
    | 'interestRate'
    | 'creditImpulse'
    | 'productivity'
    | 'importShare'
    | 'energyCost'
    | 'automation',
    string
  >
  metrics: Record<'unemployment' | 'inflation' | 'capacityUse' | 'privateNfa', string>
  chart: Record<'inequality' | 'firmDeposits' | 'currentAccount' | 'exchangeRate', string>
  flows: Record<'governmentSpending' | 'exportIncome', string>
  status: Record<'contraction' | 'expansion' | 'distributionPressure', string>
}

export function deriveSocialActors(
  current: EconomyPoint,
  policy: Policy,
  copy: SocialActorCopy,
): SocialActorView[] {
  const interestIncome = current.governmentDebt * (policy.interestRate / 100) * 0.25
  const wageIncome = current.nominalGdp * current.wageShare
  const firmRevenue = current.householdConsumption + current.investment + current.publicOutlays
  const platformRents =
    current.nominalGdp * (policy.automation / 100) * 0.055 +
    Math.max(0, current.assetIndex - 100) * 0.8

  return [
    {
      id: 'workers',
      tone: current.unemployment > 8 || current.inflation > 7 ? 'red' : current.unemployment > 5.5 ? 'amber' : 'green',
      rows: [
        [copy.socialActors.income, `${copy.socialActors.wages} ${formatMoney(wageIncome)}`],
        [copy.socialActors.outflow, `${copy.socialActors.consumption} ${formatMoney(current.householdConsumption)}`],
        [copy.socialActors.balance, `${copy.socialActors.deposits} ${formatMoney(current.householdDeposits)}`],
        [copy.socialActors.policy, `${copy.policies.jobGuarantee} ${policy.jobGuarantee}% / ${copy.socialActors.taxRecovery} ${policy.taxRate}%`],
        [copy.socialActors.risk, `${copy.metrics.unemployment} ${formatPercent(current.unemployment)} / ${copy.metrics.inflation} ${formatPercent(current.inflation)}`],
      ],
    },
    {
      id: 'assetHouseholds',
      tone: current.inequality > 0.52 ? 'red' : current.assetIndex > 145 ? 'amber' : 'blue',
      rows: [
        [copy.socialActors.income, `${copy.socialActors.assetPrice} ${current.assetIndex.toFixed(1)} / ${copy.socialActors.interestIncome} ${formatMoney(interestIncome * 0.55)}`],
        [copy.socialActors.outflow, `${copy.socialActors.taxRecovery} ${policy.taxRate}%`],
        [copy.socialActors.balance, `${copy.metrics.privateNfa} ${formatMoney(current.privateNetFinancialAssets)}`],
        [copy.socialActors.policy, `${copy.policies.interestRate} ${policy.interestRate}% / ${copy.policies.creditImpulse} ${policy.creditImpulse}`],
        [copy.socialActors.risk, `${copy.chart.inequality} ${current.inequality.toFixed(2)}`],
      ],
    },
    {
      id: 'firms',
      tone: current.capacityUse > 98 || policy.energyCost > 55 ? 'red' : current.capacityUse > 90 ? 'amber' : 'green',
      rows: [
        [copy.socialActors.income, `${copy.socialActors.sales} ${formatMoney(firmRevenue)}`],
        [copy.socialActors.outflow, `${copy.socialActors.wages} ${formatMoney(wageIncome)} / ${copy.policies.energyCost} ${policy.energyCost}`],
        [copy.socialActors.balance, `${copy.chart.firmDeposits} ${formatMoney(current.firmDeposits)}`],
        [copy.socialActors.policy, `${copy.policies.governmentSpending} ${policy.governmentSpending}B / ${copy.policies.productivity} ${policy.productivity}`],
        [copy.socialActors.risk, `${copy.metrics.capacityUse} ${formatPercent(current.capacityUse)}`],
      ],
    },
    {
      id: 'banks',
      tone: current.creditCreation < 0 ? 'amber' : current.bankLoans > 1800 ? 'red' : 'blue',
      rows: [
        [copy.socialActors.income, `${copy.socialActors.creditCreation} ${formatMoney(current.creditCreation)}`],
        [copy.socialActors.outflow, `${copy.socialActors.reserves} ${formatMoney(current.bankReserves)}`],
        [copy.socialActors.balance, `${copy.socialActors.loans} ${formatMoney(current.bankLoans)}`],
        [copy.socialActors.policy, `${copy.policies.interestRate} ${policy.interestRate}% / ${copy.policies.creditImpulse} ${policy.creditImpulse}`],
        [copy.socialActors.risk, current.creditCreation < 0 ? copy.status.contraction : copy.status.expansion],
      ],
    },
    {
      id: 'state',
      tone: current.capacityUse > 96 || current.inflation > 7 ? 'red' : current.fiscalDeficit > 0 ? 'green' : 'amber',
      rows: [
        [copy.socialActors.income, `${copy.socialActors.taxRecovery} ${formatMoney(current.taxRevenue)}`],
        [copy.socialActors.outflow, `${copy.flows.governmentSpending} ${formatMoney(current.publicOutlays)}`],
        [copy.socialActors.balance, `${copy.socialActors.debt} ${formatMoney(current.governmentDebt)}`],
        [copy.socialActors.policy, `${copy.socialActors.fiscalInjection} ${formatMoney(current.fiscalDeficit)}`],
        [copy.socialActors.risk, `${copy.metrics.inflation} ${formatPercent(current.inflation)} / ${copy.metrics.capacityUse} ${formatPercent(current.capacityUse)}`],
      ],
    },
    {
      id: 'foreign',
      tone: current.currentAccount < -160 || current.exchangeRate > 1.35 ? 'red' : current.currentAccount < 0 ? 'amber' : 'green',
      rows: [
        [copy.socialActors.income, `${copy.socialActors.importReceipts} ${formatMoney(current.imports)}`],
        [copy.socialActors.outflow, `${copy.flows.exportIncome} ${formatMoney(current.exports)}`],
        [copy.socialActors.balance, `${copy.chart.currentAccount} ${formatMoney(current.currentAccount)}`],
        [copy.socialActors.policy, `${copy.policies.importShare} ${policy.importShare}%`],
        [copy.socialActors.risk, `${copy.chart.exchangeRate} ${current.exchangeRate.toFixed(2)}`],
      ],
    },
    {
      id: 'platform',
      tone: policy.automation > 70 && current.wageShare < 0.5 ? 'red' : policy.automation > 45 ? 'amber' : 'blue',
      rows: [
        [copy.socialActors.income, `${copy.socialActors.platformRents} ${formatMoney(platformRents)}`],
        [copy.socialActors.outflow, `${copy.socialActors.wagePressure} ${formatPercent(current.wageShare * 100)}`],
        [copy.socialActors.balance, `${copy.socialActors.assetPrice} ${current.assetIndex.toFixed(1)}`],
        [copy.socialActors.policy, `${copy.policies.automation} ${policy.automation} / ${copy.policies.productivity} ${policy.productivity}`],
        [copy.socialActors.risk, `${copy.status.distributionPressure} ${current.inequality.toFixed(2)}`],
      ],
    },
  ]
}

export type PolicyScoreKey =
  | 'employment'
  | 'priceStability'
  | 'realResources'
  | 'externalBalance'
  | 'distribution'
  | 'financialStability'

export type PolicyScore = {
  key: PolicyScoreKey
  score: number
  tone: Tone
}

export type ComparisonCaseInput = {
  id: string
  label: string
  policy: Policy
}

export type ComparisonCase = ComparisonCaseInput & {
  color: string
  gdpKey: string
  inflationKey: string
  unemploymentKey: string
  series: EconomyPoint[]
  terminal: EconomyPoint
  gdpChange: number
  peakInflation: number
  avgUnemployment: number
  scores: PolicyScore[]
  totalScore: number
  totalTone: Tone
}

export function buildComparisonCases(
  inputs: ComparisonCaseInput[],
  horizon: number,
  cursor: number,
  colors: string[],
): ComparisonCase[] {
  return inputs.map((item, index) => {
    const series = runSimulation(item.policy, horizon)
    const visibleSeries = series.slice(0, cursor + 1)
    const terminal = series[cursor]
    const initial = series[0]
    const peakInflation = Math.max(...visibleSeries.map((point) => point.inflation))
    const avgUnemployment =
      visibleSeries.reduce((sum, point) => sum + point.unemployment, 0) / visibleSeries.length
    const scores = scorePolicyCase(visibleSeries, terminal, peakInflation, avgUnemployment)
    const totalScore = Math.round(scores.reduce((sum, score) => sum + score.score, 0) / scores.length)

    return {
      ...item,
      color: colors[index % colors.length],
      gdpKey: `case${index}Gdp`,
      inflationKey: `case${index}Inflation`,
      unemploymentKey: `case${index}Unemployment`,
      series,
      terminal,
      gdpChange: (terminal.nominalGdp / initial.nominalGdp - 1) * 100,
      peakInflation,
      avgUnemployment,
      scores,
      totalScore,
      totalTone: scoreTone(totalScore),
    }
  })
}

export function buildComparisonSeries(
  cases: ComparisonCase[],
  cursor: number,
  kind: 'gdp' | 'stress',
) {
  return Array.from({ length: cursor + 1 }, (_, period) => {
    const row: Record<string, number> = { period }
    cases.forEach((item) => {
      if (kind === 'gdp') {
        row[item.gdpKey] = item.series[period].nominalGdp
      } else {
        row[item.inflationKey] = item.series[period].inflation
        row[item.unemploymentKey] = item.series[period].unemployment
      }
    })
    return row
  })
}

function scorePolicyCase(
  series: EconomyPoint[],
  terminal: EconomyPoint,
  peakInflation: number,
  avgUnemployment: number,
): PolicyScore[] {
  const finalInflation = terminal.inflation
  const currentAccountRatio = terminal.currentAccount / Math.max(terminal.nominalGdp, 1)
  const loanRatio = terminal.bankLoans / Math.max(terminal.nominalGdp, 1)
  const avgCapacityUse = series.reduce((sum, point) => sum + point.capacityUse, 0) / series.length

  return [
    makeScore('employment', 100 - avgUnemployment * 5.2),
    makeScore('priceStability', 100 - Math.max(0, peakInflation - 4) * 9 - Math.max(0, -finalInflation) * 7),
    makeScore('realResources', 100 - Math.max(0, avgCapacityUse - 92) * 4.6 - Math.max(0, 72 - avgCapacityUse) * 2.8),
    makeScore('externalBalance', 100 - Math.abs(currentAccountRatio) * 170 - Math.abs(terminal.exchangeRate - 1) * 58),
    makeScore('distribution', 100 - Math.max(0, terminal.inequality - 0.34) * 165 + Math.max(0, terminal.wageShare - 0.5) * 36),
    makeScore('financialStability', 100 - Math.abs(terminal.creditCreation / Math.max(terminal.nominalGdp, 1)) * 280 - Math.max(0, loanRatio - 1.15) * 42 - Math.max(0, terminal.assetIndex - 170) * 0.32),
  ]
}

function makeScore(key: PolicyScoreKey, value: number): PolicyScore {
  const score = Math.round(clamp(value, 0, 100))
  return { key, score, tone: scoreTone(score) }
}

function scoreTone(score: number): Tone {
  if (score >= 82) return 'green'
  if (score >= 66) return 'blue'
  if (score >= 48) return 'amber'
  return 'red'
}
