import { PI2 } from "@/constants/math";
import { clamp } from "react-native-reanimated";

type GlyphRainSurfaceInput = {
  char: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
};

type RainDropInput = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  age: number;
};

type RainParticleOutput = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  age: number;
  duration: number;
};

export function getCirclePoint(gap: number, radius: number) {
  "worklet";

  const theta = PI2 * gap;
  return {
    x: Math.cos(theta) * radius,
    y: Math.sin(theta) * radius,
  };
}

export function getFlareStrength(
  timestamp: number,
  flareStartedAt: number,
  flareUntil: number
) {
  "worklet";

  if (timestamp >= flareUntil) {
    return 0;
  }

  const duration = flareUntil - flareStartedAt;
  if (duration <= 0) {
    return 0;
  }

  const elapsed = timestamp - flareStartedAt;
  const remaining = flareUntil - timestamp;
  const transition = Math.min(1100, duration * 0.32);
  const fadeInValue = Math.min(elapsed / transition, 1);
  const fadeOutValue = Math.min(remaining / transition, 1);
  const fadeIn = fadeInValue * fadeInValue * (3 - 2 * fadeInValue);
  const fadeOut = fadeOutValue * fadeOutValue * (3 - 2 * fadeOutValue);
  const pulse = 0.9 + Math.sin(timestamp / 90) * 0.1;
  return clamp(Math.min(fadeIn, fadeOut), 0, 1) * pulse;
}

export function getCloudSpeed(depth: number, seed: number) {
  "worklet";

  return 0.009 + depth * 0.014 + (seed % 0.17) * 0.018;
}

export function getCloudScale(depth: number) {
  "worklet";

  return 0.48 + depth * 0.54;
}

export function getCloudShape(seed: number) {
  "worklet";

  const valueA = Math.sin(seed * 1000 + 17 * 12.9898) * 43758.5453;
  const valueB = Math.sin(seed * 1000 + 41 * 12.9898) * 43758.5453;
  const valueC = Math.sin(seed * 1000 + 73 * 12.9898) * 43758.5453;

  return {
    shapeA: valueA - Math.floor(valueA),
    shapeB: valueB - Math.floor(valueB),
    shapeC: valueC - Math.floor(valueC),
  };
}

export function getSpawnedCloudInput(
  timestamp: number,
  index: number,
  farthestLeft: number
) {
  "worklet";

  const seedValue =
    Math.sin(timestamp * 0.001 * 1000 + (index + 9) * 12.9898) * 43758.5453;
  const seed = seedValue - Math.floor(seedValue);
  const depthValue = Math.sin(seed * 1000 + 23 * 12.9898) * 43758.5453;
  const yRatioValue = Math.sin(seed * 1000 + 31 * 12.9898) * 43758.5453;
  const depth = 0.32 + (depthValue - Math.floor(depthValue)) * 0.62;
  const yRatio = 0.15 + (yRatioValue - Math.floor(yRatioValue)) * 0.22;
  const progress = Math.min(-0.2 - seed * 0.28, farthestLeft - 0.22);

  return {
    depth,
    yRatio,
    progress,
    seed,
  };
}

export function createRainExplosionParticles(
  drop: RainDropInput,
  x: number,
  y: number
): RainParticleOutput[] {
  "worklet";

  const baseSpeed = Math.max(
    90,
    Math.min(Math.hypot(drop.vx, drop.vy) * 0.34, 260)
  );
  const count = 5 + Math.floor(Math.min(drop.radius * 1.7, 4));
  const particles: RainParticleOutput[] = [];

  for (let i = 0; i < count; i++) {
    const valueA =
      Math.sin((drop.age + drop.x * 0.17) * 1000 + (i + 5) * 12.9898) *
      43758.5453;
    const valueB =
      Math.sin((drop.y * 0.11 + drop.vx) * 1000 + (i + 19) * 12.9898) *
      43758.5453;
    const randomA = valueA - Math.floor(valueA);
    const randomB = valueB - Math.floor(valueB);
    const direction = -Math.PI / 2 + (randomA - 0.5) * Math.PI * 0.95;
    const speed = baseSpeed * (0.55 + randomB * 0.75);

    particles.push({
      x,
      y: y - drop.radius,
      vx: Math.cos(direction) * speed + drop.vx * 0.18,
      vy: Math.sin(direction) * speed - Math.abs(drop.vy) * 0.12,
      radius: Math.max(0.7, drop.radius * (0.34 + randomB * 0.36)),
      age: 0,
      duration: 420 + randomA * 220,
    });
  }

  return particles;
}

export function getGlyphRainSurface(glyph: GlyphRainSurfaceInput, x: number) {
  "worklet";

  const localX = clamp((x - glyph.x) / glyph.width, 0, 1);
  const upperTop = glyph.y + glyph.fontSize * 0.08;
  const xHeightTop = glyph.y + glyph.fontSize * 0.34;
  const lowerTop = glyph.y + glyph.fontSize * 0.42;
  const edge = Math.abs(localX - 0.5) * 2;

  if (glyph.char === "B") {
    if (localX < 0.24) {
      return { y: upperTop + glyph.fontSize * 0.02, normalX: -0.14 };
    }

    if (localX > 0.86) {
      return null;
    }

    const crown = Math.sin(((localX - 0.24) / 0.62) * Math.PI);
    return {
      y: upperTop + glyph.fontSize * (0.03 + (1 - crown) * 0.13),
      normalX: (localX - 0.55) * 0.34,
    };
  }

  if (glyph.char === "h") {
    if (localX < 0.28) {
      return { y: upperTop + glyph.fontSize * 0.02, normalX: -0.12 };
    }

    if (localX > 0.9) {
      return null;
    }

    const arch = Math.sin(((localX - 0.28) / 0.62) * Math.PI);
    return {
      y: xHeightTop + glyph.fontSize * (0.02 + (1 - arch) * 0.16),
      normalX: (localX - 0.6) * 0.42,
    };
  }

  if (glyph.char === "e") {
    if (localX < 0.08 || localX > 0.92) {
      return null;
    }

    const crown = Math.sin(((localX - 0.08) / 0.84) * Math.PI);
    return {
      y: xHeightTop + glyph.fontSize * (0.02 + (1 - crown) * 0.12),
      normalX: (localX - 0.5) * 0.38,
    };
  }

  if (glyph.char === "a") {
    if (localX < 0.1 || localX > 0.9) {
      return null;
    }

    const crown = Math.sin(((localX - 0.1) / 0.8) * Math.PI);
    return {
      y: xHeightTop + glyph.fontSize * (0.03 + (1 - crown) * 0.1),
      normalX: (localX - 0.5) * 0.34,
    };
  }

  if (glyph.char === "c") {
    if (localX > 0.78 && edge > 0.56) {
      return null;
    }

    const crown = Math.sin(clamp(localX / 0.78, 0, 1) * Math.PI);
    return {
      y: lowerTop + glyph.fontSize * ((1 - crown) * 0.1),
      normalX: (localX - 0.42) * 0.46,
    };
  }

  return null;
}
