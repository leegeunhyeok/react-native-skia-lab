import { loadSkImage } from "@/utils/skia";
import { type DataSourceParam, type SkImage } from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import { useSharedValue } from "react-native-reanimated";

export function useImages(sources: readonly DataSourceParam[]) {
  const [isLoading, setIsLoading] = useState(true);
  const images = useSharedValue<(SkImage | null)[]>([]);

  useEffect(
    function loadImages() {
      setIsLoading(true);
      Promise.all(sources.map(loadSkImage)).then((loadedImages) => {
        images.set(loadedImages);
        setIsLoading(false);
      });
    },
    [images, sources]
  );

  return {
    images,
    isLoading,
  };
}
