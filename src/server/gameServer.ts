import { Server as IOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { ClientToServerEvents, ServerToClientEvents } from './protocol';
import {
  createRoom,
  joinRoom,
  getRoom,
  getRoomBySocketId,
  getPlayer,
  getOpponent,
  isHost,
  setReady,
  bothReady,
  markDisconnected,
  tryReconnect,
  removeRoom,
  cleanupStaleRooms,
  RECONNECT_WINDOW_MS,
} from './roomManager';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedIO = IOServer<ClientToServerEvents, ServerToClientEvents>;

export function attachGameServer(httpServer: HTTPServer, allowedOrigins?: string[]): TypedIO {
  const io: TypedIO = new IOServer(httpServer, {
    cors: {
      origin: allowedOrigins ?? '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  setInterval(() => cleanupStaleRooms(), 60_000);

  io.on('connection', (socket: TypedSocket) => {
    console.log(`[pvp] connected: ${socket.id}`);

    // ---- Lobby ----

    socket.on('create_room', (payload) => {
      const room = createRoom(socket.id, payload.playerName, payload.settings);
      socket.join(room.code);
      socket.emit('room_created', { roomCode: room.code });
      console.log(`[pvp] room ${room.code} created by ${payload.playerName}`);
    });

    socket.on('join_room', (payload) => {
      const room = joinRoom(payload.roomCode, socket.id, payload.playerName);
      if (!room) {
        socket.emit('error', { message: 'Room not found or already full' });
        return;
      }
      socket.join(room.code);
      socket.emit('join_success', {
        settings: room.settings,
        opponentName: room.host.name,
        isHost: false,
      });
      socket.to(room.code).emit('opponent_joined', {
        opponentName: payload.playerName,
      });
      console.log(`[pvp] ${payload.playerName} joined room ${room.code}`);
    });

    socket.on('reconnect_room', (payload) => {
      const result = tryReconnect(payload.roomCode, socket.id);
      if (!result) {
        socket.emit('error', { message: 'Room not found or reconnect window expired' });
        return;
      }
      const { room, player } = result;
      socket.join(room.code);
      const opponent = getOpponent(room, socket.id);
      if (opponent && !opponent.disconnectedAt) {
        io.to(opponent.socketId).emit('opponent_reconnected');
      }
      console.log(`[pvp] ${payload.playerName} reconnected to room ${room.code}`);
    });

    socket.on('player_ready', (payload) => {
      const room = getRoomBySocketId(socket.id);
      if (!room) return;
      setReady(room, socket.id, payload.ready);
      socket.to(room.code).emit('player_ready', {
        ready: payload.ready,
        playerId: socket.id,
      });

      if (bothReady(room) && !room.gameStarted) {
        room.gameStarted = true;
        // Host = home team (pitches first in top of 1st)
        // Guest = away team (bats first in top of 1st)
        io.to(room.host.socketId).emit('game_start', {
          isPlayerBatting: false,
          settings: room.settings,
        });
        if (room.guest) {
          io.to(room.guest.socketId).emit('game_start', {
            isPlayerBatting: true,
            settings: room.settings,
          });
        }
        console.log(`[pvp] game started in room ${room.code}`);
      }
    });

    // ---- Gameplay relay ----

    socket.on('pitch_committed', (payload) => {
      const room = getRoomBySocketId(socket.id);
      if (!room) return;
      socket.to(room.code).emit('pitch_committed', payload);
    });

    socket.on('at_bat_result', (payload) => {
      const room = getRoomBySocketId(socket.id);
      if (!room) return;
      socket.to(room.code).emit('at_bat_result', payload);
    });

    socket.on('throw_command', (payload) => {
      const room = getRoomBySocketId(socket.id);
      if (!room) return;
      socket.to(room.code).emit('throw_command', payload);
    });

    socket.on('play_resolved', (payload) => {
      const room = getRoomBySocketId(socket.id);
      if (!room) return;
      socket.to(room.code).emit('play_resolved', payload);
    });

    socket.on('game_state_sync', (payload) => {
      const room = getRoomBySocketId(socket.id);
      if (!room) return;
      socket.to(room.code).emit('game_state_sync', payload);
    });

    socket.on('forfeit', () => {
      const room = getRoomBySocketId(socket.id);
      if (!room) return;
      const player = getPlayer(room, socket.id);
      const opponent = getOpponent(room, socket.id);
      if (!player || !opponent) return;

      const winner = player.team === 'home' ? 'away' : 'home';
      io.to(room.code).emit('forfeit', { reason: 'quit', winner });
      removeRoom(room.code);
      console.log(`[pvp] forfeit in room ${room.code}, winner: ${winner}`);
    });

    // ---- Disconnect handling ----

    socket.on('disconnect', () => {
      console.log(`[pvp] disconnected: ${socket.id}`);
      const room = getRoomBySocketId(socket.id);
      if (!room) return;

      const disconnected = markDisconnected(room, socket.id);
      if (!disconnected) return;

      const opponent = getOpponent(room, socket.id);
      if (opponent && !opponent.disconnectedAt) {
        const deadline = Date.now() + RECONNECT_WINDOW_MS;
        io.to(opponent.socketId).emit('opponent_disconnected', {
          reconnectDeadline: deadline,
        });

        setTimeout(() => {
          if (disconnected.disconnectedAt) {
            const winner = disconnected.team === 'home' ? 'away' : 'home';
            if (opponent && !opponent.disconnectedAt) {
              io.to(opponent.socketId).emit('forfeit', {
                reason: 'disconnect',
                winner,
              });
            }
            removeRoom(room.code);
            console.log(`[pvp] room ${room.code} removed (disconnect timeout)`);
          }
        }, RECONNECT_WINDOW_MS + 1000);
      } else {
        if (!room.gameStarted) {
          removeRoom(room.code);
        }
      }
    });
  });

  return io;
}
