import { create } from 'zustand';
import {
  GamePhase,
  PitchType,
  InningState,
  CountState,
  ScoreState,
  Fielder,
  BallState,
  BaseRunner,
  GameSettings,
  FielderPosition,
} from '@/game/types';
import {
  FIELDER_DEFAULTS,
  FIELDER_HOTKEYS,
  FIELDER_LABELS,
  DEFAULT_INNINGS,
} from '@/game/constants';

function createFielders(): Fielder[] {
  const positions = Object.values(FielderPosition);
  return positions.map((pos, idx) => ({
    id: idx + 1,
    position: pos,
    label: FIELDER_LABELS[pos],
    hotkey: FIELDER_HOTKEYS[pos],
    location: { ...FIELDER_DEFAULTS[pos] },
    defaultLocation: { ...FIELDER_DEFAULTS[pos] },
    targetLocation: null,
    hasBall: false,
    isDiving: false,
    diveEndTime: 0,
    lastDiveTime: 0,
    speed: pos === FielderPosition.Catcher ? 0.72
         : (pos === FielderPosition.LeftField || pos === FielderPosition.CenterField || pos === FielderPosition.RightField) ? 1.4
         : 1.0,
    catchRadius: 20,
    diveRadius: 40,
  }));
}

function initialBallState(): BallState {
  return {
    position3D: { x: 450, y: 340, z: 0 },
    velocity3D: { x: 0, y: 0, z: 0 },
    screenPosition: { x: 450, y: 340 },
    isInPlay: false,
    isLanded: false,
    landingPosition: null,
    heldByFielder: null,
  };
}

export interface GameStore {
  phase: GamePhase;
  inning: InningState;
  count: CountState;
  score: ScoreState;
  outs: number;
  runners: BaseRunner[];
  fielders: Fielder[];
  ball: BallState;
  settings: GameSettings;
  selectedPitch: PitchType | null;
  speedBarValue: number | null;
  targetCell: number | null;
  pitchAimPos: { x: number; y: number } | null;
  accuracyValue: number | null;
  selectedFielderId: number | null;
  isPlayerBatting: boolean;
  gameStarted: boolean;
  practiceMode: boolean;
  practicePitchType: PitchType | null;
  practiceStrikesOnly: boolean;
  practiceTargetCell: number | null;

  startGame: (settings?: Partial<GameSettings>) => void;
  startPractice: (settings?: Partial<GameSettings>) => void;
  startPitchingPractice: (settings?: Partial<GameSettings>) => void;
  setPracticePitchType: (type: PitchType | null) => void;
  setPracticeStrikesOnly: (v: boolean) => void;
  setPracticeTargetCell: (cell: number | null) => void;
  updateSettings: (updates: Partial<GameSettings>) => void;
  setPhase: (phase: GamePhase) => void;
  selectPitch: (pitch: PitchType) => void;
  setSpeedBarValue: (value: number) => void;
  setTargetCell: (cell: number) => void;
  setPitchAimPos: (pos: { x: number; y: number }) => void;
  setAccuracyValue: (value: number) => void;
  selectFielder: (id: number | null) => void;
  updateFielder: (id: number, updates: Partial<Fielder>) => void;
  updateBall: (updates: Partial<BallState>) => void;
  addRunner: (runner: BaseRunner) => void;
  updateRunner: (id: string, updates: Partial<BaseRunner>) => void;
  removeRunner: (id: string) => void;
  recordOut: () => void;
  /** Increment outs during live play — only changes phase on 3 outs. */
  recordOutInPlay: () => void;
  scoreRun: (team: 'home' | 'away') => void;
  advanceCount: (type: 'ball' | 'strike') => void;
  resetCount: () => void;
  nextHalfInning: () => void;
  resetFielders: () => void;
  resetForNewPitch: () => void;
  endGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: GamePhase.PrePitch,
  inning: { number: 1, isTop: true },
  count: { balls: 0, strikes: 0 },
  score: { home: 0, away: 0 },
  outs: 0,
  runners: [],
  fielders: createFielders(),
  ball: initialBallState(),
  settings: { totalInnings: DEFAULT_INNINGS, difficulty: 'college', batterSide: 'right' },
  selectedPitch: null,
  speedBarValue: null,
  targetCell: null,
  pitchAimPos: null,
  accuracyValue: null,
  selectedFielderId: null,
  isPlayerBatting: true,
  gameStarted: false,
  practiceMode: false,
  practicePitchType: null,
  practiceStrikesOnly: false,
  practiceTargetCell: null,

  startGame: (settings) =>
    set({
      phase: GamePhase.PrePitch,
      inning: { number: 1, isTop: true },
      count: { balls: 0, strikes: 0 },
      score: { home: 0, away: 0 },
      outs: 0,
      runners: [],
      fielders: createFielders(),
      ball: initialBallState(),
      settings: { ...get().settings, ...settings },
      selectedPitch: null,
      speedBarValue: null,
      targetCell: null,
      pitchAimPos: null,
      accuracyValue: null,
      selectedFielderId: null,
      isPlayerBatting: true,
      gameStarted: true,
      practiceMode: false,
    }),

  startPractice: (settings) =>
    set({
      phase: GamePhase.PrePitch,
      inning: { number: 1, isTop: true },
      count: { balls: 0, strikes: 0 },
      score: { home: 0, away: 0 },
      outs: 0,
      runners: [],
      fielders: createFielders(),
      ball: initialBallState(),
      settings: { ...get().settings, ...settings },
      selectedPitch: null,
      speedBarValue: null,
      targetCell: null,
      pitchAimPos: null,
      accuracyValue: null,
      selectedFielderId: null,
      isPlayerBatting: true,
      gameStarted: true,
      practiceMode: true,
    }),

  startPitchingPractice: (settings) =>
    set({
      phase: GamePhase.PrePitch,
      inning: { number: 1, isTop: true },
      count: { balls: 0, strikes: 0 },
      score: { home: 0, away: 0 },
      outs: 0,
      runners: [],
      fielders: createFielders(),
      ball: initialBallState(),
      settings: { ...get().settings, ...settings },
      selectedPitch: null,
      speedBarValue: null,
      targetCell: null,
      pitchAimPos: null,
      accuracyValue: null,
      selectedFielderId: null,
      isPlayerBatting: false,
      gameStarted: true,
      practiceMode: true,
    }),

  setPracticePitchType: (type) => set({ practicePitchType: type }),
  setPracticeStrikesOnly: (v) => set({ practiceStrikesOnly: v }),
  setPracticeTargetCell: (cell) => set({ practiceTargetCell: cell }),

  updateSettings: (updates) => set({ settings: { ...get().settings, ...updates } }),

  setPhase: (phase) => set({ phase }),

  selectPitch: (pitch) => set({ selectedPitch: pitch }),

  setSpeedBarValue: (value) => set({ speedBarValue: value }),

  setTargetCell: (cell) => set({ targetCell: cell }),

  setPitchAimPos: (pos) => set({ pitchAimPos: pos }),

  setAccuracyValue: (value) => set({ accuracyValue: value }),

  selectFielder: (id) => set({ selectedFielderId: id }),

  updateFielder: (id, updates) =>
    set((state) => ({
      fielders: state.fielders.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),

  updateBall: (updates) =>
    set((state) => ({ ball: { ...state.ball, ...updates } })),

  addRunner: (runner) =>
    set((state) => ({ runners: [...state.runners, runner] })),

  updateRunner: (id, updates) =>
    set((state) => ({
      runners: state.runners.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  removeRunner: (id) =>
    set((state) => ({
      runners: state.runners.filter((r) => r.id !== id),
    })),

  recordOut: () => {
    const { outs, inning, settings, score } = get();
    const newOuts = outs + 1;
    if (newOuts >= 3) {
      const isBottomLastDone =
        !inning.isTop && inning.number >= settings.totalInnings;
      const isTopLastAndHomeleads =
        inning.isTop &&
        inning.number >= settings.totalInnings &&
        score.home > score.away;

      if (isBottomLastDone || isTopLastAndHomeleads) {
        set({ outs: newOuts, phase: GamePhase.GameOver });
      } else {
        set({ outs: newOuts, phase: GamePhase.HalfInningEnd });
      }
    } else {
      set({ outs: newOuts, phase: GamePhase.OutRecorded });
    }
  },

  recordOutInPlay: () => {
    const { outs, inning, settings, score } = get();
    const newOuts = outs + 1;
    if (newOuts >= 3) {
      const isBottomLastDone =
        !inning.isTop && inning.number >= settings.totalInnings;
      const isTopLastAndHomeleads =
        inning.isTop &&
        inning.number >= settings.totalInnings &&
        score.home > score.away;
      if (isBottomLastDone || isTopLastAndHomeleads) {
        set({ outs: newOuts, phase: GamePhase.GameOver });
      } else {
        set({ outs: newOuts, phase: GamePhase.HalfInningEnd });
      }
    } else {
      set({ outs: newOuts });
    }
  },

  scoreRun: (team) =>
    set((state) => ({
      score: {
        ...state.score,
        [team]: state.score[team] + 1,
      },
    })),

  advanceCount: (type) => {
    const { count } = get();
    if (type === 'ball') {
      const newBalls = count.balls + 1;
      if (newBalls >= 4) {
        set({
          count: { balls: 0, strikes: 0 },
          phase: GamePhase.RunnersAdvance,
        });
      } else {
        set({
          count: { ...count, balls: newBalls },
          phase: GamePhase.StrikeOrBall,
        });
      }
    } else {
      const newStrikes = count.strikes + 1;
      if (newStrikes >= 3) {
        set({ count: { balls: 0, strikes: 0 } });
        get().recordOut();
      } else {
        set({
          count: { ...count, strikes: newStrikes },
          phase: GamePhase.StrikeOrBall,
        });
      }
    }
  },

  resetCount: () => set({ count: { balls: 0, strikes: 0 } }),

  nextHalfInning: () => {
    const { inning } = get();
    const newInning: InningState = inning.isTop
      ? { number: inning.number, isTop: false }
      : { number: inning.number + 1, isTop: true };
    set({
      inning: newInning,
      outs: 0,
      count: { balls: 0, strikes: 0 },
      runners: [],
      isPlayerBatting: !get().isPlayerBatting,
      phase: GamePhase.PrePitch,
      fielders: createFielders(),
      ball: initialBallState(),
      selectedPitch: null,
      speedBarValue: null,
      targetCell: null,
      pitchAimPos: null,
      accuracyValue: null,
      selectedFielderId: null,
    });
  },

  resetFielders: () =>
    set({ fielders: createFielders() }),

  resetForNewPitch: () =>
    set({
      ball: initialBallState(),
      selectedPitch: null,
      speedBarValue: null,
      targetCell: null,
      pitchAimPos: null,
      accuracyValue: null,
      phase: GamePhase.PrePitch,
    }),

  endGame: () => set({ gameStarted: false, practiceMode: false, phase: GamePhase.GameOver }),
}));
