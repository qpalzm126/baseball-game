import type { GameSettings } from '../game/types';

export interface RoomPlayer {
  socketId: string;
  name: string;
  ready: boolean;
  /** 'home' pitches first (top 1st), 'away' bats first */
  team: 'home' | 'away';
  disconnectedAt: number | null;
}

export interface Room {
  code: string;
  host: RoomPlayer;
  guest: RoomPlayer | null;
  settings: GameSettings;
  gameStarted: boolean;
  createdAt: number;
}

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RECONNECT_WINDOW_MS = 30_000;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

const rooms = new Map<string, Room>();

function generateCode(): string {
  let code: string;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

export function createRoom(socketId: string, playerName: string, settings: GameSettings): Room {
  const code = generateCode();
  const room: Room = {
    code,
    host: {
      socketId,
      name: playerName,
      ready: false,
      team: 'home',
      disconnectedAt: null,
    },
    guest: null,
    settings,
    gameStarted: false,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, socketId: string, playerName: string): Room | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  if (room.guest && !room.guest.disconnectedAt) return null;

  if (room.guest?.disconnectedAt) {
    room.guest.socketId = socketId;
    room.guest.name = playerName;
    room.guest.disconnectedAt = null;
    return room;
  }

  room.guest = {
    socketId,
    name: playerName,
    ready: false,
    team: 'away',
    disconnectedAt: null,
  };
  return room;
}

export function getRoom(code: string): Room | null {
  return rooms.get(code.toUpperCase()) ?? null;
}

export function getRoomBySocketId(socketId: string): Room | null {
  for (const room of rooms.values()) {
    if (room.host.socketId === socketId) return room;
    if (room.guest?.socketId === socketId) return room;
  }
  return null;
}

export function getPlayer(room: Room, socketId: string): RoomPlayer | null {
  if (room.host.socketId === socketId) return room.host;
  if (room.guest?.socketId === socketId) return room.guest;
  return null;
}

export function getOpponent(room: Room, socketId: string): RoomPlayer | null {
  if (room.host.socketId === socketId) return room.guest;
  if (room.guest?.socketId === socketId) return room.host;
  return null;
}

export function isHost(room: Room, socketId: string): boolean {
  return room.host.socketId === socketId;
}

export function setReady(room: Room, socketId: string, ready: boolean): boolean {
  const player = getPlayer(room, socketId);
  if (!player) return false;
  player.ready = ready;
  return true;
}

export function bothReady(room: Room): boolean {
  return room.host.ready && (room.guest?.ready ?? false);
}

export function markDisconnected(room: Room, socketId: string): RoomPlayer | null {
  const player = getPlayer(room, socketId);
  if (!player) return null;
  player.disconnectedAt = Date.now();
  return player;
}

export function tryReconnect(code: string, socketId: string): { room: Room; player: RoomPlayer } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;

  const now = Date.now();
  if (room.host.disconnectedAt && now - room.host.disconnectedAt < RECONNECT_WINDOW_MS) {
    room.host.socketId = socketId;
    room.host.disconnectedAt = null;
    return { room, player: room.host };
  }
  if (room.guest?.disconnectedAt && now - room.guest.disconnectedAt < RECONNECT_WINDOW_MS) {
    room.guest.socketId = socketId;
    room.guest.disconnectedAt = null;
    return { room, player: room.guest };
  }
  return null;
}

export function isReconnectExpired(player: RoomPlayer): boolean {
  if (!player.disconnectedAt) return false;
  return Date.now() - player.disconnectedAt >= RECONNECT_WINDOW_MS;
}

export function removeRoom(code: string): void {
  rooms.delete(code.toUpperCase());
}

export function cleanupStaleRooms(): void {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(code);
      continue;
    }
    if (room.host.disconnectedAt && isReconnectExpired(room.host) &&
        (!room.guest || (room.guest.disconnectedAt && isReconnectExpired(room.guest)))) {
      rooms.delete(code);
    }
  }
}

export function getRoomCount(): number {
  return rooms.size;
}

export { RECONNECT_WINDOW_MS };
