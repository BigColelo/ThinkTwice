import { ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * What this app is, and which version of it is running.
 *
 * The version is passed in rather than read here so the card can be rendered — and
 * tested — without a manifest, including the case where there is none to read.
 */

export function AboutCard({ version }: { version: string | null }): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <Card padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <IconTile icon={ShieldCheck} tint="teal" />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{t('settings.about.appName')}</AppText>
          {version ? (
            <AppText variant="caption" color="tertiary" style={{ marginTop: 2 }}>
              {t('settings.about.version', { version })}
            </AppText>
          ) : null}
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {t('settings.about.body')}
          </AppText>
        </View>
      </View>
    </Card>
  );
}
