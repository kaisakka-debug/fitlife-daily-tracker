'use client';

import { useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaRegistrarProps {
  onInstallPromptReady: (event: BeforeInstallPromptEvent | null) => void;
}

export function PwaRegistrar({ onInstallPromptReady }: PwaRegistrarProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => undefined);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      onInstallPromptReady(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      onInstallPromptReady(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [onInstallPromptReady]);

  return null;
}
