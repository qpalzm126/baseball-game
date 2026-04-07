'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThreeScene } from '@/engine/ThreeScene';
import { FIELDER_DEFAULTS, FIELDER_LABELS, FIELDER_HOTKEYS } from '@/game/constants';
import { FielderPosition } from '@/game/types';

const PRESETS: { label: string; pos: [number, number, number]; lookAt: [number, number, number] }[] = [
  { label: 'Batting', pos: [0, 1.65, 2.5], lookAt: [0, 0.7, -5] },
  { label: 'Pitcher', pos: [0, 1.2, -5.5], lookAt: [0, 0.8, 0] },
  { label: 'Overhead', pos: [0, 36, 8], lookAt: [0, 0, -5] },
  { label: 'Side', pos: [3, 1.0, 0], lookAt: [0, 0.6, -3] },
  { label: '1B Line', pos: [4, 1.5, -4], lookAt: [0, 0, -6] },
  { label: '3B Line', pos: [-4, 1.5, -4], lookAt: [0, 0, -6] },
  { label: 'Outfield', pos: [0, 3, -18], lookAt: [0, 0.5, 0] },
  { label: 'Close-up', pos: [0.5, 0.8, 0.8], lookAt: [0, 0.6, 0] },
];

type LoopMode = 'none' | 'pitch' | 'swing' | 'both';

type AnimPhase =
  | 'idle'
  | 'pause'        // brief gap between loops
  | 'windup'
  | 'flight'
  | 'swing-only'
  | 'swing-with-ball'
  | 'cooldown';    // short hold after animation finishes before restart

const PITCH_ANIM_SPEED = 1.3;
const BALL_FLIGHT_SPEED = 2.2;
const BALL_TARGET = new THREE.Vector3(0, 0.48, 0);
const LOOP_PAUSE = 0.8;
const COOLDOWN = 0.5;

export default function ViewerPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ThreeScene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);

  const loopModeRef = useRef<LoopMode>('none');
  const phaseRef = useRef<AnimPhase>('idle');
  const phaseTimerRef = useRef(0);
  const ballProgressRef = useRef(0);
  const releasePosRef = useRef<THREE.Vector3 | null>(null);
  const swingStartedRef = useRef(false);
  const batHeightRef = useRef(0.5);
  const swingSpeedRef = useRef(1.0);

  const [camInfo, setCamInfo] = useState('');
  const [showBatter, setShowBatter] = useState(true);
  const [showFielders, setShowFielders] = useState(true);
  const [activeLoop, setActiveLoop] = useState<LoopMode>('none');
  const [batHeight, setBatHeight] = useState(0.5);
  const [swingSpeed, setSwingSpeed] = useState(1.0);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new ThreeScene(containerRef.current);
    sceneRef.current = scene;

    scene.positionBatter();
    scene.setBatterVisible(true);

    scene.setFielderLabelsVisible(true);
    const positions = Object.values(FielderPosition);
    positions.forEach((pos, idx) => {
      const id = idx + 1;
      const def = FIELDER_DEFAULTS[pos];
      scene.ensureFielder(id, FIELDER_LABELS[pos], FIELDER_HOTKEYS[pos]);
      scene.updateFielder(id, def.x, def.y, false, false);
    });
    scene.setFielderLabelsVisible(true);

    const cam = scene.getCamera();
    const dom = scene.getRendererDom();
    const controls = new OrbitControls(cam, dom);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.3;
    controls.maxDistance = 80;
    controls.target.set(0, 0.5, -3);
    controls.update();
    controlsRef.current = controls;

    lastTimeRef.current = performance.now() / 1000;

    function loop() {
      const now = performance.now() / 1000;
      const dt = Math.min(now - lastTimeRef.current, 0.05);
      lastTimeRef.current = now;

      updateDemoLoop(scene, dt);

      controls.update();
      scene.render();
      const p = cam.position;
      const t = controls.target;
      setCamInfo(
        `pos (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})  target (${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)})`,
      );
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      controls.dispose();
      scene.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetAnimState(scene: ThreeScene, full = false) {
    scene.hideBall();
    scene.resetPitcherAnimation();
    if (full) {
      scene.resetBatter(true);
    } else {
      scene.resetSwing();
    }
    scene.setBatHeight(batHeightRef.current);
    phaseRef.current = 'idle';
    phaseTimerRef.current = 0;
    ballProgressRef.current = 0;
    releasePosRef.current = null;
    swingStartedRef.current = false;
  }

  function startNextCycle(scene: ThreeScene) {
    const mode = loopModeRef.current;
    if (mode === 'none') {
      phaseRef.current = 'idle';
      return;
    }

    resetAnimState(scene);

    if (mode === 'pitch' || mode === 'both') {
      scene.resetPitcherAnimation();
      phaseRef.current = 'windup';
    } else if (mode === 'swing') {
      scene.setBatHeight(batHeightRef.current);
      scene.startSwing(0.8, swingSpeedRef.current);
      phaseRef.current = 'swing-only';
    }
    phaseTimerRef.current = 0;
  }

  function updateDemoLoop(scene: ThreeScene, dt: number) {
    const mode = loopModeRef.current;
    const phase = phaseRef.current;

    if (mode === 'none' && phase === 'idle') return;
    if (mode === 'none' && phase !== 'idle') {
      resetAnimState(scene);
      return;
    }

    phaseTimerRef.current += dt;

    if (phase === 'pause') {
      if (phaseTimerRef.current >= LOOP_PAUSE) {
        startNextCycle(scene);
      }
      return;
    }

    if (phase === 'cooldown') {
      if (phaseTimerRef.current >= COOLDOWN) {
        scene.hideBall();
        scene.resetPitcherAnimation();
        scene.resetSwing();
        scene.setBatHeight(batHeightRef.current);
        phaseRef.current = 'pause';
        phaseTimerRef.current = 0;
      }
      return;
    }

    // Windup phase (pitch or both)
    if (phase === 'windup') {
      const released = scene.updatePitcherAnimation(dt, PITCH_ANIM_SPEED);
      if (released && !releasePosRef.current) {
        releasePosRef.current = scene.getPitcherReleasePos().clone();
        ballProgressRef.current = 0;
        phaseRef.current = 'flight';
      }
      return;
    }

    // Ball flight phase
    if (phase === 'flight') {
      const rp = releasePosRef.current;
      if (!rp) return;

      scene.updatePitcherAnimation(dt, PITCH_ANIM_SPEED);
      ballProgressRef.current += dt * BALL_FLIGHT_SPEED;
      const t = Math.min(ballProgressRef.current, 1);
      const pos = new THREE.Vector3().lerpVectors(rp, BALL_TARGET, t);
      pos.y += Math.sin(t * Math.PI) * 0.15;
      scene.updateBall3D(pos, true);

      if (mode === 'both' && t > 0.55 && !swingStartedRef.current) {
        swingStartedRef.current = true;
        scene.startSwing(0.8, swingSpeedRef.current);
        phaseRef.current = 'swing-with-ball';
        return;
      }

      if (t >= 1) {
        phaseRef.current = 'cooldown';
        phaseTimerRef.current = 0;
      }
      return;
    }

    // Swing with ball (both mode)
    if (phase === 'swing-with-ball') {
      const rp = releasePosRef.current;
      if (rp) {
        ballProgressRef.current += dt * BALL_FLIGHT_SPEED;
        const t = Math.min(ballProgressRef.current, 1);
        const pos = new THREE.Vector3().lerpVectors(rp, BALL_TARGET, t);
        pos.y += Math.sin(t * Math.PI) * 0.15;
        scene.updateBall3D(pos, true);
      }
      scene.updatePitcherAnimation(dt, PITCH_ANIM_SPEED);
      const result = scene.updateSwing(dt);
      if (!result.active && phaseTimerRef.current > 0.3) {
        phaseRef.current = 'cooldown';
        phaseTimerRef.current = 0;
      }
      return;
    }

    // Swing only
    if (phase === 'swing-only') {
      const result = scene.updateSwing(dt);
      if (!result.active && phaseTimerRef.current > 0.1) {
        phaseRef.current = 'cooldown';
        phaseTimerRef.current = 0;
      }
      return;
    }
  }

  const toggleLoop = useCallback((mode: LoopMode) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (loopModeRef.current === mode) {
      loopModeRef.current = 'none';
      setActiveLoop('none');
      resetAnimState(scene, true);
    } else {
      resetAnimState(scene);
      loopModeRef.current = mode;
      setActiveLoop(mode);
      startNextCycle(scene);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPreset = useCallback((idx: number) => {
    const p = PRESETS[idx];
    const cam = sceneRef.current?.getCamera();
    const ctl = controlsRef.current;
    if (!cam || !ctl) return;
    cam.position.set(...p.pos);
    ctl.target.set(...p.lookAt);
    ctl.update();
  }, []);

  const toggleBatter = useCallback(() => {
    setShowBatter((v) => {
      sceneRef.current?.setBatterVisible(!v);
      return !v;
    });
  }, []);

  const toggleFielders = useCallback(() => {
    setShowFielders((v) => {
      sceneRef.current?.setFielderLabelsVisible(!v);
      return !v;
    });
  }, []);

  const handleBatHeightChange = useCallback((v: number) => {
    setBatHeight(v);
    batHeightRef.current = v;
    sceneRef.current?.setBatHeight(v);
  }, []);

  const handleSwingSpeedChange = useCallback((v: number) => {
    setSwingSpeed(v);
    swingSpeedRef.current = v;
  }, []);

  function loopBtnClass(mode: LoopMode, base: string, activeColor: string) {
    const isActive = activeLoop === mode;
    return `flex-1 px-2 py-2 rounded-lg text-[11px] font-bold transition-all ${
      isActive
        ? `${activeColor} ring-2 ring-white/40`
        : `${base}`
    }`;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Top toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/90 border-b border-gray-700/50 flex-wrap">
        <button
          onClick={() => router.push('/')}
          className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg
                     hover:bg-gray-800 transition-all border border-transparent hover:border-gray-700"
        >
          &larr; Menu
        </button>

        <div className="w-px h-5 bg-gray-700" />

        <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Camera</span>
        <div className="flex gap-1 flex-wrap">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => goToPreset(i)}
              className="px-2 py-1 rounded text-[10px] font-bold bg-gray-800 text-gray-400
                         hover:bg-gray-700 hover:text-white transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-700" />

        <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Toggle</span>
        <button
          onClick={toggleBatter}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
            showBatter ? 'bg-cyan-500 text-gray-900' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Batter
        </button>
        <button
          onClick={toggleFielders}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
            showFielders ? 'bg-cyan-500 text-gray-900' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Fielders
        </button>
      </div>

      {/* 3D canvas */}
      <div ref={containerRef} className="flex-1 relative">
        {/* Demo controls panel */}
        <div className="absolute top-3 right-3 z-10 bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-xl p-3 w-56 space-y-3">
          <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase text-center">
            Demo Controls
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => toggleLoop('pitch')}
              className={loopBtnClass('pitch', 'bg-blue-600 hover:bg-blue-500 text-white', 'bg-blue-400 text-white')}
            >
              {activeLoop === 'pitch' ? '■ Pitch' : '▶ Pitch'}
            </button>
            <button
              onClick={() => toggleLoop('swing')}
              className={loopBtnClass('swing', 'bg-red-600 hover:bg-red-500 text-white', 'bg-red-400 text-white')}
            >
              {activeLoop === 'swing' ? '■ Swing' : '▶ Swing'}
            </button>
            <button
              onClick={() => toggleLoop('both')}
              className={loopBtnClass('both', 'bg-yellow-600 hover:bg-yellow-500 text-gray-900', 'bg-yellow-400 text-gray-900')}
            >
              {activeLoop === 'both' ? '■ Both' : '▶ Both'}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-gray-500 font-semibold">Bat Height</label>
              <span className="text-[10px] text-gray-400 font-mono">{batHeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={batHeight}
              onChange={(e) => handleBatHeightChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-gray-500 font-semibold">Swing Speed</label>
              <span className="text-[10px] text-gray-400 font-mono">{swingSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.0"
              step="0.1"
              value={swingSpeed}
              onChange={(e) => handleSwingSpeedChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {activeLoop !== 'none' && (
            <div className="text-center text-[10px] font-bold text-green-400">
              Looping: {activeLoop === 'pitch' ? 'Pitch' : activeLoop === 'swing' ? 'Swing' : 'Pitch + Swing'}
            </div>
          )}
        </div>

        {/* Camera info */}
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[10px] font-mono text-gray-400">
            {camInfo}
          </div>
        </div>
        <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[10px] text-gray-500">
            LMB Rotate &middot; RMB Pan &middot; Scroll Zoom
          </div>
        </div>
      </div>
    </div>
  );
}
