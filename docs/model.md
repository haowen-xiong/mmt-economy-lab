# Model Notes

MMT Economy Lab is intentionally small enough to inspect. The goal is not to forecast a country. The goal is to keep several macro mechanisms visible at the same time and make their tradeoffs easy to test.

## Core Identity

The model closes every period with the three-sector balance identity:

```text
government balance + private balance + foreign balance = 0
```

Where:

- `governmentBalance = taxRevenue - publicOutlays - interestIncome`
- `foreignBalance = imports - exports`
- `privateBalance = -governmentBalance - foreignBalance`

This is the accounting spine of the app. If the government runs a deficit and the foreign sector position is unchanged, the private sector receives a matching net financial surplus. If imports exceed exports, part of the government's deficit can leak into the foreign-sector surplus instead of becoming private domestic surplus.

## Period Loop

Each simulated period follows this rough sequence:

1. **Fiscal outlays** combine baseline government spending, job guarantee support, transfers, and interest income.
2. **Household income and consumption** respond to wages, fiscal flows, taxes, inequality, job guarantee support, credit, and accumulated private net financial assets.
3. **Bank credit** expands or contracts through the credit impulse, interest-rate drag, repayments, and asset-price feedback.
4. **Investment** responds to credit creation, productivity, automation, and energy costs.
5. **Imports and exports** translate domestic absorption and export demand into the external balance.
6. **Real output** is limited by real demand and productive capacity.
7. **Inflation and unemployment** respond to capacity use, energy costs, import pressure, wage pressure, credit impulse, productivity, and job guarantee strength.
8. **Balance sheets** update government debt, private net financial assets, bank loans, reserves, and deposits.
9. **Distribution and asset prices** update inequality, wage share, and the asset index.

The app makes this loop visible through charts, current-flow panels, balance sheets, social actor cards, and policy comparison scorecards.

## Policy Knobs

| Knob | What it represents | Main transmission path |
| --- | --- | --- |
| `governmentSpending` | Baseline public spending | Raises private income and demand; may increase inflation near capacity |
| `taxRate` | Tax withdrawal from private income | Reduces disposable income and demand; narrows fiscal deficits |
| `jobGuarantee` | Public employment buffer strength | Lowers unemployment and stabilizes consumption; raises public outlays |
| `interestRate` | Policy rate | Restrains credit and asset prices; raises government interest income |
| `creditImpulse` | Bank appetite for net new credit | Expands or contracts loans, deposits, demand, investment, and asset prices |
| `productivity` | Real output per unit of resources | Expands capacity and dampens inflation pressure |
| `importShare` | Domestic demand leakage to imports | Weakens domestic multiplier and increases external-sector pressure |
| `energyCost` | Cost pressure from basic inputs | Reduces effective capacity and raises cost inflation |
| `automation` | Platform and capital-intensive production concentration | Raises capacity and asset prices but can weaken wage share |
| `exportDemand` | Foreign demand for domestic output | Supports income and current account balance |
| `transferProgressivity` | Redistributive transfer strength | Reduces inequality and supports consumption; raises public outlays |

## Scorecard

The comparison scorecard is not an objective welfare function. It is a compact teaching device that summarizes six policy goals:

- Employment
- Price stability
- Real-resource balance
- External balance
- Distribution
- Financial stability

Scores are intentionally transparent and bounded from 0 to 100. They are useful for comparing mechanisms, not for ranking real-world policy packages.

## Social Actor Map

The social actor map translates aggregate variables into seven simplified groups:

- Worker households
- Asset-rich households
- Firms
- Banks
- Government / central bank
- Foreign sector
- Platform / automation capital

This view is designed to prevent a common macro-learning failure: seeing "GDP" or "deficit" as abstract totals without asking who receives income, who accumulates assets, who takes risk, and who faces price or employment pressure.

## Invariants and Tests

The test suite checks that:

- Every built-in scenario produces finite, positive core variables.
- The three-sector balance identity remains closed.
- Stronger job guarantee support reduces average unemployment in the baseline setting.
- Comparison cases, scorecards, and social actor outputs remain structurally valid.

Run:

```bash
npm run check
```

## Known Simplifications

The model does not include:

- Sector-specific production networks
- Full central-bank balance-sheet operations
- Endogenous political constraints
- Detailed wage bargaining
- International capital flows
- Calibrated empirical parameters

Those omissions are deliberate. The current version favors explainability and inspectability over realism.
