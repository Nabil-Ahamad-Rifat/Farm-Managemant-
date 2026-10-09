import { View, Text, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { Users, Coins, PackageOpen, TrendingUp, Sprout, FileText, Trash2, ChevronRight } from 'lucide-react-native';
import { API_URL } from '@/src/lib/apiClient';

const ITEMS = [
  { href: '/(tabs)/more/employees', label: 'Employees', icon: Users },
  { href: '/(tabs)/more/income', label: 'Other Income', icon: Coins },
  { href: '/(tabs)/more/expenses', label: 'Other Expenses', icon: PackageOpen },
  { href: '/(tabs)/more/revenue', label: 'Revenue Portal', icon: TrendingUp },
  { href: '/(tabs)/more/ranch', label: 'Create New Ranch', icon: Sprout },
] as const;

export default function MoreScreen() {
  return (
    <View className="flex-1 bg-slate-50 p-5 gap-5">
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

      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Pressable
          onPress={() => Linking.openURL(`${API_URL}/privacy`)}
          className="flex-row items-center justify-between px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <FileText size={16} color="#475569" />
            </View>
            <Text className="text-sm font-semibold text-slate-900">Privacy Policy</Text>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </Pressable>
        <Pressable
          onPress={() => router.push('/(tabs)/more/delete-account')}
          className="flex-row items-center justify-between border-t border-slate-100 px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <Trash2 size={16} color="#dc2626" />
            </View>
            <Text className="text-sm font-semibold text-red-600">Delete Account</Text>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </Pressable>
      </View>
    </View>
  );
}
