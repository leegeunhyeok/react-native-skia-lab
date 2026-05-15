import { BlurStyle, Skia, TileMode } from '@shopify/react-native-skia';
import type { Canvas2d } from '@/hooks/useCanvas';
import { clamp } from 'react-native-reanimated';
import {
  createRainExplosionParticles,
  getCloudScale,
  getCloudShape,
  getCloudSpeed,
  getSpawnedCloudInput,
} from '../utils/util';
import type Beach from './beach';
import type Sea from './sea';

const RAIN_DURATION_MS = 3000;
const RAIN_GRAVITY = 1320;
const MAX_FRAME_DELTA_SECONDS = 1 / 30;
const MAX_CLOUDS = 5;
const SPAWN_CHECK_MS = 1800;
const MAX_RAIN_LOSS = 0.42;
const STORM_FADE_IN_SPEED = 2.9;
const STORM_FADE_OUT_SPEED = 1.35;

type RainDrop = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  length: number;
  age: number;
  duration: number;
};

type RainParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  age: number;
  duration: number;
};

type CloudState = {
  depth: number;
  yRatio: number;
  progress: number;
  speed: number;
  seed: number;
  x: number;
  y: number;
  r: number;
  scale: number;
  width: number;
  height: number;
  bounce: number;
  bounceVelocity: number;
  rainUntil: number;
  rainStartedAt: number;
  rainRemaining: number;
  rainEmission: number;
  rainLoss: number;
  stormProgress: number;
  shapeA: number;
  shapeB: number;
  shapeC: number;
};

export default class Clouds {
  private __workletClass = true;
  private clouds: CloudState[] = [
    this.createCloud(0.44, 0.16, -0.08, 0.13),
    this.createCloud(0.36, 0.17, 0.68, 0.2),
    this.createCloud(0.58, 0.27, 0.2, 0.55),
    this.createCloud(0.84, 0.33, 0.44, 0.86),
    this.createCloud(0.7, 0.22, -0.34, 0.74),
  ];
  private rainDrops: RainDrop[] = [];
  private rainParticles: RainParticle[] = [];
  private lastTimestamp = 0;
  private lastSpawnCheck = 0;
  private currentTimestamp = 0;
  private stageWidth = 0;
  private stageHeight = 0;
  private fillPaint = Skia.Paint();
  private shadePaint = Skia.Paint();
  private glowPaint = Skia.Paint();
  private morphPaint = Skia.Paint();
  private rainPaint = Skia.Paint();
  private particlePaint = Skia.Paint();

  constructor() {
    this.fillPaint.setAntiAlias(true);
    this.shadePaint.setAntiAlias(true);
    this.glowPaint.setAntiAlias(true);
    this.glowPaint.setMaskFilter(
      Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 10, false),
    );
    this.morphPaint.setAntiAlias(true);
    this.morphPaint.setImageFilter(
      Skia.ImageFilter.MakeBlur(4.8, 4.8, TileMode.Clamp, null),
    );
    this.morphPaint.setColorFilter(
      Skia.ColorFilter.MakeMatrix([
        1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 18, -7,
      ]),
    );
    this.rainPaint.setAntiAlias(true);
    this.rainPaint.setStrokeWidth(1.35);
    this.rainPaint.setColor(Skia.Color('rgba(222, 248, 255, 0.76)'));
    this.particlePaint.setAntiAlias(true);
    this.particlePaint.setColor(Skia.Color('rgba(231, 252, 255, 0.82)'));
  }

  private createCloud(
    depth: number,
    yRatio: number,
    progress: number,
    seed: number,
  ): CloudState {
    return {
      depth,
      yRatio,
      progress,
      speed: getCloudSpeed(depth, seed),
      seed,
      x: 0,
      y: 0,
      r: 0,
      scale: 1,
      width: 0,
      height: 0,
      bounce: 0,
      bounceVelocity: 0,
      rainUntil: 0,
      rainStartedAt: 0,
      rainRemaining: 0,
      rainEmission: 0,
      rainLoss: 0,
      stormProgress: 0,
      ...getCloudShape(seed),
    };
  }

  rain(x: number, y: number) {
    const cloud = this.getTappedCloud(x, y);

    if (!cloud) {
      return false;
    }

    const timestamp = this.currentTimestamp || this.lastTimestamp;
    cloud.rainStartedAt = timestamp;
    cloud.rainUntil = timestamp + RAIN_DURATION_MS;
    cloud.rainRemaining = RAIN_DURATION_MS;
    cloud.rainEmission = 4;
    cloud.rainLoss = Math.min(MAX_RAIN_LOSS, cloud.rainLoss + 0.018);
    cloud.bounceVelocity = -1.5;

    return true;
  }

  private getTappedCloud(x: number, y: number) {
    const shouldScaleCoordinates =
      this.stageWidth > 0 || this.stageHeight > 0
        ? x > this.stageWidth || y > this.stageHeight
        : x > 500 || y > 700;
    const normalizedX = shouldScaleCoordinates ? x / 3 : x;
    const normalizedY = shouldScaleCoordinates ? y / 3 : y;
    let nearestCloud: CloudState | null = null;
    let nearestDistance = Infinity;

    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      const rx = cloud.width / 2;
      const ry = cloud.height / 2;

      if (rx <= 0 || ry <= 0) {
        continue;
      }

      const dx = (normalizedX - cloud.x) / (rx * 1.28);
      const dy = (normalizedY - cloud.y) / (ry * 1.65);
      const distance = dx * dx + dy * dy;

      if (distance < nearestDistance) {
        nearestCloud = cloud;
        nearestDistance = distance;
      }

      if (distance <= 1.48) {
        return cloud;
      }
    }

    if (
      nearestCloud &&
      normalizedY <= (this.stageHeight || 760) * 0.62
    ) {
      return nearestCloud;
    }

    return null;
  }

  private update(timestamp: number, stageWidth: number, sea: Sea, beach: Beach) {
    this.currentTimestamp = timestamp;

    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
      this.lastSpawnCheck = timestamp;
      return;
    }

    const deltaSeconds = Math.min(
      (timestamp - this.lastTimestamp) / 1000,
      MAX_FRAME_DELTA_SECONDS,
    );
    const deltaMs = deltaSeconds * 1000;
    this.lastTimestamp = timestamp;

    this.clouds.forEach((cloud) => {
      cloud.progress += cloud.speed * deltaSeconds;

      this.updateBounce(cloud, deltaSeconds);
      this.updateStormColor(cloud, deltaSeconds);
      this.updateRainEmitter(cloud, deltaSeconds, deltaMs, stageWidth);
    });

    this.manageClouds(timestamp);
    this.updateRainDrops(sea, beach, deltaSeconds, deltaMs);
    this.updateRainParticles(deltaSeconds, deltaMs);
  }

  private manageClouds(timestamp: number) {
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      if (cloud.progress <= 1.22) {
        continue;
      }

      this.clouds.splice(i, 1);
    }

    if (
      this.clouds.length >= MAX_CLOUDS ||
      timestamp - this.lastSpawnCheck < SPAWN_CHECK_MS
    ) {
      return;
    }

    this.lastSpawnCheck = timestamp;

    while (this.clouds.length < MAX_CLOUDS) {
      this.clouds.push(this.createSpawnedCloud(timestamp, this.clouds.length));
    }
  }

  private createSpawnedCloud(timestamp: number, index: number) {
    const farthestLeft = this.clouds.reduce(
      (min, cloud) => Math.min(min, cloud.progress),
      1,
    );
    const { depth, yRatio, progress, seed } = getSpawnedCloudInput(
      timestamp,
      index,
      farthestLeft,
    );

    return this.createCloud(depth, yRatio, progress, seed);
  }

  private updateBounce(cloud: CloudState, deltaSeconds: number) {
    const stiffness = 34;
    const damping = 7.6;
    const force = -cloud.bounce * stiffness - cloud.bounceVelocity * damping;

    cloud.bounceVelocity += force * deltaSeconds;
    cloud.bounce += cloud.bounceVelocity * deltaSeconds;

    if (Math.abs(cloud.bounce) < 0.001 && Math.abs(cloud.bounceVelocity) < 0.001) {
      cloud.bounce = 0;
      cloud.bounceVelocity = 0;
    }
  }

  private updateStormColor(cloud: CloudState, deltaSeconds: number) {
    const target = cloud.rainRemaining > 0 ? 1 : 0;
    const speed = target > cloud.stormProgress
      ? STORM_FADE_IN_SPEED
      : STORM_FADE_OUT_SPEED;
    const nextProgress =
      cloud.stormProgress + (target - cloud.stormProgress) * speed * deltaSeconds;

    if (Math.abs(target - nextProgress) < 0.01) {
      cloud.stormProgress = target;
      return;
    }

    cloud.stormProgress = clamp(nextProgress, 0, 1);
  }

  private mixColor(start: number, end: number, progress: number) {
    return Math.round(start + (end - start) * progress);
  }

  private updateRainEmitter(
    cloud: CloudState,
    deltaSeconds: number,
    deltaMs: number,
    stageWidth: number,
  ) {
    if (cloud.rainRemaining <= 0) {
      cloud.rainEmission = 0;
      return;
    }

    cloud.rainRemaining = Math.max(0, cloud.rainRemaining - deltaMs);

    const elapsed = RAIN_DURATION_MS - cloud.rainRemaining;
    const remaining = cloud.rainRemaining;
    const envelope =
      Math.min(elapsed / 320, 1) * Math.min(remaining / 520, 1);
    const dropsPerSecond = (18 + cloud.depth * 22) * envelope;
    cloud.rainEmission += dropsPerSecond * deltaSeconds;
    cloud.rainLoss = Math.min(
      MAX_RAIN_LOSS,
      cloud.rainLoss + 0.0275 * deltaSeconds,
    );

    while (cloud.rainEmission >= 1) {
      this.emitRainDrop(cloud, stageWidth);
      cloud.rainEmission -= 1;
    }
  }

  private emitRainDrop(cloud: CloudState, stageWidth: number) {
    const spread = cloud.width * (0.34 + cloud.depth * 0.06);
    const randomA = Math.sin((this.currentTimestamp + cloud.seed * 977) * 0.021);
    const randomB = Math.sin((this.currentTimestamp + cloud.seed * 431) * 0.037);
    const x = cloud.x + randomA * spread;
    const y = cloud.y + cloud.height * (0.48 + randomB * 0.04);
    const radius = Math.max(1, stageWidth * 0.0034 * (0.8 + cloud.depth * 0.35));

    this.rainDrops.push({
      x,
      y,
      vx: 10 + randomB * 18,
      vy: 120 + cloud.depth * 70 + Math.abs(randomA) * 34,
      radius,
      length: radius * (7.5 + cloud.depth * 2.4),
      age: 0,
      duration: 3600,
    });
  }

  private updateRainDrops(
    sea: Sea,
    beach: Beach,
    deltaSeconds: number,
    deltaMs: number,
  ) {
    for (let i = this.rainDrops.length - 1; i >= 0; i--) {
      const drop = this.rainDrops[i];
      drop.age += deltaMs;
      drop.vy += RAIN_GRAVITY * deltaSeconds;
      drop.x += drop.vx * deltaSeconds;
      drop.y += drop.vy * deltaSeconds;

      if (drop.vy > 0) {
        const bounceSurface = beach.getRainBounceSurface(
          drop.x,
          drop.y + drop.length,
          drop.radius,
        );

        if (bounceSurface) {
          this.explodeRainDrop(drop, bounceSurface.x, bounceSurface.y);
          this.rainDrops.splice(i, 1);
          continue;
        }
      }

      if (sea.collision(drop.x, drop.y + drop.length, drop.radius)) {
        sea.ripple([
          {
            x: drop.x,
            y: sea.getSurfaceYAt(drop.x),
            radius: drop.radius,
            strength: 0.16,
          },
        ]);
        this.rainDrops.splice(i, 1);
        continue;
      }

      if (drop.age > drop.duration) {
        this.rainDrops.splice(i, 1);
      }
    }
  }

  private explodeRainDrop(drop: RainDrop, x: number, y: number) {
    this.rainParticles.push(...createRainExplosionParticles(drop, x, y));
  }

  private updateRainParticles(deltaSeconds: number, deltaMs: number) {
    for (let i = this.rainParticles.length - 1; i >= 0; i--) {
      const particle = this.rainParticles[i];
      particle.age += deltaMs;
      particle.vy += RAIN_GRAVITY * 0.72 * deltaSeconds;
      particle.vx *= 0.986;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;

      if (particle.age >= particle.duration) {
        this.rainParticles.splice(i, 1);
      }
    }
  }

  private drawCloud(canvas: Canvas2d, cloud: CloudState) {
    const baseScale = getCloudScale(cloud.depth);
    const rainShrink = 1 - cloud.rainLoss;
    const bounceScaleX = 1 + cloud.bounce * 0.12;
    const bounceScaleY = 1 - cloud.bounce * 0.18;
    const scale = baseScale * rainShrink;
    const width = canvas.window.width;
    const x = -width * 0.24 + cloud.progress * width * 1.48;
    const y = canvas.window.height * cloud.yRatio + cloud.bounce * cloud.r * 0.42;
    const r = Math.max(16, width * 0.075 * scale);
    const alpha = 0.46 + cloud.depth * 0.26;
    const shadeAlpha = 0.09 + cloud.depth * 0.06;
    const stormProgress = cloud.stormProgress * (0.62 + cloud.depth * 0.1);
    const fillR = this.mixColor(249, 188, stormProgress);
    const fillG = this.mixColor(253, 204, stormProgress);
    const fillB = this.mixColor(255, 214, stormProgress);
    const glowR = this.mixColor(255, 224, stormProgress);
    const glowG = this.mixColor(251, 232, stormProgress);
    const glowB = this.mixColor(232, 233, stormProgress);
    const shadeR = this.mixColor(137, 112, stormProgress);
    const shadeG = this.mixColor(202, 152, stormProgress);
    const shadeB = this.mixColor(227, 174, stormProgress);
    const stormShadeAlpha = shadeAlpha + stormProgress * (0.08 + cloud.depth * 0.05);

    cloud.x = x;
    cloud.y = y;
    cloud.r = r;
    cloud.scale = scale;
    cloud.width = r * 4.7 * (1 + cloud.depth * 0.18) * bounceScaleX;
    cloud.height = r * 2.14 * bounceScaleY;

    this.glowPaint.setColor(Skia.Color(`rgba(${glowR}, ${glowG}, ${glowB}, ${alpha * 0.2})`));
    this.fillPaint.setColor(Skia.Color(`rgba(${fillR}, ${fillG}, ${fillB}, ${alpha})`));
    this.shadePaint.setColor(Skia.Color(`rgba(${shadeR}, ${shadeG}, ${shadeB}, ${stormShadeAlpha})`));

    canvas.ctx.save();
    canvas.ctx.translate(x, y);
    canvas.ctx.scale(
      (1 + cloud.depth * 0.18) * bounceScaleX,
      Math.max(0.78, bounceScaleY),
    );

    canvas.ctx.drawOval(
      Skia.XYWHRect(-r * 2.24, -r * 0.5, r * 4.48, r * 1.34),
      this.glowPaint,
    );

    const bodyPath = Skia.Path.Make();
    const a = cloud.shapeA;
    const b = cloud.shapeB;
    const c = cloud.shapeC;
    const left = -r * (2.0 + a * 0.26);
    const right = r * (1.76 + b * 0.34);
    const lower = r * (0.46 + c * 0.18);
    const topA = -r * (0.7 + a * 0.28);
    const topB = -r * (1.02 + b * 0.3);
    const topC = -r * (0.66 + c * 0.24);

    bodyPath.moveTo(left, r * (0.16 + c * 0.08));
    bodyPath.cubicTo(left - r * 0.02, -r * 0.2, -r * (1.74 + b * 0.18), -r * 0.5, -r * (1.32 + a * 0.16), -r * 0.36);
    bodyPath.cubicTo(-r * (1.14 + c * 0.16), topA, -r * (0.64 + a * 0.16), -r * 0.98, -r * (0.28 + b * 0.16), -r * 0.68);
    bodyPath.cubicTo(-r * 0.08, topB, r * (0.48 + c * 0.18), -r * 1.08, r * (0.76 + a * 0.18), topC);
    bodyPath.cubicTo(r * (1.1 + b * 0.16), -r * 0.78, r * (1.56 + c * 0.28), -r * 0.38, r * (1.72 + a * 0.14), r * 0.02);
    bodyPath.cubicTo(right + r * 0.32, r * 0.12, right + r * 0.24, r * (0.48 + b * 0.14), right - r * 0.02, lower);
    bodyPath.cubicTo(r * (1.18 + a * 0.1), r * (0.86 + c * 0.1), r * (0.62 + b * 0.14), r * 0.78, r * (0.44 + c * 0.14), r * 0.48);
    bodyPath.cubicTo(r * (0.02 + a * 0.1), r * (0.82 + b * 0.12), -r * (0.52 + c * 0.16), r * 0.78, -r * (0.78 + a * 0.18), r * 0.48);
    bodyPath.cubicTo(-r * (1.14 + b * 0.18), r * (0.72 + a * 0.1), -r * (1.92 + c * 0.18), r * (0.62 + b * 0.1), left, r * (0.16 + c * 0.08));
    bodyPath.close();

    canvas.ctx.saveLayer(this.morphPaint);
    canvas.ctx.drawPath(bodyPath, this.fillPaint);
    canvas.ctx.drawCircle(-r * (1.48 + a * 0.2), -r * (0.02 + c * 0.06), r * (0.5 + b * 0.14), this.fillPaint);
    canvas.ctx.drawCircle(-r * (0.86 + b * 0.2), -r * (0.44 + a * 0.16), r * (0.58 + c * 0.12), this.fillPaint);
    canvas.ctx.drawCircle(-r * (0.16 + c * 0.16), -r * (0.58 + b * 0.18), r * (0.68 + a * 0.16), this.fillPaint);
    canvas.ctx.drawCircle(r * (0.52 + a * 0.2), -r * (0.44 + c * 0.16), r * (0.56 + b * 0.1), this.fillPaint);
    canvas.ctx.drawCircle(r * (1.18 + b * 0.22), -r * (0.08 + a * 0.08), r * (0.43 + c * 0.1), this.fillPaint);
    canvas.ctx.drawCircle(-r * (0.46 + b * 0.16), r * (0.22 + a * 0.08), r * (0.34 + c * 0.08), this.fillPaint);
    canvas.ctx.drawCircle(r * (0.28 + c * 0.18), r * (0.26 + b * 0.08), r * (0.3 + a * 0.08), this.fillPaint);
    canvas.ctx.drawOval(
      Skia.XYWHRect(-r * (1.72 + a * 0.16), -r * 0.02, r * (3.36 + b * 0.36), r * (0.58 + c * 0.14)),
      this.fillPaint,
    );
    canvas.ctx.restore();

    canvas.ctx.saveLayer(this.morphPaint);
    canvas.ctx.drawOval(
      Skia.XYWHRect(-r * 1.88, r * 0.16, r * 3.64, r * 0.52),
      this.shadePaint,
    );
    canvas.ctx.restore();

    canvas.ctx.restore();
  }

  private drawRain(canvas: Canvas2d) {
    this.rainDrops.forEach((drop) => {
      const ageFade = 1 - Math.max(0, drop.age - 3000) / 600;
      this.rainPaint.setAlphaf(clamp(ageFade, 0, 1) * 0.78);

      canvas.ctx.drawLine(
        drop.x,
        drop.y,
        drop.x + drop.vx * 0.025,
        drop.y + drop.length,
        this.rainPaint,
      );
    });
  }

  private drawRainParticles(canvas: Canvas2d) {
    this.rainParticles.forEach((particle) => {
      const progress = Math.min(particle.age / particle.duration, 1);
      const alpha = (1 - progress) * 0.82;
      const stretch = 1 + Math.min(Math.hypot(particle.vx, particle.vy) / 190, 1.6);

      this.particlePaint.setAlphaf(alpha);
      canvas.ctx.drawOval(
        Skia.XYWHRect(
          particle.x - particle.radius * 0.9,
          particle.y - particle.radius * stretch,
          particle.radius * 1.8,
          particle.radius * stretch * 2,
        ),
        this.particlePaint,
      );
    });
  }

  draw(canvas: Canvas2d, sea: Sea, beach: Beach) {
    this.stageWidth = canvas.window.width;
    this.stageHeight = canvas.window.height;
    this.update(canvas.frameInfo.timestamp, canvas.window.width, sea, beach);
    this.clouds.forEach((cloud) => {
      this.drawCloud(canvas, cloud);
    });
    this.drawRain(canvas);
    this.drawRainParticles(canvas);
  }
}
