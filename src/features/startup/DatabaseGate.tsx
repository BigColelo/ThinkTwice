import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useDatabaseState, useRetryDatabase } from '@/db/DatabaseProvider';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * Blocks the app until the local database is open, and explains it if it is not.
 *
 * It renders above the settings, so it reads the bootstrap theme and language —
 * the device's — rather than the user's; nothing the user chose can be known
 * before the database it is stored in has opened. The native splash stays up
 * through a successful open and is dropped by `SettingsGate` once the settings
 * are read too; this gate lets it go only when it has an error to show.
 *
 * The raw message is printed under the explanation, as the crash screen prints
 * its own: it is what the user can quote when asking what happened, and the app
 * has no other channel for that.
 */
export function DatabaseGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const state = useDatabaseState();
  const retry = useRetryDatabase();
  const theme = useTheme();
  const t = useT();

  useEffect(() => {
    if (state.status === 'error') void SplashScreen.hideAsync().catch(() => undefined);
  }, [state.status]);

  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
        <LoadingState label={t('app.databaseOpening')} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          padding: theme.screenPadding,
        }}
      >
        <ErrorState
          title={t('app.databaseErrorTitle')}
          description={t('app.databaseErrorDescription')}
          onRetry={retry}
        />
        <AppText variant="caption" color="tertiary" align="center">
          {state.error.message}
        </AppText>
      </View>
    );
  }

  return <>{children}</>;
}
