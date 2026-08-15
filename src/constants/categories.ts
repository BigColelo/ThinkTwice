import {
  Armchair,
  Bike,
  BookOpen,
  Camera,
  Car,
  CreditCard,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  type LucideIcon,
  Package,
  Plane,
  ShieldCheck,
  Shirt,
  Smartphone,
  Tv,
  Utensils,
  Wifi,
  Zap,
} from 'lucide-react-native';

import type { TranslationKey } from '@/i18n';
import type { TintName } from '@/theme/palette';
import type { CategoryId } from '@/types/domain';

/**
 * Categories are a fixed V1 set: custom categories are an explicit non-goal, and
 * a closed set keeps the colour palette small and the insights chart readable.
 *
 * Ids are stable strings — they are persisted, so retranslating a label is safe
 * but changing an id would need a migration. The name the user reads is not
 * stored anywhere: each category carries the key of its own label instead, so
 * the same stored row reads "Photography" or "Fotografia" depending only on the
 * chosen language.
 */

export type Category = {
  id: CategoryId;
  labelKey: TranslationKey;
  icon: LucideIcon;
  tint: TintName;
};

/** Categories for things the user buys or wants to buy. */
export const PURCHASE_CATEGORIES: readonly Category[] = [
  { id: 'technology', labelKey: 'categories.technology', icon: Laptop, tint: 'blue' },
  { id: 'photography', labelKey: 'categories.photography', icon: Camera, tint: 'orange' },
  { id: 'clothing', labelKey: 'categories.clothing', icon: Shirt, tint: 'teal' },
  { id: 'sport', labelKey: 'categories.sport', icon: Dumbbell, tint: 'green' },
  { id: 'home', labelKey: 'categories.home', icon: Armchair, tint: 'violet' },
  { id: 'transport', labelKey: 'categories.transport', icon: Bike, tint: 'slate' },
  { id: 'health', labelKey: 'categories.health', icon: HeartPulse, tint: 'red' },
  { id: 'travel', labelKey: 'categories.travel', icon: Plane, tint: 'pink' },
  { id: 'entertainment', labelKey: 'categories.entertainment', icon: Gamepad2, tint: 'amber' },
  { id: 'education', labelKey: 'categories.education', icon: BookOpen, tint: 'blue' },
  { id: 'other', labelKey: 'categories.other', icon: Package, tint: 'amber' },
];

/** Categories for predictable monthly commitments. */
export const COMMITMENT_CATEGORIES: readonly Category[] = [
  { id: 'housing', labelKey: 'categories.housing', icon: House, tint: 'violet' },
  { id: 'utilities', labelKey: 'categories.utilities', icon: Zap, tint: 'amber' },
  { id: 'subscriptions', labelKey: 'categories.subscriptions', icon: Tv, tint: 'red' },
  { id: 'phone_internet', labelKey: 'categories.phone_internet', icon: Wifi, tint: 'blue' },
  { id: 'transport', labelKey: 'categories.transport', icon: Car, tint: 'slate' },
  { id: 'insurance', labelKey: 'categories.insurance', icon: ShieldCheck, tint: 'teal' },
  { id: 'health_fitness', labelKey: 'categories.health_fitness', icon: Dumbbell, tint: 'green' },
  { id: 'food', labelKey: 'categories.food', icon: Utensils, tint: 'orange' },
  { id: 'education', labelKey: 'categories.education', icon: GraduationCap, tint: 'pink' },
  { id: 'phone', labelKey: 'categories.phone', icon: Smartphone, tint: 'blue' },
  { id: 'other', labelKey: 'categories.other', icon: CreditCard, tint: 'amber' },
];

export const DEFAULT_PURCHASE_CATEGORY_ID: CategoryId = 'other';
export const DEFAULT_COMMITMENT_CATEGORY_ID: CategoryId = 'other';

const FALLBACK_CATEGORY: Category = {
  id: 'other',
  labelKey: 'categories.other',
  icon: Package,
  tint: 'slate',
};

const PURCHASE_BY_ID = new Map(PURCHASE_CATEGORIES.map((category) => [category.id, category]));
const COMMITMENT_BY_ID = new Map(COMMITMENT_CATEGORIES.map((category) => [category.id, category]));

/** Always returns a category, so a row from an older schema can still render. */
export function getPurchaseCategory(id: CategoryId | null | undefined): Category {
  return (id ? PURCHASE_BY_ID.get(id) : undefined) ?? FALLBACK_CATEGORY;
}

export function getCommitmentCategory(id: CategoryId | null | undefined): Category {
  return (id ? COMMITMENT_BY_ID.get(id) : undefined) ?? FALLBACK_CATEGORY;
}
