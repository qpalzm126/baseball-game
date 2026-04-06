'use client';

import { useEffect } from 'react';
import { PitchType, PitchConfig } from '@/game/types';
import { PITCH_CONFIGS } from '@/game/constants';

interface PitchSelectorProps {
  selectedPitch: PitchType | null;
  onSelect: (pitch: PitchType) => void;
  disabled?: boolean;
  speedMultiplier?: number;
  reserveRForReset?: boolean;
}

export default function PitchSelector({ selectedPitch, onSelect, disabled, speedMultiplier = 1, reserveRForReset }: PitchSelectorProps) {
  const pitches = Object.values(PITCH_CONFIGS);

  useEffect(() => {
    if (disabled) return;
    const keyMap = new Map<string, PitchType>();
    for (const p of pitches) keyMap.set(p.key.toLowerCase(), p.type);
    const handler = (e: KeyboardEvent) => {
      if (reserveRForReset && e.key.toLowerCase() === 'r') return;
      const pt = keyMap.get(e.key.toLowerCase());
      if (pt) onSelect(pt);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [disabled, onSelect, pitches, reserveRForReset]);

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700/50 p-3 shadow-xl animate-fade-in">
      <p className="text-[10px] text-gray-500 mb-2 text-center uppercase tracking-wider font-medium">
        Select Pitch Type
      </p>
      <div className="flex gap-1.5 flex-wrap justify-center">
        {pitches.map((p: PitchConfig) => (
          <button
            key={p.type}
            onClick={() => !disabled && onSelect(p.type)}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border min-w-[72px] ${
              selectedPitch === p.type
                ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-sm shadow-yellow-500/20'
                : 'border-gray-700/50 bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
          >
            <span className="text-[9px] text-gray-500 mr-0.5 font-mono">[{p.key}]</span>
            {' '}{p.label}
            <span className="block text-[10px] mt-0.5 font-normal" style={{ color: p.color }}>
              {Math.round(p.baseSpeed * speedMultiplier)} mph
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
