import { Skia } from '@shopify/react-native-skia';
import type { ScaledSize } from 'react-native';
import type { Canvas2d } from '@/hooks/useCanvas';
import { clamp } from 'react-native-reanimated';
import { Point } from './point';

const WAVE_OVERSCAN = 32;
const DEFAULT_WATER_LEVEL_RATIO = 1.15;
const SPRING_STIFFNESS = 16;
const SPRING_DAMPING = 3.2;
const MAX_FRAME_DELTA_SECONDS = 1 / 30;

export type SurfacePoint = {
  x: number;
  y: number;
  slope: number;
  rotation: number;
};

export class Wave {
  private __workletClass = true;
  private points: Point[] = [];
  private index: number;
  private totalPoints: number;
  private isInit = false;
  private paint = Skia.Paint();
  private waterY = 0;
  private targetWaterY = 0;
  private velocityY = 0;
  private lastTimestamp = 0;
  private depth = 0;

  constructor(index: number, totalPoints: number, color: string) {
    this.index = index;
    this.totalPoints = totalPoints;
    this.paint.setColor(Skia.Color(color));
    this.paint.setAntiAlias(true);
  }

  private getDrainedWaterY(window: ScaledSize) {
    return window.height / DEFAULT_WATER_LEVEL_RATIO - this.depth;
  }

  private init(window: ScaledSize) {
    const waveWidth = window.width + WAVE_OVERSCAN * 2;
    const gap = waveWidth / (this.totalPoints - 1);
    this.waterY = this.getDrainedWaterY(window);
    this.targetWaterY = this.waterY;

    for (let i = 0; i < this.totalPoints; i++) {
      this.points[i] = new Point(
        this.index + i,
        gap * i - WAVE_OVERSCAN,
        this.waterY,
      );
    }
  }

  private updateSpring(window: ScaledSize, timestamp: number) {
    const nextTargetY = this.getDrainedWaterY(window);

    if (nextTargetY !== this.targetWaterY) {
      this.targetWaterY = nextTargetY;
    }

    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
      return;
    }

    const deltaSeconds = Math.min(
      (timestamp - this.lastTimestamp) / 1000,
      MAX_FRAME_DELTA_SECONDS,
    );
    this.lastTimestamp = timestamp;

    const force =
      (this.targetWaterY - this.waterY) * SPRING_STIFFNESS -
      this.velocityY * SPRING_DAMPING;

    this.velocityY += force * deltaSeconds;
    this.waterY += this.velocityY * deltaSeconds;

    for (let i = 0; i < this.totalPoints; i++) {
      this.points[i].setFixedY(this.waterY);
    }
  }

  increaseDepth(amount: number) {
    this.depth += amount;
    this.disturb(amount);
  }

  decreaseDepth(amount: number) {
    this.depth = Math.max(this.depth - amount, 0);
  }

  getWaterY() {
    return this.waterY;
  }

  getSurfaceYAt(x: number) {
    return this.getSurfacePointAt(x).y;
  }

  getSurfacePointAt(x: number): SurfacePoint {
    if (this.points.length === 0) {
      return {
        x,
        y: this.waterY,
        slope: 0,
        rotation: 0,
      };
    }

    if (x <= this.points[0].x) {
      return {
        x,
        y: this.points[0].y,
        slope: 0,
        rotation: 0,
      };
    }

    let startX = this.points[0].x;
    let startY = this.points[0].y;

    for (let i = 1; i < this.points.length; i++) {
      const control = this.points[i - 1];
      const current = this.points[i];
      const endX = (control.x + current.x) / 2;
      const endY = (control.y + current.y) / 2;

      if (x <= endX) {
        return this.getQuadraticSurfacePoint(
          x,
          startX,
          startY,
          control.x,
          control.y,
          endX,
          endY,
        );
      }

      startX = endX;
      startY = endY;
    }

    const lastPoint = this.points[this.points.length - 1];

    if (x <= lastPoint.x) {
      return this.getLinearSurfacePoint(
        x,
        startX,
        startY,
        lastPoint.x,
        lastPoint.y,
      );
    }

    return {
      x,
      y: lastPoint.y,
      slope: 0,
      rotation: 0,
    };
  }

  private getLinearSurfacePoint(
    x: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): SurfacePoint {
    const progress = (x - x1) / (x2 - x1);
    const slope = (y2 - y1) / (x2 - x1);

    return {
      x,
      y: y1 + (y2 - y1) * progress,
      slope,
      rotation: Math.atan2(y2 - y1, x2 - x1),
    };
  }

  private getQuadraticSurfacePoint(
    x: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): SurfacePoint {
    const t = this.getQuadraticTForX(x, x1, x2, x3);
    const tx = this.quadTangent(x1, x2, x3, t);
    const ty = this.quadTangent(y1, y2, y3, t);
    const slope = Math.abs(tx) < 0.0001 ? 0 : ty / tx;

    return {
      x,
      y: this.getQuadValue(y1, y2, y3, t),
      slope,
      rotation: Math.atan2(ty, tx),
    };
  }

  private getQuadraticTForX(x: number, x1: number, x2: number, x3: number) {
    const a = x1 - 2 * x2 + x3;
    const b = 2 * (x2 - x1);
    const c = x1 - x;

    if (Math.abs(a) < 0.0001) {
      return clamp(-c / b, 0, 1);
    }

    const discriminant = Math.max(b * b - 4 * a * c, 0);
    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t1 = (-b + sqrtDiscriminant) / (2 * a);
    const t2 = (-b - sqrtDiscriminant) / (2 * a);

    if (t1 >= 0 && t1 <= 1) {
      return t1;
    }

    return clamp(t2, 0, 1);
  }

  private getQuadValue(p0: number, p1: number, p2: number, t: number) {
    return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
  }

  private quadTangent(p0: number, p1: number, p2: number, t: number) {
    return 2 * (1 - t) * (p1 - p0) + 2 * (p2 - p1) * t;
  }

  private disturb(amount: number) {
    const strength = Math.min(9, 2.2 + amount * 3.6) * (1 + this.index * 0.06);

    this.points.forEach((point, index) => {
      const edgeDamping =
        index === 0 || index === this.points.length - 1 ? 0.35 : 1;
      const direction = (index + this.index) % 2 === 0 ? 1 : -1;
      point.disturb(strength * edgeDamping, direction);
    });
  }

  update({ window, frameInfo }: Canvas2d) {
    if (!this.isInit) {
      this.init(window);
      this.isInit = true;
    }

    this.updateSpring(window, frameInfo.timestamp);

    for (let i = 1; i < this.totalPoints - 1; i++) {
      this.points[i].update();
    }
  }

  draw({ ctx, window }: Canvas2d) {
    let prevX = this.points[0].x;
    let prevY = this.points[0].y;

    const wavePath = Skia.PathBuilder.Make().moveTo(prevX, prevY);

    for (let i = 1; i < this.totalPoints; i++) {
      const cx = (prevX + this.points[i].x) / 2;
      const cy = (prevY + this.points[i].y) / 2;

      wavePath.quadTo(prevX, prevY, cx, cy);

      prevX = this.points[i].x;
      prevY = this.points[i].y;
    }

    const path = wavePath
      .lineTo(prevX, prevY)
      .lineTo(window.width + WAVE_OVERSCAN, window.height + WAVE_OVERSCAN)
      .lineTo(this.points[0].x, window.height + WAVE_OVERSCAN)
      .close()
      .build();

    ctx.drawPath(path, this.paint);
  }
}
