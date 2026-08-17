import { Check } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ListRow, RowDivider } from '@/components/ui/ListRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  CURRENCIES,
  CURRENCY_REGIONS,
  SUGGESTED_CURRENCIES,
  type Currency,
} from '@/constants/currencies';
import { LANGUAGE_NATIVE_NAMES, useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { CurrencyCode, LanguageCode } from '@/types/domain';

/**
 * The currencies the app offers, grouped, as a list of radios.
 *
 * Only the list lives here — the screen at `/settings/currency` is a header,
 * this component and a caption. Keeping it out of `src/app` is what makes it
 * testable: a `*.test.tsx` under the routes directory would be matched by Expo
 * Router's route context and shipped as a real screen.
 *
 * Each row is named in the reading language with its ISO code underneath. The
 * code is the supporting line rather than a decoration because it is the label
 * every amount in the app now carries — `EUR 1,650` — so the list has to teach
 * the code. There are no symbols here, for the reason in `src/utils/currency`.
 */

type Translate = ReturnType<typeof useT>;

type CurrencySection = {
  id: string;
  heading: string;
  options: readonly Currency[];
};

/**
 * The suggested group first, then the regions.
 *
 * A currency appears in exactly one section. Repeating the suggested ones inside
 * their own region would put two radios with the same label on the same screen,
 * and both would announce themselves as selected when that currency is the
 * chosen one — a tick shown twice is not a shortcut, it is a second answer.
 */
function buildSections(t: Translate, language: LanguageCode): readonly CurrencySection[] {
  const suggested = SUGGESTED_CURRENCIES[language];
  const isSuggested = new Set<CurrencyCode>(suggested);
  const byCode = new Map(CURRENCIES.map((currency) => [currency.code, currency]));

  const sections: CurrencySection[] = [
    {
      id: 'suggested',
      heading: t('settings.currency.regions.suggested', {
        language: LANGUAGE_NATIVE_NAMES[language],
      }),
      // Left in the order the suggestion list gives them, which is the order
      // someone reading that language is most likely to want them in.
      options: suggested.flatMap((code) => byCode.get(code) ?? []),
    },
    ...CURRENCY_REGIONS.map((region) => ({
      id: region.id,
      heading: t(region.labelKey),
      options: CURRENCIES.filter(
        (currency) => currency.region === region.id && !isSuggested.has(currency.code),
      ),
    })),
  ];

  // A region emptied by the suggestions above it would otherwise leave a heading
  // standing over nothing.
  return sections.filter((section) => section.options.length > 0);
}

export type CurrencyPickerProps = {
  value: CurrencyCode;
  /**
   * The language the list is read in, which is also the language the suggestions
   * are for. Passed in rather than resolved here so the component renders — and
   * tests — without a database, and so the suggested group can never disagree
   * with the copy around it.
   */
  language: LanguageCode;
  onSelect: (code: CurrencyCode) => void;
};

export function CurrencyPicker({
  value,
  language,
  onSelect,
}: CurrencyPickerProps): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  const sections = useMemo(() => buildSections(t, language), [t, language]);

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <View key={section.id}>
          {sectionIndex > 0 ? <View style={{ height: theme.spacing.xl }} /> : null}
          <SectionHeader title={section.heading} />
          <Card padding={theme.spacing.md}>
            {section.options.map((currency, index) => (
              <View key={currency.code}>
                {index > 0 ? <RowDivider /> : null}
                <ListRow
                  title={t(currency.nameKey)}
                  subtitle={currency.code}
                  // The tick is paired with `selected` rather than carrying the
                  // meaning on its own, so the row is announced as chosen.
                  trailing={
                    currency.code === value ? (
                      <Check
                        size={theme.sizes.icon.md}
                        color={theme.colors.accent.base}
                        strokeWidth={theme.sizes.iconStrokeWidth}
                      />
                    ) : undefined
                  }
                  selected={currency.code === value}
                  onPress={() => onSelect(currency.code)}
                />
              </View>
            ))}
          </Card>
        </View>
      ))}
    </>
  );
}
