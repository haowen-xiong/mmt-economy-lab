# Launch Checklist

Use this checklist before sharing MMT Economy Lab publicly. The goal is to make the repository understandable, runnable, and worth starring within the first minute.

## GitHub Repository Settings

Set these manually in GitHub because they are repository metadata, not source files:

- **Description:** `Interactive MMT and modern monetary economy learning sandbox.`
- **Website:** `https://haowen-xiong.github.io/mmt-economy-lab/`
- **Topics:** `mmt`, `economics`, `macroeconomics`, `simulation`, `react`, `typescript`, `recharts`, `economic-model`, `public-policy`, `learning-tool`

## GitHub Pages

1. Open repository settings.
2. Go to **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Run the **Deploy GitHub Pages** workflow.
5. Confirm that this URL returns the app, not a 404:

```text
https://haowen-xiong.github.io/mmt-economy-lab/
```

After deployment, verify these shareable experiments:

- `https://haowen-xiong.github.io/mmt-economy-lab/?scenario=sovereign-stabilizer&tab=overview&lang=en&period=24`
- `https://haowen-xiong.github.io/mmt-economy-lab/?scenario=resource-limit&tab=resources&lang=en&period=32`
- `https://haowen-xiong.github.io/mmt-economy-lab/?scenario=automation-platform&tab=society&lang=en&period=48`
- `https://haowen-xiong.github.io/mmt-economy-lab/?scenario=sovereign-stabilizer&tab=compare&lang=en&period=24`

## Pre-Launch Validation

Run:

```bash
npm run check
```

Then inspect:

- README screenshot renders on GitHub.
- Social preview image renders at `docs/social-preview.jpg` and Open Graph/Twitter meta tags point to it.
- CI badge is green.
- Share button updates the URL and shows a copied or ready state.
- Default app language is English.
- Chinese language switch still works.
- Mobile layout does not overflow the viewport.

## Launch Copy

Short version:

```text
I built MMT Economy Lab: an interactive macroeconomy sandbox for exploring fiscal policy, bank credit, real resources, external constraints, inequality, and automation in one model.
```

More direct version:

```text
Most macro explainers isolate one mechanism. MMT Economy Lab lets you move fiscal, credit, resource, external-sector, and distribution knobs together, then share the exact experiment state as a URL.
```

Use a link to one specific experiment instead of only linking the repository. A concrete scenario makes the project easier to understand and discuss.
