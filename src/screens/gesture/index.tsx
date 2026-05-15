import useCanvas from "@/hooks/useCanvas";
import { useMemo } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import useBalls from "./hooks/useBalls";
import { collideWithWalls, resolveBallCollisions } from "./utils/collision";

const BALL_SIZE = 80;
const BALL_SPEED = 3;
const BALL_COLORS = [
  "#F8FFF8",
  "#FFC20A",
  "#EF4C86",
  "#76BDEB",
  "#58ABE6",
] as const;

export default function GestureScreen() {
  const { activeBall, balls, getByPos, split } = useBalls(
    BALL_SIZE,
    BALL_SPEED,
    BALL_COLORS
  );

  const pan = useMemo(() => {
    return Gesture.Pan()
      .minDistance(3)
      .onTouchesDown(({ changedTouches }) => {
        const touch = changedTouches[0];
        if (!touch) {
          return;
        }

        activeBall.set(getByPos(touch.x, touch.y));
      })
      .onUpdate(({ x, y }) => {
        const ball = activeBall.get();
        if (ball?.isTapped) {
          ball.drag(x, y);
        }
      })
      .onEnd(({ velocityX, velocityY }) => {
        activeBall.get()?.throw(velocityX, velocityY);
        activeBall.set(null);
      })
      .onFinalize(() => {
        activeBall.get()?.release();
        activeBall.set(null);
      });
  }, [activeBall, balls, getByPos]);

  const tap = useMemo(() => {
    return Gesture.Tap()
      .maxDistance(8)
      .onEnd(({ x, y }, success) => {
        if (!success) {
          return;
        }

        const ball = getByPos(x, y);
        if (!ball) {
          return;
        }

        ball.release();
        split(ball, BALL_COLORS, 2);
        activeBall.set(null);
      });
  }, [activeBall, balls, getByPos, split]);

  const Canvas = useCanvas((canvas) => {
    "worklet";

    const { window } = canvas;
    const items = balls.get();

    for (let i = 0; i < items.length; i++) {
      items[i].update();
      collideWithWalls(items[i], window.width, window.height);
    }

    resolveBallCollisions(items);

    for (let i = 0; i < items.length; i++) {
      collideWithWalls(items[i], window.width, window.height);
      items[i].draw(canvas);
    }
  });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#2C9CE7",
      }}
    >
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <Canvas />
      </GestureDetector>
    </View>
  );
}
