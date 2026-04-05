'use client';

import { GameSettings, BatterSide } from '@/game/types';
import { DIFFICULTY_CONFIGS, DIFFICULTY_ORDER } from '@/game/constants';

interface SettingsPanelProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
}

const inningOptions = [1, 3, 5, 7, 9];

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const currentIdx = DIFFICULTY_ORDER.indexOf(settings.difficulty);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Innings</label>
        <div className="flex gap-2">
          {inningOptions.map((n) => (
            <button key={n} onClick={() => onChange({ ...settings, totalInnings: n })}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${settings.totalInnings === n ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Difficulty
          <span className="ml-2 text-yellow-400 font-bold">
            {DIFFICULTY_CONFIGS[settings.difficulty].label}
          </span>
          <span className="ml-1.5 text-gray-500 text-xs font-normal">
            {DIFFICULTY_CONFIGS[settings.difficulty].labelEn}
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTY_ORDER.map((d) => {
            const cfg = DIFFICULTY_CONFIGS[d];
            return (
              <button key={d} onClick={() => onChange({ ...settings, difficulty: d })}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  settings.difficulty === d
                    ? 'bg-yellow-500 text-gray-900 ring-2 ring-yellow-400/50'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}>
                {cfg.label}
              </button>
            );
          })}
        </div>
        <DifficultyMeter level={currentIdx} total={DIFFICULTY_ORDER.length} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Batting Side</label>
        <div className="flex gap-2">
          {([['right', 'Right (R)'], ['left', 'Left (L)']] as [BatterSide, string][]).map(([side, label]) => (
            <button key={side} onClick={() => onChange({ ...settings, batterSide: side })}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${settings.batterSide === side ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DifficultyMeter({ level, total }: { level: number; total: number }) {
  const pct = (level / (total - 1)) * 100;
  return (
    <div className="mt-2">
      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(8, pct)}%`,
            background: `linear-gradient(90deg, #22c55e ${0}%, #eab308 ${50}%, #ef4444 ${100}%)`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-600">
        <span>Easy</span>
        <span>Hard</span>
      </div>
    </div>
  );
}
