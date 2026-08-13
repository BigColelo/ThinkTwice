import { Tabs } from 'expo-router';
import React from 'react';

import { TabBar } from '@/features/navigation/TabBar';

/**
 * The four primary destinations. The bar itself is custom (see `TabBar`) so the
 * central add action can open a modal rather than being a fifth destination.
 */
export default function TabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="money" options={{ title: 'Money' }} />
      <Tabs.Screen name="purchases" options={{ title: 'Purchases' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
    </Tabs>
  );
}
