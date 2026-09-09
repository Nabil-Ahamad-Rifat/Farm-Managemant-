import { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

// A tappable field that opens a full list picker — used where the option
// count is too large for a ChipGroup to read comfortably (e.g. picking a
// cow to link a sale to).
export function SelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5"
      >
        <Text className={`text-sm ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color="#94a3b8" />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-slate-900/40" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-3xl bg-white p-4" onPress={(e) => e.stopPropagation()}>
            <Text className="mb-2 px-2 text-sm font-bold text-slate-900">{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between rounded-xl px-3 py-3"
                >
                  <View>
                    <Text className="text-sm font-medium text-slate-900">{item.label}</Text>
                    {item.sublabel ? <Text className="text-xs text-slate-400">{item.sublabel}</Text> : null}
                  </View>
                  {item.value === value ? <Check size={16} color="#059669" /> : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text className="px-3 py-6 text-center text-sm text-slate-400">No options available</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
