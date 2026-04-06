import { useState, useRef, useCallback, useEffect, type MutableRefObject } from 'react';
import { useGameStore } from '@/store/gameStore';
import { GamePhase } from '@/game/types';

export function useBattingTutorial(
  phaseTimerRef: MutableRefObject<number>,
  showBattingTutorialRef: MutableRefObject<boolean>,
) {
  const [showBattingTutorial, setShowBattingTutorial] = useState(false);
  const tutorialShownRef = useRef(false);

  const store = useGameStore();

  useEffect(() => {
    if (
      store.gameStarted &&
      store.isPlayerBatting &&
      store.phase === GamePhase.PrePitch &&
      !tutorialShownRef.current &&
      !store.practiceMode
    ) {
      try {
        if (!localStorage.getItem('battingTutorialSeen')) {
          setShowBattingTutorial(true);
          tutorialShownRef.current = true;
        }
      } catch {
        /* localStorage may not be available */
      }
    }
  }, [store.gameStarted, store.isPlayerBatting, store.phase, store.practiceMode, showBattingTutorialRef]);

  const dismissTutorial = useCallback(() => {
    setShowBattingTutorial(false);
    try { localStorage.setItem('battingTutorialSeen', '1'); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (!showBattingTutorial) return;
    const timer = setTimeout(() => dismissTutorial(), 15000);
    return () => clearTimeout(timer);
  }, [showBattingTutorial, dismissTutorial]);

  return { showBattingTutorial, dismissTutorial };
}
