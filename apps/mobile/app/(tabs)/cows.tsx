import { useCallback, useRef, useState } from 'react';
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/src/components/ui/Text';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Search, Syringe, Baby } from 'lucide-react-native';
import type { CowListItem } from '@farm/shared-types';
import { ageLabel } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { fmtDate } from '@/src/lib/format';
import { useCrudList } from '@/src/hooks/useCrudList';
import { ChipGroup, EmptyState } from '@/src/components/ui';
import { AnimalPhoto, PregnancyBadge, StatusBadge, categoryLabel, daysUntil, dueText } from '@/src/components/animals/shared';
import { AnimalFormModal } from '@/src/components/animals/AnimalFormModal';

const STATUS_FILTERS = [
  { value: 'active', label: 'In herd' },
  { value: 'sold', label: 'Sold' },
  { value: 'dead', label: 'Dead' },
  { value: 'all', label: 'All' },
];

export default function CowsScreen() {
  const { items: cows, loading, refreshing, refresh, reload, error: loadError } = useCrudList<CowListItem>('/api/cows');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [adding, setAdding] = useState(false);
  const [suggestedId, setSuggestedId] = useState('');

  // Coming back from an animal's page may have changed it.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else reload();
    }, [reload])
  );

  async function openCreate() {
    const next = await mobileApiClient.get<{ tagNumber: string }>('/api/cows/next-id').catch(() => null);
    setSuggestedId(next?.tagNumber ?? '');
    setAdding(true);
  }

  const mothers = cows.filter((c) => c.gender !== 'male' && c.status === 'active');
  const q = search.trim().toLowerCase();
  const filtered = cows.filter((cow) => {
    const matchesSearch =
      !q || cow.tagNumber.toLowerCase().includes(q) || cow.name.toLowerCase().includes(q) || (cow.breed?.toLowerCase().includes(q) ?? false);
    // Old "sick" records are still in the herd.
    const status = cow.status === 'sick' ? 'active' : cow.status;
    return matchesSearch && (statusFilter === 'all' || status === statusFilter);
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="gap-3 border-b border-slate-100 bg-white p-4">
        <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by Cow ID, name or breed..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm text-slate-900"
          />
        </View>
        <ChipGroup options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
      </View>

      {loadError ? (
        <View className="mx-4 mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
          <Text className="text-xs font-medium text-red-700">{loadError}</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4 pb-24"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<EmptyState message={cows.length ? 'No animals match.' : 'No animals yet. Add your first one with a photo.'} />}
        renderItem={({ item }) => {
          const s = item.summary;
          const nextDose = s?.dueDoses[0];
          const facts = [categoryLabel(item.category), item.breed, item.birthDate ? ageLabel(item.birthDate) : null].filter(Boolean).join(' · ');
          return (
            <Pressable
              onPress={() => router.push(`/animal/${item.id}`)}
              className="flex-row gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3"
            >
              <AnimalPhoto url={item.photoUrl} style={{ width: 84, height: 84, borderRadius: 12 }} />
              <View className="flex-1 gap-1">
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <View className="rounded-md bg-slate-900 px-1.5 py-0.5">
                    <Text className="font-mono text-xs font-bold text-white">{item.tagNumber}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                  {item.gender !== 'male' && s ? <PregnancyBadge status={s.pregnancy} /> : null}
                </View>
                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                  {item.name}
                </Text>
                {facts ? <Text className="text-xs text-slate-500" numberOfLines={1}>{facts}</Text> : null}
                {s?.expectedCalving ? (
                  <View className="flex-row items-center gap-1">
                    <Baby size={12} color="#047857" />
                    <Text className="text-[11px] text-slate-600">
                      Calving {fmtDate(s.expectedCalving)} · {dueText(daysUntil(s.expectedCalving))}
                    </Text>
                  </View>
                ) : null}
                {nextDose ? (
                  <View className="flex-row items-center gap-1">
                    <Syringe size={12} color="#0369a1" />
                    <Text className="text-[11px] text-slate-600">
                      {nextDose.title} · {dueText(daysUntil(nextDose.dueDate))}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={openCreate}
        className="absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-emerald-800 px-5 py-3.5 shadow-lg"
      >
        <Plus size={18} color="white" />
        <Text className="font-semibold text-white">Add animal</Text>
      </Pressable>

      <AnimalFormModal
        visible={adding}
        suggestedId={suggestedId}
        mothers={mothers}
        onClose={() => setAdding(false)}
        onSaved={(saved) => {
          setAdding(false);
          router.push(`/animal/${saved.id}`);
        }}
      />
    </View>
  );
}
