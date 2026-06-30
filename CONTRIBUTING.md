# Contributing to MMT Economy Lab

Thanks for helping improve MMT Economy Lab. The project works best when contributions make economic mechanisms easier to see, test, or discuss.

## Good First Contributions

- Improve explanations in tooltips, scenario labels, or README sections.
- Add focused tests for `src/simulation.ts` or `src/derivedMetrics.ts`.
- Improve responsiveness, accessibility, or chart readability.
- Add a scenario that demonstrates a clear mechanism.
- Refine the model when the change preserves accounting identities and is easy to explain.

## Local Setup

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Before opening a pull request:

```bash
npm run check
```

## Model Contribution Rules

- Keep the three-sector balance identity closed.
- Prefer transparent mechanisms over hidden tuning.
- Add or update tests when changing policy transmission logic.
- Document assumptions in plain language when they matter for learning.
- Avoid presenting the model as calibrated forecasting or policy advice.

## Pull Request Checklist

- The change has a clear learning or product benefit.
- `npm run check` passes locally.
- The README or tooltips are updated when user-facing concepts change.
- Screenshots are included for UI changes.

## Project Boundaries

This repository is a teaching sandbox. It is not intended to forecast actual economies, give investment advice, or prescribe public policy.
