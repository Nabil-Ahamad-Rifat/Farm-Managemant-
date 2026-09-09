import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
          {label}
        </Text>
        <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1a` }}>
          <Icon size={16} color={color} />
        </View>
      </View>
      <Text className="mt-2 text-xl font-extrabold text-slate-900">{value}</Text>
      {subtext ? <Text className="mt-0.5 text-[11px] text-slate-500">{subtext}</Text> : null}
    </View>
  );
}
