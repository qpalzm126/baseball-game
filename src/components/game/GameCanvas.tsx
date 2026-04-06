'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { GameLoop } from '@/engine/GameLoop';
import { InputManager } from '@/engine/InputManager';
import { ThreeScene } from '@/engine/ThreeScene';
import { AIController } from '@/game/AIController';
import { GamePhase, PitchType } from '@/game/types';
import { PITCH_CONFIGS, DIFFICULTY_CONFIGS, FIELD_SIZE_CONFIGS } from '@/game/constants';

import { usePauseControl } from '@/hooks/usePauseControl';
import { useBattingTutorial } from '@/hooks/useBattingTutorial';
import { useGameUpdate } from '@/hooks/useGameUpdate';

import PitchSelector from './PitchSelector';
import SpeedBar from './SpeedBar';
import Scoreboard from './Scoreboard';
import PauseMenu from './PauseMenu';
import BattingTutorial from './BattingTutorial';
import PracticeOverlays from './PracticeOverlays';
import GameHUD from './GameHUD';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ThreeScene | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const inputRef = useRef<InputManager>(new InputManager());
  const aiRef = useRef<AIController | null>(null);
  const storeRef = useRef(useGameStore.getState());

  const store = useGameStore();

  const { paused, pausedRef, windowHiddenRef, togglePause, resumeGame, quitGame } = usePauseControl();

  // showBattingTutorialRef is needed by useGameUpdate to pause the loop,
  // so we create a stable ref here and pass it to both hooks.
  const showBattingTutorialRef = useRef(false);

  const game = useGameUpdate({
    sceneRef,
    inputRef,
    aiRef,
    storeRef,
    showBattingTutorialRef,
    pausedRef,
    windowHiddenRef,
  });

  const { showBattingTutorial, dismissTutorial } = useBattingTutorial(
    game.phaseTimerRef,
    showBattingTutorialRef,
  );

  /* =========== STORE SYNC =========== */

  useEffect(() => {
    storeRef.current = useGameStore.getState();
    const unsub = useGameStore.subscribe((s) => { storeRef.current = s; });
    return unsub;
  }, []);

  useEffect(() => {
    aiRef.current = new AIController(store.settings.difficulty);
  }, [store.settings.difficulty]);

  useEffect(() => {
    sceneRef.current?.setBatterSide(store.settings.batterSide);
  }, [store.settings.batterSide]);

  useEffect(() => {
    const cfg = FIELD_SIZE_CONFIGS[store.settings.fieldSize];
    sceneRef.current?.setFieldSize(cfg.wallRadiusGU, cfg.wallHeightGU, cfg.moundDistanceFt);
  }, [store.settings.fieldSize]);

  /* =========== LIFECYCLE =========== */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const threeScene = new ThreeScene(container);
    sceneRef.current = threeScene;
    threeScene.setBatterSide(storeRef.current.settings.batterSide);
    const initFieldCfg = FIELD_SIZE_CONFIGS[storeRef.current.settings.fieldSize];
    threeScene.setFieldSize(initFieldCfg.wallRadiusGU, initFieldCfg.wallHeightGU, initFieldCfg.moundDistanceFt);
    inputRef.current.attach(threeScene.getDomElement());
    gameLoopRef.current = new GameLoop(game.update, game.render);
    gameLoopRef.current.start();
    return () => {
      gameLoopRef.current?.stop();
      inputRef.current.detach();
      threeScene.dispose();
      sceneRef.current = null;
      if (game.pitchInfoTimerRef.current) clearTimeout(game.pitchInfoTimerRef.current);
    };
  }, [game.update, game.render, game.pitchInfoTimerRef]);

  /* =========== DERIVED STATE =========== */

  const showPitchControls = !store.isPlayerBatting && store.phase === GamePhase.PrePitch;
  const pitchStep = !store.selectedPitch ? 'type'
    : !store.pitchAimPos ? 'aim'
    : store.accuracyValue === null ? 'accuracy'
    : !store.speedBarValue ? 'speed'
    : 'done';
  const isPractice = store.practiceMode;

  /* =========== JSX =========== */

  return (
    <div className="flex flex-col items-center gap-4">
      {!isPractice && <Scoreboard />}
      <div className="relative">
        <div ref={containerRef} className="border border-gray-700 rounded-lg overflow-hidden" style={{ width: 900, maxWidth: '100%', height: 600 }} />

        {isPractice && (
          <PracticeOverlays
            isPlayerBatting={store.isPlayerBatting}
            pitchStep={pitchStep}
            hitDebug={game.hitDebug}
            practiceStats={game.practiceStats}
            pitchPracticeStats={game.pitchPracticeStats}
            lastPitchResult={game.lastPitchResult}
          />
        )}

        {showPitchControls && pitchStep === 'type' && (
          <div className="absolute top-2 left-2 right-2 z-10">
            <PitchSelector selectedPitch={store.selectedPitch} onSelect={game.handlePitchSelect} speedMultiplier={DIFFICULTY_CONFIGS[store.settings.difficulty].pitchSpeedMultiplier} reserveRForReset={isPractice} />
          </div>
        )}
        {showPitchControls && pitchStep === 'aim' && (
          <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm px-5 py-2 rounded-lg">
              <span className="text-green-300/90 text-sm font-medium">
                Move mouse to aim &middot; press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-green-300 text-[10px]">Space</kbd> or click to confirm
                &middot; <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 text-[10px] ml-1">Esc</kbd> / <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 text-[10px]">Right Click</kbd> back
              </span>
            </div>
          </div>
        )}
        {showPitchControls && pitchStep === 'accuracy' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <SpeedBar active={true} onLock={game.handleAccuracyLock} label="Accuracy" hideValue={true} cycleSpeed={DIFFICULTY_CONFIGS[store.settings.difficulty].pitchBarSpeed * 1.15} />
          </div>
        )}
        {showPitchControls && pitchStep === 'speed' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <SpeedBar active={true} onLock={game.handleSpeedLock} label="Power" hideValue={true} cycleSpeed={DIFFICULTY_CONFIGS[store.settings.difficulty].pitchBarSpeed} />
          </div>
        )}

        <GameHUD
          phase={store.phase}
          isPlayerBatting={store.isPlayerBatting}
          isPractice={isPractice}
          hasSwung={game.hasSwungRef.current}
          ballReleased={game.ballReleasedRef.current}
          bunting={game.buntingRef.current}
          pitchInfoDisplay={game.pitchInfoDisplay}
          announcement={game.announcementRef.current}
        />

        <div ref={game.chargeBarRef} className="absolute bottom-16 inset-x-0 z-20 flex justify-center pointer-events-none" style={{ display: 'none' }}>
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-3">
            <span className="text-yellow-400 text-xs font-bold tracking-wider">POWER</span>
            <div className="w-32 h-2.5 bg-gray-700 rounded-full overflow-hidden">
              <div ref={game.chargeInnerRef} className="h-full rounded-full" style={{ width: '0%', background: 'linear-gradient(90deg, #eab308, #ef4444)' }} />
            </div>
          </div>
        </div>

        {store.gameStarted && (
          <button
            onClick={togglePause}
            className={`absolute top-2 ${isPractice ? 'right-12' : 'right-2'} z-30 w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg border border-gray-600/40 transition-colors group`}
            title="Pause (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-300 group-hover:text-white transition-colors">
              <rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          </button>
        )}

        {paused && <PauseMenu onResume={resumeGame} onQuit={quitGame} />}

        {showBattingTutorial && <BattingTutorial onDismiss={dismissTutorial} />}
      </div>

      {!isPractice && store.phase === GamePhase.GameOver && (
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-2xl mb-1">GAME OVER</div>
            <div className="text-white text-lg">
              {store.score.away > store.score.home ? 'You Win!' : store.score.home > store.score.away ? 'CPU Wins!' : "It's a Tie!"}{' '}{store.score.away} - {store.score.home}
            </div>
          </div>
          <button onClick={() => { game.handlePlayAgain(); store.startGame(store.settings); }}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl transition-all hover:scale-105">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
