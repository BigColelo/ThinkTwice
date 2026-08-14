import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Pencil, Repeat, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ItemImage } from '@/components/ui/ItemImage';
import { MoneyValue } from '@/components/ui/MoneyValue';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { MetricCell, MetricDivider } from '@/components/ui/StatCard';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { getPurchaseCategory } from '@/constants/categories';
import { usageFrequencyShortLabel } from '@/constants/usagePresets';
import { useRepositories } from '@/db/DatabaseProvider';
import {
  calculateCooldownState,
  calculateEstimatedCostPerUse,
  calculateEstimatedUses,
  calculatePurchaseImpact,
} from '@/domain';
import { useMonthlyFinances } from '@/features/money/hooks/useMonthlyFinances';
import { useGoBack } from '@/features/navigation/useGoBack';
import { ConfirmPurchaseSheet } from '@/features/wishlist/components/ConfirmPurchaseSheet';
import { CooldownCard } from '@/features/wishlist/components/CooldownCard';
import { PurchaseImpactCard } from '@/features/wishlist/components/PurchaseImpactCard';
import { wishlistDeleteConfirmation } from '@/features/wishlist/deleteConfirmation';
import { useWishlistItem } from '@/features/wishlist/hooks/useWishlist';
import {
  convertWishlistItemToPurchase,
  deleteWishlistItem,
  dismissWishlistItem,
  type ConvertToPurchaseOptions,
} from '@/features/wishlist/services/wishlistActions';
import { useTheme } from '@/theme';
import { confirm } from '@/utils/confirm';
import { formatNumber } from '@/utils/currency';
import { formatMonthsAsDuration } from '@/utils/dates';

/**
 * The reflection screen — the heart of ThinkTwice.
 *
 * It presents the price in the user's own terms and then steps out of the way.
 * Both decisions are given equal visual weight; nothing on this screen argues
 * for either one.
 */
export default function WishlistDetailScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const repositories = useRepositories();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack('/wishlist');

  const { data: item, isLoading, error, refetch } = useWishlistItem(id);
  const { finances } = useMonthlyFinances();

  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const cooldown = useMemo(() => (item ? calculateCooldownState(item) : null), [item]);
  const impact = useMemo(
    () => (item ? calculatePurchaseImpact(item.priceCents, finances) : null),
    [item, finances],
  );

  const estimatedUses = item
    ? calculateEstimatedUses({
        frequency: item.expectedUsageFrequency,
        customUsesPerMonth: item.customUsesPerMonth,
        expectedOwnershipMonths: item.expectedOwnershipMonths,
      })
    : null;
  const estimatedCostPerUse = item
    ? calculateEstimatedCostPerUse(item.priceCents, estimatedUses)
    : null;

  // The sheet collects the two facts the wishlist item cannot know — what was
  // paid and when — and surfaces its own failure, so this only navigates.
  const handlePurchaseConfirmed = async (
    options: Required<ConvertToPurchaseOptions>,
  ): Promise<void> => {
    if (!item) return;
    const purchase = await convertWishlistItemToPurchase(repositories, item, options);
    setIsConfirmingPurchase(false);
    router.replace(`/purchase/${purchase.id}`);
  };

  const handleDismissed = async (): Promise<void> => {
    if (!item) return;
    const confirmed = await confirm({
      title: 'Remove from what you are considering?',
      message: 'The item stays in your history, and the reminder is cancelled.',
      confirmLabel: "I don't want it",
    });
    if (!confirmed) return;

    setIsDismissing(true);
    setActionError(null);
    try {
      await dismissWishlistItem(repositories, item.id);
      goBack();
    } catch {
      setActionError('This could not be saved. Please try again.');
      setIsDismissing(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!item) return;
    // What is lost depends on where the item is in its life; the copy says which.
    const confirmed = await confirm(wishlistDeleteConfirmation(item.status));
    if (!confirmed) return;

    await deleteWishlistItem(repositories, item);
    goBack();
  };

  if (isLoading) {
    return (
      <>
        <ScreenHeader onBack={goBack} />
        <Screen>
          <LoadingState />
        </Screen>
      </>
    );
  }

  if (error || !item) {
    return (
      <>
        <ScreenHeader onBack={goBack} />
        <Screen>
          <ErrorState
            title="Item not found"
            description="This item may have been deleted."
            onRetry={refetch}
          />
        </Screen>
      </>
    );
  }

  const category = getPurchaseCategory(item.categoryId);
  const isDecided = item.status === 'purchased' || item.status === 'dismissed';

  return (
    <>
      <ScreenHeader
        title={item.name}
        onBack={goBack}
        // Editing is the trailing action; deleting sits at the end of the screen,
        // where an irreversible choice is harder to tap by accident.
        action={
          isDecided
            ? undefined
            : {
                icon: Pencil,
                accessibilityLabel: 'Edit item',
                onPress: () => router.push(`/wishlist/edit/${item.id}`),
              }
        }
      />

      <Screen
        scroll
        footer={
          isDecided ? undefined : (
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                label="I don't want it anymore"
                variant="secondary"
                onPress={handleDismissed}
                loading={isDismissing}
                style={{ flex: 1 }}
              />
              <Button
                label="I bought it"
                onPress={() => setIsConfirmingPurchase(true)}
                disabled={isDismissing}
                style={{ flex: 1 }}
              />
            </View>
          )
        }
      >
        <ItemImage uri={item.imageUri} height={220} style={{ marginBottom: theme.spacing.md }} />

        <AppText variant="title">{item.name}</AppText>
        <MoneyValue
          cents={item.priceCents}
          variant="metric"
          style={{ marginTop: theme.spacing.xxs }}
        />
        <View style={{ flexDirection: 'row', marginTop: theme.spacing.xs }}>
          <Chip label={category.label} icon={category.icon} tint={category.tint} />
        </View>

        {isDecided ? (
          <View style={{ marginTop: theme.spacing.md }}>
            <Chip
              label={item.status === 'purchased' ? 'You bought this' : 'You decided against this'}
              tone={item.status === 'purchased' ? 'positive' : 'neutral'}
            />
          </View>
        ) : cooldown ? (
          <View style={{ marginTop: theme.spacing.md }}>
            <CooldownCard state={cooldown} cooldownDays={item.cooldownDays} />
          </View>
        ) : null}

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title="Purchase impact" />
        {impact ? <PurchaseImpactCard impact={impact} /> : null}

        <View style={{ height: theme.spacing.xl }} />
        <SectionHeader title="Expected usage" />

        <Card padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
            <Chip
              icon={Repeat}
              label={usageFrequencyShortLabel(item.expectedUsageFrequency, item.customUsesPerMonth)}
            />
            <Chip icon={Calendar} label={formatMonthsAsDuration(item.expectedOwnershipMonths)} />
          </View>

          <View
            style={{
              height: theme.sizes.hairline,
              backgroundColor: theme.colors.divider,
              marginVertical: theme.spacing.md,
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
            <MetricCell
              label="estimated uses"
              value={estimatedUses == null ? '—' : formatNumber(estimatedUses)}
            />
            <MetricDivider />
            <MetricCell
              label="estimated cost / use"
              value={
                estimatedCostPerUse == null ? (
                  <AppText variant="metricSmall" color="tertiary">
                    —
                  </AppText>
                ) : (
                  <MoneyValue
                    cents={estimatedCostPerUse}
                    variant="metricSmall"
                    decimals="always"
                    adjustsFontSizeToFit
                    numberOfLines={1}
                  />
                )
              }
            />
          </View>
        </Card>

        {item.reasonTags.length > 0 ? (
          <>
            <View style={{ height: theme.spacing.xl }} />
            <SectionHeader title="Why you want it" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
              {item.reasonTags.map((tag) => (
                <Chip key={tag} label={tag} tone="accent" />
              ))}
            </View>
          </>
        ) : null}

        {item.notes ? (
          <>
            <View style={{ height: theme.spacing.xl }} />
            <SectionHeader title="Notes" />
            <Card padding={theme.spacing.md}>
              <AppText variant="body" color="secondary">
                {item.notes}
              </AppText>
            </Card>
          </>
        ) : null}

        {actionError ? (
          <AppText
            variant="caption"
            color="danger"
            accessibilityRole="alert"
            style={{ marginTop: theme.spacing.md }}
          >
            {actionError}
          </AppText>
        ) : null}

        <View style={{ height: theme.spacing.xl }} />
        <Button
          label="Delete this item"
          variant="destructive"
          icon={Trash2}
          onPress={handleDelete}
        />
      </Screen>

      <ConfirmPurchaseSheet
        item={item}
        visible={isConfirmingPurchase}
        onClose={() => setIsConfirmingPurchase(false)}
        onConfirm={handlePurchaseConfirmed}
      />
    </>
  );
}
