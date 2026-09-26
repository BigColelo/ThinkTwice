import { Settings } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { ThinkTwiceWordmark } from '@/components/brand/ThinkTwiceMark';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The top of Home: the wordmark instead of a screen title, since Home is the app
 * rather than a section of it, and the way into Settings.
 */
export function HomeHeader({ onOpenSettings }: { onOpenSettings: () => void }): React.ReactElement {
  const theme = useTheme();
  const t = useT();

  return (
    <View
      style={{
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1 }}>
        <ThinkTwiceWordmark />
        <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.xxxs }}>
          {t('home.greeting')}
        </AppText>
      </View>
      <IconButton
        icon={Settings}
        accessibilityLabel={t('common.settings')}
        onPress={onOpenSettings}
      />
    </View>
  );
}
