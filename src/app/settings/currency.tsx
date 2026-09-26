import React from 'react';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useGoBack } from '@/features/navigation/useGoBack';
import { CurrencySelection } from '@/features/settings/components/CurrencySelection';
import { useT } from '@/i18n';

/**
 * The currency picker. The list, the write and the caption explaining why the
 * choice is never made for the user all live in `CurrencySelection`.
 */
export default function CurrencyScreen(): React.ReactElement {
  const t = useT();
  const goBack = useGoBack('/settings');

  return (
    <>
      <ScreenHeader title={t('settings.currency.title')} onBack={goBack} />

      <Screen scroll>
        <CurrencySelection />
      </Screen>
    </>
  );
}
