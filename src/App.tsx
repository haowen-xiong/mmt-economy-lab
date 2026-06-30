import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Banknote,
  Building2,
  CircleGauge,
  Factory,
  GitCompareArrows,
  Globe2,
  HelpCircle,
  Landmark,
  Pause,
  Play,
  RefreshCcw,
  Scale,
  Share2,
  Settings2,
  ShieldAlert,
  StepForward,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react'
import {
  formatMoney,
  formatPercent,
  runSimulation,
  scenarios,
  type EconomyPoint,
  type Policy,
} from './simulation'
import {
  buildComparisonCases,
  buildComparisonSeries,
  deriveSocialActors,
  type ComparisonCase,
  type PolicyScoreKey,
  type SocialActorId,
  type SocialActorView,
} from './derivedMetrics'
import { buildShareUrl, readInitialAppState, type Language, type TabId } from './shareState'
import './App.css'

type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
type TooltipState = { text: string; x: number; y: number } | null
type ShareStatus = 'idle' | 'copied' | 'ready'
type TooltipContextValue = {
  show: (text: string, x: number, y: number) => void
  hide: () => void
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

const tabs: Array<{ id: TabId; icon: Icon }> = [
  { id: 'overview', icon: CircleGauge },
  { id: 'balances', icon: Scale },
  { id: 'credit', icon: Landmark },
  { id: 'resources', icon: Factory },
  { id: 'society', icon: Globe2 },
  { id: 'compare', icon: GitCompareArrows },
]

const socialActorIcons: Record<SocialActorId, Icon> = {
  workers: Users,
  assetHouseholds: TrendingUp,
  firms: Factory,
  banks: Landmark,
  state: Banknote,
  foreign: Globe2,
  platform: Building2,
}

const chartColors = {
  blue: '#2563eb',
  green: '#0f766e',
  amber: '#b45309',
  red: '#dc2626',
  slate: '#475569',
  violet: '#7c3aed',
}

const INITIAL_HORIZON = 120
const HORIZON_EXTENSION = 120
const HORIZON_EXTENSION_THRESHOLD = 12
const TOOLTIP_WIDTH = 320
const TOOLTIP_MARGIN = 12
const TOOLTIP_OFFSET = 14
const CLIPBOARD_TIMEOUT_MS = 600
const comparisonColors = ['#2563eb', '#0f766e', '#b45309', '#dc2626', '#7c3aed', '#475569', '#0891b2']

function copyTextWithTextArea(text: string) {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  document.body.appendChild(textArea)
  textArea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textArea)
  }
}

async function copyText(text: string) {
  const textAreaCopied = copyTextWithTextArea(text)
  if (textAreaCopied) return true

  if (!navigator.clipboard?.writeText || !window.isSecureContext) return false

  let timeoutId: ReturnType<typeof window.setTimeout> | undefined
  try {
    return await Promise.race([
      navigator.clipboard.writeText(text).then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(false), CLIPBOARD_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  }
}

const copy = {
  zh: {
    appTitle: 'MMT 现代经济沙盒',
    appSubtitle: '财政、信用、资源、外部约束',
    language: '语言',
    run: '运行',
    pause: '暂停',
    step: '推进',
    reset: '重置',
    shareExperiment: '分享',
    copied: '已复制',
    linkReady: '链接就绪',
    scenario: '场景',
    policyKnobs: '政策旋钮',
    customExperiment: '自定义实验',
    period: '周期',
    window: '窗口',
    langNames: { zh: '中文', en: 'English' },
    tabs: {
      overview: '总览',
      balances: '部门余额',
      credit: '银行信用',
      resources: '真实资源',
      society: '现代社会',
      compare: '政策对比',
    },
    scenarios: {
      'sovereign-stabilizer': ['主权货币稳定器', '财政 + 就业缓冲'],
      'austerity-gap': ['紧缩需求缺口', '低赤字 + 高失业'],
      'resource-limit': ['真实资源约束', '赤字扩张 + 供给瓶颈'],
      'private-credit-cycle': ['私人信用周期', '银行扩张 + 资产价格'],
      'external-constraint': ['外部约束压力', '进口依赖 + 汇率传导'],
      'automation-platform': ['自动化平台经济', '高产出 + 高分配压力'],
    },
    scenarioHelp: {
      'sovereign-stabilizer': '观察主权货币政府通过财政支出和就业保障稳定收入、需求和私人部门净金融资产。',
      'austerity-gap': '模拟政府收缩财政时，私人部门收入、就业和产出可能如何被需求缺口拖累。',
      'resource-limit': '展示财政扩张遇到产能、能源和供给瓶颈时，为什么更容易转化为价格压力。',
      'private-credit-cycle': '强调商业银行信用扩张如何创造存款、推高投资和资产价格，也可能积累脆弱性。',
      'external-constraint': '模拟高进口依赖经济体在财政扩张后面临的经常账户、汇率和进口价格压力。',
      'automation-platform': '观察自动化和平台集中如何同时提高产出能力、资产价格和分配压力。',
    },
    policies: {
      governmentSpending: '政府支出',
      taxRate: '税率',
      jobGuarantee: '就业保障',
      interestRate: '政策利率',
      creditImpulse: '银行信用冲量',
      productivity: '生产率',
      importShare: '进口依赖',
      energyCost: '能源成本',
      automation: '自动化集中度',
      exportDemand: '出口需求',
      transferProgressivity: '转移累进性',
    },
    policyHelp: {
      governmentSpending: '政府购买、公共服务、补贴和转移支付的基础规模。提高它会增加私人部门收入和赤字，但接近产能上限时会推高通胀。',
      taxRate: '政府从私人部门回收购买力的比例。提高税率会降低可支配收入和需求，也会缩小财政赤字并缓和通胀。',
      jobGuarantee: '政府吸收失业劳动力的力度。它把失业缓冲池转为就业缓冲池，稳定收入下限，但会增加公共支出。',
      interestRate: '央行政策利率。提高利率会抑制私人信用和资产价格，但也会增加政府债务利息收入。',
      creditImpulse: '商业银行净新增信用的倾向。正值代表信贷扩张，负值代表去杠杆和还贷销毁存款。',
      productivity: '单位资源能生产的真实产出。更高生产率会提升产能并降低通胀压力，是财政空间的真实基础。',
      importShare: '国内需求泄漏到进口的比例。越高，财政乘数越弱，外部部门和汇率约束越重要。',
      energyCost: '能源和基础投入品成本。上升时会压低有效产能并推高成本型通胀。',
      automation: '自动化、平台和资本密集生产的集中程度。它可能提高产能和资产价格，同时压低工资份额并提高分配压力。',
      exportDemand: '外国部门对本国产出的基础需求。提高它会改善经常账户并增加国内收入，适合观察开放经济中的外部支撑。',
      transferProgressivity: '转移支付和再分配的累进力度。提高它会增加低收入部门现金流、降低不平等，但也会扩大公共支出。',
    },
    metrics: {
      nominalGdp: '名义 GDP',
      capacityUse: '产能利用',
      inflation: '通胀',
      priceIndex: '价格指数',
      unemployment: '失业率',
      wageShare: '工资份额',
      privateNfa: '私人净金融资产',
      fiscalDeficit: '财政赤字',
    },
    metricHelp: {
      nominalGdp: '以当期价格计量的总产出。它会同时受真实产出和价格指数影响。',
      inflation: '价格指数的变化率。需求超过真实资源、能源成本上升或进口价格传导都会推高它。',
      unemployment: '未被私人部门或就业保障吸收的劳动力比例。它反映需求不足和产能利用不足。',
      privateNfa: '私人部门持有的净金融资产。MMT 视角下，政府赤字通常对应非政府部门净金融资产增加。',
    },
    panels: {
      macroPath: ['宏观路径', 'GDP / 通胀 / 失业'],
      currentFlows: ['当期流量', '主要交易'],
      mmtIdentity: ['MMT 恒等式', '三部门余额'],
      sectorSeries: ['部门余额时间序列', '政府 + 私人 + 外国 = 0'],
      currentBalances: ['当期余额', '盈余为正'],
      balanceSheet: ['资产负债表快照', '存量'],
      creditDeposits: ['银行信用与存款', '贷款创造存款，偿还销毁存款'],
      creditImpulse: ['信用脉冲', '当期净新增'],
      creditAssets: ['信用与资产价格', '金融周期'],
      realOutput: ['真实产出与产能', '财政能力受真实资源约束'],
      constraints: ['约束仪表', '压力指数'],
      external: ['外部部门', '贸易与汇率'],
      distribution: ['分配、资产与劳动', '现代经济社会层'],
      socialStructure: ['社会结构', '当期指标'],
      modernConstraints: ['现代约束', '信用、平台、外部'],
      socialActors: ['社会主体图谱', '收入、资产负债、风险'],
    },
    panelHelp: {
      macroPath: '把名义 GDP、通胀和失业放在同一张图里，观察财政、信用和资源约束的联动。',
      currentFlows: '展示当期几个核心资金流：政府支出、税收、银行信用、进口支付和出口收入。',
      mmtIdentity: '政府余额、私人部门余额、外国部门余额必须相加为零，这是部门余额分析的基本闭合条件。',
      sectorSeries: '观察不同政策下，政府赤字如何映射到私人部门盈余和外国部门盈余。',
      currentBalances: '正值表示该部门当期获得净金融流入，负值表示净流出。',
      balanceSheet: '用简化资产负债表看存量：国债、存款、贷款、准备金和净金融资产如何对应。',
      creditDeposits: '银行贷款创造存款，偿还贷款销毁存款；这里观察信贷周期如何影响总需求。',
      creditImpulse: '当前净信用创造是银行系统对需求和资产市场的增量推动。',
      creditAssets: '展示信用扩张和资产价格之间的反馈，帮助理解金融周期。',
      realOutput: '比较真实产出和产能。财政扩张能否增加真实产出，取决于是否还有可动员资源。',
      constraints: '把通胀、产能、进口和失业压力浓缩成几个仪表，快速定位约束来自哪里。',
      external: '显示进口、出口、经常账户和汇率指数，适合观察开放经济里的外部约束。',
      distribution: '跟踪资产价格、不平等和工资份额，观察现代经济中增长和分配是否同步。',
      socialStructure: '展示当前分配结构的几个快照指标。',
      modernConstraints: '把财政空间、信用周期、外部平衡和分配压力转成状态判断。',
      socialActors: '把宏观变量拆到工人家庭、高资产家庭、企业、银行、政府、外国部门和平台资本，帮助观察政策传导到不同主体的路径。',
    },
    chart: {
      government: '政府',
      privateSector: '私人部门',
      foreignSector: '外国部门',
      governmentBalance: '政府余额',
      privateBalance: '私人部门余额',
      foreignBalance: '外国部门余额',
      balance: '余额',
      bankLoans: '银行贷款',
      householdDeposits: '家庭存款',
      firmDeposits: '企业存款',
      bankReserves: '银行准备金',
      netCreditCreation: '净信用创造',
      bankLoansStock: '银行贷款存量',
      reserves: '准备金',
      assetIndex: '资产价格指数',
      capacity: '产能',
      realOutput: '真实产出',
      capacityPressure: '产能压力',
      inflationPressure: '通胀压力',
      importGap: '进口缺口',
      unemploymentBuffer: '失业缓冲',
      exports: '出口',
      imports: '进口',
      currentAccount: '经常账户',
      exchangeRate: '汇率指数',
      inequality: '不平等指数',
      residual: '残差',
      deposits: '存款',
      loans: '贷款',
    },
    status: {
      fiscalSpace: '财政空间',
      resourceRoom: '真实资源尚有余量',
      supplyLimit: '接近供给上限',
      creditCycle: '信用周期',
      expansion: '扩张',
      contraction: '收缩',
      externalBalance: '外部平衡',
      surplus: '顺差',
      deficit: '逆差',
      distributionPressure: '分配压力',
      moderate: '温和',
      elevated: '偏高',
    },
    flows: {
      governmentSpending: '政府支出',
      taxes: '税收',
      bankCredit: '银行信用',
      importPayment: '进口支付',
      exportIncome: '出口收入',
      government: '政府',
      privateSector: '私人部门',
      banks: '银行',
      householdsFirms: '家庭/企业',
      domestic: '本国',
      foreignSector: '外国部门',
    },
    balanceSheet: {
      government: '政府',
      privateSector: '私人部门',
      banks: '银行',
      foreignSector: '外国部门',
      publicAssets: '公共资产 / 征税权',
      governmentBonds: '国债',
      loanAssetsReserves: '贷款 / 准备金',
      depositLiabilitiesCapital: '存款负债 / 资本',
      claimsOnDomestic: '对本国债权',
      exportIncome: '本国出口收入',
    },
    comparison: {
      currentPolicy: '当前政策',
      includeCurrent: '纳入当前滑杆政策',
      selectTitle: '选择对比方案',
      selectMeta: '点击开关不同政策',
      trajectoryTitle: '增长路径对比',
      trajectoryMeta: '名义 GDP',
      stressTitle: '宏观压力对比',
      stressMeta: '通胀 / 失业',
      resultTitle: '期末结果',
      resultMeta: '同一周期横截面',
      policyTitle: '政策旋钮矩阵',
      policyMeta: '输入差异',
      caseName: '方案',
      gdpChange: 'GDP 增幅',
      peakInflation: '峰值通胀',
      avgUnemployment: '平均失业',
      terminalDeficit: '期末赤字',
      terminalPrivateNfa: '期末私人 NFA',
      currentAccount: '经常账户',
      inequality: '不平等',
    },
    policyScore: {
      title: '政策目标评分卡',
      meta: '就业 / 价格 / 资源 / 外部 / 分配 / 金融',
      overall: '综合',
      employment: '就业',
      priceStability: '价格稳定',
      realResources: '真实资源',
      externalBalance: '外部平衡',
      distribution: '分配',
      financialStability: '金融稳定',
    },
    socialActors: {
      income: '收入来源',
      outflow: '支出/流出',
      balance: '资产负债变化',
      policy: '政策影响',
      risk: '风险暴露',
      workers: '工人家庭',
      assetHouseholds: '高资产家庭',
      firms: '企业部门',
      banks: '银行部门',
      state: '政府/央行',
      foreign: '外国部门',
      platform: '平台/自动化资本',
      wages: '工资收入',
      consumption: '消费需求',
      interestIncome: '利息收入',
      assetPrice: '资产价格',
      sales: '销售收入',
      creditCreation: '信用创造',
      taxRecovery: '税收回收',
      importReceipts: '进口收入',
      platformRents: '平台租金',
      deposits: '存款缓冲',
      loans: '贷款存量',
      reserves: '准备金',
      debt: '政府债务',
      fiscalInjection: '财政净注入',
      externalLeakage: '外部泄漏',
      wagePressure: '工资份额',
      demandSupport: '需求支撑',
      purchasingPower: '购买力',
    },
  },
  en: {
    appTitle: 'MMT Economy Lab',
    appSubtitle: 'Fiscal policy, credit, resources, external limits',
    language: 'Language',
    run: 'Run',
    pause: 'Pause',
    step: 'Step',
    reset: 'Reset',
    shareExperiment: 'Share',
    copied: 'Copied',
    linkReady: 'Link ready',
    scenario: 'Scenarios',
    policyKnobs: 'Policy Knobs',
    customExperiment: 'Custom experiment',
    period: 'Period',
    window: 'Window',
    langNames: { zh: '中文', en: 'English' },
    tabs: {
      overview: 'Overview',
      balances: 'Balances',
      credit: 'Bank Credit',
      resources: 'Real Resources',
      society: 'Modern Society',
      compare: 'Policy Compare',
    },
    scenarios: {
      'sovereign-stabilizer': ['Sovereign Stabilizer', 'Fiscal + job buffer'],
      'austerity-gap': ['Austerity Demand Gap', 'Low deficit + high unemployment'],
      'resource-limit': ['Real Resource Limit', 'Deficit expansion + supply bottleneck'],
      'private-credit-cycle': ['Private Credit Cycle', 'Bank expansion + asset prices'],
      'external-constraint': ['External Constraint', 'Import dependence + FX pass-through'],
      'automation-platform': ['Automation Platform Economy', 'High output + distribution pressure'],
    },
    scenarioHelp: {
      'sovereign-stabilizer': 'Shows how fiscal spending and a job buffer can stabilize income, demand and private net financial assets in a sovereign-currency economy.',
      'austerity-gap': 'Shows how fiscal contraction can weaken income, employment and output through a demand gap.',
      'resource-limit': 'Shows why deficit expansion can turn into price pressure when capacity, energy or supply bottlenecks bind.',
      'private-credit-cycle': 'Highlights how bank credit creates deposits, lifts investment and asset prices, and can build fragility.',
      'external-constraint': 'Shows how import dependence can create current-account, exchange-rate and import-price pressure.',
      'automation-platform': 'Shows how automation and platform concentration can raise capacity and asset prices while increasing distribution pressure.',
    },
    policies: {
      governmentSpending: 'Government spending',
      taxRate: 'Tax rate',
      jobGuarantee: 'Job guarantee',
      interestRate: 'Policy rate',
      creditImpulse: 'Bank credit impulse',
      productivity: 'Productivity',
      importShare: 'Import dependence',
      energyCost: 'Energy cost',
      automation: 'Automation concentration',
      exportDemand: 'Export demand',
      transferProgressivity: 'Transfer progressivity',
    },
    policyHelp: {
      governmentSpending: 'Baseline public purchases, services, subsidies and transfers. Raising it adds private income and deficits, but can lift inflation near capacity.',
      taxRate: 'The rate at which government withdraws purchasing power from the private sector. Higher taxes reduce disposable income and demand while narrowing deficits.',
      jobGuarantee: 'How strongly the public sector absorbs unemployed labor. It converts an unemployment buffer into an employment buffer and stabilizes income floors.',
      interestRate: 'The central-bank policy rate. Higher rates restrain private credit and asset prices, but also raise government interest income to bond holders.',
      creditImpulse: 'Commercial-bank appetite for net new credit. Positive values mean credit expansion; negative values mean deleveraging and deposit destruction.',
      productivity: 'Real output produced per unit of resources. Higher productivity expands capacity and lowers inflation pressure.',
      importShare: 'The share of domestic demand that leaks into imports. Higher values weaken fiscal multipliers and strengthen external constraints.',
      energyCost: 'Cost pressure from energy and basic inputs. Rising costs lower effective capacity and push cost inflation.',
      automation: 'Concentration of automation, platforms and capital-intensive production. It can raise capacity and asset prices while lowering wage share.',
      exportDemand: 'Baseline foreign demand for domestic output. Raising it supports income and the current account in an open economy.',
      transferProgressivity: 'Progressivity of transfers and redistribution. Raising it improves low-income cash flow and distribution while increasing public outlays.',
    },
    metrics: {
      nominalGdp: 'Nominal GDP',
      capacityUse: 'Capacity use',
      inflation: 'Inflation',
      priceIndex: 'Price index',
      unemployment: 'Unemployment',
      wageShare: 'Wage share',
      privateNfa: 'Private net financial assets',
      fiscalDeficit: 'Fiscal deficit',
    },
    metricHelp: {
      nominalGdp: 'Total output measured at current prices. It moves with both real output and the price index.',
      inflation: 'The rate of price-index change. Demand beyond real resources, energy costs and import pass-through can all push it up.',
      unemployment: 'Labor not absorbed by the private sector or the job guarantee. It reflects weak demand and low capacity use.',
      privateNfa: 'Private-sector net financial assets. In an MMT lens, government deficits generally add net financial assets to the non-government sector.',
    },
    panels: {
      macroPath: ['Macro Path', 'GDP / inflation / unemployment'],
      currentFlows: ['Current Flows', 'Main transactions'],
      mmtIdentity: ['MMT Identity', 'Three-sector balances'],
      sectorSeries: ['Sector Balance Series', 'Government + private + foreign = 0'],
      currentBalances: ['Current Balances', 'Surplus is positive'],
      balanceSheet: ['Balance Sheet Snapshot', 'Stocks'],
      creditDeposits: ['Bank Credit and Deposits', 'Loans create deposits; repayment destroys deposits'],
      creditImpulse: ['Credit Impulse', 'Current net addition'],
      creditAssets: ['Credit and Asset Prices', 'Financial cycle'],
      realOutput: ['Real Output and Capacity', 'Fiscal capacity is constrained by real resources'],
      constraints: ['Constraint Gauges', 'Pressure index'],
      external: ['External Sector', 'Trade and exchange rate'],
      distribution: ['Distribution, Assets and Labor', 'Modern economy layer'],
      socialStructure: ['Social Structure', 'Current indicators'],
      modernConstraints: ['Modern Constraints', 'Credit, platforms, external sector'],
      socialActors: ['Social Actor Map', 'Income, balance sheets, risks'],
    },
    panelHelp: {
      macroPath: 'Places nominal GDP, inflation and unemployment together so you can see the fiscal-credit-resource interaction.',
      currentFlows: 'Shows the current core money flows: spending, taxes, bank credit, imports and exports.',
      mmtIdentity: 'Government, private-sector and foreign-sector balances must sum to zero. This is the accounting closure behind sectoral balances.',
      sectorSeries: 'Shows how government deficits map into private-sector and foreign-sector surpluses over time.',
      currentBalances: 'Positive values mean a sector receives a net financial inflow this period; negative values mean an outflow.',
      balanceSheet: 'A compact stock view of bonds, deposits, loans, reserves and net financial assets.',
      creditDeposits: 'Bank loans create deposits and loan repayment destroys deposits. This panel tracks the credit cycle behind demand.',
      creditImpulse: 'Current net credit creation is the banking system’s incremental push to demand and asset markets.',
      creditAssets: 'Shows the feedback between credit expansion and asset prices.',
      realOutput: 'Compares real output with capacity. Fiscal expansion raises real output only when resources can still be mobilized.',
      constraints: 'Condenses capacity, inflation, import and unemployment pressures into quick constraint gauges.',
      external: 'Tracks imports, exports, the current account and exchange-rate index in an open economy.',
      distribution: 'Tracks asset prices, inequality and wage share to show whether growth and distribution move together.',
      socialStructure: 'Current snapshots of the distribution structure.',
      modernConstraints: 'Turns fiscal space, credit cycle, external balance and distribution pressure into state labels.',
      socialActors: 'Breaks macro variables into workers, asset-rich households, firms, banks, the state, the foreign sector and platform capital so policy transmission is visible by actor.',
    },
    chart: {
      government: 'Government',
      privateSector: 'Private sector',
      foreignSector: 'Foreign sector',
      governmentBalance: 'Government balance',
      privateBalance: 'Private-sector balance',
      foreignBalance: 'Foreign-sector balance',
      balance: 'Balance',
      bankLoans: 'Bank loans',
      householdDeposits: 'Household deposits',
      firmDeposits: 'Firm deposits',
      bankReserves: 'Bank reserves',
      netCreditCreation: 'Net credit creation',
      bankLoansStock: 'Bank loan stock',
      reserves: 'Reserves',
      assetIndex: 'Asset price index',
      capacity: 'Capacity',
      realOutput: 'Real output',
      capacityPressure: 'Capacity pressure',
      inflationPressure: 'Inflation pressure',
      importGap: 'Import gap',
      unemploymentBuffer: 'Unemployment buffer',
      exports: 'Exports',
      imports: 'Imports',
      currentAccount: 'Current account',
      exchangeRate: 'Exchange-rate index',
      inequality: 'Inequality index',
      residual: 'Residual',
      deposits: 'Deposits',
      loans: 'Loans',
    },
    status: {
      fiscalSpace: 'Fiscal space',
      resourceRoom: 'Real resources still available',
      supplyLimit: 'Near supply limit',
      creditCycle: 'Credit cycle',
      expansion: 'Expansion',
      contraction: 'Contraction',
      externalBalance: 'External balance',
      surplus: 'Surplus',
      deficit: 'Deficit',
      distributionPressure: 'Distribution pressure',
      moderate: 'Moderate',
      elevated: 'Elevated',
    },
    flows: {
      governmentSpending: 'Government spending',
      taxes: 'Taxes',
      bankCredit: 'Bank credit',
      importPayment: 'Import payment',
      exportIncome: 'Export income',
      government: 'Government',
      privateSector: 'Private sector',
      banks: 'Banks',
      householdsFirms: 'Households/firms',
      domestic: 'Domestic',
      foreignSector: 'Foreign sector',
    },
    balanceSheet: {
      government: 'Government',
      privateSector: 'Private sector',
      banks: 'Banks',
      foreignSector: 'Foreign sector',
      publicAssets: 'Public assets / taxing authority',
      governmentBonds: 'Government bonds',
      loanAssetsReserves: 'Loans / reserves',
      depositLiabilitiesCapital: 'Deposit liabilities / capital',
      claimsOnDomestic: 'Claims on domestic sector',
      exportIncome: 'Domestic export income',
    },
    comparison: {
      currentPolicy: 'Current policy',
      includeCurrent: 'Include current slider policy',
      selectTitle: 'Choose Comparison Cases',
      selectMeta: 'Toggle policies on or off',
      trajectoryTitle: 'Growth Path Comparison',
      trajectoryMeta: 'Nominal GDP',
      stressTitle: 'Macro Stress Comparison',
      stressMeta: 'Inflation / unemployment',
      resultTitle: 'Terminal Outcomes',
      resultMeta: 'Same-period cross section',
      policyTitle: 'Policy Knob Matrix',
      policyMeta: 'Input differences',
      caseName: 'Case',
      gdpChange: 'GDP growth',
      peakInflation: 'Peak inflation',
      avgUnemployment: 'Avg unemployment',
      terminalDeficit: 'Terminal deficit',
      terminalPrivateNfa: 'Terminal private NFA',
      currentAccount: 'Current account',
      inequality: 'Inequality',
    },
    policyScore: {
      title: 'Policy Goal Scorecard',
      meta: 'Jobs / prices / resources / external / distribution / finance',
      overall: 'Overall',
      employment: 'Employment',
      priceStability: 'Price stability',
      realResources: 'Real resources',
      externalBalance: 'External balance',
      distribution: 'Distribution',
      financialStability: 'Financial stability',
    },
    socialActors: {
      income: 'Income source',
      outflow: 'Spending/outflow',
      balance: 'Balance-sheet change',
      policy: 'Policy impact',
      risk: 'Risk exposure',
      workers: 'Worker households',
      assetHouseholds: 'Asset-rich households',
      firms: 'Firms',
      banks: 'Banking sector',
      state: 'Government/central bank',
      foreign: 'Foreign sector',
      platform: 'Platform/automation capital',
      wages: 'Wage income',
      consumption: 'Consumption demand',
      interestIncome: 'Interest income',
      assetPrice: 'Asset prices',
      sales: 'Sales revenue',
      creditCreation: 'Credit creation',
      taxRecovery: 'Tax recovery',
      importReceipts: 'Import receipts',
      platformRents: 'Platform rents',
      deposits: 'Deposit buffer',
      loans: 'Loan stock',
      reserves: 'Reserves',
      debt: 'Government debt',
      fiscalInjection: 'Fiscal net injection',
      externalLeakage: 'External leakage',
      wagePressure: 'Wage share',
      demandSupport: 'Demand support',
      purchasingPower: 'Purchasing power',
    },
  },
} as const

type Copy = (typeof copy)[Language]

function App() {
  const [initialState] = useState(readInitialAppState)
  const [policy, setPolicy] = useState<Policy>(initialState.policy)
  const [activeScenario, setActiveScenario] = useState(initialState.activeScenario)
  const [activeTab, setActiveTab] = useState<TabId>(initialState.activeTab)
  const [language, setLanguage] = useState<Language>(initialState.language)
  const [cursor, setCursor] = useState(initialState.cursor)
  const [horizon, setHorizon] = useState(INITIAL_HORIZON)
  const [running, setRunning] = useState(false)
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle')
  const [tooltip, setTooltip] = useState<TooltipState>(null)
  const [comparisonScenarioIds, setComparisonScenarioIds] = useState<string[]>([
    'sovereign-stabilizer',
    'austerity-gap',
    'resource-limit',
  ])
  const [includeCurrentComparison, setIncludeCurrentComparison] = useState(true)

  const ui = copy[language]
  const series = useMemo(() => runSimulation(policy, horizon), [policy, horizon])
  const boundedCursor = Math.min(cursor, series.length - 1)
  const current = series[boundedCursor]
  const visibleSeries = series.slice(0, boundedCursor + 1)
  const activeScenarioCopy =
    ui.scenarios[activeScenario as keyof typeof ui.scenarios] ?? [ui.customExperiment, '']

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      setCursor((value) => {
        const next = value + 1
        setHorizon((currentHorizon) =>
          next >= currentHorizon - HORIZON_EXTENSION_THRESHOLD
            ? currentHorizon + HORIZON_EXTENSION
            : currentHorizon,
        )
        return next
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (!tooltip) return
    const clearTooltip = () => setTooltip(null)
    window.addEventListener('scroll', clearTooltip, true)
    window.addEventListener('resize', clearTooltip)
    return () => {
      window.removeEventListener('scroll', clearTooltip, true)
      window.removeEventListener('resize', clearTooltip)
    }
  }, [tooltip])

  const updatePolicy = (key: keyof Policy, value: number) => {
    setPolicy((previous) => ({ ...previous, [key]: value }))
    setActiveScenario('custom')
  }

  const applyScenario = (scenarioId: string) => {
    const scenario = scenarios.find((item) => item.id === scenarioId)
    if (!scenario) return
    setPolicy(scenario.policy)
    setActiveScenario(scenario.id)
    setHorizon(INITIAL_HORIZON)
    setCursor(24)
  }

  const reset = () => {
    const scenario = scenarios.find((item) => item.id === activeScenario) ?? scenarios[0]
    setPolicy(scenario.policy)
    setHorizon(INITIAL_HORIZON)
    setCursor(24)
    setRunning(false)
  }

  const showTooltip = (text: string, x: number, y: number) => {
    setTooltip({ text, x, y })
  }

  const hideTooltip = () => {
    setTooltip(null)
  }

  const stepForward = () => {
    setCursor((value) => {
      const next = value + 1
      setHorizon((currentHorizon) =>
        next >= currentHorizon - HORIZON_EXTENSION_THRESHOLD
          ? currentHorizon + HORIZON_EXTENSION
          : currentHorizon,
      )
      return next
    })
  }

  useEffect(() => {
    setShareStatus('idle')
  }, [policy, activeScenario, activeTab, language, boundedCursor])

  const shareExperiment = async () => {
    const shareUrl = buildShareUrl(window.location.href, {
      policy,
      activeScenario,
      activeTab,
      language,
      cursor: boundedCursor,
    })
    window.history.replaceState(null, '', shareUrl)
    setShareStatus('ready')
    const copied = await copyText(shareUrl)
    setShareStatus(copied ? 'copied' : 'ready')
  }

  const toggleComparisonScenario = (scenarioId: string) => {
    setComparisonScenarioIds((selected) =>
      selected.includes(scenarioId)
        ? selected.filter((id) => id !== scenarioId)
        : [...selected, scenarioId],
    )
  }

  return (
    <TooltipContext.Provider value={{ show: showTooltip, hide: hideTooltip }}>
      <div className="app-shell">
        <aside className="control-rail">
          <div className="brand-block">
            <div className="brand-mark">
              <Banknote size={24} />
            </div>
            <div>
              <h1>{ui.appTitle}</h1>
              <p>{ui.appSubtitle}</p>
            </div>
          </div>

        <div className="transport">
          <IconButton
            icon={running ? Pause : Play}
            label={running ? ui.pause : ui.run}
            primary
            onClick={() => setRunning((value) => !value)}
          />
          <IconButton
            icon={StepForward}
            label={ui.step}
            onClick={stepForward}
          />
          <IconButton icon={RefreshCcw} label={ui.reset} onClick={reset} />
          <IconButton
            icon={Share2}
            label={
              shareStatus === 'copied'
                ? ui.copied
                : shareStatus === 'ready'
                  ? ui.linkReady
                  : ui.shareExperiment
            }
            onClick={shareExperiment}
          />
        </div>

        <section className="language-section">
          <div className="rail-heading">
            <Globe2 size={16} />
            <span>{ui.language}</span>
          </div>
          <div className="language-switch" role="group" aria-label={ui.language}>
            {(['zh', 'en'] as const).map((option) => (
              <button
                type="button"
                className={language === option ? 'active' : ''}
                key={option}
                onClick={() => setLanguage(option)}
              >
                {ui.langNames[option]}
              </button>
            ))}
          </div>
        </section>

        <section className="scenario-section">
          <div className="rail-heading">
            <Settings2 size={16} />
            <span>{ui.scenario}</span>
          </div>
          <div className="scenario-list">
            {scenarios.map((scenario) => (
              <button
                type="button"
                className={`scenario-button ${activeScenario === scenario.id ? 'active' : ''}`}
                key={scenario.id}
                onClick={() => applyScenario(scenario.id)}
              >
                <span>
                  {ui.scenarios[scenario.id as keyof typeof ui.scenarios][0]}
                  <HoverInfo text={ui.scenarioHelp[scenario.id as keyof typeof ui.scenarioHelp]} />
                </span>
                <small>{ui.scenarios[scenario.id as keyof typeof ui.scenarios][1]}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="slider-section">
          <div className="rail-heading">
            <CircleGauge size={16} />
            <span>{ui.policyKnobs}</span>
          </div>
          <PolicySlider
            label={ui.policies.governmentSpending}
            help={ui.policyHelp.governmentSpending}
            value={policy.governmentSpending}
            min={70}
            max={240}
            step={1}
            suffix="B"
            onChange={(value) => updatePolicy('governmentSpending', value)}
          />
          <PolicySlider
            label={ui.policies.taxRate}
            help={ui.policyHelp.taxRate}
            value={policy.taxRate}
            min={8}
            max={45}
            step={1}
            suffix="%"
            onChange={(value) => updatePolicy('taxRate', value)}
          />
          <PolicySlider
            label={ui.policies.jobGuarantee}
            help={ui.policyHelp.jobGuarantee}
            value={policy.jobGuarantee}
            min={0}
            max={80}
            step={1}
            suffix="%"
            onChange={(value) => updatePolicy('jobGuarantee', value)}
          />
          <PolicySlider
            label={ui.policies.interestRate}
            help={ui.policyHelp.interestRate}
            value={policy.interestRate}
            min={0}
            max={12}
            step={0.25}
            suffix="%"
            onChange={(value) => updatePolicy('interestRate', value)}
          />
          <PolicySlider
            label={ui.policies.creditImpulse}
            help={ui.policyHelp.creditImpulse}
            value={policy.creditImpulse}
            min={-8}
            max={12}
            step={0.5}
            suffix=""
            onChange={(value) => updatePolicy('creditImpulse', value)}
          />
          <PolicySlider
            label={ui.policies.productivity}
            help={ui.policyHelp.productivity}
            value={policy.productivity}
            min={70}
            max={140}
            step={1}
            suffix=""
            onChange={(value) => updatePolicy('productivity', value)}
          />
          <PolicySlider
            label={ui.policies.importShare}
            help={ui.policyHelp.importShare}
            value={policy.importShare}
            min={5}
            max={45}
            step={1}
            suffix="%"
            onChange={(value) => updatePolicy('importShare', value)}
          />
          <PolicySlider
            label={ui.policies.energyCost}
            help={ui.policyHelp.energyCost}
            value={policy.energyCost}
            min={0}
            max={90}
            step={1}
            suffix=""
            onChange={(value) => updatePolicy('energyCost', value)}
          />
          <PolicySlider
            label={ui.policies.automation}
            help={ui.policyHelp.automation}
            value={policy.automation}
            min={0}
            max={100}
            step={1}
            suffix=""
            onChange={(value) => updatePolicy('automation', value)}
          />
          <PolicySlider
            label={ui.policies.exportDemand}
            help={ui.policyHelp.exportDemand}
            value={policy.exportDemand}
            min={50}
            max={220}
            step={1}
            suffix="B"
            onChange={(value) => updatePolicy('exportDemand', value)}
          />
          <PolicySlider
            label={ui.policies.transferProgressivity}
            help={ui.policyHelp.transferProgressivity}
            value={policy.transferProgressivity}
            min={0}
            max={80}
            step={1}
            suffix=""
            onChange={(value) => updatePolicy('transferProgressivity', value)}
          />
        </section>
      </aside>

      <main className="workspace">
        <header className="top-strip">
          <div>
            <div className="eyebrow">
              {ui.period} {current.period} / {ui.window} {horizon}
            </div>
            <h2>{activeScenarioCopy[0]}</h2>
          </div>
          <div className="tabbar" role="tablist">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  type="button"
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <IconComponent size={16} />
                  <span>{ui.tabs[tab.id]}</span>
                </button>
              )
            })}
          </div>
        </header>

        <section className="kpi-grid">
          <MetricCard
            icon={TrendingUp}
            label={ui.metrics.nominalGdp}
            help={ui.metricHelp.nominalGdp}
            value={formatMoney(current.nominalGdp)}
            detail={`${ui.metrics.capacityUse} ${formatPercent(current.capacityUse)}`}
            tone="blue"
          />
          <MetricCard
            icon={ShieldAlert}
            label={ui.metrics.inflation}
            help={ui.metricHelp.inflation}
            value={formatPercent(current.inflation)}
            detail={`${ui.metrics.priceIndex} ${current.priceIndex.toFixed(1)}`}
            tone={current.inflation > 6 ? 'red' : 'amber'}
          />
          <MetricCard
            icon={Users}
            label={ui.metrics.unemployment}
            help={ui.metricHelp.unemployment}
            value={formatPercent(current.unemployment)}
            detail={`${ui.metrics.wageShare} ${formatPercent(current.wageShare * 100)}`}
            tone={current.unemployment > 8 ? 'red' : 'green'}
          />
          <MetricCard
            icon={WalletCards}
            label={ui.metrics.privateNfa}
            help={ui.metricHelp.privateNfa}
            value={formatMoney(current.privateNetFinancialAssets)}
            detail={`${ui.metrics.fiscalDeficit} ${formatMoney(current.fiscalDeficit)}`}
            tone="green"
          />
        </section>

        {activeTab === 'overview' && <Overview copy={ui} current={current} series={visibleSeries} />}
        {activeTab === 'balances' && <Balances copy={ui} current={current} series={visibleSeries} />}
        {activeTab === 'credit' && <Credit copy={ui} current={current} series={visibleSeries} />}
        {activeTab === 'resources' && <Resources copy={ui} current={current} series={visibleSeries} />}
        {activeTab === 'society' && <Society copy={ui} current={current} series={visibleSeries} policy={policy} />}
        {activeTab === 'compare' && (
          <Comparison
            copy={ui}
            currentPolicy={policy}
            horizon={horizon}
            cursor={boundedCursor}
            selectedScenarioIds={comparisonScenarioIds}
            includeCurrent={includeCurrentComparison}
            onToggleScenario={toggleComparisonScenario}
            onToggleCurrent={() => setIncludeCurrentComparison((value) => !value)}
          />
        )}
        </main>
      </div>
      <GlobalTooltip tooltip={tooltip} />
    </TooltipContext.Provider>
  )
}

function Overview({ copy, current, series }: { copy: Copy; current: EconomyPoint; series: EconomyPoint[] }) {
  return (
    <div className="view-grid">
      <section className="tool-panel wide">
        <PanelTitle icon={TrendingUp} title={copy.panels.macroPath[0]} meta={copy.panels.macroPath[1]} help={copy.panelHelp.macroPath} />
        <ChartFrame>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="nominalGdp" name={copy.metrics.nominalGdp} stroke={chartColors.blue} strokeWidth={2.4} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="inflation" name={copy.metrics.inflation} stroke={chartColors.red} strokeWidth={2.4} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="unemployment" name={copy.metrics.unemployment} stroke={chartColors.amber} strokeWidth={2.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      <section className="tool-panel">
        <PanelTitle icon={Banknote} title={copy.panels.currentFlows[0]} meta={copy.panels.currentFlows[1]} help={copy.panelHelp.currentFlows} />
        <FlowBoard copy={copy} current={current} />
      </section>

      <section className="tool-panel">
        <PanelTitle icon={Scale} title={copy.panels.mmtIdentity[0]} meta={copy.panels.mmtIdentity[1]} help={copy.panelHelp.mmtIdentity} />
        <IdentityStack copy={copy} current={current} />
      </section>
    </div>
  )
}

function Balances({ copy, current, series }: { copy: Copy; current: EconomyPoint; series: EconomyPoint[] }) {
  const sectorData = [
    { name: copy.chart.government, value: current.governmentBalance, color: current.governmentBalance >= 0 ? chartColors.green : chartColors.red },
    { name: copy.chart.privateSector, value: current.privateBalance, color: current.privateBalance >= 0 ? chartColors.green : chartColors.red },
    { name: copy.chart.foreignSector, value: current.foreignBalance, color: current.foreignBalance >= 0 ? chartColors.green : chartColors.red },
  ]

  return (
    <div className="view-grid">
      <section className="tool-panel wide">
        <PanelTitle icon={Scale} title={copy.panels.sectorSeries[0]} meta={copy.panels.sectorSeries[1]} help={copy.panelHelp.sectorSeries} />
        <ChartFrame>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine y={0} stroke="#64748b" />
              <Area type="monotone" dataKey="governmentBalance" name={copy.chart.governmentBalance} stroke={chartColors.red} fill="#fecaca" />
              <Area type="monotone" dataKey="privateBalance" name={copy.chart.privateBalance} stroke={chartColors.green} fill="#99f6e4" />
              <Area type="monotone" dataKey="foreignBalance" name={copy.chart.foreignBalance} stroke={chartColors.blue} fill="#bfdbfe" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      <section className="tool-panel">
        <PanelTitle icon={Building2} title={copy.panels.currentBalances[0]} meta={copy.panels.currentBalances[1]} help={copy.panelHelp.currentBalances} />
        <ChartFrame compact>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke="#64748b" />
              <Bar dataKey="value" name={copy.chart.balance}>
                {sectorData.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      <section className="tool-panel">
        <PanelTitle icon={WalletCards} title={copy.panels.balanceSheet[0]} meta={copy.panels.balanceSheet[1]} help={copy.panelHelp.balanceSheet} />
        <BalanceSheet copy={copy} current={current} />
      </section>
    </div>
  )
}

function Credit({ copy, current, series }: { copy: Copy; current: EconomyPoint; series: EconomyPoint[] }) {
  return (
    <div className="view-grid">
      <section className="tool-panel wide">
        <PanelTitle icon={Landmark} title={copy.panels.creditDeposits[0]} meta={copy.panels.creditDeposits[1]} help={copy.panelHelp.creditDeposits} />
        <ChartFrame>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="bankLoans" name={copy.chart.bankLoans} stroke={chartColors.blue} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="householdDeposits" name={copy.chart.householdDeposits} stroke={chartColors.green} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="firmDeposits" name={copy.chart.firmDeposits} stroke={chartColors.amber} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="bankReserves" name={copy.chart.bankReserves} stroke={chartColors.violet} strokeWidth={2.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      <section className="tool-panel">
        <PanelTitle icon={Banknote} title={copy.panels.creditImpulse[0]} meta={copy.panels.creditImpulse[1]} help={copy.panelHelp.creditImpulse} />
        <ValueStack
          items={[
            [copy.chart.netCreditCreation, formatMoney(current.creditCreation)],
            [copy.chart.bankLoansStock, formatMoney(current.bankLoans)],
            [copy.chart.reserves, formatMoney(current.bankReserves)],
            [copy.chart.assetIndex, current.assetIndex.toFixed(1)],
          ]}
        />
      </section>

      <section className="tool-panel">
        <PanelTitle icon={TrendingUp} title={copy.panels.creditAssets[0]} meta={copy.panels.creditAssets[1]} help={copy.panelHelp.creditAssets} />
        <ChartFrame compact>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="assetIndex" name={copy.chart.assetIndex} stroke={chartColors.violet} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="creditCreation" name={copy.chart.netCreditCreation} stroke={chartColors.blue} strokeWidth={2.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>
    </div>
  )
}

function Resources({ copy, current, series }: { copy: Copy; current: EconomyPoint; series: EconomyPoint[] }) {
  return (
    <div className="view-grid">
      <section className="tool-panel wide">
        <PanelTitle icon={Factory} title={copy.panels.realOutput[0]} meta={copy.panels.realOutput[1]} help={copy.panelHelp.realOutput} />
        <ChartFrame>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="capacity" name={copy.chart.capacity} stroke={chartColors.slate} fill="#cbd5e1" />
              <Area type="monotone" dataKey="realOutput" name={copy.chart.realOutput} stroke={chartColors.green} fill="#99f6e4" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      <section className="tool-panel">
        <PanelTitle icon={ShieldAlert} title={copy.panels.constraints[0]} meta={copy.panels.constraints[1]} help={copy.panelHelp.constraints} />
        <GaugeBar label={copy.chart.capacityPressure} value={current.capacityUse} max={115} tone={current.capacityUse > 95 ? 'red' : 'green'} />
        <GaugeBar label={copy.chart.inflationPressure} value={current.inflation} max={16} tone={current.inflation > 6 ? 'red' : 'amber'} />
        <GaugeBar label={copy.chart.importGap} value={Math.max(0, -current.currentAccount)} max={260} tone={current.currentAccount < 0 ? 'amber' : 'green'} />
        <GaugeBar label={copy.chart.unemploymentBuffer} value={current.unemployment} max={28} tone={current.unemployment > 8 ? 'red' : 'green'} />
      </section>

      <section className="tool-panel">
        <PanelTitle icon={Globe2} title={copy.panels.external[0]} meta={copy.panels.external[1]} help={copy.panelHelp.external} />
        <ValueStack
          items={[
            [copy.chart.exports, formatMoney(current.exports)],
            [copy.chart.imports, formatMoney(current.imports)],
            [copy.chart.currentAccount, formatMoney(current.currentAccount)],
            [copy.chart.exchangeRate, current.exchangeRate.toFixed(2)],
          ]}
        />
      </section>
    </div>
  )
}

function Society({
  copy,
  current,
  series,
  policy,
}: {
  copy: Copy
  current: EconomyPoint
  series: EconomyPoint[]
  policy: Policy
}) {
  return (
    <div className="view-grid">
      <section className="tool-panel wide">
        <PanelTitle icon={Users} title={copy.panels.distribution[0]} meta={copy.panels.distribution[1]} help={copy.panelHelp.distribution} />
        <ChartFrame>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="assetIndex" name={copy.chart.assetIndex} stroke={chartColors.violet} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="inequality" name={copy.chart.inequality} stroke={chartColors.red} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="wageShare" name={copy.metrics.wageShare} stroke={chartColors.green} strokeWidth={2.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      <section className="tool-panel">
        <PanelTitle icon={Building2} title={copy.panels.socialStructure[0]} meta={copy.panels.socialStructure[1]} help={copy.panelHelp.socialStructure} />
        <ValueStack
          items={[
            [copy.chart.inequality, current.inequality.toFixed(2)],
            [copy.metrics.wageShare, formatPercent(current.wageShare * 100)],
            [copy.chart.assetIndex, current.assetIndex.toFixed(1)],
            [copy.chart.householdDeposits, formatMoney(current.householdDeposits)],
          ]}
        />
      </section>

      <section className="tool-panel">
        <PanelTitle icon={Globe2} title={copy.panels.modernConstraints[0]} meta={copy.panels.modernConstraints[1]} help={copy.panelHelp.modernConstraints} />
        <div className="constraint-list">
          <StatusLine label={copy.status.fiscalSpace} value={current.capacityUse < 92 ? copy.status.resourceRoom : copy.status.supplyLimit} tone={current.capacityUse < 92 ? 'green' : 'red'} />
          <StatusLine label={copy.status.creditCycle} value={current.creditCreation > 0 ? copy.status.expansion : copy.status.contraction} tone={current.creditCreation > 0 ? 'blue' : 'amber'} />
          <StatusLine label={copy.status.externalBalance} value={current.currentAccount >= 0 ? copy.status.surplus : copy.status.deficit} tone={current.currentAccount >= 0 ? 'green' : 'amber'} />
          <StatusLine label={copy.status.distributionPressure} value={current.inequality < 0.48 ? copy.status.moderate : copy.status.elevated} tone={current.inequality < 0.48 ? 'green' : 'red'} />
        </div>
      </section>

      <section className="tool-panel full">
        <PanelTitle icon={Users} title={copy.panels.socialActors[0]} meta={copy.panels.socialActors[1]} help={copy.panelHelp.socialActors} />
        <SocialActorMap copy={copy} current={current} policy={policy} />
      </section>
    </div>
  )
}

function SocialActorMap({ copy, current, policy }: { copy: Copy; current: EconomyPoint; policy: Policy }) {
  const actors = deriveSocialActors(current, policy, copy)

  return (
    <div className="social-actor-grid">
      {actors.map((actor) => (
        <SocialActorCard key={actor.id} actor={actor} copy={copy} />
      ))}
    </div>
  )
}

function SocialActorCard({
  actor,
  copy,
}: {
  actor: SocialActorView
  copy: Copy
}) {
  const IconComponent = socialActorIcons[actor.id]

  return (
    <article className={`social-actor-card ${actor.tone}`}>
      <header>
        <span>
          <IconComponent size={17} />
        </span>
        <strong>{copy.socialActors[actor.id]}</strong>
      </header>
      <div>
        {actor.rows.map(([label, value]) => (
          <p key={label}>
            <span>{label}</span>
            <em>{value}</em>
          </p>
        ))}
      </div>
    </article>
  )
}

function Comparison({
  copy,
  currentPolicy,
  horizon,
  cursor,
  selectedScenarioIds,
  includeCurrent,
  onToggleScenario,
  onToggleCurrent,
}: {
  copy: Copy
  currentPolicy: Policy
  horizon: number
  cursor: number
  selectedScenarioIds: string[]
  includeCurrent: boolean
  onToggleScenario: (scenarioId: string) => void
  onToggleCurrent: () => void
}) {
  const comparisonCursor = Math.min(cursor, horizon)
  const caseInputs = useMemo(() => {
    const scenarioCases = scenarios
      .filter((scenario) => selectedScenarioIds.includes(scenario.id))
      .map((scenario) => {
        const label = copy.scenarios[scenario.id as keyof typeof copy.scenarios][0]
        return { id: scenario.id, label, policy: scenario.policy }
      })

    return includeCurrent
      ? [{ id: 'current-policy', label: copy.comparison.currentPolicy, policy: currentPolicy }, ...scenarioCases]
      : scenarioCases
  }, [copy, currentPolicy, includeCurrent, selectedScenarioIds])

  const cases = useMemo(
    () => buildComparisonCases(caseInputs, horizon, comparisonCursor, comparisonColors),
    [caseInputs, comparisonCursor, horizon],
  )
  const gdpData = useMemo(() => buildComparisonSeries(cases, comparisonCursor, 'gdp'), [cases, comparisonCursor])
  const stressData = useMemo(() => buildComparisonSeries(cases, comparisonCursor, 'stress'), [cases, comparisonCursor])

  const policyRows: Array<[keyof Policy, string, string]> = [
    ['governmentSpending', copy.policies.governmentSpending, 'B'],
    ['taxRate', copy.policies.taxRate, '%'],
    ['jobGuarantee', copy.policies.jobGuarantee, '%'],
    ['interestRate', copy.policies.interestRate, '%'],
    ['creditImpulse', copy.policies.creditImpulse, ''],
    ['productivity', copy.policies.productivity, ''],
    ['importShare', copy.policies.importShare, '%'],
    ['energyCost', copy.policies.energyCost, ''],
    ['automation', copy.policies.automation, ''],
    ['exportDemand', copy.policies.exportDemand, 'B'],
    ['transferProgressivity', copy.policies.transferProgressivity, ''],
  ]

  return (
    <div className="comparison-grid">
      <section className="tool-panel comparison-picker">
        <PanelTitle
          icon={GitCompareArrows}
          title={copy.comparison.selectTitle}
          meta={copy.comparison.selectMeta}
          help={copy.panelHelp.macroPath}
        />
        <button
          type="button"
          className={`compare-toggle ${includeCurrent ? 'active' : ''}`}
          onClick={onToggleCurrent}
        >
          <span className="compare-dot" style={{ background: comparisonColors[0] }} />
          <strong>{copy.comparison.includeCurrent}</strong>
        </button>
        <div className="compare-toggle-grid">
          {scenarios.map((scenario) => {
            const selected = selectedScenarioIds.includes(scenario.id)
            return (
              <button
                type="button"
                className={`compare-toggle ${selected ? 'active' : ''}`}
                key={scenario.id}
                onClick={() => onToggleScenario(scenario.id)}
              >
                <span className="compare-dot" />
                <strong>{copy.scenarios[scenario.id as keyof typeof copy.scenarios][0]}</strong>
                <small>{copy.scenarios[scenario.id as keyof typeof copy.scenarios][1]}</small>
              </button>
            )
          })}
        </div>
      </section>

      <section className="tool-panel comparison-chart">
        <PanelTitle
          icon={TrendingUp}
          title={copy.comparison.trajectoryTitle}
          meta={copy.comparison.trajectoryMeta}
          help={copy.metricHelp.nominalGdp}
        />
        <ChartFrame compact>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={gdpData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {cases.map((item) => (
                <Line
                  key={item.gdpKey}
                  type="monotone"
                  dataKey={item.gdpKey}
                  name={item.label}
                  stroke={item.color}
                  strokeWidth={2.4}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      <section className="tool-panel comparison-chart">
        <PanelTitle
          icon={ShieldAlert}
          title={copy.comparison.stressTitle}
          meta={copy.comparison.stressMeta}
          help={copy.panelHelp.constraints}
        />
        <ChartFrame compact>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {cases.map((item) => (
                <Line
                  key={item.inflationKey}
                  type="monotone"
                  dataKey={item.inflationKey}
                  name={`${item.label} ${copy.metrics.inflation}`}
                  stroke={item.color}
                  strokeWidth={2.2}
                  dot={false}
                />
              ))}
              {cases.map((item) => (
                <Line
                  key={item.unemploymentKey}
                  type="monotone"
                  dataKey={item.unemploymentKey}
                  name={`${item.label} ${copy.metrics.unemployment}`}
                  stroke={item.color}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      <section className="tool-panel comparison-score-panel">
        <PanelTitle
          icon={CircleGauge}
          title={copy.policyScore.title}
          meta={copy.policyScore.meta}
          help={copy.panelHelp.modernConstraints}
        />
        <PolicyScorecard cases={cases} copy={copy} />
      </section>

      <section className="tool-panel comparison-table-panel">
        <PanelTitle
          icon={Scale}
          title={copy.comparison.resultTitle}
          meta={copy.comparison.resultMeta}
          help={copy.panelHelp.currentBalances}
        />
        <div className="comparison-table-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{copy.comparison.caseName}</th>
                <th>{copy.comparison.gdpChange}</th>
                <th>{copy.comparison.peakInflation}</th>
                <th>{copy.comparison.avgUnemployment}</th>
                <th>{copy.comparison.terminalDeficit}</th>
                <th>{copy.comparison.terminalPrivateNfa}</th>
                <th>{copy.comparison.currentAccount}</th>
                <th>{copy.comparison.inequality}</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="compare-name">
                      <i style={{ background: item.color }} />
                      {item.label}
                    </span>
                  </td>
                  <td>{formatPercent(item.gdpChange)}</td>
                  <td>{formatPercent(item.peakInflation)}</td>
                  <td>{formatPercent(item.avgUnemployment)}</td>
                  <td>{formatMoney(item.terminal.fiscalDeficit)}</td>
                  <td>{formatMoney(item.terminal.privateNetFinancialAssets)}</td>
                  <td>{formatMoney(item.terminal.currentAccount)}</td>
                  <td>{item.terminal.inequality.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tool-panel comparison-table-panel">
        <PanelTitle
          icon={CircleGauge}
          title={copy.comparison.policyTitle}
          meta={copy.comparison.policyMeta}
          help={copy.panelHelp.modernConstraints}
        />
        <div className="comparison-table-scroll">
          <table className="comparison-table policy-matrix">
            <thead>
              <tr>
                <th>{copy.comparison.caseName}</th>
                {policyRows.map(([key, label]) => (
                  <th key={key}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="compare-name">
                      <i style={{ background: item.color }} />
                      {item.label}
                    </span>
                  </td>
                  {policyRows.map(([key, , suffix]) => (
                    <td key={key}>
                      {item.policy[key]}
                      {suffix}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function PolicyScorecard({ cases, copy }: { cases: ComparisonCase[]; copy: Copy }) {
  return (
    <div className="scorecard-grid">
      {cases.map((item) => (
        <article className={`policy-score-card ${item.totalTone}`} key={item.id}>
          <header>
            <span className="compare-name">
              <i style={{ background: item.color }} />
              {item.label}
            </span>
            <strong>{item.totalScore}</strong>
          </header>
          <div className="score-total">
            <span>{copy.policyScore.overall}</span>
            <meter min={0} max={100} value={item.totalScore} />
          </div>
          <div className="score-list">
            {item.scores.map((score) => (
              <ScoreRow
                key={score.key}
                label={copy.policyScore[score.key as PolicyScoreKey]}
                score={score.score}
                tone={score.tone}
              />
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

function ScoreRow({ label, score, tone }: { label: string; score: number; tone: 'blue' | 'green' | 'amber' | 'red' }) {
  return (
    <div className={`score-row ${tone}`}>
      <span>{label}</span>
      <meter min={0} max={100} value={score} />
      <strong>{score}</strong>
    </div>
  )
}

function MetricCard({
  icon: IconComponent,
  label,
  value,
  detail,
  help,
  tone,
}: {
  icon: Icon
  label: string
  value: string
  detail: string
  help: string
  tone: 'blue' | 'green' | 'amber' | 'red'
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">
        <IconComponent size={18} />
      </div>
      <div>
        <span className="label-with-help">
          {label}
          <HoverInfo text={help} />
        </span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}

function PanelTitle({ icon: IconComponent, title, meta, help }: { icon: Icon; title: string; meta: string; help: string }) {
  return (
    <div className="panel-title">
      <div>
        <IconComponent size={18} />
        <h3>{title}</h3>
        <HoverInfo text={help} />
      </div>
      <span>{meta}</span>
    </div>
  )
}

function IconButton({
  icon: IconComponent,
  label,
  primary = false,
  onClick,
}: {
  icon: Icon
  label: string
  primary?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={`icon-button ${primary ? 'primary' : ''}`} onClick={onClick}>
      <IconComponent size={16} />
      <span>{label}</span>
    </button>
  )
}

function PolicySlider({
  label,
  help,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string
  help: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  onChange: (value: number) => void
}) {
  return (
    <label className="policy-slider">
      <span>
        <b className="label-with-help">
          {label}
          <HoverInfo text={help} />
        </b>
        <em>
          {value}
          {suffix}
        </em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function HoverInfo({ text }: { text: string }) {
  const tooltip = useContext(TooltipContext)

  const showAtElement = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    tooltip?.show(text, rect.left + rect.width / 2, rect.top)
  }

  const handleMouseMove = (event: ReactMouseEvent<HTMLElement>) => {
    tooltip?.show(text, event.clientX, event.clientY)
  }

  return (
    <span
      className="hover-info"
      tabIndex={0}
      aria-label={text}
      onMouseEnter={handleMouseMove}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => tooltip?.hide()}
      onFocus={(event) => showAtElement(event.currentTarget)}
      onBlur={() => tooltip?.hide()}
    >
      <HelpCircle size={14} />
    </span>
  )
}

function GlobalTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null

  const viewportWidth = typeof window === 'undefined' ? TOOLTIP_WIDTH : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 720 : window.innerHeight
  const width = Math.min(TOOLTIP_WIDTH, viewportWidth - TOOLTIP_MARGIN * 2)
  const left = Math.min(
    Math.max(tooltip.x + TOOLTIP_OFFSET, TOOLTIP_MARGIN),
    viewportWidth - width - TOOLTIP_MARGIN,
  )
  const shouldLift = tooltip.y > viewportHeight * 0.68
  const top = shouldLift
    ? Math.max(TOOLTIP_MARGIN, tooltip.y - TOOLTIP_OFFSET)
    : Math.min(tooltip.y + TOOLTIP_OFFSET, viewportHeight - TOOLTIP_MARGIN)

  return (
    <div
      className={`global-tooltip ${shouldLift ? 'lifted' : ''}`}
      role="tooltip"
      style={{ left, top, width }}
    >
      {tooltip.text}
    </div>
  )
}

function ChartFrame({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return <div className={`chart-frame ${compact ? 'compact' : ''}`}>{children}</div>
}

function FlowBoard({ copy, current }: { copy: Copy; current: EconomyPoint }) {
  const flows = [
    [copy.flows.governmentSpending, copy.flows.government, copy.flows.privateSector, current.publicOutlays, 'blue'],
    [copy.flows.taxes, copy.flows.privateSector, copy.flows.government, current.taxRevenue, 'red'],
    [copy.flows.bankCredit, copy.flows.banks, copy.flows.householdsFirms, current.creditCreation, current.creditCreation >= 0 ? 'green' : 'amber'],
    [copy.flows.importPayment, copy.flows.domestic, copy.flows.foreignSector, current.imports, 'amber'],
    [copy.flows.exportIncome, copy.flows.foreignSector, copy.flows.domestic, current.exports, 'green'],
  ] as const

  return (
    <div className="flow-board">
      {flows.map(([label, from, to, value, tone]) => (
        <div className={`flow-row ${tone}`} key={label}>
          <span>{from}</span>
          <strong>{label}</strong>
          <span>{to}</span>
          <em>{formatMoney(value)}</em>
        </div>
      ))}
    </div>
  )
}

function IdentityStack({ copy, current }: { copy: Copy; current: EconomyPoint }) {
  return (
    <div className="identity-stack">
      <ValueStack
        items={[
          [copy.chart.governmentBalance, formatMoney(current.governmentBalance)],
          [copy.chart.privateBalance, formatMoney(current.privateBalance)],
          [copy.chart.foreignBalance, formatMoney(current.foreignBalance)],
          [copy.chart.residual, current.identityResidual.toFixed(4)],
        ]}
      />
      <div className="identity-equation">
        <span>GOV</span>
        <b>+</b>
        <span>PRIVATE</span>
        <b>+</b>
        <span>FOREIGN</span>
        <b>=</b>
        <span>0</span>
      </div>
    </div>
  )
}

function ValueStack({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="value-stack">
      {items.map(([label, value]) => (
        <div className="value-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function BalanceSheet({ copy, current }: { copy: Copy; current: EconomyPoint }) {
  const rows = [
    [copy.balanceSheet.government, copy.balanceSheet.publicAssets, `${copy.balanceSheet.governmentBonds} ${formatMoney(current.governmentDebt)}`, formatMoney(-current.governmentDebt)],
    [copy.balanceSheet.privateSector, `${copy.chart.deposits} ${formatMoney(current.householdDeposits + current.firmDeposits)}`, `${copy.chart.loans} ${formatMoney(current.bankLoans)}`, formatMoney(current.privateNetFinancialAssets)],
    [copy.balanceSheet.banks, `${copy.balanceSheet.loanAssetsReserves} ${formatMoney(current.bankLoans)} / ${formatMoney(current.bankReserves)}`, copy.balanceSheet.depositLiabilitiesCapital, formatMoney(current.bankReserves)],
    [copy.balanceSheet.foreignSector, `${copy.balanceSheet.claimsOnDomestic} ${formatMoney(Math.max(0, current.foreignBalance))}`, copy.balanceSheet.exportIncome, formatMoney(current.foreignBalance)],
  ]

  return (
    <div className="balance-table">
      {rows.map(([sector, assets, liabilities, net]) => (
        <div className="balance-row" key={sector}>
          <strong>{sector}</strong>
          <span>{assets}</span>
          <span>{liabilities}</span>
          <em>{net}</em>
        </div>
      ))}
    </div>
  )
}

function GaugeBar({
  label,
  value,
  max,
  tone,
}: {
  label: string
  value: number
  max: number
  tone: 'green' | 'amber' | 'red'
}) {
  const width = Math.min((Math.max(value, 0) / max) * 100, 100)
  return (
    <div className={`gauge-bar ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value.toFixed(1)}</strong>
      </div>
      <meter min={0} max={100} value={width} />
    </div>
  )
}

function StatusLine({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' | 'red' | 'blue' }) {
  return (
    <div className={`status-line ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

const tooltipStyle = {
  border: '1px solid #d8dee8',
  borderRadius: 8,
  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
}

export default App
