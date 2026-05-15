import type { Canvas2d } from '@/hooks/useCanvas';
import { PaintStyle, Skia, StrokeCap } from '@shopify/react-native-skia';

export const ERASER_RADIUS = 28;

export default class Eraser {
  private __workletClass = true;
  private isDown = false;
  private x = 0;
  private y = 0;
  private fillPaint = Skia.Paint();
  private strokePaint = Skia.Paint();

  constructor() {
    this.fillPaint.setAntiAlias(true);
    this.fillPaint.setColor(Skia.Color('rgba(177, 164, 157, 0.18)'));

    this.strokePaint.setAntiAlias(true);
    this.strokePaint.setColor(Skia.Color('rgba(104, 123, 116, 0.58)'));
    this.strokePaint.setStyle(PaintStyle.Stroke);
    this.strokePaint.setStrokeWidth(2);
    this.strokePaint.setStrokeCap(StrokeCap.Round);
  }

  begin(x: number, y: number) {
    this.isDown = true;
    this.move(x, y);
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  finish() {
    this.isDown = false;
  }

  draw({ ctx }: Canvas2d) {
    if (!this.isDown) {
      return;
    }

    ctx.drawCircle(this.x, this.y, ERASER_RADIUS, this.fillPaint);
    ctx.drawCircle(this.x, this.y, ERASER_RADIUS, this.strokePaint);
  }
}
