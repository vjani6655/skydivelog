import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="export" />
      <Stack.Screen name="tags" />
      <Stack.Screen name="signoffs" />
      <Stack.Screen name="signoff-new" options={{ gestureEnabled: false }} />
      <Stack.Screen name="signoff-detail" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="notification-detail" />
      <Stack.Screen name="contact" />
    </Stack>
  );
}
