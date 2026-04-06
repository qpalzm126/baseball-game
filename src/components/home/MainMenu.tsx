"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GameSettings } from "@/game/types";
import { DEFAULT_INNINGS } from "@/game/constants";
import { useGameStore } from "@/store/gameStore";
import RulesModal from "./RulesModal";
import SettingsPanel from "./SettingsPanel";

type MenuView = "main" | "play" | "practice";

export default function MainMenu() {
  const router = useRouter();
  const startGame = useGameStore((s) => s.startGame);
  const startPractice = useGameStore((s) => s.startPractice);
  const [showRules, setShowRules] = useState(false);
  const [view, setView] = useState<MenuView>("main");
  const [settings, setSettings] = useState<GameSettings>({
    totalInnings: DEFAULT_INNINGS,
    difficulty: "college",
    batterSide: "right",
    fieldSize: "professional",
  });

  const handleStartGame = () => {
    startGame(settings);
    router.push("/game");
  };

  const handleStartPractice = () => {
    startPractice(settings);
    router.push("/practice");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(250,204,21,0.06)_0%,_transparent_70%)]" />

      <div className="text-center mb-10 relative animate-fade-in">
        <div className="text-6xl mb-4">&#9918;</div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-1">
          <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
            BASEBALL
          </span>
        </h1>
        <p className="text-gray-500 text-base tracking-widest uppercase">
          The Classic American Pastime
        </p>
      </div>

      {view === "main" && (
        <div className="w-full max-w-xs space-y-3 relative animate-fade-in">
          <button
            onClick={() => setView("play")}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-lg rounded-xl
                       transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]
                       shadow-lg shadow-yellow-500/20 animate-pulse-glow"
          >
            Play vs Computer
          </button>

          <button
            onClick={handleStartPractice}
            className="w-full py-3 bg-cyan-600/80 hover:bg-cyan-500 text-white font-semibold rounded-xl
                       transition-all border border-cyan-500/30 backdrop-blur-sm"
          >
            Practice Mode
          </button>

          <button
            onClick={() => setShowRules(true)}
            className="w-full py-3 bg-gray-800/80 hover:bg-gray-700 text-gray-200 font-semibold rounded-xl
                       transition-all border border-gray-700/50 backdrop-blur-sm"
          >
            Game Rules
          </button>
        </div>
      )}

      {(view === "play" || view === "practice") && (
        <div className="w-full max-w-sm space-y-4 relative animate-fade-in">
          <div className="bg-gray-900/90 border border-gray-700/50 rounded-xl p-5 backdrop-blur-sm">
            <h2 className="text-white font-bold text-sm mb-4 text-center tracking-wider uppercase">
              {view === "play" ? "Game Settings" : "Practice Settings"}
            </h2>
            <SettingsPanel settings={settings} onChange={setSettings} />
          </div>

          <button
            onClick={view === "play" ? handleStartGame : handleStartPractice}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-lg rounded-xl
                       transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]
                       shadow-lg shadow-yellow-500/20"
          >
            {view === "play" ? "Start Game" : "Start Practice"}
          </button>

          <button
            onClick={() => setView("main")}
            className="w-full py-3 bg-gray-800/80 hover:bg-gray-700 text-gray-400 font-semibold rounded-xl
                       transition-all border border-gray-700/50 backdrop-blur-sm text-sm"
          >
            ← Back
          </button>
        </div>
      )}

      <div className="mt-12 text-gray-700 text-xs tracking-wider">
        Built with Next.js &middot; Three.js
      </div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
