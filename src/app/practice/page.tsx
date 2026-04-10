'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { PitchType, Difficulty, FieldSize, HitType, PitcherHand } from '@/game/types';
import { DIFFICULTY_CONFIGS, DIFFICULTY_ORDER, PITCH_CONFIGS, FIELD_SIZE_CONFIGS, FIELD_SIZE_ORDER } from '@/game/constants';
import GameCanvas from '@/components/game/GameCanvas';

const PITCH_OPTIONS: { value: PitchType | null; label: string }[] = [
  { value: null, label: 'Random' },
  ...Object.values(PITCH_CONFIGS).map((c) => ({ value: c.type, label: c.label })),
];

const HIT_TYPE_OPTIONS: { value: HitType | null; label: string; labelEn: string }[] = [
  { value: null, label: '自由', labelEn: 'Free' },
  { value: HitType.GroundBall, label: '滾地球', labelEn: 'GB' },
  { value: HitType.LineDrive, label: '平飛球', labelEn: 'LD' },
  { value: HitType.FlyBall, label: '飛球', labelEn: 'FB' },
  { value: HitType.HomeRun, label: '全壘打', labelEn: 'HR' },
  { value: HitType.PopUp, label: '內野飛球', labelEn: 'PU' },
];

type PracticeTab = 'batting' | 'pitching';

export default function PracticePage() {
  const router = useRouter();
  const gameStarted = useGameStore((s) => s.gameStarted);
  const practiceMode = useGameStore((s) => s.practiceMode);
  const currentDifficulty = useGameStore((s) => s.settings.difficulty);
  const currentFieldSize = useGameStore((s) => s.settings.fieldSize);
  const currentPitcherHand = useGameStore((s) => s.settings.pitcherHand);
  const practicePitchType = useGameStore((s) => s.practicePitchType);
  const practiceStrikesOnly = useGameStore((s) => s.practiceStrikesOnly);
  const practiceTargetCell = useGameStore((s) => s.practiceTargetCell);
  const practiceHitType = useGameStore((s) => s.practiceHitType);
  const practiceAccuracy = useGameStore((s) => s.practiceAccuracy);
  const practicePower = useGameStore((s) => s.practicePower);
  const isPlayerBatting = useGameStore((s) => s.isPlayerBatting);

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<PracticeTab>('batting');

  useEffect(() => {
    if (!gameStarted || !practiceMode) {
      useGameStore.getState().startPractice();
    }
    setReady(true);
  }, [gameStarted, practiceMode]);

  const switchTab = useCallback((t: PracticeTab) => {
    setTab(t);
    const gs = useGameStore.getState();
    if (t === 'batting') {
      gs.startPractice({ difficulty: gs.settings.difficulty });
    } else {
      gs.startPitchingPractice({ difficulty: gs.settings.difficulty });
    }
  }, []);

  if (!ready || !gameStarted) return null;

  const handleDifficulty = (d: Difficulty) => {
    useGameStore.getState().updateSettings({ difficulty: d });
  };

  const handleFieldSize = (fs: FieldSize) => {
    useGameStore.getState().updateSettings({ fieldSize: fs });
  };

  const handlePitcherHand = (hand: PitcherHand) => {
    useGameStore.getState().updateSettings({ pitcherHand: hand });
  };

  const handlePitchType = (type: PitchType | null) => {
    useGameStore.getState().setPracticePitchType(type);
  };

  const handleBack = () => {
    useGameStore.getState().endGame();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-[940px]">
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={handleBack}
            className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg
                       hover:bg-gray-800 transition-all border border-transparent hover:border-gray-700"
          >
            &larr; Menu
          </button>
          <h1 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">
            Practice Mode
          </h1>
          <div className="w-16" />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-0.5 border border-gray-700/50">
            <button
              onClick={() => switchTab('batting')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                tab === 'batting'
                  ? 'bg-cyan-500 text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Batting
            </button>
            <button
              onClick={() => switchTab('pitching')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                tab === 'pitching'
                  ? 'bg-orange-500 text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Pitching
            </button>
          </div>

          <div className="w-px h-5 bg-gray-700" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Difficulty</span>
            <div className="flex gap-1">
              {DIFFICULTY_ORDER.map((d) => (
                <button
                  key={d}
                  onClick={() => handleDifficulty(d)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    currentDifficulty === d
                      ? 'bg-yellow-500 text-gray-900'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {DIFFICULTY_CONFIGS[d].label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-5 bg-gray-700" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Field</span>
            <div className="flex gap-1">
              {FIELD_SIZE_ORDER.map((fs) => (
                <button
                  key={fs}
                  onClick={() => handleFieldSize(fs)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    currentFieldSize === fs
                      ? 'bg-blue-500 text-gray-900'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {FIELD_SIZE_CONFIGS[fs].label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-5 bg-gray-700" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Pitcher</span>
            <div className="flex gap-1">
              {(['right', 'left'] as PitcherHand[]).map((h) => (
                <button
                  key={h}
                  onClick={() => handlePitcherHand(h)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    currentPitcherHand === h
                      ? 'bg-yellow-500 text-gray-900'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {h === 'right' ? 'RHP' : 'LHP'}
                </button>
              ))}
            </div>
          </div>

          {tab === 'pitching' && (
            <>
              <div className="w-px h-5 bg-gray-700" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">AI Hit</span>
                <div className="flex gap-1">
                  {HIT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.labelEn}
                      onClick={() => useGameStore.getState().setPracticeHitType(opt.value)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                        practiceHitType === opt.value
                          ? 'bg-orange-500 text-gray-900'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                      title={opt.label}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-px h-5 bg-gray-700" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => useGameStore.getState().setPracticeAccuracy(practiceAccuracy === null ? 0.85 : null)}
                  className={`text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded transition-all ${
                    practiceAccuracy !== null ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  ACC
                </button>
                {practiceAccuracy !== null && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="range" min="0" max="100" step="5"
                      value={Math.round(practiceAccuracy * 100)}
                      onChange={(e) => useGameStore.getState().setPracticeAccuracy(Number(e.target.value) / 100)}
                      className="w-16 h-1 accent-green-500"
                    />
                    <span className="text-green-400 text-[10px] font-mono w-7">{Math.round(practiceAccuracy * 100)}%</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => useGameStore.getState().setPracticePower(practicePower === null ? 0.85 : null)}
                  className={`text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded transition-all ${
                    practicePower !== null ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  PWR
                </button>
                {practicePower !== null && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="range" min="0" max="100" step="5"
                      value={Math.round(practicePower * 100)}
                      onChange={(e) => useGameStore.getState().setPracticePower(Number(e.target.value) / 100)}
                      className="w-16 h-1 accent-cyan-500"
                    />
                    <span className="text-cyan-400 text-[10px] font-mono w-7">{Math.round(practicePower * 100)}%</span>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'batting' && (
            <>
              <div className="w-px h-5 bg-gray-700" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Pitch</span>
                <div className="flex gap-1">
                  {PITCH_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handlePitchType(opt.value)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                        practicePitchType === opt.value
                          ? 'bg-cyan-500 text-gray-900'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-px h-5 bg-gray-700" />
              <button
                onClick={() => useGameStore.getState().setPracticeStrikesOnly(!practiceStrikesOnly)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                  practiceStrikesOnly
                    ? 'bg-green-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Strikes Only
              </button>

              <div className="w-px h-5 bg-gray-700" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Zone</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => useGameStore.getState().setPracticeTargetCell(null)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                      practiceTargetCell === null
                        ? 'bg-cyan-500 text-gray-900'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Random
                  </button>
                  <div className="grid grid-cols-3 gap-px bg-gray-700 rounded overflow-hidden" style={{ width: 54, height: 54 }}>
                    {[0,1,2,3,4,5,6,7,8].map((cell) => (
                      <button
                        key={cell}
                        onClick={() => useGameStore.getState().setPracticeTargetCell(cell)}
                        className={`w-[18px] h-[18px] text-[7px] font-bold transition-all ${
                          practiceTargetCell === cell
                            ? 'bg-cyan-500 text-gray-900'
                            : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        {cell + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <GameCanvas />
      </div>
    </div>
  );
}
