import { registerGlobals } from '@livekit/react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

registerGlobals();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'VeloMesh' }} />
        <Stack.Screen name="room" options={{ title: 'Pack Voice', headerBackTitle: '나가기' }} />
      </Stack>
    </ThemeProvider>
  );
}
