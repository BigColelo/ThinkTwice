import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText, type TextColor } from './AppText';
import { Card } from './Card';

/**
 * A labelled figure — the Insights "Spent / €4,820" tiles and the paired
 * "58 uses / €31.02 cost per use" panel on a purchase.
 *
 * The label sits above the value so the number is what the eye lands on.
 */

export type StatCardProps = {
  label: string;
  /** Usually a `MoneyValue`; plain strings are wrapped in the metric style. */
  value: React.ReactNode;
  caption?: string;
  tone?: 'surface' | 'muted' | 'positive' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function StatCard({
  label,
  value,
  caption,
  tone = 'surface',
  style,
}: StatCardProps): React.ReactElement {
  const theme = useTheme();

  const background =
    tone === 'positive'
      ? theme.colors.positive.soft
      : tone === 'danger'
        ? theme.colors.danger.soft
        : undefined;

  return (
    <Card
      variant={tone === 'muted' ? 'muted' : 'surface'}
      padding={theme.spacing.md}
      style={[background ? { backgroundColor: background, borderWidth: 0 } : null, style]}
    >
      <AppText variant="caption" color="secondary" numberOfLines={1}>
        {label}
      </AppText>
      <View style={{ marginTop: theme.spacing.xxs }}>
        {typeof value === 'string' ? <AppText variant="metric">{value}</AppText> : value}
      </View>
      {caption ? (
        <AppText variant="caption" color="tertiary" style={{ marginTop: 2 }} numberOfLines={1}>
          {caption}
        </AppText>
      ) : null}
    </Card>
  );
}

/**
 * A compact figure inside an existing card — the three columns of the Home
 * summary (Net income / Commitments / Savings goal) and the purchase-impact row.
 */
export type MetricCellProps = {
  label: string;
  value: React.ReactNode;
  valueColor?: TextColor;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
};

export function MetricCell({
  label,
  value,
  valueColor = 'primary',
  align = 'center',
  style,
}: MetricCellProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={[{ flex: 1, alignItems: align === 'center' ? 'center' : 'flex-start' }, style]}>
      {typeof value === 'string' ? (
        <AppText variant="metricSmall" color={valueColor} numberOfLines={1}>
          {value}
        </AppText>
      ) : (
        value
      )}
      <AppText
        variant="caption"
        color="secondary"
        // `auto` rather than `left`, so the label follows the writing
        // direction instead of pinning itself to the left in Arabic.
        align={align === 'center' ? 'center' : 'auto'}
        style={{ marginTop: theme.spacing.xxs }}
      >
        {label}
      </AppText>
    </View>
  );
}

/** Vertical hairline between `MetricCell`s. */
export function MetricDivider(): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={{
        width: theme.sizes.hairline,
        alignSelf: 'stretch',
        backgroundColor: theme.colors.divider,
        marginHorizontal: theme.spacing.xs,
      }}
    />
  );
}
