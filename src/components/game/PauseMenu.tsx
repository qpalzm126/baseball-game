import { GameSettings } from '@/game/types';
import { DIFFICULTY_CONFIGS, FIELD_SIZE_CONFIGS } from '@/game/constants';

interface PauseMenuProps {
  onResume: () => void;
  onQuit: () => void;
  onRestart: () => void;
  settings: GameSettings;
}

export default function PauseMenu({ onResume, onQuit, onRestart, settings }: PauseMenuProps) {
  const diff = DIFFICULTY_CONFIGS[settings.difficulty];
  const field = FIELD_SIZE_CONFIGS[settings.fieldSize];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-gray-900/95 border border-gray-600/50 rounded-2xl p-8 max-w-xs w-full mx-4 shadow-2xl">
        <h2 className="text-white font-bold text-xl text-center mb-4">PAUSED</h2>

        <div className="bg-gray-800/60 rounded-lg px-3 py-2.5 mb-5 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Difficulty</span>
            <span className="text-yellow-400 font-bold">{diff.label} <span className="text-gray-500 font-normal">{diff.labelEn}</span></span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Field</span>
            <span className="text-blue-400 font-bold">{field.label} <span className="text-gray-500 font-normal">{field.distanceFt}ft</span></span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Innings</span>
            <span className="text-gray-300 font-bold">{settings.totalInnings}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Batting</span>
            <span className="text-gray-300 font-bold">{settings.batterSide === 'right' ? 'Right' : 'Left'}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl transition-all hover:scale-[1.02] text-sm"
          >
            Resume
          </button>
          <button
            onClick={onRestart}
            className="w-full py-3 bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all hover:scale-[1.02] text-sm"
          >
            Restart (New Settings)
          </button>
          <button
            onClick={onQuit}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-xl transition-all hover:scale-[1.02] text-sm"
          >
            Quit to Menu
          </button>
        </div>
        <p className="text-gray-600 text-[10px] text-center mt-4">Press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">Esc</kbd> to resume</p>
      </div>
    </div>
  );
}
