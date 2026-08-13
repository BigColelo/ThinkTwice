import { darkColors, lightColors, resolveTint, type ColorScheme } from './colors';
import { tint, type TintName } from './palette';

/**
 * Contrast is a product requirement, not a review checklist item, so it is
 * enforced here. Every text colour must clear WCAG AA against every surface it
 * can actually appear on — and it is easy to lighten a "muted" token by one
 * step and quietly drop below the line, which is exactly what this catches.
 */

const AA_NORMAL_TEXT = 4.5;
/** WCAG's threshold for large text (≥18.66px, or ≥14px bold) and UI components. */
const AA_LARGE_TEXT = 3;

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => {
    const srgb = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Surfaces body text is rendered on in each scheme. */
function textBackgrounds(scheme: ColorScheme): { name: string; color: string }[] {
  return [
    { name: 'background', color: scheme.background },
    { name: 'surface', color: scheme.surface },
    { name: 'surfaceMuted', color: scheme.surfaceMuted },
    { name: 'surfaceSunken', color: scheme.surfaceSunken },
    { name: 'chrome', color: scheme.chrome },
  ];
}

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('%s scheme contrast', (schemeName, scheme) => {
  const backgrounds = textBackgrounds(scheme);

  it.each(['primary', 'secondary', 'tertiary'] as const)(
    'text.%s clears AA on every surface',
    (role) => {
      for (const background of backgrounds) {
        const ratio = contrastRatio(scheme.text[role], background.color);
        expect({
          scheme: schemeName,
          role,
          on: background.name,
          ratio: Math.round(ratio * 100) / 100,
        }).toEqual(expect.objectContaining({ ratio: expect.any(Number) }));
        expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    },
  );

  it('keeps a readable hierarchy between primary, secondary and tertiary', () => {
    const primary = contrastRatio(scheme.text.primary, scheme.surface);
    const secondary = contrastRatio(scheme.text.secondary, scheme.surface);
    const tertiary = contrastRatio(scheme.text.tertiary, scheme.surface);

    expect(primary).toBeGreaterThan(secondary);
    expect(secondary).toBeGreaterThan(tertiary);
  });

  it('renders text on the accent colour legibly', () => {
    expect(contrastRatio(scheme.text.onAccent, scheme.accent.base)).toBeGreaterThanOrEqual(
      AA_LARGE_TEXT,
    );
  });

  it.each(['positive', 'warning', 'danger', 'info'] as const)(
    '%s status text clears AA on its own soft background',
    (status) => {
      expect(contrastRatio(scheme[status].onSoft, scheme[status].soft)).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT,
      );
    },
  );

  it.each(['positive', 'warning', 'danger'] as const)(
    '%s figures clear AA against the surfaces they appear on',
    (status) => {
      for (const background of [scheme.surface, scheme.background]) {
        expect(contrastRatio(scheme[status].base, background)).toBeGreaterThanOrEqual(
          AA_NORMAL_TEXT,
        );
      }
    },
  );

  it.each(Object.keys(tint) as TintName[])(
    '%s category icons stay distinguishable on their tinted tile',
    (name) => {
      const resolved = resolveTint(name, schemeName === 'dark');
      // Icons are non-text content, so the applicable threshold is 3:1.
      expect(contrastRatio(resolved.base, resolved.soft)).toBeGreaterThanOrEqual(AA_LARGE_TEXT);
    },
  );
});
