import React, { useState } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

import { useCurrency } from '@/features/settings/SettingsProvider';
import type { Cents } from '@/types/domain';
import { centsToInputString, currencySymbol, parseMoneyInput } from '@/utils/currency';

import { TextField } from './TextField';

/**
 * Money input.
 *
 * The user types freely; the text is parsed to integer cents on every keystroke
 * (so a live preview can update) and normalised on blur (so `17,9` becomes
 * `17.90`). The parent only ever sees cents — never a string, never a float.
 */

export type MoneyFieldProps = {
  label: string;
  valueCents: Cents | null;
  onChangeCents: (cents: Cents | null) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  placeholder?: string;
  autoFocus?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function MoneyField({
  label,
  valueCents,
  onChangeCents,
  required,
  hint,
  error,
  placeholder = '0',
  autoFocus,
  containerStyle,
  testID,
}: MoneyFieldProps): React.ReactElement {
  const currency = useCurrency();
  const [text, setText] = useState(() => centsToInputString(valueCents));
  const [isEditing, setIsEditing] = useState(false);
  const [lastSyncedCents, setLastSyncedCents] = useState(valueCents);

  // Adopt external changes (a form reset, a prefilled edit) while the user is
  // not typing, so we never fight them for control of the field. Adjusting
  // state during render rather than in an effect avoids rendering one frame
  // with the stale text.
  if (!isEditing && valueCents !== lastSyncedCents) {
    setLastSyncedCents(valueCents);
    setText(centsToInputString(valueCents));
  }

  return (
    <TextField
      testID={testID}
      label={label}
      required={required}
      hint={hint}
      error={error}
      prefix={currencySymbol(currency)}
      value={text}
      placeholder={placeholder}
      autoFocus={autoFocus}
      // `decimal-pad` gives a separator without the extra symbols of a full keyboard.
      keyboardType={Platform.select({
        ios: 'decimal-pad',
        android: 'decimal-pad',
        default: 'numeric',
      })}
      inputMode="decimal"
      containerStyle={containerStyle}
      onFocus={() => setIsEditing(true)}
      onChangeText={(next) => {
        setText(next);
        onChangeCents(parseMoneyInput(next));
      }}
      onBlur={() => {
        setIsEditing(false);
        const parsed = parseMoneyInput(text);
        setText(centsToInputString(parsed));
        onChangeCents(parsed);
      }}
    />
  );
}
