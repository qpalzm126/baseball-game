import { BaseRunner, BaseType, HitType, Vec2 } from './types';
import { BASE_POSITIONS, HOME_PLATE, RUNNER_SPEED } from './constants';
import { moveToward, distance } from '@/utils/math';

let nextRunnerId = 1;

export function createRunner(fromBase: 0 | BaseType = 0): BaseRunner {
  const pos = fromBase === 0 ? { ...HOME_PLATE } : { ...BASE_POSITIONS[fromBase] };
  return {
    id: `runner_${nextRunnerId++}`,
    currentBase: fromBase,
    targetBase: BaseType.First,
    position: pos,
    speed: RUNNER_SPEED,
    isOut: false,
  };
}

export function getBasePosition(base: BaseType | 0): Vec2 {
  if (base === 0) return { ...HOME_PLATE };
  if (base === BaseType.Home) return { ...HOME_PLATE };
  return { ...BASE_POSITIONS[base] };
}

export function nextBase(base: BaseType | 0): BaseType {
  if (base === 0) return BaseType.First;
  if (base === BaseType.First) return BaseType.Second;
  if (base === BaseType.Second) return BaseType.Third;
  return BaseType.Home;
}

export function advanceRunners(
  runners: BaseRunner[],
  hitType: HitType,
): BaseRunner[] {
  let basesToAdvance = 0;
  switch (hitType) {
    case HitType.HomeRun:
      basesToAdvance = 4;
      break;
    case HitType.LineDrive:
      basesToAdvance = 2;
      break;
    case HitType.FlyBall:
      basesToAdvance = 2;
      break;
    case HitType.GroundBall:
      basesToAdvance = 1;
      break;
    case HitType.PopUp:
      basesToAdvance = 0;
      break;
    default:
      basesToAdvance = 1;
  }

  return runners.map((r) => {
    let target = r.currentBase as number;
    for (let i = 0; i < basesToAdvance; i++) {
      if (target === 0) target = 1;
      else if (target < 4) target = target + 1;
    }
    if (target > 4) target = 4;
    return { ...r, targetBase: target as BaseType };
  });
}

export function updateRunnerMovement(runner: BaseRunner, dt: number): BaseRunner {
  if (runner.isOut) return runner;
  if (runner.currentBase === runner.targetBase) return runner;

  const immediateNext = nextBase(runner.currentBase);
  const immediatePos = getBasePosition(immediateNext);

  const newPos = moveToward(runner.position, immediatePos, runner.speed * dt * 60);
  const arrived = distance(newPos, immediatePos) < 3;

  if (arrived) {
    const updated: BaseRunner = {
      ...runner,
      position: { ...immediatePos },
      currentBase: immediateNext,
    };
    return updated;
  }

  return { ...runner, position: newPos };
}

export function checkRunnerScored(runner: BaseRunner): boolean {
  return runner.currentBase === BaseType.Home;
}

export function basesAdvancedFromHit(hitType: HitType): number {
  switch (hitType) {
    case HitType.HomeRun: return 4;
    case HitType.LineDrive: return 2;
    case HitType.FlyBall: return 2;
    case HitType.GroundBall: return 1;
    case HitType.PopUp: return 0;
    default: return 1;
  }
}

/** Send all settled runners one base further. */
export function sendRunnersForward(runners: BaseRunner[]): BaseRunner[] {
  return runners.map((r) => {
    if (r.isOut) return r;
    if (r.currentBase === r.targetBase && (r.targetBase as number) < 4) {
      return { ...r, targetBase: nextBase(r.currentBase) };
    }
    return r;
  });
}

/** Cap in-progress runners to the immediate next base so they stop ASAP. */
export function holdRunners(runners: BaseRunner[]): BaseRunner[] {
  return runners.map((r) => {
    if (r.isOut) return r;
    if (r.currentBase === r.targetBase) return r;
    const imNext = nextBase(r.currentBase);
    if ((r.targetBase as number) > (imNext as number)) {
      return { ...r, targetBase: imNext };
    }
    return r;
  });
}
