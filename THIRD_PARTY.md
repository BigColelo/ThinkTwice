# Third-party dependencies

Every package below comes from the **public npm registry** (`https://registry.npmjs.org/`, pinned in
this repository's `.npmrc`). There are no private packages, no internal registries, no scoped
employer namespaces, no local path dependencies and no workspace links to anything outside this
repository.

The list is deliberately short. For each non-Expo dependency this document states what it is used
for, why it is required, why writing it ourselves would be the wrong call, and its platform impact.

---

## Framework

### `expo`, `expo-router`, `react`, `react-native`, `react-native-web`

The platform itself: React Native through Expo's managed workflow, with file-based routing.
Expo Router is the officially supported router for Expo and gives URL-addressable screens, which is
what makes deep links and the web build work at all.

Supporting Expo Router: `react-native-safe-area-context`, `react-native-screens`, `expo-linking`,
`expo-constants`, `expo-status-bar`, `expo-system-ui`. These are its documented peer requirements
rather than independent choices.

`expo-constants` is also read directly, in exactly one place: the app version shown in Settings
comes from the manifest through it (`src/features/settings/appVersion.ts`).

**Platforms:** iOS, Android, web.

---

## Expo modules

All first-party, all installed at the version Expo pins for SDK 57.

| Package              | Used for                                                                | Platform notes                                                                                                      |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `expo-sqlite`        | The entire local database. All persistent domain data.                  | iOS/Android natively; web via a WebAssembly build (see `metro.config.js`).                                          |
| `expo-notifications` | Optional local reminders when a reflection period ends.                 | iOS, and Android in a development build. Isolated in `src/notifications`; a no-op on web and in Expo Go on Android. |
| `expo-image`         | Rendering item photos, with caching and a transition.                   | All platforms.                                                                                                      |
| `expo-image-picker`  | Choosing a photo for an item.                                           | All platforms; permissions requested contextually.                                                                  |
| `expo-file-system`   | Copying a picked photo into app-owned storage so it survives a restart. | iOS/Android. Skipped on web, where the picked URL is used directly.                                                 |
| `expo-splash-screen` | Holding the splash screen until the database has opened.                | iOS/Android.                                                                                                        |
| `expo-haptics`       | A light tap when a use is recorded — the app's most repeated action.    | iOS/Android; guarded on web.                                                                                        |

**Why not implement these ourselves:** each one wraps a native platform API. There is no
JavaScript-only equivalent, and reimplementing them would mean ejecting from the managed workflow.

---

## Open-source libraries

### `react-native-svg`

**Used for:** the cooldown progress ring, the summary ring, the brand mark, and the bar in the
category chart.

**Why required:** React Native has no vector drawing primitive. Everything ThinkTwice draws — an
arc, a rounded rectangle, a stroked circle — needs SVG.

**Why not ourselves:** it is a native rendering bridge (CoreGraphics / Android Canvas), not a
library of helpers.

**Why not a charting library:** the app has one ring and one bar. A charting library would be
several times the size of everything it replaced, and would fight the design system on colour,
typography and dark mode. The chart components in `src/components/charts` are about 80 lines each.

**Platforms:** iOS, Android, web.

---

### `lucide-react-native`

**Used for:** every icon in the app.

**Why required:** a consistent, complete icon set with a single stroke weight. Icons are used in
navigation, categories, empty states and buttons.

**Why not ourselves:** drawing and maintaining ~50 icons by hand would be significant work for a
worse result. Lucide is ISC-licensed and actively maintained.

**Why only one icon library:** mixing sets is immediately visible — different stroke weights,
different optical sizes. `sizes.iconStrokeWidth` in the theme keeps every icon on the same weight.

**Platforms:** all three. Requires `react-native-svg`.

---

### `react-hook-form`, `zod`, `@hookform/resolvers`

**Used for:** the wishlist form, the owned-purchase form, the commitment form and the expense sheet.

**Why required:** these forms have interdependent fields, conditional validation ("a custom usage
frequency needs a rate") and a live preview that recomputes as the user types. React Hook Form keeps
that from re-rendering the whole screen on every keystroke. Zod validates at runtime, which
TypeScript cannot: a user types strings, and `priceCents` must be proven to be a non-negative
integer before it reaches the database.

**Why not ourselves:** hand-rolled form state is the classic source of subtle bugs — stale values,
validation that runs at the wrong time, error messages that do not clear. The schemas in
`features/*/schemas` are also the single readable statement of what valid input means.

**Platforms:** pure JavaScript, all three.

---

### `date-fns`

**Used for:** calendar arithmetic — adding days and months, and counting calendar days and months
between two dates.

**Why required:** month lengths, leap years and daylight-saving transitions. "Seven days from now"
and "eight months of ownership" have to be right, and native `Date` arithmetic gets both wrong in
ways that only show up around month ends and DST boundaries.

**Why not ourselves:** this is exactly the category of code that should not be hand-written. It is
also tree-shakeable, so only the handful of functions used are bundled.

**Why not Moment.js:** deprecated, mutable, and far larger.

**Note:** date _formatting_ does not use date-fns. Presentation goes through `Intl.DateTimeFormat`
so it follows the device locale without bundling locale data.

**Platforms:** pure JavaScript, all three.

---

### `@react-native-community/datetimepicker`

**Used for:** choosing a purchase date and an expense date.

**Why required:** date entry is a place where platform conventions matter. This is the standard,
Expo-supported picker and presents the real iOS and Android controls.

**Why not ourselves:** a hand-built calendar would be worse on localisation, accessibility and
muscle memory, and it would need constant maintenance to keep matching the platform.

**Platforms:** iOS and Android. `DateField` falls back to a native `<input type="date">` on web, so
the build never breaks there.

---

## Development-only

| Package                                      | Used for                                                   |
| -------------------------------------------- | ---------------------------------------------------------- |
| `typescript`                                 | Strict type checking.                                      |
| `jest`, `jest-expo`                          | Test runner, configured for the Expo/React Native runtime. |
| `@testing-library/react-native`              | Rendering components the way a user encounters them.       |
| `react-test-renderer`                        | Required by the testing library.                           |
| `eslint`, `eslint-config-expo`               | Linting, on Expo's public shared config.                   |
| `prettier`, `eslint-config-prettier`         | Formatting, and stopping ESLint from arguing with it.      |
| `@types/react`, `@types/jest`, `@types/node` | Type definitions.                                          |

The ESLint and Prettier configurations (`eslint.config.js`, `.prettierrc.json`) belong entirely to
this repository. They extend only `eslint-config-expo`, which is public.

---

## Written in-repo rather than installed

Some things were deliberately not made into dependencies:

- **Sortable ids** (`src/utils/ids.ts`) — a ULID-shaped generator, about 40 lines, no platform
  caveats, and it gives ids that sort by creation time.
- **The design system** (`src/components/ui`) — a UI framework would make ThinkTwice look like a
  collection of prebuilt components. Every component here is built on React Native primitives.
- **Charts** (`src/components/charts`) — see `react-native-svg` above.
- **App icons** (`scripts/generate-app-icons.js`) — generated from geometry so the repository
  contains no imported artwork and the icons can always be rebuilt.
- **State management** — React Context for settings and theme, a small invalidation bus for
  database reads, and local state everywhere else. Redux or an equivalent would be infrastructure
  without a problem to solve at this size.
