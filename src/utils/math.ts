import { Vec2, Vec3 } from '@/game/types';

export function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function project3Dto2D(p: Vec3, cameraZ: number = 800): Vec2 {
  const scale = cameraZ / (cameraZ + p.z);
  return {
    x: 450 + (p.x - 450) * scale,
    y: 300 + (p.y - 300) * scale - p.z * 0.5,
  };
}

export function angleBetween(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function moveToward(current: Vec2, target: Vec2, speed: number): Vec2 {
  const dir = sub(target, current);
  const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
  if (dist <= speed) return { ...target };
  const norm = normalize(dir);
  return add(current, scale(norm, speed));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function isInFairTerritory(position: Vec2, homePlate: Vec2): boolean {
  const angle = Math.atan2(homePlate.y - position.y, position.x - homePlate.x);
  return angle >= Math.PI / 4 && angle <= (3 * Math.PI) / 4;
}
