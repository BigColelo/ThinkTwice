import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { createId } from '@/utils/ids';

/**
 * Attaching a photo to an item.
 *
 * The picker hands back a URI in a temporary or system-owned location, which is
 * not guaranteed to still resolve after the app restarts. Anything the user
 * keeps is therefore copied into the app's own document directory first, and
 * the copy's path is what gets stored.
 *
 * Everything here is an adapter around a platform capability: on web, where the
 * app has no persistent file system of its own, the picked URL is used directly
 * and the feature simply does less rather than breaking the build.
 */

const IMAGE_DIRECTORY_NAME = 'item-images';

export type PickImageResult =
  | { status: 'picked'; uri: string }
  | { status: 'cancelled' }
  | { status: 'permission_denied' }
  | { status: 'failed'; message: string };

/**
 * Opens the photo library and returns the picked URI as-is.
 *
 * Nothing is copied here. The copy happens in `persistItemImage`, at the moment
 * the item is actually saved — so abandoning a half-filled form cannot leave a
 * photo on disk that no row refers to.
 */
export async function pickItemImage(): Promise<PickImageResult> {
  try {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return { status: 'permission_denied' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      // A square crop matches every place an item image is displayed.
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return { status: 'cancelled' };

    const asset = result.assets[0];
    if (!asset) return { status: 'cancelled' };

    return { status: 'picked', uri: asset.uri };
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'The photo could not be added.',
    };
  }
}

/**
 * Copies a picked photo into the app's own document directory and returns the
 * URI to store. Call this when saving the item it belongs to.
 *
 * The picker hands back a URI in a temporary or system-owned location that is
 * not guaranteed to resolve after a restart, so anything the user keeps has to
 * live somewhere the app controls.
 *
 * Returns the input unchanged when there is nothing to do: no image, web (where
 * the app has no persistent file system of its own), or a URI already stored.
 * A failed copy also returns the original rather than throwing — a photo must
 * never be the reason a purchase cannot be saved.
 */
export async function persistItemImage(uri: string | null): Promise<string | null> {
  if (!uri || Platform.OS === 'web') return uri;
  if (uri.includes(IMAGE_DIRECTORY_NAME)) return uri;

  try {
    const directory = new Directory(Paths.document, IMAGE_DIRECTORY_NAME);
    if (!directory.exists) directory.create({ intermediates: true, idempotent: true });

    const destination = new File(directory, `${createId()}${extractExtension(uri)}`);
    await new File(uri).copy(destination);
    return destination.uri;
  } catch {
    return uri;
  }
}

function extractExtension(uri: string): string {
  const match = /\.([a-zA-Z0-9]{1,5})(?:\?|#|$)/.exec(uri);
  return match?.[1] ? `.${match[1].toLowerCase()}` : '.jpg';
}

/**
 * Removes an image the app created. Silently ignores anything it does not own
 * (a web object URL, or a URI from an older build) — deleting a picture must
 * never be able to fail the operation that triggered it.
 */
/**
 * Removes every image the app copied into its own storage. Used by "reset all
 * local data", where deleting the database rows alone would leave the photos
 * behind on disk with nothing referencing them.
 */
export async function deleteAllItemImages(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const directory = new Directory(Paths.document, IMAGE_DIRECTORY_NAME);
    // Deleting the directory removes its contents; it is recreated on the next pick.
    if (directory.exists) directory.delete();
  } catch {
    // Reset must succeed even if the photo directory cannot be removed.
  }
}

export async function deleteItemImage(uri: string | null | undefined): Promise<void> {
  if (!uri || Platform.OS === 'web') return;
  if (!uri.includes(IMAGE_DIRECTORY_NAME)) return;

  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A missing file is the state we wanted anyway.
  }
}
