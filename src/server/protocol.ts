import type {
  PitchType,
  HitType,
  Vec2,
  Vec3,
  ScoreState,
  CountState,
  InningState,
  BaseRunner,
  GameSettings,
} from '@/game/types';

// --------------- Lobby events ---------------

export interface CreateRoomPayload {
  playerName: string;
  settings: GameSettings;
}

export interface RoomCreatedPayload {
  roomCode: string;
}

export interface JoinRoomPayload {
  playerName: string;
  roomCode: string;
}

export interface JoinSuccessPayload {
  settings: GameSettings;
  opponentName: string;
  isHost: boolean;
}

export interface OpponentJoinedPayload {
  opponentName: string;
}

export interface PlayerReadyPayload {
  ready: boolean;
}

export interface GameStartPayload {
  /** true = local player bats first (away team) */
  isPlayerBatting: boolean;
  settings: GameSettings;
}

// --------------- Gameplay events ---------------

export interface PitchCommittedPayload {
  pitchType: PitchType;
  targetCell: number;
  aimX: number;
  aimY: number;
  accuracy: number;
  speed: number;
}

export interface AtBatResultPayload {
  type: 'strike' | 'ball' | 'foul' | 'hit' | 'hbp';
  hitData?: {
    hitType: HitType;
    exitVelocity: Vec3;
    launchAngle: number;
    contactPoint: Vec3;
    chargePower: number;
    isBunt: boolean;
  };
}

export interface ThrowCommandPayload {
  fromFielderId: number;
  toBase: number;
  throwTarget: Vec2;
}

export interface PlayResolvedPayload {
  outcome: 'out' | 'safe' | 'run_scored' | 'home_run' | 'foul';
  gameState: {
    score: ScoreState;
    count: CountState;
    outs: number;
    inning: InningState;
    runners: BaseRunner[];
    isPlayerBatting: boolean;
  };
}

export interface GameStateSyncPayload {
  score: ScoreState;
  count: CountState;
  outs: number;
  inning: InningState;
  runners: BaseRunner[];
  phase: string;
  isPlayerBatting: boolean;
}

export interface OpponentDisconnectedPayload {
  reconnectDeadline: number;
}

export interface ForfeitPayload {
  reason: 'disconnect' | 'quit';
  winner: 'home' | 'away';
}

// --------------- Event map (client -> server) ---------------

export interface ReconnectPayload {
  roomCode: string;
  playerName: string;
}

export interface ClientToServerEvents {
  create_room: (payload: CreateRoomPayload) => void;
  join_room: (payload: JoinRoomPayload) => void;
  reconnect_room: (payload: ReconnectPayload) => void;
  player_ready: (payload: PlayerReadyPayload) => void;
  pitch_committed: (payload: PitchCommittedPayload) => void;
  at_bat_result: (payload: AtBatResultPayload) => void;
  throw_command: (payload: ThrowCommandPayload) => void;
  play_resolved: (payload: PlayResolvedPayload) => void;
  game_state_sync: (payload: GameStateSyncPayload) => void;
  forfeit: () => void;
}

// --------------- Event map (server -> client) ---------------

export interface ServerToClientEvents {
  room_created: (payload: RoomCreatedPayload) => void;
  join_success: (payload: JoinSuccessPayload) => void;
  opponent_joined: (payload: OpponentJoinedPayload) => void;
  player_ready: (payload: PlayerReadyPayload & { playerId: string }) => void;
  game_start: (payload: GameStartPayload) => void;
  pitch_committed: (payload: PitchCommittedPayload) => void;
  at_bat_result: (payload: AtBatResultPayload) => void;
  throw_command: (payload: ThrowCommandPayload) => void;
  play_resolved: (payload: PlayResolvedPayload) => void;
  game_state_sync: (payload: GameStateSyncPayload) => void;
  opponent_disconnected: (payload: OpponentDisconnectedPayload) => void;
  opponent_reconnected: () => void;
  forfeit: (payload: ForfeitPayload) => void;
  error: (payload: { message: string }) => void;
}
