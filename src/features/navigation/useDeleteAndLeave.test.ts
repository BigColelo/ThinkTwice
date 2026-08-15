import { act, renderHook } from '@testing-library/react-native';

import { useDeleteAndLeave, type DeleteAndLeave } from './useDeleteAndLeave';

type Record = { id: string; name: string };

const record: Record = { id: 'w1', name: 'Espresso machine' };

/** Stands in for a detail screen: a query result that a delete turns to `null`. */
function setup(leave: () => void): ReturnType<
  typeof renderHook<DeleteAndLeave<Record>, { data: Record | null }>
> {
  return renderHook<DeleteAndLeave<Record>, { data: Record | null }>(
    ({ data }) => useDeleteAndLeave(data, leave),
    { initialProps: { data: record as Record | null } },
  );
}

describe('useDeleteAndLeave', () => {
  it('passes the live record through while nothing is being deleted', async () => {
    const { result } = await setup(jest.fn());

    expect(result.current.data).toBe(record);
    expect(result.current.isDeleting).toBe(false);
  });

  it('keeps showing the deleted record while the screen leaves', async () => {
    const leave = jest.fn();
    const deleteRecord = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = await setup(leave);

    await act(async () => {
      await result.current.remove(deleteRecord);
    });
    // The write invalidated the entity, so the screen's query re-read a row
    // that is no longer there.
    await rerender({ data: null });

    expect(deleteRecord).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe(record);
    expect(result.current.isDeleting).toBe(true);
  });

  it('releases the record and rethrows when the delete fails', async () => {
    const leave = jest.fn();
    const { result, rerender } = await setup(leave);

    await act(async () => {
      await expect(
        result.current.remove(() => Promise.reject(new Error('database is locked'))),
      ).rejects.toThrow('database is locked');
    });
    await rerender({ data: null });

    // The screen is staying, so it reports what is really there.
    expect(leave).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    expect(result.current.isDeleting).toBe(false);
  });

  it('still reports a record that vanished on its own as missing', async () => {
    const { result, rerender } = await setup(jest.fn());

    await rerender({ data: null });

    expect(result.current.data).toBeNull();
  });
});
