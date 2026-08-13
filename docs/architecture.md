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

Two invariants hold this together:

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

---

## 2. Money

**Integer minor units, always.** `priceCents: 179900`, never `price: 1799.00`. Field names carry
the `Cents` suffix so a euro value cannot be assigned by accident. SQLite stores them as `INTEGER`.

**One formatting module.** `src/utils/currency.ts` owns every conversion between money and text.
Components never call `Intl` directly — they render `<MoneyValue cents={…} />`, which applies the
active currency from settings. Changing how money looks is a change in one file.

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

**Aggregates are computed in SQL.** `PurchaseRepository` joins usage totals and expense totals in
one query, so a list of purchases costs one round trip regardless of length. Cost per use is also
expressed in SQL, so the database can sort by it — with items that have no uses ordered last in both
directions, rather than pretending to be the cheapest or the most expensive.

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

---

## 10. Accessibility

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

## 11. Deliberate non-goals

Kept in mind only so nothing forecloses them: cloud sync, accounts, export/backup, custom
categories, more currencies, localisation, advanced insights.

The two decisions that keep those open are the repository boundary and the fact that every user-
facing string is in the UI layer rather than inside a domain function. Neither costs anything today.

Everything else — a backend, analytics, AI, bank integration, subscriptions — is out of scope, and
no scaffolding for it exists in the repository.
