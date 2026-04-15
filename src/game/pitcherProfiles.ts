import { PitchType, PitcherProfile } from './types';

export const DEFAULT_STRIKEOUT_IMAGES: string[] = [
  '/images/strikeout/k-1.png',
  '/images/strikeout/k-2.png',
  '/images/strikeout/k-3.png',
  '/images/strikeout/k-4.png',
  '/images/strikeout/k-5.png',
  '/images/strikeout/k-6.png',
  '/images/strikeout/k-7.png',
];

export const DEFAULT_STRIKE_IMAGES: string[] = [
  '/images/strike/s-1.png',
  '/images/strike/s-2.png',
  '/images/strike/s-3.png',
];

export const DEFAULT_BALL_IMAGES: string[] = [
  '/images/ball/b-1.png',
  '/images/ball/b-2.png',
  '/images/ball/b-3.png',
];

export const OHTANI_PROFILE: PitcherProfile = {
  id: 'ohtani',
  name: 'Shohei Ohtani',
  nameJa: '大谷翔平',
  hand: 'right',
  accuracy: 0.88,
  difficulty: 'mlb',
  faceImage: '/images/ohtani-face.png',
  strikeoutImages: [
    '/images/strikeout/k-1.png',
    '/images/strikeout/k-2.png',
    '/images/strikeout/k-3.png',
    '/images/strikeout/k-4.png',
    '/images/strikeout/k-5.png',
    '/images/strikeout/k-6.png',
    '/images/strikeout/k-7.png',
  ],
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
