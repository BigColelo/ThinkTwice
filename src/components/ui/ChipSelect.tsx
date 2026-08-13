import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { FormField } from './FormField';

/**
 * A wrapping set of selectable chips — categories, expected usage, reflection
 * period, ownership duration.
 *
 * Chosen over a modal picker because every option set in ThinkTwice is short,
 * and seeing the choices makes the estimate the user is being asked for far
 * more concrete than a closed dropdown would.
 */

export type ChipOption<T extends string | number> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

export type ChipSelectProps<T extends string | number> = {
  label: string;
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

export function ChipSelect<T extends string | number>({
  label,
  options,
  value,
  onChange,
  required,
  hint,
  error,
  style,
}: ChipSelectProps<T>): React.ReactElement {
  const theme = useTheme();

  return (
    <FormField label={label} required={required} hint={hint} error={error} style={style}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          const Icon = option.icon;

          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected, checked: isSelected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xxs + 2,
                  minHeight: theme.sizes.control.sm,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.radius.md,
                  borderWidth: isSelected ? 1.5 : theme.sizes.hairline,
                  borderColor: isSelected ? theme.colors.accent.base : theme.colors.border,
                  backgroundColor: isSelected ? theme.colors.accent.soft : theme.colors.surface,
                },
                pressed ? { opacity: 0.7 } : null,
              ]}
            >
              {Icon ? (
                <Icon
                  size={theme.sizes.icon.sm}
                  color={isSelected ? theme.colors.accent.onSoft : theme.colors.text.secondary}
                  strokeWidth={theme.sizes.iconStrokeWidth}
                />
              ) : null}
              <AppText
                variant="label"
                color={isSelected ? 'accent' : 'secondary'}
                style={isSelected ? { color: theme.colors.accent.onSoft } : undefined}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </FormField>
  );
}
