import { Difficulty, DifficultyConfig, FielderPosition, FieldSize, FieldSizeConfig, PitchConfig, PitchType, Vec2 } from './types';

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
  [FielderPosition.LeftField]: { x: 157, y: 121 },
  [FielderPosition.CenterField]: { x: 450, y: 25 },
  [FielderPosition.RightField]: { x: 743, y: 121 },
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
 *   2-Seam Fastball: ~8" arm-side run, ~7" less rise than 4-seam
 *   Curveball:       ~7" glove-side, ~8" drop (total w/ gravity much more)
 *   Slider:          ~4" glove-side, ~3" drop
 *   Changeup:        ~15" arm-side, ~30" total drop (gravity+induced ~3" extra)
 *   Sinker:          ~15" arm-side, ~6" less rise than fastball (= more drop)
 */
export const PITCH_CONFIGS: Record<PitchType, PitchConfig> = {
  [PitchType.FourSeam]: {
    type: PitchType.FourSeam,
    label: '4-Seam FB',
    key: 'Q',
    baseSpeed: 95,
    breakX: 1,
    breakY: -4,
    color: '#ef4444',
  },
  [PitchType.TwoSeam]: {
    type: PitchType.TwoSeam,
    label: '2-Seam FB',
    key: 'W',
    baseSpeed: 92,
    breakX: 5,
    breakY: 5,
    color: '#fb923c',
  },
  [PitchType.Curveball]: {
    type: PitchType.Curveball,
    label: 'Curveball',
    key: 'E',
    baseSpeed: 78,
    breakX: 5,
    breakY: 18,
    color: '#3b82f6',
  },
  [PitchType.Slider]: {
    type: PitchType.Slider,
    label: 'Slider',
    key: 'R',
    baseSpeed: 84,
    breakX: -10,
    breakY: 6,
    color: '#22c55e',
  },
  [PitchType.Changeup]: {
    type: PitchType.Changeup,
    label: 'Changeup',
    key: 'T',
    baseSpeed: 82,
    breakX: 6,
    breakY: 12,
    color: '#f59e0b',
  },
  [PitchType.Sinker]: {
    type: PitchType.Sinker,
    label: 'Sinker',
    key: 'Y',
    baseSpeed: 90,
    breakX: -4,
    breakY: 14,
    color: '#a855f7',
  },
  [PitchType.Splitter]: {
    type: PitchType.Splitter,
    label: 'Splitter',
    key: 'U',
    baseSpeed: 87,
    breakX: 1,
    breakY: 22,
    color: '#06b6d4',
  },
  [PitchType.Knuckleball]: {
    type: PitchType.Knuckleball,
    label: 'Knuckleball',
    key: 'I',
    baseSpeed: 72,
    breakX: 1,
    breakY: 2,
    color: '#ec4899',
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
 * Field sizes based on real-world baseball field dimensions:
 *
 * Level            | CF dist | Mound dist | Wall ht | Reference
 * -----------------|---------|------------|---------|------------------------------
 * Little League    | 200 ft  | 46 ft      | 4 ft    | Ages 9-12, 60 ft basepaths
 * Middle School    | 275 ft  | 54 ft      | 6 ft    | Ages 13-14, 70-80 ft paths
 * High School      | 330 ft  | 60.5 ft    | 8 ft    | Standard HS, 90 ft paths
 * College          | 370 ft  | 60.5 ft    | 8 ft    | NCAA D1, 90 ft paths
 * Professional     | 400 ft  | 60.5 ft    | 10 ft   | MLB / pro stadiums
 */
export const FIELD_SIZE_CONFIGS: Record<FieldSize, FieldSizeConfig> = {
  little_league: {
    id: 'little_league',
    label: '少棒場',
    labelEn: 'Little League',
    distanceFt: 200,
    moundDistanceFt: 46,
    wallRadiusGU: 455,
    wallHeightGU: 22,
  },
  middle_school: {
    id: 'middle_school',
    label: '青少棒場',
    labelEn: 'Middle School',
    distanceFt: 275,
    moundDistanceFt: 54,
    wallRadiusGU: 625,
    wallHeightGU: 30,
  },
  high_school: {
    id: 'high_school',
    label: '高中場',
    labelEn: 'High School',
    distanceFt: 330,
    moundDistanceFt: 60.5,
    wallRadiusGU: 750,
    wallHeightGU: 36,
  },
  college: {
    id: 'college',
    label: '大學場',
    labelEn: 'College',
    distanceFt: 370,
    moundDistanceFt: 60.5,
    wallRadiusGU: 841,
    wallHeightGU: 36,
  },
  professional: {
    id: 'professional',
    label: '職業場',
    labelEn: 'Professional',
    distanceFt: 400,
    moundDistanceFt: 60.5,
    wallRadiusGU: 900,
    wallHeightGU: 42,
  },
};

export const FIELD_SIZE_ORDER: FieldSize[] = [
  'little_league', 'middle_school', 'high_school', 'college', 'professional',
];

const PRO_WALL_RADIUS = 900;
const INFIELD_EDGE_RADIUS = 280;

export function getScaledFielderDefaults(fieldSize: FieldSize): Record<FielderPosition, Vec2> {
  const cfg = FIELD_SIZE_CONFIGS[fieldSize];
  const wallRadius = cfg.wallRadiusGU;
  const hp = HOME_PLATE;
  const base = FIELDER_DEFAULTS;
  const result = {} as Record<FielderPosition, Vec2>;

  const proOutfieldZone = PRO_WALL_RADIUS - INFIELD_EDGE_RADIUS;
  const curOutfieldZone = wallRadius - INFIELD_EDGE_RADIUS;

  for (const pos of Object.values(FielderPosition)) {
    const def = base[pos];

    const isOutfielder =
      pos === FielderPosition.LeftField ||
      pos === FielderPosition.CenterField ||
      pos === FielderPosition.RightField;

    if (isOutfielder) {
      const dx = def.x - hp.x;
      const dy = def.y - hp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dx, dy);
      const depthFraction = Math.max(0, (dist - INFIELD_EDGE_RADIUS) / proOutfieldZone);
      const newDist = INFIELD_EDGE_RADIUS + curOutfieldZone * depthFraction;
      result[pos] = {
        x: hp.x + Math.sin(angle) * newDist,
        y: hp.y + Math.cos(angle) * newDist,
      };
    } else {
      result[pos] = { ...def };
    }
  }
  return result;
}

/*
 * Difficulty tiers — pitch flight times are tuned to approximate real-world
 * reaction windows at each competitive level. The pitchFlightBase controls
 * how fast progress 0→1 advances; flight time ≈ 1 / (pitchFlightBase * speedFactor).
 *
 * Level        | ~Flight time (fastball) | Real-world reference
 * -------------|-------------------------|----------------------------------
 * 小學生       | ~0.83 s                 | Youth 50-55 mph / 46 ft mound (easy)
 * 中學生       | ~0.67 s                 | Jr. High 60-68 mph / 54 ft (easy)
 * 高中生       | ~0.56 s                 | HS 78-85 mph / 60.5 ft (slightly easy)
 * 大專生       | ~0.45 s                 | College 86-90 mph
 * 青年         | ~0.42 s                 | Minor league 88-93 mph
 * 中職         | ~0.41 s                 | CPBL 89-93 mph (~0.41s real)
 * MLB          | ~0.38 s                 | MLB 95-102 mph (~0.39s real)
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
    aiBallChance: 0.20,
    batCollisionScale: 2.4,
    chargeCycleDuration: 0.60,
    pitchBarSpeed: 0.8,
    breakMultiplier: 0.35,
    swingSpeedMultiplier: 0.70,
    pitchSpeedMultiplier: 0.55,
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
    aiBallChance: 0.18,
    batCollisionScale: 2.2,
    chargeCycleDuration: 0.50,
    pitchBarSpeed: 1.0,
    breakMultiplier: 0.50,
    swingSpeedMultiplier: 0.78,
    pitchSpeedMultiplier: 0.68,
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
    aiBallChance: 0.15,
    batCollisionScale: 2.0,
    chargeCycleDuration: 0.42,
    pitchBarSpeed: 1.3,
    breakMultiplier: 0.65,
    swingSpeedMultiplier: 0.86,
    pitchSpeedMultiplier: 0.84,
  },
  college: {
    id: 'college',
    label: '大專生',
    labelEn: 'College',
    pitchFlightBase: 2.22,
    aiPitchAccuracy: 0.76,
    aiSwingReaction: 0.66,
    aiSwingAccuracy: 0.60,
    aiSpeedCenter: 0.76,
    aiSpeedRange: 0.08,
    aiBallChance: 0.12,
    batCollisionScale: 1.8,
    chargeCycleDuration: 0.36,
    pitchBarSpeed: 1.6,
    breakMultiplier: 0.80,
    swingSpeedMultiplier: 0.92,
    pitchSpeedMultiplier: 0.93,
  },
  youth: {
    id: 'youth',
    label: '青年',
    labelEn: 'Youth',
    pitchFlightBase: 2.38,
    aiPitchAccuracy: 0.84,
    aiSwingReaction: 0.76,
    aiSwingAccuracy: 0.72,
    aiSpeedCenter: 0.84,
    aiSpeedRange: 0.08,
    aiBallChance: 0.10,
    batCollisionScale: 1.8,
    chargeCycleDuration: 0.30,
    pitchBarSpeed: 2.0,
    breakMultiplier: 0.90,
    swingSpeedMultiplier: 0.96,
    pitchSpeedMultiplier: 0.95,
  },
  cpbl: {
    id: 'cpbl',
    label: '中職',
    labelEn: 'CPBL',
    pitchFlightBase: 2.44,
    aiPitchAccuracy: 0.90,
    aiSwingReaction: 0.85,
    aiSwingAccuracy: 0.82,
    aiSpeedCenter: 0.90,
    aiSpeedRange: 0.06,
    aiBallChance: 0.08,
    batCollisionScale: 1.8,
    chargeCycleDuration: 0.26,
    pitchBarSpeed: 2.5,
    breakMultiplier: 0.95,
    swingSpeedMultiplier: 1.00,
    pitchSpeedMultiplier: 0.96,
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
    aiBallChance: 0.06,
    batCollisionScale: 1.8,
    chargeCycleDuration: 0.22,
    pitchBarSpeed: 3.0,
    breakMultiplier: 1.0,
    swingSpeedMultiplier: 1.05,
    pitchSpeedMultiplier: 1.07,
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
    aiBallChance: 0.03,
    batCollisionScale: 1.6,
    chargeCycleDuration: 0.16,
    pitchBarSpeed: 4.0,
    breakMultiplier: 1.4,
    swingSpeedMultiplier: 1.15,
    pitchSpeedMultiplier: 1.13,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = [
  'elementary', 'middle', 'high', 'college', 'youth', 'cpbl', 'mlb', 'alien',
];
