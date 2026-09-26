import { Lock } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/** The promise the whole app is built on, stated where someone would look for it. */
export function PrivacyCard(): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <IconTile icon={Lock} tint="slate" />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{t('settings.privacy.heading')}</AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.xxxs }}>
            {t('settings.privacy.body')}
          </AppText>
        </View>
      </View>
    </Card>
  );
}
