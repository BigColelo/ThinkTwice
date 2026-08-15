import type { TFunction } from 'i18next';

import type { CooldownRemaining } from '@/domain';

/**
 * How much of a reflection period is left, in words.
 *
 * The domain reports the four cases as data (`cooldownRemaining`); saying them
 * is the UI's job, because "6 days remaining" needs a plural rule and a noun,
 * neither of which belongs in a pure calculation.
 */

export function cooldownRemainingText(t: TFunction, remaining: CooldownRemaining): string {
  switch (remaining.kind) {
    case 'complete':
      return t('cooldown.complete');
    case 'under_an_hour':
      return t('cooldown.underAnHour');
    case 'hours':
      return t('cooldown.hoursRemaining', { count: remaining.hours });
    case 'days':
      return t('cooldown.daysRemaining', { count: remaining.days });
  }
}

/** Compact form for list rows: `6 days left`. */
export function cooldownRemainingShortText(t: TFunction, remaining: CooldownRemaining): string {
  switch (remaining.kind) {
    case 'complete':
      return t('cooldown.readyToDecide');
    // Under an hour still reads as one hour rather than none: a row saying "0h
    // left" would look like the period had already ended.
    case 'under_an_hour':
      return t('cooldown.hoursLeftShort', { hours: 1 });
    case 'hours':
      return t('cooldown.hoursLeftShort', { hours: remaining.hours });
    case 'days':
      return t('cooldown.daysLeftShort', { count: remaining.days });
  }
}
