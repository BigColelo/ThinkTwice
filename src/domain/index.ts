export {
  calculateAvailableAfterCommitments,
  calculateMonthlyFinances,
  EMPTY_MONTHLY_FINANCES,
  type MonthlyFinances,
  type MonthlyFinancesInput,
} from './money/calculations';

export {
  calculateAnnualCommitmentEquivalent,
  calculateMonthlyCommitmentEquivalent,
  calculateTotalAnnualCommitments,
  calculateTotalMonthlyCommitments,
} from './recurring/calculations';

export {
  calculateEstimatedCostPerUse,
  calculateEstimatedUses,
  resolveUsesPerMonth,
  type ExpectedUsageInput,
} from './wishlist/usage';

export {
  calculatePurchaseImpact,
  classifyImpact,
  impactLevelLabel,
  IMPACT_LOW_MAX_RATIO,
  IMPACT_MODERATE_MAX_RATIO,
  type ImpactLevel,
  type PurchaseImpact,
} from './wishlist/impact';

export {
  calculateCooldownEnd,
  calculateCooldownState,
  COOLDOWN_DAY_OPTIONS,
  DEFAULT_COOLDOWN_DAYS,
  formatCooldownRemaining,
  formatCooldownRemainingShort,
  MAX_COOLDOWN_DAYS,
  MIN_COOLDOWN_DAYS,
  reviseCooldownForPrice,
  suggestCooldownDays,
  type CooldownRevision,
  type CooldownRevisionInput,
  type CooldownState,
  type CooldownSuggestion,
} from './wishlist/cooldown';

export {
  buildPurchaseFromWishlistItem,
  isDecided,
  resolveWishlistStatus,
  type ConvertWishlistItemOptions,
  type PurchaseDraft,
} from './wishlist/conversion';

export {
  calculateAdditionalExpenses,
  calculateCurrentOwnershipCost,
  calculateOwnershipDuration,
  calculatePurchaseMetrics,
  calculateRealCostPerUse,
  type OwnershipCost,
  type OwnershipDuration,
  type PurchaseMetrics,
} from './purchase/calculations';

export {
  calculateInsights,
  filterDismissedByRange,
  filterPurchasesByRange,
  INSIGHTS_RANGES,
  type CategoryBreakdownEntry,
  type DismissedItem,
  type InsightsRange,
  type InsightsSummary,
  type ValueHighlight,
} from './insights/calculations';
