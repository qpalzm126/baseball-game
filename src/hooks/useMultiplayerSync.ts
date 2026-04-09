'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socketClient';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';
import type {
  PitchCommittedPayload,
  AtBatResultPayload,
  ThrowCommandPayload,
  GameStateSyncPayload,
} from '@/server/protocol';

/**
 * Bridges socket events with game store for PvP.
 * Call this hook once in the PvP game page component.
 */
export function useMultiplayerSync() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const socket = getSocket();
    const mp = useMultiplayerStore;

    socket.on('pitch_committed', (payload) => {
      mp.getState().setRemotePitch(payload);
    });

    socket.on('at_bat_result', (payload) => {
      mp.getState().setRemoteAtBatResult(payload);
    });

    socket.on('throw_command', (payload) => {
      mp.getState().pushRemoteThrowCommand(payload);
    });

    socket.on('opponent_disconnected', (payload) => {
      mp.getState().setOpponentDisconnected(true);
      mp.getState().setReconnectDeadline(payload.reconnectDeadline);
    });

    socket.on('opponent_reconnected', () => {
      mp.getState().setOpponentDisconnected(false);
      mp.getState().setReconnectDeadline(null);
    });

    socket.on('forfeit', (payload) => {
      mp.getState().setForfeitWinner(payload.winner);
      useGameStore.getState().endGame();
    });

    return () => {
      mountedRef.current = false;
      socket.off('pitch_committed');
      socket.off('at_bat_result');
      socket.off('throw_command');
      socket.off('opponent_disconnected');
      socket.off('opponent_reconnected');
      socket.off('forfeit');
    };
  }, []);

  const emitPitch = useCallback((payload: PitchCommittedPayload) => {
    getSocket().emit('pitch_committed', payload);
  }, []);

  const emitAtBatResult = useCallback((payload: AtBatResultPayload) => {
    getSocket().emit('at_bat_result', payload);
  }, []);

  const emitThrowCommand = useCallback((payload: ThrowCommandPayload) => {
    getSocket().emit('throw_command', payload);
  }, []);

  const emitGameStateSync = useCallback((payload: GameStateSyncPayload) => {
    getSocket().emit('game_state_sync', payload);
  }, []);

  const emitForfeit = useCallback(() => {
    getSocket().emit('forfeit');
  }, []);

  return {
    emitPitch,
    emitAtBatResult,
    emitThrowCommand,
    emitGameStateSync,
    emitForfeit,
  };
}
