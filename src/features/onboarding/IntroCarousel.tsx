import { Clock, Lightbulb, Receipt, type LucideIcon } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThinkTwiceMark } from '@/components/brand/ThinkTwiceMark';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/theme';
import { clamp } from '@/utils/numbers';

/**
 * The three intro slides.
 *
 * A horizontally paged scroll view rather than one slide swapped by a button:
 * the dots below are the universal affordance for "swipe", so they have to be
 * telling the truth. The buttons drive the same scroll position, which keeps the
 * two ways of moving in step instead of competing.
 */

type Slide = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const SLIDES: readonly Slide[] = [
  {
    icon: Lightbulb,
    title: 'Buy better.\nLive better.',
    body: 'ThinkTwice helps you understand the real impact of your purchases — before and after you make them.',
  },
  {
    icon: Clock,
    title: 'Think before\nyou buy.',
    body: 'Add what you are considering, see how it compares to your month, and give yourself a reflection period before deciding.',
  },
  {
    icon: Receipt,
    title: 'Know the\nreal cost.',
    body: 'Record each use with one tap. Over time, a price turns into something more useful: a cost per use.',
  },
];

export const PAGER_TEST_ID = 'onboarding-pager';

export function IntroCarousel({ onDone }: { onDone: () => void }): React.ReactElement {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [index, setIndex] = useState(0);
  // The scroll and layout handlers need the current page without waiting for a
  // render, so it is mirrored in a ref.
  const indexRef = useRef(0);

  const setPage = (next: number): void => {
    indexRef.current = next;
    setIndex(next);
  };

  const isLast = index === SLIDES.length - 1;

  const goTo = (next: number): void => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (width <= 0) return;
    const next = clamp(Math.round(event.nativeEvent.contentOffset.x / width), 0, SLIDES.length - 1);
    if (next !== indexRef.current) setPage(next);
  };

  return (
    <Screen padded={false} edgeTop edgeBottom>
      {/* Fixed above the pager: the mark is the one thing that should not move
          while the content slides past it. */}
      <View style={{ alignItems: 'center', paddingTop: theme.spacing.xl }}>
        <ThinkTwiceMark size={120} />
      </View>

      <ScrollView
        ref={scrollRef}
        testID={PAGER_TEST_ID}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        // Fires on mount and on rotation, which is exactly when the offset has to
        // be re-derived from the page the user is on.
        onLayout={() =>
          scrollRef.current?.scrollTo({ x: indexRef.current * width, animated: false })
        }
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => {
          const Icon = slide.icon;

          return (
            <View
              key={slide.title}
              style={{
                width,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: theme.screenPadding,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: theme.radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.accent.soft,
                }}
              >
                <Icon
                  size={theme.sizes.icon.xl}
                  color={theme.colors.accent.base}
                  strokeWidth={theme.sizes.iconStrokeWidth}
                />
              </View>

              <AppText variant="display" align="center" style={{ marginTop: theme.spacing.lg }}>
                {slide.title}
              </AppText>
              <AppText
                variant="body"
                color="secondary"
                align="center"
                style={{ marginTop: theme.spacing.sm, maxWidth: 320 }}
              >
                {slide.body}
              </AppText>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: theme.screenPadding }}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}
          accessibilityValue={{ min: 1, max: SLIDES.length, now: index + 1 }}
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.spacing.xs,
            marginBottom: theme.spacing.lg,
          }}
        >
          {SLIDES.map((slide, dotIndex) => (
            <View
              key={slide.title}
              style={{
                width: dotIndex === index ? 20 : 6,
                height: 6,
                borderRadius: theme.radius.full,
                backgroundColor:
                  dotIndex === index ? theme.colors.accent.base : theme.colors.border,
              }}
            />
          ))}
        </View>

        <Button
          label={isLast ? 'Get started' : 'Continue'}
          onPress={isLast ? onDone : () => goTo(index + 1)}
        />

        {isLast ? (
          // Holds the same height as the Skip control so the primary button does
          // not shift on the last slide — as a plain view, because a blank
          // pressable would still be announced as a button and still be tappable.
          <View
            style={{ height: theme.typography.label.lineHeight, marginTop: theme.spacing.sm }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
            onPress={onDone}
            hitSlop={theme.spacing.sm}
            style={({ pressed }) => [
              { alignSelf: 'center', marginTop: theme.spacing.sm },
              pressed ? { opacity: 0.6 } : null,
            ]}
          >
            <AppText variant="label" color="tertiary">
              Skip
            </AppText>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}
