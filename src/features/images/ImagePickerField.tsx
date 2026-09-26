import { Image, ImagePlus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { FormField } from '@/components/ui/FormField';
import { IconButton } from '@/components/ui/IconButton';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { pickItemImage } from './itemImages';

/**
 * Optional photo for an item.
 *
 * Every failure mode is reported in place — a denied permission, a picker that
 * could not read the file — because a photo is a nice-to-have and must never
 * block saving the item it belongs to.
 *
 * Replacing or removing a photo here only changes the form. The stored file is
 * deleted by the service once the item is actually saved, and only if nothing
 * else still shows it. Deleting it on the tap, as this field once did, broke the
 * photo of an edit that was then cancelled — the record still pointed at a file
 * that was gone — and, on a purchase that came from the wishlist, broke the
 * wishlist item's photo too, since the two share one file.
 */

export type ImagePickerFieldProps = {
  label?: string;
  value: string | null;
  onChange: (uri: string | null) => void;
};

export function ImagePickerField({
  label,
  value,
  onChange,
}: ImagePickerFieldProps): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const [message, setMessage] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const pick = async (): Promise<void> => {
    setIsPicking(true);
    setMessage(null);

    const result = await pickItemImage();

    switch (result.status) {
      case 'picked':
        onChange(result.uri);
        break;
      case 'permission_denied':
        setMessage(t('images.permissionDenied'));
        break;
      case 'failed':
        setMessage(t('images.failed'));
        break;
      case 'cancelled':
        break;
    }

    setIsPicking(false);
  };

  const remove = (): void => {
    onChange(null);
    setMessage(null);
  };

  return (
    <FormField label={label ?? t('images.label')} hint={t('images.hint')}>
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
                accessibilityLabel={t('images.replace')}
                onPress={pick}
                disabled={isPicking}
                style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
              >
                <AppText variant="label" color="accent">
                  {t('images.replace')}
                </AppText>
              </Pressable>
            </View>
            <IconButton
              icon={X}
              accessibilityLabel={t('images.remove')}
              variant="muted"
              size="sm"
              onPress={remove}
            />
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('images.add')}
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
