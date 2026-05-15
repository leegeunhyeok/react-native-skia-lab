import { useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import { useWindowDimensions } from "react-native";
import {
  clamp,
  useSharedValue,
  withTiming,
  type FrameInfo,
} from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
import type { CarouselCardFrame } from "../components/card";
import type { CarouselLabelFrame } from "../components/label";
import {
  PARTICLE_TRANSITION_EXIT_DURATION,
  LABEL_ENTER_FADE_DURATION,
  LABEL_ENTER_START_RATIO,
  PARTICLE_TRANSITION_ENTER_DURATION,
  PARTICLE_TRANSITION_ENTER_EASING,
  PARTICLE_TRANSITION_EXIT_EASING,
} from "../constants/animation";
import type { HomeCardStyle, HomeListStyle } from "../types";
import {
  findTappedCard,
  getDissolveCardsForPress,
  getDissolveFrames,
  getFadingLabelFrames,
  getVisibleFrames,
  type DissolveCard,
} from "../utils/list-transition";
import { getFrameDeltaSeconds } from "../utils/utils";

type UpdateContext = {
  bend: number;
  frameInfo: FrameInfo;
};

type Params = {
  readonly cardStyle: HomeCardStyle;
  readonly labels: readonly string[];
  readonly listStyle: HomeListStyle;
};

export default function useListTransition({
  cardStyle,
  labels,
  listStyle,
}: Params) {
  const active = useSharedValue(labels.map(() => true));
  const cardFrames = useSharedValue<CarouselCardFrame[]>([]);
  const dissolves = useSharedValue<DissolveCard[]>([]);
  const dissolveProgress = useSharedValue(0);
  const enterAge = useSharedValue(0);
  const enterLabelOpacity = useSharedValue(0);
  const enterParticleProgress = useSharedValue(1);
  const fadingLabels = useSharedValue<CarouselLabelFrame[]>([]);
  const frameTimestamp = useSharedValue(0);
  const labelFadeAge = useSharedValue(-1);
  const labelFrames = useSharedValue<CarouselLabelFrame[]>([]);
  const lastTimestamp = useSharedValue(0);
  const offset = useSharedValue(0);
  const disabled = useSharedValue(false);
  const window = useWindowDimensions();

  const startPressTransition = useCallback(
    (x: number, y: number) => {
      "worklet";

      if (disabled.value || dissolves.value.length > 0) {
        return -1;
      }

      const pressedCard = findTappedCard(cardFrames.value, x, y);

      if (!pressedCard) {
        return -1;
      }

      fadingLabels.value = labelFrames.value;
      labelFadeAge.value = 0;
      dissolveProgress.value = 0;
      disabled.value = true;

      const pressFrames = getDissolveCardsForPress(
        active.value,
        cardStyle,
        enterParticleProgress.value,
        labels.length,
        listStyle,
        offset.value,
        pressedCard
      );

      active.value = pressFrames.active;
      dissolves.value = pressFrames.dissolves;
      dissolveProgress.value = withTiming(
        1,
        {
          duration: PARTICLE_TRANSITION_EXIT_DURATION,
          easing: PARTICLE_TRANSITION_EXIT_EASING,
        },
        (finished) => {
          if (finished) {
            disabled.value = false;
          }
        }
      );

      return pressedCard.itemIndex;
    },
    [
      active,
      cardFrames,
      cardStyle,
      disabled,
      dissolveProgress,
      dissolves,
      enterParticleProgress,
      fadingLabels,
      labelFadeAge,
      labelFrames,
      labels.length,
      listStyle,
      offset,
    ]
  );

  const update = useCallback(
    (context: UpdateContext, scrollOffset: number) => {
      "worklet";

      const dt = getFrameDeltaSeconds(
        context.frameInfo.timestamp,
        lastTimestamp
      );
      const spacing = cardStyle.height + listStyle.gap;

      offset.value = scrollOffset;
      frameTimestamp.value = context.frameInfo.timestamp;

      if (enterLabelOpacity.value < 1 || enterParticleProgress.value > 0) {
        enterAge.value += dt * 1000;

        const particleProgress = clamp(
          enterAge.value / PARTICLE_TRANSITION_ENTER_DURATION,
          0,
          1
        );
        enterParticleProgress.value =
          1 - PARTICLE_TRANSITION_ENTER_EASING(particleProgress);

        const labelStartAge =
          PARTICLE_TRANSITION_ENTER_DURATION * LABEL_ENTER_START_RATIO;

        if (enterAge.value < labelStartAge) {
          enterLabelOpacity.value = 0;
        } else {
          const labelProgress = clamp(
            (enterAge.value - labelStartAge) / LABEL_ENTER_FADE_DURATION,
            0,
            1
          );
          enterLabelOpacity.value =
            labelProgress * labelProgress * (3 - 2 * labelProgress);
        }
      }

      const visibleFrames = getVisibleFrames(
        active.value,
        cardStyle,
        enterLabelOpacity.value,
        enterParticleProgress.value,
        context.bend,
        labels.length,
        listStyle,
        offset.value,
        spacing,
        window
      );
      cardFrames.value = [
        ...visibleFrames.cardFrames,
        ...getDissolveFrames(
          dissolves.value,
          dissolveProgress.value,
          listStyle
        ),
      ];

      if (dissolveProgress.value >= 1) {
        dissolves.value = [];
      }

      labelFrames.value = [
        ...visibleFrames.labelFrames,
        ...getFadingLabelFrames(
          fadingLabels.value,
          labelFadeAge.value,
          listStyle
        ),
      ];

      if (labelFadeAge.value >= 0) {
        labelFadeAge.value += dt * 1000;

        if (labelFadeAge.value >= listStyle.labelFadeDuration) {
          labelFadeAge.value = -1;
          fadingLabels.value = [];
        }
      }
    },
    [
      active,
      cardFrames,
      cardStyle,
      dissolveProgress,
      dissolves,
      enterAge,
      enterLabelOpacity,
      enterParticleProgress,
      fadingLabels,
      frameTimestamp,
      labelFadeAge,
      labelFrames,
      labels.length,
      lastTimestamp,
      listStyle,
      offset,
      window,
    ]
  );

  useFocusEffect(
    useCallback(function reset() {
      scheduleOnUI(() => {
        active.value = labels.map(() => true);
        dissolves.value = [];
        dissolveProgress.value = 0;
        enterAge.value = 0;
        enterLabelOpacity.value = 0;
        enterParticleProgress.value = 1;
        fadingLabels.value = [];
        labelFadeAge.value = -1;
        lastTimestamp.value = 0;
        cardFrames.value = [];
        labelFrames.value = [];
        frameTimestamp.value = 0;
        disabled.value = false;
      });
    }, [])
  );

  return useMemo(
    () => ({
      cardFrames,
      disabled,
      frameTimestamp,
      labelFrames,
      startPressTransition,
      update,
    }),
    [
      cardFrames,
      disabled,
      frameTimestamp,
      labelFrames,
      startPressTransition,
      update,
    ]
  );
}
