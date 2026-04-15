import { useRef, useState, useCallback, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { InputManager } from '@/engine/InputManager';
import { ThreeScene } from '@/engine/ThreeScene';
import {
  createPitchTrajectory,
  updateBallPhysics,
  calculatePhysicsHit,
  calculateBuntHit,
  fieldBallPhysics,
  throwBall,
  checkPitchCrossedPlate,
  PhysicsHitResult,
} from '@/engine/PhysicsEngine';
import {
  checkFielderBallCollision,
} from '@/engine/CollisionDetector';
import {
  updateFielderMovement,
  startDive,
} from '@/game/Fielder';
import {
  createRunner,
  advanceRunners,
  updateRunnerMovement,
  checkRunnerScored,
  sendRunnersForward,
  retreatRunners,
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
import { getSocket } from '@/lib/socketClient';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import type { AtBatResultPayload, PlayResolvedPayload, ThrowCommandPayload } from '@/server/protocol';
import type { HitDebugData, PracticeStatsData, PitchPracticeStatsData, LastPitchResultData } from '@/components/game/PracticeOverlays';
import { DEFAULT_STRIKEOUT_IMAGES, DEFAULT_STRIKE_IMAGES, DEFAULT_BALL_IMAGES } from '@/game/pitcherProfiles';

export interface SplashData {
  src: string | null;
  text: string;
  textColor: string;
  bgOpacity: string;
}

interface GameUpdateDeps {
  sceneRef: MutableRefObject<ThreeScene | null>;
  inputRef: MutableRefObject<InputManager>;
  aiRef: MutableRefObject<AIController | null>;
  storeRef: MutableRefObject<ReturnType<typeof useGameStore.getState>>;
  showBattingTutorialRef: MutableRefObject<boolean>;
  pausedRef: MutableRefObject<boolean>;
  windowHiddenRef: MutableRefObject<boolean>;
  introRef?: MutableRefObject<boolean>;
}

export function useGameUpdate(deps: GameUpdateDeps) {
  const { sceneRef, inputRef, aiRef, storeRef, showBattingTutorialRef, pausedRef, windowHiddenRef, introRef } = deps;

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
  const swingBallZRef = useRef(Infinity);
  const swingClosestDistRef = useRef(Infinity);
  const ballLandedTrailRef = useRef(false);
  const deadBallRef = useRef(false);
  const pitchFlightSpeedRef = useRef(2.2);
  const currentPitchTypeRef = useRef<PitchType | null>(null);
  const knucklePhaseRef = useRef<{
    px: number[]; py: number[]; fx: number[]; fy: number[];
    ampScale: number; driftX: number; driftY: number; driftPhase: number;
    chaos: number;
  } | null>(null);
  const pitchInfoRef = useRef<{ type: PitchType; speed: number } | null>(null);
  const [pitchInfoDisplay, setPitchInfoDisplay] = useState<string | null>(null);
  const pitchInfoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [splashData, setSplashData] = useState<SplashData | null>(null);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chargingRef = useRef(false);
  const chargeStartRef = useRef(0);
  const chargePowerRef = useRef(0);
  const chargeBarRef = useRef<HTMLDivElement>(null);
  const chargeInnerRef = useRef<HTMLDivElement>(null);
  const buntingRef = useRef(false);

  const aiBatPosRef = useRef({ x: 0.5, y: 0.5 });
  const aiBatNoiseRef = useRef({ x: 0, y: 0 });
  const aiSwingTimingRef = useRef(0);
  const aiChargePowerRef = useRef(0.85);

  const remoteBatTargetRef = useRef({ normX: 0.5, normY: 0.5, boxX: 0, boxZ: 0, bunting: false });
  const remoteBatCurrentRef = useRef({ normX: 0.5, normY: 0.5, boxX: 0, boxZ: 0 });
  const lastBatterEmitRef = useRef(0);
  const remoteBuntActiveRef = useRef(false);

  const practiceTimerRef = useRef(0);
  const rResetRef = useRef(false);
  const maxDistRef = useRef(0);
  const [hitDebug, setHitDebug] = useState<HitDebugData | null>(null);
  const [practiceStats, setPracticeStats] = useState<PracticeStatsData>({ pitches: 0, swings: 0, hits: 0, homeRuns: 0, fouls: 0 });
  const [pitchPracticeStats, setPitchPracticeStats] = useState<PitchPracticeStatsData>({ pitches: 0, strikes: 0, balls: 0, hitsAllowed: 0, fouls: 0 });
  const [lastPitchResult, setLastPitchResult] = useState<LastPitchResultData | null>(null);

  /* ---- helpers ---- */

  function getFieldCfg() {
    return FIELD_SIZE_CONFIGS[storeRef.current.settings.fieldSize];
  }

  function getEffectivePitchConfig(pitchType: PitchType) {
    const profile = aiRef.current?.getProfile();
    if (profile) {
      const match = profile.pitches.find((p) => p.type === pitchType);
      if (match) {
        const base = PITCH_CONFIGS[pitchType];
        return { ...base, baseSpeed: match.baseSpeed, breakX: match.breakX, breakY: match.breakY };
      }
    }
    return PITCH_CONFIGS[pitchType];
  }

  function showAnnouncement(text: string, duration: number = 1.0) {
    announcementRef.current = text;
    announcementTimerRef.current = duration;
  }

  function isMP(): boolean {
    return useMultiplayerStore.getState().isMultiplayer;
  }

  function emitPlayResolved(outcome: PlayResolvedPayload['outcome']) {
    const gs = useGameStore.getState();
    getSocket().emit('play_resolved', {
      outcome,
      gameState: {
        score: gs.score,
        count: gs.count,
        outs: gs.outs,
        inning: gs.inning,
        runners: gs.runners,
        isPlayerBatting: gs.isPlayerBatting,
      },
    });
  }

  function consumeRemotePlayResolved() {
    const mp = useMultiplayerStore.getState();
    const resolved = mp.remotePlayResolved;
    if (!resolved) return;
    mp.setRemotePlayResolved(null);
    if (resolved.outcome !== 'out') return;

    const gs = useGameStore.getState();
    const remoteOuts = resolved.gameState.outs;

    if (remoteOuts <= gs.outs) {
      if (resolved.gameState.score.home !== gs.score.home || resolved.gameState.score.away !== gs.score.away) {
        useGameStore.setState({ score: resolved.gameState.score });
      }
      return;
    }

    const remoteRunnerIds = new Set(resolved.gameState.runners.map((r) => r.id));
    for (const runner of gs.runners) {
      if (!remoteRunnerIds.has(runner.id)) {
        gs.removeRunner(runner.id);
        sceneRef.current?.removeRunner(runner.id);
      }
    }

    showAnnouncement(`OUT! ${outCountText(remoteOuts)}`, 1.2);

    if (remoteOuts >= 3) {
      const { inning, settings, score } = gs;
      const isBottomLastDone = !inning.isTop && inning.number >= settings.totalInnings;
      const isTopLastAndHomeleads =
        inning.isTop && inning.number >= settings.totalInnings && score.home > score.away;
      localBallRef.current = null;
      sceneRef.current?.hideBall();
      if (isBottomLastDone || isTopLastAndHomeleads) {
        useGameStore.setState({ outs: remoteOuts, phase: GamePhase.GameOver });
      } else {
        useGameStore.setState({ outs: remoteOuts, phase: GamePhase.HalfInningEnd });
      }
    } else {
      useGameStore.setState({ outs: remoteOuts });
    }

    if (resolved.gameState.score.home !== gs.score.home || resolved.gameState.score.away !== gs.score.away) {
      useGameStore.setState({ score: resolved.gameState.score });
    }
  }

  function consumeRemoteStateSync() {
    const mp = useMultiplayerStore.getState();
    const sync = mp.remoteStateSync;
    if (!sync) return;
    mp.setRemoteStateSync(null);

    const gs = useGameStore.getState();

    if (sync.outs !== gs.outs) {
      useGameStore.setState({ outs: sync.outs });
      if (sync.outs >= 3 && gs.phase !== GamePhase.HalfInningEnd && gs.phase !== GamePhase.GameOver) {
        const { inning, settings, score } = gs;
        const isBottomLastDone = !inning.isTop && inning.number >= settings.totalInnings;
        const isTopLastAndHomeleads =
          inning.isTop && inning.number >= settings.totalInnings && score.home > score.away;
        localBallRef.current = null;
        sceneRef.current?.hideBall();
        if (isBottomLastDone || isTopLastAndHomeleads) {
          useGameStore.setState({ phase: GamePhase.GameOver });
        } else {
          useGameStore.setState({ phase: GamePhase.HalfInningEnd });
        }
      }
    }

    if (sync.score.home !== gs.score.home || sync.score.away !== gs.score.away) {
      useGameStore.setState({ score: sync.score });
    }
    if (sync.count.balls !== gs.count.balls || sync.count.strikes !== gs.count.strikes) {
      useGameStore.setState({ count: sync.count });
    }
    if (sync.inning.number !== gs.inning.number || sync.inning.isTop !== gs.inning.isTop) {
      useGameStore.setState({ inning: sync.inning });
    }

    const expectedLocalBatting = !sync.isPlayerBatting;
    if (gs.isPlayerBatting !== expectedLocalBatting) {
      useGameStore.setState({ isPlayerBatting: expectedLocalBatting });
      mp.setIsLocalBatting(expectedLocalBatting);
      hasSwungRef.current = false;
      buntingRef.current = false;
      chargingRef.current = false;
      chargePowerRef.current = 0;
      sceneRef.current?.setChargeLevel(0);
      sceneRef.current?.setBunting(false);
    }
  }

  /**
   * Handle any incoming remote at-bat result (strike/ball/foul/hit/hbp).
   * Returns true if a result was consumed.
   */
  function consumeRemoteAtBatResult(): boolean {
    const remoteResult = useMultiplayerStore.getState().remoteAtBatResult;
    if (!remoteResult) return false;
    useMultiplayerStore.getState().setRemoteAtBatResult(null);
    const scene = sceneRef.current;

    if (remoteResult.type === 'hit' && remoteResult.hitData) {
      applyRemoteHitResult(remoteResult.hitData);
    } else if (remoteResult.type === 'hbp') {
      handleHitByPitch();
    } else if (remoteResult.type === 'foul') {
      showAnnouncement('FOUL', 0.8);
      const gs = useGameStore.getState();
      if (gs.count.strikes < 2) gs.advanceCount('strike');
      localBallRef.current = null;
      scene?.hideBall();
      goToPrePitch();
    } else {
      const isStrike = remoteResult.type === 'strike';
      callStrikeOrBall(isStrike);
      localBallRef.current = null;
      scene?.hideBall();
    }
    return true;
  }

  /** Apply a hit result received from the remote batter. */
  function applyRemoteHitResult(hitData: NonNullable<AtBatResultPayload['hitData']>) {
    const scene = sceneRef.current;
    hitTypeRef.current = hitData.hitType;
    showPitchInfo();

    if (hitData.hitType === HitType.Foul) {
      showAnnouncement('FOUL', 0.8);
      const gs = useGameStore.getState();
      if (gs.count.strikes < 2) gs.advanceCount('strike');
      localBallRef.current = null;
      scene?.hideBall();
      goToPrePitch();
      return;
    }

    showAnnouncement(hitLabel(hitData.hitType), 1.2);

    localBallRef.current = {
      position3D: { x: HOME_PLATE.x, y: HOME_PLATE.y, z: Math.max(15, 0.5 * 28) },
      velocity3D: hitData.exitVelocity,
      screenPosition: project3Dto2D({ x: HOME_PLATE.x, y: HOME_PLATE.y, z: 15 }),
      isInPlay: true, isLanded: false, landingPosition: null, heldByFielder: null,
    };

    scene?.clearTrail();
    scene?.setTrailColor('flight');
    hitCameraHoldRef.current = 0.6;
    practiceTimerRef.current = 0;
    scene?.setBatterVisible(false);

    const gs = useGameStore.getState();
    const newRunner = createRunner(0);
    const allRunners = [...gs.runners, newRunner];
    const advanced = advanceRunners(allRunners, hitData.hitType);
    gs.addRunner(newRunner);
    for (const r of advanced) gs.updateRunner(r.id, { targetBase: r.targetBase, startBase: r.startBase });
    gs.resetCount();
    gs.setPhase(GamePhase.BallInPlay);
  }

  /** Apply remote throw commands queued by the opponent. */
  function applyRemoteThrowCommands(_s: ReturnType<typeof useGameStore.getState>) {
    const mpStore = useMultiplayerStore.getState();
    for (let cmd = mpStore.shiftRemoteThrowCommand(); cmd; cmd = mpStore.shiftRemoteThrowCommand()) {
      const gs = useGameStore.getState();
      const from = gs.fielders.find((f) => f.id === cmd.fromFielderId);
      if (!from) continue;

      // Reconcile hasBall so the local state matches the remote authority
      for (const f of gs.fielders) {
        if (f.hasBall && f.id !== from.id) gs.updateFielder(f.id, { hasBall: false });
      }
      gs.updateFielder(from.id, { hasBall: true });

      // Ensure ball exists for the throw
      if (!localBallRef.current) {
        localBallRef.current = {
          position3D: { x: from.location.x, y: from.location.y, z: 5 },
          velocity3D: { x: 0, y: 0, z: 0 },
          screenPosition: { x: 0, y: 0 },
          isInPlay: true, isLanded: false, landingPosition: null,
          heldByFielder: from.id, thrownByFielder: null,
        };
      } else {
        localBallRef.current = { ...localBallRef.current, heldByFielder: from.id };
      }

      // Find closest fielder to the throw target and execute throw
      const freshGs = useGameStore.getState();
      let closest: { id: number; location: Vec2 } | null = null;
      let closestDist = Infinity;
      for (const f of freshGs.fielders) {
        if (f.id === from.id) continue;
        const d = distance(f.location, cmd.throwTarget);
        if (d < closestDist) { closest = f; closestDist = d; }
      }
      if (closest) doThrow(from.id, closest, freshGs);
    }
  }

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
    currentPitchTypeRef.current = null;
    knucklePhaseRef.current = null;
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

    const camRotSpeed = 0.5 * dt;
    if (inp.keysDown.has('q')) scene.rotateBattingCam(-camRotSpeed);
    if (inp.keysDown.has('e')) scene.rotateBattingCam(camRotSpeed);

    if (inp.keysPressed.has('tab')) {
      const gs = useGameStore.getState();
      const newSide = gs.settings.batterSide === 'right' ? 'left' : 'right';
      gs.updateSettings({ batterSide: newSide });
      scene.setBatterSide(newSide);
    }

    if ((inp.rightClick || inp.keysPressed.has('b')) && !scene.isSwinging()) {
      buntingRef.current = !buntingRef.current;
      scene.setBunting(buntingRef.current);
    }

    if (isMP()) emitBatterUpdate(normX, normY);
  }

  /* --- AI bat tracking --- */

  function handleAIBatTracking(s: ReturnType<typeof useGameStore.getState>, dt: number) {
    const scene = sceneRef.current;
    if (!scene || !ballReleasedRef.current || pitchProgressRef.current <= 0) return;
    if (scene.isSwinging()) return;

    const progress = pitchProgressRef.current;
    const perfectMode = storeRef.current.practiceMode && storeRef.current.practiceHitType != null;
    const lookAhead = perfectMode ? 1.0 : Math.min(1.0, progress + 0.12);
    const p3d = scene.getPitchBallPos(
      lookAhead,
      pitchStartRef.current.x, pitchStartRef.current.y, pitchStartRef.current.z,
      pitchEndRef.current.x, pitchEndRef.current.y, pitchEndRef.current.z,
      pitchBreakRef.current.x, pitchBreakRef.current.y,
      pitchFlightSpeedRef.current,
    );
    const screenPos = scene.projectToGameCoords(p3d);
    const accuracy = perfectMode ? 1.0 : (aiRef.current?.getDifficultyConfig().aiSwingAccuracy ?? 0.5);

    const jitterScale = perfectMode ? 0 : (1 - accuracy) * 0.04;
    const jitterX = (Math.random() - 0.5) * jitterScale;
    const jitterY = (Math.random() - 0.5) * jitterScale;

    const noiseX = perfectMode ? 0 : aiBatNoiseRef.current.x;
    const noiseY = perfectMode ? 0 : aiBatNoiseRef.current.y;
    const targetNX = screenPos.x / CANVAS_WIDTH + noiseX + jitterX;
    const targetNY = screenPos.y / CANVAS_HEIGHT + noiseY + jitterY;

    const reactDelay = perfectMode ? 0 : Math.max(0, 0.15 - accuracy * 0.12);
    const effectiveTrack = progress > reactDelay ? (perfectMode ? 30 : (3 + accuracy * 14)) : 1.5;
    const lerpFactor = 1 - Math.exp(-effectiveTrack * dt);
    aiBatPosRef.current.x += (targetNX - aiBatPosRef.current.x) * lerpFactor;
    aiBatPosRef.current.y += (targetNY - aiBatPosRef.current.y) * lerpFactor;

    scene.setSweetSpotFromCursor(aiBatPosRef.current.x, aiBatPosRef.current.y);
  }

  function handleRemoteBatterTracking(dt: number) {
    const scene = sceneRef.current;
    if (!scene) return;

    const mp = useMultiplayerStore.getState();
    const update = mp.remoteBatterUpdate;
    if (update) {
      mp.setRemoteBatterUpdate(null);
      remoteBatTargetRef.current = { ...update };
    }

    const swing = mp.remoteBatterSwing;
    if (swing) {
      mp.setRemoteBatterSwing(null);
      if (!scene.isSwinging()) {
        scene.startSwing(swing.chargePower, swing.swingSpeedMul);
      }
    }

    const target = remoteBatTargetRef.current;
    const current = remoteBatCurrentRef.current;
    const lerpRate = 14;
    const factor = 1 - Math.exp(-lerpRate * dt);
    current.normX += (target.normX - current.normX) * factor;
    current.normY += (target.normY - current.normY) * factor;
    current.boxX += (target.boxX - current.boxX) * factor;
    current.boxZ += (target.boxZ - current.boxZ) * factor;

    scene.setSweetSpotFromCursor(current.normX, current.normY);
    scene.setBatterBoxPosition(current.boxX, current.boxZ);

    if (target.bunting !== remoteBuntActiveRef.current) {
      remoteBuntActiveRef.current = target.bunting;
      scene.setBunting(target.bunting);
    }
  }

  function emitBatterUpdate(normX: number, normY: number) {
    const scene = sceneRef.current;
    if (!scene) return;
    const now = performance.now();
    if (now - lastBatterEmitRef.current < 50) return;
    lastBatterEmitRef.current = now;
    const box = scene.getBatterBoxOffset();
    getSocket().emit('batter_update', {
      normX,
      normY,
      boxX: box.x,
      boxZ: box.z,
      bunting: buntingRef.current,
    });
  }

  function tryAISwing(s: ReturnType<typeof useGameStore.getState>, scene: ThreeScene, p3d: THREE.Vector3) {
    if (!aiRef.current || scene.isSwinging() || hasSwungRef.current) return;
    const snap = getSnapshot(s);
    const screenPos = scene.projectToGameCoords(p3d);
    const decision = aiRef.current.decideSwing(snap, screenPos);
    const perfectMode = storeRef.current.practiceMode && storeRef.current.practiceHitType != null;
    const shouldSwing = perfectMode || decision.shouldSwing;
    if (!shouldSwing) return;

    const chargePwr = aiChargePowerRef.current;
    const swingMul = DIFFICULTY_CONFIGS[storeRef.current.settings.difficulty].swingSpeedMultiplier;
    const swingDurEst = (0.22 / Math.max(0.5, swingMul)) * (1.5 - 0.5 * Math.max(0, Math.min(1, chargePwr)));
    const contactMidT = (0.35 + 0.58) / 2;
    const timeToContact = swingDurEst * contactMidT;

    const startZ = pitchStartRef.current.z;
    const zSpeed = Math.abs(startZ) * pitchFlightSpeedRef.current;
    const timeToPlate = Math.max(0, -p3d.z / Math.max(zSpeed, 0.1));

    const timingOffset = perfectMode ? 0 : aiSwingTimingRef.current * 0.04;
    if (timeToPlate <= timeToContact + timingOffset + 0.015 && timeToPlate >= 0) {
      scene.startSwing(Math.max(0.3, Math.min(1, chargePwr)), swingMul);
      hasSwungRef.current = true;
    }
  }

  function tryBatCollision(s: ReturnType<typeof useGameStore.getState>, scene: ThreeScene, p3d: THREE.Vector3): boolean {
    if (!scene.isSwinging()) return false;
    const collisionScale = DIFFICULTY_CONFIGS[s.settings.difficulty].batCollisionScale;
    const collision = scene.checkBatBallCollision3D(p3d, collisionScale);
    if (collision.hit) {
      processPhysicsHit(s, scene, collision.contactT, collision.contactPoint);
      return true;
    }
    if (collision.dist < swingClosestDistRef.current) {
      swingClosestDistRef.current = collision.dist;
    }
    return false;
  }

  /* --- pre-pitch --- */

  function handlePrePitch(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>, dt: number) {
    phaseTimerRef.current += dt;
    const isPractice = storeRef.current.practiceMode;
    if (s.isPlayerBatting) {
      if (isMP()) {
        // PvP: wait for remote pitch from opponent
        const remotePitch = useMultiplayerStore.getState().remotePitch;
        if (remotePitch && !aiPitchFiredRef.current) {
          aiPitchFiredRef.current = true;
          resetPitchState();
          const gs = useGameStore.getState();
          gs.selectPitch(remotePitch.pitchType);
          gs.setSpeedBarValue(remotePitch.speed);
          preparePitchPrecise(remotePitch.pitchType, remotePitch.aimX, remotePitch.aimY, remotePitch.accuracy, remotePitch.speed, true);
          pitchInfoRef.current = { type: remotePitch.pitchType, speed: remotePitch.speed };
          phaseTimerRef.current = 0;
          windupStartedRef.current = true;
          gs.setPhase(GamePhase.Pitching);
          useMultiplayerStore.getState().setRemotePitch(null);
        }
      } else {
      const autoPitchDelay = isPractice ? (rResetRef.current ? 0.85 : 1.0) : 1.8;
      if (phaseTimerRef.current > autoPitchDelay && aiRef.current && !aiPitchFiredRef.current) {
        aiPitchFiredRef.current = true;
        rResetRef.current = false;
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
        const profileAccuracy = aiRef.current?.getProfile()?.accuracy;
        const aiAccuracy = profileAccuracy ?? DIFFICULTY_CONFIGS[gs.settings.difficulty].aiPitchAccuracy;
        preparePitchPrecise(decision.type, aimX, aimY, aiAccuracy, decision.speed, true);
        pitchInfoRef.current = { type: decision.type, speed: decision.speed };
        phaseTimerRef.current = 0;
        windupStartedRef.current = true;
        gs.setPhase(GamePhase.Pitching);
      }
      }
    } else {
      const scene = sceneRef.current;
      const gs = useGameStore.getState();

      if ((inp.keysPressed.has('escape') || inp.rightClick) && s.selectedPitch) {
        if (s.accuracyValue !== null) {
          gs.setAccuracyValue(null);
        } else if (s.pitchAimPos) {
          gs.setPitchAimPos(null);
        } else {
          gs.selectPitch(null);
          scene?.updatePitchAimReticle(false);
        }
        return;
      }

      for (const key of inp.keysPressed) {
        if (key === 'r' && storeRef.current.practiceMode) continue;
        const pitchType = getPitchByKey(key);
        if (pitchType && !s.selectedPitch) {
          resetPitchState();
          gs.selectPitch(pitchType);
        }
      }
      if (s.selectedPitch && !s.pitchAimPos && scene) {
        const normX = inp.mousePosition.x / CANVAS_WIDTH;
        const normY = inp.mousePosition.y / CANVAS_HEIGHT;
        scene.setPitchAimFromCursor(normX, normY);
        scene.updatePitchAimReticle(true);
        if (inp.leftClick || inp.keysPressed.has(' ')) {
          const aim = scene.getPitchAimPos();
          gs.setPitchAimPos(aim);
          scene.updatePitchAimReticle(false);
        }
      }
    }
  }

  /**
   * Compute knuckleball wobble offset at a given flight progress t (0..1).
   * Uses multiple sine harmonics with random phases and slightly randomized
   * frequencies to simulate the erratic Kármán-vortex-driven flutter of a
   * low-spin pitch.  The base break is kept near zero so ALL visible movement
   * comes from this wobble — making each pitch genuinely unpredictable.
   */
  function knuckleWobble(t: number, phases: {
    px: number[]; py: number[]; fx?: number[]; fy?: number[];
    ampScale?: number; driftX?: number; driftY?: number; driftPhase?: number;
    chaos?: number;
  }): { dx: number; dy: number } {
    const chaos = phases.chaos ?? 0.5;
    const envelope = Math.sin(t * Math.PI);
    const baseAmps = [0.24, 0.17, 0.12, 0.08, 0.05];
    const defaultFx = [1.8, 3.1, 4.7, 6.3, 8.1];
    const defaultFy = [1.5, 2.9, 4.3, 5.9, 7.7];
    const fx = phases.fx ?? defaultFx;
    const fy = phases.fy ?? defaultFy;
    const scale = phases.ampScale ?? 1.0;
    const activeCount = chaos < 0.3 ? 2 : chaos < 0.6 ? 3 : 5;
    let dx = 0, dy = 0;
    for (let i = 0; i < activeCount; i++) {
      dx += baseAmps[i] * Math.sin(fx[i % fx.length] * t * Math.PI * 2 + phases.px[i % phases.px.length]);
      dy += baseAmps[i] * Math.sin(fy[i % fy.length] * t * Math.PI * 2 + phases.py[i % phases.py.length]);
    }
    const driftX = phases.driftX ?? 0;
    const driftY = phases.driftY ?? 0;
    const driftPhase = phases.driftPhase ?? 0;
    const driftBase = Math.sin(t * Math.PI * 0.5 + driftPhase);
    dx = (dx * scale + driftX * driftBase) * envelope;
    dy = (dy * scale + driftY * driftBase) * envelope;
    return { dx, dy };
  }

  function preparePitchPrecise(pitchType: PitchType, aimX: number, aimY: number, accuracy: number, speed: number, isAI: boolean) {
    const config = getEffectivePitchConfig(pitchType);
    const traj = createPitchTrajectory(config, speed, 4);

    const maxDeviation = 0.28;
    const deviation = maxDeviation * (1 - accuracy);
    let actualX = aimX + (Math.random() - 0.5) * 2 * deviation;
    let actualY = aimY + (Math.random() - 0.5) * 2 * deviation;
    if (pitchType === PitchType.Knuckleball) {
      const knuckleDrift = 0.12 + Math.random() * 0.16;
      const angle = Math.random() * Math.PI * 2;
      actualX += Math.cos(angle) * knuckleDrift;
      actualY += Math.sin(angle) * knuckleDrift;
    }
    pitchEndRef.current = { x: actualX, y: actualY, z: 0 };

    const diffCfg = DIFFICULTY_CONFIGS[storeRef.current.settings.difficulty];
    const pitchSpeedFactor = config.baseSpeed / 95;
    const moundRatio = 60.5 / getFieldCfg().moundDistanceFt;
    pitchFlightSpeedRef.current = diffCfg.pitchFlightBase * (0.7 + 0.3 * speed) * pitchSpeedFactor * moundRatio;

    const brkMul = DIFFICULTY_CONFIGS[storeRef.current.settings.difficulty].breakMultiplier;
    const handSign = storeRef.current.settings.pitcherHand === 'left' ? -1 : 1;
    pitchBreakRef.current = { x: config.breakX * 0.02 * brkMul * handSign, y: config.breakY * 0.01 * brkMul };
    const pz = sceneRef.current?.getPitcherZ() ?? -6.4;
    pitchStartRef.current = { x: 0, y: 1.05, z: pz };
    pitchProgressRef.current = 0;

    currentPitchTypeRef.current = pitchType;
    if (pitchType === PitchType.Knuckleball) {
      const rp = () => Math.random() * Math.PI * 2;
      const chaos = Math.random();
      const freqSpread = chaos < 0.3 ? 0.8 : chaos < 0.6 ? 1.6 : 3.0;
      const rf = (base: number) => base + (Math.random() - 0.5) * freqSpread;
      const ampRange = chaos < 0.3 ? 0.7 : chaos < 0.6 ? 1.2 : 2.0;
      const driftMag = chaos < 0.3 ? 0.28 : chaos < 0.6 ? 0.22 : 0.40;
      knucklePhaseRef.current = {
        px: [rp(), rp(), rp(), rp(), rp()],
        py: [rp(), rp(), rp(), rp(), rp()],
        fx: [rf(1.8), rf(3.1), rf(4.7), rf(6.3), rf(8.1)],
        fy: [rf(1.5), rf(2.9), rf(4.3), rf(5.9), rf(7.7)],
        ampScale: 0.6 + Math.random() * ampRange,
        driftX: (Math.random() - 0.5) * 2 * driftMag,
        driftY: (Math.random() - 0.5) * 2 * driftMag,
        driftPhase: Math.random() * Math.PI * 2,
        chaos,
      };
    } else {
      knucklePhaseRef.current = null;
    }

    localBallRef.current = {
      position3D: traj.startPos, velocity3D: traj.velocity,
      screenPosition: project3Dto2D(traj.startPos),
      isInPlay: false, isLanded: false, landingPosition: null, heldByFielder: null,
    };
  }

  /* --- pitching (windup -> release -> ball flight) --- */

  function handlePitching(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>, dt: number) {
    const scene = sceneRef.current;

    if (!ballReleasedRef.current) {
      if (scene) {
        const released = scene.updatePitcherAnimation(dt, 1.4);
        if (released && !ballReleasedRef.current) {
          ballReleasedRef.current = true;
          const rp = scene.getPitcherReleasePos();
          pitchStartRef.current = { x: rp.x, y: rp.y, z: rp.z };
          prevBall3DRef.current.set(rp.x, rp.y, rp.z);
        }
      }
      return;
    }

    // PvP pitcher: ball already past catcher, keep polling for remote result
    if (isMP() && !s.isPlayerBatting && !localBallRef.current) {
      consumeRemoteAtBatResult();
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
      if (knucklePhaseRef.current) {
        const w = knuckleWobble(pitchProgressRef.current, knucklePhaseRef.current);
        p3d.x += w.dx;
        p3d.y += w.dy;
      }
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

      if (buntingRef.current && s.isPlayerBatting && !hasSwungRef.current) {
        const buntCol = scene.checkBuntBallCollision(p3d);
        if (buntCol.hit) {
          processBuntHit(s, scene, buntCol.contactPoint);
          return;
        }
      }

      if (tryBatCollision(s, scene, p3d)) return;

      if (!s.isPlayerBatting && !isMP()) {
        tryAISwing(s, scene, p3d);
      }

      if (isMP() && !s.isPlayerBatting && consumeRemoteAtBatResult()) return;

      if (p3d.z > -0.5 && p3d.z < 1.5 && !s.isPlayerBatting && !isMP()) {
        useGameStore.getState().setPhase(GamePhase.BatSwing);
        return;
      }

      const CATCHER_Z = 1.5;
      if (p3d.z > CATCHER_Z) {
        if (isMP() && !s.isPlayerBatting) {
          localBallRef.current = null;
          scene.hideBall();
          return;
        }
        if (chargingRef.current && s.isPlayerBatting) {
          chargingRef.current = false;
          scene.setChargeLevel(0);
        }
        if (hasSwungRef.current) {
          callStrikeOrBall(true);
        } else {
          if (buntingRef.current) {
            callStrikeOrBall(true);
          } else {
            callStrikeOrBall(pitchInZoneRef.current);
          }
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
    if (knucklePhaseRef.current) {
      const w = knuckleWobble(pitchProgressRef.current, knucklePhaseRef.current);
      p3d.x += w.dx;
      p3d.y += w.dy;
    }
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

    if (s.isPlayerBatting) {
      if (buntingRef.current && !hasSwungRef.current) {
        const buntCol = scene.checkBuntBallCollision(p3d);
        if (buntCol.hit) { processBuntHit(s, scene, buntCol.contactPoint); return; }
      }
    } else if (!isMP()) {
      tryAISwing(s, scene, p3d);
    }
    if (tryBatCollision(s, scene, p3d)) return;

    if (isMP() && !s.isPlayerBatting && consumeRemoteAtBatResult()) return;

    const CATCHER_Z = 1.5;
    if (p3d.z > CATCHER_Z) {
      if (isMP() && !s.isPlayerBatting) {
        localBallRef.current = null;
        scene.hideBall();
        return;
      }
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

  function forceHitType(base: PhysicsHitResult, target: HitType): PhysicsHitResult {
    const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    let launchDeg: number;
    let exitSpd: number;
    let q: number;

    switch (target) {
      case HitType.GroundBall:
        launchDeg = rand(-8, 3); exitSpd = rand(8, 14); q = rand(0.4, 0.7); break;
      case HitType.LineDrive:
        launchDeg = rand(8, 22); exitSpd = rand(14, 20); q = rand(0.7, 0.95); break;
      case HitType.FlyBall:
        launchDeg = rand(25, 40); exitSpd = rand(14, 20); q = rand(0.7, 0.9); break;
      case HitType.HomeRun:
        launchDeg = rand(26, 34); exitSpd = rand(20, 25); q = rand(0.85, 1.0); break;
      case HitType.PopUp:
        launchDeg = rand(50, 70); exitSpd = rand(5, 10); q = rand(0.3, 0.5); break;
      default:
        return base;
    }

    const launchRad = launchDeg * (Math.PI / 180);
    const spray = base.direction;
    const up = Math.sin(launchRad) * exitSpd;
    const horiz = Math.cos(launchRad) * exitSpd;
    const scale = 0.40;

    return {
      ...base,
      type: target === HitType.HomeRun ? HitType.FlyBall : target,
      exitSpeed: exitSpd,
      launchAngleDeg: launchDeg,
      contactQuality: q,
      velocity: {
        x: Math.sin(spray) * horiz * scale,
        y: -Math.cos(spray) * horiz * scale,
        z: up * scale,
      },
    };
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

    const { handle, tip } = scene.getBatWorldEndpoints();
    const batAxisH = new THREE.Vector3(tip.x - handle.x, 0, tip.z - handle.z);
    const batAxisHLen = batAxisH.length();
    if (batAxisHLen > 0.001) batAxisH.divideScalar(batAxisHLen);
    const perpH = new THREE.Vector3(-batAxisH.z, 0, batAxisH.x);
    const offsetH = new THREE.Vector3(
      ball3DRef.current.x - contactPoint.x, 0, ball3DRef.current.z - contactPoint.z,
    );
    const lateralOffset = offsetH.dot(perpH);

    let result = calculatePhysicsHit({
      batVelX: batVel.x, batVelY: batVel.y, batVelZ: batVel.z,
      ballVelX: ballVel.x, ballVelY: ballVel.y, ballVelZ: ballVel.z,
      contactT, contactQuality: quality, batAngleY: 0,
      verticalOffset: adjustedVertical, chargePower, lateralOffset,
    });

    const forcedType = storeRef.current.practiceHitType;
    if (storeRef.current.practiceMode && !s.isPlayerBatting && forcedType) {
      result = forceHitType(result, forcedType);
    }

    hitTypeRef.current = result.type;
    const isPractice = storeRef.current.practiceMode;

    showPitchInfo();

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

    // PvP batter: emit at_bat_result for the hit
    if (isMP() && s.isPlayerBatting) {
      getSocket().emit('at_bat_result', {
        type: result.type === HitType.Foul ? 'foul' as const : 'hit' as const,
        hitData: {
          hitType: result.type,
          exitVelocity: result.velocity,
          launchAngle: result.launchAngleDeg,
          contactPoint: { x: contactPoint.x, y: contactPoint.y, z: contactPoint.z },
          chargePower,
          isBunt: false,
        },
      });
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

    scene.clearTrail();
    scene.setTrailColor('flight');
    hitCameraHoldRef.current = 0.6;
    practiceTimerRef.current = 0;

    if (isPractice) {
      useGameStore.getState().setPhase(GamePhase.BallInPlay);
      return;
    }

    sceneRef.current?.setBatterVisible(false);

    const newRunner = createRunner(0);
    const allRunners = [...s.runners, newRunner];
    const advanced = advanceRunners(allRunners, result.type);
    const gs = useGameStore.getState();
    gs.addRunner(newRunner);
    for (const r of advanced) gs.updateRunner(r.id, { targetBase: r.targetBase, startBase: r.startBase });
    gs.resetCount();
    gs.setPhase(GamePhase.BallInPlay);
  }

  function processBuntHit(
    s: ReturnType<typeof useGameStore.getState>,
    scene: ThreeScene,
    contactPoint: THREE.Vector3,
  ) {
    const ballVel = pitchBallVelRef.current;
    const verticalOffset = ball3DRef.current.y - contactPoint.y;

    const { handle, tip } = scene.getBatWorldEndpoints();
    const batAxisH = new THREE.Vector3(tip.x - handle.x, 0, tip.z - handle.z);
    const batAxisHLen = batAxisH.length();
    if (batAxisHLen > 0.001) batAxisH.divideScalar(batAxisHLen);
    const perpH = new THREE.Vector3(-batAxisH.z, 0, batAxisH.x);
    const offsetH = new THREE.Vector3(
      ball3DRef.current.x - contactPoint.x, 0, ball3DRef.current.z - contactPoint.z,
    );
    const lateralOffset = offsetH.dot(perpH);

    const result = calculateBuntHit(ballVel.x, ballVel.y, ballVel.z, verticalOffset, lateralOffset);

    hitTypeRef.current = result.type;
    hasSwungRef.current = true;
    const isPractice = storeRef.current.practiceMode;

    // PvP batter: emit at_bat_result for bunt hit
    if (isMP() && s.isPlayerBatting) {
      getSocket().emit('at_bat_result', {
        type: result.type === HitType.Foul ? 'foul' as const : 'hit' as const,
        hitData: {
          hitType: result.type,
          exitVelocity: result.velocity,
          launchAngle: result.launchAngleDeg,
          contactPoint: { x: contactPoint.x, y: contactPoint.y, z: contactPoint.z },
          chargePower: 0,
          isBunt: true,
        },
      });
    }

    if (isPractice) {
      setHitDebug({
        exitSpeed: result.exitSpeed,
        launchAngle: result.launchAngleDeg,
        sprayAngle: result.sprayAngleDeg,
        contactQuality: result.contactQuality,
        chargePower: 0,
        hitType: result.type,
        distance: 0,
      });
      if (s.isPlayerBatting) {
        setPracticeStats((p) => ({
          ...p, swings: p.swings + 1,
          hits: result.type !== HitType.Foul ? p.hits + 1 : p.hits,
          fouls: result.type === HitType.Foul ? p.fouls + 1 : p.fouls,
        }));
      }
    }

    if (result.type === HitType.Foul) {
      showAnnouncement('FOUL BUNT', 0.8);
      if (!isPractice && s.count.strikes < 2) useGameStore.getState().advanceCount('strike');
      localBallRef.current = null;
      scene.hideBall();
      goToPrePitch();
      return;
    }

    showAnnouncement('BUNT!', 1.2);

    const buntHeight = Math.max(8, ball3DRef.current.y * 28);
    localBallRef.current = {
      ...localBallRef.current!,
      position3D: { x: HOME_PLATE.x, y: HOME_PLATE.y, z: buntHeight },
      velocity3D: result.velocity,
      isInPlay: true, isLanded: false, landingPosition: null, heldByFielder: null,
    };

    scene.clearTrail();
    scene.setTrailColor('flight');
    hitCameraHoldRef.current = 0.6;
    practiceTimerRef.current = 0;

    if (isPractice) {
      useGameStore.getState().setPhase(GamePhase.BallInPlay);
      return;
    }

    scene.setBatterVisible(false);

    const newRunner = createRunner(0);
    const allRunners = [...s.runners, newRunner];
    const advanced = advanceRunners(allRunners, result.type);
    const gs = useGameStore.getState();
    gs.addRunner(newRunner);
    for (const r of advanced) gs.updateRunner(r.id, { targetBase: r.targetBase, startBase: r.startBase });
    gs.resetCount();
    gs.setPhase(GamePhase.BallInPlay);
  }

  function handleHitByPitch() {
    localBallRef.current = null;
    sceneRef.current?.hideBall();
    showPitchInfo();
    if (isMP() && storeRef.current.isPlayerBatting) {
      getSocket().emit('at_bat_result', { type: 'hbp' });
    }
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
      const cfg = getEffectivePitchConfig(pitchInfoRef.current.type);
      const hasProfile = !!aiRef.current?.getProfile();
      const spdMul = hasProfile ? 1.0 : DIFFICULTY_CONFIGS[storeRef.current.settings.difficulty].pitchSpeedMultiplier;
      const mph = Math.round(cfg.baseSpeed * spdMul * pitchInfoRef.current.speed);
      setPitchInfoDisplay(`${cfg.label}  ${mph} mph`);
      pitchInfoRef.current = null;
      if (pitchInfoTimerRef.current) clearTimeout(pitchInfoTimerRef.current);
      const duration = storeRef.current.practiceMode ? 2500 : 1200;
      pitchInfoTimerRef.current = setTimeout(() => setPitchInfoDisplay(null), duration);
    }
  }

  function showSplash(type: 'strike' | 'ball' | 'strikeout') {
    if (!storeRef.current.settings.showStrikeoutImage) return;
    const profile = aiRef.current?.getProfile();

    let images: string[];
    let text: string;
    let textColor: string;
    let bgOpacity: string;
    let duration: number;

    if (type === 'strikeout') {
      images = profile?.strikeoutImages?.length ? profile.strikeoutImages : DEFAULT_STRIKEOUT_IMAGES;
      text = 'STRIKE OUT';
      textColor = '#ff3333';
      bgOpacity = 'bg-black/60';
      duration = 1500;
    } else if (type === 'strike') {
      images = DEFAULT_STRIKE_IMAGES;
      text = 'STRIKE!';
      textColor = '#ff8800';
      bgOpacity = 'bg-black/30';
      duration = 800;
    } else {
      images = DEFAULT_BALL_IMAGES;
      text = 'BALL';
      textColor = '#33aaff';
      bgOpacity = 'bg-black/30';
      duration = 800;
    }

    const src = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : null;
    setSplashData({ src, text, textColor, bgOpacity });
    if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    splashTimerRef.current = setTimeout(() => setSplashData(null), duration);
  }

  function getSwingMissFeedback(): string | null {
    if (!hasSwungRef.current) return null;
    if (buntingRef.current) return null;

    const ballZ = swingBallZRef.current;
    const closestDist = swingClosestDistRef.current;

    // Close miss — timing was decent, position was off
    if (closestDist < 0.35) return '差一點！位置稍偏 Just missed!';

    // Determine timing based on ball Z when swing started
    // Ball travels from pitcher (~-6.4) toward catcher (~1.5), plate at z=0
    // Ideal swing start: ball around z = -1.5 to -0.3 (gives swing time to connect)
    if (ballZ < -2.5) return '揮棒過快 Too early!';
    if (ballZ > -0.2) return '揮棒過慢 Too late!';

    return '瞄準位置偏了 Aim was off!';
  }

  function callStrikeOrBall(inZone: boolean) {
    const gs = useGameStore.getState();
    const isStrike = inZone || hasSwungRef.current;
    const willStrikeOut = isStrike && gs.count.strikes >= 2;
    const willWalk = !inZone && !hasSwungRef.current && gs.count.balls >= 3;
    const swingFeedback = gs.isPlayerBatting ? getSwingMissFeedback() : null;

    if (isMP() && gs.isPlayerBatting) {
      getSocket().emit('at_bat_result', {
        type: isStrike ? 'strike' : 'ball',
      });
    }

    if (willStrikeOut) {
      showSplash('strikeout');
    } else {
      showSplash(isStrike ? 'strike' : 'ball');
    }

    if (storeRef.current.practiceMode) {
      const isBattingPractice = gs.isPlayerBatting;
      if (isBattingPractice) {
        const base = isStrike ? 'STRIKE!' : 'BALL';
        showAnnouncement(swingFeedback ? `${base}\n${swingFeedback}` : base, swingFeedback ? 1.5 : 0.8);
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
          strikes: isStrike ? p.strikes + 1 : p.strikes,
          balls: !isStrike ? p.balls + 1 : p.balls,
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
      const base = `STRIKEOUT!  ${outCountText(gs.outs + 1)}`;
      showAnnouncement(swingFeedback ? `${base}\n${swingFeedback}` : base, 1.5);
      gs.advanceCount('strike');
    } else if (willWalk) {
      showAnnouncement('BALL 4 — WALK', 1.0);
      gs.advanceCount('ball');
    } else {
      const base = inZone || hasSwungRef.current ? 'STRIKE!' : 'BALL';
      showAnnouncement(swingFeedback ? `${base}\n${swingFeedback}` : base, swingFeedback ? 1.5 : 0.8);
      gs.advanceCount(inZone || hasSwungRef.current ? 'strike' : 'ball');
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
    swingBallZRef.current = Infinity;
    swingClosestDistRef.current = Infinity;
    ballLandedTrailRef.current = false;
    deadBallRef.current = false;
    chargingRef.current = false;
    chargePowerRef.current = 0;
    buntingRef.current = false;
    sceneRef.current?.setChargeLevel(0);
    sceneRef.current?.setBunting(false);
    sceneRef.current?.resetPitcherAnimation();
    sceneRef.current?.clearTrail();
    sceneRef.current?.setBatterVisible(true);
    useGameStore.getState().resetForNewPitch();

    const accuracy = aiRef.current?.getDifficultyConfig().aiSwingAccuracy ?? 0.5;
    const noiseScale = (1 - accuracy) * 0.12;
    aiBatNoiseRef.current = {
      x: (Math.random() - 0.5) * noiseScale,
      y: (Math.random() - 0.5) * noiseScale,
    };
    const startY = 0.4 + Math.random() * 0.25;
    aiBatPosRef.current = { x: 0.45 + Math.random() * 0.10, y: startY };

    const perfectMode = storeRef.current.practiceMode && storeRef.current.practiceHitType != null;
    aiSwingTimingRef.current = perfectMode ? 0 : ((Math.random() - 0.5) * 2);
    aiChargePowerRef.current = perfectMode ? 1.0 : (0.45 + accuracy * 0.4 + (Math.random() - 0.5) * 0.3);
    aiChargePowerRef.current = Math.max(0.3, Math.min(1, aiChargePowerRef.current));

    remoteBatTargetRef.current = { normX: 0.5, normY: 0.5, boxX: 0, boxZ: 0, bunting: false };
    remoteBatCurrentRef.current = { normX: 0.5, normY: 0.5, boxX: 0, boxZ: 0 };
    remoteBuntActiveRef.current = false;
  }

  /* --- baserunning controls (player batting) / AI baserunning --- */

  function handleBaserunning(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>) {
    const gs = useGameStore.getState();
    if (s.isPlayerBatting) {
      const goKey = inp.keysPressed.has('f') || inp.keysPressed.has('arrowup');
      const backKey = inp.keysPressed.has('g') || inp.keysPressed.has('arrowdown');
      if (goKey) {
        const adv = sendRunnersForward(gs.runners);
        for (const r of adv) gs.updateRunner(r.id, { targetBase: r.targetBase });
      }
      if (backKey) {
        const retreated = retreatRunners(gs.runners);
        for (const r of retreated) gs.updateRunner(r.id, { targetBase: r.targetBase });
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

  function checkFieldingOuts(): boolean {
    if (!localBallRef.current) return false;
    const gs = useGameStore.getState();
    const out = findFieldingOut(gs.runners, gs.fielders, localBallRef.current.heldByFielder);
    if (!out) return false;

    gs.updateRunner(out.runnerId, { isOut: true });
    gs.removeRunner(out.runnerId);
    sceneRef.current?.removeRunner(out.runnerId);
    const newOuts = gs.outs + 1;
    const label = out.kind === 'tag' ? 'TAG OUT!' : 'FORCE OUT!';
    showAnnouncement(`${label}  ${outCountText(newOuts)}`, 1.2);
    gs.recordOutInPlay();
    if (isMP()) emitPlayResolved('out');
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
    if (!localBallRef.current) {
      const gs = useGameStore.getState();
      if (gs.runners.length === 0) {
        if (storeRef.current.practiceMode) { goToPrePitch(); return; }
        phaseTimerRef.current += dt;
        if (phaseTimerRef.current > 2.0) { goToPrePitch(); gs.resetFielders(); }
      } else {
        // Ground rule double / home run with runners still moving:
        // wait for all runners to reach their target, then advance to next at-bat.
        const settled = gs.runners.every((r) => r.currentBase === r.targetBase || r.isOut);
        if (settled) {
          phaseTimerRef.current += dt;
          if (phaseTimerRef.current > 1.5) { goToPrePitch(); gs.resetFielders(); }
        }
      }
      return;
    }
    const fc = getFieldCfg();
    localBallRef.current = fieldBallPhysics(localBallRef.current, dt, fc.wallRadiusGU, fc.wallHeightGU);

    if (storeRef.current.practiceMode) {
      practiceTimerRef.current += dt;
      const ball = localBallRef.current;

      if ((ball.hitWall || ball.bounceOverWall) && hitTypeRef.current !== HitType.HomeRun && hitTypeRef.current !== HitType.LineDrive) {
        if (!isFoulTerritory(ball.position3D.x, ball.position3D.y)) {
          if (ball.hitWall) {
            hitTypeRef.current = HitType.HomeRun;
            showAnnouncement('HOME RUN!', 2.5);
            if (storeRef.current.isPlayerBatting) {
              setPracticeStats((p) => ({ ...p, homeRuns: p.homeRuns + 1 }));
            }
            setHitDebug((prev) => prev ? { ...prev, hitType: HitType.HomeRun } : prev);
          } else {
            hitTypeRef.current = HitType.LineDrive;
            showAnnouncement('GROUND RULE DOUBLE!', 2.0);
            setHitDebug((prev) => prev ? { ...prev, hitType: HitType.LineDrive } : prev);
          }
        }
      }

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
      if (stopped || practiceTimerRef.current > 6 || (ball.clearedWall && practiceTimerRef.current > 2.5)) {
        goToPrePitch();
      }
      return;
    }

    if (localBallRef.current.hitWall || localBallRef.current.bounceOverWall) {
      const bp = localBallRef.current.position3D;
      if (isFoulTerritory(bp.x, bp.y)) {
        hitTypeRef.current = HitType.Foul;
        showAnnouncement('FOUL', 0.8);
        const gs = useGameStore.getState();
        if (gs.count.strikes < 2) gs.advanceCount('strike');
        for (const r of gs.runners) { gs.removeRunner(r.id); sceneRef.current?.removeRunner(r.id); }
        localBallRef.current = null;
        sceneRef.current?.hideBall();
        goToPrePitch();
        return;
      }

      if (localBallRef.current.hitWall) {
        hitTypeRef.current = HitType.HomeRun;
        showAnnouncement('HOME RUN!', 2.5);
        sceneRef.current?.hideBall();
        localBallRef.current = null;
        phaseTimerRef.current = 0;
        deadBallRef.current = true;
        if (storeRef.current.practiceMode && storeRef.current.isPlayerBatting) {
          setPracticeStats((p) => ({ ...p, homeRuns: p.homeRuns + 1 }));
        }
        const gs = useGameStore.getState();
        for (const runner of gs.runners) {
          gs.updateRunner(runner.id, { targetBase: BaseType.Home });
        }
      } else {
        hitTypeRef.current = HitType.LineDrive;
        showAnnouncement('GROUND RULE DOUBLE!', 2.0);
        sceneRef.current?.hideBall();
        localBallRef.current = null;
        phaseTimerRef.current = 0;
        deadBallRef.current = true;
        const gs = useGameStore.getState();
        for (const runner of gs.runners) {
          const cur = runner.currentBase;
          let target: BaseType;
          if (cur === BaseType.Third || cur === BaseType.Second) target = BaseType.Home;
          else if (cur === BaseType.First) target = BaseType.Third;
          else target = BaseType.Second;
          gs.updateRunner(runner.id, { targetBase: target });
        }
      }
      return;
    }

    handleBaserunning(s, inp);
    if (isMP()) {
      handleAutoDefense(s, dt, time);
      if (!s.isPlayerBatting) {
        handlePlayerThrows(s, inp);
      } else {
        applyRemoteThrowCommands(s);
      }
    } else if (!s.isPlayerBatting) {
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

          const batterRunner = gs.runners.find((r) => r.startBase === 0);
          if (batterRunner) {
            gs.removeRunner(batterRunner.id);
            sceneRef.current?.removeRunner(batterRunner.id);
          }
          for (const r of gs.runners) {
            if (r.startBase !== 0) {
              gs.updateRunner(r.id, { targetBase: r.startBase as BaseType });
            }
          }

          const newOuts = gs.outs + 1;
          showAnnouncement(`CAUGHT! OUT!  ${outCountText(newOuts)}`, 1.2);
          gs.recordOut();
          if (isMP()) emitPlayResolved('out');
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
    if (isMP()) {
      handleAutoDefense(s, dt, time);
      if (!s.isPlayerBatting) {
        handlePlayerThrows(s, inp);
      } else {
        applyRemoteThrowCommands(s);
      }
    } else if (!s.isPlayerBatting) {
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

  function checkWalkOff(): boolean {
    const gs = useGameStore.getState();
    const { inning, settings, score } = gs;
    if (inning.isTop || inning.number < settings.totalInnings) return false;
    if (score.home > score.away) {
      showAnnouncement('WALK-OFF!', 2.5);
      deadBallRef.current = true;
      localBallRef.current = null;
      sceneRef.current?.hideBall();
      useGameStore.setState({ phase: GamePhase.GameOver });
      return true;
    }
    return false;
  }

  function updateRunnersOnField(s: ReturnType<typeof useGameStore.getState>, dt: number) {
    const gs = useGameStore.getState();
    for (const runner of s.runners) {
      if (runner.isOut) continue;
      const updated = updateRunnerMovement(runner, dt);
      gs.updateRunner(runner.id, { position: updated.position, currentBase: updated.currentBase });
      if (checkRunnerScored(updated)) {
        gs.scoreRun(s.inning.isTop ? 'away' : 'home');
        gs.removeRunner(runner.id);
        sceneRef.current?.removeRunner(runner.id);
        if (checkWalkOff()) return;
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

  function handlePlayerThrows(s: ReturnType<typeof useGameStore.getState>, inp: ReturnType<InputManager['getState']>) {
    const holder = s.fielders.find((f) => f.hasBall);
    if (!holder || !localBallRef.current) return;

    const baseKeys: [string, Vec2][] = [
      ['z', FIRST_BASE], ['x', SECOND_BASE], ['c', THIRD_BASE], ['v', HOME_PLATE],
    ];
    for (const [key, basePos] of baseKeys) {
      if (inp.keysPressed.has(key)) {
        doThrowToBase(basePos, s);
        if (isMP()) {
          const baseIdx = baseKeys.findIndex(([k]) => k === key);
          getSocket().emit('throw_command', { fromFielderId: holder.id, toBase: baseIdx + 1, throwTarget: basePos });
        }
        return;
      }
    }

    for (const key of inp.keysPressed) {
      const num = parseInt(key);
      if (num >= 1 && num <= 9) {
        const target = s.fielders.find((f) => f.id === num);
        if (target && target.id !== holder.id) {
          const gs = useGameStore.getState();
          doThrow(holder.id, target, gs);
          if (isMP()) {
            getSocket().emit('throw_command', { fromFielderId: holder.id, toBase: target.id, throwTarget: target.location });
          }
          return;
        }
      }
    }
  }

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

  const walkRunnersDispatchedRef = useRef(false);

  function handleRunnersAdvance(s: ReturnType<typeof useGameStore.getState>, dt: number) {
    if (storeRef.current.practiceMode) { goToPrePitch(); return; }
    phaseTimerRef.current += dt;
    if (!announcementRef.current) showAnnouncement('WALK', 0.9);

    if (!walkRunnersDispatchedRef.current && phaseTimerRef.current > 1.5) {
      walkRunnersDispatchedRef.current = true;
      const gs = useGameStore.getState();
      const onFirst = gs.runners.some((r) => r.currentBase === BaseType.First);
      const onSecond = gs.runners.some((r) => r.currentBase === BaseType.Second);
      for (const runner of gs.runners) {
        if (runner.currentBase === BaseType.Third && onFirst && onSecond) {
          gs.scoreRun(s.inning.isTop ? 'away' : 'home'); gs.removeRunner(runner.id);
        } else if (runner.currentBase === BaseType.Second && onFirst) {
          gs.updateRunner(runner.id, { targetBase: BaseType.Third });
        } else if (runner.currentBase === BaseType.First) {
          gs.updateRunner(runner.id, { targetBase: BaseType.Second });
        }
      }
      const nr = createRunner(0); gs.addRunner(nr); gs.updateRunner(nr.id, { targetBase: BaseType.First });
      sceneRef.current?.setBatterVisible(false);
    }

    if (walkRunnersDispatchedRef.current) {
      const fresh = useGameStore.getState();
      const allSettled = fresh.runners.every((r) => r.currentBase === r.targetBase || r.isOut);
      if (allSettled) {
        walkRunnersDispatchedRef.current = false;
        if (!checkWalkOff()) goToPrePitch();
      }
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
      buntingRef.current = false; chargingRef.current = false; chargePowerRef.current = 0;
      deadBallRef.current = false; ballLandedTrailRef.current = false;
      sceneRef.current?.setChargeLevel(0); sceneRef.current?.setBunting(false);
      sceneRef.current?.clearRunners(); sceneRef.current?.resetPitcherAnimation(); sceneRef.current?.clearTrail();
      if (isMP()) {
        const mpStore = useMultiplayerStore.getState();
        mpStore.setIsLocalBatting(!mpStore.isLocalBatting);
        mpStore.clearRemoteThrowCommands();
        mpStore.setRemotePitch(null);
        mpStore.setRemoteAtBatResult(null);
      }
      useGameStore.getState().nextHalfInning();
      sceneRef.current?.resetBatter();
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

  /* =========== MAIN UPDATE =========== */

  const update = useCallback((dt: number, time: number) => {
    if (!sceneRef.current || !storeRef.current.gameStarted) return;
    if (introRef?.current) return;
    if (showBattingTutorialRef.current) return;
    if (windowHiddenRef.current) return;
    if (pausedRef.current) return;
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
      } else if (isMP()) {
        handleRemoteBatterTracking(dt);
      } else {
        handleAIBatTracking(s, dt);
      }

      const canSwingPhase = s.phase === GamePhase.Pitching
        || s.phase === GamePhase.BatSwing
        || s.phase === GamePhase.PrePitch;

      if (s.isPlayerBatting && canSwingPhase && !scene.isSwinging() && !buntingRef.current) {
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
          swingBallZRef.current = ball3DRef.current.z;
          swingClosestDistRef.current = Infinity;
          chargingRef.current = false;
          scene.setChargeLevel(0);
          if (isMP()) {
            getSocket().emit('batter_swing', { chargePower: chargePowerRef.current, swingSpeedMul: swingMul });
          }
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

    if (storeRef.current.practiceMode && inp.keysPressed.has('r')) {
      resetPitchState();
      localBallRef.current = null;
      sceneRef.current?.hideBall();
      sceneRef.current?.resetBatter();
      sceneRef.current?.switchToBattingView(true);
      announcementRef.current = null;
      announcementTimerRef.current = 0;
      setHitDebug(null);
      practiceTimerRef.current = 0;
      rResetRef.current = true;
      goToPrePitch();
      return;
    }

    if (isMP()) {
      consumeRemotePlayResolved();
      consumeRemoteStateSync();
    }

    const phase = storeRef.current.phase;
    switch (phase) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========== RENDER =========== */

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
      const mp = useMultiplayerStore.getState();
      scene.setTeamSides(s.isPlayerBatting, mp.isMultiplayer, mp.isHost);
      scene.setPitchingCentered(!s.isPlayerBatting);
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
      && s.phase !== GamePhase.GameOver && s.phase !== GamePhase.HalfInningEnd
      && !hasSwungRef.current && !buntingRef.current;
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
      const cfg = getEffectivePitchConfig(s.selectedPitch!);
      const bm = DIFFICULTY_CONFIGS[s.settings.difficulty].breakMultiplier;
      const dc = DIFFICULTY_CONFIGS[s.settings.difficulty];
      const moundRatio = 60.5 / getFieldCfg().moundDistanceFt;
      const estFlightSpeed = dc.pitchFlightBase * 0.85 * (cfg.baseSpeed / 95) * moundRatio;
      const hs = s.settings.pitcherHand === 'left' ? -1 : 1;
      scene.updatePitchTrajectory(true, cfg.breakX * 0.02 * bm * hs, cfg.breakY * 0.01 * bm, estFlightSpeed);
    } else {
      scene.updatePitchTrajectory(false, 0, 0);
    }

    if (localBallRef.current) {
      const ball = localBallRef.current;
      if (ball.isInPlay) {
        if (ball.isLanded && !ballLandedTrailRef.current) {
          ballLandedTrailRef.current = true;
          scene.setTrailColor('landed');
        }
        if (ball.heldByFielder !== null) {
          const holder = s.fielders.find((f) => f.id === ball.heldByFielder);
          if (holder) {
            scene.updateBallFromGameCoords(holder.location.x, holder.location.y, 5);
          } else {
            scene.updateBallFromGameCoords(ball.position3D.x, ball.position3D.y, ball.position3D.z);
          }
        } else {
          scene.updateBallFromGameCoords(ball.position3D.x, ball.position3D.y, ball.position3D.z);
        }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========== UI handlers =========== */

  const handlePitchSelect = (pitch: PitchType) => {
    if (storeRef.current.isPlayerBatting || pausedRef.current) return;
    useGameStore.getState().selectPitch(pitch);
  };

  const handleAccuracyLock = (value: number) => {
    if (storeRef.current.isPlayerBatting || pausedRef.current) return;
    useGameStore.getState().setAccuracyValue(value);
  };

  const handleSpeedLock = (value: number) => {
    if (storeRef.current.isPlayerBatting || pausedRef.current) return;
    const s = useGameStore.getState();
    if (!s.selectedPitch || !s.pitchAimPos || s.accuracyValue === null) return;
    resetPitchState();
    useGameStore.getState().setSpeedBarValue(value);
    preparePitchPrecise(s.selectedPitch, s.pitchAimPos.x, s.pitchAimPos.y, s.accuracyValue, value, false);
    pitchInfoRef.current = { type: s.selectedPitch, speed: value };
    windupStartedRef.current = true;

    // PvP: emit pitch_committed so remote batter sees the same pitch
    if (isMP()) {
      getSocket().emit('pitch_committed', {
        pitchType: s.selectedPitch,
        targetCell: s.targetCell ?? -1,
        aimX: s.pitchAimPos.x,
        aimY: s.pitchAimPos.y,
        accuracy: s.accuracyValue,
        speed: value,
      });
    }

    if (storeRef.current.practiceMode) {
      setPitchPracticeStats((p) => ({ ...p, pitches: p.pitches + 1 }));
      const cfg = getEffectivePitchConfig(s.selectedPitch);
      setLastPitchResult({
        type: cfg.label,
        speed: Math.round(value * 100),
        accuracy: Math.round(s.accuracyValue! * 100),
        result: '...',
      });
    }
    useGameStore.getState().setPhase(GamePhase.Pitching);
  };

  const handlePlayAgain = () => {
    localBallRef.current = null;
    aiPitchFiredRef.current = false;
    phaseTimerRef.current = 0;
    hitCameraHoldRef.current = 0;
    sceneRef.current?.clearRunners();
    sceneRef.current?.resetPitcherAnimation();
    sceneRef.current?.clearTrail();
    sceneRef.current?.resetBatter();
  };

  return {
    update,
    render,
    phaseTimerRef,
    chargeBarRef,
    chargeInnerRef,
    announcementRef,
    hasSwungRef,
    ballReleasedRef,
    buntingRef,
    deadBallRef,
    pitchInfoTimerRef,
    hitDebug,
    practiceStats,
    pitchPracticeStats,
    lastPitchResult,
    pitchInfoDisplay,
    splashData,
    splashTimerRef,
    handlePitchSelect,
    handleAccuracyLock,
    handleSpeedLock,
    handlePlayAgain,
  };
}
