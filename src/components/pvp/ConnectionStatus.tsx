'use client';

import { useMultiplayerStore } from '@/store/multiplayerStore';

export default function ConnectionStatus() {
  const opponentName = useMultiplayerStore((s) => s.opponentName);
  const opponentDisconnected = useMultiplayerStore((s) => s.opponentDisconnected);
  const isLocalBatting = useMultiplayerStore((s) => s.isLocalBatting);
  const connectionStatus = useMultiplayerStore((s) => s.connectionStatus);

  const connected = connectionStatus === 'connected' && !opponentDisconnected;

  return (
    <div className="absolute top-2 left-2 z-30 flex items-center gap-2 bg-black/50 backdrop-blur-sm
                    px-3 py-1.5 rounded-lg border border-gray-700/40">
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
      <span className="text-[11px] text-gray-300 font-medium">
        vs {opponentName ?? '...'}
      </span>
      <span className="text-[10px] text-gray-500 ml-1">
        {isLocalBatting ? 'BAT' : 'PITCH'}
      </span>
    </div>
  );
}
