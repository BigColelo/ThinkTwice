import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * A sheet that rises from the bottom of the screen, for a short form that
 * belongs to the screen behind it rather than to a place of its own.
 *
 * Built on React Native's own `Modal`. A gesture-driven sheet library would
 * bring a gesture handler and a reanimated runtime for two forms of four fields
 * each, and would have to be taught this app's colours, radii and dark mode
 * besides.
 *
 * Two things it insists on. The scrim is a labelled button, not decoration, so
 * "tap outside to close" exists for a screen reader too. And the content
 * scrolls, with the keyboard allowed to stay up through a tap, because a sheet
 * with a text field in it is exactly where a mis-swallowed tap is most annoying.
 */

export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  /** The scrim, the hardware back button and the caller's own Cancel all land here. */
  onClose: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.scrim }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          style={{ flex: 1 }}
        />

        <View
          style={{
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.radius.xxl,
            borderTopRightRadius: theme.radius.xxl,
            paddingTop: theme.spacing.md,
            paddingBottom: insets.bottom + theme.spacing.md,
            // Leaves the screen behind visible, so the sheet reads as sitting on
            // top of something rather than as a new screen.
            maxHeight: '90%',
          }}
        >
          <View
            // Grabber, purely visual — the close affordances are the scrim and Cancel.
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.borderStrong,
              marginBottom: theme.spacing.md,
            }}
          />

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: theme.screenPadding,
              gap: theme.spacing.md,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
