import { Coins, Euro, Globe } from 'lucide-react-native';
import React from 'react';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Spacer } from '@/components/ui/Spacer';
import { getCurrency } from '@/constants/currencies';
import { isDevSeedAvailable } from '@/db/devSeed';
import { useAppRouter } from '@/features/navigation/useAppRouter';
import { useGoBack } from '@/features/navigation/useGoBack';
import { appVersion } from '@/features/settings/appVersion';
import { AboutCard } from '@/features/settings/components/AboutCard';
import { AppearanceCard } from '@/features/settings/components/AppearanceCard';
import { DevelopmentCard } from '@/features/settings/components/DevelopmentCard';
import { LocalDataCard } from '@/features/settings/components/LocalDataCard';
import { PrivacyCard } from '@/features/settings/components/PrivacyCard';
import { RemindersCard } from '@/features/settings/components/RemindersCard';
import { SettingsLinkCard } from '@/features/settings/components/SettingsLinkCard';
import { useSettings } from '@/features/settings/SettingsProvider';
import { LANGUAGE_NATIVE_NAMES, resolveLanguage, useT } from '@/i18n';

/**
 * Appearance, currency, reminders, and the controls that let the user take
 * their data back — including deleting all of it.
 *
 * Each card owns its own write; this screen puts them in order and decides where
 * the rows that lead elsewhere go.
 */
export default function SettingsScreen(): React.ReactElement {
  const t = useT();
  const router = useAppRouter();
  const goBack = useGoBack('/');
  const { settings } = useSettings();

  return (
    <>
      <ScreenHeader title={t('settings.title')} onBack={goBack} />

      <Screen scroll>
        <SectionHeader title={t('settings.appearance.title')} />
        <AppearanceCard />

        <Spacer size="xl" />
        <SectionHeader title={t('settings.language.title')} />
        <SettingsLinkCard
          icon={Globe}
          tint="blue"
          title={t('settings.language.row')}
          subtitle={
            settings.language === 'system'
              ? t('settings.language.system')
              : LANGUAGE_NATIVE_NAMES[resolveLanguage(settings.language)]
          }
          onPress={() => router.push('/settings/language')}
        />

        <Spacer size="xl" />
        <SectionHeader title={t('settings.currency.title')} />
        <SettingsLinkCard
          icon={Coins}
          tint="amber"
          title={t('settings.currency.row')}
          subtitle={t(getCurrency(settings.currencyCode).nameKey)}
          onPress={() => router.push('/settings/currency')}
        />

        <Spacer size="xl" />
        <SectionHeader title={t('settings.notifications.title')} />
        <RemindersCard />

        <Spacer size="xl" />
        <SectionHeader title={t('settings.money.title')} />
        <SettingsLinkCard
          icon={Euro}
          tint="green"
          title={t('settings.money.rowTitle')}
          subtitle={t('settings.money.rowSubtitle')}
          onPress={() => router.push('/money')}
        />

        <Spacer size="xl" />
        <SectionHeader title={t('settings.privacy.title')} />
        <PrivacyCard />

        <Spacer size="xl" />
        <SectionHeader title={t('settings.data.title')} />
        <LocalDataCard />

        {isDevSeedAvailable() ? (
          <>
            <Spacer size="xl" />
            <SectionHeader
              title={t('settings.development.title')}
              subtitle={t('settings.development.subtitle')}
            />
            <DevelopmentCard onSeeded={() => router.replace('/')} />
          </>
        ) : null}

        <Spacer size="xl" />
        <SectionHeader title={t('settings.about.title')} />
        {/* The app version lives here; the schema version stays under Data, because
            they are different numbers about different things. */}
        <AboutCard version={appVersion()} />
      </Screen>
    </>
  );
}
