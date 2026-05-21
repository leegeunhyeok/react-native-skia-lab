import { View } from "react-native";
import List from "./components/list";

export default function HomeScreen() {
  const routes = [
    {
      label: "Polygon",
      href: "polygon",
      image: require("./images/polygon.webp"),
    },
    {
      label: "Pixel",
      href: "pixel",
      image: require("./images/pixel.webp"),
    },
    {
      label: "Gesture",
      href: "gesture",
      image: require("./images/gesture.webp"),
    },
    {
      label: "Shader",
      href: "shader",
      image: require("./images/shader.webp"),
    },
    {
      label: "Physics",
      href: "physics",
      image: require("./images/physics.webp"),
    },
    {
      label: "Painting",
      href: "painting",
      image: require("./images/painting.webp"),
    },
  ] as const;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#010102",
      }}
    >
      <List routes={routes} />
    </View>
  );
}
