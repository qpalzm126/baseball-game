import { Fielder, Vec2 } from './types';
import { DIVE_DURATION, DIVE_COOLDOWN, DIVE_SPEED_MULTIPLIER, FIELDER_SPEED, HOME_PLATE } from './constants';
import { moveToward, distance } from '@/utils/math';

const DEFAULT_WALL_RADIUS = 890;

function clampInsideWall(loc: Vec2, wallRadius: number = DEFAULT_WALL_RADIUS): Vec2 {
  const dx = loc.x - HOME_PLATE.x;
  const dy = loc.y - HOME_PLATE.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= wallRadius) return loc;
  const scale = wallRadius / dist;
  return { x: HOME_PLATE.x + dx * scale, y: HOME_PLATE.y + dy * scale };
}

export function updateFielderMovement(fielder: Fielder, dt: number, now: number, wallRadius: number = DEFAULT_WALL_RADIUS): Fielder {
  let updated = { ...fielder };

  if (updated.isDiving && now > updated.diveEndTime) {
    updated.isDiving = false;
  }

  if (updated.targetLocation) {
    updated.targetLocation = clampInsideWall(updated.targetLocation, wallRadius);
    const speed = updated.isDiving
      ? updated.speed * DIVE_SPEED_MULTIPLIER
      : updated.speed;
    updated.location = moveToward(updated.location, updated.targetLocation, speed * dt * 60);
    if (distance(updated.location, updated.targetLocation) < 1) {
      updated.targetLocation = null;
    }
  }

  updated.location = clampInsideWall(updated.location, wallRadius);
  return updated;
}

export function setFielderTarget(fielder: Fielder, target: Vec2): Fielder {
  return { ...fielder, targetLocation: target };
}

export function startDive(fielder: Fielder, now: number): Fielder {
  if (now - fielder.lastDiveTime < DIVE_COOLDOWN) return fielder;
  return {
    ...fielder,
    isDiving: true,
    diveEndTime: now + DIVE_DURATION,
    lastDiveTime: now,
  };
}

export function moveFielderWithArrows(
  fielder: Fielder,
  dirX: number,
  dirY: number,
  dt: number,
): Fielder {
  if (dirX === 0 && dirY === 0) return fielder;
  const speed = fielder.isDiving ? fielder.speed * DIVE_SPEED_MULTIPLIER : fielder.speed;
  return {
    ...fielder,
    location: {
      x: fielder.location.x + dirX * speed * dt * 60,
      y: fielder.location.y + dirY * speed * dt * 60,
    },
    targetLocation: null,
  };
}

export function resetFielderToDefault(fielder: Fielder): Fielder {
  return {
    ...fielder,
    location: { ...fielder.defaultLocation },
    targetLocation: null,
    hasBall: false,
    isDiving: false,
  };
}
