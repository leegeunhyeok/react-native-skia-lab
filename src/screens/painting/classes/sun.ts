import { PI2 } from "@/constants/math";
import type { Canvas2d } from "@/hooks/useCanvas";
import { BlurStyle, Skia, TileMode, vec } from "@shopify/react-native-skia";
import { getCirclePoint, getFlareStrength } from "../utils/util";

type Point = { x: number; y: number };

export default class Sun {
  private __workletClass = true;
  private radius = 100;
  private paint = Skia.Paint();
  private outerGlowPaint = Skia.Paint();
  private innerGlowPaint = Skia.Paint();
  private flamePaint = Skia.Paint();
  private center: Point = { x: 0, y: 0 };
  private total = 60;
  private gap: number = 1 / this.total;
  private originPos: Point[] = [];
  private pos: Point[] = [];
  private totalFlamePoints = 84;
  private flameGap: number = 1 / this.totalFlamePoints;
  private flameOriginOffset = 11;
  private maxFlareOffset = 52;
  private flameOriginPos: Point[] = [];
  private flamePos: Point[] = [];
  private fps = 20;
  private fpsTime: number = 1000 / this.fps;
  private time = 0;
  private currentTimestamp = 0;
  private flareStartedAt = 0;
  private flareUntil = 0;

  constructor() {
    for (let i = 0; i < this.total; i++) {
      const pos = getCirclePoint(this.gap * i, this.radius);
      this.originPos[i] = pos;
      this.pos[i] = pos;
    }

    this.paint.setColor(Skia.Color("#ffb200"));
    this.outerGlowPaint.setColor(Skia.Color("rgba(255, 183, 0, 0.1)"));
    this.outerGlowPaint.setMaskFilter(
      Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 28, false)
    );
    this.innerGlowPaint.setColor(Skia.Color("rgba(255, 205, 32, 0.14)"));
    this.innerGlowPaint.setMaskFilter(
      Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 12, false)
    );
    this.updateGlowPaints(0);
    this.flamePaint.setMaskFilter(
      Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 4, false)
    );

    for (let i = 0; i < this.totalFlamePoints; i++) {
      const pos = getCirclePoint(
        this.flameGap * i,
        this.radius + this.flameOriginOffset
      );
      this.flameOriginPos[i] = pos;
      this.flamePos[i] = pos;
    }
  }

  private updatePoints() {
    for (let i = 1; i < this.total; i++) {
      this.pos[i] = {
        x: this.originPos[i].x + this.ranInt(3),
        y: this.originPos[i].y + this.ranInt(3),
      };
    }
  }

  private updateFlamePoints(flareStrength: number) {
    for (let i = 0; i < this.totalFlamePoints; i++) {
      const gap = this.flameGap * i;
      const theta = PI2 * gap;
      const origin = this.flameOriginPos[i];
      const tooth = i % 7 === 0 ? 27 : i % 3 === 0 ? 16 : 5;
      const flareTooth = tooth * (1 + flareStrength * 0.78);
      const jitter = this.ranInt(8 + flareStrength * 12) - 5;
      const offset = flareTooth + jitter;
      this.flamePos[i] = {
        x: origin.x + Math.cos(theta) * offset,
        y: origin.y + Math.sin(theta) * offset,
      };
    }
  }

  private updateGlowPaints(flareStrength: number) {
    const outerAlpha = 0.1 + flareStrength * 0.08;
    const innerAlpha = 0.14 + flareStrength * 0.08;

    this.outerGlowPaint.setColor(
      Skia.Color(`rgba(255, 183, 0, ${outerAlpha})`)
    );
    this.innerGlowPaint.setColor(
      Skia.Color(`rgba(255, 205, 32, ${innerAlpha})`)
    );
    this.flamePaint.setShader(
      Skia.Shader.MakeRadialGradient(
        vec(0, 0),
        this.radius + 42 + flareStrength * 14,
        [
          `rgba(255, 225, 48, ${0.18 + flareStrength * 0.08})`,
          `rgba(255, 166, 0, ${0.2 + flareStrength * 0.1})`,
          `rgba(255, 64, 0, ${0.18 + flareStrength * 0.16})`,
        ].map(Skia.Color),
        [0.68, 0.86, 1],
        TileMode.Clamp
      )
    );
  }

  private ranInt(max: number) {
    return Math.random() * max;
  }

  isTapped(x: number, y: number) {
    const hitRadius =
      this.radius + this.flameOriginOffset + this.maxFlareOffset;
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    return dx * dx + dy * dy <= hitRadius * hitRadius;
  }

  flare(seconds: number) {
    const duration = Math.max(seconds, 0) * 1000;
    const startedAt = this.currentTimestamp || this.time;
    if (startedAt < this.flareUntil) {
      this.flareUntil = Math.max(this.flareUntil, startedAt + duration);
      return;
    }

    this.flareStartedAt = startedAt;
    this.flareUntil = startedAt + duration;
  }

  draw({ ctx, window, frameInfo }: Canvas2d) {
    const timestamp = frameInfo.timestamp;
    this.currentTimestamp = timestamp;

    if (!this.time) {
      this.time = timestamp;
    }

    const flareStrength = getFlareStrength(
      timestamp,
      this.flareStartedAt,
      this.flareUntil
    );

    const now = timestamp - this.time;
    if (now > this.fpsTime) {
      this.time = timestamp;
      this.updatePoints();
      this.updateFlamePoints(flareStrength);
    }
    this.updateGlowPaints(flareStrength);

    const sunPath = Skia.Path.Make();
    this.pos.forEach((p, i) => {
      if (i === 0) {
        sunPath.moveTo(p.x, p.y);
        return;
      }

      sunPath.lineTo(p.x, p.y);
    });
    sunPath.close();

    const flamePath = Skia.Path.Make();
    this.flamePos.forEach((p, i) => {
      if (i === 0) {
        flamePath.moveTo(p.x, p.y);
        return;
      }

      flamePath.lineTo(p.x, p.y);
    });
    flamePath.close();

    ctx.save();
    this.center = {
      x: window.width - this.radius / 2,
      y: this.radius / 2,
    };
    ctx.translate(this.center.x, this.center.y);
    ctx.drawCircle(
      0,
      0,
      this.radius *
        (1.32 + Math.sin(timestamp / 520) * 0.02 + flareStrength * 0.1),
      this.outerGlowPaint
    );
    ctx.drawCircle(
      0,
      0,
      this.radius * (1.12 + flareStrength * 0.06),
      this.innerGlowPaint
    );
    ctx.drawPath(flamePath, this.flamePaint);
    ctx.drawPath(sunPath, this.paint);
    ctx.restore();
  }
}
