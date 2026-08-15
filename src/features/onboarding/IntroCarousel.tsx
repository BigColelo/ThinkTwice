import { Clock, Lightbulb, Receipt, type LucideIcon } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  I18nManager,
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
import { type TranslationKey, useT } from '@/i18n';
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
  id: string;
  icon: LucideIcon;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
};

const SLIDES: readonly Slide[] = [
  {
    id: 'first',
    icon: Lightbulb,
    titleKey: 'onboarding.slides.first.title',
    bodyKey: 'onboarding.slides.first.body',
  },
  {
    id: 'second',
    icon: Clock,
    titleKey: 'onboarding.slides.second.title',
    bodyKey: 'onboarding.slides.second.body',
  },
  {
    id: 'third',
    icon: Receipt,
    titleKey: 'onboarding.slides.third.title',
    bodyKey: 'onboarding.slides.third.body',
  },
];

export const PAGER_TEST_ID = 'onboarding-pager';

export function IntroCarousel({ onDone }: { onDone: () => void }): React.ReactElement {
  const theme = useTheme();
  const t = useT();
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

  /**
   * The horizontal offset of a page.
   *
   * Under a right-to-left layout the first page sits at the far end of the
   * content rather than at zero, so scrolling to `page * width` would jump to
   * the wrong slide — and the offset a scroll reports counts back from there.
   */
  const offsetOf = (page: number): number =>
    I18nManager.isRTL ? (SLIDES.length - 1 - page) * width : page * width;

  const pageAt = (offset: number): number => {
    const raw = Math.round(offset / width);
    return clamp(I18nManager.isRTL ? SLIDES.length - 1 - raw : raw, 0, SLIDES.length - 1);
  };

  const isLast = index === SLIDES.length - 1;

  const goTo = (next: number): void => {
    scrollRef.current?.scrollTo({ x: offsetOf(next), animated: true });
    setPage(next);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (width <= 0) return;
    const next = pageAt(event.nativeEvent.contentOffset.x);
    if (next !== indexRef.current) setPage(next);
  };

  return (
    <Screen padded={false} edgeBottom>
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
          scrollRef.current?.scrollTo({ x: offsetOf(indexRef.current), animated: false })
        }
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => {
          const Icon = slide.icon;

          return (
            <View
              key={slide.id}
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
                {t(slide.titleKey)}
              </AppText>
              <AppText
                variant="body"
                color="secondary"
                align="center"
                style={{ marginTop: theme.spacing.sm, maxWidth: theme.sizes.readableTextWidth }}
              >
                {t(slide.bodyKey)}
              </AppText>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: theme.screenPadding }}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={t('onboarding.stepLabel', {
            current: index + 1,
            total: SLIDES.length,
          })}
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
              key={slide.id}
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
          label={isLast ? t('onboarding.getStarted') : t('onboarding.continue')}
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
            accessibilityLabel={t('onboarding.skipLabel')}
            onPress={onDone}
            hitSlop={theme.spacing.sm}
            style={({ pressed }) => [
              { alignSelf: 'center', marginTop: theme.spacing.sm },
              pressed ? { opacity: 0.6 } : null,
            ]}
          >
            <AppText variant="label" color="tertiary">
              {t('onboarding.skip')}
            </AppText>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}
