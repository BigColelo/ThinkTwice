import { screen } from '@testing-library/react-native';

import { calculateCooldownState } from '@/domain';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CooldownCard } from './CooldownCard';

/**
 * One screen, rendered in each language.
 *
 * The catalogue tests prove the keys are all there; this proves they reach the
 * screen. The card is a good sample because it exercises the two things most
 * likely to be half-translated: a counted noun that needs a plural rule, and a
 * date that has to be formatted in the same language as the sentence around it.
 */

const NOW = new Date('2026-08-13T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const isoDaysFrom = (days: number): string => new Date(NOW.getTime() + days * DAY_MS).toISOString();

const state = calculateCooldownState(
  {
    cooldownDays: 7,
    cooldownStartedAt: isoDaysFrom(-1),
    cooldownEndsAt: isoDaysFrom(6),
  },
  NOW,
);

describe('the reflection card in every language', () => {
  it.each([
    ['en', '6 days remaining', '19 Aug 2026'],
    ['it', 'Mancano 6 giorni', '19 ago 2026'],
    ['de', 'Noch 6 Tage', '19. Aug. 2026'],
    ['fr', 'Il reste 6 jours', '19 août 2026'],
    ['es', 'Quedan 6 días', '19 ago 2026'],
    ['ar', 'بقيت 6 أيام', '2026'],
  ] as const)(
    '%s writes the remaining time and the end date',
    async (language, remaining, date) => {
      await renderWithProviders(<CooldownCard state={state} cooldownDays={7} />, { language });

      expect(screen.getByText(remaining)).toBeTruthy();
      expect(screen.getByText(new RegExp(date.replace(/\./g, '\\.')))).toBeTruthy();
    },
  );

  it('uses the Arabic dual form for exactly two days, which no _other form covers', async () => {
    const twoDays = calculateCooldownState(
      { cooldownDays: 7, cooldownStartedAt: isoDaysFrom(-5), cooldownEndsAt: isoDaysFrom(2) },
      NOW,
    );

    await renderWithProviders(<CooldownCard state={twoDays} cooldownDays={7} />, {
      language: 'ar',
    });

    expect(screen.getByText('بقي يومان')).toBeTruthy();
  });
});
