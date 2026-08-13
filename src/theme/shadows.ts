import { Platform, type ViewStyle } from 'react-native';

export type ElevationLevel = 'none' | 'card' | 'raised' | 'overlay';

/**
 * Light mode leans on soft shadows; dark mode leans on borders, because shadows
 * are invisible against a near-black background. Callers pass `isDark` rather
 * than branching at every call site.
 */
export function elevation(level: ElevationLevel, isDark: boolean): ViewStyle {
  if (level === 'none') return {};

  if (isDark) {
    // Depth in dark mode comes from surface lightness and borders, not shadow.
    return level === 'overlay'
      ? (Platform.select<ViewStyle>({
          ios: {
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
          },
          android: { elevation: 12 },
          default: { boxShadow: '0 12px 32px rgba(0,0,0,0.55)' } as ViewStyle,
        }) ?? {})
      : {};
  }

  const specs: Record<
    Exclude<ElevationLevel, 'none'>,
    { opacity: number; radius: number; y: number; android: number }
  > = {
    card: { opacity: 0.05, radius: 12, y: 3, android: 1 },
    raised: { opacity: 0.08, radius: 20, y: 8, android: 4 },
    overlay: { opacity: 0.14, radius: 32, y: 16, android: 12 },
  };

  const spec = specs[level];

  return (
    Platform.select<ViewStyle>({
      ios: {
        shadowColor: '#1B1B28',
        shadowOpacity: spec.opacity,
        shadowRadius: spec.radius,
        shadowOffset: { width: 0, height: spec.y },
      },
      android: { elevation: spec.android },
      default: {
        boxShadow: `0 ${spec.y}px ${spec.radius}px rgba(27,27,40,${spec.opacity})`,
      } as ViewStyle,
    }) ?? {}
  );
}
