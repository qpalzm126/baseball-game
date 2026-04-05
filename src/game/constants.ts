import { Difficulty, DifficultyConfig, FielderPosition, PitchConfig, PitchType, Vec2 } from './types';

export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 600;

export const FIELD_CENTER: Vec2 = { x: 450, y: 520 };
export const MOUND_POSITION: Vec2 = { x: 450, y: 340 };
export const HOME_PLATE: Vec2 = { x: 450, y: 520 };
export const FIRST_BASE: Vec2 = { x: 600, y: 380 };
export const SECOND_BASE: Vec2 = { x: 450, y: 260 };
export const THIRD_BASE: Vec2 = { x: 300, y: 380 };

export const BASE_POSITIONS: Vec2[] = [
  HOME_PLATE,
  FIRST_BASE,
  SECOND_BASE,
  THIRD_BASE,
];

export const FIELDER_DEFAULTS: Record<FielderPosition, Vec2> = {
  [FielderPosition.Pitcher]: { x: 450, y: 340 },
  [FielderPosition.Catcher]: { x: 450, y: 570 },
  [FielderPosition.FirstBase]: { x: 610, y: 370 },
  [FielderPosition.SecondBase]: { x: 520, y: 280 },
  [FielderPosition.ThirdBase]: { x: 290, y: 370 },
  [FielderPosition.Shortstop]: { x: 380, y: 280 },
  [FielderPosition.LeftField]: { x: 200, y: 180 },
  [FielderPosition.CenterField]: { x: 450, y: 120 },
  [FielderPosition.RightField]: { x: 700, y: 180 },
};

export const FIELDER_HOTKEYS: Record<FielderPosition, string> = {
  [FielderPosition.Pitcher]: '1',
  [FielderPosition.Catcher]: '2',
  [FielderPosition.FirstBase]: '3',
  [FielderPosition.SecondBase]: '4',
  [FielderPosition.ThirdBase]: '5',
  [FielderPosition.Shortstop]: '6',
  [FielderPosition.LeftField]: '7',
  [FielderPosition.CenterField]: '8',
  [FielderPosition.RightField]: '9',
};

export const FIELDER_LABELS: Record<FielderPosition, string> = {
  [FielderPosition.Pitcher]: 'P',
  [FielderPosition.Catcher]: 'C',
  [FielderPosition.FirstBase]: '1B',
  [FielderPosition.SecondBase]: '2B',
  [FielderPosition.ThirdBase]: '3B',
  [FielderPosition.Shortstop]: 'SS',
  [FielderPosition.LeftField]: 'LF',
  [FielderPosition.CenterField]: 'CF',
  [FielderPosition.RightField]: 'RF',
};

/*
 * Pitch break values — breakX/breakY are base units at MLB difficulty (breakMultiplier=1.0).
 * Actual 3D deviation: x += sin(t*PI) * breakX * 0.02 * mul, y += sin(t*PI) * breakY * 0.01 * 0.5 * mul
 *
 * MLB realistic references (induced movement, right-handed pitcher):
 *   4-Seam Fastball: ~2" arm-side run, ~13" induced vertical rise (less drop)
 *   Curveball:       ~7" glove-side, ~8" drop (total w/ gravity much more)
 *   Slider:          ~4" glove-side, ~3" drop
 *   Changeup:        ~15" arm-side, ~30" total drop (gravity+induced ~3" extra)
 *   Sinker:          ~15" arm-side, ~6" less rise than fastball (= more drop)
 */
export const PITCH_CONFIGS: Record<PitchType, PitchConfig> = {
  [PitchType.Fastball]: {
    type: PitchType.Fastball,
    label: 'Fastball',
    key: 'Q',
    baseSpeed: 95,
    breakX: 1,
    breakY: -4,
    color: '#ef4444',
  },
  [PitchType.Curveball]: {
    type: PitchType.Curveball,
    label: 'Curveball',
    key: 'W',
    baseSpeed: 78,
    breakX: 5,
    breakY: 18,
    color: '#3b82f6',
  },
  [PitchType.Slider]: {
    type: PitchType.Slider,
    label: 'Slider',
    key: 'E',
    baseSpeed: 84,
    breakX: -10,
    breakY: 6,
    color: '#22c55e',
  },
  [PitchType.Changeup]: {
    type: PitchType.Changeup,
    label: 'Changeup',
    key: 'R',
    baseSpeed: 82,
    breakX: 6,
    breakY: 12,
    color: '#f59e0b',
  },
  [PitchType.Sinker]: {
    type: PitchType.Sinker,
    label: 'Sinker',
    key: 'T',
    baseSpeed: 90,
    breakX: -4,
    breakY: 14,
    color: '#a855f7',
  },
};

export const BATTING_VIEW = {
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  strikeZone: {
    x: 320,
    y: 200,
    width: 260,
    height: 260,
    rows: 3,
    cols: 3,
  },
  pitcherY: 100,
  batterY: 480,
  plateY: 450,
};

export const SPEED_BAR = {
  width: 300,
  height: 20,
  cycleSpeed: 1.6,
  minSpeed: 0.6,
  maxSpeed: 1.0,
};

export const FIELDER_SPEED = 1.0;
export const DIVE_SPEED_MULTIPLIER = 2.5;
export const DIVE_DURATION = 400;
export const DIVE_COOLDOWN = 2000;
export const CATCH_RADIUS = 22;
export const DIVE_CATCH_RADIUS = 45;
export const THROW_SPEED = 5.0;
export const RUNNER_SPEED = 0.8;

export const BALL_GRAVITY = 0.15;
export const BALL_DRAG = 0.998;

export const FIELD_BOUNDARY_RADIUS = 350;
export const FOUL_LINE_ANGLE = Math.PI / 4;

export const DEFAULT_INNINGS = 3;

/*
 * Difficulty tiers — pitch flight times are tuned to approximate real-world
 * reaction windows at each competitive level. The pitchFlightBase controls
 * how fast progress 0→1 advances; flight time ≈ 1 / (pitchFlightBase * speedFactor).
 *
 * Level        | ~Flight time (fastball) | Real-world reference
 * -------------|-------------------------|----------------------------------
 * 小學生       | ~0.83 s                 | Youth 50-65 mph / 46 ft mound
 * 中學生       | ~0.67 s                 | Jr. High 60-75 mph / 54 ft
 * 高中生       | ~0.56 s                 | HS 70-85 mph / 60.5 ft
 * 大專生       | ~0.47 s                 | College 80-90 mph
 * 青年         | ~0.41 s                 | Minor league 85-95 mph
 * 中職         | ~0.36 s                 | CPBL 88-95 mph
 * MLB          | ~0.38 s                 | MLB 92-102 mph (realistic)
 * 外星人       | ~0.26 s                 | Beyond human (超越現實)
 */
export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  elementary: {
    id: 'elementary',
    label: '小學生',
    labelEn: 'Elementary',
    pitchFlightBase: 1.2,
    aiPitchAccuracy: 0.48,
    aiSwingReaction: 0.32,
    aiSwingAccuracy: 0.30,
    aiSpeedCenter: 0.55,
    aiSpeedRange: 0.10,
    aiBallChance: 0.50,
    batCollisionScale: 2.4,
    chargeCycleDuration: 0.60,
    pitchBarSpeed: 0.8,
    breakMultiplier: 0.35,
  },
  middle: {
    id: 'middle',
    label: '中學生',
    labelEn: 'Middle School',
    pitchFlightBase: 1.5,
    aiPitchAccuracy: 0.56,
    aiSwingReaction: 0.42,
    aiSwingAccuracy: 0.38,
    aiSpeedCenter: 0.60,
    aiSpeedRange: 0.10,
    aiBallChance: 0.46,
    batCollisionScale: 2.2,
    chargeCycleDuration: 0.50,
    pitchBarSpeed: 1.0,
    breakMultiplier: 0.50,
  },
  high: {
    id: 'high',
    label: '高中生',
    labelEn: 'High School',
    pitchFlightBase: 1.8,
    aiPitchAccuracy: 0.65,
    aiSwingReaction: 0.54,
    aiSwingAccuracy: 0.48,
    aiSpeedCenter: 0.68,
    aiSpeedRange: 0.10,
    aiBallChance: 0.42,
    batCollisionScale: 2.0,
    chargeCycleDuration: 0.42,
    pitchBarSpeed: 1.3,
    breakMultiplier: 0.65,
  },
  college: {
    id: 'college',
    label: '大專生',
    labelEn: 'College',
    pitchFlightBase: 2.15,
    aiPitchAccuracy: 0.76,
    aiSwingReaction: 0.66,
    aiSwingAccuracy: 0.60,
    aiSpeedCenter: 0.76,
    aiSpeedRange: 0.08,
    aiBallChance: 0.36,
    batCollisionScale: 1.8,
    chargeCycleDuration: 0.36,
    pitchBarSpeed: 1.6,
    breakMultiplier: 0.80,
  },
  youth: {
    id: 'youth',
    label: '青年',
    labelEn: 'Youth',
    pitchFlightBase: 2.45,
    aiPitchAccuracy: 0.84,
    aiSwingReaction: 0.76,
    aiSwingAccuracy: 0.72,
    aiSpeedCenter: 0.84,
    aiSpeedRange: 0.08,
    aiBallChance: 0.30,
    batCollisionScale: 1.8,
    chargeCycleDuration: 0.30,
    pitchBarSpeed: 2.0,
    breakMultiplier: 0.90,
  },
  cpbl: {
    id: 'cpbl',
    label: '中職',
    labelEn: 'CPBL',
    pitchFlightBase: 2.8,
    aiPitchAccuracy: 0.90,
    aiSwingReaction: 0.85,
    aiSwingAccuracy: 0.82,
    aiSpeedCenter: 0.90,
    aiSpeedRange: 0.06,
    aiBallChance: 0.25,
    batCollisionScale: 1.8,
    chargeCycleDuration: 0.26,
    pitchBarSpeed: 2.5,
    breakMultiplier: 0.95,
  },
  mlb: {
    id: 'mlb',
    label: 'MLB',
    labelEn: 'MLB',
    pitchFlightBase: 2.6,
    aiPitchAccuracy: 0.95,
    aiSwingReaction: 0.92,
    aiSwingAccuracy: 0.88,
    aiSpeedCenter: 0.95,
    aiSpeedRange: 0.05,
    aiBallChance: 0.20,
    batCollisionScale: 1.8,
    chargeCycleDuration: 0.22,
    pitchBarSpeed: 3.0,
    breakMultiplier: 1.0,
  },
  alien: {
    id: 'alien',
    label: '外星人',
    labelEn: 'Alien',
    pitchFlightBase: 3.8,
    aiPitchAccuracy: 0.98,
    aiSwingReaction: 0.96,
    aiSwingAccuracy: 0.94,
    aiSpeedCenter: 0.98,
    aiSpeedRange: 0.02,
    aiBallChance: 0.12,
    batCollisionScale: 1.6,
    chargeCycleDuration: 0.16,
    pitchBarSpeed: 4.0,
    breakMultiplier: 1.4,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = [
  'elementary', 'middle', 'high', 'college', 'youth', 'cpbl', 'mlb', 'alien',
];
