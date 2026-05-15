import {
  Group,
  ImageShader,
  Rect,
  Shader,
  rect,
  type Transforms3d,
  type Vector,
  useImage,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { particleTransition } from "../shaders/transition";
import type { HomeCardStyle } from "../types";
import {
  findCardFrame,
  getCardDrawRect,
  getCardOpacity,
  getCardUniforms,
} from "../utils/card-transition";

export type CarouselCardFrame = {
  readonly bend: number;
  readonly burst: boolean;
  readonly burstStartProgress: number;
  readonly cardAreaFadeProgress: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly height: number;
  readonly itemIndex: number;
  readonly opacity: number;
  readonly progress: number;
  readonly stageHeight: number;
  readonly stageWidth: number;
  readonly width: number;
};

type Props = {
  readonly frames: SharedValue<CarouselCardFrame[]>;
  readonly image: number;
  readonly itemIndex: number;
  readonly style: HomeCardStyle;
  readonly timestamp: SharedValue<number>;
};

export default function Card({
  frames,
  image,
  itemIndex,
  style,
  timestamp,
}: Props) {
  const skImage = useImage(image);
  const sourceRect = useMemo(
    () => rect(0, 0, style.width, style.height),
    [style.height, style.width]
  );

  const drawRect = useDerivedValue(() => {
    return getCardDrawRect(findCardFrame(frames.value, itemIndex), style);
  }, [frames, itemIndex, style.height, style.rightInset, style.width]);

  const opacity = useDerivedValue(() => {
    return getCardOpacity(findCardFrame(frames.value, itemIndex));
  }, [frames, itemIndex]);

  const origin = useDerivedValue<Vector>(() => {
    const frame = findCardFrame(frames.value, itemIndex);
    return {
      x: frame?.centerX ?? 0,
      y: frame?.centerY ?? 0,
    };
  }, [frames, itemIndex]);

  const transform = useDerivedValue<Transforms3d>(() => {
    const frame = findCardFrame(frames.value, itemIndex);

    if (!frame || frame.burst) {
      return [];
    }

    return [
      {
        skewY: frame.bend,
      },
    ];
  }, [frames, itemIndex]);

  const uniforms = useDerivedValue(() => {
    return getCardUniforms(
      findCardFrame(frames.value, itemIndex),
      itemIndex,
      style,
      timestamp.value
    );
  }, [frames, itemIndex, style, timestamp]);

  if (!skImage) {
    return null;
  }

  return (
    <Group opacity={opacity} origin={origin} transform={transform}>
      <Rect rect={drawRect} opacity={opacity}>
        <Shader source={particleTransition} uniforms={uniforms}>
          <ImageShader image={skImage} rect={sourceRect} fit="fill" />
        </Shader>
      </Rect>
    </Group>
  );
}
