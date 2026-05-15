import type { Canvas2d } from '@/hooks/useCanvas';
import { useSharedValue } from 'react-native-reanimated';
import { sample } from '@/utils/util';
import Ball from '../classes/ball';
import type Line from '../classes/line';
import { BALL_COLORS } from '../utils/colors';
import {
  collideWithWalls,
  resolveBallCollisions,
  resolveBallSegmentCollision,
} from '../utils/collision';
import { randomBetween } from '../utils/math';

const GRAVITY = 420;
const SPAWN_INTERVAL = 840;
const MAX_BALLS = 26;
const MAX_SPEED = 0.92;

function getMaxSpeed(width: number, height: number) {
  'worklet';

  return Math.min(width, height) * MAX_SPEED;
}

export default function useBalls() {
  const balls = useSharedValue<Ball[]>([]);
  const lastSpawnAt = useSharedValue(0);

  function spawnBall(width: number, timestamp: number) {
    'worklet';

    const items = balls.get();

    if (items.length >= MAX_BALLS) {
      return;
    }

    if (lastSpawnAt.get() && timestamp - lastSpawnAt.get() < SPAWN_INTERVAL) {
      return;
    }

    const radius = randomBetween(13, 20);
    const x = randomBetween(radius, Math.max(width - radius, radius));
    const vx = randomBetween(-42, 42);
    const color = sample(BALL_COLORS);
    items.push(new Ball(x, -radius * 2, radius, vx, color));
    balls.set(items);
    lastSpawnAt.set(timestamp);
  }

  function updateBalls(
    dt: number,
    width: number,
    height: number,
    lines: Line[],
  ) {
    'worklet';

    const items = balls.get();
    const maxSpeed = getMaxSpeed(width, height);

    for (let i = items.length - 1; i >= 0; i--) {
      const ball = items[i];
      ball.update(dt, GRAVITY, maxSpeed);
      collideWithWalls(ball, width);

      for (let j = 0; j < lines.length; j++) {
        const line = lines[j];
        const segments = line.getCollisionSegments();

        for (let k = 0; k < segments.length; k++) {
          resolveBallSegmentCollision(
            ball,
            segments[k],
            line.getCollisionThickness(),
            maxSpeed,
          );
        }
      }

      if (ball.isBelow(height)) {
        items.splice(i, 1);
      }
    }

    resolveBallCollisions(items, maxSpeed);
  }

  function drawBalls(canvas: Canvas2d) {
    'worklet';

    const items = balls.get();

    for (let i = 0; i < items.length; i++) {
      items[i].draw(canvas);
    }
  }

  return {
    balls,
    drawBalls,
    spawnBall,
    updateBalls,
  };
}
