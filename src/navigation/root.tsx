import HomeScreen from '@/screens/home';
import GestureScreen from '@/screens/gesture';
import PaintingScreen from '@/screens/painting';
import PhysicsScreen from '@/screens/physics';
import PixelScreen from '@/screens/pixel';
import PolygonScreen from '@/screens/polygon';
import ShaderScreen from '@/screens/shader';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList, RouteName } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const DARK_HEADER_ROUTES: ReadonlySet<RouteName> = new Set([
  'physics',
  'polygon',
]);

export default function RootNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Stack.Navigator
      initialRouteName="home"
      screenOptions={({ route, navigation }): NativeStackNavigationOptions => {
        const name = route.name as RouteName;
        const closeButtonColor = DARK_HEADER_ROUTES.has(name)
          ? '#000000'
          : '#FFFFFF';

        return {
          header: () => {
            if (name === 'home') {
              return null;
            }
            return (
              <Pressable
                hitSlop={8}
                style={{
                  position: 'absolute',
                  top: insets.top,
                  left: 8,
                  zIndex: 1000,
                  padding: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 28,
                  minHeight: 28,
                }}
                onPress={navigation.goBack}
              >
                <X size={28} strokeWidth={2.4} color={closeButtonColor} />
              </Pressable>
            );
          },
          headerShown: name !== 'home',
          headerTransparent: true,
          animation: 'fade',
          animationDuration: 300,
          animationMatchesGesture: true,
          gestureEnabled: true,
        };
      }}
    >
      <Stack.Screen name="home" component={HomeScreen} />
      <Stack.Screen name="polygon" component={PolygonScreen} />
      <Stack.Screen name="pixel" component={PixelScreen} />
      <Stack.Screen name="gesture" component={GestureScreen} />
      <Stack.Screen name="shader" component={ShaderScreen} />
      <Stack.Screen name="physics" component={PhysicsScreen} />
      <Stack.Screen name="painting" component={PaintingScreen} />
    </Stack.Navigator>
  );
}
