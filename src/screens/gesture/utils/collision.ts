import type Ball from "../classes/ball";

const WALL_BOUNCE = 0.9;
const BALL_BOUNCE = 0.94;
const COLLISION_ITERATIONS = 3;

export function collideWithWalls(ball: Ball, width: number, height: number) {
  "worklet";

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = ball.isTapped ? 0 : Math.abs(ball.vx) * WALL_BOUNCE;
  } else if (ball.x + ball.radius > width) {
    ball.x = width - ball.radius;
    ball.vx = ball.isTapped ? 0 : -Math.abs(ball.vx) * WALL_BOUNCE;
  }

  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = ball.isTapped ? 0 : Math.abs(ball.vy) * WALL_BOUNCE;
  } else if (ball.y + ball.radius > height) {
    ball.y = height - ball.radius;
    ball.vy = ball.isTapped ? 0 : -Math.abs(ball.vy) * WALL_BOUNCE;
  }
}

export function resolveBallCollisions(balls: Ball[]) {
  "worklet";

  for (let iteration = 0; iteration < COLLISION_ITERATIONS; iteration++) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distanceSq = dx * dx + dy * dy;
        const minDistance = a.radius + b.radius;

        if (distanceSq >= minDistance * minDistance) {
          continue;
        }

        if (distanceSq < 0.0001) {
          dx = minDistance;
          dy = 0;
          distanceSq = dx * dx;
        }

        const distance = Math.sqrt(distanceSq);
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;
        const aCanMove = !a.isTapped;
        const bCanMove = !b.isTapped;

        if (aCanMove && bCanMove) {
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
        } else if (aCanMove) {
          a.x -= nx * overlap;
          a.y -= ny * overlap;
        } else if (bCanMove) {
          b.x += nx * overlap;
          b.y += ny * overlap;
        }

        const relativeVelocityX = b.vx - a.vx;
        const relativeVelocityY = b.vy - a.vy;
        const velocityAlongNormal = relativeVelocityX * nx + relativeVelocityY * ny;

        if (velocityAlongNormal > 0) {
          continue;
        }

        const invMassA = aCanMove ? 1 / (a.radius * a.radius) : 0;
        const invMassB = bCanMove ? 1 / (b.radius * b.radius) : 0;
        const invMassSum = invMassA + invMassB;

        if (invMassSum <= 0) {
          continue;
        }

        const impulse = (-(1 + BALL_BOUNCE) * velocityAlongNormal) / invMassSum;
        const impulseX = impulse * nx;
        const impulseY = impulse * ny;

        if (aCanMove) {
          a.setVelocity(a.vx - impulseX * invMassA, a.vy - impulseY * invMassA);
        }

        if (bCanMove) {
          b.setVelocity(b.vx + impulseX * invMassB, b.vy + impulseY * invMassB);
        }
      }
    }
  }
}
