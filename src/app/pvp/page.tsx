'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useMultiplayerSync } from '@/hooks/useMultiplayerSync';
import { disconnectSocket } from '@/lib/socketClient';
import GameCanvas from '@/components/game/GameCanvas';
import ConnectionStatus from '@/components/pvp/ConnectionStatus';
import DisconnectModal from '@/components/pvp/DisconnectModal';

export default function PvPGamePage() {
  const router = useRouter();
  const gameStarted = useGameStore((s) => s.gameStarted);
  const isMultiplayer = useMultiplayerStore((s) => s.isMultiplayer);
  const opponentName = useMultiplayerStore((s) => s.opponentName);
  const score = useGameStore((s) => s.score);
  const phase = useGameStore((s) => s.phase);

  const { emitForfeit } = useMultiplayerSync();

  useEffect(() => {
    if (!gameStarted || !isMultiplayer) {
      router.push('/pvp/lobby');
    }
  }, [gameStarted, isMultiplayer, router]);

  if (!gameStarted || !isMultiplayer) return null;

  const handleQuit = () => {
    emitForfeit();
    disconnectSocket();
    useMultiplayerStore.getState().reset();
    useGameStore.getState().endGame();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-[940px]">
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={handleQuit}
            className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg
                       hover:bg-gray-800 transition-all border border-transparent hover:border-gray-700"
          >
            &larr; Forfeit
          </button>
          <h1 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">
            PvP &middot; vs {opponentName}
          </h1>
          <div className="w-16" />
        </div>
        <div className="relative">
          <GameCanvas />
          <ConnectionStatus />
          <DisconnectModal />
        </div>
      </div>

      {phase === 'GAME_OVER' && (() => {
        const mp = useMultiplayerStore.getState();
        const myScore = mp.isHost ? score.home : score.away;
        const oppScore = mp.isHost ? score.away : score.home;
        return (
        <div className="flex flex-col items-center gap-3 mt-4">
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-2xl mb-1">GAME OVER</div>
            <div className="text-white text-lg">
              {myScore > oppScore ? 'You Win!' : oppScore > myScore ? `${opponentName} Wins!` : "It's a Tie!"}
              {' '}{myScore} - {oppScore}
            </div>
          </div>
          <button
            onClick={handleQuit}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl transition-all hover:scale-105"
          >
            Back to Menu
          </button>
        </div>
        );
      })()}
    </div>
  );
}
