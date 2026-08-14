import { screen } from '@testing-library/react-native';

import { calculateCooldownState } from '@/domain';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CooldownCard } from './CooldownCard';

/**
 * The reflection period as the user reads it.
 *
 * The arithmetic is covered in `domain/wishlist/cooldown.test.ts`; the state here
 * is built with the same domain function rather than hand-written, so these tests
 * cannot describe a countdown the app could never produce. What is asserted is
 * the translation into words — including that the ring never carries meaning on
 * its own, and that a finished period says so plainly instead of showing zero.
 */

const NOW = new Date('2026-08-13T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const isoDaysFrom = (days: number): string => new Date(NOW.getTime() + days * DAY_MS).toISOString();

function stateFor({
  cooldownDays = 7,
  startedDaysAgo = 1,
  endsInDays = 6,
}: { cooldownDays?: number; startedDaysAgo?: number; endsInDays?: number } = {}) {
  return calculateCooldownState(
    {
      cooldownDays,
      cooldownStartedAt: isoDaysFrom(-startedDaysAgo),
      cooldownEndsAt: isoDaysFrom(endsInDays),
    },
    NOW,
  );
}

describe('CooldownCard, in progress', () => {
  it('writes out the time left and the period the user chose', async () => {
    await renderWithProviders(<CooldownCard state={stateFor()} cooldownDays={7} />);

    expect(screen.getByText('6 days remaining')).toBeTruthy();
    expect(screen.getByText('You chose to reconsider this after 7 days.')).toBeTruthy();
    // The end date is stated too, so the countdown can be checked against a calendar.
    expect(screen.getByText(/^Ends /)).toBeTruthy();
  });

  it('describes the ring for anyone not looking at the arc', async () => {
    await renderWithProviders(<CooldownCard state={stateFor()} cooldownDays={7} />);

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByLabelText('6 of 7 days remaining')).toBeTruthy();
  });

  it('switches to hours on the last day, where "0 days" would read as finished', async () => {
    await renderWithProviders(
      <CooldownCard
        state={stateFor({ startedDaysAgo: 6.75, endsInDays: 0.25 })}
        cooldownDays={7}
      />,
    );

    expect(screen.getByText('6 hours remaining')).toBeTruthy();
  });

  it('says "1 day" rather than "1 days"', async () => {
    await renderWithProviders(
      <CooldownCard
        state={stateFor({ cooldownDays: 1, startedDaysAgo: 0.5, endsInDays: 0.5 })}
        cooldownDays={1}
      />,
    );

    expect(screen.getByText('You chose to reconsider this after 1 day.')).toBeTruthy();
  });
});

describe('CooldownCard, complete', () => {
  const complete = stateFor({ startedDaysAgo: 8, endsInDays: -1 });

  it('states that the period is over and hands the decision back', async () => {
    await renderWithProviders(<CooldownCard state={complete} cooldownDays={7} />);

    expect(screen.getByText('Reflection period complete')).toBeTruthy();
    expect(
      screen.getByText('You have had time to think it over. The decision is yours.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Reflection period complete')).toBeTruthy();
  });

  it('drops the end date, which has nothing left to say', async () => {
    await renderWithProviders(<CooldownCard state={complete} cooldownDays={7} />);

    expect(screen.queryByText(/^Ends /)).toBeNull();
  });

  it('treats unreadable dates as a finished period rather than a stuck countdown', async () => {
    const broken = calculateCooldownState(
      { cooldownDays: 7, cooldownStartedAt: 'not-a-date', cooldownEndsAt: 'also-not-a-date' },
      NOW,
    );

    await renderWithProviders(<CooldownCard state={broken} cooldownDays={7} />);

    expect(screen.getByText('Reflection period complete')).toBeTruthy();
    expect(screen.queryByText(/NaN|Invalid/)).toBeNull();
  });
});

describe('CooldownCard, wording and theme', () => {
  it('never argues for or against the purchase', async () => {
    await renderWithProviders(<CooldownCard state={stateFor()} cooldownDays={7} />);

    for (const phrase of [/should/i, /afford/i, /waste/i, /good/i, /bad/i]) {
      expect(screen.queryByText(phrase)).toBeNull();
    }
  });

  it('renders in dark mode without changing what it says', async () => {
    await renderWithProviders(<CooldownCard state={stateFor()} cooldownDays={7} />, {
      themeMode: 'dark',
    });

    expect(screen.getByText('6 days remaining')).toBeTruthy();
    expect(screen.getByLabelText('6 of 7 days remaining')).toBeTruthy();
  });
});
