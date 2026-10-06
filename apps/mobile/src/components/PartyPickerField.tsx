import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, FlatList } from 'react-native';
import { ChevronDown, Search, UserPlus, X } from 'lucide-react-native';
import { tk } from '@/src/lib/format';

export interface PickerParty {
  id: string;
  name: string;
  phone?: string | null;
  type?: string;
  totalDue?: number;
  lastMilkPrice?: number | null;
}

/** An existing customer/supplier, or a new one to be created with the sale or purchase. */
export type PartyChoice = { kind: 'existing'; id: string; name: string } | { kind: 'new'; name: string } | null;

/** Search-or-add picker for a customer or supplier (mobile version of the web CustomerPicker). */
export function PartyPickerField({
  label,
  noun,
  parties,
  value,
  onChange,
}: {
  label: string;
  noun: 'customer' | 'supplier';
  parties: PickerParty[];
  value: PartyChoice;
  onChange: (v: PartyChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? parties.filter((p) => p.name.toLowerCase().includes(q) || (p.phone ?? '').includes(q)) : parties).slice(0, 30),
    [parties, q],
  );
  const exact = parties.some((p) => p.name.trim().toLowerCase() === q);

  const choose = (v: PartyChoice) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <View>
      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5"
        accessibilityLabel={`Choose ${noun}`}
      >
        <View className="flex-1 flex-row items-center gap-2">
          <Text className={`text-sm ${value ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>{value?.name ?? `Choose ${noun}`}</Text>
          {value?.kind === 'new' ? <Text className="text-[11px] font-semibold text-slate-500">will be added</Text> : null}
        </View>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8} accessibilityLabel={`Clear ${noun}`}>
            <X size={16} color="#94a3b8" />
          </Pressable>
        ) : (
          <ChevronDown size={16} color="#94a3b8" />
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-slate-900/40" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[80%] rounded-t-3xl bg-white p-4" onPress={(e) => e.stopPropagation()}>
            <View className="mb-3 flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search size={16} color="#94a3b8" />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder={`Search ${noun} by name or phone...`}
                placeholderTextColor="#94a3b8"
                className="flex-1 text-sm text-slate-900"
                accessibilityLabel={`Search ${noun}`}
              />
            </View>
            {q && !exact ? (
              <Pressable onPress={() => choose({ kind: 'new', name: query.trim() })} className="mb-1 flex-row items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3">
                <UserPlus size={16} color="#047857" />
                <Text className="text-sm font-semibold text-emerald-700">Add “{query.trim()}” as a new {noun}</Text>
              </Pressable>
            ) : null}
            <FlatList
              data={matches}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => choose({ kind: 'existing', id: item.id, name: item.name })} className="flex-row items-center justify-between rounded-xl px-3 py-3">
                  <Text className="text-sm font-medium text-slate-900">{item.name}</Text>
                  {item.totalDue ? (
                    <Text className="text-xs font-semibold text-red-600">Due {tk(item.totalDue)}</Text>
                  ) : item.phone ? (
                    <Text className="text-xs text-slate-400">{item.phone}</Text>
                  ) : null}
                </Pressable>
              )}
              ListEmptyComponent={q ? null : <Text className="px-3 py-6 text-center text-sm text-slate-400">No {noun}s yet. Type a name to add one.</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
