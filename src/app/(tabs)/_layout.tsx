import { Tabs } from 'expo-router';
import React from 'react';

import { TabBar } from '@/features/navigation/TabBar';
import { useT } from '@/i18n';

/**
 * The four primary destinations. The bar itself is custom (see `TabBar`) so the
 * central add action can open a modal rather than being a fifth destination.
 *
 * The titles never appear in that bar, which draws its own labels, but React
 * Navigation still reads them: on the web the active one becomes the document
 * title, and a screen reader announces it when the tab changes. So they follow
 * the chosen language like every other string.
 */
export default function TabsLayout(): React.ReactElement {
  const t = useT();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: t('navigation.home') }} />
      <Tabs.Screen name="money" options={{ title: t('navigation.money') }} />
      <Tabs.Screen name="purchases" options={{ title: t('navigation.purchases') }} />
      <Tabs.Screen name="insights" options={{ title: t('navigation.insights') }} />
    </Tabs>
  );
}
