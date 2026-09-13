import React from 'react';

import { CrashScreen } from './CrashScreen';

/**
 * The last line of defence against a render error.
 *
 * When something throws during render and nothing catches it, React unmounts
 * the whole tree; in a production build that is React Native's own red screen,
 * with no way back but killing the app. Mounted just below the bootstrap theme
 * and language providers in the root layout, this catches an error thrown
 * anywhere else — a screen, a provider, the navigator itself — and shows
 * `CrashScreen` in its place. Retrying clears the error and re-mounts everything
 * below, database included, which is the same fresh start a relaunch would give.
 *
 * A class, because that is the only kind of component React lets catch render
 * errors. Nothing is reported anywhere: the app has no crash reporting by
 * design, and React already logs the error to the console.
 */

type AppErrorBoundaryProps = { children: React.ReactNode };
type AppErrorBoundaryState = { error: Error | null };

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  override state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(thrown: unknown): AppErrorBoundaryState {
    // A component can throw anything; the screen prints a message, so it needs an Error.
    return { error: thrown instanceof Error ? thrown : new Error(String(thrown)) };
  }

  private readonly retry = (): void => {
    this.setState({ error: null });
  };

  override render(): React.ReactNode {
    if (this.state.error) return <CrashScreen error={this.state.error} onRetry={this.retry} />;
    return this.props.children;
  }
}
