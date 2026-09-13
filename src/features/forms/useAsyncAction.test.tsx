import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';

import { useAsyncAction, type RunOptions } from './useAsyncAction';

/**
 * Nine components run their writes through this, so its two failure modes are
 * worth pinning: a button left spinning forever after a write threw, and a
 * message from a previous attempt still on screen during the next one.
 *
 * The third is the one that needs an option. A form that navigates away on
 * success must keep its button busy until it is gone — releasing it paints one
 * frame of a normal button while the transition is still running, which reads as
 * the tap having done nothing.
 */

function Probe({
  action,
  options,
  onFinished,
}: {
  action: () => Promise<unknown>;
  options: RunOptions;
  onFinished?: (succeeded: boolean) => void;
}): React.ReactElement {
  const task = useAsyncAction();

  return (
    <>
      <Pressable testID="run" onPress={() => void task.run(action, options).then(onFinished)}>
        <Text>run</Text>
      </Pressable>
      <Pressable testID="reset" onPress={task.reset}>
        <Text>reset</Text>
      </Pressable>
      <Text testID="running">{String(task.isRunning)}</Text>
      <Text testID="error">{task.error ?? 'none'}</Text>
    </>
  );
}

const FAILS = (): Promise<never> => Promise.reject(new Error('storage'));
const WORKS = (): Promise<string> => Promise.resolve('written');

describe('useAsyncAction', () => {
  it('reports success and leaves no message behind', async () => {
    const onFinished = jest.fn();
    await render(
      <Probe action={WORKS} options={{ errorMessage: 'Nope.' }} onFinished={onFinished} />,
    );

    await fireEvent.press(screen.getByTestId('run'));

    await waitFor(() => expect(onFinished).toHaveBeenCalledWith(true));
    expect(screen.getByTestId('running')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('reports a failure with the caller’s own message, and stops being busy', async () => {
    // A button left spinning is the worst outcome: nothing happened and nothing
    // says so.
    const onFinished = jest.fn();
    await render(
      <Probe action={FAILS} options={{ errorMessage: 'Not saved.' }} onFinished={onFinished} />,
    );

    await fireEvent.press(screen.getByTestId('run'));

    await waitFor(() => expect(onFinished).toHaveBeenCalledWith(false));
    expect(screen.getByTestId('running')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('Not saved.');
  });

  it('stays busy after a success that leaves the screen', async () => {
    await render(
      <Probe
        action={WORKS}
        options={{ errorMessage: 'Nope.', stayBusyOnSuccess: true }}
        onFinished={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('run'));

    await waitFor(() => expect(screen.getByTestId('running')).toHaveTextContent('true'));
  });

  it('releases the button even so when that success never came', async () => {
    // `stayBusyOnSuccess` must not strand a form whose save failed.
    await render(
      <Probe action={FAILS} options={{ errorMessage: 'Not saved.', stayBusyOnSuccess: true }} />,
    );

    await fireEvent.press(screen.getByTestId('run'));

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Not saved.'));
    expect(screen.getByTestId('running')).toHaveTextContent('false');
  });

  it('clears the previous failure when asked again', async () => {
    const action = jest.fn<Promise<unknown>, []>().mockRejectedValueOnce(new Error('storage'));
    await render(<Probe action={action} options={{ errorMessage: 'Not saved.' }} />);

    await fireEvent.press(screen.getByTestId('run'));
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Not saved.'));

    action.mockResolvedValueOnce('written');
    await fireEvent.press(screen.getByTestId('run'));

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('none'));
  });

  it('drops a message the user has moved on from', async () => {
    // A sheet that reopens should not still be showing why it failed last time.
    await render(<Probe action={FAILS} options={{ errorMessage: 'Not saved.' }} />);

    await fireEvent.press(screen.getByTestId('run'));
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Not saved.'));

    await fireEvent.press(screen.getByTestId('reset'));

    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });
});
