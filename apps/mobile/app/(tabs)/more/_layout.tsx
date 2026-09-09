import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="index" options={{ title: 'More' }} />
      <Stack.Screen name="employees" options={{ title: 'Employees' }} />
      <Stack.Screen name="income" options={{ title: 'Other Income' }} />
      <Stack.Screen name="expenses" options={{ title: 'Other Expenses' }} />
      <Stack.Screen name="revenue" options={{ title: 'Revenue Portal' }} />
    </Stack>
  );
}
