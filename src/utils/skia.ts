import {
  DataSourceParam,
  loadData,
  Skia,
  SkImage,
} from "@shopify/react-native-skia";

export function loadSkImage(source: DataSourceParam): Promise<SkImage | null> {
  return loadData(source, Skia.Image.MakeImageFromEncoded);
}

type Value = string | number;
type Values = Value[];

export const glsl = (source: TemplateStringsArray, ...values: Values) => {
  const processed = source.flatMap((s, i) => [s, values[i]]).filter(Boolean);
  return processed.join("");
};

export const frag = (source: TemplateStringsArray, ...values: Values) => {
  const code = glsl(source, ...values);
  const rt = Skia.RuntimeEffect.Make(code);
  if (rt === null) {
    throw new Error("Couldn't Compile Shader");
  }
  return rt;
};
