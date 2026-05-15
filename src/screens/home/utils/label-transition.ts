import type { Transforms3d } from "@shopify/react-native-skia";
import type { CarouselLabelFrame } from "../components/label";
import {
  LABEL_HIDDEN_POSITION,
  LABEL_VISIBLE_OPACITY_THRESHOLD,
} from "../constants/animation";
import type { HomeLabelStyle } from "../types";
import { findFrameByItemIndex } from "./utils";

export function findLabelFrame(
  frames: readonly CarouselLabelFrame[],
  itemIndex: number
): CarouselLabelFrame | null {
  "worklet";

  return findFrameByItemIndex(frames, itemIndex);
}

export function getLabelX(
  frame: CarouselLabelFrame | null,
  style: HomeLabelStyle
) {
  "worklet";

  if (!frame || frame.opacity <= LABEL_VISIBLE_OPACITY_THRESHOLD) {
    return LABEL_HIDDEN_POSITION;
  }

  const cardLeft = frame.cardCenterX - frame.cardWidth / 2;
  const labelRight = cardLeft - style.gap;
  return labelRight - style.width;
}

export function getLabelY(
  frame: CarouselLabelFrame | null,
  style: HomeLabelStyle
) {
  "worklet";

  if (!frame || frame.opacity <= LABEL_VISIBLE_OPACITY_THRESHOLD) {
    return LABEL_HIDDEN_POSITION;
  }

  return frame.centerY - style.fontSize / 2;
}

export function getLabelBlur(
  frame: CarouselLabelFrame | null,
  style: HomeLabelStyle
) {
  "worklet";

  if (!frame) {
    return 0;
  }

  return frame.particleProgressRatio * style.maxBlur + frame.blurBoost;
}

export function getLabelOpacity(frame: CarouselLabelFrame | null) {
  "worklet";

  return frame?.opacity ?? 0;
}

export function getLabelTransform(
  frame: CarouselLabelFrame | null
): Transforms3d {
  "worklet";

  return [
    {
      translate: [frame?.translateX ?? 0, 0],
    },
  ];
}
