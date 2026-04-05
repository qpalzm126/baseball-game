'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { GameLoop } from '@/engine/GameLoop';
import { InputManager } from '@/engine/InputManager';
import { ThreeScene } from '@/engine/ThreeScene';
import {
  createPitchTrajectory,
  updateBallPhysics,
  calculatePhysicsHit,
  fieldBallPhysics,
  throwBall,
  checkPitchCrossedPlate,
  PhysicsHitResult,
} from '@/engine/PhysicsEngine';
import {
  checkFielderBallCollision,
  getFielderAtPosition,
} from '@/engine/CollisionDetector';
import {
  updateFielderMovement,
  startDive,
  moveFielderWithArrows,
} from '@/game/Fielder';
import {
  createRunner,
  advanceRunners,
  updateRunnerMovement,
  checkRunnerScored,
  sendRunnersForward,
  holdRunners,
} from '@/game/BaseRunner';
import { checkFlyOut, findFieldingOut } from '@/game/ScoringEngine';
import { AIController } from '@/game/AIController';
import { getPitchByKey } from '@/game/PitchTypes';
import {
  GamePhase,
  PitchType,
  BallState,
  HitType,
  BaseType,
  Vec2,
} from '@/game/types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PITCH_CONFIGS,
  THROW_SPEED,
  CATCH_RADIUS,
  HOME_PLATE,
  FIRST_BASE,
  SECOND_BASE,
  THIRD_BASE,
  DIFFICULTY_CONFIGS,
  FIELD_SIZE_CONFIGS,
} from '@/game/constants';
import { project3Dto2D, distance } from '@/utils/math';

import PitchSelector from './PitchSelector';
import SpeedBar from './SpeedBar';
import Scoreboard from './Scoreboard';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ThreeScene | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const inputRef = useRef<InputManager>(new InputManager());
  const aiRef = useRef<AIController | null>(null);

  const storeRef = useRef(useGameStore.getState());
  const lastPlayerBattingRef = useRef<boolean | null>(null);
  const localBallRef = useRef<BallState | null>(null);
  const batPosRef = useRef<Vec2>({ x: 450, y: 350 });
  const pitchTimeRef = useRef(0);
  const hitTypeRef = useRef<HitType | null>(null);
  const foulCheckedRef = useRef(false);
  const phaseTimerRef = useRef(0);
  const announcementRef = useRef<string | null>(null);
  const announcementTimerRef = useRef(0);
  const pitchInZoneRef = useRef(false);
  const aiPitchFiredRef = useRef(false);

  const pitchProgressRef = useRef(0);
  const pitchStartRef = useRef({ x: 0, y: 1.05, z: -6.4 });
  const pitchEndRef = useRef({ x: 0, y: 0.485, z: 0 });
  const pitchBreakRef = useRef({ x: 0, y: 0 });
  const ballReleasedRef = useRef(false);
  const windupStartedRef = useRef(false);
  const ball3DRef = useRef(new THREE.Vector3());
  const prevBall3DRef = useRef(new THREE.Vector3());
  const pitchBallVelRef = useRef(new THREE.Vector3());

  const hitCameraHoldRef = useRef(0);
  const hasSwungRef = useRef(false);
  const pitchFlightSpeedRef = useRef(2.2);
  const pitchInfoRef = useRef<{ type: PitchType; speed: number } | null>(null);
  const [pitchInfoDisplay, setPitchInfoDisplay] = useState<string | null>(null);
  const pitchInfoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chargingRef = useRef(false);
  const chargeStartRef = useRef(0);
  const chargePowerRef = useRef(0);
  const chargeBarRef = useRef<HTMLDivElement>(null);
  const chargeInnerRef = useRef<HTMLDivElement>(null);

  const aiBatPosRef = useRef({ x: 0.5, y: 0.5 });
  const aiBatNoiseRef = useRef({ x: 0, y: 0 });

  const practiceTimerRef = useRef(0);
  const maxDistRef = useRef(0);
  const [hitDebug, setHitDebug] = useState<{
    exitSpeed: number; launchAngle: number; sprayAngle: number;
    contactQuality: number; chargePower: number; hitType: HitType;
    distance: number;
  } | null>(null);
  const [practiceStats, setPracticeStats] = useState({ pitches: 0, swings: 0, hits: 0, fouls: 0 });
  const [pitchPracticeStats, setPitchPracticeStats] = useState({ pitches: 0, strikes: 0, balls: 0, hitsAllowed: 0, fouls: 0 });
  const [lastPitchResult, setLastPitchResult] = useState<{
    type: string; speed: number; accuracy: number; result: string;
  } | null>(null);

  const store = useGameStore();

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
    sceneRef.current?.setFieldSize(cfg.wallRadiusGU, cfg.wallHeightGU);
  }, [store.settings.fieldSize]);

  function getFieldCfg() {
    return FIELD_SIZE_CONFIGS[storeRef.current.settings.fieldSize];
  }

  function showAnnouncement(text: string, duration: number = 1.0) {
    announcementRef.current = text;
    announcementTimerRef.current = duration;
  }

  /* =========== UPDATE =========== */

  const update = useCallback((dt: number, time: number) => {
    if (!sceneRef.current || !storeRef.current.gameStarted) return;
    const input = inputRef.current;
    input.update();
    const inp = input.getState();
    const s = storeRef.current;
    const scene = sceneRef.current;

    if (announcementTimerRef.current > 0) {
      announcementTimerRef.current -= dt;
      if (announcementTimerRef.current <= 0) announcementRef.current = null;
    }

    if (hitCameraHoldRef.current > 0) hitCameraHoldRef.current -= dt;

    if (scene) {
      scene.updateSwing(dt);
      scene.updateCamera(dt);
      scene.updatePitchSpot(dt);

      if (s.isPlayerBatting) {
        handleBatterControls(inp, dt);
      } else {
        handleAIBatTracking(s, dt);
      }

      const canSwingPhase = s.phase === GamePhase.Pitching
        || s.phase === GamePhase.BatSwing
        || s.phase === GamePhase.PrePitch;

      if (s.isPlayerBatting && canSwingPhase && !scene.isSwinging()) {
        const holdSwing = inp.leftClickDown || inp.keysDown.has(' ');

        if (holdSwing && !chargingRef.current) {
          chargingRef.current = true;
          chargeStartRef.current = time;
        }

        if (chargingRef.current) {
          const elapsed = (time - chargeStartRef.current) / 1000;
          const cycleDuration = DIFFICULTY_CONFIGS[storeRef.current.settings.difficulty].chargeCycleDuration;
          const raw = (elapsed % cycleDuration) / cycleDuration;
          chargePowerRef.current = raw;
          scene.setChargeLevel(chargePowerRef.current);
        }

        if (!holdSwing && chargingRef.current) {
          const swingMul = DIFFICULTY_CONFIGS[storeRef.current.settings.difficulty].swingSpeedMultiplier;
          scene.startSwing(chargePowerRef.current, swingMul);
          hasSwungRef.current = true;
          chargingRef.current = false;
          scene.setChargeLevel(0);
        }
      }

      if (chargingRef.current && (scene.isSwinging() || !canSwingPhase)) {
        chargingRef.current = false;
        scene.setChargeLevel(0);
      }
    }

    if (s.runners.length > 0) {
      updateRunnersOnField(s, dt);
    }

    if (storeRef.current.practiceMode && s.isPlayerBatting && inp.keysPressed.has('r')) {
      resetPitchState();
      localBallRef.current = null;
      sceneRef.current?.hideBall();
      goToPrePitch();
      return;
    }

    switch (s.phase) {
      case GamePhase.PrePitch: handlePrePitch(s, inp, dt); break;
      case GamePhase.Pitching: handlePitching(s, inp, dt); break;
      case GamePhase.BatSwing: handleBatSwing(s, inp, dt); break;
      case GamePhase.BallInPlay: handleBallInPlay(s, inp, dt, time); break;
      case GamePhase.Fielding: handleFielding(s, inp, dt, time); break;
      case GamePhase.OutRecorded: handleOutRecorded(dt); break;
      case GamePhase.RunnersAdvance: handleRunnersAdvance(s, dt); break;
      case GamePhase.HalfInningEnd: handleHalfInningEnd(s, dt); break;
      case GamePhase.StrikeOrBall: handleStrikeOrBall(dt); break;
    }
  }, []);

  function resetPitchState() {
    pitchTimeRef.current = 0;
    hitTypeRef.current = null;
    foulCheckedRef.current = false;
    pitchInZoneRef.current = false;
    pitchProgressRef.current = 0;
    ballReleasedRef.current = false;
    windupStartedRef.current = false;
    hitCameraHoldRef.current = 0;
    hasSwungRef.current = false;
    sceneRef.current?.resetPitcherAnimation();
    sceneRef.current?.clearTrail();
  }

  /* --- batter controls --- */

  function handleBatterControls(inp: ReturnType<InputManager['getState']>, dt: number) {
    const scene = sceneRef.current;
    if (!scene) return;
    const normX = inp.mousePosition.x / CANVAS_WIDTH;
    const normY = inp.mousePosition.y / CANVAS_HEIGHT;
    scene.setSweetSpotFromCursor(normX, normY);
    batPosRef.current = { ...inp.mousePosition };

    const moveSpeed = 1.2 * dt;
    if (inp.keysDown.has('a') || inp.keysDown.has('arrowleft')) scene.moveBatterX(-moveSpeed);
    if (inp.keysDown.has('d') || inp.keysDown.has('arrowright')) scene.moveBatterX(moveSpeed);
    if (inp.keysDown.has('w') || inp.keysDown.has('arrowup')) scene.moveBatterZ(-moveSpeed);
    if (inp.keysDown.has('s') || inp.keysDown.has('arrowdown')) scene.moveBatterZ(moveSpeed);

    if (inp.keysPressed.has('tab')) {
      const gs = useGameStore.getState();
      const newSide = gs.settings.batterSide === 'right' ? 'left' : 'right';
      gs.updateSettings({ batterSide: newSide });
      scene.setBatterSide(newSide);
    }
  }

  /* --- AI bat tracking --- */

  function handleAIBatTracking(s: ReturnType<typeof useGameStore.getState>, dt: number) {
    const scene = sceneRef.current;
    if (!scene || !ballReleasedRef.current || pitchProgressRef.current <= 0) return;
    if (scene.isSwinging()) return;

    const p3d = scene.getPitchBallPos(
      pitchProgressRef.current,
      pitchStartRef.current.x, pitchStartRef.current.y, pitchStartRef.current.z,
      pitchEndRef.current.x, pitchEndRef.current.y, pitchEndRef.current.z,
      pitchBreakRef.current.x, pitchBreakRef.current.y,
      pitchFlightSpeedRef.current,
    );
    const screenPos = scene.projectToGameCoords(p3d);

    const accuracy = aiRef.current?.getDifficultyConfig().aiSwingAccuracy ?? 0.5;
    const targetNX = screenPos.x / CANVAS_WIDTH + aiBatNoiseRef.current.x;
    const targetNY = screenPos.y / CANVAS_HEIGHT + aiBatNoiseRef.current.y;

    const trackSpeed = 4 + accuracy * 12;
    const lerpFactor = 1 - Math.exp(-trackSpeed * dt);
    aiBatPosRef.current.x += (targetNX - aiBatPosRef.current.x) * lerpFactor;
    aiBatPosRef.current.y += (targetNY - aiBatPosRef.current.y) * lerpFactor;

    scene.setSweetSpotFromCursor(aiBatPosRef.current.x, aiBatPosRef.current.y);
  }

  /* --- pre-pitch --- */

  function handlePrePitch(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>, dt: number) {
    phaseTimerRef.current += dt;
    const isPractice = storeRef.current.practiceMode;
    if (s.isPlayerBatting) {
      const autoPitchDelay = isPractice ? 1.0 : 1.8;
      if (phaseTimerRef.current > autoPitchDelay && aiRef.current && !aiPitchFiredRef.current) {
        aiPitchFiredRef.current = true;
        resetPitchState();
        if (isPractice) {
          setPracticeStats((p) => ({ ...p, pitches: p.pitches + 1 }));
          maxDistRef.current = 0;
        }
        const snap = getSnapshot(s);
        const decision = aiRef.current.decidePitch(snap);
        if (isPractice && storeRef.current.practicePitchType) {
          decision.type = storeRef.current.practicePitchType;
        }
        if (isPractice && storeRef.current.practiceTargetCell !== null) {
          decision.targetCell = storeRef.current.practiceTargetCell;
        } else if (isPractice && storeRef.current.practiceStrikesOnly && decision.targetCell < 0) {
          const edgeCells = [0, 2, 3, 5, 6, 8];
          const centerCells = [1, 4, 7];
          const pool = Math.random() < 0.5 ? edgeCells : centerCells;
          decision.targetCell = pool[Math.floor(Math.random() * pool.length)];
        }
        const gs = useGameStore.getState();
        gs.selectPitch(decision.type);
        gs.setSpeedBarValue(decision.speed);

        let aimX: number, aimY: number;
        const SZ_HW = 0.25, SZ_BOT = 0.22, SZ_TOP = 0.75, SZ_H = SZ_TOP - SZ_BOT;
        if (decision.targetCell < 0) {
          const dir = Math.random();
          if (dir < 0.25) { aimX = (Math.random() - 0.5) * 0.2; aimY = SZ_TOP + 0.12 + Math.random() * 0.20; }
          else if (dir < 0.5) { aimX = (Math.random() - 0.5) * 0.2; aimY = SZ_BOT - 0.12 - Math.random() * 0.15; }
          else if (dir < 0.75) { aimX = -(SZ_HW + 0.08) - Math.random() * 0.15; aimY = SZ_BOT + Math.random() * SZ_H; }
          else { aimX = (SZ_HW + 0.08) + Math.random() * 0.15; aimY = SZ_BOT + Math.random() * SZ_H; }
        } else {
          const col = decision.targetCell % 3;
          const row = Math.floor(decision.targetCell / 3);
          aimX = (col - 1) * (SZ_HW * 2 / 3);
          aimY = SZ_BOT + (1 - row / 2) * SZ_H;
        }
        const aiAccuracy = DIFFICULTY_CONFIGS[gs.settings.difficulty].aiPitchAccuracy;
        preparePitchPrecise(decision.type, aimX, aimY, aiAccuracy, decision.speed, true);
        pitchInfoRef.current = { type: decision.type, speed: decision.speed };
        phaseTimerRef.current = 0;
        windupStartedRef.current = true;
        gs.setPhase(GamePhase.Pitching);
      }
    } else {
      const scene = sceneRef.current;
      for (const key of inp.keysPressed) {
        const pitchType = getPitchByKey(key);
        if (pitchType && !s.selectedPitch) {
          resetPitchState();
          useGameStore.getState().selectPitch(pitchType);
        }
      }
      if (s.selectedPitch && !s.pitchAimPos && scene) {
        const normX = inp.mousePosition.x / CANVAS_WIDTH;
        const normY = inp.mousePosition.y / CANVAS_HEIGHT;
        scene.setPitchAimFromCursor(normX, normY);
        scene.updatePitchAimReticle(true);
        if (inp.leftClick || inp.keysPressed.has(' ')) {
          const aim = scene.getPitchAimPos();
          useGameStore.getState().setPitchAimPos(aim);
          scene.updatePitchAimReticle(false);
        }
      }
    }
  }

  function preparePitchPrecise(pitchType: PitchType, aimX: number, aimY: number, accuracy: number, speed: number, isAI: boolean) {
    const config = PITCH_CONFIGS[pitchType];
    const traj = createPitchTrajectory(config, speed, 4);

    const maxDeviation = 0.28;
    const deviation = maxDeviation * (1 - accuracy);
    const actualX = aimX + (Math.random() - 0.5) * 2 * deviation;
    const actualY = aimY + (Math.random() - 0.5) * 2 * deviation;
    pitchEndRef.current = { x: actualX, y: actualY, z: 0 };

    const diffCfg = DIFFICULTY_CONFIGS[storeRef.current.settings.difficulty];
    const diffBase = isAI ? diffCfg.pitchFlightBase : 2.2;
    const pitchSpeedFactor = config.baseSpeed / 95;
    pitchFlightSpeedRef.current = diffBase * (0.7 + 0.3 * speed) * pitchSpeedFactor;

    const brkMul = DIFFICULTY_CONFIGS[storeRef.current.settings.difficulty].breakMultiplier;
    pitchBreakRef.current = { x: config.breakX * 0.02 * brkMul, y: config.breakY * 0.01 * brkMul };
    pitchStartRef.current = { x: 0, y: 1.05, z: -6.4 };
    pitchProgressRef.current = 0;
    localBallRef.current = {
      position3D: traj.startPos, velocity3D: traj.velocity,
      screenPosition: project3Dto2D(traj.startPos),
      isInPlay: false, isLanded: false, landingPosition: null, heldByFielder: null,
    };
  }

  /* --- pitching (windup → release → ball flight) --- */

  function handlePitching(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>, dt: number) {
    const scene = sceneRef.current;

    if (!ballReleasedRef.current) {
      if (scene) {
        const released = scene.updatePitcherAnimation(dt, 1.4);
        if (released && !ballReleasedRef.current) {
          ballReleasedRef.current = true;
          prevBall3DRef.current.set(pitchStartRef.current.x, pitchStartRef.current.y, pitchStartRef.current.z);
        }
      }
      return;
    }

    pitchTimeRef.current += dt;
    pitchProgressRef.current += dt * pitchFlightSpeedRef.current;

    if (scene && localBallRef.current) {
      const prev = { ...localBallRef.current };
      localBallRef.current = updateBallPhysics(localBallRef.current, dt);

      const p3d = scene.getPitchBallPos(
        pitchProgressRef.current,
        pitchStartRef.current.x, pitchStartRef.current.y, pitchStartRef.current.z,
        pitchEndRef.current.x, pitchEndRef.current.y, pitchEndRef.current.z,
        pitchBreakRef.current.x, pitchBreakRef.current.y,
        pitchFlightSpeedRef.current,
      );
      const prevP = prevBall3DRef.current.clone();
      ball3DRef.current.copy(p3d);
      pitchBallVelRef.current.copy(p3d.clone().sub(prevP).divideScalar(Math.max(dt, 0.001)));
      prevBall3DRef.current.copy(p3d);

      const plateCheck = scene.checkBallCrossedPlate3D(prevP, p3d);
      if (plateCheck?.crossed) {
        pitchInZoneRef.current = plateCheck.inZone;
        scene.showPitchSpot(plateCheck.cx, plateCheck.cy, plateCheck.inZone);
        showPitchInfo();
      }

      if (!hasSwungRef.current && scene.checkHitByPitch(p3d)) {
        handleHitByPitch();
        return;
      }

      if (scene.isSwinging()) {
        const collisionScale = DIFFICULTY_CONFIGS[s.settings.difficulty].batCollisionScale;
        const collision = scene.checkBatBallCollision3D(p3d, collisionScale);
        if (collision.hit) { processPhysicsHit(s, scene, collision.contactT, collision.contactPoint); return; }
      }

      if (p3d.z > -0.5 && p3d.z < 1.5 && !s.isPlayerBatting) {
        useGameStore.getState().setPhase(GamePhase.BatSwing);
        return;
      }

      const CATCHER_Z = 1.5;
      if (p3d.z > CATCHER_Z) {
        if (chargingRef.current && s.isPlayerBatting) {
          chargingRef.current = false;
          scene.setChargeLevel(0);
        }
        if (hasSwungRef.current) {
          callStrikeOrBall(true);
        } else {
          callStrikeOrBall(pitchInZoneRef.current);
        }
        localBallRef.current = null;
        scene.hideBall();
      }
    }
  }

  /* --- bat swing phase (AI batting / late-plate zone) --- */

  function handleBatSwing(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>, dt: number) {
    const scene = sceneRef.current;
    if (!localBallRef.current || !scene) { goToPrePitch(); return; }

    pitchProgressRef.current += dt * pitchFlightSpeedRef.current;

    const prevP = prevBall3DRef.current.clone();
    const p3d = scene.getPitchBallPos(
      pitchProgressRef.current,
      pitchStartRef.current.x, pitchStartRef.current.y, pitchStartRef.current.z,
      pitchEndRef.current.x, pitchEndRef.current.y, pitchEndRef.current.z,
      pitchBreakRef.current.x, pitchBreakRef.current.y,
      pitchFlightSpeedRef.current,
    );
    ball3DRef.current.copy(p3d);
    pitchBallVelRef.current.copy(p3d.clone().sub(prevP).divideScalar(Math.max(dt, 0.001)));
    prevBall3DRef.current.copy(p3d);

    const plateCheck = scene.checkBallCrossedPlate3D(prevP, p3d);
    if (plateCheck?.crossed) {
      pitchInZoneRef.current = plateCheck.inZone;
      scene.showPitchSpot(plateCheck.cx, plateCheck.cy, plateCheck.inZone);
      showPitchInfo();
    }

    const prev = { ...localBallRef.current };
    localBallRef.current = updateBallPhysics(localBallRef.current, dt);
    const legacyPlate = checkPitchCrossedPlate(prev, localBallRef.current);
    if (legacyPlate) pitchInZoneRef.current = legacyPlate.wasInZone;

    if (!hasSwungRef.current && scene.checkHitByPitch(p3d)) {
      handleHitByPitch();
      return;
    }

    const collisionScale = DIFFICULTY_CONFIGS[s.settings.difficulty].batCollisionScale;
    if (s.isPlayerBatting) {
      if (scene.isSwinging()) {
        const collision = scene.checkBatBallCollision3D(p3d, collisionScale);
        if (collision.hit) { processPhysicsHit(s, scene, collision.contactT, collision.contactPoint); return; }
      }
    } else {
      if (aiRef.current) {
        const snap = getSnapshot(s);
        const screenPos = scene.projectToGameCoords(p3d);
        const decision = aiRef.current.decideSwing(snap, screenPos);
        if (decision.shouldSwing && !scene.isSwinging()) {
          const acc = aiRef.current.getDifficultyConfig().aiSwingAccuracy;
          const aiPower = 0.5 + acc * 0.5 + (Math.random() - 0.5) * 0.2;
          const swingMul = DIFFICULTY_CONFIGS[storeRef.current.settings.difficulty].swingSpeedMultiplier;
          scene.startSwing(Math.max(0.3, Math.min(1, aiPower)), swingMul);
          hasSwungRef.current = true;
        }
        if (scene.isSwinging()) {
          const collision = scene.checkBatBallCollision3D(p3d, collisionScale);
          if (collision.hit) { processPhysicsHit(s, scene, collision.contactT, collision.contactPoint); return; }
        }
      }
    }

    const CATCHER_Z = 1.5;
    if (p3d.z > CATCHER_Z) {
      if (chargingRef.current && s.isPlayerBatting) {
        chargingRef.current = false;
        scene.setChargeLevel(0);
      }
      if (hasSwungRef.current) {
        callStrikeOrBall(true);
      } else {
        callStrikeOrBall(pitchInZoneRef.current);
      }
      localBallRef.current = null;
      scene.hideBall();
    }
  }

  function processPhysicsHit(
    s: ReturnType<typeof useGameStore.getState>,
    scene: ThreeScene,
    contactT: number,
    contactPoint: THREE.Vector3,
  ) {
    const quality = scene.getSwingContactQuality(contactT);
    const batVel = scene.getBatTipVelocity();
    const ballVel = pitchBallVelRef.current;
    const verticalOffset = ball3DRef.current.y - contactPoint.y;

    const chargePower = s.isPlayerBatting ? chargePowerRef.current : 0.85;

    const batHeightNorm = scene.getBatHeightNorm();
    const aimBias = (0.5 - batHeightNorm) * 0.18;
    const adjustedVertical = verticalOffset + aimBias;

    const result = calculatePhysicsHit({
      batVelX: batVel.x, batVelY: batVel.y, batVelZ: batVel.z,
      ballVelX: ballVel.x, ballVelY: ballVel.y, ballVelZ: ballVel.z,
      contactT, contactQuality: quality, batAngleY: 0,
      verticalOffset: adjustedVertical, chargePower,
    });

    hitTypeRef.current = result.type;
    const isPractice = storeRef.current.practiceMode;

    if (isPractice) {
      setHitDebug({
        exitSpeed: result.exitSpeed,
        launchAngle: result.launchAngleDeg,
        sprayAngle: result.sprayAngleDeg,
        contactQuality: result.contactQuality,
        chargePower,
        hitType: result.type,
        distance: 0,
      });
      const isBattingPractice = s.isPlayerBatting;
      if (isBattingPractice) {
        setPracticeStats((p) => ({
          ...p,
          swings: p.swings + 1,
          hits: result.type !== HitType.Foul ? p.hits + 1 : p.hits,
          fouls: result.type === HitType.Foul ? p.fouls + 1 : p.fouls,
        }));
      } else {
        setPitchPracticeStats((p) => ({
          ...p,
          hitsAllowed: result.type !== HitType.Foul ? p.hitsAllowed + 1 : p.hitsAllowed,
          fouls: result.type === HitType.Foul ? p.fouls + 1 : p.fouls,
        }));
        setLastPitchResult((prev) => ({
          type: prev?.type ?? '',
          speed: prev?.speed ?? 0,
          accuracy: prev?.accuracy ?? 0,
          result: result.type === HitType.Foul ? 'FOUL' : hitLabel(result.type),
        }));
      }
    }

    if (result.type === HitType.Foul) {
      showAnnouncement('FOUL', 0.8);
      if (!isPractice && s.count.strikes < 2) useGameStore.getState().advanceCount('strike');
      localBallRef.current = null;
      scene.hideBall();
      goToPrePitch();
      return;
    }

    showAnnouncement(hitLabel(result.type), 1.2);

    const ballY = ball3DRef.current.y;
    const initialHeight = Math.max(15, ballY * 28);

    localBallRef.current = {
      ...localBallRef.current!,
      position3D: { x: HOME_PLATE.x, y: HOME_PLATE.y, z: initialHeight },
      velocity3D: result.velocity,
      isInPlay: true, isLanded: false, landingPosition: null, heldByFielder: null,
    };

    hitCameraHoldRef.current = 0.6;
    practiceTimerRef.current = 0;

    if (isPractice) {
      useGameStore.getState().setPhase(GamePhase.BallInPlay);
      return;
    }

    const newRunner = createRunner(0);
    const allRunners = [...s.runners, newRunner];
    const advanced = advanceRunners(allRunners, result.type);
    const gs = useGameStore.getState();
    gs.addRunner(newRunner);
    for (const r of advanced) gs.updateRunner(r.id, { targetBase: r.targetBase });
    gs.resetCount();
    gs.setPhase(GamePhase.BallInPlay);
  }

  function handleHitByPitch() {
    localBallRef.current = null;
    sceneRef.current?.hideBall();
    showPitchInfo();
    if (storeRef.current.practiceMode) {
      showAnnouncement('HIT BY PITCH!', 1.2);
      goToPrePitch();
      return;
    }
    showAnnouncement('HIT BY PITCH!', 1.5);
    const gs = useGameStore.getState();
    gs.resetCount();
    gs.setPhase(GamePhase.RunnersAdvance);
  }

  function showPitchInfo() {
    if (pitchInfoRef.current) {
      const cfg = PITCH_CONFIGS[pitchInfoRef.current.type];
      const mph = Math.round(cfg.baseSpeed * pitchInfoRef.current.speed);
      setPitchInfoDisplay(`${cfg.label}  ${mph} mph`);
      pitchInfoRef.current = null;
      if (pitchInfoTimerRef.current) clearTimeout(pitchInfoTimerRef.current);
      pitchInfoTimerRef.current = setTimeout(() => setPitchInfoDisplay(null), 1200);
    }
  }

  function callStrikeOrBall(inZone: boolean) {
    const gs = useGameStore.getState();
    const willStrikeOut = inZone && gs.count.strikes >= 2;
    const willWalk = !inZone && gs.count.balls >= 3;

    if (storeRef.current.practiceMode) {
      const isBattingPractice = gs.isPlayerBatting;
      if (isBattingPractice) {
        showAnnouncement(inZone ? 'STRIKE!' : 'BALL', 0.8);
        if (hasSwungRef.current) {
          setPracticeStats((p) => ({ ...p, swings: p.swings + 1 }));
        }
      } else {
        const label = hasSwungRef.current
          ? (inZone ? 'SWINGING STRIKE!' : 'SWINGING STRIKE!')
          : (inZone ? 'CALLED STRIKE!' : 'BALL');
        showAnnouncement(label, 0.8);
        setPitchPracticeStats((p) => ({
          ...p,
          strikes: inZone || hasSwungRef.current ? p.strikes + 1 : p.strikes,
          balls: !inZone && !hasSwungRef.current ? p.balls + 1 : p.balls,
        }));
        setLastPitchResult((prev) => ({
          type: prev?.type ?? '',
          speed: prev?.speed ?? 0,
          accuracy: prev?.accuracy ?? 0,
          result: label,
        }));
      }
      gs.setPhase(GamePhase.StrikeOrBall);
    } else if (willStrikeOut) {
      showAnnouncement(`STRIKEOUT!  ${outCountText(gs.outs + 1)}`, 1.5);
      gs.advanceCount('strike');
    } else if (willWalk) {
      showAnnouncement('BALL 4 — WALK', 1.0);
      gs.advanceCount('ball');
    } else {
      showAnnouncement(inZone ? 'STRIKE!' : 'BALL', 0.8);
      gs.advanceCount(inZone ? 'strike' : 'ball');
    }
  }

  function goToPrePitch() {
    phaseTimerRef.current = 0;
    aiPitchFiredRef.current = false;
    localBallRef.current = null;
    pitchProgressRef.current = 0;
    ballReleasedRef.current = false;
    windupStartedRef.current = false;
    hitCameraHoldRef.current = 0;
    hasSwungRef.current = false;
    chargingRef.current = false;
    chargePowerRef.current = 0;
    sceneRef.current?.setChargeLevel(0);
    sceneRef.current?.resetPitcherAnimation();
    sceneRef.current?.clearTrail();
    useGameStore.getState().resetForNewPitch();

    const accuracy = aiRef.current?.getDifficultyConfig().aiSwingAccuracy ?? 0.5;
    const noiseScale = (1 - accuracy) * 0.12;
    aiBatNoiseRef.current = {
      x: (Math.random() - 0.5) * noiseScale,
      y: (Math.random() - 0.5) * noiseScale,
    };
    aiBatPosRef.current = { x: 0.5, y: 0.5 };
  }

  /* --- baserunning controls (player batting) / AI baserunning --- */

  function handleBaserunning(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>) {
    const gs = useGameStore.getState();
    if (s.isPlayerBatting) {
      const goKey = inp.keysPressed.has('w') || inp.keysPressed.has('arrowup');
      const holdKey = inp.keysPressed.has('s') || inp.keysPressed.has('arrowdown');
      if (goKey) {
        const adv = sendRunnersForward(gs.runners);
        for (const r of adv) gs.updateRunner(r.id, { targetBase: r.targetBase });
      }
      if (holdKey) {
        const held = holdRunners(gs.runners);
        for (const r of held) gs.updateRunner(r.id, { targetBase: r.targetBase });
      }
    } else if (aiRef.current) {
      const snap = getSnapshot(gs);
      if (aiRef.current.decideBaserunning(snap)) {
        const adv = sendRunnersForward(gs.runners);
        for (const r of adv) gs.updateRunner(r.id, { targetBase: r.targetBase });
      }
    }
  }

  function outCountText(outs: number): string {
    return outs === 1 ? '1 Out' : `${outs} Outs`;
  }

  /** Check force/tag outs every frame when a fielder holds the ball. */
  function checkFieldingOuts(): boolean {
    if (!localBallRef.current) return false;
    const gs = useGameStore.getState();
    const out = findFieldingOut(
      gs.runners,
      gs.fielders,
      localBallRef.current.heldByFielder,
    );
    if (!out) return false;

    gs.updateRunner(out.runnerId, { isOut: true });
    gs.removeRunner(out.runnerId);
    sceneRef.current?.removeRunner(out.runnerId);
    const newOuts = gs.outs + 1;
    const label = out.kind === 'tag' ? 'TAG OUT!' : 'FORCE OUT!';
    showAnnouncement(`${label}  ${outCountText(newOuts)}`, 1.2);
    gs.recordOutInPlay();
    return true;
  }

  function isFoulTerritory(px: number, py: number): boolean {
    const dx = px - HOME_PLATE.x;
    const dy = HOME_PLATE.y - py;
    if (dy <= 0) return true;
    return 15 * dy < 14 * Math.abs(dx);
  }

  /* --- ball in play / fielding --- */

  function handleBallInPlay(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>, dt: number, time: number) {
    if (!localBallRef.current) return;
    const fc = getFieldCfg();
    localBallRef.current = fieldBallPhysics(localBallRef.current, dt, fc.wallRadiusGU, fc.wallHeightGU);

    if (storeRef.current.practiceMode) {
      practiceTimerRef.current += dt;
      const ball = localBallRef.current;
      const dx = ball.position3D.x - HOME_PLATE.x;
      const dy = ball.position3D.y - HOME_PLATE.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDistRef.current) {
        maxDistRef.current = dist;
        setHitDebug((prev) => prev ? { ...prev, distance: Math.round(dist) } : prev);
      }
      const stopped = ball.isLanded
        && Math.abs(ball.velocity3D.x) < 0.05
        && Math.abs(ball.velocity3D.y) < 0.05;
      if (stopped || practiceTimerRef.current > 6) {
        goToPrePitch();
      }
      return;
    }

    if (localBallRef.current.hitWall) {
      hitTypeRef.current = HitType.HomeRun;
      showAnnouncement('HOME RUN!', 2.5);
      const gs = useGameStore.getState();
      for (const runner of gs.runners) {
        gs.updateRunner(runner.id, { targetBase: BaseType.Home });
      }
      localBallRef.current = { ...localBallRef.current, hitWall: false };
      return;
    }

    if (localBallRef.current.bounceOverWall) {
      hitTypeRef.current = HitType.LineDrive;
      showAnnouncement('GROUND RULE DOUBLE!', 2.0);
      const gs = useGameStore.getState();
      for (const runner of gs.runners) {
        const cur = runner.currentBase;
        let target: BaseType;
        if (cur === BaseType.Third || cur === BaseType.Second) target = BaseType.Home;
        else if (cur === BaseType.First) target = BaseType.Third;
        else target = BaseType.Second;
        gs.updateRunner(runner.id, { targetBase: target });
      }
      localBallRef.current = { ...localBallRef.current, bounceOverWall: false };
      return;
    }

    handleBaserunning(s, inp);
    if (!s.isPlayerBatting) {
      handleAutoDefense(s, dt, time);
      handlePlayerThrows(s, inp);
    } else {
      handleAIFielding(s, dt, time);
    }
    updateAllFielderMovement(s, dt, time);

    const freshFielders = useGameStore.getState().fielders;
    const ball = localBallRef.current;
    const MAX_CATCH_Z = 15;
    for (const fielder of freshFielders) {
      if (fielder.id === ball.thrownByFielder) continue;
      if (ball.position3D.z > MAX_CATCH_Z) continue;
      if (checkFielderBallCollision(fielder, { x: ball.position3D.x, y: ball.position3D.y })) {
        const gs = useGameStore.getState();
        if (hitTypeRef.current && checkFlyOut(hitTypeRef.current, !ball.isLanded)) {
          gs.updateFielder(fielder.id, { hasBall: true });
          localBallRef.current = { ...ball, heldByFielder: fielder.id, thrownByFielder: null, velocity3D: { x: 0, y: 0, z: 0 } };
          const newOuts = gs.outs + 1;
          showAnnouncement(`CAUGHT! OUT!  ${outCountText(newOuts)}`, 1.2);
          gs.recordOut();
          return;
        }
        gs.updateFielder(fielder.id, { hasBall: true });
        localBallRef.current = { ...ball, heldByFielder: fielder.id, thrownByFielder: null, velocity3D: { x: 0, y: 0, z: 0 } };
        if (checkFieldingOuts()) return;
        gs.setPhase(GamePhase.Fielding);
        return;
      }
    }
    if (checkFieldingOuts()) return;

    if (!foulCheckedRef.current && ball.isLanded) {
      foulCheckedRef.current = true;
      if (isFoulTerritory(ball.position3D.x, ball.position3D.y)) {
        hitTypeRef.current = HitType.Foul;
        showAnnouncement('FOUL', 0.8);
        const gs = useGameStore.getState();
        if (gs.count.strikes < 2) gs.advanceCount('strike');
        for (const r of gs.runners) {
          gs.removeRunner(r.id);
          sceneRef.current?.removeRunner(r.id);
        }
        localBallRef.current = null;
        sceneRef.current?.hideBall();
        goToPrePitch();
        return;
      }
    }

    if (ball.isLanded && Math.abs(ball.velocity3D.x) < 0.05 && Math.abs(ball.velocity3D.y) < 0.05) {
      useGameStore.getState().setPhase(GamePhase.Fielding);
    }
  }

  function handleFielding(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>, dt: number, time: number) {
    const gs = useGameStore.getState();
    handleBaserunning(s, inp);
    updateAllFielderMovement(s, dt, time);
    if (localBallRef.current && localBallRef.current.heldByFielder === null) {
      const fc = getFieldCfg();
      localBallRef.current = fieldBallPhysics(localBallRef.current, dt, fc.wallRadiusGU, fc.wallHeightGU);
      const MAX_CATCH_Z = 15;
      for (const fielder of gs.fielders) {
        if (fielder.id === localBallRef.current.thrownByFielder) continue;
        if (localBallRef.current.position3D.z > MAX_CATCH_Z) continue;
        const bp = { x: localBallRef.current.position3D.x, y: localBallRef.current.position3D.y };
        if (checkFielderBallCollision(fielder, bp)) {
          gs.updateFielder(fielder.id, { hasBall: true });
          localBallRef.current = { ...localBallRef.current, heldByFielder: fielder.id, thrownByFielder: null, velocity3D: { x: 0, y: 0, z: 0 } };
          break;
        }
      }
    }
    if (!s.isPlayerBatting) {
      handleAutoDefense(s, dt, time);
      handlePlayerThrows(s, inp);
    } else {
      handleAIFielding(s, dt, time);
    }

    if (checkFieldingOuts()) return;

    const fresh = useGameStore.getState();
    const settled = fresh.runners.every((r) => r.currentBase === r.targetBase || r.isOut);
    const held = localBallRef.current?.heldByFielder != null;
    if (settled && held) {
      phaseTimerRef.current += dt;
      if (phaseTimerRef.current > 1.2) {
        goToPrePitch();
        gs.resetFielders();
      }
    } else if (settled && !held) {
      phaseTimerRef.current += dt;
      if (phaseTimerRef.current > 3.5) {
        goToPrePitch();
        gs.resetFielders();
      }
    } else {
      phaseTimerRef.current = 0;
    }
  }

  function updateRunnersOnField(s: ReturnType<typeof useGameStore.getState>, dt: number) {
    const gs = useGameStore.getState();
    for (const runner of s.runners) {
      if (runner.isOut) continue;
      const updated = updateRunnerMovement(runner, dt);
      gs.updateRunner(runner.id, { position: updated.position, currentBase: updated.currentBase });
      if (checkRunnerScored(updated)) {
        gs.scoreRun(s.isPlayerBatting ? 'away' : 'home');
        gs.removeRunner(runner.id);
        sceneRef.current?.removeRunner(runner.id);
      }
    }
  }

  function updateAllFielderMovement(s: ReturnType<typeof useGameStore.getState>, dt: number, time: number) {
    const gs = useGameStore.getState();
    const fielderWall = getFieldCfg().wallRadiusGU - 10;
    for (const f of s.fielders) {
      const u = updateFielderMovement(f, dt, time, fielderWall);
      if (u.location.x !== f.location.x || u.location.y !== f.location.y || u.isDiving !== f.isDiving) {
        gs.updateFielder(f.id, { location: u.location, isDiving: u.isDiving, targetLocation: u.targetLocation });
      }
    }
  }

  function doThrow(fromId: number, target: { id: number; location: Vec2 }, gs: ReturnType<typeof useGameStore.getState>) {
    const holder = gs.fielders.find((f) => f.id === fromId);
    if (!holder || !localBallRef.current) return;
    const tr = throwBall(holder.location, target.location, THROW_SPEED);
    const dx = target.location.x - holder.location.x;
    const dy = target.location.y - holder.location.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const off = Math.min(CATCH_RADIUS + 8, dist * 0.5);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : -1;
    localBallRef.current = {
      ...localBallRef.current,
      position3D: { x: holder.location.x + nx * off, y: holder.location.y + ny * off, z: 10 },
      velocity3D: tr.velocity,
      heldByFielder: null,
      thrownByFielder: fromId,
      isLanded: false,
    };
    gs.updateFielder(fromId, { hasBall: false });
  }

  function doThrowToBase(basePos: Vec2, s: ReturnType<typeof useGameStore.getState>) {
    const gs = useGameStore.getState();
    const holder = s.fielders.find((f) => f.hasBall);
    if (!holder || !localBallRef.current) return;
    let closest: typeof holder | null = null;
    let closestDist = Infinity;
    for (const f of s.fielders) {
      if (f.id === holder.id) continue;
      const d = distance(f.location, basePos);
      if (d < closestDist) { closest = f; closestDist = d; }
    }
    if (closest) doThrow(holder.id, closest, gs);
  }

  /** Auto-fielding: AI-driven movement (chase ball + cover bases) for both sides. */
  function handleAutoDefense(s: ReturnType<typeof useGameStore.getState>, dt: number, time: number) {
    if (!aiRef.current) return;
    const snap = getSnapshot(s);
    const cmds = aiRef.current.controlFielders(snap);
    const gs = useGameStore.getState();
    for (const cmd of cmds) {
      if (cmd.targetLocation) gs.updateFielder(cmd.fielderId, { targetLocation: cmd.targetLocation });
      if (cmd.dive) {
        const f = s.fielders.find((ff) => ff.id === cmd.fielderId);
        if (f) {
          const started = startDive(f, time);
          gs.updateFielder(cmd.fielderId, { isDiving: started.isDiving, diveEndTime: started.diveEndTime, lastDiveTime: started.lastDiveTime });
        }
      }
    }
  }

  /** Player throw controls: base hotkeys + number key throws. */
  function handlePlayerThrows(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>) {
    const holder = s.fielders.find((f) => f.hasBall);
    if (!holder || !localBallRef.current) return;

    const baseKeys: [string, Vec2][] = [
      ['z', FIRST_BASE], ['x', SECOND_BASE], ['c', THIRD_BASE], ['v', HOME_PLATE],
    ];
    for (const [key, basePos] of baseKeys) {
      if (inp.keysPressed.has(key)) { doThrowToBase(basePos, s); return; }
    }

    for (const key of inp.keysPressed) {
      const num = parseInt(key);
      if (num >= 1 && num <= 9) {
        const target = s.fielders.find((f) => f.id === num);
        if (target && target.id !== holder.id) {
          const gs = useGameStore.getState();
          doThrow(holder.id, target, gs);
          return;
        }
      }
    }
  }

  /** Full AI fielding (movement + auto-throws) when AI is defending. */
  function handleAIFielding(s: ReturnType<typeof useGameStore.getState>, dt: number, time: number) {
    if (!aiRef.current) return;
    const snap = getSnapshot(s);
    const cmds = aiRef.current.controlFielders(snap);
    const gs = useGameStore.getState();
    const fresh = gs.fielders;
    for (const cmd of cmds) {
      if (cmd.targetLocation) gs.updateFielder(cmd.fielderId, { targetLocation: cmd.targetLocation });
      if (cmd.dive) { const f = fresh.find((ff) => ff.id === cmd.fielderId); if (f) { const started = startDive(f, time); gs.updateFielder(cmd.fielderId, { isDiving: started.isDiving, diveEndTime: started.diveEndTime, lastDiveTime: started.lastDiveTime }); } }
      if (cmd.throwTo && localBallRef.current) {
        const h = fresh.find((f) => f.id === cmd.fielderId);
        const tg = fresh.find((f) => f.id === cmd.throwTo);
        if (h?.hasBall && tg) doThrow(h.id, tg, gs);
      }
    }
  }

  /* --- phase transitions --- */

  function handleOutRecorded(dt: number) {
    if (storeRef.current.practiceMode) { goToPrePitch(); return; }
    phaseTimerRef.current += dt;
    if (phaseTimerRef.current > 2.0) {
      goToPrePitch();
      useGameStore.getState().resetFielders();
    }
  }

  function handleRunnersAdvance(s: ReturnType<typeof useGameStore.getState>, dt: number) {
    if (storeRef.current.practiceMode) { goToPrePitch(); return; }
    phaseTimerRef.current += dt;
    if (!announcementRef.current) showAnnouncement('WALK', 0.9);
    if (phaseTimerRef.current > 2.0) {
      const gs = useGameStore.getState();
      for (const runner of gs.runners) {
        if (runner.currentBase === BaseType.Third) { gs.scoreRun(s.isPlayerBatting ? 'away' : 'home'); gs.removeRunner(runner.id); }
        else if (runner.currentBase === BaseType.First) gs.updateRunner(runner.id, { targetBase: BaseType.Second });
      }
      const nr = createRunner(0); gs.addRunner(nr); gs.updateRunner(nr.id, { targetBase: BaseType.First });
      hasSwungRef.current = false; ballReleasedRef.current = false;
      windupStartedRef.current = false; pitchProgressRef.current = 0;
      phaseTimerRef.current = 0; aiPitchFiredRef.current = false;
      gs.resetForNewPitch();
    }
  }

  function handleHalfInningEnd(s: ReturnType<typeof useGameStore.getState>, dt: number) {
    if (storeRef.current.practiceMode) { goToPrePitch(); return; }
    phaseTimerRef.current += dt;
    if (!announcementRef.current) showAnnouncement(`End of ${s.inning.isTop ? 'Top' : 'Bottom'} ${s.inning.number}`, 2.5);
    if (phaseTimerRef.current > 3.5) {
      phaseTimerRef.current = 0; aiPitchFiredRef.current = false;
      localBallRef.current = null; hitCameraHoldRef.current = 0;
      hasSwungRef.current = false; ballReleasedRef.current = false;
      windupStartedRef.current = false; pitchProgressRef.current = 0;
      sceneRef.current?.clearRunners(); sceneRef.current?.resetPitcherAnimation(); sceneRef.current?.clearTrail();
      sceneRef.current?.resetBatter();
      useGameStore.getState().nextHalfInning();
    }
  }

  function handleStrikeOrBall(dt: number) {
    phaseTimerRef.current += dt;
    if (phaseTimerRef.current > 1.2) goToPrePitch();
  }

  function hitLabel(type: HitType): string {
    switch (type) {
      case HitType.HomeRun: return 'HOME RUN!';
      case HitType.LineDrive: return 'LINE DRIVE!';
      case HitType.FlyBall: return 'FLY BALL!';
      case HitType.GroundBall: return 'GROUND BALL!';
      case HitType.PopUp: return 'POP UP!';
      default: return 'HIT!';
    }
  }

  function getSnapshot(s: ReturnType<typeof useGameStore.getState>) {
    const ball = localBallRef.current ?? s.ball;
    return { phase: s.phase, inning: s.inning, count: s.count, score: s.score, outs: s.outs, runners: s.runners, fielders: s.fielders, ball };
  }

  /* =========== 3D RENDER (unified scene) =========== */

  const render = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const s = storeRef.current;
    const isFieldPhase = s.phase === GamePhase.BallInPlay || s.phase === GamePhase.Fielding;

    if (isFieldPhase && hitCameraHoldRef.current <= 0) {
      scene.switchToFieldingView();
    } else if (!isFieldPhase) {
      scene.switchToBattingView();
    }

    if (lastPlayerBattingRef.current !== s.isPlayerBatting) {
      lastPlayerBattingRef.current = s.isPlayerBatting;
      scene.setTeamSides(s.isPlayerBatting);
    }

    for (const f of s.fielders) {
      scene.ensureFielder(f.id, f.label, f.hotkey);
      scene.updateFielder(f.id, f.location.x, f.location.y, f.id === s.selectedFielderId, f.isDiving);
    }
    for (const r of s.runners) {
      if (r.isOut) continue;
      scene.ensureRunner(r.id);
      scene.updateRunner(r.id, r.position.x, r.position.y);
    }

    const showReticle = s.isPlayerBatting && !isFieldPhase
      && !s.phase.toString().includes('GameOver') && !hasSwungRef.current;
    scene.updateReticle(showReticle);

    if (chargeBarRef.current && chargeInnerRef.current) {
      if (chargingRef.current) {
        chargeBarRef.current.style.display = 'flex';
        const pct = chargePowerRef.current * 100;
        chargeInnerRef.current.style.width = `${pct}%`;
      } else {
        chargeBarRef.current.style.display = 'none';
      }
    }

    const showPitchAim = !s.isPlayerBatting && s.phase === GamePhase.PrePitch
      && !!s.selectedPitch && !s.pitchAimPos;
    scene.updatePitchAimReticle(showPitchAim);

    const showTrajectory = !s.isPlayerBatting && s.phase === GamePhase.PrePitch && !!s.selectedPitch;
    if (showTrajectory) {
      const cfg = PITCH_CONFIGS[s.selectedPitch!];
      const bm = DIFFICULTY_CONFIGS[s.settings.difficulty].breakMultiplier;
      const dc = DIFFICULTY_CONFIGS[s.settings.difficulty];
      const estFlightSpeed = dc.pitchFlightBase * 0.85 * (cfg.baseSpeed / 95);
      scene.updatePitchTrajectory(true, cfg.breakX * 0.02 * bm, cfg.breakY * 0.01 * bm, estFlightSpeed);
    } else {
      scene.updatePitchTrajectory(false, 0, 0);
    }

    if (localBallRef.current) {
      const ball = localBallRef.current;
      if (ball.isInPlay) {
        scene.updateBallFromGameCoords(ball.position3D.x, ball.position3D.y, ball.position3D.z);
      } else if (ballReleasedRef.current && pitchProgressRef.current > 0) {
        const p3d = scene.getPitchBallPos(
          pitchProgressRef.current,
          pitchStartRef.current.x, pitchStartRef.current.y, pitchStartRef.current.z,
          pitchEndRef.current.x, pitchEndRef.current.y, pitchEndRef.current.z,
          pitchBreakRef.current.x, pitchBreakRef.current.y,
          pitchFlightSpeedRef.current,
        );
        scene.updateBall3D(p3d, true);
      } else {
        scene.hideBall();
      }
    } else {
      scene.hideBall();
    }

    scene.render();
  }, []);

  /* =========== LIFECYCLE =========== */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const threeScene = new ThreeScene(container);
    sceneRef.current = threeScene;
    threeScene.setBatterSide(storeRef.current.settings.batterSide);
    const initFieldCfg = FIELD_SIZE_CONFIGS[storeRef.current.settings.fieldSize];
    threeScene.setFieldSize(initFieldCfg.wallRadiusGU, initFieldCfg.wallHeightGU);
    inputRef.current.attach(threeScene.getDomElement());
    gameLoopRef.current = new GameLoop(update, render);
    gameLoopRef.current.start();
    return () => { gameLoopRef.current?.stop(); inputRef.current.detach(); threeScene.dispose(); sceneRef.current = null; if (pitchInfoTimerRef.current) clearTimeout(pitchInfoTimerRef.current); };
  }, [update, render]);

  /* =========== UI =========== */

  const handlePitchSelect = (pitch: PitchType) => {
    if (store.isPlayerBatting) return;
    store.selectPitch(pitch);
  };

  const handleAccuracyLock = (value: number) => {
    if (store.isPlayerBatting) return;
    store.setAccuracyValue(value);
  };

  const handleSpeedLock = (value: number) => {
    if (store.isPlayerBatting) return;
    const s = useGameStore.getState();
    if (!s.selectedPitch || !s.pitchAimPos || s.accuracyValue === null) return;
    resetPitchState();
    store.setSpeedBarValue(value);
    preparePitchPrecise(s.selectedPitch, s.pitchAimPos.x, s.pitchAimPos.y, s.accuracyValue, value, false);
    pitchInfoRef.current = { type: s.selectedPitch, speed: value };
    windupStartedRef.current = true;
    if (storeRef.current.practiceMode) {
      setPitchPracticeStats((p) => ({ ...p, pitches: p.pitches + 1 }));
      const cfg = PITCH_CONFIGS[s.selectedPitch];
      setLastPitchResult({
        type: cfg.label,
        speed: Math.round(value * 100),
        accuracy: Math.round(s.accuracyValue! * 100),
        result: '...',
      });
    }
    store.setPhase(GamePhase.Pitching);
  };

  const showPitchControls = !store.isPlayerBatting && store.phase === GamePhase.PrePitch;
  const pitchStep = !store.selectedPitch ? 'type'
    : !store.pitchAimPos ? 'aim'
    : store.accuracyValue === null ? 'accuracy'
    : !store.speedBarValue ? 'speed'
    : 'done';

  const isPractice = store.practiceMode;

  return (
    <div className="flex flex-col items-center gap-4">
      {!isPractice && <Scoreboard />}
      <div className="relative">
        <div ref={containerRef} className="border border-gray-700 rounded-lg overflow-hidden" style={{ width: 900, maxWidth: '100%', height: 600 }} />

        {isPractice && store.isPlayerBatting && hitDebug && (
          <div className="absolute top-2 right-2 z-20 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-gray-600/40 p-3 min-w-[200px]">
              <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1.5">Hit Data</div>
              <div className="space-y-1 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className={`font-bold ${hitDebug.hitType === HitType.HomeRun ? 'text-yellow-400' : hitDebug.hitType === HitType.Foul ? 'text-red-400' : 'text-white'}`}>
                    {hitLabel(hitDebug.hitType)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Exit Velo</span>
                  <span className="text-cyan-300">{Math.round(25 + hitDebug.exitSpeed * 3.8)} mph</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Launch</span>
                  <span className="text-green-300">{hitDebug.launchAngle.toFixed(1)}&deg;</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Spray</span>
                  <span className="text-orange-300">{hitDebug.sprayAngle.toFixed(1)}&deg;</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quality</span>
                  <span className="text-purple-300">{Math.round(hitDebug.contactQuality * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Charge</span>
                  <span className="text-yellow-300">{Math.round(hitDebug.chargePower * 100)}%</span>
                </div>
                {hitDebug.distance > 0 && hitDebug.hitType !== HitType.Foul && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Distance</span>
                    <span className="text-blue-300">{Math.round(hitDebug.distance * 0.44)} ft</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isPractice && store.isPlayerBatting && (
          <div className="absolute top-2 left-2 z-20 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-gray-600/40 px-3 py-2">
              <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Batting Stats</div>
              <div className="flex gap-3 text-xs font-mono">
                <div><span className="text-gray-500">Pitches</span> <span className="text-white font-bold">{practiceStats.pitches}</span></div>
                <div><span className="text-gray-500">Swings</span> <span className="text-white font-bold">{practiceStats.swings}</span></div>
                <div><span className="text-gray-500">Hits</span> <span className="text-green-400 font-bold">{practiceStats.hits}</span></div>
                <div><span className="text-gray-500">Fouls</span> <span className="text-red-400 font-bold">{practiceStats.fouls}</span></div>
              </div>
              <div className="mt-1.5 text-[9px] text-gray-500">Press <span className="text-yellow-400/80 font-bold">R</span> to reset</div>
            </div>
          </div>
        )}

        {isPractice && !store.isPlayerBatting && pitchStep !== 'type' && (
          <div className="absolute top-2 left-2 z-20 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-gray-600/40 px-3 py-2 min-w-[200px]">
              <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Pitching Stats</div>
              <div className="flex gap-3 text-xs font-mono">
                <div><span className="text-gray-500">Thrown</span> <span className="text-white font-bold">{pitchPracticeStats.pitches}</span></div>
                <div><span className="text-gray-500">K</span> <span className="text-green-400 font-bold">{pitchPracticeStats.strikes}</span></div>
                <div><span className="text-gray-500">BB</span> <span className="text-blue-400 font-bold">{pitchPracticeStats.balls}</span></div>
                <div><span className="text-gray-500">Hits</span> <span className="text-red-400 font-bold">{pitchPracticeStats.hitsAllowed}</span></div>
                <div><span className="text-gray-500">Fouls</span> <span className="text-yellow-400 font-bold">{pitchPracticeStats.fouls}</span></div>
              </div>
            </div>
          </div>
        )}

        {isPractice && !store.isPlayerBatting && lastPitchResult && (
          <div className="absolute top-2 right-2 z-20 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-gray-600/40 p-3 min-w-[180px]">
              <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1.5">Last Pitch</div>
              <div className="space-y-1 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className="text-white font-bold">{lastPitchResult.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Power</span>
                  <span className="text-cyan-300">{lastPitchResult.speed}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Accuracy</span>
                  <span className="text-green-300">{lastPitchResult.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Result</span>
                  <span className={`font-bold ${
                    lastPitchResult.result.includes('STRIKE') ? 'text-green-400'
                    : lastPitchResult.result === 'BALL' ? 'text-blue-400'
                    : lastPitchResult.result === 'FOUL' ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>{lastPitchResult.result}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPitchControls && pitchStep === 'type' && (
          <div className="absolute top-2 left-2 right-2 z-10">
            <PitchSelector selectedPitch={store.selectedPitch} onSelect={handlePitchSelect} />
          </div>
        )}
        {showPitchControls && pitchStep === 'aim' && (
          <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm px-5 py-2 rounded-lg">
              <span className="text-green-300/90 text-sm font-medium">
                Move mouse to aim &middot; press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-green-300 text-[10px]">Space</kbd> or click to confirm
              </span>
            </div>
          </div>
        )}
        {showPitchControls && pitchStep === 'accuracy' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <SpeedBar active={true} onLock={handleAccuracyLock} label="Accuracy" cycleSpeed={DIFFICULTY_CONFIGS[store.settings.difficulty].pitchBarSpeed * 1.15} />
          </div>
        )}
        {showPitchControls && pitchStep === 'speed' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <SpeedBar active={true} onLock={handleSpeedLock} label="Power" hideValue={true} cycleSpeed={DIFFICULTY_CONFIGS[store.settings.difficulty].pitchBarSpeed} />
          </div>
        )}

        {(store.phase === GamePhase.Pitching || store.phase === GamePhase.BatSwing) && store.isPlayerBatting && !hasSwungRef.current && ballReleasedRef.current && (
          <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm px-5 py-2 rounded-lg">
              <span className="text-white/80 text-sm font-medium">Hold Click / SPACE to charge, release to swing &middot; A/D left/right &middot; W/S forward/back</span>
            </div>
          </div>
        )}

        <div ref={chargeBarRef} className="absolute bottom-16 inset-x-0 z-20 flex justify-center pointer-events-none" style={{ display: 'none' }}>
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-3">
            <span className="text-yellow-400 text-xs font-bold tracking-wider">POWER</span>
            <div className="w-32 h-2.5 bg-gray-700 rounded-full overflow-hidden">
              <div ref={chargeInnerRef} className="h-full rounded-full" style={{ width: '0%', background: 'linear-gradient(90deg, #eab308, #ef4444)' }} />
            </div>
          </div>
        </div>

        {!isPractice && (store.phase === GamePhase.BallInPlay || store.phase === GamePhase.Fielding) && store.isPlayerBatting && (
          <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm px-5 py-2 rounded-lg">
              <span className="text-white/80 text-sm font-medium">
                <kbd className="px-1 py-0.5 bg-gray-800 rounded text-green-300 text-[10px]">W</kbd> / <kbd className="px-1 py-0.5 bg-gray-800 rounded text-green-300 text-[10px]">↑</kbd> Go &middot;
                <kbd className="px-1 py-0.5 bg-gray-800 rounded text-red-300 text-[10px] ml-2">S</kbd> / <kbd className="px-1 py-0.5 bg-gray-800 rounded text-red-300 text-[10px]">↓</kbd> Hold
              </span>
            </div>
          </div>
        )}

        {!isPractice && (store.phase === GamePhase.BallInPlay || store.phase === GamePhase.Fielding) && !store.isPlayerBatting && (
          <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm px-5 py-2 rounded-lg">
              <span className="text-white/80 text-sm font-medium">
                <kbd className="px-1 py-0.5 bg-gray-800 rounded text-blue-300 text-[10px]">Z</kbd> 1B &middot;
                <kbd className="px-1 py-0.5 bg-gray-800 rounded text-blue-300 text-[10px] ml-1">X</kbd> 2B &middot;
                <kbd className="px-1 py-0.5 bg-gray-800 rounded text-blue-300 text-[10px] ml-1">C</kbd> 3B &middot;
                <kbd className="px-1 py-0.5 bg-gray-800 rounded text-blue-300 text-[10px] ml-1">V</kbd> Home
              </span>
            </div>
          </div>
        )}

        {pitchInfoDisplay && (
          <div className={`absolute ${isPractice ? 'top-14' : 'top-4'} inset-x-0 z-20 flex justify-center pointer-events-none`}>
            <div className="bg-black/70 backdrop-blur-sm px-6 py-2.5 rounded-xl border border-gray-600/40">
              <span className="text-white font-bold text-lg tracking-wide">{pitchInfoDisplay}</span>
            </div>
          </div>
        )}

        {announcementRef.current && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex justify-center pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm px-8 py-4 rounded-xl">
              <span className="text-yellow-400 font-bold text-3xl">{announcementRef.current}</span>
            </div>
          </div>
        )}
      </div>

      {!isPractice && store.phase === GamePhase.GameOver && (
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-2xl mb-1">GAME OVER</div>
            <div className="text-white text-lg">
              {store.score.away > store.score.home ? 'You Win!' : store.score.home > store.score.away ? 'CPU Wins!' : "It's a Tie!"}{' '}{store.score.away} - {store.score.home}
            </div>
          </div>
          <button onClick={() => { localBallRef.current = null; aiPitchFiredRef.current = false; phaseTimerRef.current = 0; hitCameraHoldRef.current = 0; sceneRef.current?.clearRunners(); sceneRef.current?.resetPitcherAnimation(); sceneRef.current?.clearTrail(); store.startGame(store.settings); }}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl transition-all hover:scale-105">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
