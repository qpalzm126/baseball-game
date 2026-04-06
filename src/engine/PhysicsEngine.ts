import { BallState, PitchConfig, Vec2, Vec3, HitType } from '@/game/types';
import { BALL_GRAVITY, BALL_DRAG, BATTING_VIEW, HOME_PLATE } from '@/game/constants';
import { project3Dto2D, randomRange } from '@/utils/math';

/* ======= pitch trajectory (2D legacy for AI/screen projection) ======= */

export function createPitchTrajectory(
  config: PitchConfig,
  speedMultiplier: number,
  targetCell: number,
): { startPos: Vec3; velocity: Vec3 } {
  const sz = BATTING_VIEW.strikeZone;
  const col = targetCell % 3;
  const row = Math.floor(targetCell / 3);
  const cellW = sz.width / 3;
  const cellH = sz.height / 3;
  const targetX = sz.x + col * cellW + cellW / 2 + randomRange(-10, 10);
  const targetY = sz.y + row * cellH + cellH / 2 + randomRange(-10, 10);
  const startPos: Vec3 = { x: 450, y: BATTING_VIEW.pitcherY, z: 120 };
  const speed = config.baseSpeed * speedMultiplier * 0.055;
  const flightFrames = 45;
  const dx = (targetX - startPos.x) / flightFrames + config.breakX * 0.15;
  const dy = speed;
  const dz = -startPos.z / flightFrames - 0.3;
  return { startPos, velocity: { x: dx, y: dy, z: dz } };
}

export interface PitchZoneResult {
  wasInZone: boolean;
  screenXAtPlate: number;
  screenYAtPlate: number;
}

export function checkPitchCrossedPlate(
  prev: BallState,
  curr: BallState,
): PitchZoneResult | null {
  const plateY = BATTING_VIEW.plateY;
  if (prev.screenPosition.y < plateY && curr.screenPosition.y >= plateY) {
    const t = (plateY - prev.screenPosition.y) / (curr.screenPosition.y - prev.screenPosition.y);
    const crossX = prev.screenPosition.x + (curr.screenPosition.x - prev.screenPosition.x) * t;
    const sz = BATTING_VIEW.strikeZone;
    const wasInZone = crossX >= sz.x && crossX <= sz.x + sz.width && plateY >= sz.y && plateY <= sz.y + sz.height;
    return { wasInZone, screenXAtPlate: crossX, screenYAtPlate: plateY };
  }
  return null;
}

export function updateBallPhysics(ball: BallState, dt: number): BallState {
  const step = dt * 60;
  const newVel: Vec3 = {
    x: ball.velocity3D.x * BALL_DRAG,
    y: ball.velocity3D.y * BALL_DRAG,
    z: ball.velocity3D.z - BALL_GRAVITY * step * 0.3,
  };
  const newPos: Vec3 = {
    x: ball.position3D.x + newVel.x * step,
    y: ball.position3D.y + newVel.y * step,
    z: Math.max(0, ball.position3D.z + newVel.z * step),
  };
  return { ...ball, position3D: newPos, velocity3D: newVel, screenPosition: project3Dto2D(newPos) };
}

/* ======= physics-based hit from 3D contact ======= */

export interface PhysicsContact {
  batVelX: number; batVelY: number; batVelZ: number;
  ballVelX: number; ballVelY: number; ballVelZ: number;
  contactT: number;
  contactQuality: number;
  batAngleY: number;
  /** ball.y − bat.y at contact: positive = ball above bat → fly ball */
  verticalOffset: number;
  /** 0‑1 charge power: tap = 0.3, full hold = 1.0 */
  chargePower: number;
}

export interface PhysicsHitResult {
  type: HitType;
  velocity: Vec3;
  direction: number;
  exitSpeed: number;
  launchAngleDeg: number;
  sprayAngleDeg: number;
  contactQuality: number;
}

export function calculatePhysicsHit(contact: PhysicsContact): PhysicsHitResult {
  const batSpeed = Math.sqrt(contact.batVelX ** 2 + contact.batVelY ** 2 + contact.batVelZ ** 2);
  const pitchSpeed = Math.sqrt(contact.ballVelX ** 2 + contact.ballVelY ** 2 + contact.ballVelZ ** 2);
  const q = contact.contactQuality;
  const powerMul = 0.5 + 0.5 * contact.chargePower;

  const exitSpeed = (batSpeed * 1.5 + pitchSpeed * 0.3) * (0.4 + 0.6 * q) * powerMul;

  const batDirX = batSpeed > 0.01 ? contact.batVelX / batSpeed : 0;
  const batDirY = batSpeed > 0.01 ? contact.batVelY / batSpeed : 0;
  const batDirZ = batSpeed > 0.01 ? contact.batVelZ / batSpeed : -1;

  const vo = contact.verticalOffset;
  const batLift = batDirY * 0.6;
  const launchAngle = Math.atan2(vo * 12.0 + batLift + 0.12, 1.0) + randomRange(-0.08, 0.08);

  const sprayAngle = Math.atan2(batDirX, -batDirZ) + randomRange(-0.15, 0.15);

  const upSpeed = Math.sin(launchAngle) * exitSpeed;
  const horizSpeed = Math.cos(launchAngle) * exitSpeed;

  const vx = Math.sin(sprayAngle) * horizSpeed;
  const vy = -Math.cos(sprayAngle) * horizSpeed;
  const vz = upSpeed;

  let type: HitType;
  const clampedExit = Math.min(exitSpeed, 25);
  if (clampedExit > 14 && q > 0.7 && launchAngle > 0.25 && launchAngle < 0.8) {
    type = HitType.FlyBall;
  } else if (launchAngle > 0.45) {
    type = clampedExit > 8 ? HitType.FlyBall : HitType.PopUp;
  } else if (launchAngle < 0.05) {
    type = HitType.GroundBall;
  } else {
    type = HitType.LineDrive;
  }

  if (q < 0.25 && Math.random() < 0.4) type = HitType.Foul;

  const scaleFactor = 0.40;
  return {
    type,
    velocity: { x: vx * scaleFactor, y: vy * scaleFactor, z: vz * scaleFactor },
    direction: sprayAngle,
    exitSpeed,
    launchAngleDeg: launchAngle * (180 / Math.PI),
    sprayAngleDeg: sprayAngle * (180 / Math.PI),
    contactQuality: q,
  };
}

/* ======= bunt hit calc ======= */

export function calculateBuntHit(
  ballVelX: number, ballVelZ: number,
): PhysicsHitResult {
  const sprayAngle = randomRange(-0.65, 0.65);
  const exitSpeed = randomRange(2.5, 5.5);
  const launchAngle = randomRange(-0.05, 0.12);

  const up = Math.sin(launchAngle) * exitSpeed;
  const horiz = Math.cos(launchAngle) * exitSpeed;
  const scale = 0.40;

  const type = Math.random() < 0.15 ? HitType.PopUp : HitType.GroundBall;

  return {
    type,
    velocity: {
      x: Math.sin(sprayAngle) * horiz * scale,
      y: -Math.cos(sprayAngle) * horiz * scale,
      z: up * scale,
    },
    direction: sprayAngle,
    exitSpeed,
    launchAngleDeg: launchAngle * (180 / Math.PI),
    sprayAngleDeg: sprayAngle * (180 / Math.PI),
    contactQuality: randomRange(0.3, 0.6),
  };
}

/* ======= legacy hit calc (for AI) ======= */

export function calculateHitResult(
  contactY: number, timing: number, mouseVelX: number,
): { type: HitType; velocity: Vec3; direction: number } {
  const power = Math.min(Math.abs(mouseVelX) * 0.12 + 3, 8);
  const timingQuality = 1 - Math.abs(timing);
  const verticalContact = contactY - 0.5;
  let type: HitType;
  const isHRPower = timingQuality > 0.7 && power > 5;
  if (isHRPower) type = HitType.FlyBall;
  else if (verticalContact < -0.2) type = power > 3 ? HitType.FlyBall : HitType.PopUp;
  else if (verticalContact > 0.15) type = HitType.GroundBall;
  else type = HitType.LineDrive;
  if (Math.abs(timing) > 0.80 && Math.random() < 0.35) type = HitType.Foul;

  const pullAngle = timing * 0.9 + randomRange(-0.35, 0.35);
  const sprayAngle = pullAngle + verticalContact * 0.3;
  let launchH: number, fwdSpd: number, latMul: number;
  if (isHRPower && type !== HitType.Foul) {
    launchH = 7 + randomRange(0, 1.5); fwdSpd = 5.5 + randomRange(0, 1.5); latMul = 2.2;
  } else switch (type) {
    case HitType.FlyBall: launchH = 3 + randomRange(0, 1.5); fwdSpd = 3.8 + randomRange(0, 1.2); latMul = 2; break;
    case HitType.LineDrive: launchH = 1 + randomRange(0, 1); fwdSpd = 4.5 + randomRange(0, 1.5); latMul = 2.5; break;
    case HitType.GroundBall: launchH = 0.15 + randomRange(0, 0.3); fwdSpd = 3 + randomRange(0, 1.5); latMul = 2.8; break;
    case HitType.PopUp: launchH = 4 + randomRange(0, 1); fwdSpd = 1.5 + randomRange(0, 0.8); latMul = 1; break;
    default: launchH = 2 + randomRange(0, 1); fwdSpd = 2.5 + randomRange(0, 1); latMul = 3.5; break;
  }
  const speed = fwdSpd * timingQuality;
  const aiScale = 0.70;
  return {
    type,
    velocity: {
      x: Math.sin(sprayAngle) * speed * latMul * aiScale,
      y: (-Math.cos(sprayAngle * 0.4) * speed * 2.5 + randomRange(-0.5, 0.5)) * aiScale,
      z: launchH * timingQuality * aiScale,
    },
    direction: sprayAngle,
  };
}

/* ======= wall constants ======= */

const DEFAULT_WALL_RADIUS = 900;
const DEFAULT_WALL_HEIGHT = 42;
const WALL_BOUNCE = 0.45;

/* ======= fielding physics ======= */

export function fieldBallPhysics(
  ball: BallState,
  dt: number,
  wallRadius: number = DEFAULT_WALL_RADIUS,
  wallHeight: number = DEFAULT_WALL_HEIGHT,
): BallState {
  const step = dt * 60;
  let vx = ball.velocity3D.x;
  let vy = ball.velocity3D.y;
  let vz = ball.velocity3D.z;
  let px = ball.position3D.x;
  let py = ball.position3D.y;
  let pz = ball.position3D.z;
  let landed = ball.isLanded;
  let landPos = ball.landingPosition;

  const isRolling = landed && pz <= 0.01 && Math.abs(vz) < 0.1;

  if (isRolling) {
    vx *= 0.988;
    vy *= 0.988;
    vz = 0;
    pz = 0;
  } else {
    vx *= BALL_DRAG;
    vy *= BALL_DRAG;
    vz -= BALL_GRAVITY * step * 0.5;
  }

  px += vx * step;
  py += vy * step;
  pz += vz * step;

  if (pz <= 0 && ball.position3D.z > 0.01) {
    pz = 0;
    const bounceCoeff = landed ? 0.45 : 0.55;
    const reflected = Math.abs(vz) * bounceCoeff;

    if (!landed) {
      landed = true;
      landPos = { x: px, y: py };
    }

    if (reflected > 0.08) {
      vz = reflected;
      vx *= 0.94;
      vy *= 0.94;
    } else {
      vz = 0;
    }
  }

  pz = Math.max(0, pz);

  const dx = px - HOME_PLATE.x;
  const dy = py - HOME_PLATE.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist >= wallRadius && pz <= wallHeight) {
    const nx = dx / dist;
    const ny = dy / dist;
    const radialSpeed = vx * nx + vy * ny;

    if (radialSpeed > 0) {
      vx -= (1 + WALL_BOUNCE) * radialSpeed * nx;
      vy -= (1 + WALL_BOUNCE) * radialSpeed * ny;
      vx *= 0.75;
      vy *= 0.75;
      vz *= 0.6;

      px = HOME_PLATE.x + nx * (wallRadius - 2);
      py = HOME_PLATE.y + ny * (wallRadius - 2);
    }
  }

  const overWall = dist >= wallRadius && pz > wallHeight;
  return {
    ...ball,
    position3D: { x: px, y: py, z: pz },
    velocity3D: { x: vx, y: vy, z: vz },
    screenPosition: { x: px, y: py },
    isLanded: landed,
    landingPosition: landPos ?? ball.landingPosition,
    hitWall: overWall && !landed,
    bounceOverWall: overWall && landed,
  };
}

export function throwBall(from: Vec2, to: Vec2, speed: number): { velocity: Vec3 } {
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const norm = dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 0, y: -1 };
  return { velocity: { x: norm.x * speed, y: norm.y * speed, z: dist * 0.008 } };
}
