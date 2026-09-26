import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The two answers to a reflection, side by side and the same size.
 *
 * Neither is the default: the screen argues for nothing, so the bar does not
 * either. Buying is disabled while a dismissal is being saved, so one item
 * cannot end up decided both ways.
 */
export function DecisionBar({
  onDismiss,
  onBought,
  isDismissing,
}: {
  onDismiss: () => void;
  onBought: () => void;
  isDismissing: boolean;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      <Button
        label={t('wishlist.noLongerWantIt')}
        variant="secondary"
        onPress={onDismiss}
        loading={isDismissing}
        style={{ flex: 1 }}
      />
      <Button
        label={t('wishlist.iBoughtIt')}
        onPress={onBought}
        disabled={isDismissing}
        style={{ flex: 1 }}
      />
    </View>
  );
}
