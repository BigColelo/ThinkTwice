# ThinkTwice

**Buy better. Live better.**

ThinkTwice helps you understand the financial impact of a purchase before you make it, and what
that purchase actually cost you afterwards.

It is not a banking app, a budgeting system, or a financial advisor. It never tells you what to
buy. It gives you three things at three moments:

- **Before** — how a price compares to your month, how often you expect to use the thing, and what
  that works out to per use.
- **During** — a reflection period you choose, so a decision gets some time.
- **After** — uses, extra expenses, current resale value, and the real cost per use.

Every figure is presented neutrally. There is no "you can afford this" and no "bad purchase".

It ships in six languages — English, Italiano, Deutsch, Français, Español, العربية — and the one you
choose drives the dates, amounts and number formats as well as the words.

---

## Independence

> ThinkTwice is an independent personal project and intentionally does not depend on proprietary
> employer code, packages, infrastructure, or internal services.

Everything needed to build it is either in this repository or available from the public npm
registry. There are no private packages, no internal registries, no local path dependencies, no
shared design system, and no company API, asset, or credential anywhere in the project. A
project-local `.npmrc` pins installs to `https://registry.npmjs.org/`.

The app icons are generated from geometry in `scripts/generate-app-icons.js` rather than bundled as
artwork, so even the images are reproducible from source.

---

## Privacy

V1 has no backend, and that is a feature rather than a gap.

- All data lives in a local SQLite database on the device.
- No account, no sign-in, no sync.
- No analytics, no crash reporting, no advertising or tracking SDK.
- Nothing is ever transmitted anywhere.

Every core workflow — setting income, adding a commitment, adding a wishlist item, watching a
cooldown, converting to a purchase, recording a use, adding an expense, reading insights, switching
theme — works with airplane mode on.

---

## Technology

| Area          | Choice                                            |
| ------------- | ------------------------------------------------- |
| Framework     | React Native via Expo (SDK 57), TypeScript strict |
| Navigation    | Expo Router (file-based)                          |
| Storage       | `expo-sqlite`, with migrations from version 1     |
| Forms         | `react-hook-form` + `zod`                         |
| Icons         | `lucide-react-native`                             |
| Charts        | `react-native-svg` (hand-built, no chart library) |
| Notifications | `expo-notifications`, local only, opt-in          |
| Testing       | `jest-expo` + `@testing-library/react-native`     |

See [`THIRD_PARTY.md`](./THIRD_PARTY.md) for why each dependency is present.

The UI is a small in-repo design system built on React Native primitives and `StyleSheet` — no
component framework, no NativeWind. Light and dark mode are both first-class.

---

## Getting started

Requirements: Node 20+ and npm. No other setup, no credentials.

```bash
npm install
npm start
```

Then press `i` for the iOS simulator, `a` for Android, or `w` for the browser. On a physical device,
scan the QR code with Expo Go.

### Commands

| Command             | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm start`         | Start the Expo dev server                    |
| `npm run ios`       | Start and open the iOS simulator             |
| `npm run android`   | Start and open an Android emulator or device |
| `npm run web`       | Start and open the web build                 |
| `npm run typecheck` | TypeScript, strict, no emit                  |
| `npm run lint`      | ESLint                                       |
| `npm run test`      | Jest                                         |
| `npm run format`    | Prettier                                     |
| `npm run verify`    | typecheck + lint + test                      |
| `npm run icons`     | Regenerate the app icons from `scripts/`     |

---

## Architecture

Layers, top to bottom. Each one only knows about the one below it.

```
Screens (src/app)              file-based routes, composed from feature components
  ↓
Feature hooks & services       per-feature state and write operations
  ↓
Domain calculations            pure, testable, no React and no I/O
  ↓
Repositories (src/db)          the only place that contains SQL
  ↓
SQLite
```

Two rules make this hold:

1. **No SQL outside `src/db/repositories`.** Screens and hooks call repository methods.
2. **No business logic in JSX.** A screen receives a typed result from a domain function; it never
   computes `price / (income - commitments)` inline.

That boundary is also what makes cloud sync possible later without rewriting screens — although V1
deliberately does not build any of it.

### Money

Money is always an integer number of minor units (cents), never a float. Fields are suffixed
`Cents`. Formatting and parsing live in `src/utils/currency.ts` and nowhere else; presentation goes
through `Intl.NumberFormat`, so grouping, separators and the side the symbol sits on all follow the
locale of the chosen language — `€1,650` in English, `1.650 €` in German.

### Language

Six languages, chosen in Settings or inherited from the device. The choice drives the copy and every
`Intl` format together, so a screen is never half translated. Catalogues are plain TypeScript objects
in `src/i18n/locales`, bundled rather than fetched, because the app has to work in airplane mode.
Arabic is laid out right to left, which React Native applies on the next launch.

### Time

Timestamps are ISO-8601 UTC strings; calendar-only values are `YYYY-MM-DD`. Nothing preformatted is
ever stored. The cooldown countdown is derived from `cooldownEndsAt` and the system clock on every
read — no counter is decremented and persisted, so the app is correct after being closed for a week.

### The estimate

Expected usage presets map to a single documented `usesPerMonth` rate in
`src/constants/usagePresets.ts`. Ranges use their **midpoint**, and a month is 52/12 weeks. So
"2–3 times per week" is 2.5 × 4.333 ≈ 10.83 uses/month, which over 5 years is 650 uses — and
€1,799 ÷ 650 = €2.77 per use. Every step is visible and unit tested.

For more detail, see [`docs/architecture.md`](./docs/architecture.md).

---

## Project structure

```
src/
  app/                  Expo Router routes
    (tabs)/             Home, Money, Purchases, Insights
    add/                the central + flow
    wishlist/           list and reflection detail
    purchase/           purchase detail
    money/              commitment form
    settings/
  components/
    ui/                 the design system (AppText, Card, Button, MoneyValue, …)
    charts/             ProgressRing, CategoryBarChart, MiniBar
    brand/              the ThinkTwice mark
  features/             per-feature components, hooks, schemas, services
  domain/               pure calculations (money, recurring, wishlist, purchase, insights)
  i18n/                 the six catalogues, the provider, locale mapping and RTL
  db/                   database, migrations, repositories, mappers
  notifications/        local cooldown reminders, behind an adapter
  theme/                tokens and ThemeProvider
  constants/            categories, usage presets, frequencies, ownership presets
  utils/                currency, dates, ids, numbers, confirm
  types/                domain entities
  test/                 test helpers
```

---

## Testing

```bash
npm test              # everything
npm run test:watch
npx jest --coverage   # coverage over domain, utils and db
```

Coverage is concentrated where it matters: the domain calculations. Each of the worked examples in
the product spec is a test — €1,650 − €783 = €867, 650 estimated uses at €2.77, €1,059 real cost at
€18.26 per use — alongside the edge cases the app has to survive: zero income, commitments larger
than income, zero usage, a resale value above the purchase price, an unreadable date, and a cooldown
that expired while the app was closed.

Component tests cover the two screens where a wrong number would matter most (purchase impact and
the real-cost breakdown), including that they never render `NaN`, never render `Infinity`, and never
use judgemental wording. Service-level tests cover the wishlist → purchase conversion, including
that a double tap cannot create two purchases.

---

## Platforms

iOS and Android are the primary targets; both bundle and run from this repository.

Web builds and runs too, with two caveats that are handled behind adapters rather than allowed to
break the build: local notifications are unavailable (cooldowns still work — they never depended on
them), and picked images are used in place rather than copied into app storage. `metro.config.js`
adds the WebAssembly asset extension and the cross-origin isolation headers that `expo-sqlite`
needs in a browser.

Reminders on Android need a [development build](https://docs.expo.dev/develop/development-builds/introduction/):
Expo Go removed the Android notification service in SDK 53. The app runs in Expo Go regardless — the
notification adapter degrades there exactly as it does on web, and Settings says so.

---

## Development sample data

Development builds have a **Load sample data** action at the bottom of Settings. It is guarded by
`__DEV__` and has no path to a production build, so a real user can never end up with invented
financial records.

---

## What V1 deliberately does not do

No accounts, no backend, no cloud sync, no bank or Open Banking integration, no transaction import,
no receipt scanning, no AI, no analytics, no subscriptions, no social features, no daily-expense
tracking, no investment tracking, and no behavioural predictions.

The architecture leaves room for some of these later — repositories are a real boundary — but none
of the infrastructure for them is built now.
