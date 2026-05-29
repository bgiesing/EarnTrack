# EarnTrack

EarnTrack is a lightweight, local-first web application designed to help users track and visualize their earnings from Prolific and CloudResearch. It processes CSV exports from these platforms, calculates statistics, and visualizes earnings over time.

## Key Features

- **Multi-Platform Support**: Features a custom CSV parser supporting exports from both Prolific and CloudResearch. The parser automatically detects the platform format using header fingerprinting and performs deduplication based on study identifiers.
- **Privacy & Local Storage**: No database, authentication, or external hosting is required for your data. All entries are saved locally inside the browser's `localStorage` and can be cleared or exported back to a CSV at any time.
- **Dynamic Currency Conversions**: Stores all study payments internally in British Pounds (GBP) as a base currency, converting them to GBP, USD, EUR, SAR, or BTC on-the-fly. Live exchange rates are retrieved from public APIs and cached locally for 6 hours.
- **Stacked Earnings Chart**: Built with Chart.js to render interactive daily (14 days), monthly (12 months), and yearly (5 years) views. The charts dynamically distinguish approved earnings and pending (awaiting review) payments.
- **Flexible Theme System**: Features a Material 3 Expressive-inspired user interface with light, dark, and system theme modes. Includes customizable accent colors chosen via preset palettes or a custom color picker.
- **Personalized Targets**: Custom weekly goal setting and an hourly minimum wage configuration. The minimum wage is used to color-code study hourly rate badges (e.g., green for good rate, yellow for acceptable, red for low rate).
- **Manual Logging & Operations**: Supports manual entry of studies with a Material-style date and time picker. Includes table pagination, live search, and columns sortable by study name, date, payment, time, and rate.

---

## File Structure

The project consists of the following key files:
- `index.html`: The core application. It contains all the HTML, CSS custom styling variables, responsive grids, and the JavaScript logic for CSV parsing, exchange rates, Chart.js orchestration, and DOM rendering.
- `agents.md`: Internal guidelines, system architecture details, and state management specifications.
- `.github/workflows/static.yml`: The GitHub Actions workflow for deploying the single-page application to GitHub Pages.

---

## Getting Started

### Hosted Version
The easiest way to use EarnTrack is directly via the hosted version on [GitHub Pages](https://bgiesing.github.io/EarnTrack/).

### Direct Browser Execution
Because EarnTrack is a static, single-page application, you do not need any build tools or runtime environments.
1. Download or clone this repository.
2. Double-click the `index.html` file to open it in any modern web browser.

### Local Development Server
To run a local server or test live exchange rate API caching, you can serve the directory using a lightweight web server:

**Using Node.js:**
```bash
npx serve .
```

**Using Python:**
```bash
python -m http.server 8000
```
Open `http://localhost:8000` (or the port specified by the tool) in your web browser.

---

## CSV Specifications & Fingerprinting

The CSV parser reads column headers to identify the source platform:
- **Prolific CSVs** are identified by headers such as `Study name`, `Reward`, `Status`, `Started at`, or `Time taken`.
- **CloudResearch CSVs** are identified by headers such as `Project Name`, `Amount`, `Status`, or `Date`.

### Deduplication
To prevent duplicate records when importing the same CSV file multiple times, the system identifies and filters existing entries using `prolificId` or `cloudResearchId` where available, falling back to a combination of name and timestamp.

---

## Development Guidelines

### State Management
- The main application state is stored in the `entries` array, persisted as a JSON string in the `prolific_entries` localStorage key.
- Whenever changes are made to `entries`, `weeklyGoal`, or settings, the changes must be saved via the `save()` helper, which automatically triggers a `render()` call to keep the UI in sync.

### DOM Constraints
The `render()` function relies on several specific element IDs being present. Modifying or removing any of the following elements from `index.html` will cause the application script to fail:
- `weekLabel`, `metricEarned`, `metricEarnedSub`, `metricBonus`, `metricBonusSub`, `metricTime`, `metricTimeSub`, `metricRate`, `metricStudies`, `metricStudiesSub`
- `progressFill`, `progressText`, `goalSymbol`, `goalInput`
- `statusSummaryGrid`, `tableContainer`, `entryCount`, `lastUpdated`
- `earningsChart`, `chartTitle`
- `chartRange14d`, `chartRange12m`, `chartRange5y`
- `rateStatus`, `currencySelect`, `studyDate`, `importZone`, `importToast`
- `settingsModal`, `changelogModal`, `confirmOverlay`, `importModal`, `bonusFieldLabel`

### Chart Rendering Key
To prevent memory leaks and unnecessary re-draws, the application uses a dynamic `chartKey` tracking mechanism. The key is composed of the active `currency`, `chartRange`, the latest data key, the current `theme`, and the exchange rate value. If the key changes, the chart is rebuilt; otherwise, it remains untouched.

### Validation Script
You can validate syntax and mock DOM bindings using Node.js and the `vm` module:
```javascript
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const code = scriptMatches[scriptMatches.length - 1][1];

const context = {
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  window: {},
  document: {
    getElementById: () => null
  }
};
vm.createContext(context);
vm.runInContext(code, context);
```
