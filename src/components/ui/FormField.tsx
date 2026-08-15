import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { AppText } from './AppText';

/**
 * Label, control, hint and inline error — the shape every field in the app uses.
 * Errors are announced as alerts and paired with the field's own label, so a
 * screen-reader user hears what failed and why.
 */

export type FormFieldProps = {
  label: string;
  /** Marks the field as required in the label and to assistive technology. */
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function FormField({
  label,
  required = false,
  hint,
  error,
  children,
  style,
}: FormFieldProps): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <View style={[{ gap: theme.spacing.xs }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xxs }}>
        <AppText variant="label" color="secondary">
          {label}
        </AppText>
        {required ? (
          <AppText variant="label" color="secondary" accessibilityLabel={t('common.required')}>
            *
          </AppText>
        ) : null}
      </View>

      {children}

      {error ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="tertiary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
