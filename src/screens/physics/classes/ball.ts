import type { Canvas2d } from "@/hooks/useCanvas";
import { BlurStyle, Skia } from "@shopify/react-native-skia";
import { clamp } from "react-native-reanimated";

export default class Ball {
  private __workletClass = true;
  x: number;
  y: number;
  vx: number;
  vy = 0;
  radius: number;
  private fillPaint = Skia.Paint();
  private highlightPaint = Skia.Paint();
  private shadowPaint = Skia.Paint();

  constructor(x: number, y: number, radius: number, vx: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vx = vx;

    this.fillPaint.setAntiAlias(true);
    this.fillPaint.setColor(Skia.Color(color));
    this.highlightPaint.setAntiAlias(true);
    this.highlightPaint.setColor(Skia.Color("rgba(255, 255, 255, 0.38)"));
    this.shadowPaint.setAntiAlias(true);
    this.shadowPaint.setColor(Skia.Color("rgba(85, 98, 92, 0.18)"));
    this.shadowPaint.setMaskFilter(
      Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 5, false)
    );
  }

  update(dt: number, gravity: number, maxSpeed: number) {
    this.vx = clamp(this.vx, -maxSpeed, maxSpeed);
    this.vy = clamp(this.vy + gravity * dt, -maxSpeed, maxSpeed);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  isBelow(height: number) {
    return this.y - this.radius > height + this.radius * 8;
  }

  setVelocity(vx: number, vy: number) {
    this.vx = vx;
    this.vy = vy;
  }

  clampVelocity(maxSpeed: number) {
    this.vx = clamp(this.vx, -maxSpeed, maxSpeed);
    this.vy = clamp(this.vy, -maxSpeed, maxSpeed);
  }

  draw({ ctx }: Canvas2d) {
    ctx.drawCircle(
      this.x + this.radius * 0.14,
      this.y + this.radius * 0.18,
      this.radius * 0.94,
      this.shadowPaint
    );
    ctx.drawCircle(this.x, this.y, this.radius, this.fillPaint);
    ctx.drawCircle(
      this.x - this.radius * 0.32,
      this.y - this.radius * 0.36,
      this.radius * 0.24,
      this.highlightPaint
    );
  }
}
