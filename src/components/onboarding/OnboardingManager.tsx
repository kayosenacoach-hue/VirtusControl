import { useState, useEffect } from 'react';
import { WelcomeSlides } from './WelcomeSlides';
import { GuidedTour } from './GuidedTour';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type OnboardingPhase = 'slides' | 'tour' | 'done';

const ONBOARDING_KEY_PREFIX = 'onboarding_completed_';
const CHECKLIST_KEY = 'onboarding_checklist_dismissed';

async function markOnboardingDone(profileId: string) {
  // 1. Salva localmente para resposta imediata (a tela não pisca)
  localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${profileId}`, 'true');
  
  // 2. Salva na nuvem (Metadata do Auth) para sincronizar entre Celular e PC!
  try {
    await supabase.auth.updateUser({
      data: { onboarding_completed: true }
    });
    // Opcional: Atualiza também a data no perfil público
    await supabase.from('profiles').update({ 
      updated_at: new Date().toISOString() 
    }).eq('id', profileId);
  } catch (error) {
    console.error('Erro ao salvar status do tutorial:', error);
  }
}

export function OnboardingManager() {
  const { profile, user } = useAuthContext();
  const [phase, setPhase] = useState<OnboardingPhase>('done');

  useEffect(() => {
    if (!profile || !user) return;
    
    // Verifica se já fez no aparelho atual OU se já fez na nuvem noutro aparelho
    const localCompleted = localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${profile.id}`);
    const cloudCompleted = user.user_metadata?.onboarding_completed;

    if (localCompleted || cloudCompleted) {
      // Se a nuvem diz que já fez, mas o aparelho atual não sabe, sincroniza o aparelho!
      if (cloudCompleted && !localCompleted) {
        localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${profile.id}`, 'true');
      }
      setPhase('done');
    } else {
      setPhase('slides');
    }
  }, [profile, user]);

  const handleSlidesComplete = (skipAll: boolean) => {
    if (skipAll) {
      // O usuário pulou o tutorial inteiro
      if (profile) markOnboardingDone(profile.id);
      setPhase('done');
    } else {
      // O usuário terminou de ler e vai para o Tour Interativo
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
  const { profile, user } = useAuthContext();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!profile || !user) return;
    
    const localCompleted = localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${profile.id}`);
    const cloudCompleted = user.user_metadata?.onboarding_completed;
    const checklistDismissed = localStorage.getItem(CHECKLIST_KEY);
    
    if ((localCompleted || cloudCompleted) && !checklistDismissed) {
      setShow(true);
    }
  }, [profile, user]);

  const dismiss = () => {
    localStorage.setItem(CHECKLIST_KEY, 'true');
    setShow(false);
  };

  return { show, dismiss };
}