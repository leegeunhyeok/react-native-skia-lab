import useCanvas from "@/hooks/useCanvas";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ToolToggleButton from "./components/tool-toggle-button";
import useBalls from "./hooks/useBalls";
import useFrameDelta from "./hooks/useFrameDelta";
import useLines from "./hooks/useLines";

export default function PhysicsScreen() {
  const insets = useSafeAreaInsets();
  const [isErasing, setIsErasing] = useState(false);
  const { drawBalls, spawnBall, updateBalls } = useBalls();
  const {
    addLine,
    beginErase,
    drawEraser,
    drawLines,
    finishErase,
    finishLine,
    lines,
    moveErase,
    moveLine,
    updateLines,
  } = useLines();
  const getFrameDelta = useFrameDelta();

  const pan = useMemo(() => {
    return Gesture.Pan()
      .minDistance(1)
      .onBegin(({ x, y }) => {
        if (isErasing) {
          beginErase(x, y);
          return;
        }

        addLine(x, y);
      })
      .onUpdate(({ x, y }) => {
        if (isErasing) {
          moveErase(x, y);
          return;
        }

        moveLine(x, y);
      })
      .onFinalize(() => {
        if (isErasing) {
          finishErase();
          return;
        }

        finishLine();
      });
  }, [
    addLine,
    beginErase,
    finishErase,
    finishLine,
    isErasing,
    moveErase,
    moveLine,
  ]);

  const Canvas = useCanvas((canvas) => {
    "worklet";

    const { frameInfo, window } = canvas;
    const dt = getFrameDelta(frameInfo.timestamp);
    const lineItems = lines.get();

    spawnBall(window.width, frameInfo.timestamp);
    updateLines(dt);
    updateBalls(dt, window.width, window.height, lineItems);
    drawLines(canvas);
    drawBalls(canvas);
    drawEraser(canvas);
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <Canvas />
        </View>
      </GestureDetector>
      <ToolToggleButton
        bottom={insets.bottom + 24}
        isErasing={isErasing}
        onPress={() => setIsErasing((value) => !value)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F6F4",
  },
});
