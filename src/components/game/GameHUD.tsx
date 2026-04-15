import { GamePhase } from '@/game/types';

interface GameHUDProps {
  phase: GamePhase;
  isPlayerBatting: boolean;
  isPractice: boolean;
  hasSwung: boolean;
  ballReleased: boolean;
  bunting: boolean;
  deadBall: boolean;
  pitchInfoDisplay: string | null;
  announcement: string | null;
}

function KeyHints({ phase, isPlayerBatting, isPractice, deadBall }: { phase: GamePhase; isPlayerBatting: boolean; isPractice: boolean; deadBall: boolean }) {
  const isFieldPhase = phase === GamePhase.BallInPlay || phase === GamePhase.Fielding;
  const isBattingPhase = phase === GamePhase.PrePitch || phase === GamePhase.Pitching || phase === GamePhase.BatSwing;

  const lines: string[] = [];

  if (isPlayerBatting && isBattingPhase) {
    lines.push('WASD Move \u00B7 Q/E Rotate');
    lines.push('Space/Click Swing \u00B7 B Bunt \u00B7 Tab Switch Side');
  } else if (isPlayerBatting && isFieldPhase && !deadBall) {
    lines.push('F/\u2191 Advance \u00B7 G/\u2193 Retreat');
  } else if (!isPlayerBatting && isFieldPhase && !deadBall) {
    lines.push('Z 1B \u00B7 X 2B \u00B7 C 3B \u00B7 V Home');
  } else if (!isPlayerBatting && phase === GamePhase.PrePitch) {
    lines.push('Select pitch type \u2192 Aim \u2192 Accuracy \u2192 Power');
  }

  const extras: string[] = [];
  if (isPractice) extras.push('R Reset');
  extras.push('Esc Pause');
  lines.push(extras.join(' \u00B7 '));

  if (lines.length === 0) return null;

  return (
    <div className="absolute bottom-1 inset-x-0 z-10 flex flex-col items-center gap-0.5 pointer-events-none">
      {lines.map((line, i) => (
        <span key={i} className="text-xs text-white/30 tracking-wide">{line}</span>
      ))}
    </div>
  );
}

export default function GameHUD({
  phase,
  isPlayerBatting,
  isPractice,
  hasSwung,
  ballReleased,
  bunting,
  deadBall,
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

      {!isPractice && isFieldPhase && !deadBall && isPlayerBatting && (
        <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm px-5 py-2 rounded-lg">
            <span className="text-white/80 text-sm font-medium">
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-green-300 text-[10px]">F</kbd> / <kbd className="px-1 py-0.5 bg-gray-800 rounded text-green-300 text-[10px]">↑</kbd> Go &middot;
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-red-300 text-[10px] ml-2">G</kbd> / <kbd className="px-1 py-0.5 bg-gray-800 rounded text-red-300 text-[10px]">↓</kbd> Back
            </span>
          </div>
        </div>
      )}

      {!isPractice && isFieldPhase && !deadBall && !isPlayerBatting && (
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

      {announcement && (() => {
        const lines = announcement.split('\n');
        return (
          <div className="absolute inset-x-0 bottom-16 z-20 flex justify-center pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm px-8 py-3 rounded-xl text-center">
              <span className="text-yellow-400 font-bold text-2xl">{lines[0]}</span>
              {lines[1] && (
                <div className="text-cyan-300 text-sm font-medium mt-1">{lines[1]}</div>
              )}
            </div>
          </div>
        );
      })()}

      <KeyHints phase={phase} isPlayerBatting={isPlayerBatting} isPractice={isPractice} deadBall={deadBall} />
    </>
  );
}
