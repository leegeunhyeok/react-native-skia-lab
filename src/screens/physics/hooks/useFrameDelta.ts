import { clamp, useSharedValue } from 'react-native-reanimated';

export default function useFrameDelta() {
  const lastTimestamp = useSharedValue(0);

  return function getFrameDelta(timestamp: number) {
    'worklet';

    if (!lastTimestamp.get()) {
      lastTimestamp.set(timestamp);
      return 1 / 60;
    }

    const dt = clamp((timestamp - lastTimestamp.get()) / 1000, 1 / 120, 1 / 30);
    lastTimestamp.set(timestamp);
    return dt;
  };
}
