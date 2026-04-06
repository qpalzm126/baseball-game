import { BaseRunner, BaseType, Fielder, HitType } from './types';
import { HOME_PLATE, BASE_POSITIONS } from './constants';
import { distance } from '@/utils/math';

export interface PlayResult {
  runs: number;
  outs: number;
  runnersScored: string[];
  runnersOut: string[];
}

export function evaluateFieldingPlay(
  runners: BaseRunner[],
): PlayResult {
  const result: PlayResult = {
    runs: 0,
    outs: 0,
    runnersScored: [],
    runnersOut: [],
  };

  for (const runner of runners) {
    if (runner.currentBase === BaseType.Home && runner.targetBase === BaseType.Home) {
      result.runs++;
      result.runnersScored.push(runner.id);
    }
  }

  return result;
}

/**
 * A base is a force-play base only when there's an unbroken chain of runners
 * starting from home plate (batter = base 0) through each consecutive base up
 * to the one before it.  e.g. force at 3rd requires runners with startBase 0, 1, 2.
 */
function isForceBase(runners: BaseRunner[], base: BaseType): boolean {
  if (base === BaseType.First) return true;
  const occupied = new Set(
    runners.filter((r) => !r.isOut).map((r) => r.startBase as number),
  );
  for (let b = 0; b < (base as number); b++) {
    if (!occupied.has(b)) return false;
  }
  return true;
}

export function checkForceOut(
  runners: BaseRunner[],
  fielder: Fielder,
  targetBase: BaseType,
): string | null {
  if (!isForceBase(runners, targetBase)) return null;

  const basePos = targetBase === BaseType.Home ? HOME_PLATE : BASE_POSITIONS[targetBase];
  if (distance(fielder.location, basePos) > 30) return null;

  for (const runner of runners) {
    if (runner.targetBase === targetBase && !runner.isOut) {
      if (runner.currentBase !== targetBase) {
        return runner.id;
      }
    }
  }
  return null;
}

/** Fielder with ball tags a runner who is between bases. */
export function checkTagOut(
  runners: BaseRunner[],
  fielder: Fielder,
): string | null {
  for (const runner of runners) {
    if (runner.isOut) continue;
    if (runner.currentBase === runner.targetBase) continue;
    if (distance(fielder.location, runner.position) < 25) {
      return runner.id;
    }
  }
  return null;
}

/**
 * Check all bases + tag opportunities for the ball-holding fielder.
 * Returns the first out found (force outs checked before tags).
 */
export function findFieldingOut(
  runners: BaseRunner[],
  fielders: Fielder[],
  heldByFielder: number | null,
): { runnerId: string; kind: 'force' | 'tag' } | null {
  if (!heldByFielder) return null;
  const holder = fielders.find((f) => f.id === heldByFielder);
  if (!holder) return null;

  const bases: BaseType[] = [BaseType.First, BaseType.Second, BaseType.Third, BaseType.Home];
  for (const base of bases) {
    const rid = checkForceOut(runners, holder, base);
    if (rid) return { runnerId: rid, kind: 'force' };
  }

  const tagId = checkTagOut(runners, holder);
  if (tagId) return { runnerId: tagId, kind: 'tag' };

  return null;
}

export function checkFlyOut(hitType: HitType, ballCaughtInAir: boolean): boolean {
  return (
    ballCaughtInAir &&
    (hitType === HitType.FlyBall || hitType === HitType.PopUp || hitType === HitType.LineDrive)
  );
}

export function shouldEndPlay(
  runners: BaseRunner[],
  ball: { heldByFielder: number | null; isLanded: boolean },
): boolean {
  if (!ball.heldByFielder) return false;
  const allSettled = runners.every(
    (r) => r.currentBase === r.targetBase || r.isOut,
  );
  return allSettled;
}
