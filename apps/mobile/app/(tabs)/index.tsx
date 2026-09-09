import { View, Text, ScrollView, Pressable } from 'react-native';
import { LogOut, BadgeCheck, Users, Wheat, DollarSign } from 'lucide-react-native';
import { useSession } from '@/src/context/AuthContext';

const CARDS = [
  { label: 'Herd (Cows)', icon: BadgeCheck, color: '#2563eb' },
  { label: 'Employees', icon: Users, color: '#4f46e5' },
  { label: 'Feed Stock', icon: Wheat, color: '#d97706' },
  { label: 'Revenue', icon: DollarSign, color: '#059669' },
];

export default function OverviewScreen() {
  const { user, signOut } = useSession();

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-5 gap-5">
      <View className="rounded-2xl border border-slate-200 bg-white p-5">
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">Signed in as</Text>
        <Text className="mt-1 text-lg font-bold text-slate-900">{user?.name}</Text>
        <Text className="text-xs text-slate-500">{user?.email}</Text>
        <Pressable
          onPress={signOut}
          className="mt-4 flex-row items-center gap-2 self-start rounded-xl border border-red-200 bg-red-50 px-3 py-2"
        >
          <LogOut size={14} color="#dc2626" />
          <Text className="text-xs font-semibold text-red-600">Sign out</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-4">
        {CARDS.map(({ label, icon: Icon, color }) => (
          <View key={label} className="min-w-[45%] flex-1 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1a` }}>
              <Icon size={18} color={color} />
            </View>
            <Text className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</Text>
            <Text className="mt-1 text-2xl font-extrabold text-slate-900">—</Text>
          </View>
        ))}
      </View>

      <View className="rounded-2xl border border-slate-200 bg-white p-5">
        <Text className="text-sm text-slate-500">
          Live stats, recent sales, and the 30-day revenue trend come to this screen in Phase 5 of the mobile rollout.
        </Text>
      </View>
    </ScrollView>
  );
}
