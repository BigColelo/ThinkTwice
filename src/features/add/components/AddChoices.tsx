import { Heart, Package } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { AddChoiceCard } from './AddChoiceCard';

/**
 * The add flow's one question and its two answers. Wanting to buy something is
 * the answer the app exists for, so it is the highlighted one.
 */
export function AddChoices({
  onWantToBuy,
  onAlreadyOwn,
}: {
  onWantToBuy: () => void;
  onAlreadyOwn: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <>
      <AppText variant="title" style={{ marginBottom: theme.spacing.md }}>
        {t('add.question')}
      </AppText>

      <View style={{ gap: theme.spacing.sm }}>
        <AddChoiceCard
          icon={Heart}
          title={t('add.wantToBuy')}
          description={t('add.wantToBuyDescription')}
          highlighted
          onPress={onWantToBuy}
        />
        <AddChoiceCard
          icon={Package}
          title={t('add.alreadyOwn')}
          description={t('add.alreadyOwnDescription')}
          onPress={onAlreadyOwn}
        />
      </View>
    </>
  );
}
