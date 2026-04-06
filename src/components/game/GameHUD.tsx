import { GamePhase } from '@/game/types';

interface GameHUDProps {
  phase: GamePhase;
  isPlayerBatting: boolean;
  isPractice: boolean;
  hasSwung: boolean;
  ballReleased: boolean;
  bunting: boolean;
  pitchInfoDisplay: string | null;
  announcement: string | null;
}

export default function GameHUD({
  phase,
  isPlayerBatting,
  isPractice,
  hasSwung,
  ballReleased,
  bunting,
  pitchInfoDisplay,
  announcement,
}: GameHUDProps) {
  const isFieldPhase = phase === GamePhase.BallInPlay || phase === GamePhase.Fielding;

  return (
    <>
      {(phase === GamePhase.Pitching || phase === GamePhase.BatSwing) && isPlayerBatting && !hasSwung && ballReleased && (
        <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm px-5 py-2 rounded-lg">
            <span className="text-white/80 text-sm font-medium">
              {bunting
                ? 'BUNT stance — Right Click / B to cancel'
                : 'Hold Click / SPACE to charge, release to swing · Right Click / B bunt · Q/E rotate view'}
            </span>
          </div>
        </div>
      )}

      {isPlayerBatting && bunting && !hasSwung && !isFieldPhase && (
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <div className="bg-amber-600/80 backdrop-blur-sm px-3 py-1 rounded-md">
            <span className="text-white text-xs font-bold tracking-wider">BUNT</span>
          </div>
        </div>
      )}

      {!isPractice && isFieldPhase && isPlayerBatting && (
        <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm px-5 py-2 rounded-lg">
            <span className="text-white/80 text-sm font-medium">
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-green-300 text-[10px]">F</kbd> / <kbd className="px-1 py-0.5 bg-gray-800 rounded text-green-300 text-[10px]">↑</kbd> Go &middot;
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-red-300 text-[10px] ml-2">G</kbd> / <kbd className="px-1 py-0.5 bg-gray-800 rounded text-red-300 text-[10px]">↓</kbd> Back
            </span>
          </div>
        </div>
      )}

      {!isPractice && isFieldPhase && !isPlayerBatting && (
        <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm px-5 py-2 rounded-lg">
            <span className="text-white/80 text-sm font-medium">
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-blue-300 text-[10px]">Z</kbd> 1B &middot;
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-blue-300 text-[10px] ml-1">X</kbd> 2B &middot;
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-blue-300 text-[10px] ml-1">C</kbd> 3B &middot;
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-blue-300 text-[10px] ml-1">V</kbd> Home
            </span>
          </div>
        </div>
      )}

      {pitchInfoDisplay && (
        <div className={`absolute ${isPractice ? 'top-14' : 'top-4'} inset-x-0 z-20 flex justify-center pointer-events-none`}>
          <div className="bg-black/70 backdrop-blur-sm px-6 py-2.5 rounded-xl border border-gray-600/40">
            <span className="text-white font-bold text-lg tracking-wide">{pitchInfoDisplay}</span>
          </div>
        </div>
      )}

      {announcement && (
        <div className="absolute inset-x-0 bottom-16 z-20 flex justify-center pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm px-8 py-3 rounded-xl">
            <span className="text-yellow-400 font-bold text-2xl">{announcement}</span>
          </div>
        </div>
      )}
    </>
  );
}
