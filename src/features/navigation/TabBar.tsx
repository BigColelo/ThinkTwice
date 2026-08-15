import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { ChartPie, House, Plus, ShoppingBag, Wallet, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme';

/**
 * The bottom bar from the design: four destinations either side of a raised
 * purple add action.
 *
 * It is a custom bar rather than the default one because the centre slot is not
 * a destination — it opens the Add flow as a modal — and because the label,
 * icon and selected treatment need to follow the app's own tokens.
 */

/** Kept module-local: the bar is laid out as a sibling, so no screen reserves it. */
const TAB_BAR_HEIGHT = 56;

type TabDefinition = {
  name: string;
  label: string;
  icon: LucideIcon;
};

const TABS: readonly TabDefinition[] = [
  { name: 'index', label: 'Home', icon: House },
  { name: 'money', label: 'Money', icon: Wallet },
  { name: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { name: 'insights', label: 'Insights', icon: ChartPie },
];

export function TabBar({ state, navigation }: BottomTabBarProps): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const activeRouteName = state.routes[state.index]?.name;

  const renderTab = (tab: TabDefinition): React.ReactElement => {
    const isFocused = activeRouteName === tab.name;
    const Icon = tab.icon;
    const color = isFocused ? theme.colors.accent.base : theme.colors.text.tertiary;

    return (
      <Pressable
        key={tab.name}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={tab.label}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes.find((route) => route.name === tab.name)?.key ?? '',
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        }}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          minHeight: theme.sizes.minTouchTarget,
        }}
      >
        <Icon size={theme.sizes.icon.md} color={color} strokeWidth={isFocused ? 2.4 : 2} />
        <AppText variant="caption" style={{ color, fontSize: 10, lineHeight: 13 }}>
          {tab.label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: TAB_BAR_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom,
        paddingHorizontal: theme.spacing.xs,
        backgroundColor: theme.colors.chrome,
        borderTopWidth: theme.sizes.hairline,
        borderTopColor: theme.colors.border,
        ...Platform.select({ ios: theme.elevation('raised'), default: {} }),
      }}
    >
      {TABS.slice(0, 2).map(renderTab)}

      <View style={{ width: 68, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add an item"
          accessibilityHint="Opens the flow to add something you want to buy or already own"
          onPress={() => router.push('/add')}
          style={({ pressed }) => [
            {
              width: theme.sizes.tabBar.fabSize,
              height: theme.sizes.tabBar.fabSize,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.accent.base,
              ...theme.elevation('raised'),
            },
            pressed ? { opacity: 0.85, transform: [{ scale: 0.96 }] } : null,
          ]}
        >
          <Plus size={24} color={theme.colors.text.onAccent} strokeWidth={2.4} />
        </Pressable>
      </View>

      {TABS.slice(2).map(renderTab)}
    </View>
  );
}
