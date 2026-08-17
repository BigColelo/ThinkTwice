import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { useCurrency } from '@/features/settings/SettingsProvider';
import { useT } from '@/i18n';
import type { TypographyRole } from '@/theme';
import type { Cents } from '@/types/domain';
import { formatMoney, formatMoneyCompact, type MoneyDecimals } from '@/utils/currency';

import { AppText, type TextColor } from './AppText';

/**
 * Renders an amount. Components never call `formatMoney` themselves — going
 * through here means the active currency is always applied and a change to
 * money presentation happens in exactly one place.
 */

export type MoneyValueProps = {
  /** Integer cents. Derived rates (cost per use) may be fractional. */
  cents: Cents | null | undefined;
  variant?: TypographyRole;
  color?: TextColor;
  decimals?: MoneyDecimals;
  /** Shows `+` in front of positive values, e.g. in an expense breakdown. */
  showPositiveSign?: boolean;
  compact?: boolean;
  /** Appended after the amount, e.g. ` / use`. */
  suffix?: string;
  /** Shown when `cents` is null — never a `NaN` or an empty gap. Defaults to a dash. */
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
};

export function MoneyValue({
  cents,
  variant = 'body',
  color = 'primary',
  decimals = 'auto',
  showPositiveSign = false,
  compact = false,
  suffix,
  placeholder,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
}: MoneyValueProps): React.ReactElement {
  const currency = useCurrency();
  const t = useT();

  const text =
    cents == null || !Number.isFinite(cents)
      ? (placeholder ?? t('common.noValue'))
      : (compact ? formatMoneyCompact : formatMoney)(cents, {
          currency,
          decimals,
          signDisplay: showPositiveSign,
        });

  return (
    <AppText
      variant={variant}
      color={color}
      style={style}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
    >
      {suffix ? `${text}${suffix}` : text}
    </AppText>
  );
}

/**
 * `EUR 18.26 / use` — the cost-per-use figure that appears throughout the app.
 * Always two decimals, because a rate rounded to whole euros hides the point.
 */
export function CostPerUse({
  cents,
  variant = 'body',
  color = 'primary',
  placeholder,
  style,
}: Pick<
  MoneyValueProps,
  'cents' | 'variant' | 'color' | 'placeholder' | 'style'
>): React.ReactElement {
  const currency = useCurrency();
  const t = useT();

  if (cents == null || !Number.isFinite(cents)) {
    return (
      <AppText variant={variant} color="tertiary" style={style}>
        {placeholder ?? t('purchases.noUsageData')}
      </AppText>
    );
  }

  return (
    <AppText variant={variant} color={color} style={style}>
      {`${formatMoney(cents, { currency, decimals: 'always' })} ${t('units.perUse')}`}
    </AppText>
  );
}
