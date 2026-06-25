export type Policy = {
  governmentSpending: number
  taxRate: number
  jobGuarantee: number
  interestRate: number
  creditImpulse: number
  productivity: number
  importShare: number
  energyCost: number
  automation: number
  exportDemand: number
  transferProgressivity: number
}

export type EconomyPoint = {
  period: number
  nominalGdp: number
  realOutput: number
  capacity: number
  priceIndex: number
  inflation: number
  unemployment: number
  capacityUse: number
  taxRevenue: number
  publicOutlays: number
  fiscalDeficit: number
  governmentBalance: number
  privateBalance: number
  foreignBalance: number
  governmentDebt: number
  privateNetFinancialAssets: number
  bankLoans: number
  bankReserves: number
  householdDeposits: number
  firmDeposits: number
  currentAccount: number
  exchangeRate: number
  assetIndex: number
  inequality: number
  wageShare: number
  householdConsumption: number
  investment: number
  imports: number
  exports: number
  creditCreation: number
  identityResidual: number
}

export type Scenario = {
  id: string
  name: string
  tag: string
  policy: Policy
}

export const scenarios: Scenario[] = [
  {
    id: 'sovereign-stabilizer',
    name: '主权货币稳定器',
    tag: '财政 + 就业缓冲',
    policy: {
      governmentSpending: 205,
      taxRate: 22,
      jobGuarantee: 46,
      interestRate: 2,
      creditImpulse: 2.5,
      productivity: 100,
      importShare: 16,
      energyCost: 12,
      automation: 12,
      exportDemand: 140,
      transferProgressivity: 52,
    },
  },
  {
    id: 'austerity-gap',
    name: '紧缩需求缺口',
    tag: '低赤字 + 高失业',
    policy: {
      governmentSpending: 96,
      taxRate: 29,
      jobGuarantee: 6,
      interestRate: 4,
      creditImpulse: -1,
      productivity: 98,
      importShare: 15,
      energyCost: 12,
      automation: 12,
      exportDemand: 104,
      transferProgressivity: 18,
    },
  },
  {
    id: 'resource-limit',
    name: '真实资源约束',
    tag: '赤字扩张 + 供给瓶颈',
    policy: {
      governmentSpending: 218,
      taxRate: 19,
      jobGuarantee: 58,
      interestRate: 2,
      creditImpulse: 4,
      productivity: 84,
      importShare: 20,
      energyCost: 66,
      automation: 8,
      exportDemand: 100,
      transferProgressivity: 36,
    },
  },
  {
    id: 'private-credit-cycle',
    name: '私人信用周期',
    tag: '银行扩张 + 资产价格',
    policy: {
      governmentSpending: 132,
      taxRate: 23,
      jobGuarantee: 12,
      interestRate: 1,
      creditImpulse: 10,
      productivity: 105,
      importShare: 18,
      energyCost: 18,
      automation: 24,
      exportDemand: 108,
      transferProgressivity: 16,
    },
  },
  {
    id: 'external-constraint',
    name: '外部约束压力',
    tag: '进口依赖 + 汇率传导',
    policy: {
      governmentSpending: 170,
      taxRate: 22,
      jobGuarantee: 28,
      interestRate: 3,
      creditImpulse: 2,
      productivity: 96,
      importShare: 39,
      energyCost: 38,
      automation: 16,
      exportDemand: 72,
      transferProgressivity: 30,
    },
  },
  {
    id: 'automation-platform',
    name: '自动化平台经济',
    tag: '高产出 + 高分配压力',
    policy: {
      governmentSpending: 154,
      taxRate: 21,
      jobGuarantee: 40,
      interestRate: 2,
      creditImpulse: 5,
      productivity: 126,
      importShare: 22,
      energyCost: 18,
      automation: 82,
      exportDemand: 124,
      transferProgressivity: 24,
    },
  },
]

export const defaultPolicy = scenarios[0].policy

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const formatMoney = (value: number) => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(2)}T`
  return `${sign}${abs.toFixed(0)}B`
}

export const formatPercent = (value: number) => `${value.toFixed(1)}%`

export function createInitialPoint(policy: Policy): EconomyPoint {
  const imports = 1000 * (policy.importShare / 100)
  const exports = policy.exportDemand
  const governmentBalance = 240 - policy.governmentSpending
  const foreignBalance = imports - exports
  const privateBalance = -governmentBalance - foreignBalance

  return {
    period: 0,
    nominalGdp: 1000,
    realOutput: 1000,
    capacity: 1120,
    priceIndex: 100,
    inflation: 2,
    unemployment: 6.6,
    capacityUse: 89.3,
    taxRevenue: 240,
    publicOutlays: policy.governmentSpending,
    fiscalDeficit: -governmentBalance,
    governmentBalance,
    privateBalance,
    foreignBalance,
    governmentDebt: 820,
    privateNetFinancialAssets: 760 + privateBalance,
    bankLoans: 620,
    bankReserves: 180,
    householdDeposits: 520,
    firmDeposits: 260,
    currentAccount: exports - imports,
    exchangeRate: 1,
    assetIndex: 100,
    inequality: 0.43,
    wageShare: 0.56,
    householdConsumption: 610,
    investment: 130,
    imports,
    exports,
    creditCreation: policy.creditImpulse * 5,
    identityResidual: 0,
  }
}

export function nextPoint(previous: EconomyPoint, policy: Policy): EconomyPoint {
  const taxRate = policy.taxRate / 100
  const interestRate = policy.interestRate / 100
  const jobGuaranteeOutlays =
    policy.jobGuarantee * 0.65 + Math.max(0, previous.unemployment - 4) * policy.jobGuarantee * 0.18
  const transferOutlays = policy.transferProgressivity * 0.42
  const publicOutlays = policy.governmentSpending + jobGuaranteeOutlays + transferOutlays
  const interestIncome = previous.governmentDebt * interestRate * 0.25

  const householdIncome =
    previous.nominalGdp * previous.wageShare + publicOutlays * 0.58 + interestIncome * 0.55
  const disposableIncome = householdIncome * (1 - taxRate * 0.58)
  const consumptionPropensity = clamp(
    0.83 - previous.inequality * 0.22 + policy.jobGuarantee * 0.0011,
    0.58,
    0.93,
  )
  const creditBoost = Math.max(0, policy.creditImpulse) * 7.5
  const balanceSheetConsumption = previous.privateNetFinancialAssets * 0.035
  const householdConsumption = disposableIncome * consumptionPropensity + creditBoost + balanceSheetConsumption

  const desiredCredit =
    policy.creditImpulse * 7.2 +
    Math.max(0, previous.assetIndex - 100) * 0.08 -
    policy.interestRate * 3.8
  const repayments = previous.bankLoans * (0.012 + policy.interestRate * 0.001)
  const creditCreation = desiredCredit - repayments
  const investment = clamp(
    112 +
      creditCreation * 0.36 +
      (policy.productivity - 100) * 1.22 +
      policy.automation * 0.52 -
      policy.energyCost * 0.24,
    28,
    280,
  )

  const domesticAbsorption = householdConsumption + investment + publicOutlays
  const exports = policy.exportDemand * (1 + (previous.exchangeRate - 1) * 0.2)
  const imports =
    domesticAbsorption *
      (policy.importShare / 100) *
      clamp(1 - (previous.exchangeRate - 1) * 0.07, 0.84, 1.12) +
    policy.energyCost * 0.42
  const nominalDemand = domesticAbsorption + exports - imports

  const capacityGrowth =
    (policy.productivity - 100) * 0.00075 +
    policy.automation * 0.00045 -
    policy.energyCost * 0.00032
  const capacity = clamp(previous.capacity * (1 + capacityGrowth), 650, 1900)
  const realDemand = nominalDemand / (previous.priceIndex / 100)
  const realOutput = clamp(Math.min(realDemand, capacity * 1.04), 280, capacity * 1.04)
  const capacityUseRatio = clamp(realOutput / capacity, 0.3, 1.12)
  const capacityUse = capacityUseRatio * 100

  const unemployment = clamp(
    24 - capacityUseRatio * 19.5 - policy.jobGuarantee * 0.047 + Math.max(0, capacityUseRatio - 0.98) * 3,
    2,
    28,
  )
  const importInflation = Math.max(0, previous.exchangeRate - 1) * policy.importShare * 0.018
  const wagePressure = Math.max(0, 5 - unemployment) * 0.34
  const inflation = clamp(
    0.42 +
      Math.max(0, capacityUseRatio - 0.86) * 12 +
      policy.energyCost * 0.055 +
      importInflation +
      wagePressure +
      Math.max(0, policy.creditImpulse) * 0.08 -
      (policy.productivity - 100) * 0.025 -
      policy.jobGuarantee * 0.006,
    -2.5,
    16,
  )
  const priceIndex = previous.priceIndex * (1 + inflation / 100)
  const nominalGdp = realOutput * (priceIndex / 100)

  const taxRevenue = taxRate * (nominalGdp + interestIncome)
  const governmentBalance = taxRevenue - publicOutlays - interestIncome
  const fiscalDeficit = -governmentBalance
  const foreignBalance = imports - exports
  const privateBalance = -governmentBalance - foreignBalance
  const identityResidual = governmentBalance + privateBalance + foreignBalance

  const governmentDebt = clamp(previous.governmentDebt + fiscalDeficit, 0, 8000)
  const privateNetFinancialAssets = clamp(
    previous.privateNetFinancialAssets + privateBalance,
    -1000,
    8000,
  )
  const bankLoans = clamp(previous.bankLoans + creditCreation, 80, 3500)
  const bankReserves = clamp(previous.bankReserves + fiscalDeficit * 0.42 - creditCreation * 0.05, 25, 2200)

  const householdDeposits = clamp(
    previous.householdDeposits +
      privateBalance * 0.55 +
      Math.max(0, creditCreation) * 0.58 -
      Math.max(0, -creditCreation) * 0.28,
    30,
    5000,
  )
  const firmProfitShare = clamp(1 - previous.wageShare - taxRate * 0.18, 0.16, 0.5)
  const firmDeposits = clamp(
    previous.firmDeposits +
      nominalGdp * firmProfitShare * 0.12 +
      Math.max(0, creditCreation) * 0.36 -
      Math.max(0, -privateBalance) * 0.18,
    20,
    3000,
  )

  const currentAccount = exports - imports
  const exchangePressure =
    (foreignBalance / Math.max(nominalGdp, 1)) * 0.13 + (inflation - 2) * 0.004 - interestRate * 0.22
  const exchangeRate = clamp(previous.exchangeRate * (1 + exchangePressure), 0.72, 1.95)

  const assetGrowth =
    policy.creditImpulse * 0.0085 -
    interestRate * 0.62 +
    Math.max(0, fiscalDeficit / Math.max(nominalGdp, 1)) * 0.32 +
    policy.automation * 0.00018 -
    taxRate * 0.018
  const assetIndex = clamp(previous.assetIndex * (1 + assetGrowth), 45, 420)
  const assetReturn = (assetIndex / previous.assetIndex - 1) * 100

  const inequality = clamp(
    previous.inequality +
      unemployment * 0.0015 +
      Math.max(0, assetReturn) * 0.0023 +
      policy.automation * 0.00028 -
      taxRate * 0.018 -
      policy.transferProgressivity * 0.00075 -
      policy.jobGuarantee * 0.00065,
    0.22,
    0.74,
  )
  const wageShare = clamp(
    0.65 - inequality * 0.24 - unemployment * 0.0038 + policy.jobGuarantee * 0.00055,
    0.38,
    0.68,
  )

  return {
    period: previous.period + 1,
    nominalGdp,
    realOutput,
    capacity,
    priceIndex,
    inflation,
    unemployment,
    capacityUse,
    taxRevenue,
    publicOutlays,
    fiscalDeficit,
    governmentBalance,
    privateBalance,
    foreignBalance,
    governmentDebt,
    privateNetFinancialAssets,
    bankLoans,
    bankReserves,
    householdDeposits,
    firmDeposits,
    currentAccount,
    exchangeRate,
    assetIndex,
    inequality,
    wageShare,
    householdConsumption,
    investment,
    imports,
    exports,
    creditCreation,
    identityResidual,
  }
}

export function runSimulation(policy: Policy, horizon = 72) {
  const points = [createInitialPoint(policy)]
  for (let i = 0; i < horizon; i += 1) {
    points.push(nextPoint(points[points.length - 1], policy))
  }
  return points
}
