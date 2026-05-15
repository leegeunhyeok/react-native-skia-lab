import type Ball from '../classes/ball';
import { projectPointToSegment, type Point } from './point';

const WALL_BOUNCE = 0.82;
const LINE_BOUNCE = 0.24;
const LINE_FRICTION = 0.988;
const BALL_BOUNCE = 0.86;

export type LineSegment = {
  from: Point;
  to: Point;
};

function getCollisionDistance(dx: number, dy: number, threshold: number) {
  'worklet';

  const distanceSq = dx * dx + dy * dy;

  if (distanceSq > threshold * threshold) {
    return null;
  }

  return {
    distance: Math.sqrt(Math.max(distanceSq, 0.0001)),
  };
}

export function collideWithWalls(ball: Ball, width: number) {
  'worklet';

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.setVelocity(Math.abs(ball.vx) * WALL_BOUNCE, ball.vy);
    return;
  }

  if (ball.x + ball.radius > width) {
    ball.x = width - ball.radius;
    ball.setVelocity(-Math.abs(ball.vx) * WALL_BOUNCE, ball.vy);
  }
}

export function resolveBallSegmentCollision(
  ball: Ball,
  segment: LineSegment,
  thickness: number,
  maxSpeed: number,
) {
  'worklet';

  const hit = projectPointToSegment(
    { x: ball.x, y: ball.y },
    segment.from,
    segment.to,
  );

  if (hit.lengthSq <= 0.001) {
    return false;
  }

  const dx = ball.x - hit.point.x;
  const dy = ball.y - hit.point.y;
  const threshold = ball.radius + thickness / 2;
  const collisionDistance = getCollisionDistance(dx, dy, threshold);

  if (!collisionDistance) {
    return false;
  }

  const { distance } = collisionDistance;
  let nx = dx / distance;
  let ny = dy / distance;

  if (distance < 0.01) {
    nx = -hit.dy / hit.length;
    ny = hit.dx / hit.length;

    if (ball.vx * nx + ball.vy * ny > 0) {
      nx = -nx;
      ny = -ny;
    }
  }

  const penetration = threshold - distance;
  ball.x += nx * penetration;
  ball.y += ny * penetration;

  const normalVelocity = ball.vx * nx + ball.vy * ny;

  if (normalVelocity < 0) {
    const nextVx = ball.vx - (1 + LINE_BOUNCE) * normalVelocity * nx;
    const nextVy = ball.vy - (1 + LINE_BOUNCE) * normalVelocity * ny;
    const tx = hit.dx / hit.length;
    const ty = hit.dy / hit.length;
    const tangentVelocity = nextVx * tx + nextVy * ty;
    const newNormalVelocity = nextVx * nx + nextVy * ny;

    ball.setVelocity(
      tx * tangentVelocity * LINE_FRICTION + nx * newNormalVelocity,
      ty * tangentVelocity * LINE_FRICTION + ny * newNormalVelocity,
    );
    ball.clampVelocity(maxSpeed);
  }

  return true;
}

function resolveBallCollision(a: Ball, b: Ball, maxSpeed: number) {
  'worklet';

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const threshold = a.radius + b.radius;
  const collisionDistance = getCollisionDistance(dx, dy, threshold);

  if (!collisionDistance) {
    return false;
  }

  const { distance } = collisionDistance;
  let nx = dx / distance;
  let ny = dy / distance;

  if (distance < 0.01) {
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const relativeSpeed = Math.sqrt(rvx * rvx + rvy * rvy);

    if (relativeSpeed > 0.001) {
      nx = rvx / relativeSpeed;
      ny = rvy / relativeSpeed;
    } else {
      nx = 1;
      ny = 0;
    }
  }

  const penetration = threshold - distance;
  const separation = penetration / 2;
  a.x -= nx * separation;
  a.y -= ny * separation;
  b.x += nx * separation;
  b.y += ny * separation;

  const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;

  if (relativeVelocity < 0) {
    const impulse = (-(1 + BALL_BOUNCE) * relativeVelocity) / 2;
    a.setVelocity(a.vx - impulse * nx, a.vy - impulse * ny);
    b.setVelocity(b.vx + impulse * nx, b.vy + impulse * ny);
    a.clampVelocity(maxSpeed);
    b.clampVelocity(maxSpeed);
  }

  return true;
}

export function resolveBallCollisions(balls: Ball[], maxSpeed: number) {
  'worklet';

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      resolveBallCollision(balls[i], balls[j], maxSpeed);
    }
  }
}
