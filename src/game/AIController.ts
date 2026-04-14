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
  PitcherProfile,
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
  private profile: PitcherProfile | null;
  private throwCooldownUntil = 0;
  private frameCounter = 0;
  private static readonly THROW_COOLDOWN_FRAMES = 40;
  private static readonly NEAR_BASE_RADIUS = 55;

  constructor(difficulty: Difficulty = 'college', profile?: PitcherProfile) {
    this.cfg = DIFFICULTY_CONFIGS[difficulty];
    this.profile = profile ?? null;
  }

  getProfile(): PitcherProfile | null { return this.profile; }
  getDifficultyConfig(): DifficultyConfig { return this.cfg; }

  decidePitch(gameState: GameSnapshot): PitchDecision {
    let type: PitchType;
    if (this.profile) {
      type = this.weightedPitchSelect();
    } else {
      const types = Object.values(PitchType);
      type = types[Math.floor(Math.random() * types.length)];
    }

    const balls = gameState.count.balls;
    const strikes = gameState.count.strikes;

    let ballChance = this.cfg.aiBallChance;
    if (balls >= 3) {
      ballChance = 0;
    } else if (balls === 2) {
      ballChance *= 0.25;
    } else if (balls === 1) {
      ballChance *= 0.6;
    }
    if (strikes === 2 && balls < 2) {
      ballChance = Math.min(ballChance * 1.5, 0.20);
    }

    const throwBall = Math.random() < ballChance;

    let targetCell: number;
    if (throwBall) {
      targetCell = -(Math.floor(Math.random() * 4) + 1);
    } else {
      const edgeCells = [0, 2, 3, 5, 6, 8];
      const centerCells = [1, 4, 7];
      const preferEdge = strikes < 2 ? 0.6 : 0.75;
      const useEdge = Math.random() < preferEdge;
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

    const zoneCenter = { x: sz.x + sz.width / 2, y: sz.y + sz.height / 2 };
    const dxFromCenter = Math.abs(ballPosition.x - zoneCenter.x) / (sz.width / 2 + margin);
    const dyFromCenter = Math.abs(ballPosition.y - zoneCenter.y) / (sz.height / 2 + margin);
    const edgePenalty = Math.max(dxFromCenter, dyFromCenter);

    const swingChance = inZone
      ? this.cfg.aiSwingReaction * (1 - edgePenalty * 0.35)
      : 0.08 + (1 - this.cfg.aiSwingAccuracy) * 0.15;
    const shouldSwing = Math.random() < swingChance;

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
    this.frameCounter++;

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
      if (this.frameCounter >= this.throwCooldownUntil) {
        const throwTarget = this.findBestThrowTarget(gameState, holder);
        if (throwTarget) {
          commands.push({ fielderId: holder.id, throwTo: throwTarget });
          this.throwCooldownUntil = this.frameCounter + AIController.THROW_COOLDOWN_FRAMES;
        }
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

    if (runners.length === 0) return null;

    const movingRunners = runners.filter((r) => r.currentBase !== r.targetBase);
    const allSettled = movingRunners.length === 0;

    if (allSettled && !this.isOutfielder(holder.id)) return null;

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

    if (this.isOutfielder(holder.id)) {
      const cutoffId = this.findCutoffMan(gameState, holder);
      if (cutoffId !== null) return cutoffId;
    }

    if (movingRunners.length > 0) {
      const leadMoving = [...movingRunners].sort(
        (a, b) => (b.targetBase as number) - (a.targetBase as number),
      )[0];
      const tb = leadMoving.targetBase;
      const basePos = tb === BaseType.Home ? HOME_PLATE : BASE_POSITIONS[tb as number];
      for (const f of gameState.fielders) {
        if (f.id === holder.id) continue;
        const d = distance(f.location, basePos);
        if (d < 100) return f.id;
      }
    }

    return null;
  }

  private findCutoffMan(gameState: GameSnapshot, holder: { id: number; location: Vec2 }): number | null {
    const infielderIds = [1, 4, 6, 3, 5];
    let best: number | null = null;
    let bestScore = Infinity;

    for (const fid of infielderIds) {
      const f = gameState.fielders.find((ff) => ff.id === fid);
      if (!f || f.id === holder.id) continue;
      const distToHolder = distance(f.location, holder.location);
      const distToHome = distance(f.location, HOME_PLATE);
      const score = distToHolder * 0.6 + distToHome * 0.4;
      if (score < bestScore) { best = f.id; bestScore = score; }
    }
    return best;
  }

  private findFielderNearBase(fielders: GameSnapshot['fielders'], basePos: Vec2, holderId: number): number | null {
    let best: number | null = null;
    let bestDist = Infinity;
    const radius = AIController.NEAR_BASE_RADIUS;
    for (const f of fielders) {
      if (f.id === holderId) continue;
      const d = distance(f.location, basePos);
      if (d < radius && d < bestDist) {
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

  private weightedPitchSelect(): PitchType {
    const pitches = this.profile!.pitches;
    const r = Math.random();
    let cumulative = 0;
    for (const p of pitches) {
      cumulative += p.weight;
      if (r <= cumulative) return p.type;
    }
    return pitches[pitches.length - 1].type;
  }
}
