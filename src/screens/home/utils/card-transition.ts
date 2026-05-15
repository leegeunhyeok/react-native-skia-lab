import { rect, type SkRect, type Uniforms } from "@shopify/react-native-skia";
import type { CarouselCardFrame } from "../components/card";
import {
  PARTICLE_TRANSITION_DRAW_PADDING,
  PARTICLE_TRANSITION_MIN_PROGRESS,
  PARTICLE_TRANSITION_PROGRESS_BOOST,
} from "../constants/animation";
import type { HomeCardStyle } from "../types";
import { findFrameByItemIndex } from "./utils";

export function findCardFrame(
  frames: readonly CarouselCardFrame[],
  itemIndex: number
): CarouselCardFrame | null {
  "worklet";

  return findFrameByItemIndex(frames, itemIndex);
}

export function getCardDrawRect(
  frame: CarouselCardFrame | null,
  style: HomeCardStyle
): SkRect {
  "worklet";

  if (!frame) {
    return rect(0, 0, 0, 0);
  }

  if (frame.burst) {
    return rect(0, 0, frame.stageWidth, frame.stageHeight);
  }

  const paddingX =
    PARTICLE_TRANSITION_DRAW_PADDING * (frame.width / style.width);
  const paddingY =
    PARTICLE_TRANSITION_DRAW_PADDING * (frame.height / style.height);
  const left = frame.centerX - frame.width / 2 - paddingX;
  const top = frame.centerY - frame.height / 2 - paddingY;
  const right = Math.min(
    frame.centerX + frame.width / 2 + paddingX,
    frame.stageWidth - style.rightInset
  );
  const bottom = frame.centerY + frame.height / 2 + paddingY;

  return rect(left, top, Math.max(right - left, 0), bottom - top);
}

export function getCardOpacity(frame: CarouselCardFrame | null) {
  "worklet";

  return frame ? 1 : 0;
}

export function getCardUniforms(
  frame: CarouselCardFrame | null,
  itemIndex: number,
  style: HomeCardStyle,
  timestamp: number
): Uniforms {
  "worklet";

  const progress = frame
    ? (frame.progress /
        Math.max(style.maxParticleProgress, PARTICLE_TRANSITION_MIN_PROGRESS)) *
      PARTICLE_TRANSITION_PROGRESS_BOOST
    : 0;

  return {
    iSize: [style.width, style.height],
    iProgress: Math.min(Math.max(progress, 0), 1),
    iSeed: itemIndex * 41.17 + 3.1,
    iOpacity: frame?.opacity ?? 0,
    iRadius: style.radius,
    iFold: 0,
    iTime: timestamp / 1000,
    iBurst: frame?.burst ? 1 : 0,
    iBurstStartProgress: frame?.burst ? frame.burstStartProgress : 0,
    iCardAreaFadeProgress: frame?.cardAreaFadeProgress ?? 1,
    iCardOrigin: frame
      ? [frame.centerX - frame.width / 2, frame.centerY - frame.height / 2]
      : [0, 0],
    iCardSize: frame
      ? [frame.width, frame.height]
      : [style.width, style.height],
    iStageSize: frame
      ? [frame.stageWidth, frame.stageHeight]
      : [style.width, style.height],
  };
}
