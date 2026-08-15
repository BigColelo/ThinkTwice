import React from 'react';

import { IconTile } from '@/components/ui/IconTile';
import { ListRow } from '@/components/ui/ListRow';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { getCommitmentCategory } from '@/constants/categories';
import { getFrequency } from '@/constants/frequencies';
import { calculateMonthlyCommitmentEquivalent } from '@/domain';
import { useT } from '@/i18n';
import type { RecurringCommitment } from '@/types/domain';

/**
 * One recurring commitment.
 *
 * The amount shown is the one the user is actually billed. For anything other
 * than a monthly bill the monthly equivalent appears underneath, so a quarterly
 * charge is never read as a monthly one.
 */

export function CommitmentRow({
  commitment,
  onPress,
}: {
  commitment: RecurringCommitment;
  onPress?: () => void;
}): React.ReactElement {
  const t = useT();
  const category = getCommitmentCategory(commitment.categoryId);
  const frequency = getFrequency(commitment.frequency);
  const isMonthly = commitment.frequency === 'monthly';
  const isPaused = !commitment.isActive;

  const details = isMonthly
    ? t(category.labelKey)
    : `${t(frequency.labelKey)}${t('common.dotSeparator')}${t(category.labelKey)}`;

  return (
    <ListRow
      leading={<IconTile icon={category.icon} tint={category.tint} />}
      title={commitment.name}
      // Paused is said in words rather than shown by dimming the row: a figure
      // the user has to read should not lose contrast to carry a state.
      subtitle={
        isPaused
          ? `${t('money.commitmentPausedPrefix')}${t('common.dotSeparator')}${details}`
          : details
      }
      trailing={
        <MoneyValue
          cents={commitment.amountCents}
          variant="bodyStrong"
          color={isPaused ? 'secondary' : 'primary'}
        />
      }
      trailingSubtitle={
        isMonthly || isPaused ? undefined : (
          <MoneyValue
            cents={calculateMonthlyCommitmentEquivalent(commitment)}
            variant="caption"
            color="secondary"
            suffix={` ${t('units.perMonth')}`}
          />
        )
      }
      onPress={onPress}
      accessibilityLabel={`${t('money.commitmentLabel', {
        name: commitment.name,
        category: t(category.labelKey),
        frequency: t(frequency.labelKey),
      })}${isPaused ? `${t('common.listSeparator')}${t('money.commitmentPaused')}` : ''}`}
      accessibilityHint={onPress ? t('money.commitmentHint') : undefined}
    />
  );
}
