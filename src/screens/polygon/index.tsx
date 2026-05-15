import { Canvas, Group } from "@shopify/react-native-skia";
import { useCallback, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import ControlButton, { CONTROL_BUTTON_GAP } from "./components/control-button";
import Polygon from "./components/polygon";
import useSides from "./hooks/useSides";
import useTransform from "./hooks/useTransform";

const MIN_SIDES = 3;
const MAX_SIDES = 15;

export default function PolygonScreen() {
  const window = useWindowDimensions();

  const { sides, increaseSides, decreaseSides } = useSides(
    MIN_SIDES,
    MAX_SIDES
  );

  const { transform, updateX, stopX, decayX, bounce } = useTransform();

  const polygonSize = useSharedValue(window.width / 4);

  const pan = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-4, 4])
      .onBegin(stopX)
      .onChange(({ changeX }) => updateX(changeX))
      .onEnd(({ velocityX }) => decayX(velocityX));
  }, [decayX, stopX, updateX]);

  const handleIncreaseSides = useCallback(() => {
    "worklet";

    if (increaseSides()) {
      bounce();
    }
  }, [bounce, increaseSides]);

  const handleDecreaseSides = useCallback(() => {
    "worklet";

    if (decreaseSides()) {
      bounce();
    }
  }, [bounce, decreaseSides]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <Canvas style={{ flex: 1 }}>
          <Group transform={transform}>
            <Polygon sides={sides} size={polygonSize} />
          </Group>
        </Canvas>
      </GestureDetector>
      <View
        style={[
          styles.controls,
          {
            top: window.height / 2 - 48,
            right: 16,
          },
        ]}
      >
        <ControlButton
          icon="plus"
          limit={MAX_SIDES}
          sides={sides}
          onEnd={handleIncreaseSides}
        />
        <ControlButton
          icon="minus"
          limit={MIN_SIDES}
          sides={sides}
          onEnd={handleDecreaseSides}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3E4C9",
  },
  controls: {
    position: "absolute",
    gap: CONTROL_BUTTON_GAP,
  },
});
