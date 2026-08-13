import { forwardRef, useState } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { FormField } from './FormField';

/**
 * A single-line (or multiline) text input wrapped in the app's field layout.
 * Focus is shown with an accent border plus a change in border weight, so the
 * state is visible without relying on colour perception.
 */

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Rendered inside the input, before the text — e.g. a currency symbol. */
  prefix?: string;
  /** Rendered inside the input, after the text — e.g. a unit. */
  suffix?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    required,
    hint,
    error,
    prefix,
    suffix,
    containerStyle,
    onFocus,
    onBlur,
    multiline,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger.base
    : isFocused
      ? theme.colors.accent.base
      : theme.colors.border;

  return (
    <FormField label={label} required={required} hint={hint} error={error} style={containerStyle}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: theme.spacing.xs,
          minHeight: theme.sizes.control.lg,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: multiline ? theme.spacing.sm : 0,
          borderRadius: theme.radius.md,
          borderWidth: isFocused || error ? 1.5 : theme.sizes.hairline,
          borderColor,
          backgroundColor: theme.colors.surface,
        }}
      >
        {prefix ? (
          <AppText variant="body" color="secondary">
            {prefix}
          </AppText>
        ) : null}

        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.text.tertiary}
          selectionColor={theme.colors.accent.base}
          multiline={multiline}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...rest}
          style={[
            theme.typography.body,
            {
              flex: 1,
              color: theme.colors.text.primary,
              paddingVertical: multiline ? 0 : theme.spacing.sm,
              minHeight: multiline ? 80 : undefined,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
        />

        {suffix ? (
          <AppText variant="body" color="secondary">
            {suffix}
          </AppText>
        ) : null}
      </View>
    </FormField>
  );
});
