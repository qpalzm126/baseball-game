import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { getSocket } from '@/lib/socketClient';
import { GamePhase } from '@/game/types';

export function usePauseControl() {
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const windowHiddenRef = useRef(false);
  const router = useRouter();

  const store = useGameStore();
  const remotePausedBy = useMultiplayerStore((s) => s.remotePausedBy);

  const isMP = () => useMultiplayerStore.getState().isMultiplayer;

  const emitStateSync = useCallback(() => {
    const gs = useGameStore.getState();
    getSocket().emit('game_state_sync', {
      score: gs.score,
      count: gs.count,
      outs: gs.outs,
      inning: gs.inning,
      runners: gs.runners,
      phase: gs.phase,
      isPlayerBatting: gs.isPlayerBatting,
    });
  }, []);

  const togglePause = useCallback(() => {
    const mp = useMultiplayerStore.getState();
    if (mp.isMultiplayer && mp.remotePausedBy) return;

    setPaused((prev) => {
      const next = !prev;
      pausedRef.current = next;
      if (mp.isMultiplayer) {
        getSocket().emit(next ? 'pause_game' : 'unpause_game');
        if (!next) emitStateSync();
      }
      return next;
    });
  }, [emitStateSync]);

  const resumeGame = useCallback(() => {
    setPaused(false);
    pausedRef.current = false;
    if (isMP()) {
      getSocket().emit('unpause_game');
      emitStateSync();
    }
  }, [emitStateSync]);

  const quitGame = useCallback(() => {
    resumeGame();
    useGameStore.getState().endGame();
  }, [resumeGame]);

  const restartGame = useCallback(() => {
    resumeGame();
    useGameStore.getState().endGame();
    router.push('/');
  }, [resumeGame, router]);

  // Sync pausedRef when opponent pauses/unpauses
  useEffect(() => {
    if (remotePausedBy) {
      pausedRef.current = true;
      setPaused(true);
    } else {
      pausedRef.current = false;
      setPaused(false);
    }
  }, [remotePausedBy]);

  useEffect(() => {
    const onVisChange = () => {
      if (isMP()) return;
      windowHiddenRef.current = document.hidden;
    };
    const onBlur = () => {
      if (isMP()) return;
      windowHiddenRef.current = true;
    };
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
