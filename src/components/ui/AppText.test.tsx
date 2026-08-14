import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { maxFontSizeMultiplier } from '@/theme/typography';

import { AppText } from './AppText';

/**
 * Every piece of text in the app goes through here, so this is the one place that
 * can promise the OS text-size setting is honoured — and honoured with a ceiling
 * per role, because a metric that doubles in width collapses the row it shares
 * while body copy at double size is exactly what the setting was turned on for.
 */

describe('AppText', () => {
  it('lets the OS text size through', async () => {
    await renderWithProviders(<AppText>Body copy</AppText>);

    expect(screen.getByText('Body copy').props.allowFontScaling).toBe(true);
  });

  it('caps scaling per typography role', async () => {
    await renderWithProviders(
      <>
        <AppText variant="caption">A caption</AppText>
        <AppText variant="metricLarge">€867</AppText>
      </>,
    );

    expect(screen.getByText('A caption').props.maxFontSizeMultiplier).toBe(
      maxFontSizeMultiplier.caption,
    );
    expect(screen.getByText('€867').props.maxFontSizeMultiplier).toBe(
      maxFontSizeMultiplier.metricLarge,
    );
  });

  it('lets small text grow more than a large figure, not less', async () => {
    // The ceiling exists for layout, and layout is threatened by the big numbers.
    expect(maxFontSizeMultiplier.caption).toBeGreaterThan(maxFontSizeMultiplier.metricLarge);
    expect(maxFontSizeMultiplier.metric).toBeGreaterThanOrEqual(maxFontSizeMultiplier.metricLarge);
  });

  it('gives every role a ceiling, and never one that shrinks the text', async () => {
    for (const [role, multiplier] of Object.entries(maxFontSizeMultiplier)) {
      expect({ role, multiplier }).toEqual({ role, multiplier: expect.any(Number) });
      expect(multiplier).toBeGreaterThanOrEqual(1);
    }
  });
});
