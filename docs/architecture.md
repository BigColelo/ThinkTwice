# ThinkTwice — architecture

This document covers the decisions that are not obvious from reading the code. The README has the
overview; this has the reasoning.

---

## 1. Layering

```
Screens (src/app)              routes; compose feature components, hold no business logic
  ↓
Feature hooks & services       per-feature reads and writes (src/features/*)
  ↓
Domain calculations            pure functions; no React, no I/O, no strings for the user
  ↓
Repositories (src/db)          the only place SQL exists
  ↓
SQLite (expo-sqlite)
```

Three invariants hold this together:

**No SQL outside `src/db/repositories`.** A screen that needed a new query gets a new repository
method. This is what would make a future sync layer a change in one directory rather than in every
screen.

**No business logic in JSX.** This is not acceptable:

```tsx
<Text>{price / (income - commitments)}</Text>
```

This is:

```tsx
const impact = calculatePurchaseImpact(item.priceCents, finances);
<PurchaseImpactCard impact={impact} />;
```

The domain function returns a typed result whose every field can be `null`; the component decides
how to present each case. That is why `NaN` and `Infinity` cannot reach the screen: they are
eliminated at the boundary, not defended against at the leaf.

**A route is a default export and nothing else.** It reads its parameters, composes feature
components and decides what an action means; anything with markup of its own lives in
`src/features/<area>/components`. This is not tidiness. Expo Router's route context matches every
`.tsx` under `src/app`, test files included, so a test placed beside a component there would ship as
a real screen — which means a component living in a route cannot be tested at all. Five did, and the
two with real logic in them, the commitment form and the income editor, were the only untested
forms in the app.

The rule covers inline markup as much as named components: a row of text laid out inside a route
is as untestable as a component declared in one. So every route composes feature components and
nothing else — the root layout included, which only puts the providers, the gate, the chrome and
the navigator in order — and `eslint.config.js` keeps it that way. A file under `src/app` cannot
import `react-native`, `AppText` or `useTheme`, cannot declare a function or class beside its
default export, and cannot reach into a repository.

**A render error loses one screen, not the app.** `AppErrorBoundary` (`src/features/errors`) sits
directly below the bootstrap theme and language providers in the root layout and above the
database. Anything that throws while rendering — a screen, a provider, the navigator — lands on a
crash screen in the device's language, with the message and a retry that re-mounts everything below
it, database included. Without it a production build shows React Native's own red screen and offers
no way back. It sits _below_ the bootstrap providers on purpose: the crash screen is themed and
translated exactly as the database gate is, without carrying a copy of either.

**No first frame in the wrong theme or language.** Two gates stand between launch and the first
screen: `DatabaseGate` until storage is open, `SettingsGate` until the settings row is read. The
native splash stays up through both. It used to be released as soon as the database opened, and
the app then drew itself with the fallback settings — the device's theme and language — for the
moment the read took, before repainting in the user's.

---

## 2. Money

**Integer minor units, always.** `priceCents: 179900`, never `price: 1799.00`. Field names carry
the `Cents` suffix so a euro value cannot be assigned by accident. SQLite stores them as `INTEGER`.

**One formatting module.** `src/utils/currency.ts` owns every conversion between money and text.
Components never call `Intl` directly — they render `<MoneyValue cents={…} />`, which applies the
active currency from settings. Changing how money looks is a change in one file.

**Codes, not symbols.** Every amount is labelled with its ISO 4217 code — `EUR 1,650` in English,
`1650 EUR` in Italian. The app offers forty-six currencies and there is no complete symbol set behind
them: ICU renders CHF as `CHF`, USD as `US$` outside `en-US`, GBP as `£GB` in French, and the
Arab-state currencies as their code in every locale but `ar`. Symbols for some and codes for the rest
would look like a rendering failure, and the code is also the one label that is never ambiguous
between two dollars or three pounds. The corollary is that the app shows no `€` anywhere.

**One hundredth of the major unit, for all of them.** BHD, IQD, JOD, KWD, LYD, OMR and TND are
defined with three decimals and CLP, DJF, KMF, PYG, XAF and XOF with none; all thirteen are displayed
here with two. That is not an oversight. Amounts are stored as minor units and are never converted, so
switching currency has to relabel a figure and must never change it — 165000 reads `EUR 1,650` and,
after a switch, `KWD 1,650`. Honouring each ISO exponent instead would move the decimal point on
money the user had already entered, which is a silent edit to their own records. `MINOR_UNITS_PER_MAJOR`
therefore stays a constant, and the choice is asserted in `currency.test.ts`.

**Derived rates are not rounded early.** A cost per use is `safeDivide(cents, uses)` and may be
`276.769…`. It is carried as a fractional number of cents and rounded once, by `formatMoney`, at
display time. Rounding it at the source would compound error through the insights averages.

**Parsing is locale-tolerant.** `parseMoneyInput` accepts `17.99`, `17,99`, `1.234,56`, `1,234.56`
and `1,500`. The rule: the last `.` or `,` followed by exactly one or two digits is the decimal
separator; everything else is grouping. It returns `null` — never `NaN` — so a form shows a
validation message instead of storing garbage.

**Rounding per row, not per total.** A commitment's monthly equivalent is rounded individually
(`Math.round(amount × occurrencesPerYear / 12)`) and the total is the sum of those rounded values.
This guarantees the per-row figures the user reads add up exactly to the total shown. The annual
total is then `monthly × 12` rather than the sum of each commitment's own yearly cost — so the year
figure is always exactly twelve times the month figure, with no unexplainable discrepancy.

---

## 3. Time and the cooldown

**Storage.** ISO-8601 UTC strings for instants; `YYYY-MM-DD` for calendar dates where a time would
be meaningless (a purchase date). Nothing preformatted is ever persisted — a row written today must
still format correctly if the user changes their device locale tomorrow.

**The cooldown never counts down on disk.** The persisted values are `cooldownStartedAt`,
`cooldownEndsAt` and `cooldownDays`. `calculateCooldownState(item, now)` derives everything else
from the system clock on every read. Consequences, all of them wanted:

- No background task, no scheduled job, nothing to miss.
- Correct after the app has been closed for a week.
- Correct across a timezone change or a device that was switched off.
- A pure function that takes `now` as an argument, so it is trivially testable.

**Status is derived, not trusted.** `resolveWishlistStatus` computes `thinking` vs
`ready_to_decide` from `cooldownEndsAt`. The stored `status` column is written opportunistically
(`promoteElapsedCooldowns`) so lists and counts agree, but nothing depends on that write having
happened. `purchased` and `dismissed` are terminal and are never recomputed.

**A decision against is a record, not a deletion.** Dismissing keeps the row — price, category,
`decidedAt` — and `WishlistRepository.listDismissed()` reads it back so Insights can report what was
_not_ bought, as a count and a total. That figure is never called money saved: the app cannot know
whether the money stayed put or went somewhere else, and claiming a saving would be exactly the kind
of conclusion it refuses to draw elsewhere. Deleting such an item stays possible — the data is the
user's — but the confirmation states what goes with it, which differs by status
(`wishlistDeleteConfirmation`): an open item loses the reflection already spent, a dismissed one
disappears from what was avoided, and a purchased one leaves its purchase behind with no estimate
left to compare against.

**Calendar days, not 24-hour blocks.** `addDays` from date-fns preserves wall-clock time, so a
7-day period started at 09:00 ends at 09:00 — even across a daylight-saving change, where the
elapsed UTC time is 167 or 169 hours rather than 168. Remaining days are `ceil(remaining / 1 day)`,
so a period with six hours left reads as "1 day", never "0 days".

---

## 4. The estimate

The chain from a guess to a number, with every step stated:

```
usage preset  →  usesPerMonth  (one documented rate per preset)
usesPerMonth × expectedOwnershipMonths  =  estimated uses      (rounded to a whole number)
priceCents ÷ estimated uses             =  estimated cost/use  (not rounded until display)
```

Two assumptions are fixed in `src/constants/usagePresets.ts` and stated in the UI:

- **A range resolves to its midpoint.** "2–3 times per week" is 2.5/week. The preset's `detail`
  string says so, and the wishlist form prints it under the choice.
- **A month is 52/12 weeks (≈4.333).** This keeps weekly and monthly rates consistent over a year.

Worked through: 2.5 × 4.333 ≈ 10.83 uses/month × 60 months = 650 uses. €1,799 ÷ 650 = €2.77 per use.
That example is a unit test.

`custom` is the escape hatch: the user supplies `usesPerMonth` directly, and the form's schema
refuses to save a custom frequency without one — otherwise the estimate would silently be missing
rather than visibly wrong.

---

## 5. Purchase impact

Three figures, from `calculatePurchaseImpact`:

| Figure                    | Formula                             |
| ------------------------- | ----------------------------------- |
| % of monthly income       | `price ÷ monthlyNetIncome`          |
| % of monthly available    | `price ÷ availableAfterCommitments` |
| Months of available money | the same ratio, read as a duration  |

Plus a size label, from fixed thresholds against available money:

| Ratio          | Label      |
| -------------- | ---------- |
| ≤ 0.25         | `low`      |
| ≤ 1.00         | `moderate` |
| > 1.00         | `high`     |
| not computable | `unknown`  |

The label describes **size, not advisability**. Nothing in the app concludes anything about the
purchase; `impactLevelLabel` is unit tested to contain none of "afford", "good", "bad", "waste" or
"should".

**Unavailable states are explicit.** `PurchaseImpact.unavailableReason` distinguishes:

- `no_income` — no income configured. Every figure is `null`, and the card explains how to fix it.
- `no_price` — no price typed yet. Every figure is `null` and the card asks for one; measured as
  zero, an empty field used to come out as a "low" impact. `suggestCooldownDays` makes the same
  distinction and keeps the default period until there is a price to size it by.
- `no_available_money` — income is known but commitments consume it all. The income percentage is
  still shown because it is still meaningful; the available-money figures are `null` with a
  sentence saying why.

There is no path where a division by zero produces a rendered value.

---

## 6. Real ownership cost

```
purchase price + additional expenses − current resale value  =  current real cost
current real cost ÷ recorded uses                            =  real cost per use
```

Resale value is the user's own estimate and reduces the cost of ownership, because that value has
not been consumed. Two edge cases are handled explicitly rather than clamped:

- **Resale above what was spent** — the cost comes out negative. The breakdown shows it and adds a
  sentence explaining what the negative number means, rather than hiding it at zero.
- **No recorded uses** — `calculateRealCostPerUse` returns `null` and the UI says "No usage data
  yet". Zero-usage items are also excluded from the insights average, because counting them as
  infinitely expensive would make the average meaningless. The Insights screen states how many
  items were excluded, so the figure stays honest.
- **A negative cost in the insights average** — an item worth more than it cost counts as zero per
  use there. Averaged as is, it pulled the figure below zero, which describes nothing a user has
  paid; a surplus on one item is not a discount on the others. The lowest-cost highlight keeps the
  real, negative figure, which is what the item's own screen and the sorted list show.

Expenses are aggregated by type for the breakdown, so it stays short whether there is one receipt or
twenty.

---

## 7. Persistence

**Migrations from version 1.** `PRAGMA user_version` tracks the schema; `MIGRATIONS` is an ordered
list; each runs inside a transaction and the version is bumped only on success, so a failure leaves
the database exactly as it was. A database written by a _newer_ build is refused rather than opened,
since continuing could corrupt data this build does not understand.

**Rows are untrusted.** `src/db/mappers.ts` validates every enum-like column against its known set
and falls back to a safe default, and coerces non-finite numbers. A row from an older build, or one
that was hand-edited, degrades instead of leaking an unexpected string into a `switch`.

**Partial updates keep two kinds of absence apart.** Every repository takes a `Partial<…>`, where
`undefined` means "leave this column alone" and `null` means "write NULL". Collapsing them either
way is silent and destructive: treating `undefined` as NULL would clear the photo and the notes when
someone corrects a name, and treating `null` as "skip" would make clearing a resale estimate
impossible — the one case where the user means "I no longer have a figure" rather than "zero".
`UpdateColumns` states that rule once instead of four times.

**Aggregates are computed in SQL.** `PurchaseRepository` joins usage totals and expense totals in
one query, so a list of purchases costs one round trip regardless of length. Cost per use is also
expressed in SQL, so the database can sort by it — with items that have no uses ordered last in both
directions, rather than pretending to be the cheapest or the most expensive.

**Every write names the entities it touched, and only a service can.** A screen that called a
repository directly would skip the invalidation below, and the failure is silent: the write lands,
and every other open screen keeps showing what was true a moment ago. The commitment form was the
last screen doing its own writes; `commitmentActions` and `dataActions` finished the pattern the
wishlist and purchase services had already set, and `reminderActions` took the reminder switch and
the language change out of the two settings screens that still read the open wishlist themselves.
Lint now rejects `repositories.x` in routes and in every component under `src/features` and
`src/components`, the settings provider excepted: they hand `useRepositories()` to a service and do
nothing else with it.

**Settings follow the same bus.** They are the one entity held in context rather than queried per
screen, because nearly everything needs the currency and the theme depends on them — but
`SettingsProvider` re-reads the row on every `invalidate('settings')`, exactly as a query would.
`updateSettings` still applies the saved row at once, so a control never paints its old position
for a frame; everything else that writes settings — the reset, the development seed, the reminders
switch — goes through a service and names the entity. Before, each of those had to remember to
reload the provider by hand, and resetting the data then navigated to onboarding itself; now the
reset only clears the onboarding flag, and the redirect that handles a first launch handles this
one too.

**Reads invalidate rather than cache.** `src/db/dataRevisions.ts` is a small pub/sub: a write names
the entities it touched, and every `useDatabaseQuery` watching those entities refetches. This is
deliberately not a normalised client cache — the data is a millisecond away on the same device, so
re-reading it is both cheaper and far simpler than keeping a cache in sync.

---

## 8. Theme

`src/theme` holds tokens only: `colors`, `spacing`, `radius`, `typography`, `sizes`, `elevation`.
Screens never hardcode a colour or a pixel value.

**Dark mode is designed, not inverted.** Surfaces get _lighter_ as they rise; borders replace
shadows, because a shadow is invisible against near-black; the accent is lifted so it keeps contrast.
`elevation(level, isDark)` resolves this once, so no component branches on the theme itself.

**Semantic colour never carries meaning alone.** Positive/warning/danger are always paired with a
label or an icon — "High financial impact", not an orange number. Green never means "good purchase"
and red never means "bad purchase"; they mark size, current value, and destructive actions.

**Font scaling is capped per role.** `maxFontSizeMultiplier` lets body copy scale generously (1.8×)
while keeping large metrics readable in side-by-side rows (1.3×). Unbounded scaling breaks the
three-column impact row on small screens.

---

## 9. Platform adapters

Anything that only exists on some platforms is isolated behind a module that degrades rather than
throws:

| Capability          | Module                                    | Off-platform behaviour                                                                |
| ------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| Local notifications | `src/notifications/cooldownNotifications` | Every function is a no-op on web and in Expo Go on Android; cooldowns are unaffected. |
| Image storage       | `src/features/images/itemImages`          | Web uses the picked URL directly.                                                     |
| Confirmation dialog | `src/utils/confirm`                       | Web uses `window.confirm`; `Alert` is unimplemented there.                            |
| Date picking        | `src/components/ui/DateField`             | Web renders a native `<input type="date">`.                                           |

The confirmation adapter knows no language. Both button labels are required, and screens reach it
only through `useConfirm()` (`src/features/dialogs/useConfirm`), which supplies the Cancel label from
the `t` the screen was rendered with; `no-restricted-imports` keeps the adapter itself out of reach.
The first version defaulted both labels in English, and every dialog in the app showed an English
Cancel to a reader in any other language: an optional label with a default is exactly the shape that
lets a literal slip past the catalogue tests, which only see the catalogues.

Notifications are the important one. They are **never** requested at launch — permission is asked
for the first time the user enables reminders, at the moment it is useful. A denied permission costs
nothing, because the countdown was never derived from a notification.

A tapped reminder **opens the item it is about**, including the tap that cold-starts the app
(`subscribeToCooldownReminderTaps`, wired up in the root layout). The cold-start tap is not delivered
to the listener, so the most recent response is read once as well, and the two paths are
de-duplicated by notification identifier. Landing the user on Home would waste the only interruption
the app allows itself.

`expo-notifications` is also **imported lazily**, not at module scope. Expo Go dropped the Android
notification service in SDK 53 and the package throws while its own module initialises there, so a
static import inside a module the root layout depends on would crash the app before the first screen
renders — reported, unhelpfully, as `Cannot read property 'ErrorBoundary' of undefined` from
expo-router. `localNotificationsUnavailableReason()` names the runtime that cannot schedule (`web`
platform or Expo Go on Android) and the module is loaded only when it can work, which is also what
lets Settings explain a disabled switch instead of showing a dead control.

The lazy load is a `require` inside a promise rather than a dynamic `import()`. Metro compiles both
to the same deferred require, but Jest runs in a CommonJS VM where a native `import()` throws — and
because the adapter swallows a failed load, that turned every function here into a silent no-op under
test, in the one module whose failure modes most need checking. Modernising it back to `import()`
would take the whole adapter out of its own test suite without failing anything.

---

## 10. Language

The app ships six languages. The choice is one setting, and it moves two things at once: the copy and
every `Intl` format. Half of one and half of the other — Italian sentences beside `13 Aug 2026` — is
the failure mode this design is arranged to make impossible.

**Language is not locale.** `AppSettings.language` holds `system | en | it | de | fr | es | ar`;
`LANGUAGE_LOCALES` maps each to the tag `Intl` formats with. The two are separate because they answer
different questions: i18next picks plural forms from the short code (six categories for Arabic, three
for Italian, French and Spanish, two for English and German), while grouping, decimal separators,
month names and the side the currency code sits on come from the full tag. Arabic is pinned to
`ar-u-ca-gregory-nu-latn` for two concrete reasons — ICU resolves plain `ar` to the Umm al-Qura
calendar in some regions, which would print a year the stored ISO date does not mean; and it emits
Arabic-Indic digits, which `centsToInputString` would put into a money field whose parser reads only
`0-9`, so the field would clear itself on blur and the amount would be lost with no error anywhere.
`currency.test.ts` round-trips every language through that exact path.

**The locale is a module singleton, applied during render.** `formatMoney`, `formatDate` and
`formatNumber` are pure functions that read `getLocale()` (`src/utils/locale.ts`) at call time —
threading a locale through a hundred call sites would be worse, and nothing about a formatter belongs
in React state. What that costs is an ordering requirement: the locale has to be set before the tree
below it renders, or one frame paints with the previous language's separators. `I18nProvider`
therefore applies the language in its render body rather than in an effect. That call writes module
state and notifies nothing, and it is derived only from its prop, which is what makes it safe to
repeat. Like `ThemeProvider` it is mounted
twice — once above the database gate, following the device, so "Opening your data" is already
translated; once below settings, following the stored preference.

**The translation function travels through context, not through an event.** This is the part that
had to be corrected after the first implementation shipped. `react-i18next` subscribes every
`useTranslation()` caller to i18next's `languageChanged` event, and `changeLanguage` emits it
synchronously — so applying the stored language while the inner provider rendered called `setState`
on `DatabaseGate`, which sits _above_ it and had already committed. React reports that as "Cannot
update a component while rendering a different component", and it is right to: a render must not
move state belonging to another part of the tree. Providing `t` through a context the provider owns
makes the change an ordinary top-down update for the subtree below, with no path back upwards. It
also gives each provider its own language, so the gate keeps rendering in the device's language
after the user picks another — which is what it was mounted to do. `I18nProvider.test.tsx` renders
that exact shape and asserts React logs no such warning.

**The domain still returns data.** Adding languages made the exceptions expensive rather than
untidy: `formatCooldownRemaining` returning `"6 days remaining"` would have needed a plural rule and
a noun inside a pure calculation. So `cooldownRemaining` returns a discriminated union,
`suggestCooldownDays` a `CooldownRationale` enum, `calculateOwnershipDuration` months and days, and
`INSIGHTS_RANGES` / `PURCHASE_SORTS` bare ids. The words live in `src/i18n/format.ts` and
`src/features/wishlist/cooldownText.ts`, both of which take `t` as a parameter — which is also what
makes them testable without React and what forces a caller to hold the `t` it was re-rendered with.

**Validation messages are built, not declared.** A Zod schema evaluated at module scope would freeze
its messages in whichever language loaded first, so each schema is a `build*(t)` factory memoised on
`t` in the form that uses it. It is rebuilt on a language change and on nothing else.

**Right-to-left is a platform adapter**, `src/i18n/rtl.ts`, because it behaves differently by
platform rather than because it might be missing: the web flips on the spot via the document `dir`,
while native records the flag in `I18nManager` and only lays out mirrored on the next launch. Yoga
resolves `flexDirection: 'row'` against that flag, so the layout mirrors itself; what does not are
physical offsets, which is why the codebase uses `marginStart` over `marginLeft` and `align="auto"`
over `align="left"`. Text that must not mirror — the wordmark, which is two pieces of text in a row
— pins `direction: 'ltr'`, or it reads "TwiceThink".

**Arabic is never letter-spaced.** Its letters join, and tracking pulls a word apart — wrong on its
own, and on Android it also made a one-line title measure narrower than it draws, so "الإعدادات" was
cut to "الإعدادا…". `AppText` reads the provider's language (`useLanguage`) and drops a role's
tracking for any language `writesInConnectedScript` names.

**Reminder copy is frozen by the operating system** at the moment it is scheduled, and a reflection
period can run for ninety days. A language change therefore re-schedules every pending reminder — the
same reasoning that already made an edited item re-schedule its own.

The catalogues are plain TypeScript objects, bundled rather than fetched, because every workflow has
to work in airplane mode. English is the source of truth and is typed into `t` itself
(`i18next.d.ts`), so a mistyped key fails to compile; the other five are checked at test time
instead, because a structural type cannot express that Arabic needs plural forms English does not
have.

---

## 11. Accessibility

- Icon-only controls take a **required** `accessibilityLabel` — the prop is not optional on
  `IconButton`, because that is the component most likely to ship without one.
- List rows are a single accessibility element with a composed label, so a screen reader announces
  "Rent, Housing, Monthly" rather than three disconnected fragments.
- Decorative visuals (category tiles, progress bars beside a printed figure) are hidden from
  assistive technology; the ring on the cooldown card carries a real `progressbar` role and value.
- Touch targets are at least 44pt; `IconButton` adds `hitSlop` when the glyph is smaller.
- Errors use `accessibilityRole="alert"` and sit next to the field they belong to.
- Selection state is exposed through `accessibilityState`, not through colour alone.

---

## 12. Deliberate non-goals

Kept in mind only so nothing forecloses them: cloud sync, accounts, export/backup, custom
categories, currency conversion, advanced insights.

The two decisions that keep those open are the repository boundary and the fact that every user-
facing string is in the UI layer rather than inside a domain function. The second of those is what
made localisation a matter of moving strings into catalogues rather than a rewrite.

Everything else — a backend, analytics, AI, bank integration, subscriptions — is out of scope, and
no scaffolding for it exists in the repository.
