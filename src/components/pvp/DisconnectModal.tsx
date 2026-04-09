'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';
import { disconnectSocket } from '@/lib/socketClient';

export default function DisconnectModal() {
  const router = useRouter();
  const opponentDisconnected = useMultiplayerStore((s) => s.opponentDisconnected);
  const reconnectDeadline = useMultiplayerStore((s) => s.reconnectDeadline);
  const forfeitWinner = useMultiplayerStore((s) => s.forfeitWinner);
  const isHost = useMultiplayerStore((s) => s.isHost);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!reconnectDeadline) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((reconnectDeadline - Date.now()) / 1000));
      setCountdown(remaining);
    }, 500);
    return () => clearInterval(interval);
  }, [reconnectDeadline]);

  const handleLeave = () => {
    disconnectSocket();
    useMultiplayerStore.getState().reset();
    useGameStore.getState().endGame();
    router.push('/');
  };

  if (forfeitWinner) {
    const localTeam = isHost ? 'home' : 'away';
    const won = forfeitWinner === localTeam;
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 text-center">
          <div className={`text-2xl font-bold mb-2 ${won ? 'text-yellow-400' : 'text-red-400'}`}>
            {won ? 'You Win!' : 'You Lose'}
          </div>
          <p className="text-gray-400 text-sm mb-4">
            {won ? 'Your opponent forfeited the match.' : 'Game ended by forfeit.'}
          </p>
          <button
            onClick={handleLeave}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl transition-all"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (!opponentDisconnected) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 text-center">
        <div className="text-xl font-bold text-yellow-400 mb-2">Opponent Disconnected</div>
        <p className="text-gray-400 text-sm mb-4">
          Waiting for reconnection...
        </p>
        <div className="text-3xl font-mono font-bold text-white mb-4">
          {countdown}s
        </div>
        <button
          onClick={handleLeave}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-xl transition-all text-sm"
        >
          Leave Match
        </button>
      </div>
    </div>
  );
}
