import type { Canvas2d } from "@/hooks/useCanvas";
import { Skia } from "@shopify/react-native-skia";
import { clamp } from "react-native-reanimated";

const MAX_SPEED = 1600;
const DAMPING_PER_FRAME = 0.997;
const DRAG_FOLLOW_SPEED = 0.16;
const RELEASE_POWER = 0.9;
const FRAME_SECONDS = 1 / 60;

export default class Ball {
  private __workletClass = true;
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isTapped = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private targetX: number;
  private targetY: number;
  private fillPaint = Skia.Paint();

  constructor(
    id: number,
    x: number,
    y: number,
    radius: number,
    color: string,
    vx = 0,
    vy = 0
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.targetX = x;
    this.targetY = y;

    this.fillPaint.setAntiAlias(true);
    this.fillPaint.setColor(Skia.Color(color));
  }

  tap(x: number, y: number) {
    const dx = x - this.x;
    const dy = y - this.y;

    this.isTapped = dx * dx + dy * dy <= this.radius * this.radius;

    if (!this.isTapped) {
      return false;
    }

    this.dragOffsetX = this.x - x;
    this.dragOffsetY = this.y - y;
    this.targetX = this.x;
    this.targetY = this.y;
    this.setVelocity(0, 0);

    return true;
  }

  drag(x: number, y: number) {
    if (!this.isTapped) {
      return;
    }

    this.targetX = x + this.dragOffsetX;
    this.targetY = y + this.dragOffsetY;
  }

  release() {
    if (!this.isTapped) {
      return;
    }

    this.isTapped = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }

  throw(velocityX: number, velocityY: number) {
    this.release();
    this.setVelocity(
      this.vx * 0.42 + velocityX * RELEASE_POWER,
      this.vy * 0.42 + velocityY * RELEASE_POWER
    );
  }

  setVelocity(vx: number, vy: number) {
    this.vx = clamp(vx, -MAX_SPEED, MAX_SPEED);
    this.vy = clamp(vy, -MAX_SPEED, MAX_SPEED);
  }

  update() {
    const dt = FRAME_SECONDS;

    if (this.isTapped) {
      const follow = 1 - Math.pow(1 - DRAG_FOLLOW_SPEED, dt * 60);
      const nextX = this.x + (this.targetX - this.x) * follow;
      const nextY = this.y + (this.targetY - this.y) * follow;

      this.vx = (nextX - this.x) / dt;
      this.vy = (nextY - this.y) / dt;
      this.x = nextX;
      this.y = nextY;

      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const damping = Math.pow(DAMPING_PER_FRAME, dt * 60);
    this.vx *= damping;
    this.vy *= damping;
  }

  draw({ ctx }: Canvas2d) {
    ctx.drawCircle(this.x, this.y, this.radius, this.fillPaint);
  }
}
