import useCanvas from "@/hooks/useCanvas";
import useWorkletClass from "@/hooks/useWorkletClass";
import { useMemo } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Beach from "./classes/beach";
import Clouds from "./classes/cloud";
import Sea from "./classes/sea";
import Sky from "./classes/sky";
import Sun from "./classes/sun";

export default function PaintingScreen() {
  const sky = useWorkletClass(Sky);
  const clouds = useWorkletClass(Clouds);
  const sun = useWorkletClass(Sun);
  const sea = useWorkletClass(Sea);
  const beach = useWorkletClass(Beach);

  const tap = useMemo(() => {
    return Gesture.Tap().onEnd((e) => {
      if (sun.get()!.isTapped(e.x, e.y)) {
        sun.get()!.flare(5);
        return;
      }

      if (beach.get()!.drop(e.x, e.y)) {
        return;
      }

      if (clouds.get()!.rain(e.x, e.y)) {
        return;
      }
    });
  }, [beach, clouds, sun]);

  const Canvas = useCanvas((canvas) => {
    "worklet";

    sky.get()!.draw(canvas);
    sea.get()!.update(canvas);
    clouds.get()!.draw(canvas, sea.get()!, beach.get()!);
    sun.get()!.draw(canvas);
    beach.get()!.draw(canvas, sea.get()!);
    sea.get()!.draw(canvas);
  });

  return (
    <GestureDetector gesture={tap}>
      <View style={{ flex: 1 }} collapsable={false}>
        <Canvas />
      </View>
    </GestureDetector>
  );
}
