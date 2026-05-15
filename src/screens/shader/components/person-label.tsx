import { StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  company: SharedValue<string>;
  name: SharedValue<string>;
};

export default function PersonLabel({ company, name }: Props) {
  const window = useWindowDimensions();
  const labelWidth = window.width - 64;
  const nameProps = useAnimatedProps(() => ({
    defaultValue: name.value,
    text: name.value,
  }));
  const companyProps = useAnimatedProps(() => ({
    defaultValue: company.value,
    text: company.value,
  }));
  const nameStyle = useAnimatedStyle(() => {
    const fontSize = Math.min(
      96,
      labelWidth / (Math.max(name.value.length, 1) * 0.62)
    );

    return {
      fontSize,
      height: fontSize + 10,
      lineHeight: fontSize + 8,
      width: labelWidth,
    };
  }, [labelWidth]);

  return (
    <View style={styles.labelContainer} collapsable={false}>
      <AnimatedTextInput
        animatedProps={nameProps}
        editable={false}
        numberOfLines={1}
        pointerEvents="none"
        scrollEnabled={false}
        style={[styles.name, nameStyle]}
      />
      <AnimatedTextInput
        animatedProps={companyProps}
        editable={false}
        numberOfLines={1}
        pointerEvents="none"
        scrollEnabled={false}
        style={styles.company}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  labelContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 96,
    fontWeight: "700",
    includeFontPadding: false,
    letterSpacing: 0,
    padding: 0,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.26)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  company: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "400",
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 24,
    width: "80%",
    padding: 0,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
