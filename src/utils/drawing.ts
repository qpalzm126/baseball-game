import { Vec2, Fielder } from '@/game/types';

export function drawDiamond(ctx: CanvasRenderingContext2D, bases: Vec2[], homePlate: Vec2) {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;

  const allBases = [homePlate, ...bases.slice(1)];
  ctx.beginPath();
  ctx.moveTo(homePlate.x, homePlate.y);
  for (let i = 1; i < allBases.length; i++) {
    ctx.lineTo(allBases[i].x, allBases[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  for (let i = 0; i < allBases.length; i++) {
    const b = allBases[i];
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.PI / 4);
    const size = i === 0 ? 10 : 8;
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.restore();
  }
}

export function drawFieldGrass(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#1a4d0f');
  grad.addColorStop(1, '#2d6b1e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height * 0.87;

  ctx.fillStyle = '#347a22';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX - 420, centerY - 520);
  ctx.lineTo(centerX + 420, centerY - 520);
  ctx.closePath();
  ctx.fill();

  const foulColor = 'rgba(255,255,255,0.15)';
  ctx.strokeStyle = foulColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX - 420, centerY - 520);
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + 420, centerY - 520);
  ctx.stroke();

  ctx.fillStyle = '#8B6914';
  ctx.beginPath();
  ctx.arc(centerX, centerY - 180, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#C4A035';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + 165, centerY - 135);
  ctx.quadraticCurveTo(centerX + 165, centerY - 175, centerX + 145, centerY - 205);
  ctx.lineTo(centerX - 145, centerY - 205);
  ctx.quadraticCurveTo(centerX - 165, centerY - 175, centerX - 165, centerY - 135);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#C4A035';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let r = 100; r < 500; r += 100) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
  }
}

export function drawFielderFigure(
  ctx: CanvasRenderingContext2D,
  fielder: Fielder,
  isSelected: boolean,
) {
  const { location, label, hotkey, isDiving } = fielder;

  ctx.save();
  ctx.translate(location.x, location.y);

  if (isDiving) {
    ctx.rotate(Math.PI / 5);
    ctx.scale(1.4, 0.6);
  }

  const bodyColor = isSelected ? '#fbbf24' : '#3b82f6';
  const darkColor = isSelected ? '#d97706' : '#1d4ed8';

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, -20, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = darkColor;
  ctx.fillRect(-5, -13, 10, 14);

  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, -8);
  ctx.lineTo(-11, 0);
  ctx.moveTo(5, -8);
  ctx.lineTo(11, 0);
  ctx.moveTo(-3, 1);
  ctx.lineTo(-4, 14);
  ctx.moveTo(3, 1);
  ctx.lineTo(4, 14);
  ctx.stroke();

  if (fielder.hasBall) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(12, -2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, location.x, location.y + 26);

  const keyBg = isSelected ? '#facc15' : 'rgba(0,0,0,0.6)';
  const keyFg = isSelected ? '#000000' : '#facc15';
  const keyText = hotkey;
  const tw = ctx.measureText(keyText).width + 8;
  ctx.fillStyle = keyBg;
  ctx.beginPath();
  ctx.roundRect(location.x - tw / 2, location.y - 38, tw, 14, 3);
  ctx.fill();
  ctx.fillStyle = keyFg;
  ctx.font = 'bold 10px monospace';
  ctx.fillText(keyText, location.x, location.y - 28);
}

export function drawBatter(ctx: CanvasRenderingContext2D, x: number, y: number, batAngle: number) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(0, -28, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(0, -28, 12, -Math.PI * 0.8, -Math.PI * 0.2);
  ctx.stroke();

  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(-7, -19, 14, 20);

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, 1);
  ctx.lineTo(-6, 18);
  ctx.moveTo(4, 1);
  ctx.lineTo(6, 18);
  ctx.stroke();

  ctx.save();
  ctx.translate(8, -14);
  ctx.rotate(batAngle);
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.roundRect(-2, -2, 42, 4, 2);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.roundRect(-4, -3, 8, 6, 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number = 5) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.7, -0.6, 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.7, Math.PI - 0.6, Math.PI + 0.6);
  ctx.stroke();

  ctx.restore();
}

export function drawStrikeZoneGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  highlightCell: number | null,
) {
  const cellW = width / 3;
  const cellH = height / 3;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cellIdx = r * 3 + c;
      const cx = x + c * cellW;
      const cy = y + r * cellH;
      if (cellIdx === highlightCell) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
        ctx.fillRect(cx, cy, cellW, cellH);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx, cy, cellW, cellH);
    }
  }
}

export function drawPitcher(ctx: CanvasRenderingContext2D, x: number, y: number, windupPhase: number) {
  ctx.save();
  ctx.translate(x, y);
  const s = 0.65;
  ctx.scale(s, s);

  ctx.fillStyle = '#1e40af';
  ctx.beginPath();
  ctx.arc(0, -28, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2563eb';
  ctx.fillRect(-7, -19, 14, 20);

  const armAngle = -Math.PI / 2 + windupPhase * Math.PI * 1.2;
  ctx.save();
  ctx.translate(6, -14);
  ctx.rotate(armAngle);
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(18, 0);
  ctx.stroke();

  if (windupPhase < 0.5) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(18, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, -8);
  ctx.lineTo(-10, 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-4, 1);
  ctx.lineTo(-6, 18);
  ctx.moveTo(4, 1);
  ctx.lineTo(6, 18);
  ctx.stroke();

  ctx.restore();
}

export function drawBaseRunnerDot(ctx: CanvasRenderingContext2D, position: Vec2) {
  ctx.save();

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(position.x, position.y, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fef2f2';
  ctx.beginPath();
  ctx.arc(position.x, position.y - 10, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawAnnouncementText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string = '#facc15',
  size: number = 36,
) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, y - size * 0.8, ctx.canvas.width, size * 2);
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}
