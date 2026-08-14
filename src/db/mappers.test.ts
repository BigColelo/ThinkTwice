import { mapAppSettings, type AppSettingsRow } from './mappers';

/**
 * The mapper is the only thing standing between a stored row and the app, so
 * the cases worth testing are the ones where the row is *not* what this build
 * would have written.
 */

function settingsRow(overrides: Partial<AppSettingsRow> = {}): AppSettingsRow {
  return {
    currency_code: 'EUR',
    theme_mode: 'system',
    monthly_net_income_cents: 165_000,
    monthly_savings_target_cents: null,
    onboarding_completed: 1,
    cooldown_reminders_enabled: 0,
    created_at: '2026-08-13T09:00:00.000Z',
    updated_at: '2026-08-13T09:00:00.000Z',
    ...overrides,
  };
}

describe('mapAppSettings', () => {
  it('reads a row written by this build', () => {
    const settings = mapAppSettings(settingsRow());

    expect(settings.currencyCode).toBe('EUR');
    expect(settings.themeMode).toBe('system');
    expect(settings.monthlyNetIncomeCents).toBe(165_000);
    expect(settings.monthlySavingsTargetCents).toBeNull();
    expect(settings.onboardingCompleted).toBe(true);
  });

  it('falls back to EUR for a currency the app does not offer', () => {
    // A code stored by another build would otherwise leave the user looking at
    // a symbol with no control to change it back.
    expect(mapAppSettings(settingsRow({ currency_code: 'USD' })).currencyCode).toBe('EUR');
    expect(mapAppSettings(settingsRow({ currency_code: 'nonsense' })).currencyCode).toBe('EUR');
  });

  it('never lets a non-finite amount out of the database', () => {
    const settings = mapAppSettings(
      settingsRow({
        monthly_net_income_cents: Number.NaN,
        monthly_savings_target_cents: Number.POSITIVE_INFINITY,
      }),
    );

    expect(settings.monthlyNetIncomeCents).toBe(0);
    expect(settings.monthlySavingsTargetCents).toBeNull();
  });
});
