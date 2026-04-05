'use client';

import { useGameStore } from '@/store/gameStore';

export default function Scoreboard() {
  const inning = useGameStore((s) => s.inning);
  const score = useGameStore((s) => s.score);
  const count = useGameStore((s) => s.count);
  const outs = useGameStore((s) => s.outs);
  const settings = useGameStore((s) => s.settings);
  const isPlayerBatting = useGameStore((s) => s.isPlayerBatting);
  const runners = useGameStore((s) => s.runners);

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl px-5 py-2.5 flex items-center gap-5 text-sm shadow-lg">
      <div className="flex flex-col items-center min-w-[48px]">
        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Inning</span>
        <span className="font-bold text-base leading-tight mt-0.5">
          <span className="text-yellow-400">{inning.isTop ? '▲' : '▼'}</span>{' '}
          {inning.number}
          <span className="text-gray-600 text-[10px]">/{settings.totalInnings}</span>
        </span>
      </div>

      <div className="h-8 w-px bg-gray-800" />

      <div className="flex gap-5">
        <div className="flex flex-col items-center min-w-[36px]">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">You</span>
          <span className={`font-bold text-lg leading-tight mt-0.5 ${
            isPlayerBatting ? 'text-yellow-400' : ''
          }`}>
            {score.away}
          </span>
        </div>
        <div className="text-gray-700 self-center text-xs">vs</div>
        <div className="flex flex-col items-center min-w-[36px]">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">CPU</span>
          <span className={`font-bold text-lg leading-tight mt-0.5 ${
            !isPlayerBatting ? 'text-yellow-400' : ''
          }`}>
            {score.home}
          </span>
        </div>
      </div>

      <div className="h-8 w-px bg-gray-800" />

      <div className="flex flex-col items-center min-w-[36px]">
        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Count</span>
        <span className="font-mono font-bold text-base leading-tight mt-0.5">
          <span className="text-green-400">{count.balls}</span>
          <span className="text-gray-600">-</span>
          <span className="text-red-400">{count.strikes}</span>
        </span>
      </div>

      <div className="h-8 w-px bg-gray-800" />

      <div className="flex flex-col items-center">
        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Outs</span>
        <div className="flex gap-1 mt-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < outs
                  ? 'bg-red-500 shadow-sm shadow-red-500/50'
                  : 'bg-gray-800 border border-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="h-8 w-px bg-gray-800" />

      <div className="flex flex-col items-center">
        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Bases</span>
        <svg width="28" height="28" viewBox="0 0 30 30" className="mt-0.5">
          <rect
            x="10" y="2" width="9" height="9"
            transform="rotate(45 14.5 6.5)"
            fill={runners.some((r) => r.currentBase === 2) ? '#facc15' : 'transparent'}
            stroke={runners.some((r) => r.currentBase === 2) ? '#facc15' : '#4b5563'}
            strokeWidth="1.5"
          />
          <rect
            x="18" y="10" width="9" height="9"
            transform="rotate(45 22.5 14.5)"
            fill={runners.some((r) => r.currentBase === 1) ? '#facc15' : 'transparent'}
            stroke={runners.some((r) => r.currentBase === 1) ? '#facc15' : '#4b5563'}
            strokeWidth="1.5"
          />
          <rect
            x="2" y="10" width="9" height="9"
            transform="rotate(45 6.5 14.5)"
            fill={runners.some((r) => r.currentBase === 3) ? '#facc15' : 'transparent'}
            stroke={runners.some((r) => r.currentBase === 3) ? '#facc15' : '#4b5563'}
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="h-8 w-px bg-gray-800" />

      <div className="flex flex-col items-center min-w-[56px]">
        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Mode</span>
        <span className={`font-bold text-[10px] leading-tight mt-1 px-2 py-0.5 rounded-full ${
          isPlayerBatting
            ? 'bg-red-900/50 text-red-300 border border-red-800/50'
            : 'bg-blue-900/50 text-blue-300 border border-blue-800/50'
        }`}>
          {isPlayerBatting ? 'BAT' : 'PITCH'}
        </span>
      </div>
    </div>
  );
}
