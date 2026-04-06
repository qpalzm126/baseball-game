interface PauseMenuProps {
  onResume: () => void;
  onQuit: () => void;
}

export default function PauseMenu({ onResume, onQuit }: PauseMenuProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-gray-900/95 border border-gray-600/50 rounded-2xl p-8 max-w-xs w-full mx-4 shadow-2xl">
        <h2 className="text-white font-bold text-xl text-center mb-6">PAUSED</h2>
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl transition-all hover:scale-[1.02] text-sm"
          >
            Resume
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
