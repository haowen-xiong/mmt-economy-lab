# MMT Economy Lab

MMT Economy Lab is an interactive learning sandbox for exploring modern monetary theory and the structure of a contemporary monetary economy. It places sectoral balances, fiscal policy, bank credit, real resource constraints, the external sector, asset prices, inequality, and automation pressure in one visual interface.

The app defaults to English and includes a sidebar language switch for Chinese.

## Model Boundary

This is a teaching and reasoning tool, not a calibrated forecasting model. It is not investment advice, fiscal advice, or public policy advice. The amounts, ratios, and parameters are designed to make mechanisms visible: how sectoral balances close, how fiscal deficits affect private net financial assets, how bank lending creates deposits, and how real resource constraints can turn into inflation pressure.

The model is organized through an MMT lens, but it is intentionally simplified. It does not include full price formation, industrial structure, central-bank operating details, political constraints, or international capital flows. Use it to ask questions, compare mechanisms, and support learning. Do not directly extrapolate its outputs to any real country or market.

## Core Modules

- Government: spending, taxes, deficits, bonds, and job guarantee support.
- Private sector: household and firm income, consumption, investment, and net financial assets.
- Banking system: loans, deposits, reserves, credit expansion, and deleveraging.
- Real resources: capacity, real output, unemployment, and inflation pressure.
- External sector: imports, exports, current account, and exchange-rate index.
- Modern society layer: asset prices, wage share, inequality, automation concentration, and platform pressure.
- Policy comparison: compare scenarios and the current slider policy across growth, stress, and scoring metrics.

## Run Locally

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173/
```

## Validate

```bash
npm run build
npm run lint
npm run test
```

## Project Structure

- `src/simulation.ts`: core economy model and scenarios.
- `src/derivedMetrics.ts`: comparison scoring and social actor derived views.
- `src/App.tsx`: application state, copy, charts, and panels.
- `src/App.css`: responsive layout and visual system.

## License

MIT License. See `LICENSE`.
