import { useRouter } from 'expo-router';
import { Clock, Lightbulb, Receipt, type LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThinkTwiceMark } from '@/components/brand/ThinkTwiceMark';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { MoneyField } from '@/components/ui/MoneyField';
import { Screen } from '@/components/ui/Screen';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useTheme } from '@/theme';
import type { Cents } from '@/types/domain';

/**
 * Three short screens explaining what the app is for, then an optional setup
 * step. Nothing here is mandatory: the user can skip straight in, and every
 * figure asked for can be filled in later from the Money screen.
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

export default function OnboardingScreen(): React.ReactElement {
  const [step, setStep] = useState(0);
  const isSetupStep = step === SLIDES.length;

  return isSetupStep ? (
    <SetupStep onBack={() => setStep(SLIDES.length - 1)} />
  ) : (
    <IntroStep step={step} onNext={() => setStep(step + 1)} onSkip={() => setStep(SLIDES.length)} />
  );
}

function IntroStep({
  step,
  onNext,
  onSkip,
}: {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  if (!slide) return <View />;

  const Icon = slide.icon;

  return (
    <Screen edgeTop edgeBottom>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThinkTwiceMark size={120} />

        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: theme.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.accent.soft,
            marginTop: theme.spacing.xxl,
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

      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step + 1} of ${SLIDES.length}`}
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: theme.spacing.xs,
          marginBottom: theme.spacing.lg,
        }}
      >
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={{
              width: index === step ? 20 : 6,
              height: 6,
              borderRadius: theme.radius.full,
              backgroundColor: index === step ? theme.colors.accent.base : theme.colors.border,
            }}
          />
        ))}
      </View>

      <Button label={isLast ? 'Get started' : 'Continue'} onPress={isLast ? onSkip : onNext} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip introduction"
        onPress={onSkip}
        hitSlop={theme.spacing.sm}
        style={({ pressed }) => [
          { alignSelf: 'center', marginTop: theme.spacing.sm },
          pressed ? { opacity: 0.6 } : null,
        ]}
      >
        <AppText variant="label" color="tertiary">
          {isLast ? ' ' : 'Skip'}
        </AppText>
      </Pressable>
    </Screen>
  );
}

/**
 * The optional setup step. Income is what unlocks the impact figures, so it is
 * asked for once here — and can be skipped without consequence.
 */
function SetupStep({ onBack }: { onBack: () => void }): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const { updateSettings } = useSettings();

  const [incomeCents, setIncomeCents] = useState<Cents | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const finish = async (withIncome: boolean): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateSettings({
        onboardingCompleted: true,
        ...(withIncome && incomeCents != null ? { monthlyNetIncomeCents: incomeCents } : {}),
      });
      router.replace('/');
    } catch {
      setSaveError('Your setup could not be saved. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <Screen scroll edgeTop avoidKeyboard>
      <AppText variant="display" style={{ marginTop: theme.spacing.xl }}>
        One number to start
      </AppText>
      <AppText variant="body" color="secondary" style={{ marginTop: theme.spacing.sm }}>
        Your monthly net income is what lets ThinkTwice put a price in context. You can add it later
        instead, and add your recurring commitments whenever you like.
      </AppText>

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
        <MoneyField
          label="Monthly net income"
          hint="What actually reaches your account each month."
          valueCents={incomeCents}
          onChangeCents={setIncomeCents}
        />

        {saveError ? (
          <AppText variant="caption" color="danger" accessibilityRole="alert">
            {saveError}
          </AppText>
        ) : null}

        <Button
          label="Continue"
          onPress={() => finish(true)}
          loading={isSaving}
          disabled={incomeCents == null}
        />
        <Button
          label="Skip for now"
          variant="ghost"
          size="md"
          onPress={() => finish(false)}
          disabled={isSaving}
        />
        <Button label="Back" variant="ghost" size="sm" onPress={onBack} disabled={isSaving} />
      </View>
    </Screen>
  );
}
