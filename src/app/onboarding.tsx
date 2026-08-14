import React, { useState } from 'react';

import { IncomeSetupStep } from '@/features/onboarding/IncomeSetupStep';
import { IntroCarousel } from '@/features/onboarding/IntroCarousel';

/**
 * Three short slides explaining what the app is for, then an optional setup
 * step. Nothing here is mandatory: the user can skip straight in, and every
 * figure asked for can be filled in later from the Money screen.
 */
export default function OnboardingScreen(): React.ReactElement {
  const [isSetupStep, setIsSetupStep] = useState(false);

  return isSetupStep ? (
    <IncomeSetupStep onBack={() => setIsSetupStep(false)} />
  ) : (
    <IntroCarousel onDone={() => setIsSetupStep(true)} />
  );
}
