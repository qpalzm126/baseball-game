export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export enum GamePhase {
  PrePitch = 'PRE_PITCH',
  Pitching = 'PITCHING',
  BatSwing = 'BAT_SWING',
  BallInPlay = 'BALL_IN_PLAY',
  Fielding = 'FIELDING',
  StrikeOrBall = 'STRIKE_OR_BALL',
  OutRecorded = 'OUT_RECORDED',
  RunnersAdvance = 'RUNNERS_ADVANCE',
  HalfInningEnd = 'HALF_INNING_END',
  GameOver = 'GAME_OVER',
}

export enum PitchType {
  FourSeam = 'FOUR_SEAM',
  TwoSeam = 'TWO_SEAM',
  Curveball = 'CURVEBALL',
  Slider = 'SLIDER',
  Changeup = 'CHANGEUP',
  Sinker = 'SINKER',
  Splitter = 'SPLITTER',
  Knuckleball = 'KNUCKLEBALL',
}

export interface PitchConfig {
  type: PitchType;
  label: string;
  key: string;
  baseSpeed: number;
  breakX: number;
  breakY: number;
  color: string;
}

export enum HitType {
  GroundBall = 'GROUND_BALL',
  LineDrive = 'LINE_DRIVE',
  FlyBall = 'FLY_BALL',
  PopUp = 'POP_UP',
  HomeRun = 'HOME_RUN',
  Foul = 'FOUL',
}

export enum BaseType {
  First = 1,
  Second = 2,
  Third = 3,
  Home = 4,
}

export interface BaseRunner {
  id: string;
  currentBase: BaseType | 0;
  targetBase: BaseType;
  /** Base the runner occupied when the current play started (for force-out chain). */
  startBase: BaseType | 0;
  position: Vec2;
  speed: number;
  isOut: boolean;
}

export enum FielderPosition {
  Pitcher = 'P',
  Catcher = 'C',
  FirstBase = '1B',
  SecondBase = '2B',
  ThirdBase = '3B',
  Shortstop = 'SS',
  LeftField = 'LF',
  CenterField = 'CF',
  RightField = 'RF',
}

export interface Fielder {
  id: number;
  position: FielderPosition;
  label: string;
  hotkey: string;
  location: Vec2;
  defaultLocation: Vec2;
  targetLocation: Vec2 | null;
  hasBall: boolean;
  isDiving: boolean;
  diveEndTime: number;
  lastDiveTime: number;
  speed: number;
  catchRadius: number;
  diveRadius: number;
}

export interface BallState {
  position3D: Vec3;
  velocity3D: Vec3;
  screenPosition: Vec2;
  isInPlay: boolean;
  isLanded: boolean;
  landingPosition: Vec2 | null;
  heldByFielder: number | null;
  thrownByFielder?: number | null;
  hitWall?: boolean;
  bounceOverWall?: boolean;
  clearedWall?: boolean;
}

export interface BatState {
  position: Vec2;
  angle: number;
  isSwinging: boolean;
}

export interface InningState {
  number: number;
  isTop: boolean;
}

export interface CountState {
  balls: number;
  strikes: number;
}

export interface ScoreState {
  home: number;
  away: number;
}

export type HalfInning = 'top' | 'bottom';

export interface PitchDecision {
  type: PitchType;
  targetCell: number;
  speed: number;
}

export interface SwingDecision {
  shouldSwing: boolean;
  batPosition: Vec2;
}

export interface FielderCommand {
  fielderId: number;
  targetLocation?: Vec2;
  throwTo?: number;
  dive?: boolean;
}

export interface IPlayerController {
  decidePitch(gameState: GameSnapshot): PitchDecision;
  decideSwing(gameState: GameSnapshot, ballPosition: Vec2): SwingDecision;
  controlFielders(gameState: GameSnapshot): FielderCommand[];
}

export interface GameSnapshot {
  phase: GamePhase;
  inning: InningState;
  count: CountState;
  score: ScoreState;
  outs: number;
  runners: BaseRunner[];
  fielders: Fielder[];
  ball: BallState;
}

export type BatterSide = 'left' | 'right';

export type PitcherHand = 'left' | 'right';

export type Difficulty =
  | 'elementary'
  | 'middle'
  | 'high'
  | 'college'
  | 'youth'
  | 'cpbl'
  | 'mlb'
  | 'alien';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  labelEn: string;
  /** Base pitch flight speed multiplier (higher = faster pitch) */
  pitchFlightBase: number;
  /** AI pitch accuracy 0-1 */
  aiPitchAccuracy: number;
  /** AI swing reaction chance 0-1 */
  aiSwingReaction: number;
  /** AI swing accuracy 0-1 */
  aiSwingAccuracy: number;
  /** AI center speed for the speed bar */
  aiSpeedCenter: number;
  /** AI speed variance ± */
  aiSpeedRange: number;
  /** Chance AI intentionally throws a ball */
  aiBallChance: number;
  /** Collision radius multiplier for batting (higher = more forgiving) */
  batCollisionScale: number;
  /** Charge cycle duration in seconds (lower = faster cycle) */
  chargeCycleDuration: number;
  /** Pitch control bar oscillation speed (higher = harder to time) */
  pitchBarSpeed: number;
  /** Breaking ball movement multiplier (1.0 = MLB realistic) */
  breakMultiplier: number;
  /** Swing speed multiplier (higher = faster swing, higher exit velocity) */
  swingSpeedMultiplier: number;
  /** Pitch speed display multiplier — scales baseSpeed for realistic mph at each level */
  pitchSpeedMultiplier: number;
}

export type FieldSize = 'little_league' | 'middle_school' | 'high_school' | 'college' | 'professional';

export interface FieldSizeConfig {
  id: FieldSize;
  label: string;
  labelEn: string;
  /** Center field distance in feet */
  distanceFt: number;
  /** Pitcher mound distance to home plate in feet */
  moundDistanceFt: number;
  /** Wall radius in game units */
  wallRadiusGU: number;
  /** Wall height in game units */
  wallHeightGU: number;
}

export interface GameSettings {
  totalInnings: number;
  difficulty: Difficulty;
  batterSide: BatterSide;
  pitcherHand: PitcherHand;
  fieldSize: FieldSize;
}
