import { Plus, Receipt } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card, PressableCard } from '@/components/ui/Card';
import { RowDivider } from '@/components/ui/ListRow';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Spacer } from '@/components/ui/Spacer';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Cents, RecurringCommitment } from '@/types/domain';

import { CommitmentRow } from './CommitmentRow';

/**
 * The money that leaves every month before any purchase is considered.
 *
 * Active commitments come with their total, per month and per year, because the
 * yearly figure is the one that tends to surprise. Paused ones are listed apart
 * and left out of both totals — kept so a subscription on hold is not forgotten,
 * excluded so it does not shrink a month it is not charged in. With nothing
 * recorded at all, the section explains what belongs here instead of showing a
 * total of zero.
 */
export function CommitmentsSection({
  commitments,
  pausedCommitments,
  monthlyTotalCents,
  annualTotalCents,
  onSelect,
  onAdd,
}: {
  commitments: readonly RecurringCommitment[];
  pausedCommitments: readonly RecurringCommitment[];
  monthlyTotalCents: Cents;
  annualTotalCents: Cents;
  onSelect: (commitment: RecurringCommitment) => void;
  onAdd: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  const hasAnyCommitment = commitments.length > 0 || pausedCommitments.length > 0;

  return (
    <>
      <SectionHeader
        title={t('money.recurringCommitments')}
        subtitle={
          hasAnyCommitment
            ? pausedCommitments.length > 0
              ? t('money.activeAndPausedCount', {
                  count: commitments.length,
                  paused: pausedCommitments.length,
                })
              : t('money.activeCount', { count: commitments.length })
            : t('money.commitmentsHint')
        }
      />

      {commitments.length > 0 ? (
        <Card padding={theme.spacing.md}>
          {commitments.map((commitment, index) => (
            <View key={commitment.id}>
              {index > 0 ? <RowDivider /> : null}
              <CommitmentRow commitment={commitment} onPress={() => onSelect(commitment)} />
            </View>
          ))}

          <RowDivider spacing="sm" />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <AppText variant="caption" color="secondary">
              {t('money.total')}
            </AppText>
            <View style={{ alignItems: 'flex-end' }}>
              <MoneyValue
                cents={monthlyTotalCents}
                variant="bodyStrong"
                suffix={` ${t('units.perMonth')}`}
              />
              <MoneyValue
                cents={annualTotalCents}
                variant="caption"
                color="secondary"
                suffix={` ${t('units.perYear')}`}
              />
            </View>
          </View>
        </Card>
      ) : null}

      {!hasAnyCommitment ? (
        <Card>
          <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <Receipt
              size={theme.sizes.icon.xl}
              color={theme.colors.text.tertiary}
              strokeWidth={theme.sizes.iconStrokeWidth}
            />
            <AppText variant="subheading" align="center">
              {t('money.commitmentsEmptyTitle')}
            </AppText>
            <AppText variant="caption" color="secondary" align="center">
              {t('money.commitmentsEmptyDescription')}
            </AppText>
          </View>
        </Card>
      ) : null}

      {pausedCommitments.length > 0 ? (
        <>
          <Spacer size="lg" />
          <SectionHeader title={t('money.pausedTitle')} subtitle={t('money.pausedSubtitle')} />
          <Card padding={theme.spacing.md}>
            {pausedCommitments.map((commitment, index) => (
              <View key={commitment.id}>
                {index > 0 ? <RowDivider /> : null}
                <CommitmentRow commitment={commitment} onPress={() => onSelect(commitment)} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Spacer size="sm" />

      <PressableCard
        variant="outline"
        onPress={onAdd}
        accessibilityLabel={t('money.addCommitment')}
        accessibilityHint={t('money.addCommitmentHint')}
        padding={theme.spacing.sm}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.xs,
            minHeight: theme.sizes.control.sm,
          }}
        >
          <Plus
            size={theme.sizes.icon.md}
            color={theme.colors.accent.base}
            strokeWidth={theme.sizes.iconStrokeWidth}
          />
          <AppText variant="button" color="accent">
            {t('money.addCommitment')}
          </AppText>
        </View>
      </PressableCard>
    </>
  );
}
