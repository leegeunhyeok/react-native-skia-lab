import {
  Canvas,
  createPicture,
  Picture,
  rect,
  SkCanvas,
  SkPicture,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { ScaledSize, useWindowDimensions } from "react-native";
import { FrameInfo, useSharedValue } from "react-native-reanimated";
import useAnimation from "./useAnimation";

export type Canvas2d = {
  ctx: SkCanvas;
  window: ScaledSize;
  frameInfo: FrameInfo;
};

export default function useCanvas(cb: (canvas: Canvas2d) => void) {
  const window = useWindowDimensions();
  const picture = useSharedValue<SkPicture>(createPicture(() => {}, window));

  useAnimation({
    frameRate: 60,
    worklet: (frameInfo) => {
      "worklet";
      picture.set(
        createPicture((ctx) => {
          cb({
            ctx,
            window,
            frameInfo,
          });
        }, rect(0, 0, window.width, window.height))
      );
    },
  });

  return useMemo(
    () => () => {
      return (
        <Canvas style={{ width: window.width, height: window.height }}>
          <Picture picture={picture} />
        </Canvas>
      );
    },
    [window]
  );
}
