import { HitType } from '@/game/types';

function hitLabel(type: HitType): string {
  switch (type) {
    case HitType.HomeRun: return 'HOME RUN!';
    case HitType.LineDrive: return 'LINE DRIVE!';
    case HitType.FlyBall: return 'FLY BALL!';
    case HitType.GroundBall: return 'GROUND BALL!';
    case HitType.PopUp: return 'POP UP!';
    default: return 'HIT!';
  }
}

export interface HitDebugData {
  exitSpeed: number;
  launchAngle: number;
  sprayAngle: number;
  contactQuality: number;
  chargePower: number;
  hitType: HitType;
  distance: number;
}

export interface PracticeStatsData {
  pitches: number;
  swings: number;
  hits: number;
  fouls: number;
}

export interface PitchPracticeStatsData {
  pitches: number;
  strikes: number;
  balls: number;
  hitsAllowed: number;
  fouls: number;
}

export interface LastPitchResultData {
  type: string;
  speed: number;
  accuracy: number;
  result: string;
}

interface PracticeOverlaysProps {
  isPlayerBatting: boolean;
  pitchStep: string;
  hitDebug: HitDebugData | null;
  practiceStats: PracticeStatsData;
  pitchPracticeStats: PitchPracticeStatsData;
  lastPitchResult: LastPitchResultData | null;
}

export default function PracticeOverlays({
  isPlayerBatting,
  pitchStep,
  hitDebug,
  practiceStats,
  pitchPracticeStats,
  lastPitchResult,
}: PracticeOverlaysProps) {
  return (
    <>
      {isPlayerBatting && hitDebug && (
        <div className="absolute top-2 right-2 z-20 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-gray-600/40 p-3 min-w-[200px]">
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1.5">Hit Data</div>
            <div className="space-y-1 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className={`font-bold ${hitDebug.hitType === HitType.HomeRun ? 'text-yellow-400' : hitDebug.hitType === HitType.Foul ? 'text-red-400' : 'text-white'}`}>
                  {hitLabel(hitDebug.hitType)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Exit Velo</span>
                <span className="text-cyan-300">{Math.round(25 + hitDebug.exitSpeed * 3.8)} mph</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Launch</span>
                <span className="text-green-300">{hitDebug.launchAngle.toFixed(1)}&deg;</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Spray</span>
                <span className="text-orange-300">{hitDebug.sprayAngle.toFixed(1)}&deg;</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Quality</span>
                <span className="text-purple-300">{Math.round(hitDebug.contactQuality * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Charge</span>
                <span className="text-yellow-300">{Math.round(hitDebug.chargePower * 100)}%</span>
              </div>
              {hitDebug.distance > 0 && hitDebug.hitType !== HitType.Foul && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Distance</span>
                  <span className="text-blue-300">{Math.round(hitDebug.distance * 0.44)} ft</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isPlayerBatting && (
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-gray-600/40 px-3 py-2">
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Batting Stats</div>
            <div className="flex gap-3 text-xs font-mono">
              <div><span className="text-gray-500">Pitches</span> <span className="text-white font-bold">{practiceStats.pitches}</span></div>
              <div><span className="text-gray-500">Swings</span> <span className="text-white font-bold">{practiceStats.swings}</span></div>
              <div><span className="text-gray-500">Hits</span> <span className="text-green-400 font-bold">{practiceStats.hits}</span></div>
              <div><span className="text-gray-500">Fouls</span> <span className="text-red-400 font-bold">{practiceStats.fouls}</span></div>
            </div>
            <div className="mt-1.5 text-[9px] text-gray-500">Press <span className="text-yellow-400/80 font-bold">R</span> to reset</div>
          </div>
        </div>
      )}

      {!isPlayerBatting && pitchStep !== 'type' && (
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-gray-600/40 px-3 py-2 min-w-[200px]">
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Pitching Stats</div>
            <div className="flex gap-3 text-xs font-mono">
              <div><span className="text-gray-500">Thrown</span> <span className="text-white font-bold">{pitchPracticeStats.pitches}</span></div>
              <div><span className="text-gray-500">K</span> <span className="text-green-400 font-bold">{pitchPracticeStats.strikes}</span></div>
              <div><span className="text-gray-500">BB</span> <span className="text-blue-400 font-bold">{pitchPracticeStats.balls}</span></div>
              <div><span className="text-gray-500">Hits</span> <span className="text-red-400 font-bold">{pitchPracticeStats.hitsAllowed}</span></div>
              <div><span className="text-gray-500">Fouls</span> <span className="text-yellow-400 font-bold">{pitchPracticeStats.fouls}</span></div>
            </div>
          </div>
        </div>
      )}

      {!isPlayerBatting && lastPitchResult && (
        <div className="absolute top-2 right-2 z-20 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-gray-600/40 p-3 min-w-[180px]">
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1.5">Last Pitch</div>
            <div className="space-y-1 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="text-white font-bold">{lastPitchResult.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Power</span>
                <span className="text-cyan-300">{lastPitchResult.speed}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Accuracy</span>
                <span className="text-green-300">{lastPitchResult.accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Result</span>
                <span className={`font-bold ${
                  lastPitchResult.result.includes('STRIKE') ? 'text-green-400'
                  : lastPitchResult.result === 'BALL' ? 'text-blue-400'
                  : lastPitchResult.result === 'FOUL' ? 'text-yellow-400'
                  : 'text-red-400'
                }`}>{lastPitchResult.result}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
