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

import type { TintName } from '@/theme/palette';
import type { CategoryId } from '@/types/domain';

/**
 * Categories are a fixed V1 set: custom categories are an explicit non-goal, and
 * a closed set keeps the colour palette small and the insights chart readable.
 *
 * Ids are stable strings — they are persisted, so renaming a label is safe but
 * changing an id would need a migration.
 */

export type Category = {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  tint: TintName;
};

/** Categories for things the user buys or wants to buy. */
export const PURCHASE_CATEGORIES: readonly Category[] = [
  { id: 'technology', label: 'Technology', icon: Laptop, tint: 'blue' },
  { id: 'photography', label: 'Photography', icon: Camera, tint: 'orange' },
  { id: 'clothing', label: 'Clothing', icon: Shirt, tint: 'teal' },
  { id: 'sport', label: 'Sport', icon: Dumbbell, tint: 'green' },
  { id: 'home', label: 'Home', icon: Armchair, tint: 'violet' },
  { id: 'transport', label: 'Transport', icon: Bike, tint: 'slate' },
  { id: 'health', label: 'Health', icon: HeartPulse, tint: 'red' },
  { id: 'travel', label: 'Travel', icon: Plane, tint: 'pink' },
  { id: 'entertainment', label: 'Entertainment', icon: Gamepad2, tint: 'amber' },
  { id: 'education', label: 'Education', icon: BookOpen, tint: 'blue' },
  { id: 'other', label: 'Other', icon: Package, tint: 'amber' },
];

/** Categories for predictable monthly commitments. */
export const COMMITMENT_CATEGORIES: readonly Category[] = [
  { id: 'housing', label: 'Housing', icon: House, tint: 'violet' },
  { id: 'utilities', label: 'Utilities', icon: Zap, tint: 'amber' },
  { id: 'subscriptions', label: 'Subscriptions', icon: Tv, tint: 'red' },
  { id: 'phone_internet', label: 'Phone & internet', icon: Wifi, tint: 'blue' },
  { id: 'transport', label: 'Transport', icon: Car, tint: 'slate' },
  { id: 'insurance', label: 'Insurance', icon: ShieldCheck, tint: 'teal' },
  { id: 'health_fitness', label: 'Health & fitness', icon: Dumbbell, tint: 'green' },
  { id: 'food', label: 'Food', icon: Utensils, tint: 'orange' },
  { id: 'education', label: 'Education', icon: GraduationCap, tint: 'pink' },
  { id: 'phone', label: 'Phone', icon: Smartphone, tint: 'blue' },
  { id: 'other', label: 'Other', icon: CreditCard, tint: 'amber' },
];

export const DEFAULT_PURCHASE_CATEGORY_ID: CategoryId = 'other';
export const DEFAULT_COMMITMENT_CATEGORY_ID: CategoryId = 'other';

const FALLBACK_CATEGORY: Category = {
  id: 'other',
  label: 'Other',
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
