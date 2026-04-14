import { PitchType, PitcherProfile } from './types';

export const OHTANI_PROFILE: PitcherProfile = {
  id: 'ohtani',
  name: 'Shohei Ohtani',
  nameJa: '大谷翔平',
  hand: 'right',
  accuracy: 0.88,
  difficulty: 'mlb',
  faceImage: '/images/ohtani-face.png',
  pitches: [
    { type: PitchType.FourSeam, baseSpeed: 99, breakX: 1, breakY: -5, weight: 0.40 },
    { type: PitchType.Slider,   baseSpeed: 84, breakX: -14, breakY: 8, weight: 0.25 },
    { type: PitchType.Splitter, baseSpeed: 87, breakX: 1, breakY: 24, weight: 0.20 },
    { type: PitchType.Curveball, baseSpeed: 76, breakX: 4, breakY: 20, weight: 0.10 },
    { type: PitchType.Cutter,   baseSpeed: 91, breakX: -6, breakY: 4, weight: 0.05 },
  ],
};

const PROFILES: Record<string, PitcherProfile> = {
  ohtani: OHTANI_PROFILE,
};

export function getPitcherProfile(id: string): PitcherProfile | undefined {
  return PROFILES[id];
}
