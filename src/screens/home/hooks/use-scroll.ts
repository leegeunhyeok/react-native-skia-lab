import { useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
import {
  SCROLL_SNAP_DAMPING,
  SCROLL_SNAP_STIFFNESS,
  SCROLL_SNAP_STOP_THRESHOLD,
} from "../constants/animation";
import { getFrameDeltaSeconds } from "../utils/utils";

const SCROLL_FLICK_VELOCITY_THRESHOLD = 0.75;
const SCROLL_MAX_PROJECTED_STEPS = 5;
const SCROLL_VELOCITY_PROJECTION_SECONDS = 0.32;
const SCROLL_BEND_MAX = 0.045;
const SCROLL_BEND_RESPONSE = 18;
const SCROLL_BEND_VELOCITY_SCALE = 0.008;

function clampProjectedSteps(steps: number) {
  "worklet";

  return Math.max(
    -SCROLL_MAX_PROJECTED_STEPS,
    Math.min(steps, SCROLL_MAX_PROJECTED_STEPS)
  );
}

function getTargetSnapOffset(offset: number, velocity: number) {
  "worklet";

  if (Math.abs(velocity) < SCROLL_FLICK_VELOCITY_THRESHOLD) {
    return Math.round(offset);
  }

  return Math.round(
    offset +
      clampProjectedSteps(velocity * SCROLL_VELOCITY_PROJECTION_SECONDS)
  );
}

export default function useScroll(disabled: SharedValue<boolean>) {
  const bend = useSharedValue(0);
  const dragStartOffset = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const lastTimestamp = useSharedValue(0);
  const offset = useSharedValue(0);
  const snapVelocity = useSharedValue(0);
  const targetOffset = useSharedValue(0);

  const start = useCallback(() => {
    "worklet";

    if (disabled.value) {
      return;
    }

    isDragging.value = true;
    bend.value = 0;
    dragStartOffset.value = offset.value;
    snapVelocity.value = 0;
  }, [bend, disabled, dragStartOffset, isDragging, offset, snapVelocity]);

  const update = useCallback(
    (translation: number) => {
      "worklet";

      if (disabled.value) {
        return;
      }

      offset.value = dragStartOffset.value - translation;
      targetOffset.value = offset.value;
    },
    [disabled, dragStartOffset, offset, targetOffset]
  );

  const end = useCallback(
    (velocity: number) => {
      "worklet";

      if (disabled.value) {
        return;
      }

      isDragging.value = false;
      if (!Number.isFinite(velocity)) {
        targetOffset.value = Math.round(offset.value);
        return;
      }

      targetOffset.value = getTargetSnapOffset(offset.value, -velocity);
    },
    [disabled, isDragging, offset, targetOffset]
  );

  const cancel = useCallback(() => {
    "worklet";

    if (!isDragging.value) {
      return;
    }

    end(0);
  }, [end, isDragging]);

  useFocusEffect(
    useCallback(function reset() {
      scheduleOnUI(() => {
        bend.value = 0;
        isDragging.value = false;
        lastTimestamp.value = 0;
        snapVelocity.value = 0;
        targetOffset.value = Math.round(offset.value);
      });
    }, [])
  );

  const tick = useCallback(
    (timestamp: number) => {
      "worklet";

      const hadLastTimestamp = Boolean(lastTimestamp.value);
      const dt = getFrameDeltaSeconds(timestamp, lastTimestamp);

      if (!hadLastTimestamp) {
        return;
      }

      if (disabled.value) {
        bend.value = 0;
        isDragging.value = false;
        snapVelocity.value = 0;
        targetOffset.value = Math.round(offset.value);
        return;
      }

      if (isDragging.value) {
        return;
      }

      const delta = targetOffset.value - offset.value;
      snapVelocity.value += delta * SCROLL_SNAP_STIFFNESS * dt;
      snapVelocity.value *= Math.exp(-SCROLL_SNAP_DAMPING * dt);
      offset.value += snapVelocity.value * dt;

      if (
        Math.abs(delta) < SCROLL_SNAP_STOP_THRESHOLD &&
        Math.abs(snapVelocity.value) < SCROLL_SNAP_STOP_THRESHOLD
      ) {
        bend.value = 0;
        offset.value = targetOffset.value;
        snapVelocity.value = 0;
        return;
      }

      const targetBend = Math.max(
        -SCROLL_BEND_MAX,
        Math.min(
          snapVelocity.value * SCROLL_BEND_VELOCITY_SCALE,
          SCROLL_BEND_MAX
        )
      );
      const bendProgress = 1 - Math.exp(-SCROLL_BEND_RESPONSE * dt);
      bend.value += (targetBend - bend.value) * bendProgress;
    },
    [
      bend,
      disabled,
      isDragging,
      lastTimestamp,
      offset,
      snapVelocity,
      targetOffset,
    ]
  );

  return useMemo(
    () => ({
      bend,
      cancel,
      end,
      offset,
      start,
      tick,
      update,
    }),
    [bend, cancel, end, offset, start, tick, update]
  );
}
