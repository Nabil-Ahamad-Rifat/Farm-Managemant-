import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

// Phase 4 (this scaffold) wires up navigation + auth for every section but
// leaves the actual CRUD screens as empty states — full parity with the web
// Manager components is Phase 5.
export function ScreenPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-slate-50 px-8">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
        <Icon size={28} color="#059669" />
      </View>
      <Text className="text-lg font-bold text-slate-900">{title}</Text>
      <Text className="text-center text-sm text-slate-500">{description}</Text>
    </View>
  );
}
