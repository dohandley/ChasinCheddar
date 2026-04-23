# Chasin Cheddar's Command Center

3-model MLB bet tracker. Compares MKB, SimpleOdds, and Blended picks side by side.

## Setup

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Create a repo called `ChasinCheddar` on GitHub
2. Push this code to `main`
3. Go to Settings → Pages → Source: **GitHub Actions**
4. The workflow auto-deploys on every push

Live at: `https://yourusername.github.io/ChasinCheddar/`

## Daily Workflow

1. **Afternoon:** Run `python run_mlb.py` (generates all 3 JSON files)
2. **Import** each JSON into the Command Center:
   - `picks_log_mlb.json` → MKB tab
   - `simpleodds_log_mlb.json` → SimpleOdds tab
   - `picks_log_mlb_blended.json` → Blended tab
3. **Next morning:** Run `python blend_tracker.py` (resolves all 3 against box scores)
4. **Re-import** the resolved JSONs to update results
5. Check the **Performance** tab to compare models

## Changing the repo name

If your repo isn't called `ChasinCheddar`, update the `base` in `vite.config.js`:

```js
base: '/your-repo-name/',
```
