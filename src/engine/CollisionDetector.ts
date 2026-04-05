import { BallState, BatState, Fielder, Vec2 } from '@/game/types';
import { BATTING_VIEW, CATCH_RADIUS, DIVE_CATCH_RADIUS } from '@/game/constants';
import { distance } from '@/utils/math';

export interface BatBallCollision {
  hit: boolean;
  contactY: number;
  timing: number;
}

export function checkBatBallCollision(
  ball: BallState,
  bat: BatState,
): BatBallCollision {
  const sz = BATTING_VIEW.strikeZone;
  const ballInZone =
    ball.screenPosition.x >= sz.x &&
    ball.screenPosition.x <= sz.x + sz.width &&
    ball.screenPosition.y >= sz.y &&
    ball.screenPosition.y <= sz.y + sz.height;

  if (!ballInZone) return { hit: false, contactY: 0, timing: 0 };

  const batX = bat.position.x;
  const batY = bat.position.y;
  const dx = Math.abs(ball.screenPosition.x - batX);
  const dy = Math.abs(ball.screenPosition.y - batY);
  const hitRadius = 30;

  if (dx < hitRadius && dy < hitRadius) {
    const contactY = (ball.screenPosition.y - sz.y) / sz.height;
    const timing = ((ball.screenPosition.x - batX) / hitRadius) * 0.5;
    return { hit: true, contactY, timing };
  }

  return { hit: false, contactY: 0, timing: 0 };
}

export function checkFielderBallCollision(
  fielder: Fielder,
  ballPos: Vec2,
): boolean {
  const radius = fielder.isDiving ? DIVE_CATCH_RADIUS : CATCH_RADIUS;
  return distance(fielder.location, ballPos) <= radius;
}

export function getFielderAtPosition(
  fielders: Fielder[],
  pos: Vec2,
  radius: number = 25,
): Fielder | null {
  for (const f of fielders) {
    if (distance(f.location, pos) <= radius) {
      return f;
    }
  }
  return null;
}
