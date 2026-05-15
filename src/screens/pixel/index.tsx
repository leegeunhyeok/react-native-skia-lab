import useCanvas from "@/hooks/useCanvas";
import useWorkletClass from "@/hooks/useWorkletClass";
import { rect, useImage, vec } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import Ripple from "./classes/ripple";

export default function PixelScreen() {
  const window = useWindowDimensions();

  const image = useImage(require("./images/flower.webp"));

  const ripple = useWorkletClass(Ripple, {
    image,
    bounds: rect(0, 0, window.width, window.height),
    pixelSize: 22,
  });

  const Canvas = useCanvas((canvas) => {
    "worklet";
    ripple.get()?.draw(canvas);
  });

  const tap = useMemo(() => {
    return Gesture.Tap().onEnd(({ x, y }) => {
      ripple.get()?.ripple(vec(x, y));
    });
  }, []);

  return (
    <GestureDetector gesture={tap}>
      <View
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center",
        }}
        collapsable={false}
      >
        {image ? (
          <Animated.View
            style={{ flex: 1 }}
            entering={FadeIn.duration(500).easing(Easing.out(Easing.quad))}
          >
            <Canvas />
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}
