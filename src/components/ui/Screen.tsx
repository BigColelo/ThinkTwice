import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/**
 * The page frame: background colour, safe areas, the app's horizontal gutter
 * and keyboard avoidance.
 *
 * Screens never compute device offsets themselves — they describe what they
 * need and this component resolves it from the real insets. The tab bar is a
 * laid-out sibling rather than an overlay, so no extra bottom reservation is
 * needed for it.
 */

export type ScreenProps = {
  children: React.ReactNode;
  /** Wraps content in a ScrollView. Off for screens that own their own list. */
  scroll?: boolean;
  /** Applies the app's horizontal gutter. */
  padded?: boolean;
  /** Adds bottom safe-area padding to the content, scrolling or not. */
  edgeBottom?: boolean;
  /** Sticky content pinned above the bottom inset, e.g. a primary action pair. */
  footer?: React.ReactNode;
  /** Lifts content above the keyboard. Enable on form screens. */
  avoidKeyboard?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  background?: 'default' | 'surface';
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
} & Pick<ScrollViewProps, 'keyboardShouldPersistTaps' | 'stickyHeaderIndices'>;

export function Screen({
  children,
  scroll = false,
  padded = true,
  edgeBottom = true,
  footer,
  avoidKeyboard = false,
  onRefresh,
  refreshing = false,
  background = 'default',
  style,
  contentContainerStyle,
  testID,
  keyboardShouldPersistTaps = 'handled',
  stickyHeaderIndices,
}: ScreenProps): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const backgroundColor = background === 'surface' ? theme.colors.surface : theme.colors.background;

  const horizontalPadding = padded ? theme.screenPadding : 0;
  // A footer sits below the content and owns the bottom inset itself, so adding
  // it to the content as well would leave a gap above the footer.
  const bottomPadding = footer
    ? theme.spacing.lg
    : (edgeBottom ? insets.bottom : 0) + theme.spacing.lg;

  const body = scroll ? (
    <ScrollView
      testID={testID}
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          paddingHorizontal: horizontalPadding,
          paddingBottom: bottomPadding,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      stickyHeaderIndices={stickyHeaderIndices}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.text.secondary}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View
      testID={testID}
      style={[
        {
          flex: 1,
          paddingHorizontal: horizontalPadding,
          // A screen that lays itself out needs the inset as much as a scrolling
          // one: without it the last row sits under the home indicator.
          paddingBottom: bottomPadding,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const content = (
    <View style={[{ flex: 1, backgroundColor }, style]}>
      {body}
      {footer ? (
        <View
          style={{
            paddingHorizontal: horizontalPadding || theme.screenPadding,
            paddingTop: theme.spacing.sm,
            paddingBottom: insets.bottom + theme.spacing.sm,
            backgroundColor,
            borderTopWidth: theme.sizes.hairline,
            borderTopColor: theme.colors.divider,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );

  if (!avoidKeyboard) return content;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  );
}
