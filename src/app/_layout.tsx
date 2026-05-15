import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { X } from "lucide-react-native";
import { Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RootLayout() {
  const insets = useSafeAreaInsets();

  return (
    <GestureHandlerRootView>
      <StatusBar hidden />
      <Stack
        screenOptions={({ route, navigation }) => {
          const closeButtonColor =
            route.name === "physics" || route.name === "polygon"
              ? "#000000"
              : "#FFFFFF";

          return {
            header: () => {
              if (route.name === "index") {
                return null;
              }

              return (
                <Pressable
                  hitSlop={8}
                  style={{
                    position: "absolute",
                    top: insets.top,
                    left: 8,
                    zIndex: 1000,
                    padding: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 28,
                    minHeight: 28,
                  }}
                  onPress={navigation.goBack}
                >
                  <X size={28} strokeWidth={2.4} color={closeButtonColor} />
                </Pressable>
              );
            },
            animation: "fade",
            animationDuration: 300,
            animationMatchesGesture: true,
            gestureEnabled: true,
          };
        }}
      />
    </GestureHandlerRootView>
  );
}
