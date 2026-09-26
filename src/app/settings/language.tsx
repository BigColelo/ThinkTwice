import React from 'react';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useGoBack } from '@/features/navigation/useGoBack';
import { LanguageSelection } from '@/features/settings/components/LanguageSelection';
import { useT } from '@/i18n';

/**
 * The language picker. What a change of language sets in motion — the layout
 * direction, and the reminders already scheduled in the old one — is described
 * and handled in `LanguageSelection`.
 */
export default function LanguageScreen(): React.ReactElement {
  const t = useT();
  const goBack = useGoBack('/settings');

  return (
    <>
      <ScreenHeader title={t('settings.language.title')} onBack={goBack} />

      <Screen scroll>
        <LanguageSelection />
      </Screen>
    </>
  );
}
