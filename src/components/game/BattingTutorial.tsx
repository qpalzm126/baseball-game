interface BattingTutorialProps {
  onDismiss: () => void;
}

export default function BattingTutorial({ onDismiss }: BattingTutorialProps) {
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none animate-fade-in">
      <div className="text-white/50 text-[10px] leading-relaxed font-mono space-y-0.5 text-right">
        <p><span className="text-white/70">Mouse</span> aim bat</p>
        <p><span className="text-white/70">Click/Space</span> hold charge → release swing</p>
        <p><span className="text-white/70">A/D</span> move left/right</p>
        <p><span className="text-white/70">W/S</span> move fwd/back</p>
        <p><span className="text-white/70">RClick/B</span> bunt</p>
        <p><span className="text-white/70">Q/E</span> rotate camera</p>
        <p><span className="text-white/70">Tab</span> switch side</p>
        <p className="pt-1 border-t border-white/10"><span className="text-white/70">F/↑</span> runners go · <span className="text-white/70">G/↓</span> back</p>
        <button
          onClick={onDismiss}
          className="pointer-events-auto text-white/30 hover:text-white/60 text-[9px] mt-1 transition-colors"
        >
          [dismiss]
        </button>
      </div>
    </div>
  );
}
