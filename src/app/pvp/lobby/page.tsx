'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socketClient';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';
import { GameSettings } from '@/game/types';
import { DEFAULT_INNINGS } from '@/game/constants';
import SettingsPanel from '@/components/home/SettingsPanel';

type LobbyView = 'choose' | 'create' | 'join' | 'waiting' | 'ready';

export default function PvPLobbyPage() {
  const router = useRouter();
  const mp = useMultiplayerStore();
  const [view, setView] = useState<LobbyView>('choose');
  const [joinCode, setJoinCode] = useState('');
  const joinCodeRef = useRef(joinCode);
  joinCodeRef.current = joinCode;
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [playerName] = useState(() => `Player${Math.floor(Math.random() * 9000 + 1000)}`);
  const [settings, setSettings] = useState<GameSettings>({
    totalInnings: DEFAULT_INNINGS,
    difficulty: 'college',
    batterSide: 'right',
    pitcherHand: 'right',
    fieldSize: 'professional',
  });

  useEffect(() => {
    const socket = connectSocket();
    useMultiplayerStore.getState().setPlayerName(playerName);

    if (socket.connected) {
      useMultiplayerStore.getState().setConnectionStatus('connected');
    } else {
      useMultiplayerStore.getState().setConnectionStatus('connecting');
    }

    socket.on('connect', () => {
      useMultiplayerStore.getState().setConnectionStatus('connected');
    });

    socket.on('room_created', (payload) => {
      useMultiplayerStore.getState().setRoomCode(payload.roomCode);
      useMultiplayerStore.getState().setIsHost(true);
      useMultiplayerStore.getState().setLobbyPhase('waiting_for_opponent');
      setView('waiting');
    });

    socket.on('join_success', (payload) => {
      useMultiplayerStore.getState().setRoomCode(joinCodeRef.current.toUpperCase());
      useMultiplayerStore.getState().setIsHost(false);
      useMultiplayerStore.getState().setOpponentName(payload.opponentName);
      useMultiplayerStore.getState().setLobbyPhase('waiting_room');
      setSettings(payload.settings);
      setView('ready');
    });

    socket.on('opponent_joined', (payload) => {
      useMultiplayerStore.getState().setOpponentName(payload.opponentName);
      useMultiplayerStore.getState().setLobbyPhase('waiting_room');
      setView('ready');
    });

    socket.on('player_ready', (payload) => {
      useMultiplayerStore.getState().setOpponentReady(payload.ready);
    });

    socket.on('game_start', (payload) => {
      const mpStore = useMultiplayerStore.getState();
      mpStore.startMultiplayerGame(payload.isPlayerBatting, payload.settings);
      useGameStore.getState().startGame(payload.settings);
      if (!payload.isPlayerBatting) {
        useGameStore.setState({ isPlayerBatting: false });
      }
      router.push('/pvp');
    });

    socket.on('error', (payload) => {
      setError(payload.message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.off('connect');
      socket.off('room_created');
      socket.off('join_success');
      socket.off('opponent_joined');
      socket.off('player_ready');
      socket.off('game_start');
      socket.off('error');
    };
  }, [router, playerName]);

  const handleCreateRoom = useCallback(() => {
    getSocket().emit('create_room', { playerName, settings });
  }, [playerName, settings]);

  const handleJoinRoom = useCallback(() => {
    if (joinCode.length < 4) {
      setError('Please enter a valid room code');
      return;
    }
    getSocket().emit('join_room', { playerName, roomCode: joinCode.toUpperCase() });
  }, [playerName, joinCode]);

  const handleReady = useCallback(() => {
    const newReady = !mp.playerReady;
    useMultiplayerStore.getState().setPlayerReady(newReady);
    getSocket().emit('player_ready', { ready: newReady });
  }, [mp.playerReady]);

  const handleCopyCode = useCallback(() => {
    if (mp.roomCode) {
      navigator.clipboard.writeText(mp.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [mp.roomCode]);

  const handleBack = useCallback(() => {
    if (view === 'choose') {
      disconnectSocket();
      useMultiplayerStore.getState().reset();
      router.push('/');
    } else {
      setView('choose');
      setError(null);
    }
  }, [view, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(250,204,21,0.06)_0%,_transparent_70%)]" />

      <div className="text-center mb-8 relative animate-fade-in">
        <div className="text-5xl mb-3">&#127760;</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-1">
          <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
            PLAY ONLINE
          </span>
        </h1>
        <p className="text-gray-500 text-sm tracking-wider">
          {mp.connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-900/60 border border-red-500/50 rounded-lg text-red-200 text-sm animate-fade-in">
          {error}
        </div>
      )}

      {view === 'choose' && (
        <div className="w-full max-w-xs space-y-3 relative animate-fade-in">
          <button
            onClick={() => setView('create')}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-lg rounded-xl
                       transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]
                       shadow-lg shadow-yellow-500/20"
          >
            Create Room
          </button>
          <button
            onClick={() => setView('join')}
            className="w-full py-4 bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold text-lg rounded-xl
                       transition-all border border-cyan-500/30 backdrop-blur-sm"
          >
            Join Room
          </button>
          <button
            onClick={handleBack}
            className="w-full py-3 bg-gray-800/80 hover:bg-gray-700 text-gray-400 font-semibold rounded-xl
                       transition-all border border-gray-700/50 backdrop-blur-sm text-sm"
          >
            &larr; Back to Menu
          </button>
        </div>
      )}

      {view === 'create' && (
        <div className="w-full max-w-sm space-y-4 relative animate-fade-in">
          <div className="bg-gray-900/90 border border-gray-700/50 rounded-xl p-5 backdrop-blur-sm">
            <h2 className="text-white font-bold text-sm mb-4 text-center tracking-wider uppercase">
              Game Settings
            </h2>
            <SettingsPanel settings={settings} onChange={setSettings} />
          </div>
          <button
            onClick={handleCreateRoom}
            disabled={mp.connectionStatus !== 'connected'}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-lg rounded-xl
                       transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]
                       shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Room
          </button>
          <button
            onClick={handleBack}
            className="w-full py-3 bg-gray-800/80 hover:bg-gray-700 text-gray-400 font-semibold rounded-xl
                       transition-all border border-gray-700/50 backdrop-blur-sm text-sm"
          >
            &larr; Back
          </button>
        </div>
      )}

      {view === 'join' && (
        <div className="w-full max-w-sm space-y-4 relative animate-fade-in">
          <div className="bg-gray-900/90 border border-gray-700/50 rounded-xl p-5 backdrop-blur-sm">
            <h2 className="text-white font-bold text-sm mb-4 text-center tracking-wider uppercase">
              Enter Room Code
            </h2>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABCD23"
              maxLength={6}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center
                         text-2xl font-mono tracking-[0.3em] placeholder:text-gray-600 placeholder:tracking-[0.3em]
                         focus:outline-none focus:border-yellow-500/50 transition-colors"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoinRoom(); }}
            />
          </div>
          <button
            onClick={handleJoinRoom}
            disabled={joinCode.length < 4 || mp.connectionStatus !== 'connected'}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-lg rounded-xl
                       transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]
                       shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Room
          </button>
          <button
            onClick={handleBack}
            className="w-full py-3 bg-gray-800/80 hover:bg-gray-700 text-gray-400 font-semibold rounded-xl
                       transition-all border border-gray-700/50 backdrop-blur-sm text-sm"
          >
            &larr; Back
          </button>
        </div>
      )}

      {view === 'waiting' && (
        <div className="w-full max-w-sm space-y-4 relative animate-fade-in text-center">
          <div className="bg-gray-900/90 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
            <p className="text-gray-400 text-sm mb-3">Share this code with your opponent:</p>
            <div
              onClick={handleCopyCode}
              className="text-4xl font-mono font-bold text-yellow-400 tracking-[0.4em] cursor-pointer
                         hover:text-yellow-300 transition-colors select-all py-2"
              title="Click to copy"
            >
              {mp.roomCode}
            </div>
            <p className="text-gray-600 text-xs mt-2">
              {copied ? 'Copied!' : 'Click to copy'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-sm">Waiting for opponent to join...</span>
          </div>
          <button
            onClick={() => { disconnectSocket(); useMultiplayerStore.getState().reset(); setView('choose'); }}
            className="w-full py-3 bg-gray-800/80 hover:bg-gray-700 text-gray-400 font-semibold rounded-xl
                       transition-all border border-gray-700/50 backdrop-blur-sm text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {view === 'ready' && (
        <div className="w-full max-w-sm space-y-4 relative animate-fade-in">
          <div className="bg-gray-900/90 border border-gray-700/50 rounded-xl p-5 backdrop-blur-sm">
            <div className="text-center mb-4">
              <p className="text-gray-400 text-xs tracking-wider uppercase mb-1">Room</p>
              <p className="text-yellow-400 font-mono text-lg font-bold tracking-[0.3em]">{mp.roomCode}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">You</p>
                <p className="text-white font-bold text-sm">{playerName}</p>
                <div className={`mt-1 text-xs font-bold ${mp.playerReady ? 'text-green-400' : 'text-gray-600'}`}>
                  {mp.playerReady ? 'READY' : 'NOT READY'}
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Opponent</p>
                <p className="text-white font-bold text-sm">{mp.opponentName ?? '...'}</p>
                <div className={`mt-1 text-xs font-bold ${mp.opponentReady ? 'text-green-400' : 'text-gray-600'}`}>
                  {mp.opponentReady ? 'READY' : 'NOT READY'}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-700/50 pt-3 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Innings</span><span className="text-gray-300">{settings.totalInnings}</span>
              </div>
              <div className="flex justify-between">
                <span>Difficulty</span><span className="text-gray-300">{settings.difficulty}</span>
              </div>
              <div className="flex justify-between">
                <span>Field</span><span className="text-gray-300">{settings.fieldSize}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleReady}
            className={`w-full py-4 font-bold text-lg rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]
                       ${mp.playerReady
                         ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                         : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20'}`}
          >
            {mp.playerReady ? 'Cancel Ready' : 'Ready!'}
          </button>

          {mp.playerReady && mp.opponentReady && (
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-sm font-bold">Starting game...</span>
            </div>
          )}

          <button
            onClick={() => { disconnectSocket(); useMultiplayerStore.getState().reset(); router.push('/'); }}
            className="w-full py-3 bg-gray-800/80 hover:bg-gray-700 text-gray-400 font-semibold rounded-xl
                       transition-all border border-gray-700/50 backdrop-blur-sm text-sm"
          >
            Leave Room
          </button>
        </div>
      )}

      <div className="mt-12 text-gray-700 text-xs tracking-wider">
        Built with Next.js &middot; Three.js &middot; Socket.io
      </div>
    </div>
  );
}
