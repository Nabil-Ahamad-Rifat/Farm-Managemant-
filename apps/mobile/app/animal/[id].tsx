import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View, ScrollView, Pressable, RefreshControl, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Edit3, Trash2, Plus, Star, ImagePlus, Camera, HeartPulse, Baby, Syringe, Wallet, CalendarClock, StickyNote, type LucideIcon } from 'lucide-react-native';
import type { AnimalDetail, AnimalEvent, CowListItem } from '@farm/shared-types';
import { ageLabel } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { generateIdempotencyKey } from '@/src/lib/idempotency';
import { fmtDate, tk } from '@/src/lib/format';
import { useConfirm } from '@/src/components/ui';
import {
  AnimalPhoto, PregnancyBadge, StatusBadge, categoryLabel, daysUntil, dueText, dueTone, eventTypeInfo, photoBody, pickPhoto,
} from '@/src/components/animals/shared';
import { AnimalFormModal } from '@/src/components/animals/AnimalFormModal';
import { EventFormModal } from '@/src/components/animals/EventFormModal';

const PREGNANCY_TEXT: Record<string, string> = {
  pregnant: 'Pregnant',
  inseminated: 'AI done, not checked yet',
  open: 'Not pregnant',
  unknown: 'No breeding records',
};

/** One line describing a history record, e.g. "Result: pregnant" or "320 kg". */
function eventDetail(e: AnimalEvent) {
  const parts: string[] = [];
  if (e.type === 'weight' && e.value != null) parts.push(`${e.value.toLocaleString()} kg`);
  if (e.type === 'pregnancy_check' && e.result) parts.push(e.result === 'positive' ? 'Result: pregnant' : 'Result: not pregnant');
  if (e.title) parts.push(e.title);
  return parts.join(' · ');
}

type ModalState = { kind: 'edit' } | { kind: 'event'; event: AnimalEvent | null } | null;

export default function AnimalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const confirm = useConfirm();
  const { width } = useWindowDimensions();
  const [animal, setAnimal] = useState<AnimalDetail | null>(null);
  const [mothers, setMothers] = useState<CowListItem[]>([]);
  const [suggestedId, setSuggestedId] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, all, next] = await Promise.all([
        mobileApiClient.get<AnimalDetail>(`/api/cows/${id}`, 'Failed to load animal'),
        mobileApiClient.get<CowListItem[]>('/api/cows').catch(() => [] as CowListItem[]),
        mobileApiClient.get<{ tagNumber: string }>('/api/cows/next-id').catch(() => null),
      ]);
      setAnimal(a);
      setMothers(all.filter((c) => c.gender !== 'male' && c.status === 'active'));
      setSuggestedId(next?.tagNumber ?? '');
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    // State is only set once the requests settle, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!animal) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        {error ? <Text className="text-center text-sm text-red-600">{error}</Text> : <ActivityIndicator />}
      </View>
    );
  }

  const s = animal.summary;
  const isFemale = animal.gender !== 'male';
  const selected = animal.photos.find((p) => p.id === selectedPhotoId) ?? animal.photos[0];
  const nextDose = s.dueDoses[0];

  async function addPhoto(from: 'camera' | 'library') {
    setError('');
    setPhotoBusy(true);
    try {
      const photo = await pickPhoto(from);
      if (!photo) return;
      const added = await mobileApiClient.post<{ id: string }>(`/api/cows/${animal!.id}/photos`, photoBody(photo), 'Failed to add photo', {
        idempotencyKey: generateIdempotencyKey(),
      });
      setSelectedPhotoId(added.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function makeMain(photoId: string) {
    try {
      await mobileApiClient.put(`/api/cows/${animal!.id}/photos/${photoId}/main`, {}, 'Failed to update photo');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deletePhoto(photoId: string) {
    if (!(await confirm('Delete this photo?'))) return;
    try {
      await mobileApiClient.delete(`/api/cows/${animal!.id}/photos/${photoId}`, 'Failed to delete photo');
      setSelectedPhotoId(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteEvent(e: AnimalEvent) {
    const label = eventTypeInfo(e.type).label.toLowerCase();
    if (!(await confirm(`Delete the ${label} record from ${fmtDate(e.date)}?${e.calfId ? ' The calf stays as its own animal.' : ''}`))) return;
    try {
      await mobileApiClient.delete(`/api/animal-events/${e.id}`, 'Failed to delete record');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteAnimal() {
    if (!(await confirm(`Delete ${animal!.tagNumber} (${animal!.name}) with all its photos and records? This cannot be undone.`))) return;
    try {
      await mobileApiClient.delete(`/api/cows/${animal!.id}`, 'Failed to delete animal');
      router.back();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const facts: [string, ReactNode][] = [
    ['Gender', animal.gender === 'male' ? 'Male' : animal.gender === 'female' ? 'Female' : null],
    ['Type', categoryLabel(animal.category)],
    ['Breed', animal.breed],
    ['Colour', animal.color],
    ['Born', animal.birthDate ? `${fmtDate(animal.birthDate)} (${ageLabel(animal.birthDate)})` : null],
    [
      'From',
      animal.source === 'born'
        ? 'Born on farm'
        : animal.source === 'purchased'
          ? ['Bought', animal.purchaseDate ? fmtDate(animal.purchaseDate) : null, animal.purchasePrice != null ? `for ${tk(animal.purchasePrice)}` : null].filter(Boolean).join(' ')
          : null,
    ],
    [
      'Mother',
      animal.mother ? (
        <Text className="font-semibold text-emerald-700" onPress={() => router.push(`/animal/${animal.mother!.id}`)}>
          {animal.mother.tagNumber}
          {animal.mother.name !== animal.mother.tagNumber ? ` · ${animal.mother.name}` : ''}
        </Text>
      ) : null,
    ],
  ];

  return (
    <>
      <Stack.Screen options={{ title: animal.tagNumber }} />
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerClassName="gap-4 p-4 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View className="rounded-xl border border-red-100 bg-red-50 p-3">
            <Text className="text-xs font-medium text-red-700">{error}</Text>
          </View>
        ) : null}

        {/* Photos */}
        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <AnimalPhoto url={selected?.url ?? animal.photoUrl} style={{ width: '100%', height: Math.min(width - 56, 420) * 0.75, borderRadius: 12 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {animal.photos.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => setSelectedPhotoId(p.id)}
                className={`overflow-hidden rounded-lg border-2 ${p.id === selected?.id ? 'border-slate-900' : 'border-transparent'}`}
              >
                <AnimalPhoto url={p.url} style={{ width: 56, height: 56 }} />
                {i === 0 ? (
                  <View className="absolute right-0.5 top-0.5">
                    <Star size={12} color="#f59e0b" fill="#fbbf24" />
                  </View>
                ) : null}
              </Pressable>
            ))}
            <Pressable onPress={() => addPhoto('library')} disabled={photoBusy} className="h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300">
              {photoBusy ? <ActivityIndicator /> : <ImagePlus size={18} color="#64748b" />}
            </Pressable>
            <Pressable onPress={() => addPhoto('camera')} disabled={photoBusy} className="h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300">
              <Camera size={18} color="#64748b" />
            </Pressable>
          </ScrollView>
          {selected && animal.photos.length > 1 ? (
            <View className="flex-row gap-2">
              {selected.id !== animal.photos[0].id ? (
                <Pressable onPress={() => makeMain(selected.id)} className="flex-row items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5">
                  <Star size={13} color="#334155" />
                  <Text className="text-xs font-semibold text-slate-700">Make main photo</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => deletePhoto(selected.id)} className="flex-row items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5">
                <Trash2 size={13} color="#dc2626" />
                <Text className="text-xs font-semibold text-red-600">Delete photo</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Details */}
        <View className="gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-1.5">
                <View className="rounded-md bg-slate-900 px-2 py-0.5">
                  <Text className="font-mono text-sm font-bold text-white">{animal.tagNumber}</Text>
                </View>
                <StatusBadge status={animal.status} />
                {isFemale ? <PregnancyBadge status={s.pregnancy} /> : null}
              </View>
              <Text className="mt-2 text-xl font-bold text-slate-900">{animal.name}</Text>
              <Text className="text-xs text-slate-500">Added {fmtDate(animal.createdAt)}</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable onPress={() => setModal({ kind: 'edit' })} className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200">
                <Edit3 size={16} color="#334155" />
              </Pressable>
              <Pressable onPress={deleteAnimal} className="h-10 w-10 items-center justify-center rounded-xl border border-red-200">
                <Trash2 size={16} color="#dc2626" />
              </Pressable>
            </View>
          </View>

          <View className="gap-1.5">
            {facts
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <View key={k} className="flex-row gap-2">
                  <Text className="w-20 text-sm text-slate-500">{k}</Text>
                  {typeof v === 'string' ? <Text className="flex-1 text-sm font-medium text-slate-900">{v}</Text> : v}
                </View>
              ))}
          </View>

          {animal.notes ? (
            <View className="flex-row items-start gap-1.5 rounded-xl bg-slate-50 px-3 py-2">
              <StickyNote size={14} color="#94a3b8" />
              <Text className="flex-1 text-sm text-slate-700">{animal.notes}</Text>
            </View>
          ) : null}

          <View className="flex-row flex-wrap gap-2">
            {isFemale ? (
              <SummaryTile Icon={HeartPulse} label="Breeding">
                <Text className="text-sm font-bold text-slate-900">{PREGNANCY_TEXT[s.pregnancy]}</Text>
                {s.lastInsemination ? <Text className="text-[11px] text-slate-500">Last AI {fmtDate(s.lastInsemination.date)}</Text> : null}
                {s.pregnancyCheckDue ? <Text className="text-[11px] text-slate-500">Check due {fmtDate(s.pregnancyCheckDue)}</Text> : null}
              </SummaryTile>
            ) : null}
            {isFemale ? (
              <SummaryTile Icon={Baby} label="Expected calving">
                {s.expectedCalving ? (
                  <>
                    <Text className="text-sm font-bold text-slate-900">{fmtDate(s.expectedCalving)}</Text>
                    <Text className="text-[11px] text-slate-500">{dueText(daysUntil(s.expectedCalving))}</Text>
                  </>
                ) : (
                  <Text className="text-sm text-slate-500">{s.lastCalving ? `Last calved ${fmtDate(s.lastCalving)}` : '—'}</Text>
                )}
              </SummaryTile>
            ) : null}
            <SummaryTile Icon={Syringe} label="Next dose">
              {nextDose ? (
                <>
                  <Text className="text-sm font-bold text-slate-900">{nextDose.title}</Text>
                  <Text className={`mt-0.5 self-start rounded-full border px-2 py-0.5 text-[10px] font-bold ${dueTone(daysUntil(nextDose.dueDate))}`}>
                    {fmtDate(nextDose.dueDate)} · {dueText(daysUntil(nextDose.dueDate))}
                  </Text>
                </>
              ) : (
                <Text className="text-sm text-slate-500">{s.lastVaccine ? `Last: ${s.lastVaccine.title}, ${fmtDate(s.lastVaccine.date)}` : 'No vaccines recorded'}</Text>
              )}
            </SummaryTile>
            <SummaryTile Icon={Wallet} label="Care cost (all records)">
              <Text className="text-sm font-bold text-slate-900">{tk(s.careCost)}</Text>
            </SummaryTile>
          </View>
        </View>

        {animal.calves.length > 0 ? (
          <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-base font-bold text-slate-900">Calves</Text>
            {animal.calves.map((c) => (
              <Pressable key={c.id} onPress={() => router.push(`/animal/${c.id}`)} className="flex-row items-center gap-3 rounded-xl border border-slate-200 p-2">
                <AnimalPhoto url={c.photoUrl} style={{ width: 48, height: 48, borderRadius: 8 }} />
                <View className="flex-1">
                  <Text className="font-mono text-sm font-bold text-slate-900">{c.tagNumber}</Text>
                  <Text className="text-xs text-slate-500">
                    {[c.name !== c.tagNumber ? c.name : null, c.gender === 'male' ? 'Male' : 'Female', c.birthDate ? `born ${fmtDate(c.birthDate)}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* History */}
        <View className="rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">History</Text>
              <Text className="text-xs text-slate-500">Vaccines, AI, pregnancy checks, calvings, treatments and more</Text>
            </View>
            <Pressable onPress={() => setModal({ kind: 'event', event: null })} className="flex-row items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2.5">
              <Plus size={14} color="white" />
              <Text className="text-xs font-semibold text-white">Add record</Text>
            </Pressable>
          </View>
          {animal.events.length === 0 ? (
            <Text className="py-6 text-center text-sm text-slate-500">No records yet. Add vaccines, AI and other events to get reminders.</Text>
          ) : (
            animal.events.map((e) => {
              const t = eventTypeInfo(e.type);
              const detail = eventDetail(e);
              return (
                <View key={e.id} className="flex-row gap-3 border-b border-slate-50 py-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200">
                    <t.Icon size={16} color={t.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-900">
                      {t.label} <Text className="text-xs font-normal text-slate-500">{fmtDate(e.date)}</Text>
                    </Text>
                    {detail ? <Text className="text-sm text-slate-700">{detail}</Text> : null}
                    <View className="flex-row flex-wrap gap-x-3">
                      {e.nextDueDate ? (
                        <View className="flex-row items-center gap-1">
                          <CalendarClock size={11} color="#64748b" />
                          <Text className="text-xs text-slate-500">Next due {fmtDate(e.nextDueDate)}</Text>
                        </View>
                      ) : null}
                      {e.cost != null && e.cost > 0 ? <Text className="text-xs text-slate-500">Cost {tk(e.cost)}</Text> : null}
                      {e.calfId ? (
                        <Text className="text-xs font-semibold text-emerald-700" onPress={() => router.push(`/animal/${e.calfId}`)}>
                          View calf →
                        </Text>
                      ) : null}
                    </View>
                    {e.notes ? <Text className="mt-0.5 text-xs italic text-slate-500">{e.notes}</Text> : null}
                  </View>
                  <View className="flex-row gap-1">
                    <Pressable onPress={() => setModal({ kind: 'event', event: e })} className="h-9 w-9 items-center justify-center rounded-lg">
                      <Edit3 size={15} color="#94a3b8" />
                    </Pressable>
                    <Pressable onPress={() => deleteEvent(e)} className="h-9 w-9 items-center justify-center rounded-lg">
                      <Trash2 size={15} color="#94a3b8" />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <AnimalFormModal
        visible={modal?.kind === 'edit'}
        animal={animal}
        mothers={mothers}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          load();
        }}
      />
      <EventFormModal
        visible={modal?.kind === 'event'}
        cowId={animal.id}
        isFemale={isFemale}
        event={modal?.kind === 'event' ? modal.event : null}
        suggestedCalfId={suggestedId}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          load();
        }}
      />
    </>
  );
}

function SummaryTile({ Icon, label, children }: { Icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <View className="min-w-[45%] flex-1 gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <View className="flex-row items-center gap-1.5">
        <Icon size={13} color="#64748b" />
        <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</Text>
      </View>
      {children}
    </View>
  );
}
