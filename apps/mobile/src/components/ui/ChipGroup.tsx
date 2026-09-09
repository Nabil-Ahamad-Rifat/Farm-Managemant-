import { View, Text, Pressable } from 'react-native';

export interface ChipOption {
  value: string;
  label: string;
}

// Replaces web's native <select>/filter-pill patterns — used both for
// single-select form fields (status, category, sale type) and for filter
// bars (period, status filter).
export function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View>
      {label ? <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`rounded-xl px-3.5 py-2 ${active ? 'bg-slate-900' : 'border border-slate-200 bg-white'}`}
            >
              <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
