import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { GamePhase } from '@/game/types';

export function usePauseControl() {
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const windowHiddenRef = useRef(false);
  const router = useRouter();

  const store = useGameStore();

  const togglePause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      pausedRef.current = next;
      return next;
    });
  }, []);

  const resumeGame = useCallback(() => {
    setPaused(false);
    pausedRef.current = false;
  }, []);

  const quitGame = useCallback(() => {
    resumeGame();
    useGameStore.getState().endGame();
  }, [resumeGame]);

  const restartGame = useCallback(() => {
    resumeGame();
    useGameStore.getState().endGame();
    router.push('/');
  }, [resumeGame, router]);

  useEffect(() => {
    const onVisChange = () => { windowHiddenRef.current = document.hidden; };
    const onBlur = () => { windowHiddenRef.current = true; };
    const onFocus = () => { windowHiddenRef.current = false; };
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (!store.gameStarted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && store.phase !== GamePhase.PrePitch) {
        togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store.gameStarted, store.phase, togglePause]);

  return { paused, pausedRef, windowHiddenRef, togglePause, resumeGame, quitGame, restartGame };
}
