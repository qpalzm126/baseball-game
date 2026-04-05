'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { SPEED_BAR } from '@/game/constants';

interface SpeedBarProps {
  active: boolean;
  onLock: (value: number) => void;
  hideValue?: boolean;
  label?: string;
  cycleSpeed?: number;
}

export default function SpeedBar({ active, onLock, hideValue = false, label = 'Speed', cycleSpeed }: SpeedBarProps) {
  const [position, setPosition] = useState(0);
  const [locked, setLocked] = useState(false);
  const animRef = useRef<number>(0);
  const speed = cycleSpeed ?? SPEED_BAR.cycleSpeed;

  useEffect(() => {
    if (!active || locked) return;

    let running = true;
    const animate = (time: number) => {
      if (!running) return;
      const t = (Math.sin(time * 0.005 * speed) + 1) / 2;
      setPosition(t);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [active, locked, speed]);

  const handleLock = useCallback(() => {
    if (!active || locked) return;
    const distFromCenter = Math.abs(position - 0.5) * 2;
    const value = SPEED_BAR.maxSpeed - distFromCenter * (SPEED_BAR.maxSpeed - SPEED_BAR.minSpeed);
    setLocked(true);
    onLock(value);
  }, [active, locked, position, onLock]);

  useEffect(() => {
    if (!active || locked) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleLock();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, locked, handleLock]);

  if (!active) return null;

  const distFromCenter = Math.abs(position - 0.5) * 2;
  const pct = SPEED_BAR.maxSpeed - distFromCenter * (SPEED_BAR.maxSpeed - SPEED_BAR.minSpeed);
  const pctDisplay = Math.round(pct * 100);

  return (
    <div className="flex flex-col items-center gap-1.5 bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700/50 px-4 py-3 shadow-xl animate-fade-in">
      <div className="text-[10px] text-gray-400 font-medium">
        {hideValue ? (
          <>{label}{locked && <span className="text-yellow-400 ml-2 font-bold">LOCKED</span>}</>
        ) : (
          <>{label}: <span className="font-bold text-white">
            {pctDisplay}%
          </span>
          {locked && <span className="text-yellow-400 ml-2 font-bold">LOCKED</span>}</>
        )}
      </div>
      <div
        className="relative bg-gray-800 border border-gray-700 rounded-full overflow-hidden cursor-pointer"
        style={{ width: SPEED_BAR.width, height: SPEED_BAR.height }}
        onClick={handleLock}
      >
        <div
          className="absolute inset-y-0 w-0.5 bg-white/20"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />

        <div
          className={`absolute top-[-2px] bottom-[-2px] w-[3px] rounded-full shadow-lg transition-none ${
            locked ? 'bg-yellow-400 shadow-yellow-400/50' : 'bg-white shadow-white/50'
          }`}
          style={{ left: `${position * 100}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      {!locked && (
        <div className="text-[9px] text-gray-600">
          Press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 text-[8px]">Space</kbd> to lock
        </div>
      )}
    </div>
  );
}
