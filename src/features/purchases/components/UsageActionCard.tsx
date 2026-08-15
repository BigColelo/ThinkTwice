import * as Haptics from 'expo-haptics';
import { Plus, Undo2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { MetricCell, MetricDivider } from '@/components/ui/StatCard';
import { useRepositories } from '@/db/DatabaseProvider';
import { recordUse, undoLastUse } from '@/features/purchases/services/purchaseActions';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { formatNumber } from '@/utils/currency';
import { formatDateTime } from '@/utils/dates';

/**
 * Usage tracking: the count, the cost per use, and one large button.
 *
 * This is the action the user is asked to repeat for years, so it is a single
 * tap with no form, no date picker and no confirmation. Undo is offered
 * immediately afterwards, which is what makes the single tap safe.
 */

export function UsageActionCard({
  purchaseId,
  totalUses,
  realCostPerUseCents,
  lastUsedAt,
}: {
  purchaseId: string;
  totalUses: number;
  realCostPerUseCents: number | null;
  lastUsedAt: string | null;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const repositories = useRepositories();

  const [isBusy, setIsBusy] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleUse = async (): Promise<void> => {
    setIsBusy(true);
    setActionError(null);

    let recorded = false;
    try {
      await recordUse(repositories, purchaseId);
      recorded = true;
      setCanUndo(true);
    } catch {
      setActionError(t('purchases.recordUseError'));
    } finally {
      setIsBusy(false);
    }

    // Outside the try: a device that cannot buzz has nothing to do with whether
    // the use was recorded, and reporting a failed tap for it would be a lie.
    if (recorded && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  };

  const handleUndo = async (): Promise<void> => {
    setIsBusy(true);
    setActionError(null);
    try {
      await undoLastUse(repositories, purchaseId);
      setCanUndo(false);
    } catch {
      setActionError(t('purchases.undoUseError'));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <MetricCell label={t('purchases.usesMetric')} value={formatNumber(totalUses)} />
        <MetricDivider />
        <MetricCell
          label={t('purchases.costPerUseMetric')}
          value={
            realCostPerUseCents == null ? (
              <AppText variant="metricSmall" color="tertiary">
                {t('common.noValue')}
              </AppText>
            ) : (
              <MoneyValue
                cents={realCostPerUseCents}
                variant="metric"
                decimals="always"
                adjustsFontSizeToFit
                numberOfLines={1}
              />
            )
          }
        />
      </View>

      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.xs }}>
        <Button
          label={t('purchases.recordUse')}
          icon={Plus}
          onPress={handleUse}
          loading={isBusy && !canUndo}
          disabled={isBusy}
          accessibilityHint={t('purchases.recordUseHint')}
        />

        {canUndo ? (
          <Button
            label={t('purchases.undoLastUse')}
            icon={Undo2}
            variant="ghost"
            size="md"
            onPress={handleUndo}
            disabled={isBusy}
          />
        ) : null}
      </View>

      {actionError ? (
        <AppText
          variant="caption"
          color="danger"
          accessibilityRole="alert"
          style={{ marginTop: theme.spacing.xs }}
        >
          {actionError}
        </AppText>
      ) : null}

      {lastUsedAt && !canUndo ? (
        <AppText
          variant="caption"
          color="tertiary"
          align="center"
          style={{ marginTop: theme.spacing.xs }}
        >
          {t('purchases.lastUsed', { date: formatDateTime(lastUsedAt) })}
        </AppText>
      ) : null}

      {totalUses === 0 ? (
        <AppText
          variant="caption"
          color="tertiary"
          align="center"
          style={{ marginTop: theme.spacing.xs }}
        >
          {t('purchases.usageDescription')}
        </AppText>
      ) : (
        <AppText
          variant="caption"
          color="tertiary"
          align="center"
          style={{ marginTop: theme.spacing.xxs }}
        >
          {t('purchases.usesRecorded', { count: totalUses })}
        </AppText>
      )}
    </Card>
  );
}
