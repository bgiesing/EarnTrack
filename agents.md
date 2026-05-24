# Agent Guide: EarnTrack

## Project Overview

This is a lightweight, static web application designed to help users track their earnings from Prolific and CloudResearch. It processes CSV exports from these platforms, calculates statistics, and visualizes earnings over time.

### Core Tech Stack

* **Frontend**: Single-file HTML/CSS/JS architecture.
* **Styling**: Custom CSS using CSS variables for theming (Light/Dark/System).
* **Visualization**: [Chart.js](https://www.chartjs.org/) (loaded via CDN from cdnjs, version 4.4.1).
* **Storage**: localStorage for persisting study entries and user settings.
* **Deployment**: GitHub Pages via GitHub Actions (.github/workflows/static.yml).

## Architecture & Logic

* **Data Flow**: CSV Import → JS Parsing → localStorage → UI Rendering.
* **State Management**: The Entries array is the primary state, stored as a JSON string in localStorage.
* **Currency Handling**:

  * All entry `pay` and `bonus` values are stored internally in **GBP** (base currency).
  * Supports GBP, USD, SAR, and EUR via an exchange rate system (`RATES` object) stored in localStorage (cached 6 hours).
  * Live rates are fetched from Frankfurter API with fallback to `@fawazahmed0/currency-api` via jsDelivr CDN.
  * `fmt(val)` converts GBP values to the selected currency on-the-fly during rendering.
  * **Weekly Goal** and **Min Wage** are stored directly in the **user's selected currency** (not GBP base). When the user changes currency, these are converted from the old currency to the new one using current rates. This prevents their values from fluctuating as live rates update.
  * The progress text computes `weekEarned * RATES[currency]` to compare against the goal value.
  * The study table's rate badges use thresholds dynamically computed in **GBP base currency** (`okRate() = minWageGBP()` and `goodRate() = minWageGBP() * 1.5`) where `minWageGBP()` converts the stored `minWage` back to GBP based on the current currency exchange rate. If no custom minimum wage is set (value is 0), it falls back to Prolific defaults of £6/hr (ok) and £9/hr (good).

* **CSV Parsing**: Custom JS parser handles quoted strings and comma-separation. It includes specific logic to distinguish between Prolific and CloudResearch CSV formats via header "fingerprinting".

## Known DOM Element IDs (Required by render())

The following HTML element IDs **must exist in the DOM** or `render()` will throw and break the entire page:

| ID | Purpose |
|----|---------|
| `weekLabel` | Period label (e.g. "23 Mar – 29 Mar") |
| `metricEarned`, `metricEarnedSub` | Total earned metric |
| `metricBonus`, `metricBonusSub` | Total bonuses metric |
| `metricTime`, `metricTimeSub` | Time spent metric |
| `metricRate` | Avg hourly rate metric |
| `metricStudies`, `metricStudiesSub` | Studies done metric |
| `progressFill` | Goal progress bar fill element |
| `progressText` | Goal progress text (e.g. "$126 / $150") |
| `goalSymbol` | Currency symbol shown beside goal input |
| `goalInput` | Weekly goal number input |
| `statusSummaryGrid` | Status totals grid |
| `tableContainer` | Study table container |
| `entryCount` | Study count label |
| `lastUpdated` | "Last updated" timestamp shown in header |
| `earningsChart` | Canvas element for Chart.js |
| `chartTitle` | Chart title label |
| `chartRange14d`, `chartRange12m`, `chartRange5y` | Chart range tab buttons |
| `rateStatus` | Currency rate status indicator |
| `currencySelect` | Currency dropdown |
| `studyDate` | Date input for manual entry |
| `importZone` | Drag-and-drop import zone |
| `importToast` | Import toast notification |
| `settingsModal` | Settings modal overlay containing settings inputs |
| `changelogModal` | Changelog modal overlay containing release history |
| `confirmOverlay` | Clear-all confirmation overlay |
| `importModal` | Import modal overlay (FAB-triggered) |


## UI Components

* **FAB (Floating Action Button)**: Fixed bottom-right button (`#fabImport`) opens the import modal. Uses a download SVG icon. Styled with Material 3-inspired container colours.
* **Import Modal** (`#importModal`): Full-screen backdrop-blur overlay containing the existing import zone UI. Opens via `openImportModal()`, closes via `closeImportModal()`. Auto-closes 1.5 seconds after a successful import. Clicking the backdrop closes the modal.
* **Settings Modal** (`#settingsModal`): Opened via the header "Settings" cog button, this modal contains the App Theme toggle (Light/Dark/System), Display Currency select, Weekly Goal input, and Minimum Wage input. Moving these settings into a modal declutters the main dashboard UI.
* **Changelog Modal** (`#changelogModal`): Opened via the header "Changelog" button, this modal displays an accordion of the version release history, where only the most recent version is expanded by default.
* **Weekly Goal Progress Card**: Displays a sleek weekly progress bar and fractional text (e.g., £32.03 / £60.00) showing progress against the active weekly goal.
* **Earnings Chart**: Chart.js bar chart rendered inside `#earningsChart` canvas. Supports 14d / 12m / 5y ranges. Re-renders when currency, range, data, theme, or live exchange rates change (tracked via `lastChartKey`). Has graceful fallback UI if Chart.js fails to load.


## Development Guidelines

### Frontend Development

* **Single-File Constraint**: Keep all logic within `index.html` unless the project is explicitly migrated to a multi-file structure.
* **Theming**: Use the defined CSS variables (e.g., `--md-primary`, `--bg`, `--text`, `--accent`) to ensure consistency with the existing Material 3 Expressive-inspired design.
* **Responsiveness**: Ensure any new UI elements are mobile-friendly, as the app is designed for diverse viewports.
* **Chart Robustness**: Always wrap `new Chart(...)` in a `try/catch` and check `typeof Chart === 'undefined'` before calling `renderChart()` to degrade gracefully when the CDN is unavailable.

### Feature Implementation

* **Data Persistence**: Always call `save()` after modifying the `entries` array or `weeklyGoal`, then call `render()` to sync the UI.
* **Null-safe DOM access**: Use optional chaining (`?.`) or explicit null checks before accessing `.textContent` / `.value` on elements returned by `getElementById()`, since static HTML pre-render content may differ from the live DOM.
* **CSV Imports**: When adding support for new CSV formats, ensure 'fingerprinting' (name + timestamp) and `prolificId`/`cloudResearchId` deduplication are both used to avoid duplicate entries.
* **Chart Re-render Key**: The `chartKey` string in `render()` includes `currency`, `chartRange`, `latestKey`, `theme`, and `RATES[currency]`. Add any new factor that should trigger a chart redraw to this key.

### Testing JS Logic

Since the app is a single HTML file with no build tooling, you can validate the main `<script>` block against a mock DOM using Node.js + the `vm` module:

```js
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const code = scriptMatches[scriptMatches.length - 1][1]; // last <script> tag is the app logic
vm.runInContext(code, context);
```

Use `node --check script.js` for quick syntax validation of extracted code.

## Common Workflows

### Adding a Feature

1. Identify the necessary UI changes in the HTML.
2. Add any new required element IDs to the DOM table above and to the HTML.
3. Update the CSS variables or styles, using existing tokens wherever possible.
4. Implement the JS logic in the script section, ensuring `save()` is called for any state change.
5. Add the new element ID to the mock DOM in any test scripts if validating with Node.js.
6. Test by opening `index.html` directly in a browser.

### Deploying Changes

Changes are automatically deployed to GitHub Pages upon pushing to the main branch via the `.github/workflows/static.yml` workflow.
