import React from 'react';
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { View } from 'react-native';

import { ChipSelect } from '@/components/ui/ChipSelect';
import { TextField } from '@/components/ui/TextField';
import { OWNERSHIP_PRESETS } from '@/constants/ownership';
import { USAGE_PRESETS } from '@/constants/usagePresets';
import { formatMonthsAsDuration, useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { UsageFrequencyId } from '@/types/domain';

/**
 * "How often will you use it, and for how long?" — the two answers every
 * estimate in the app is built from.
 *
 * Both forms ask them, and asked them in two copies of the same fifty lines: the
 * same presets, the same hint that makes each preset's assumption visible, the
 * same escape hatch for a custom rate, and the same rule that choosing a preset
 * clears a custom rate which no longer applies. The copies differed only in
 * their labels, which is what this takes as a prop.
 *
 * The wishlist form requires an answer and the owned-purchase form does not —
 * something bought years ago may never have had an expectation, and inventing
 * one after the fact would be worse than leaving it unset. That difference lives
 * in the two schemas, not here.
 */

/** The three fields a form must carry for this group to write into it. */
export type ExpectedUsageValues = {
  expectedUsageFrequency: UsageFrequencyId | null;
  customUsesPerMonth: number | null;
  expectedOwnershipMonths: number | null;
};

export type ExpectedUsageLabels = {
  frequency: string;
  usesPerMonth: string;
  ownership: string;
};

/**
 * Narrows a form's own `control` to the three fields this group touches.
 *
 * React Hook Form types `control` by the whole form, so a component shared
 * between two different forms cannot be written against both without either a
 * generic parameter — which makes every `name` and every `field.value` inside it
 * a cast, eight of them, each one a place a genuine mistake could hide — or one
 * cast here.
 *
 * This is the one. The `T extends ExpectedUsageValues` constraint is what keeps
 * it honest: a form that renamed a field or dropped one fails to compile at the
 * call site, which is the mistake actually worth catching. Everything inside the
 * component below is then precisely typed.
 */
export function usageControl<T extends ExpectedUsageValues>(
  control: Control<T>,
): Control<ExpectedUsageValues> {
  return control as unknown as Control<ExpectedUsageValues>;
}

/** The matching narrowing for `setValue`; see `usageControl`. */
export function usageSetValue<T extends ExpectedUsageValues>(
  setValue: UseFormSetValue<T>,
): UseFormSetValue<ExpectedUsageValues> {
  return setValue as unknown as UseFormSetValue<ExpectedUsageValues>;
}

export function ExpectedUsageFields({
  control,
  setValue,
  labels,
}: {
  control: Control<ExpectedUsageValues>;
  /** Needed to clear a custom rate when a preset is chosen instead. */
  setValue: UseFormSetValue<ExpectedUsageValues>;
  labels: ExpectedUsageLabels;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  const frequency = useWatch({ control, name: 'expectedUsageFrequency' });

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Controller
        control={control}
        name="expectedUsageFrequency"
        render={({ field, fieldState }) => {
          const preset = USAGE_PRESETS.find((option) => option.id === field.value);

          return (
            <ChipSelect
              label={labels.frequency}
              options={USAGE_PRESETS.map((option) => ({
                value: option.id,
                label: t(option.labelKey),
              }))}
              value={field.value}
              onChange={(next) => {
                field.onChange(next);
                // A rate entered for "custom" would otherwise survive behind a
                // preset that states its own, and the two would disagree.
                if (next !== 'custom') setValue('customUsesPerMonth', null);
              }}
              // The assumption behind the preset, spelled out: a range resolves
              // to its midpoint, and the estimate below is computed from it.
              hint={preset ? t(preset.detailKey) : undefined}
              error={fieldState.error?.message}
            />
          );
        }}
      />

      {frequency === 'custom' ? (
        <Controller
          control={control}
          name="customUsesPerMonth"
          render={({ field, fieldState }) => (
            <TextField
              label={labels.usesPerMonth}
              required
              keyboardType="numeric"
              inputMode="numeric"
              value={field.value == null ? '' : String(field.value)}
              onChangeText={(text) => {
                // A comma is the decimal separator in five of the six languages.
                const parsed = Number.parseFloat(text.replace(',', '.'));
                field.onChange(Number.isFinite(parsed) ? parsed : null);
              }}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              suffix={t('units.perMonth')}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="expectedOwnershipMonths"
        render={({ field, fieldState }) => (
          <ChipSelect
            label={labels.ownership}
            options={OWNERSHIP_PRESETS.map((months) => ({
              value: months,
              // The preset is only a number of months; the duration it reads as
              // is the one shown everywhere else in the app.
              label: formatMonthsAsDuration(t, months),
            }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
    </View>
  );
}
