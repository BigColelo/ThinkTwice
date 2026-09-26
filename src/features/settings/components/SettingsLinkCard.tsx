import type { LucideIcon } from 'lucide-react-native';
import React from 'react';

import { Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { ListRow } from '@/components/ui/ListRow';
import { useTheme, type TintName } from '@/theme';

/**
 * A settings section that is one row leading somewhere else — the language, the
 * currency, the monthly setup. The subtitle is the current value, so the row
 * answers "what is it set to" without being opened.
 */
export function SettingsLinkCard({
  icon,
  tint,
  title,
  subtitle,
  onPress,
}: {
  icon: LucideIcon;
  tint: TintName;
  title: string;
  subtitle: string;
  onPress: () => void;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <Card padding={theme.spacing.md}>
      <ListRow
        leading={<IconTile icon={icon} tint={tint} />}
        title={title}
        subtitle={subtitle}
        onPress={onPress}
        showChevron
      />
    </Card>
  );
}
