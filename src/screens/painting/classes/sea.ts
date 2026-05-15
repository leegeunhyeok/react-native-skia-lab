import type { Canvas2d } from "@/hooks/useCanvas";
import { between } from "@/utils/util";
import { Skia, TileMode } from "@shopify/react-native-skia";
import { clamp } from "react-native-reanimated";
import type { SurfacePoint } from "./wave";
import { Wave } from "./wave";

const DEFAULT_WATER_LEVEL_RATIO = 1.15;
const SPLASH_GRAVITY = 1080;
const SPLASH_DEPTH_GAIN = 0.8;
const MAX_DEPTH = 170;
const COLLISION_SINK = 9;
const PARTICLE_SURFACE = 0;
const PARTICLE_DROPLET = 1;
const PARTICLE_JET = 2;
const ABSORB_DURATION_MS = 240;
const SURFACE_COLOR_INDEX = 1;

export type SplashSeed = {
  x: number;
  y: number;
  radius: number;
  strength?: number;
};

type SplashParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  scaleX: number;
  scaleY: number;
  age: number;
  duration: number;
  absorbAge: number;
  colorIndex: number;
  kind: number;
  isAbsorbing: boolean;
};

type Splash = {
  particles: SplashParticle[];
  age: number;
  duration: number;
};

export default class Sea {
  private __workletClass = true;
  private totalWaves = 3;
  private totalPoints = 6;
  private color: string[] = [
    "rgba(0,199,235,0.4)",
    "rgba(0,146,199,0.4)",
    "rgba(0,87,158,0.4)",
  ];
  private paint = Skia.Paint();
  private x = 0;
  private y = 0;
  private width = 0;
  private depth = 0;
  private splashes: Splash[] = [];
  private lastTimestamp = 0;
  private splashIndex = 0;
  private dropletPaint = Skia.Paint();
  private airbornePaint = Skia.Paint();
  private airborneLayerPaint = Skia.Paint();
  waves: Wave[] = [];

  constructor() {
    this.paint.setImageFilter(
      Skia.ImageFilter.MakeBlur(5.5, 5.5, TileMode.Clamp, null)
    );
    this.paint.setColorFilter(
      Skia.ColorFilter.MakeMatrix([
        1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 90, -50,
      ])
    );

    for (let i = 0; i < this.totalWaves; i++) {
      this.waves[i] = new Wave(i, this.totalPoints, this.color[i]);
    }

    this.dropletPaint.setAntiAlias(true);
    this.airbornePaint.setAntiAlias(true);
    this.airborneLayerPaint.setImageFilter(
      Skia.ImageFilter.MakeBlur(7.4, 7.4, TileMode.Clamp, null)
    );
    this.airborneLayerPaint.setColorFilter(
      Skia.ColorFilter.MakeMatrix([
        1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 46, -12,
      ])
    );
  }

  collision(x: number, y: number, radius = 0) {
    if (!between(x, this.x, this.x + this.width)) {
      return false;
    }

    return y + radius >= this.getSurfaceYAt(x) + COLLISION_SINK;
  }

  sound() {}

  splash(seeds: SplashSeed[]) {
    const particles = this.createSplashParticleBatch(seeds);

    if (!particles) {
      return;
    }

    seeds.forEach((seed) => {
      const surfaceY = this.getSurfaceYAt(seed.x);
      const strength = seed.strength ?? 1;
      const colorIndex = SURFACE_COLOR_INDEX;
      const splashIndex = this.splashIndex++;
      const direction = splashIndex % 2 === 0 ? -1 : 1;
      const shouldEmitSideDrop = strength >= 0.75 && splashIndex % 3 === 0;
      const baseRadius = Math.max(3.2, seed.radius * 1.28 * strength);
      const dropRadius = Math.max(1.8, seed.radius * 0.62 * strength);
      const mistCount = Math.max(9, Math.round(18 * strength));

      particles.push(
        {
          x: seed.x,
          y: surfaceY - baseRadius * 0.06,
          vx: 0,
          vy: 0,
          radius: baseRadius,
          scaleX: 2.8,
          scaleY: 0.58,
          age: 0,
          duration: 320,
          absorbAge: 0,
          colorIndex,
          kind: PARTICLE_SURFACE,
          isAbsorbing: false,
        },
        {
          x: seed.x + direction * seed.radius * 0.18,
          y: surfaceY - baseRadius * 0.18,
          vx: direction * 5,
          vy: 0,
          radius: baseRadius * 0.94,
          scaleX: 0.72,
          scaleY: 2.35,
          age: 0,
          duration: 430,
          absorbAge: 0,
          colorIndex,
          kind: PARTICLE_JET,
          isAbsorbing: false,
        },
        {
          x: seed.x - direction * seed.radius * 0.7,
          y: surfaceY - baseRadius * 0.08,
          vx: -direction * 18,
          vy: 0,
          radius: baseRadius * 0.5,
          scaleX: 1.7,
          scaleY: 0.54,
          age: 0,
          duration: 270,
          absorbAge: 0,
          colorIndex,
          kind: PARTICLE_SURFACE,
          isAbsorbing: false,
        },
        {
          x: seed.x + direction * seed.radius * 0.28,
          y: surfaceY - baseRadius * 0.16,
          vx: direction * (84 + seed.radius * 3.8) * strength,
          vy: (-500 - seed.radius * 4.2) * strength,
          radius: dropRadius * 0.82,
          scaleX: 1.08,
          scaleY: 1.48,
          age: 0,
          duration: 1120,
          absorbAge: 0,
          colorIndex,
          kind: PARTICLE_DROPLET,
          isAbsorbing: false,
        }
      );

      for (let i = 0; i < mistCount; i++) {
        const localProgress = (i + 1) / mistCount;
        const side = i % 2 === 0 ? -1 : 1;
        const ring = Math.floor(i / 2);
        const ringProgress = ring / Math.max(Math.ceil(mistCount / 2) - 1, 1);
        const centerBias =
          i % 5 === 0 ? 0 : side * (0.18 + ringProgress * 1.18);
        const angle = -Math.PI / 2 + centerBias * 1.05;
        const speed =
          (270 + seed.radius * 5.4) *
          strength *
          (0.66 + (1 - ringProgress) * 0.42 + (i % 3) * 0.08);
        const radiusScale = 0.34 - localProgress * 0.12;
        const spawnDistance = seed.radius * (0.12 + ringProgress * 0.36);

        particles.push({
          x:
            seed.x +
            Math.cos(angle) * spawnDistance +
            side * seed.radius * 0.04,
          y: surfaceY + Math.sin(angle) * spawnDistance * 0.36,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - seed.radius * 2.2 * (1 - ringProgress),
          radius: Math.max(0.88, dropRadius * radiusScale),
          scaleX: 0.92 + localProgress * 0.16,
          scaleY: 1.02 + ringProgress * 0.22,
          age: 0,
          duration: 660 + localProgress * 260,
          absorbAge: 0,
          colorIndex,
          kind: PARTICLE_DROPLET,
          isAbsorbing: false,
        });
      }

      if (shouldEmitSideDrop) {
        particles.push(
          {
            x: seed.x - direction * seed.radius * 0.56,
            y: surfaceY - baseRadius * 0.14,
            vx: -direction * (126 + seed.radius * 4.1) * strength,
            vy: (-330 - seed.radius * 2.6) * strength,
            radius: dropRadius * 0.62,
            scaleX: 1,
            scaleY: 1.34,
            age: 0,
            duration: 980,
            absorbAge: 0,
            colorIndex,
            kind: PARTICLE_DROPLET,
            isAbsorbing: false,
          },
          {
            x: seed.x + direction * seed.radius * 0.92,
            y: surfaceY - baseRadius * 0.08,
            vx: direction * (148 + seed.radius * 4.1) * strength,
            vy: (-250 - seed.radius * 2.2) * strength,
            radius: dropRadius * 0.5,
            scaleX: 0.9,
            scaleY: 1.22,
            age: 0,
            duration: 860,
            absorbAge: 0,
            colorIndex,
            kind: PARTICLE_DROPLET,
            isAbsorbing: false,
          }
        );
      }
    });

    this.addSplashParticleBatch(particles, 1180);
  }

  ripple(seeds: SplashSeed[]) {
    const particles = this.createSplashParticleBatch(seeds);

    if (!particles) {
      return;
    }

    seeds.forEach((seed) => {
      const surfaceY = this.getSurfaceYAt(seed.x);
      const strength = seed.strength ?? 0.18;
      const radius = Math.max(1.2, seed.radius * (0.85 + strength));

      particles.push({
        x: seed.x,
        y: surfaceY - radius * 0.12,
        vx: 0,
        vy: 0,
        radius,
        scaleX: 2.2 + strength * 1.4,
        scaleY: 0.18 + strength * 0.18,
        age: 0,
        duration: 180 + strength * 180,
        absorbAge: 0,
        colorIndex: SURFACE_COLOR_INDEX,
        kind: PARTICLE_SURFACE,
        isAbsorbing: false,
      });
    });

    this.addSplashParticleBatch(particles, 360);
  }

  private createSplashParticleBatch(seeds: SplashSeed[]) {
    if (seeds.length === 0) {
      return null;
    }

    return [] as SplashParticle[];
  }

  private addSplashParticleBatch(particles: SplashParticle[], duration: number) {
    this.splashes.push({
      particles,
      age: 0,
      duration,
    });
  }

  increaseDepth(amount: number = SPLASH_DEPTH_GAIN) {
    const nextDepth = Math.min(this.depth + amount, MAX_DEPTH);
    const depthDelta = nextDepth - this.depth;

    if (depthDelta <= 0) {
      return;
    }

    this.depth = nextDepth;
    this.waves.forEach((wave) => wave.increaseDepth(depthDelta));
  }

  decreaseDepth(amount: number = SPLASH_DEPTH_GAIN) {
    const nextDepth = Math.max(this.depth - amount, 0);
    const depthDelta = this.depth - nextDepth;

    if (depthDelta <= 0) {
      return;
    }

    this.depth = nextDepth;
    this.waves.forEach((wave) => wave.decreaseDepth(depthDelta));
  }

  update(canvas: Canvas2d) {
    this.width = canvas.window.width;
    this.waves.forEach((wave) => wave.update(canvas));
    this.y =
      this.waves[0]?.getWaterY() ??
      canvas.window.height / DEFAULT_WATER_LEVEL_RATIO;
  }

  getSurfaceYAt(x: number) {
    return this.getSurfacePointAt(x).y;
  }

  getSurfacePointAt(x: number): SurfacePoint {
    const frontWave = this.waves[this.waves.length - 1];

    if (frontWave) {
      return frontWave.getSurfacePointAt(x);
    }

    return {
      x,
      y: this.y,
      slope: 0,
      rotation: 0,
    };
  }

  private getPointAboveSurface(x: number, distance: number) {
    const surfacePoint = this.getSurfacePointAt(x);
    const normalLength = Math.max(Math.hypot(surfacePoint.slope, 1), 0.001);

    return {
      x: surfacePoint.x - (surfacePoint.slope / normalLength) * distance,
      y: surfacePoint.y - (1 / normalLength) * distance,
      surfacePoint,
    };
  }

  private updateSplashes(timestamp: number) {
    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
      return;
    }

    const deltaSeconds = Math.min(
      (timestamp - this.lastTimestamp) / 1000,
      1 / 30
    );
    const deltaMs = deltaSeconds * 1000;
    this.lastTimestamp = timestamp;

    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const splash = this.splashes[i];
      splash.age += deltaMs;

      splash.particles.forEach((particle) => {
        if (
          (particle.kind !== PARTICLE_DROPLET &&
            particle.age >= particle.duration) ||
          particle.radius < 0.4
        ) {
          return;
        }

        if (particle.isAbsorbing) {
          particle.absorbAge += deltaMs;
          particle.x += particle.vx * deltaSeconds * 0.08;
          const anchored = this.getPointAboveSurface(
            particle.x,
            particle.radius * 0.16
          );
          particle.y = anchored.y;

          if (particle.absorbAge >= ABSORB_DURATION_MS) {
            particle.age = particle.duration;
            particle.radius = 0;
          }

          return;
        }

        particle.age += deltaMs;

        if (particle.kind === PARTICLE_SURFACE) {
          particle.x += particle.vx * deltaSeconds;
          particle.y =
            this.getSurfacePointAt(particle.x).y - particle.radius * 0.35;
          return;
        }

        if (particle.kind === PARTICLE_JET) {
          const progress = particle.age / particle.duration;
          const rise = Math.sin(progress * Math.PI) * particle.radius * 1.55;
          particle.x += particle.vx * deltaSeconds;
          particle.y = this.getSurfacePointAt(particle.x).y - rise;
          return;
        }

        particle.vy += SPLASH_GRAVITY * deltaSeconds;
        particle.x += particle.vx * deltaSeconds;
        particle.y += particle.vy * deltaSeconds;
        particle.radius = Math.max(
          0.72,
          particle.radius - (0.18 + particle.radius * 0.18) * deltaSeconds
        );

        const surfacePoint = this.getSurfacePointAt(particle.x);

        if (
          particle.vy > 0 &&
          particle.y >= surfacePoint.y - particle.radius * 0.16
        ) {
          particle.isAbsorbing = true;
          particle.absorbAge = 0;
          particle.vx *= 0.14;
          particle.vy = 0;
          const anchored = this.getPointAboveSurface(
            particle.x,
            particle.radius * 0.16
          );
          particle.y = anchored.y;
        }
      });

      const isComplete = splash.particles.every((particle) => {
        if (particle.kind === PARTICLE_DROPLET) {
          return particle.radius < 0.4;
        }

        return particle.age >= particle.duration || particle.radius < 0.4;
      });

      if (isComplete) {
        this.splashes.splice(i, 1);
      }
    }
  }

  private easeOutCubic(value: number) {
    const clamped = clamp(value, 0, 1);
    return 1 - (1 - clamped) ** 3;
  }

  private smoothStep(edge0: number, edge1: number, value: number) {
    const clamped = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return clamped * clamped * (3 - 2 * clamped);
  }

  private drawSurfaceSplashes(canvas: Canvas2d) {
    this.splashes.forEach((splash) => {
      splash.particles.forEach((particle) => {
        if (
          (particle.kind !== PARTICLE_SURFACE &&
            particle.kind !== PARTICLE_JET) ||
          particle.age >= particle.duration ||
          particle.radius < 0.4
        ) {
          return;
        }

        const progress = particle.age / particle.duration;

        const birthScale = this.easeOutCubic(progress / 0.18);
        const fadeScale = 1 - this.smoothStep(0.72, 1, progress);
        const visibility = birthScale * fadeScale;

        this.dropletPaint.setColor(Skia.Color(this.color[particle.colorIndex]));
        this.dropletPaint.setAlphaf((0.62 - progress * 0.12) * visibility);
        this.dropletPaint.setAntiAlias(true);

        if (particle.kind === PARTICLE_JET) {
          this.drawJet(canvas, particle, progress);
          return;
        }

        const radiusX =
          particle.radius *
          particle.scaleX *
          (1 - progress * 0.46) *
          birthScale;
        const radiusY =
          particle.radius *
          particle.scaleY *
          (1 - progress * 0.62) *
          birthScale;

        canvas.ctx.drawOval(
          Skia.XYWHRect(
            particle.x - radiusX,
            particle.y - radiusY,
            radiusX * 2,
            radiusY * 2
          ),
          this.dropletPaint
        );
      });
    });
  }

  private drawJet(
    canvas: Canvas2d,
    particle: SplashParticle,
    progress: number
  ) {
    const surfaceY = this.getSurfaceYAt(particle.x);
    const height =
      particle.radius *
      particle.scaleY *
      Math.sin(progress * Math.PI) *
      this.easeOutCubic(progress / 0.16);
    const baseWidth =
      particle.radius *
      particle.scaleX *
      (1 - progress * 0.2) *
      this.easeOutCubic(progress / 0.16);
    const neckWidth = baseWidth * (0.42 + progress * 0.16);
    const topY = surfaceY - height;
    const baseY = surfaceY + particle.radius * 0.2;
    const lean = particle.vx * 0.08;

    const path = Skia.PathBuilder.Make()
      .moveTo(particle.x - baseWidth, baseY)
      .cubicTo(
        particle.x - baseWidth * 0.96,
        surfaceY - height * 0.34,
        particle.x - neckWidth + lean,
        surfaceY - height * 0.72,
        particle.x - neckWidth * 0.28 + lean,
        topY
      )
      .cubicTo(
        particle.x + neckWidth * 0.58 + lean,
        topY - particle.radius * 0.24,
        particle.x + neckWidth * 0.9 + lean,
        surfaceY - height * 0.6,
        particle.x + baseWidth,
        baseY
      )
      .close()
      .build();

    canvas.ctx.drawPath(path, this.dropletPaint);
  }

  private drawAirborneSplashes(canvas: Canvas2d) {
    this.splashes.forEach((splash) => {
      splash.particles.forEach((particle) => {
        if (particle.kind !== PARTICLE_DROPLET || particle.radius < 0.4) {
          return;
        }

        const absorbProgress = particle.isAbsorbing
          ? Math.min(particle.absorbAge / ABSORB_DURATION_MS, 1)
          : 0;
        const ageProgress = Math.min(particle.age / particle.duration, 1);
        const birthScale = this.easeOutCubic(ageProgress / 0.12);
        const flightScale = particle.isAbsorbing
          ? 1
          : 1 - this.smoothStep(0.55, 1, ageProgress) * 0.12;
        const radiusX =
          particle.radius *
          (1.08 + absorbProgress * 1.9) *
          birthScale *
          flightScale;
        const radiusY =
          particle.radius *
          (0.96 - absorbProgress * 0.78) *
          birthScale *
          flightScale;
        const alpha = particle.isAbsorbing
          ? 1 - absorbProgress * 0.58
          : Math.max(0.94, birthScale);

        this.airbornePaint.setColor(
          Skia.Color(this.color[particle.colorIndex])
        );
        this.airbornePaint.setAlphaf(alpha);
        this.airbornePaint.setAntiAlias(true);

        this.drawDropletBeads(canvas, particle, radiusY, ageProgress);
        this.drawDroplet(canvas, particle, radiusX, radiusY);
      });
    });
  }

  private drawDropletBeads(
    canvas: Canvas2d,
    particle: SplashParticle,
    radiusY: number,
    ageProgress: number
  ) {
    if (particle.isAbsorbing) {
      return;
    }

    const speed = Math.max(Math.hypot(particle.vx, particle.vy), 1);
    const tailX = -particle.vx / speed;
    const tailY = -particle.vy / speed;
    const sideX = -tailY;
    const sideY = tailX;
    const beadProgress = this.easeOutCubic(ageProgress / 0.12);
    const surfaceY = this.getSurfaceYAt(particle.x);
    const maxDistance = Math.max(radiusY * 1.15, particle.radius * 2.2);

    for (let i = 0; i < 5; i++) {
      const offset = (i + 1) * particle.radius * 0.42;
      const side = (i % 2 === 0 ? -1 : 1) * particle.radius * 0.24 * i;
      const beadRadius = particle.radius * (0.48 - i * 0.045) * beadProgress;
      const x = particle.x + tailX * offset + sideX * side;
      const y = particle.y + tailY * offset + sideY * side;

      if (beadRadius <= 0.8 || y + beadRadius >= surfaceY + 1) {
        continue;
      }

      if (Math.abs(surfaceY - y) > maxDistance + offset * 0.64) {
        continue;
      }

      canvas.ctx.drawOval(
        Skia.XYWHRect(
          x - beadRadius * 1.25,
          y - beadRadius * 0.82,
          beadRadius * 2.5,
          beadRadius * 1.64
        ),
        this.airbornePaint
      );
    }
  }

  private drawDroplet(
    canvas: Canvas2d,
    particle: SplashParticle,
    radiusX: number,
    radiusY: number
  ) {
    if (particle.isAbsorbing) {
      canvas.ctx.drawOval(
        Skia.XYWHRect(
          particle.x - radiusX,
          particle.y - radiusY,
          radiusX * 2,
          Math.max(radiusY * 2, 1)
        ),
        this.airbornePaint
      );
      return;
    }

    canvas.ctx.drawOval(
      Skia.XYWHRect(
        particle.x - radiusX,
        particle.y - radiusY,
        radiusX * 2,
        radiusY * 2
      ),
      this.airbornePaint
    );
  }

  draw(canvas: Canvas2d) {
    canvas.ctx.saveLayer(this.paint);
    this.waves.forEach((w) => w.draw(canvas));
    this.updateSplashes(canvas.frameInfo.timestamp);
    this.drawSurfaceSplashes(canvas);
    canvas.ctx.restore();

    canvas.ctx.saveLayer(this.airborneLayerPaint);
    this.drawAirborneSplashes(canvas);
    canvas.ctx.restore();

    this.y = this.waves[0]?.getWaterY() ?? this.y;
  }
}
