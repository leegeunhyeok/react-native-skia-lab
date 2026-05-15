import { useLayoutEffect } from "react";
import { useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { runOnUIAsync } from "react-native-worklets";
import Ball from "../classes/ball";

export default function useBalls(
  size: number,
  speedRatio: number,
  colors: readonly string[]
) {
  const window = useWindowDimensions();
  const balls = useSharedValue<Ball[]>([]);
  const activeBall = useSharedValue<Ball | null>(null);

  function getByPos(x: number, y: number) {
    "worklet";

    const items = balls.get();

    for (let i = 0; i < items.length; i++) {
      items[i].isTapped = false;
    }

    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].tap(x, y)) {
        return items[i];
      }
    }

    return null;
  }

  function split(ball: Ball, colors: readonly string[], count: number) {
    "worklet";

    const items = balls.get();
    const radius = ball.radius / Math.SQRT2;
    const angle = Math.atan2(ball.vy, ball.vx) + Math.PI / 2;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const gap = radius * 0.68;
    const speed = Math.max(
      Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy),
      ball.radius * 6.8
    );
    let nextColor = colors[0];
    let nextId = 1;

    for (let i = 0; i < items.length; i++) {
      nextId = Math.max(nextId, items[i].id + 1);
    }

    for (let i = 0; i < colors.length; i++) {
      if (colors[i] === ball.color) {
        nextColor = colors[(i + 1) % colors.length];
        break;
      }
    }

    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].id === ball.id) {
        items.splice(i, 1);

        for (let j = 0; j < count; j++) {
          const id = nextId + j;
          const direction = j % 2 === 0 ? 1 : -1;

          items.push(
            new Ball(
              id,
              ball.x + nx * gap * direction,
              ball.y + ny * gap * direction,
              radius,
              nextColor,
              ball.vx * 0.36 - nx * speed * direction,
              ball.vy * 0.36 - ny * speed * direction
            )
          );
        }

        balls.set(items);
        return;
      }
    }
  }

  useLayoutEffect(() => {
    if (window.width <= 0 || window.height <= 0) {
      return;
    }

    runOnUIAsync(
      (
        width: number,
        height: number,
        initialSize: number,
        initialSpeedRatio: number,
        ballColors: readonly string[]
      ) => {
        "worklet";

        const centerX = width / 2;
        const centerY = height / 2;
        const initialSpeed = Math.min(width, height) * initialSpeedRatio;

        balls.set([
          new Ball(1, centerX, centerY, initialSize, ballColors[0], 0, initialSpeed),
        ]);
        activeBall.set(null);
      },
      window.width,
      window.height,
      size,
      speedRatio,
      colors
    );
  }, [
    activeBall,
    balls,
    colors,
    size,
    speedRatio,
    window.height,
    window.width,
  ]);

  return {
    activeBall,
    balls,
    getByPos,
    split,
  };
}
