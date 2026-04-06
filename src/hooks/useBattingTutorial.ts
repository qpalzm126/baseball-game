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
          showBattingTutorialRef.current = true;
          tutorialShownRef.current = true;
        }
      } catch {
        /* localStorage may not be available */
      }
    }
  }, [store.gameStarted, store.isPlayerBatting, store.phase, store.practiceMode, showBattingTutorialRef]);

  const dismissTutorial = useCallback(() => {
    setShowBattingTutorial(false);
    showBattingTutorialRef.current = false;
    phaseTimerRef.current = 0;
    try { localStorage.setItem('battingTutorialSeen', '1'); } catch { /* noop */ }
  }, [phaseTimerRef, showBattingTutorialRef]);

  useEffect(() => {
    if (!showBattingTutorial) return;
    const handler = () => dismissTutorial();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showBattingTutorial, dismissTutorial]);

  return { showBattingTutorial, dismissTutorial };
}
