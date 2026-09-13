import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/ui/StateViews';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * What replaces the app when a screen throws while rendering.
 *
 * Laid out like the database gate's error view, and for the same reason: it
 * renders below the bootstrap providers only, so it reads theme, language and
 * insets from them rather than carrying copies. The raw message is printed the
 * way the gate prints its own — it is what the user can quote when asking what
 * happened, and this app has no other channel for that.
 */

export function CrashScreen({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingHorizontal: theme.screenPadding,
      }}
    >
      <ErrorState
        title={t('app.crashTitle')}
        description={t('app.crashDescription')}
        onRetry={onRetry}
      />
      <AppText variant="caption" color="tertiary" align="center" numberOfLines={3}>
        {error.message}
      </AppText>
    </View>
  );
}
