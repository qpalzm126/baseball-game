'use client';

import { useEffect, useCallback } from 'react';

interface BattingTutorialProps {
  onDismiss: () => void;
}

function Row({ keys, desc }: { keys: string; desc: string }) {
  return (
    <tr>
      <td className="text-right pr-4 whitespace-nowrap align-middle">
        <kbd className="inline-block px-2 py-1 bg-white/10 border border-white/20 rounded text-yellow-300 text-xs font-mono">
          {keys}
        </kbd>
      </td>
      <td className="text-left text-white/85 align-middle">{desc}</td>
    </tr>
  );
}

export default function BattingTutorial({ onDismiss }: BattingTutorialProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onDismiss();
      }
    },
    [onDismiss],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center cursor-pointer select-none"
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/75" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-8">
        <h2 className="text-white text-2xl font-bold tracking-wide">How to Bat</h2>

        <table className="text-sm border-separate" style={{ borderSpacing: '0 10px' }}>
          <tbody>
            <Row keys="Mouse" desc="Move to aim the bat" />
            <Row keys="Click / Space" desc="Hold to charge power, release to swing" />
            <Row keys="WASD" desc="Move batter position in the box" />
            <Row keys="Q / E" desc="Rotate camera angle" />
            <Row keys="B / RClick" desc="Bunt" />
          </tbody>
        </table>

        <div className="mt-1 animate-pulse">
          <span className="text-white/50 text-sm tracking-wider">
            Click or press <kbd className="px-2 py-0.5 bg-white/10 border border-white/20 rounded text-white/70 text-xs">SPACE</kbd> to start
          </span>
        </div>
      </div>
    </div>
  );
}
