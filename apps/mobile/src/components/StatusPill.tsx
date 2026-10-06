import { View, Text } from 'react-native';
import { CheckCircle, Clock, CircleDashed } from 'lucide-react-native';
import { tk } from '@/src/lib/format';

const STYLES = {
  paid: { box: 'bg-emerald-50', text: 'text-emerald-700', color: '#047857', label: 'Paid', Icon: CheckCircle },
  partial: { box: 'bg-amber-50', text: 'text-amber-700', color: '#b45309', label: 'Partial', Icon: CircleDashed },
  pending: { box: 'bg-red-50', text: 'text-red-700', color: '#b91c1c', label: 'Due', Icon: Clock },
} as const;

/** Paid / Partial / Due pill for a sale or feed purchase. */
export function StatusPill({ status }: { status: string }) {
  const s = STYLES[status as keyof typeof STYLES] ?? STYLES.pending;
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-2 py-0.5 ${s.box}`}>
      <s.Icon size={9} color={s.color} />
      <Text className={`text-[10px] font-semibold uppercase ${s.text}`}>{s.label}</Text>
    </View>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const regular = type === 'regular';
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${regular ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
      <Text className={`text-[10px] font-semibold ${regular ? 'text-emerald-700' : 'text-indigo-700'}`}>{regular ? 'Regular' : 'New'}</Text>
    </View>
  );
}

/** A balance: due in red, advance in green, otherwise "Clear". */
export function BalanceText({ value, size = 'text-sm' }: { value: number; size?: string }) {
  if (value > 0) return <Text className={`${size} font-bold text-red-600`}>{tk(value)}</Text>;
  if (value < 0) return <Text className={`${size} font-semibold text-emerald-700`}>Advance {tk(-value)}</Text>;
  return <Text className={`${size} font-semibold text-slate-400`}>Clear</Text>;
}
