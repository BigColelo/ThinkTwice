import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { LoadingState } from '@/components/ui/StateViews';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * Holds the app back until the stored settings have been read, and only then
 * lets the native splash go.
 *
 * Everything below renders in the theme and the language the user chose. Before
 * the first read those are the fallbacks — the device's — so rendering early
 * painted a dark-mode user's first frames light, or an Arabic user's in the
 * device's language, until the row arrived a moment later. The database gate
 * above hides the splash only when it has an error to show; on the way to a
 * working app, this is the one that does.
 *
 * The read cannot leave the app stuck here: a failed first read falls back to
 * the defaults and still reports that loading is over.
 */
export function SettingsGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isLoading } = useSettings();
  const theme = useTheme();
  const t = useT();

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync().catch(() => undefined);
  }, [isLoading]);

  if (isLoading) {
    // Only ever seen where there is no native splash to cover it — the web —
    // or after a retry from the crash screen, once the splash has already gone.
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
        <LoadingState label={t('app.databaseOpening')} />
      </View>
    );
  }

  return <>{children}</>;
}
