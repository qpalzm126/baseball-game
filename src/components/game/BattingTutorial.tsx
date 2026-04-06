function TutorialRow({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1 min-w-[90px] justify-end">
        {keys.map((k, i) => (
          <span key={i}>
            {i > 0 && <span className="text-gray-600 mx-0.5">/</span>}
            <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-600/50 rounded text-yellow-300 text-[11px] font-mono">{k}</kbd>
          </span>
        ))}
      </div>
      <span className="text-gray-300 text-[13px]">{desc}</span>
    </div>
  );
}

interface BattingTutorialProps {
  onDismiss: () => void;
}

export default function BattingTutorial({ onDismiss }: BattingTutorialProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm cursor-pointer"
      onClick={onDismiss}
      onKeyDown={onDismiss}
      tabIndex={0}
      role="button"
    >
      <div className="bg-gray-900/95 border border-gray-600/50 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-yellow-400 font-bold text-lg text-center mb-4">Batting Controls</h2>
        <div className="space-y-3 text-sm">
          <TutorialRow keys={['Mouse']} desc="Position the bat / sweet spot" />
          <TutorialRow keys={['Click', 'SPACE']} desc="Hold to charge swing, release to swing" />
          <TutorialRow keys={['A', 'D']} desc="Move batter left / right" />
          <TutorialRow keys={['W', 'S']} desc="Move batter forward / back" />
          <TutorialRow keys={['RClick', 'B']} desc="Toggle bunt stance" />
          <TutorialRow keys={['Q', 'E']} desc="Rotate camera angle" />
          <TutorialRow keys={['Tab']} desc="Switch batter side (L/R)" />
          <div className="border-t border-gray-700/50 pt-2 mt-2">
            <p className="text-gray-500 text-[11px] font-medium uppercase tracking-wider mb-2">During Play</p>
            <TutorialRow keys={['F', '↑']} desc="Send runners forward" />
            <TutorialRow keys={['G', '↓']} desc="Retreat runners to previous base" />
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="w-full mt-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-lg transition-colors text-sm"
        >
          Got it!
        </button>
        <p className="text-gray-600 text-[10px] text-center mt-2">Click anywhere or press any key to close</p>
      </div>
    </div>
  );
}
