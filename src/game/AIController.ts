import {
  Difficulty,
  DifficultyConfig,
  PitchDecision,
  SwingDecision,
  FielderCommand,
  GameSnapshot,
  PitchType,
  BaseType,
  Vec2,
  GamePhase,
  IPlayerController,
} from './types';
import {
  BATTING_VIEW,
  DIFFICULTY_CONFIGS,
  FIRST_BASE,
  SECOND_BASE,
  THIRD_BASE,
  HOME_PLATE,
  BASE_POSITIONS,
} from './constants';
import { randomRange, distance } from '@/utils/math';

export class AIController implements IPlayerController {
  private cfg: DifficultyConfig;

  constructor(difficulty: Difficulty = 'college') {
    this.cfg = DIFFICULTY_CONFIGS[difficulty];
  }

  getDifficultyConfig(): DifficultyConfig { return this.cfg; }

  decidePitch(_gameState: GameSnapshot): PitchDecision {
    const types = Object.values(PitchType);
    const type = types[Math.floor(Math.random() * types.length)];

    const throwBall = Math.random() < this.cfg.aiBallChance;

    let targetCell: number;
    if (throwBall) {
      targetCell = -(Math.floor(Math.random() * 4) + 1);
    } else {
      const edgeCells = [0, 2, 3, 5, 6, 8];
      const centerCells = [1, 4, 7];
      const useEdge = Math.random() < 0.6;
      const pool = useEdge ? edgeCells : centerCells;
      targetCell = pool[Math.floor(Math.random() * pool.length)];
    }

    const speed = randomRange(
      this.cfg.aiSpeedCenter - this.cfg.aiSpeedRange,
      this.cfg.aiSpeedCenter + this.cfg.aiSpeedRange,
    );

    return { type, targetCell, speed: Math.min(1, Math.max(0.5, speed)) };
  }

  decideSwing(_gameState: GameSnapshot, ballPosition: Vec2): SwingDecision {
    const sz = BATTING_VIEW.strikeZone;
    const margin = 15;
    const inZone =
      ballPosition.x >= sz.x - margin &&
      ballPosition.x <= sz.x + sz.width + margin &&
      ballPosition.y >= sz.y - margin &&
      ballPosition.y <= sz.y + sz.height + margin;

    const shouldSwing = inZone
      ? Math.random() < this.cfg.aiSwingReaction
      : Math.random() < 0.15;

    const errorScale = (1 - this.cfg.aiSwingAccuracy) * 35;

    return {
      shouldSwing,
      batPosition: {
        x: ballPosition.x + randomRange(-errorScale, errorScale),
        y: ballPosition.y + randomRange(-errorScale, errorScale),
      },
    };
  }

  /* ======= fielding AI ======= */

  private isOutfielder(id: number): boolean {
    return id >= 7 && id <= 9;
  }

  controlFielders(gameState: GameSnapshot): FielderCommand[] {
    if (
      gameState.phase !== GamePhase.Fielding &&
      gameState.phase !== GamePhase.BallInPlay
    ) {
      return [];
    }

    const commands: FielderCommand[] = [];
    const ballPos: Vec2 = {
      x: gameState.ball.position3D.x,
      y: gameState.ball.position3D.y,
    };

    const holder = gameState.fielders.find((f) => f.id === gameState.ball.heldByFielder);
    if (holder) {
      const throwTarget = this.findBestThrowTarget(gameState, holder);
      if (throwTarget) {
        commands.push({ fielderId: holder.id, throwTo: throwTarget });
      }
      const coverCmds = this.getBaseCoverCommands(gameState, holder.id);
      commands.push(...coverCmds);
      return commands;
    }

    let closestFielder: typeof gameState.fielders[0] | null = null;
    let closestDist = Infinity;
    let secondFielder: typeof gameState.fielders[0] | null = null;
    let secondDist = Infinity;

    for (const f of gameState.fielders) {
      if (f.id === 1 || f.id === 2) continue;
      const dist = distance(f.location, ballPos);
      if (dist < closestDist) {
        secondFielder = closestFielder;
        secondDist = closestDist;
        closestFielder = f;
        closestDist = dist;
      } else if (dist < secondDist) {
        secondFielder = f;
        secondDist = dist;
      }
    }

    if (closestFielder) {
      commands.push({
        fielderId: closestFielder.id,
        targetLocation: { ...ballPos },
        dive: closestDist < 55 && closestDist > 18,
      });

      if (secondFielder && this.isOutfielder(closestFielder.id)) {
        const backupPos: Vec2 = {
          x: ballPos.x + (ballPos.x - HOME_PLATE.x) * 0.15,
          y: ballPos.y + (ballPos.y - HOME_PLATE.y) * 0.15,
        };
        commands.push({ fielderId: secondFielder.id, targetLocation: backupPos });
      }
    }

    const chaserId = closestFielder?.id ?? 0;
    const backupId = secondFielder?.id ?? 0;
    const coverCmds = this.getBaseCoverCommands(gameState, chaserId, backupId);
    commands.push(...coverCmds);

    return commands;
  }

  /** Assign infielders to cover bases while fielders chase the ball. */
  private getBaseCoverCommands(gameState: GameSnapshot, chaserId: number, backupId: number = 0): FielderCommand[] {
    const cmds: FielderCommand[] = [];
    const skip = new Set([chaserId, backupId]);

    const coverFirst = !skip.has(3) ? 3 : (!skip.has(4) ? 4 : 0);
    const coverSecond = !skip.has(6) ? 6 : (!skip.has(4) && 4 !== coverFirst ? 4 : 0);
    const coverThird = !skip.has(5) ? 5 : (!skip.has(6) && 6 !== coverSecond ? 6 : 0);

    const assignments: [number, Vec2][] = [
      [2, HOME_PLATE],
      [coverFirst, FIRST_BASE],
      [coverSecond, SECOND_BASE],
      [coverThird, THIRD_BASE],
    ];

    for (const [fid, pos] of assignments) {
      if (fid === 0 || skip.has(fid)) continue;
      cmds.push({ fielderId: fid, targetLocation: pos });
    }

    if (!skip.has(1)) {
      const cutoffPos: Vec2 = {
        x: (HOME_PLATE.x + gameState.ball.position3D.x) * 0.5,
        y: (HOME_PLATE.y + gameState.ball.position3D.y) * 0.5,
      };
      cmds.push({ fielderId: 1, targetLocation: cutoffPos });
    }

    return cmds;
  }

  private findBestThrowTarget(gameState: GameSnapshot, holder: { id: number; location: Vec2 }): number | null {
    const runners = gameState.runners.filter((r) => !r.isOut);
    const movingRunners = runners.filter((r) => r.currentBase !== r.targetBase);

    if (movingRunners.length > 0) {
      const sorted = [...movingRunners].sort(
        (a, b) => (b.targetBase as number) - (a.targetBase as number),
      );

      for (const runner of sorted) {
        const tb = runner.targetBase;
        const basePos = tb === BaseType.Home ? HOME_PLATE : BASE_POSITIONS[tb as number];
        const fielder = this.findFielderNearBase(gameState.fielders, basePos, holder.id);
        if (fielder !== null) return fielder;
      }
    }

    if (runners.length > 0) {
      const leadRunner = [...runners].sort(
        (a, b) => (b.currentBase as number) - (a.currentBase as number),
      )[0];
      const nextBase = Math.min((leadRunner.currentBase as number) + 1, 4);
      const basePos = nextBase === 4 ? HOME_PLATE : BASE_POSITIONS[nextBase];
      const fielder = this.findFielderNearBase(gameState.fielders, basePos, holder.id);
      if (fielder !== null) return fielder;

      const curBasePos = leadRunner.currentBase === BaseType.Home
        ? HOME_PLATE : BASE_POSITIONS[leadRunner.currentBase as number];
      const curFielder = this.findFielderNearBase(gameState.fielders, curBasePos, holder.id);
      if (curFielder !== null) return curFielder;
    }

    if (this.isOutfielder(holder.id)) {
      let bestRelay: number | null = null;
      let bestDist = Infinity;
      for (const f of gameState.fielders) {
        if (f.id === holder.id || this.isOutfielder(f.id)) continue;
        const d = distance(f.location, holder.location);
        if (d < bestDist) { bestRelay = f.id; bestDist = d; }
      }
      if (bestRelay !== null) return bestRelay;
    }

    const fb = gameState.fielders.find((f) => f.id === 3);
    if (fb && fb.id !== holder.id) return fb.id;
    const ss = gameState.fielders.find((f) => f.id === 6);
    if (ss && ss.id !== holder.id) return ss.id;
    return null;
  }

  private findFielderNearBase(fielders: GameSnapshot['fielders'], basePos: Vec2, holderId: number): number | null {
    let best: number | null = null;
    let bestDist = Infinity;
    for (const f of fielders) {
      if (f.id === holderId) continue;
      const d = distance(f.location, basePos);
      if (d < 120 && d < bestDist) {
        best = f.id;
        bestDist = d;
      }
    }
    return best;
  }

  /* ======= baserunning AI (when AI is batting) ======= */

  decideBaserunning(gameState: GameSnapshot): boolean {
    const ball = gameState.ball;
    if (ball.heldByFielder) return false;

    const ballPos: Vec2 = { x: ball.position3D.x, y: ball.position3D.y };
    let nearestDist = Infinity;
    for (const f of gameState.fielders) {
      const d = distance(f.location, ballPos);
      if (d < nearestDist) nearestDist = d;
    }

    return nearestDist > 120;
  }
}
