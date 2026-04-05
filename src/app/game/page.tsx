'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import GameCanvas from '@/components/game/GameCanvas';

export default function GamePage() {
  const router = useRouter();
  const gameStarted = useGameStore((s) => s.gameStarted);

  useEffect(() => {
    if (!gameStarted) {
      router.push('/');
    }
  }, [gameStarted, router]);

  if (!gameStarted) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-[940px]">
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={() => {
              useGameStore.getState().endGame();
              router.push('/');
            }}
            className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg
                       hover:bg-gray-800 transition-all border border-transparent hover:border-gray-700"
          >
            &larr; Menu
          </button>
          <h1 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">
            Baseball
          </h1>
          <div className="w-16" />
        </div>
        <GameCanvas />
      </div>
    </div>
  );
}
