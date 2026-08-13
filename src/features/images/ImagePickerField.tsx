import { Image, ImagePlus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { FormField } from '@/components/ui/FormField';
import { IconButton } from '@/components/ui/IconButton';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useTheme } from '@/theme';

import { deleteItemImage, pickItemImage } from './itemImages';

/**
 * Optional photo for an item.
 *
 * Every failure mode is reported in place — a denied permission, a picker that
 * could not read the file — because a photo is a nice-to-have and must never
 * block saving the item it belongs to.
 */

export type ImagePickerFieldProps = {
  label?: string;
  value: string | null;
  onChange: (uri: string | null) => void;
};

export function ImagePickerField({
  label = 'Photo',
  value,
  onChange,
}: ImagePickerFieldProps): React.ReactElement {
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const pick = async (): Promise<void> => {
    setIsPicking(true);
    setMessage(null);

    const result = await pickItemImage();

    switch (result.status) {
      case 'picked':
        // Replacing an image removes the one the app previously stored.
        if (value) void deleteItemImage(value);
        onChange(result.uri);
        break;
      case 'permission_denied':
        setMessage(
          'ThinkTwice needs access to your photos to add one. You can allow it in Settings.',
        );
        break;
      case 'failed':
        setMessage(result.message);
        break;
      case 'cancelled':
        break;
    }

    setIsPicking(false);
  };

  const remove = (): void => {
    if (value) void deleteItemImage(value);
    onChange(null);
    setMessage(null);
  };

  return (
    <FormField label={label} hint="Optional. Stored on this device only.">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        {value ? (
          <>
            <Thumbnail
              uri={value}
              fallbackIcon={Image}
              tint="slate"
              size={72}
              radius={theme.radius.md}
            />
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Replace photo"
                onPress={pick}
                disabled={isPicking}
                style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
              >
                <AppText variant="label" color="accent">
                  Replace photo
                </AppText>
              </Pressable>
            </View>
            <IconButton
              icon={X}
              accessibilityLabel="Remove photo"
              variant="muted"
              size="sm"
              onPress={remove}
            />
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a photo"
            onPress={pick}
            disabled={isPicking}
            style={({ pressed }) => [
              {
                width: 72,
                height: 72,
                borderRadius: theme.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: theme.sizes.hairline,
                borderColor: theme.colors.border,
                borderStyle: 'dashed',
                backgroundColor: theme.colors.surface,
              },
              pressed ? { opacity: 0.6 } : null,
            ]}
          >
            <ImagePlus
              size={theme.sizes.icon.lg}
              color={theme.colors.text.tertiary}
              strokeWidth={theme.sizes.iconStrokeWidth}
            />
          </Pressable>
        )}
      </View>

      {message ? (
        <AppText variant="caption" color="secondary" style={{ marginTop: theme.spacing.xs }}>
          {message}
        </AppText>
      ) : null}
    </FormField>
  );
}
