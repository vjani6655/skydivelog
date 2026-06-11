import { Stack } from 'expo-router';

export default function LogLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="favourites" />
      <Stack.Screen name="tags" />
      <Stack.Screen name="qr" />
      <Stack.Screen name="instructor-sign" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
