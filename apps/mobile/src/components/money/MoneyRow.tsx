import { View } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { ApiError } from '@farm/api-client';
import { tk } from '@/src/lib/format';

/** ৳1,200 or − ৳1,200 for a loss. */
export const signed = (n: number) => (n < 0 ? '− ' + tk(-n) : tk(n));

/** A cost shown as a deduction: − ৳1,200. */
export const minus = (n: number) => '− ' + tk(n);

/** One label/amount line in a money card (same wording as the web Revenue Portal). */
export function MoneyRow({ label, value, hint, strong, first }: { label: string; value: string; hint?: string; strong?: boolean; first?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between gap-3 py-2.5 ${first ? '' : 'border-t border-slate-100'}`}>
      <View className="min-w-0 flex-1">
        <Text className={`text-sm ${strong ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{label}</Text>
        {hint ? <Text className="text-[11px] text-slate-400">{hint}</Text> : null}
      </View>
      <Text className={`text-sm text-slate-900 ${strong ? 'font-extrabold' : 'font-semibold'}`}>{value}</Text>
    </View>
  );
}

/** Money reports are owner-only on the server; say so plainly instead of the raw error. */
export function moneyError(err: unknown) {
  if (err instanceof ApiError && err.status === 403) return 'Only the farm owner can see money reports.';
  return (err as Error).message;
}
