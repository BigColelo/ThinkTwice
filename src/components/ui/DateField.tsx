import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { IsoDate } from '@/types/domain';
import { formatDate, parseIsoDate, toIsoDate } from '@/utils/dates';

import { AppText } from './AppText';
import { Button } from './Button';
import { FormField } from './FormField';

/**
 * Calendar-date input backed by the platform picker.
 *
 * The native picker is used because date entry is a place where platform
 * conventions matter and a hand-rolled control would be worse on every axis —
 * localisation, accessibility and muscle memory. On web the component falls
 * back to the browser's own date input, so the build never breaks there.
 */

export type DateFieldProps = {
  label: string;
  value: IsoDate;
  onChange: (value: IsoDate) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Dates after this are not selectable. Defaults to today (no future purchases). */
  maximumDate?: Date;
  minimumDate?: Date;
};

export function DateField({
  label,
  value,
  onChange,
  required,
  hint,
  error,
  maximumDate = new Date(),
  minimumDate,
}: DateFieldProps): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  const selected = parseIsoDate(value) ?? new Date();

  if (Platform.OS === 'web') {
    return (
      <FormField label={label} required={required} hint={hint} error={error}>
        <WebDateInput
          value={value}
          onChange={onChange}
          max={toIsoDate(maximumDate)}
          min={minimumDate ? toIsoDate(minimumDate) : undefined}
        />
      </FormField>
    );
  }

  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('form.dateFieldLabel', { label, date: formatDate(value) })}
        accessibilityHint={t('form.dateFieldHint')}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            minHeight: theme.sizes.control.lg,
            paddingHorizontal: theme.spacing.sm,
            borderRadius: theme.radius.md,
            borderWidth: error ? 1.5 : theme.sizes.hairline,
            borderColor: error ? theme.colors.danger.base : theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
          pressed ? { opacity: 0.7 } : null,
        ]}
      >
        <Calendar
          size={theme.sizes.icon.md}
          color={theme.colors.text.secondary}
          strokeWidth={theme.sizes.iconStrokeWidth}
        />
        <AppText variant="body">{formatDate(value)}</AppText>
      </Pressable>

      {isOpen ? (
        <View>
          <DateTimePicker
            value={selected}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            accentColor={theme.colors.accent.base}
            themeVariant={theme.isDark ? 'dark' : 'light'}
            onValueChange={(_event, date) => {
              // Android dismisses itself; iOS keeps the inline picker mounted
              // until the user confirms with the Done button below.
              if (Platform.OS !== 'ios') setIsOpen(false);
              if (!date) return;
              onChange(toIsoDate(date));
            }}
            onDismiss={() => setIsOpen(false)}
          />
          {Platform.OS === 'ios' ? (
            <Button
              label={t('common.done')}
              variant="secondary"
              size="md"
              onPress={() => setIsOpen(false)}
            />
          ) : null}
        </View>
      ) : null}
    </FormField>
  );
}

/**
 * Web fallback. `react-native-web` renders unknown elements through React DOM,
 * so a native `<input type="date">` is the simplest correct control here.
 */
function WebDateInput({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (value: IsoDate) => void;
  min?: string;
  max?: string;
}): React.ReactElement {
  const theme = useTheme();

  return React.createElement('input', {
    type: 'date',
    value,
    min,
    max,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    style: {
      height: theme.sizes.control.lg,
      paddingLeft: theme.spacing.sm,
      paddingRight: theme.spacing.sm,
      borderRadius: theme.radius.md,
      border: `1px solid ${theme.colors.border}`,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text.primary,
      fontSize: 15,
      width: '100%',
      boxSizing: 'border-box',
    },
  });
}
