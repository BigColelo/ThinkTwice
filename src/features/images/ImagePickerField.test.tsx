import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ImagePickerField } from './ImagePickerField';
import { deleteItemImage, pickItemImage } from './itemImages';

jest.mock('./itemImages', () => ({
  pickItemImage: jest.fn(),
  deleteItemImage: jest.fn(async () => undefined),
}));

/**
 * A photo can be shared between a wishlist item and the purchase it became, and
 * an edit can be abandoned. So the field never touches the stored file: it only
 * changes what the form will save, and the service decides what to delete once
 * the save has happened.
 */

const STORED = 'file:///data/files/item-images/01H8.jpg';
const PICKED = 'file:///cache/ImagePicker/new.jpg';

const pickMock = jest.mocked(pickItemImage);
const deleteMock = jest.mocked(deleteItemImage);

beforeEach(() => {
  jest.clearAllMocks();
  pickMock.mockResolvedValue({ status: 'picked', uri: PICKED });
});

describe('ImagePickerField', () => {
  it('hands a new photo to the form and leaves the stored one on disk', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<ImagePickerField value={STORED} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('Replace photo'));

    expect(onChange).toHaveBeenCalledWith(PICKED);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('clears the photo in the form without deleting the file', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<ImagePickerField value={STORED} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('Remove photo'));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('changes nothing when the picker is cancelled', async () => {
    pickMock.mockResolvedValueOnce({ status: 'cancelled' });
    const onChange = jest.fn();
    await renderWithProviders(<ImagePickerField value={STORED} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('Replace photo'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('says why when the photo library is not allowed', async () => {
    pickMock.mockResolvedValueOnce({ status: 'permission_denied' });
    await renderWithProviders(<ImagePickerField value={null} onChange={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Add a photo'));

    expect(
      screen.getByText(
        'ThinkTwice needs access to your photos to add one. You can allow it in Settings.',
      ),
    ).toBeTruthy();
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
