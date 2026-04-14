'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { getPitcherProfile } from '@/game/pitcherProfiles';
import GameCanvas from '@/components/game/GameCanvas';

export default function ChallengePage() {
  const router = useRouter();
  const gameStarted = useGameStore((s) => s.gameStarted);
  const settings = useGameStore((s) => s.settings);
  const profile = settings.challengeProfile ? getPitcherProfile(settings.challengeProfile) : undefined;

  useEffect(() => {
    if (!gameStarted || !settings.challengeProfile) {
      router.push('/');
    }
  }, [gameStarted, settings.challengeProfile, router]);

  if (!gameStarted || !profile) return null;

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
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-bold text-sm tracking-wider">CHALLENGE</span>
            <span className="text-gray-500 text-sm">&middot;</span>
            <span className="text-white text-sm font-semibold">{profile.nameJa}</span>
            <span className="text-gray-400 text-xs">({profile.name})</span>
          </div>
          <div className="w-16" />
        </div>
        <GameCanvas />
      </div>
    </div>
  );
}
