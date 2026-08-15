import { Clock } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { ProgressRing } from '@/components/charts/ProgressRing';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { cooldownRemaining, type CooldownState } from '@/domain';
import { cooldownRemainingText } from '@/features/wishlist/cooldownText';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/dates';

/**
 * The reflection-period card: a ring showing how much of the period has passed,
 * the time left, and a reminder of why the user is waiting.
 *
 * The ring never appears alone — the remaining time is always written out, so
 * the information does not depend on reading an arc.
 */

export function CooldownCard({
  state,
  cooldownDays,
}: {
  state: CooldownState;
  cooldownDays: number;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const isComplete = state.isComplete;
  const remaining = cooldownRemaining(state);

  return (
    <Card variant="accent" padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <ProgressRing
          progress={state.progress}
          size={52}
          strokeWidth={5}
          color={isComplete ? theme.colors.positive.base : theme.colors.accent.base}
          trackColor={theme.isDark ? theme.colors.surfaceMuted : theme.colors.accent.border}
          accessibilityLabel={
            isComplete
              ? t('cooldown.complete')
              : t('cooldown.progressLabel', {
                  remaining: state.daysRemaining,
                  total: cooldownDays,
                })
          }
        >
          <Clock
            size={theme.sizes.icon.md}
            color={isComplete ? theme.colors.positive.base : theme.colors.accent.base}
            strokeWidth={theme.sizes.iconStrokeWidth}
          />
        </ProgressRing>

        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="subheading" color={isComplete ? 'positive' : 'accent'}>
            {cooldownRemainingText(t, remaining)}
          </AppText>
          <AppText variant="caption" color="secondary">
            {isComplete
              ? t('cooldown.completeBody')
              : t('cooldown.chosenPeriod', { count: cooldownDays })}
          </AppText>
          {state.endsAt && !isComplete ? (
            <AppText variant="caption" color="tertiary">
              {t('cooldown.endsOn', { date: formatDate(state.endsAt) })}
            </AppText>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
