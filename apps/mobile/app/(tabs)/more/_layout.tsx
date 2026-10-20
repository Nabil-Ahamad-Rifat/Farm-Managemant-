import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="index" options={{ title: 'More' }} />
      <Stack.Screen name="customers" options={{ title: 'Customers & Dues' }} />
      <Stack.Screen name="customer/[id]" options={{ title: 'Customer' }} />
      <Stack.Screen name="suppliers" options={{ title: 'Suppliers & Payables' }} />
      <Stack.Screen name="supplier/[id]" options={{ title: 'Supplier' }} />
      <Stack.Screen name="report" options={{ title: 'Monthly Report' }} />
      <Stack.Screen name="milk-price" options={{ title: 'Default Milk Price' }} />
      <Stack.Screen name="employees" options={{ title: 'Employees' }} />
      <Stack.Screen name="income" options={{ title: 'Other Income' }} />
      <Stack.Screen name="expenses" options={{ title: 'Other Expenses' }} />
      <Stack.Screen name="revenue" options={{ title: 'Revenue Portal' }} />
      <Stack.Screen name="history" options={{ title: 'History' }} />
      <Stack.Screen name="ranch" options={{ title: 'New Ranch' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete Account' }} />
    </Stack>
  );
}
