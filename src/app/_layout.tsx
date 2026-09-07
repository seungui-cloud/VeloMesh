import { registerGlobals } from '@livekit/react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

registerGlobals();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'VeloMesh' }} />
        <Stack.Screen name="create" options={{ title: '그룹 만들기' }} />
        <Stack.Screen name="join" options={{ title: '초대 코드로 참가' }} />
        <Stack.Screen name="packs" options={{ title: 'Pack 선택' }} />
        <Stack.Screen name="room" options={{ title: 'Pack Voice', headerBackTitle: '나가기' }} />
        <Stack.Screen name="di2" options={{ title: 'Di2 Phone Bell' }} />
      </Stack>
    </ThemeProvider>
  );
}
