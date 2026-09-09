import { Tabs } from 'expo-router';
import { LayoutDashboard, DollarSign, BadgeCheck, Wheat, MoreHorizontal } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#059669', headerTitleStyle: { fontWeight: '700' } }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="sales"
        options={{ title: 'Sales', tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="cows"
        options={{ title: 'Cows', tabBarIcon: ({ color, size }) => <BadgeCheck color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="feed"
        options={{ title: 'Feed', tabBarIcon: ({ color, size }) => <Wheat color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'More', headerShown: false, tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} /> }}
      />
    </Tabs>
  );
}
