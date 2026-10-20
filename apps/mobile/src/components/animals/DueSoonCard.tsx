import { View, Pressable } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { router } from 'expo-router';
import { BellRing } from 'lucide-react-native';
import type { AnimalDueItem } from '@farm/shared-types';
import { fmtDate } from '@/src/lib/format';
import { dueText, dueTone, eventTypeInfo } from './shared';

/** Overview reminders: vaccines/deworming due, calvings expected and pregnancy checks, soonest first. */
export function DueSoonCard({ items }: { items: AnimalDueItem[] }) {
  if (items.length === 0) return null;
  const overdue = items.filter((i) => i.daysLeft < 0).length;
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className="flex-row items-center gap-3 border-b border-slate-100 p-4">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
          <BellRing size={16} color="#b45309" />
        </View>
        <View>
          <Text className="text-sm font-bold text-slate-900">Due soon</Text>
          <Text className="text-xs text-slate-500">
            {items.length} reminder{items.length === 1 ? '' : 's'}
            {overdue > 0 ? ` · ${overdue} overdue` : ''}
          </Text>
        </View>
      </View>
      {items.slice(0, 8).map((d, i) => {
        const t = eventTypeInfo(d.kind);
        return (
          <Pressable
            key={`${d.cowId}-${d.kind}-${d.dueDate}-${i}`}
            onPress={() => router.push(`/animal/${d.cowId}`)}
            className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}
          >
            <t.Icon size={16} color={t.color} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                {d.tagNumber}
                {d.name !== d.tagNumber ? ` · ${d.name}` : ''}
              </Text>
              <Text className="text-xs text-slate-500">
                {d.title} · {fmtDate(d.dueDate)}
              </Text>
            </View>
            <Text className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${dueTone(d.daysLeft)}`}>{dueText(d.daysLeft)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
