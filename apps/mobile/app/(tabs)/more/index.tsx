import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Users, Coins, PackageOpen, TrendingUp, ChevronRight } from 'lucide-react-native';

const ITEMS = [
  { href: '/(tabs)/more/employees', label: 'Employees', icon: Users },
  { href: '/(tabs)/more/income', label: 'Other Income', icon: Coins },
  { href: '/(tabs)/more/expenses', label: 'Other Expenses', icon: PackageOpen },
  { href: '/(tabs)/more/revenue', label: 'Revenue Portal', icon: TrendingUp },
] as const;

export default function MoreScreen() {
  return (
    <View className="flex-1 bg-slate-50 p-5">
      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {ITEMS.map(({ href, label, icon: Icon }, i) => (
          <Pressable
            key={href}
            onPress={() => router.push(href)}
            className={`flex-row items-center justify-between px-4 py-4 ${i > 0 ? 'border-t border-slate-100' : ''}`}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <Icon size={16} color="#475569" />
              </View>
              <Text className="text-sm font-semibold text-slate-900">{label}</Text>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
