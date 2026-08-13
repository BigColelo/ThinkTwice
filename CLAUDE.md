# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ThinkTwice is a local-first Expo (SDK 57) / React Native app that shows the financial impact of a
purchase before it is made, holds a reflection period, and tracks the real cost per use afterwards.
No backend, no network in the data path, no accounts.

`README.md` is the product and setup overview; `docs/architecture.md` explains _why_ the
non-obvious decisions were made; `THIRD_PARTY.md` justifies every dependency. Read the relevant one
before changing behaviour in that area — this file is the operating summary.

## Commands

```bash
npm start                # Expo dev server (then i / a / w)
npm run ios | android | web
npm run typecheck        # tsc --noEmit (strict)
npm run lint             # eslint .           (lint:fix to autofix)
npm run format           # prettier --write . (format:check to verify)
npm test                 # jest               (test:watch for watch mode)
npm run verify           # typecheck && lint && test — run before finishing work
npm run icons            # regenerate app icons from geometry in scripts/
```

Single test file or case:

```bash
npx jest src/domain/wishlist/cooldown.test.ts
npx jest -t 'cost per use'
npx jest --coverage      # collected from src/domain, src/utils, src/db only
```

`npm run verify` is green as a baseline (16 suites / 219 tests) — treat a failure as caused by the
current change.

## Architecture

```
Screens (src/app)          file-based routes; compose feature components, hold no business logic
  ↓
Feature hooks & services   src/features/*/hooks (reads), src/features/*/services (writes)
  ↓
Domain calculations        src/domain — pure functions, no React, no I/O
  ↓
Repositories               src/db/repositories — the only place SQL exists
  ↓
SQLite (expo-sqlite)
```

Two invariants hold this together and are worth more than any local convenience:

1. **No SQL outside `src/db/repositories`.** A screen that needs a new query gets a new repository
   method.
2. **No business logic in JSX.** A screen calls a domain function and renders the typed result; it
   never computes `price / (income - commitments)` inline. Domain results use `null` for every
   figure that cannot be computed, so `NaN`/`Infinity` are eliminated at the boundary rather than
   defended against at the leaf.

Domain functions return data, not sentences. The few string helpers there (`impactLevelLabel`,
`formatCooldownRemaining`) are short neutral labels; explanatory copy belongs in the UI layer.

### The read/write cycle — get this right

Reads go through `useDatabaseQuery(entities, run, deps)` (`src/db/useDatabaseQuery.ts`), which owns
loading flags, stale-response guarding and refetching. Writes go through a feature service
(e.g. `src/features/wishlist/services/wishlistActions.ts`) and **must** call
`invalidate(...entities)` from `src/db/dataRevisions.ts` for every entity they touched — that is the
only thing that refreshes open screens. Entities are the fixed union
`settings | commitments | wishlist | purchases | usage | expenses`.

There is deliberately no client cache: data is a millisecond away on the same device, so writes
invalidate and queries re-read.

Repositories are constructed once in `createRepositories` and reached with `useRepositories()`;
services take `Repositories` as their first argument, which is what makes them testable with a
plain in-memory fake.

### Providers and routing

`src/app/_layout.tsx` gates the whole app: SafeArea → bootstrap `ThemeProvider` → `DatabaseProvider`
→ `DatabaseGate` (loading/error UI) → `SettingsProvider` → `ThemeProvider mode={settings.themeMode}`
→ `Stack`. Everything below can assume storage is open and settings are loaded, which is why
`useRepositories()` throws rather than returning `null`.

Routes live in **`src/app`**, not `app/`. A new screen must also be registered as a
`<Stack.Screen>` in `AppChrome` to get its presentation/animation, and typed routes
(`experiments.typedRoutes`) regenerate `.expo/types` while the dev server runs. First-run redirect
to `/onboarding` is a redirect, not a separate navigator, so every route stays URL-addressable.

Because every route is URL-addressable, any screen can be the first history entry (deep link, web
URL, tapped reminder). Never call `router.back()` directly in a screen — use `useGoBack(fallback)`
from `@/features/navigation/useGoBack`, which falls back to a real destination when there is nothing
to pop. Passing the parent route as the fallback (`useGoBack('/purchases')`) is the norm.

### Persistence rules

- **Migrations are append-only.** Add an entry to `MIGRATIONS` in `src/db/migrations/index.ts` with
  the next sequential `version`; never edit or reorder an existing one — installed apps have already
  run it. Each runs in a transaction and `PRAGMA user_version` is bumped only on success; a database
  from a newer build is refused rather than opened.
- **Rows are untrusted.** Every row crosses `src/db/mappers.ts`, where enum-like columns are
  validated with `oneOf(...)` against a known set and fall back to a safe default, and non-finite
  numbers are coerced. A new column means updating both the `*Row` type and its mapper.
- **Nothing derivable is stored.** Cost per use, impact ratios and remaining cooldown days are
  computed on read. Aggregates that lists need (`total_uses`, expense totals, cost per use for
  sorting) are computed in SQL in `PurchaseRepository` so a list is one query, never N+1.

### Money, time, language, theme

These are enforced by tests; breaking one is a regression even if it typechecks.

- **Money is integer minor units**, fields suffixed `Cents`. `src/utils/currency.ts` is the only
  module that formats or parses money; components render `<MoneyValue cents={…} />` (which applies
  the active currency from settings) and never call `Intl` or `formatMoney` directly. Derived rates
  stay fractional and are rounded once, at display time. `parseMoneyInput` returns `null`, never
  `NaN`.
- **Divide with `safeDivide`** (`src/utils/numbers.ts`), which returns `null` for a zero or
  non-finite denominator. Income, available money and usage counts are legitimately zero.
- **Time**: ISO-8601 UTC strings for instants, `YYYY-MM-DD` for calendar-only values, nothing
  preformatted persisted. The cooldown is derived from `cooldownEndsAt` and the system clock on
  every read — no counter is decremented, no background job exists, and `calculateCooldownState`
  takes `now` as an argument so it is testable.
- **Neutral wording.** The app never concludes anything about a purchase. Impact labels describe
  size, not advisability; "afford", "good", "bad", "waste" and "you should" are asserted absent in
  `impact.test.ts` and `PurchaseImpactCard.test.tsx`. Semantic colour never carries meaning alone —
  always pair it with a label or icon.
- **Theme tokens only.** No hardcoded colour or pixel value in a screen; use `useTheme()` /
  `useThemedStyles(factory)` with the factory declared at module scope (it is deliberately excluded
  from the memo deps). Dark mode is designed, not inverted: `elevation(level, isDark)` resolves
  shadows-vs-borders so components never branch on the theme.
- **Accessibility**: `IconButton` requires `accessibilityLabel` (non-optional by design), list rows
  are a single element with a composed label, errors use `accessibilityRole="alert"`, and font
  scaling is capped per typography role.

### Platform adapters

Anything not available everywhere is isolated in a module that degrades instead of throwing —
`src/notifications/cooldownNotifications` (no-op on web and in Expo Go on Android),
`src/features/images/itemImages` (web uses the picked URL), `src/utils/confirm` (web uses
`window.confirm`), `DateField` (web renders `<input type="date">`). Never call such a platform API
directly from a screen. Notification permission is requested from the action that needs it, never at
launch.

`expo-notifications` must stay behind the **lazy** `loadNotifications()` in that adapter: it throws
while initialising in Expo Go on Android, and the root layout imports the adapter, so a static
`import` crashes the app before the first render (surfacing as expo-router's `Cannot read property
'ErrorBoundary' of undefined`). Any new platform module with the same hazard belongs behind the same
pattern.

`metro.config.js` adds the `.wasm` asset extension and the cross-origin isolation headers that
`expo-sqlite` needs on web; both are load-bearing for the web build.

## Testing conventions

- Tests are colocated as `*.test.ts` / `*.test.tsx` next to the code they cover. Coverage is
  concentrated in `src/domain`, `src/utils` and `src/db`.
- `jest.setup.ts` pins the locale to `en-GB` before every test, so assertions on formatted money and
  dates are stable. Expect `€1,799` / `17.99` formatting in expectations.
- Component tests use `renderWithProviders` from `@/test/renderWithProviders` — **await it** — which
  supplies theme, settings and safe-area context but _no database_. Pass `settings` to vary currency
  or income.
- Service/workflow tests build an in-memory object satisfying `Repositories` and `jest.mock` the
  notification and image adapters; call `resetRevisionsForTesting()` to keep the invalidation bus
  from leaking between cases.
- Worked examples from the product spec are tests (€1,650 − €783 = €867; 650 uses at €2.77; €1,059
  real cost at €18.26/use). Keep them passing; if a calculation must change, change the documented
  assumption in `src/constants/usagePresets.ts` and the test together.

## TypeScript, lint, format

- `strict` plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `noUnusedLocals`, `noUnusedParameters`. Intentionally unused bindings must be `_`-prefixed.
- Path alias `@/*` → `src/*`, declared in **both** `tsconfig.json` and the `moduleNameMapper` in
  `jest.config.js`; keep them in sync.
- `import/order` is enforced: external → internal (`@/**`) → relative, alphabetised, with blank
  lines between groups. `eqeqeq` (null-tolerant), `prefer-const`, `no-var`, and `no-console` except
  `warn`/`error` (off in tests and `scripts/`).
- Prettier: single quotes, semicolons, trailing commas, 100 columns.
- Public functions and hooks carry explicit return types; that is the house style throughout.

## Project constraints

- **Independence is a hard requirement.** This is an independent personal project: no employer or
  otherwise private code, packages, registries, assets or services, and no local path dependencies.
  `.npmrc` pins installs to the public npm registry. Every dependency comes from public npm and is
  justified in `THIRD_PARTY.md` — adding one means adding its entry there too.
- **No network in the data path.** No backend, accounts, sync, analytics, crash reporting or
  tracking SDK. Every core workflow must work in airplane mode. Do not introduce any of these
  without being asked explicitly.
- **No UI framework and no chart library.** `src/components/ui` is the in-repo design system on top
  of React Native primitives and `StyleSheet`; `src/components/charts` is hand-built on
  `react-native-svg`.
- App icons are generated from geometry (`npm run icons`); do not commit imported artwork.
- Sample data (`src/db/devSeed.ts`) is guarded by `__DEV__` and reachable only from an explicit
  Settings action, so invented financial records can never reach a production build.
