import { useRouter } from 'expo-router';
import { Heart, Package } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableCard } from '@/components/ui/Card';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { getPurchaseCategory } from '@/constants/categories';
import { useGoBack } from '@/features/navigation/useGoBack';
import { useRecentPurchases } from '@/features/purchases/hooks/usePurchases';
import { useWishlistPreview } from '@/features/wishlist/hooks/useWishlist';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The central add action. One question, two answers — the distinction between
 * something being considered and something already owned is what decides which
 * of the app's two halves the item belongs to.
 */
export default function AddItemScreen(): React.ReactElement {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const goBack = useGoBack('/');

  const wishlist = useWishlistPreview(2);
  const purchases = useRecentPurchases(2);

  const recent = [
    ...(wishlist.data ?? []).map((item) => ({
      key: `w-${item.id}`,
      name: item.name,
      cents: item.priceCents,
      categoryId: item.categoryId,
      imageUri: item.imageUri,
      href: `/wishlist/${item.id}` as const,
      caption: t('add.thinkingCaption'),
    })),
    ...(purchases.data ?? []).map((purchase) => ({
      key: `p-${purchase.id}`,
      name: purchase.name,
      cents: purchase.purchasePriceCents,
      categoryId: purchase.categoryId,
      imageUri: purchase.imageUri,
      href: `/purchase/${purchase.id}` as const,
      caption: t('add.ownedCaption'),
    })),
  ].slice(0, 4);

  return (
    <>
      <ScreenHeader
        title={t('add.screenTitle')}
        textAction={{ label: t('common.close'), onPress: goBack }}
      />

      <Screen scroll>
        <AppText variant="title" style={{ marginBottom: theme.spacing.md }}>
          {t('add.question')}
        </AppText>

        <View style={{ gap: theme.spacing.sm }}>
          <ChoiceCard
            icon={Heart}
            title={t('add.wantToBuy')}
            description={t('add.wantToBuyDescription')}
            highlighted
            onPress={() => router.push('/add/wishlist')}
          />
          <ChoiceCard
            icon={Package}
            title={t('add.alreadyOwn')}
            description={t('add.alreadyOwnDescription')}
            onPress={() => router.push('/add/purchase')}
          />
        </View>

        {recent.length > 0 ? (
          <>
            <View style={{ height: theme.spacing.xl }} />
            <SectionHeader title={t('add.recent')} />
            <View style={{ gap: theme.spacing.xs }}>
              {recent.map((entry) => {
                const category = getPurchaseCategory(entry.categoryId);
                return (
                  <PressableCard
                    key={entry.key}
                    padding={theme.spacing.sm}
                    // A recent item is content, not a step of the add flow.
                    // Leaving the sheet first keeps its detail screen a card —
                    // the same thing it is from Home — instead of a third sheet
                    // stacked on this one, and makes "back" from it lead to
                    // Home rather than into a flow that is over.
                    onPress={() => {
                      if (router.canDismiss()) router.dismissAll();
                      router.push(entry.href);
                    }}
                    accessibilityLabel={t('add.entryLabel', {
                      name: entry.name,
                      caption: entry.caption,
                    })}
                  >
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
                    >
                      <Thumbnail
                        uri={entry.imageUri}
                        fallbackIcon={category.icon}
                        tint={category.tint}
                        size={theme.sizes.thumbnail.sm}
                      />
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {entry.name}
                        </AppText>
                        <AppText variant="caption" color="secondary">
                          {entry.caption}
                        </AppText>
                      </View>
                      <MoneyValue cents={entry.cents} variant="body" color="secondary" />
                    </View>
                  </PressableCard>
                );
              })}
            </View>
          </>
        ) : null}
      </Screen>
    </>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  onPress,
  highlighted = false,
}: {
  icon: typeof Heart;
  title: string;
  description: string;
  onPress: () => void;
  highlighted?: boolean;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <PressableCard
      variant={highlighted ? 'accent' : 'surface'}
      onPress={onPress}
      padding={theme.spacing.md}
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: highlighted ? theme.colors.surface : theme.colors.surfaceMuted,
          }}
        >
          <Icon
            size={theme.sizes.icon.lg}
            color={highlighted ? theme.colors.accent.base : theme.colors.text.secondary}
            strokeWidth={theme.sizes.iconStrokeWidth}
          />
        </View>

        <View style={{ flex: 1 }}>
          <AppText variant="subheading">{title}</AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {description}
          </AppText>
        </View>
      </View>
    </PressableCard>
  );
}
