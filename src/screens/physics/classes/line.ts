import type { Canvas2d } from '@/hooks/useCanvas';
import {
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
} from '@shopify/react-native-skia';
import { clamp } from 'react-native-reanimated';
import { randomBetween, randomSign } from '../utils/math';
import {
  distanceBetweenPoints,
  mixPoints,
  projectPointToSegment,
  type Point,
} from '../utils/point';
import type { LineSegment } from '../utils/collision';

type Dust = Point & {
  vx: number;
  vy: number;
  radius: number;
  age: number;
  life: number;
};

type SamplePoint = Point & {
  tx: number;
  ty: number;
};

type EraseRange = {
  start: number;
  end: number;
};

const MIN_POINT_DISTANCE = 5;
const ERASE_ACCELERATION = 1950;
const ERASE_MAX_SPEED = 1196;
const DUST_STEP = 6;
const DUST_GRAVITY = 105;

export default class Line {
  private __workletClass = true;
  private points: Point[] = [];
  private lengths: number[] = [0];
  private totalLength = 0;
  private thickness = 13;
  private eraseOrigin = -1;
  private eraseRadius = 0;
  private eraseSpeed = 0;
  private lastDustRadius = 0;
  private eroded = false;
  private dust: Dust[] = [];
  private paint = Skia.Paint();
  private dustPaint = Skia.Paint();

  constructor(x: number, y: number) {
    this.points.push({ x, y });

    this.paint.setAntiAlias(true);
    this.paint.setColor(Skia.Color('#7F948D'));
    this.paint.setStyle(PaintStyle.Stroke);
    this.paint.setStrokeWidth(this.thickness);
    this.paint.setStrokeCap(StrokeCap.Round);
    this.paint.setStrokeJoin(StrokeJoin.Round);
    this.dustPaint.setAntiAlias(true);
  }

  addPoint(x: number, y: number) {
    const last = this.points[this.points.length - 1];
    const distance = distanceBetweenPoints(last, { x, y });

    if (distance < MIN_POINT_DISTANCE) {
      return;
    }

    this.points.push({ x, y });
    this.totalLength += distance;
    this.lengths.push(this.totalLength);
  }

  isTooShort() {
    return this.totalLength < 18;
  }

  eraseAt(x: number, y: number, radius: number) {
    if (this.eroded || this.eraseOrigin >= 0) {
      return false;
    }

    const hit = this.findHitDistance(x, y, radius);

    if (hit < 0) {
      return false;
    }

    this.eraseOrigin = hit;
    this.eraseRadius = 0;
    this.eraseSpeed = 0;
    this.lastDustRadius = 0;
    return true;
  }

  update(dt: number) {
    if (this.eraseOrigin >= 0 && !this.eroded) {
      this.eraseSpeed = clamp(
        this.eraseSpeed + ERASE_ACCELERATION * dt,
        0,
        ERASE_MAX_SPEED,
      );
      this.eraseRadius += this.eraseSpeed * dt;
      this.spawnDustBetween(this.lastDustRadius, this.eraseRadius);
      this.lastDustRadius = this.eraseRadius;

      if (
        this.eraseRadius >
        Math.max(this.eraseOrigin, this.totalLength - this.eraseOrigin) + 16
      ) {
        this.eroded = true;
      }
    }

    this.updateDust(dt);
  }

  getCollisionSegments() {
    if (this.points.length < 2 || this.eroded) {
      return [];
    }

    const segments: LineSegment[] = [];

    for (let i = 1; i < this.points.length; i++) {
      const fromLength = this.lengths[i - 1];
      const toLength = this.lengths[i];
      const pieces = this.getVisiblePieces(
        this.points[i - 1],
        this.points[i],
        fromLength,
        toLength,
      );

      for (let j = 0; j < pieces.length; j++) {
        segments.push(pieces[j]);
      }
    }

    return segments;
  }

  getCollisionThickness() {
    return this.thickness;
  }

  shouldRemove() {
    return this.eroded && this.dust.length === 0;
  }

  draw(canvas: Canvas2d) {
    if (!this.eroded) {
      const groups = this.getVisiblePointGroups();

      for (let i = 0; i < groups.length; i++) {
        this.drawSmoothLine(canvas, groups[i]);
      }
    }

    this.drawDust(canvas);
  }

  private getVisiblePieces(
    from: Point,
    to: Point,
    fromLength: number,
    toLength: number,
  ) {
    const pieces: LineSegment[] = [];

    if (this.eraseOrigin < 0) {
      pieces.push({ from, to });
      return pieces;
    }

    const eraseRange = this.getEraseRange();

    if (toLength <= eraseRange.start || fromLength >= eraseRange.end) {
      pieces.push({ from, to });
      return pieces;
    }

    const segmentLength = toLength - fromLength;

    if (fromLength < eraseRange.start) {
      const t = clamp((eraseRange.start - fromLength) / segmentLength, 0, 1);
      pieces.push({ from, to: mixPoints(from, to, t) });
    }

    if (toLength > eraseRange.end) {
      const t = clamp((eraseRange.end - fromLength) / segmentLength, 0, 1);
      pieces.push({ from: mixPoints(from, to, t), to });
    }

    return pieces;
  }

  private getVisiblePointGroups() {
    if (this.points.length < 2) {
      return [];
    }

    if (this.eraseOrigin < 0) {
      return [this.points];
    }

    const groups: Point[][] = [];
    const eraseRange = this.getEraseRange();

    if (eraseRange.start > 0) {
      groups.push(this.getPointGroupBetween(0, eraseRange.start));
    }

    if (eraseRange.end < this.totalLength) {
      groups.push(this.getPointGroupBetween(eraseRange.end, this.totalLength));
    }

    return groups.filter((group) => group.length >= 2);
  }

  private getEraseRange(): EraseRange {
    return {
      start: clamp(this.eraseOrigin - this.eraseRadius, 0, this.totalLength),
      end: clamp(this.eraseOrigin + this.eraseRadius, 0, this.totalLength),
    };
  }

  private getPointGroupBetween(startDistance: number, endDistance: number) {
    const group: Point[] = [this.getPointAtDistance(startDistance)];

    for (let i = 1; i < this.points.length - 1; i++) {
      const pointDistance = this.lengths[i];

      if (pointDistance > startDistance && pointDistance < endDistance) {
        group.push(this.points[i]);
      }
    }

    group.push(this.getPointAtDistance(endDistance));
    return group;
  }

  private findHitDistance(x: number, y: number, radius: number) {
    let bestDistance = -1;
    let bestScore = Number.MAX_VALUE;

    for (let i = 1; i < this.points.length; i++) {
      const from = this.points[i - 1];
      const to = this.points[i];
      const hit = projectPointToSegment({ x, y }, from, to);

      if (hit.lengthSq <= 0.001) {
        continue;
      }

      const score = distanceBetweenPoints({ x, y }, hit.point);

      if (score <= radius + this.thickness / 2 && score < bestScore) {
        bestScore = score;
        bestDistance = this.lengths[i - 1] + hit.length * hit.t;
      }
    }

    return bestDistance;
  }

  private spawnDustBetween(fromRadius: number, toRadius: number) {
    if (this.totalLength <= 0) {
      return;
    }

    const start = Math.floor(fromRadius / DUST_STEP) * DUST_STEP;
    const end = Math.ceil(toRadius / DUST_STEP) * DUST_STEP;

    for (let radius = start; radius <= end; radius += DUST_STEP) {
      if (radius <= fromRadius || radius > toRadius) {
        continue;
      }

      this.spawnDustAt(this.eraseOrigin - radius, -1);
      this.spawnDustAt(this.eraseOrigin + radius, 1);
    }
  }

  private spawnDustAt(distance: number, direction: number) {
    if (distance < 0 || distance > this.totalLength) {
      return;
    }

    const sample = this.getPointAtDistance(distance);
    const side = randomSign();
    const nx = -sample.ty * side;
    const ny = sample.tx * side;
    const speed = randomBetween(14, 46);
    const drift = randomBetween(20, 68);

    this.dust.push({
      x: sample.x + nx * 1.2,
      y: sample.y + ny * 1.2,
      vx: sample.tx * direction * drift + nx * speed,
      vy: sample.ty * direction * drift + ny * speed - randomBetween(0, 32),
      radius: randomBetween(0.45, 1.4),
      age: 0,
      life: randomBetween(520, 940),
    });
  }

  private updateDust(dt: number) {
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const dust = this.dust[i];
      dust.age += dt * 1000;
      dust.vy += DUST_GRAVITY * dt;
      dust.x += dust.vx * dt;
      dust.y += dust.vy * dt;

      if (dust.age >= dust.life) {
        this.dust.splice(i, 1);
      }
    }
  }

  private drawDust({ ctx }: Canvas2d) {
    for (let i = 0; i < this.dust.length; i++) {
      const dust = this.dust[i];
      const progress = clamp(dust.age / dust.life, 0, 1);
      const alpha = clamp((1 - progress) * 0.48, 0, 1);
      this.dustPaint.setColor(Skia.Color(`rgba(104, 123, 116, ${alpha})`));
      ctx.drawCircle(
        dust.x,
        dust.y,
        dust.radius * (1 - progress * 0.58),
        this.dustPaint,
      );
    }
  }

  private drawSmoothLine({ ctx }: Canvas2d, points: Point[]) {
    if (points.length < 2) {
      return;
    }

    if (points.length === 2) {
      ctx.drawLine(points[0].x, points[0].y, points[1].x, points[1].y, this.paint);
      return;
    }

    const builder = Skia.PathBuilder.Make().moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const mid = mixPoints(current, next, 0.5);
      builder.quadTo(current.x, current.y, mid.x, mid.y);
    }

    const last = points[points.length - 1];
    const path = builder.lineTo(last.x, last.y).build();
    ctx.drawPath(path, this.paint);
  }

  private getPointAtDistance(distance: number): SamplePoint {
    const target = clamp(distance, 0, this.totalLength);

    for (let i = 1; i < this.points.length; i++) {
      if (this.lengths[i] < target) {
        continue;
      }

      const from = this.points[i - 1];
      const to = this.points[i];
      const segmentLength = this.lengths[i] - this.lengths[i - 1];
      const t = segmentLength <= 0 ? 0 : (target - this.lengths[i - 1]) / segmentLength;
      const tx = segmentLength <= 0 ? 1 : (to.x - from.x) / segmentLength;
      const ty = segmentLength <= 0 ? 0 : (to.y - from.y) / segmentLength;

      return {
        ...mixPoints(from, to, clamp(t, 0, 1)),
        tx,
        ty,
      };
    }

    const last = this.points[this.points.length - 1];
    const prev = this.points[clamp(this.points.length - 2, 0, this.points.length - 1)];
    const length = Math.max(distanceBetweenPoints(prev, last), 1);

    return {
      x: last.x,
      y: last.y,
      tx: (last.x - prev.x) / length,
      ty: (last.y - prev.y) / length,
    };
  }
}
