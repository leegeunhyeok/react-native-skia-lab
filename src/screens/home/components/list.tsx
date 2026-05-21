// @refresh reset
import useAnimation from "@/hooks/useAnimation";
import type { RouteName } from "@/navigation/types";
import { Canvas } from "@shopify/react-native-skia";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import {
  PARTICLE_TRANSITION_EXIT_DURATION,
  PARTICLE_TRANSITION_NAVIGATION_DELAY_RATIO,
} from "../constants/animation";
import useLayout from "../hooks/use-layout";
import useListTransition from "../hooks/use-list-transition";
import usePan from "../hooks/use-pan";
import useScroll from "../hooks/use-scroll";
import useTap from "../hooks/use-tap";
import type { HomeRoute } from "../types";
import ListItem from "./list-item";

type Props = {
  routes: readonly HomeRoute[];
};

export default function List({ routes }: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<Record<RouteName, undefined>>>();
  const labels = useMemo(() => routes.map((route) => route.label), [routes]);
  const hrefs = useMemo(() => routes.map((route) => route.href), [routes]);

  const { cardStyle, labelStyle, listStyle } = useLayout();

  const transition = useListTransition({
    labels,
    cardStyle,
    listStyle,
  });

  const scroll = useScroll(transition.disabled);
  const spacing = cardStyle.height + listStyle.gap;
  const pan = usePan({
    disabled: transition.disabled,
    onCancel: scroll.cancel,
    onEnd: useCallback(
      (velocityY: number) => {
        "worklet";

        scroll.end(velocityY / spacing);
      },
      [scroll, spacing]
    ),
    onStart: scroll.start,
    onUpdate: useCallback(
      (translationY: number) => {
        "worklet";

        scroll.update(translationY / spacing);
      },
      [scroll, spacing]
    ),
  });

  const navigateWithDelay = useCallback(
    (href: string, delayMs: number) => {
      setTimeout(() => {
        navigation.navigate(href as RouteName);
      }, delayMs);
    },
    [navigation]
  );

  const tap = useTap({
    disabled: transition.disabled,
    onPress: useCallback(
      (x: number, y: number) => {
        "worklet";

        const itemIndex = transition.startPressTransition(x, y);
        if (itemIndex < 0) {
          return;
        }

        const href = hrefs[itemIndex];
        if (!href) {
          return;
        }

        scheduleOnRN(
          navigateWithDelay,
          href,
          PARTICLE_TRANSITION_EXIT_DURATION *
            PARTICLE_TRANSITION_NAVIGATION_DELAY_RATIO
        );
      },
      [navigateWithDelay, hrefs, transition]
    ),
  });

  useAnimation({
    frameRate: 60,
    worklet: (frameInfo) => {
      "worklet";
      scroll.tick(frameInfo.timestamp);
      transition.update(
        { bend: scroll.bend.value, frameInfo },
        scroll.offset.value
      );
    },
  });

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View style={{ flex: 1 }} collapsable={false}>
        <Canvas style={{ flex: 1 }}>
          {routes.map((route, itemIndex) => (
            <ListItem
              key={route.href}
              cardFrames={transition.cardFrames}
              cardStyle={cardStyle}
              frameTimestamp={transition.frameTimestamp}
              image={route.image}
              itemIndex={itemIndex}
              label={route.label}
              labelFrames={transition.labelFrames}
              labelStyle={labelStyle}
            />
          ))}
        </Canvas>
      </View>
    </GestureDetector>
  );
}
