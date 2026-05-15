import { type ScaledSize } from "react-native";
import { clamp } from "react-native-reanimated";
import type { CarouselCardFrame } from "../components/card";
import type { CarouselLabelFrame } from "../components/label";
import {
  LABEL_BLUR_OUT_EASING,
  LABEL_BLUR_OUT_MAX_BLUR,
  LABEL_BLUR_OUT_TRANSLATE_X,
  PARTICLE_TRANSITION_DISTANCE_EXPONENT,
  PARTICLE_TRANSITION_DRAW_PADDING,
  PARTICLE_TRANSITION_FULL_PROGRESS_SPACING,
  PARTICLE_TRANSITION_MIN_PROGRESS,
} from "../constants/animation";
import type { HomeCardStyle, HomeListStyle } from "../types";
import { positiveModulo } from "./utils";

type VisibleCard = {
  centerX: number;
  centerY: number;
  height: number;
  itemIndex: number;
  particleProgress: number;
  rotation: number;
  stageHeight: number;
  stageWidth: number;
  width: number;
};

type VirtualCardLayout = VisibleCard & {
  distance: number;
};

export type DissolveCard = {
  centerX: number;
  centerY: number;
  fromProgress: number;
  height: number;
  itemIndex: number;
  rotation: number;
  stageHeight: number;
  stageWidth: number;
  width: number;
};

type VisibleFrames = {
  cardFrames: CarouselCardFrame[];
  labelFrames: CarouselLabelFrame[];
};

function getParticleProgressRatio(
  progress: number,
  style: HomeListStyle
) {
  "worklet";

  return clamp(
    progress /
      Math.max(style.maxParticleProgress, PARTICLE_TRANSITION_MIN_PROGRESS),
    0,
    1
  );
}

function getScreenDistanceProgress(
  cardCenterY: number,
  screenCenterY: number,
  spacing: number
) {
  "worklet";

  const fullProgressDistance =
    spacing * PARTICLE_TRANSITION_FULL_PROGRESS_SPACING;
  return clamp(
    Math.abs(cardCenterY - screenCenterY) / Math.max(fullProgressDistance, 1),
    0,
    1
  );
}

function getCardCenterX(
  stageWidth: number,
  width: number,
  style: HomeListStyle
) {
  "worklet";

  return stageWidth - style.cardRightInset - width / 2;
}

function getItemIndexAtVirtualIndex(
  virtualIndex: number,
  itemCount: number
) {
  "worklet";

  if (itemCount <= 0) {
    return -1;
  }

  return positiveModulo(virtualIndex, itemCount);
}

function getNearestVirtualIndexForItem(
  itemIndex: number,
  itemCount: number,
  offset: number
) {
  "worklet";

  if (itemCount <= 0) {
    return itemIndex;
  }

  const cycle = Math.round((offset - itemIndex) / itemCount);
  return itemIndex + cycle * itemCount;
}

function getVirtualCardLayout(
  active: readonly boolean[],
  cardStyle: HomeCardStyle,
  centerY: number,
  itemCount: number,
  listStyle: HomeListStyle,
  offset: number,
  spacing: number,
  stageHeight: number,
  stageWidth: number,
  virtualIndex: number
): VirtualCardLayout | null {
  "worklet";

  const itemIndex = getItemIndexAtVirtualIndex(virtualIndex, itemCount);

  if (itemIndex < 0 || !active[itemIndex]) {
    return null;
  }

  const distance = virtualIndex - offset;
  const centerYOnRail = centerY + distance * spacing;
  const scaleDistance = clamp(Math.abs(distance), 0, 1);
  const scale = 1 - scaleDistance * (1 - listStyle.minScale);
  const scaledWidth = cardStyle.width * scale;
  const scaledHeight = cardStyle.height * scale;
  const visualPadding = PARTICLE_TRANSITION_DRAW_PADDING * scale;

  if (
    centerYOnRail + scaledHeight / 2 + visualPadding < 0 ||
    centerYOnRail - scaledHeight / 2 - visualPadding > stageHeight
  ) {
    return null;
  }

  const distanceProgress = getScreenDistanceProgress(
    centerYOnRail,
    centerY,
    spacing
  );
  const particleProgress =
    Math.pow(distanceProgress, PARTICLE_TRANSITION_DISTANCE_EXPONENT) *
    listStyle.maxParticleProgress;

  return {
    centerX: getCardCenterX(stageWidth, scaledWidth, listStyle),
    centerY: centerYOnRail,
    distance,
    height: scaledHeight,
    itemIndex,
    particleProgress,
    rotation: 0,
    stageHeight,
    stageWidth,
    width: scaledWidth,
  };
}

function getVisibleFrame(
  cardStyle: HomeCardStyle,
  enterParticleProgress: number,
  enterLabelOpacity: number,
  bend: number,
  layout: VirtualCardLayout,
  listStyle: HomeListStyle
) {
  "worklet";

  const particleProgress = Math.max(
    layout.particleProgress,
    enterParticleProgress * listStyle.maxParticleProgress
  );

  return {
    cardFrame: {
      bend,
      burst: false,
      burstStartProgress: 0,
      cardAreaFadeProgress: 1,
      centerX: layout.centerX,
      centerY: layout.centerY,
      height: layout.height,
      itemIndex: layout.itemIndex,
      opacity: 1,
      progress: particleProgress,
      stageHeight: layout.stageHeight,
      stageWidth: layout.stageWidth,
      width: layout.width,
    },
    labelFrame: {
      blurBoost: 0,
      cardCenterX: layout.centerX,
      cardWidth: cardStyle.width,
      centerY: layout.centerY,
      itemIndex: layout.itemIndex,
      opacity: enterLabelOpacity,
      particleProgressRatio: getParticleProgressRatio(
        particleProgress,
        listStyle
      ),
      translateX: 0,
    },
  };
}

function isLabelVisible(
  label: CarouselLabelFrame,
  stageHeight: number,
  style: HomeListStyle
) {
  "worklet";

  const halfHeight = style.labelFontSize;
  return (
    label.centerY + halfHeight >= 0 && label.centerY - halfHeight <= stageHeight
  );
}

export function getVisibleFrames(
  active: readonly boolean[],
  cardStyle: HomeCardStyle,
  enterLabelOpacity: number,
  enterParticleProgress: number,
  bend: number,
  itemCount: number,
  listStyle: HomeListStyle,
  offset: number,
  spacing: number,
  window: ScaledSize
): VisibleFrames {
  "worklet";

  if (itemCount <= 0) {
    return {
      cardFrames: [],
      labelFrames: [],
    };
  }

  const centerY = window.height / 2;
  const centerVirtualIndex = Math.floor(offset);
  const layouts: VirtualCardLayout[] = [];
  const cardFrames: CarouselCardFrame[] = [];
  const labelFrames: CarouselLabelFrame[] = [];

  for (
    let virtualIndex = centerVirtualIndex - listStyle.visibleScanRadius;
    virtualIndex <= centerVirtualIndex + listStyle.visibleScanRadius + 1;
    virtualIndex++
  ) {
    const layout = getVirtualCardLayout(
      active,
      cardStyle,
      centerY,
      itemCount,
      listStyle,
      offset,
      spacing,
      window.height,
      window.width,
      virtualIndex
    );

    if (layout) {
      layouts.push(layout);
    }
  }

  layouts.sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance));
  layouts.length = Math.min(layouts.length, listStyle.visibleCardLimit);
  layouts.sort((a, b) => Math.abs(b.distance) - Math.abs(a.distance));

  for (let i = 0; i < layouts.length; i++) {
    const frames = getVisibleFrame(
      cardStyle,
      enterParticleProgress,
      enterLabelOpacity,
      bend,
      layouts[i],
      listStyle
    );
    cardFrames.push(frames.cardFrame);

    if (isLabelVisible(frames.labelFrame, window.height, listStyle)) {
      labelFrames.push(frames.labelFrame);
    }
  }

  return {
    cardFrames,
    labelFrames,
  };
}

export function getFadingLabelFrames(
  fadingLabels: readonly CarouselLabelFrame[],
  labelFadeAge: number,
  style: HomeListStyle
) {
  "worklet";

  if (labelFadeAge < 0 || fadingLabels.length <= 0) {
    return [];
  }

  const progress = clamp(labelFadeAge / style.labelFadeDuration, 0, 1);
  const easedProgress = LABEL_BLUR_OUT_EASING(progress);
  const translateProgress = clamp(progress * 1.45, 0, 1);
  const easedTranslateProgress = LABEL_BLUR_OUT_EASING(translateProgress);
  const opacity = 1 - easedProgress;
  const blurBoost = LABEL_BLUR_OUT_MAX_BLUR * easedProgress;
  const translateX = LABEL_BLUR_OUT_TRANSLATE_X * easedTranslateProgress;

  return fadingLabels.map((label) => ({
    ...label,
    blurBoost,
    opacity,
    translateX,
  }));
}

export function getDissolveFrames(
  dissolves: readonly DissolveCard[],
  dissolveProgress: number,
  style: HomeListStyle
) {
  "worklet";

  const maxParticleProgress = Math.max(
    style.maxParticleProgress,
    PARTICLE_TRANSITION_MIN_PROGRESS
  );
  const frames: CarouselCardFrame[] = [];

  for (let i = 0; i < dissolves.length; i++) {
    const dissolve = dissolves[i];
    const fromProgress = clamp(dissolve.fromProgress, 0, maxParticleProgress);
    const fromProgressRatio = clamp(fromProgress / maxParticleProgress, 0, 1);
    const transitionProgress = clamp(dissolveProgress, 0, 1);
    const progress =
      fromProgress + (maxParticleProgress - fromProgress) * transitionProgress;

    frames.push({
      bend: 0,
      burst: true,
      burstStartProgress: fromProgressRatio,
      cardAreaFadeProgress: transitionProgress,
      centerX: dissolve.centerX,
      centerY: dissolve.centerY,
      height: dissolve.height,
      itemIndex: dissolve.itemIndex,
      opacity: 1,
      progress,
      stageHeight: dissolve.stageHeight,
      stageWidth: dissolve.stageWidth,
      width: dissolve.width,
    });
  }

  return frames;
}

export function findTappedCard(
  frames: readonly CarouselCardFrame[],
  x: number,
  y: number
) {
  "worklet";

  for (let i = frames.length - 1; i >= 0; i--) {
    const frame = frames[i];

    if (frame.burst) {
      continue;
    }

    if (
      Math.abs(x - frame.centerX) <= frame.width / 2 &&
      Math.abs(y - frame.centerY) <= frame.height / 2
    ) {
      return frame;
    }
  }

  return null;
}

export function getDissolveCardsForPress(
  active: readonly boolean[],
  cardStyle: HomeCardStyle,
  enterParticleProgress: number,
  itemCount: number,
  listStyle: HomeListStyle,
  offset: number,
  pressedCard: CarouselCardFrame
) {
  "worklet";

  const centerY = pressedCard.stageHeight / 2;
  const nextActive = [...active];
  const nextDissolves: DissolveCard[] = [];

  for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
    if (!nextActive[itemIndex]) {
      continue;
    }

    const virtualIndex = getNearestVirtualIndexForItem(
      itemIndex,
      itemCount,
      offset
    );
    const distance = virtualIndex - offset;
    const scaleDistance = clamp(Math.abs(distance), 0, 1);
    const scale = 1 - scaleDistance * (1 - listStyle.minScale);
    const width = cardStyle.width * scale;
    const height = cardStyle.height * scale;
    const spacing = cardStyle.height + listStyle.gap;
    const centerYOnRail = centerY + distance * spacing;
    const particleProgress = Math.max(
      Math.pow(
        getScreenDistanceProgress(centerYOnRail, centerY, spacing),
        PARTICLE_TRANSITION_DISTANCE_EXPONENT
      ) * listStyle.maxParticleProgress,
      enterParticleProgress * listStyle.maxParticleProgress
    );

    nextActive[itemIndex] = false;
    nextDissolves.push({
      centerX: getCardCenterX(pressedCard.stageWidth, width, listStyle),
      centerY: centerYOnRail,
      fromProgress: particleProgress,
      height,
      itemIndex,
      rotation: 0,
      stageHeight: pressedCard.stageHeight,
      stageWidth: pressedCard.stageWidth,
      width,
    });
  }

  return {
    active: nextActive,
    dissolves: nextDissolves,
  };
}
