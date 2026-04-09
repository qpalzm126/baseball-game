import { create } from 'zustand';
import type { GameSettings } from '@/game/types';
import type {
  PitchCommittedPayload,
  AtBatResultPayload,
  ThrowCommandPayload,
} from '@/server/protocol';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type LobbyPhase = 'idle' | 'creating' | 'waiting_for_opponent' | 'joining' | 'waiting_room' | 'starting';

export interface MultiplayerStore {
  connectionStatus: ConnectionStatus;
  lobbyPhase: LobbyPhase;
  roomCode: string | null;
  isHost: boolean;
  playerName: string;
  opponentName: string | null;
  playerReady: boolean;
  opponentReady: boolean;
  isMultiplayer: boolean;
  /** true = local player is batting this half-inning */
  isLocalBatting: boolean;
  opponentDisconnected: boolean;
  reconnectDeadline: number | null;
  forfeitWinner: 'home' | 'away' | null;

  /** Queued events from the remote player, consumed by game loop */
  remotePitch: PitchCommittedPayload | null;
  remoteAtBatResult: AtBatResultPayload | null;
  remoteThrowCommands: ThrowCommandPayload[];

  setConnectionStatus: (status: ConnectionStatus) => void;
  setLobbyPhase: (phase: LobbyPhase) => void;
  setRoomCode: (code: string | null) => void;
  setIsHost: (isHost: boolean) => void;
  setPlayerName: (name: string) => void;
  setOpponentName: (name: string | null) => void;
  setPlayerReady: (ready: boolean) => void;
  setOpponentReady: (ready: boolean) => void;
  setIsMultiplayer: (mp: boolean) => void;
  setIsLocalBatting: (batting: boolean) => void;
  setOpponentDisconnected: (disc: boolean) => void;
  setReconnectDeadline: (deadline: number | null) => void;
  setForfeitWinner: (winner: 'home' | 'away' | null) => void;

  setRemotePitch: (p: PitchCommittedPayload | null) => void;
  setRemoteAtBatResult: (r: AtBatResultPayload | null) => void;
  pushRemoteThrowCommand: (cmd: ThrowCommandPayload) => void;
  shiftRemoteThrowCommand: () => ThrowCommandPayload | undefined;
  clearRemoteThrowCommands: () => void;

  startMultiplayerGame: (isLocalBatting: boolean, settings: GameSettings) => void;
  reset: () => void;
}

export const useMultiplayerStore = create<MultiplayerStore>((set, get) => ({
  connectionStatus: 'disconnected',
  lobbyPhase: 'idle',
  roomCode: null,
  isHost: false,
  playerName: '',
  opponentName: null,
  playerReady: false,
  opponentReady: false,
  isMultiplayer: false,
  isLocalBatting: false,
  opponentDisconnected: false,
  reconnectDeadline: null,
  forfeitWinner: null,

  remotePitch: null,
  remoteAtBatResult: null,
  remoteThrowCommands: [],

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setLobbyPhase: (phase) => set({ lobbyPhase: phase }),
  setRoomCode: (code) => set({ roomCode: code }),
  setIsHost: (isHost) => set({ isHost }),
  setPlayerName: (name) => set({ playerName: name }),
  setOpponentName: (name) => set({ opponentName: name }),
  setPlayerReady: (ready) => set({ playerReady: ready }),
  setOpponentReady: (ready) => set({ opponentReady: ready }),
  setIsMultiplayer: (mp) => set({ isMultiplayer: mp }),
  setIsLocalBatting: (batting) => set({ isLocalBatting: batting }),
  setOpponentDisconnected: (disc) => set({ opponentDisconnected: disc }),
  setReconnectDeadline: (deadline) => set({ reconnectDeadline: deadline }),
  setForfeitWinner: (winner) => set({ forfeitWinner: winner }),

  setRemotePitch: (p) => set({ remotePitch: p }),
  setRemoteAtBatResult: (r) => set({ remoteAtBatResult: r }),
  pushRemoteThrowCommand: (cmd) => set((s) => ({
    remoteThrowCommands: [...s.remoteThrowCommands, cmd],
  })),
  shiftRemoteThrowCommand: () => {
    const cmds = get().remoteThrowCommands;
    if (cmds.length === 0) return undefined;
    const [first, ...rest] = cmds;
    set({ remoteThrowCommands: rest });
    return first;
  },
  clearRemoteThrowCommands: () => set({ remoteThrowCommands: [] }),

  startMultiplayerGame: (isLocalBatting, settings) => set({
    isMultiplayer: true,
    isLocalBatting: isLocalBatting,
    lobbyPhase: 'starting',
    remotePitch: null,
    remoteAtBatResult: null,
    remoteThrowCommands: [],
    opponentDisconnected: false,
    reconnectDeadline: null,
    forfeitWinner: null,
  }),

  reset: () => set({
    connectionStatus: 'disconnected',
    lobbyPhase: 'idle',
    roomCode: null,
    isHost: false,
    opponentName: null,
    playerReady: false,
    opponentReady: false,
    isMultiplayer: false,
    isLocalBatting: false,
    opponentDisconnected: false,
    reconnectDeadline: null,
    forfeitWinner: null,
    remotePitch: null,
    remoteAtBatResult: null,
    remoteThrowCommands: [],
  }),
}));
