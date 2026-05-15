import {
  Canvas,
  Fill,
  ImageShader,
  rect,
  Shader,
} from "@shopify/react-native-skia";
import {
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import PersonLabel from "./components/person-label";
import { people } from "./constants/people";
import { useVisual } from "./hooks/use-visual";

export default function ShaderScreen() {
  const window = useWindowDimensions();
  const {
    currImage,
    isLoading,
    labelCompany,
    labelName,
    prevImage,
    shader,
    uniforms,
  } = useVisual({
    people,
    width: window.width,
    height: window.height,
  });

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Canvas
            style={{
              width: window.width,
              height: window.height,
            }}
          >
            <Fill>
              <Shader source={shader!} uniforms={uniforms}>
                <ImageShader
                  image={prevImage}
                  rect={rect(0, 0, window.width, window.height)}
                  fit="cover"
                />
                <ImageShader
                  image={currImage}
                  rect={rect(0, 0, window.width, window.height)}
                  fit="cover"
                />
              </Shader>
            </Fill>
          </Canvas>
          <PersonLabel company={labelCompany} name={labelName} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050507",
  },
});
