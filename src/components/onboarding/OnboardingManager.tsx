import { useState, useEffect } from 'react';
import { WelcomeSlides } from './WelcomeSlides';
import { GuidedTour } from './GuidedTour';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type OnboardingPhase = 'slides' | 'tour' | 'done';

const ONBOARDING_KEY_PREFIX = 'onboarding_completed_';
const CHECKLIST_KEY = 'onboarding_checklist_dismissed';

function markOnboardingDone(profileId: string) {
  localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${profileId}`, 'true');
  // Also persist in profile metadata so it works across devices
  supabase.from('profiles').update({ 
    updated_at: new Date().toISOString() 
  }).eq('id', profileId).then(() => {
    // We use a separate key in local storage as the primary check
  });
}

export function OnboardingManager() {
  const { profile } = useAuthContext();
  const [phase, setPhase] = useState<OnboardingPhase>('done');

  useEffect(() => {
    if (!profile) return;
    const completed = localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${profile.id}`);
    if (!completed) {
      setPhase('slides');
    }
  }, [profile]);

  const handleSlidesComplete = (skipAll: boolean) => {
    if (skipAll) {
      // User chose "Não quero ver o tutorial"
      if (profile) markOnboardingDone(profile.id);
      setPhase('done');
    } else {
      setPhase('tour');
    }
  };

  const handleTourComplete = () => {
    if (profile) markOnboardingDone(profile.id);
    setPhase('done');
  };

  if (phase === 'slides') {
    return (
      <WelcomeSlides
        userName={profile?.full_name?.split(' ')[0] || 'Usuário'}
        onComplete={handleSlidesComplete}
      />
    );
  }

  if (phase === 'tour') {
    return <GuidedTour onComplete={handleTourComplete} />;
  }

  return null;
}

export function useShowChecklist() {
  const { profile } = useAuthContext();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const onboardingDone = localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${profile.id}`);
    const checklistDismissed = localStorage.getItem(CHECKLIST_KEY);
    if (onboardingDone && !checklistDismissed) {
      setShow(true);
    }
  }, [profile]);

  const dismiss = () => {
    localStorage.setItem(CHECKLIST_KEY, 'true');
    setShow(false);
  };

  return { show, dismiss };
}
