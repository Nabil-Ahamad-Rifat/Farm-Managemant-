import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Linking } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  Wallet, CalendarX, Hammer, Edit3, LogOut, Undo2, Trash2, Phone, CalendarDays, Ban, TrendingUp, type LucideIcon,
} from 'lucide-react-native';
import type { SalaryPayment, WorkerDetail } from '@farm/shared-types';
import { dayRate } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { tk, fmtDate, monthLabel } from '@/src/lib/format';
import { IconButton, useConfirm } from '@/src/components/ui';
import { AbsenceModal, LeaveModal, WorkModal, WorkerFormModal, WorkerPaymentModal } from '@/src/components/workers/WorkerModals';
import { balanceInfo, payLabel } from '@/src/components/workers/shared';

type WorkRow = WorkerDetail['work'][number];
type ModalState =
  | { kind: 'pay'; payment: SalaryPayment | null }
  | { kind: 'absent' }
  | { kind: 'work'; entry: WorkRow | null }
  | { kind: 'edit' }
  | { kind: 'leave' }
  | null;

/** One line in the history: payments, write-offs, absences, work and pay changes, newest first. */
type HistoryRow = {
  key: string;
  date: string | Date;
  Icon: LucideIcon;
  color: string;
  title: string;
  detail?: string | null;
  amount?: { text: string; cls: string };
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function WorkerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const confirm = useConfirm();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setWorker(await mobileApiClient.get<WorkerDetail>(`/api/employees/${id}`, 'Failed to load worker'));
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    // load() only sets state after its request settles, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const done = () => {
    setModal(null);
    load();
  };

  /** Run an action after a confirm; `label` names the confirm button (defaults to "Delete"). */
  async function act(fn: () => Promise<unknown>, confirmText: string, label?: string) {
    if (!(await confirm(confirmText, label))) return;
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!worker) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Stack.Screen options={{ title: 'Worker' }} />
        {error ? <Text className="text-sm text-red-700">{error}</Text> : <ActivityIndicator />}
      </View>
    );
  }

  const w = worker;
  const daily = w.payType === 'daily';
  const left = w.status === 'left';
  const a = w.account;
  const bal = balanceInfo(a.balance);

  const deleteWorker = () =>
    act(async () => {
      await mobileApiClient.delete(`/api/employees/${w.id}`, 'Failed to delete worker');
      router.back();
    }, `Delete ${w.name}? This cannot be undone.`);

  const history: HistoryRow[] = [
    ...w.payments.map((p): HistoryRow =>
      p.kind === 'writeoff'
        ? {
            key: 'p' + p.id,
            date: p.paidAt,
            Icon: Ban,
            color: '#475569',
            title: 'Advance written off',
            detail: p.note === 'Advance written off' ? null : p.note,
            amount: { text: tk(p.amount), cls: 'text-slate-600' },
            onDelete: () => act(() => mobileApiClient.delete(`/api/salary-payments/${p.id}`), 'Undo this write-off? The advance will show as owed again.', 'Undo write-off'),
          }
        : {
            key: 'p' + p.id,
            date: p.paidAt,
            Icon: Wallet,
            color: '#047857',
            title: 'Paid',
            detail: p.note,
            amount: { text: '− ' + tk(p.amount), cls: 'text-emerald-700' },
            onEdit: () => setModal({ kind: 'pay', payment: p }),
            onDelete: () => act(() => mobileApiClient.delete(`/api/salary-payments/${p.id}`), `Delete the ${tk(p.amount)} payment from ${fmtDate(p.paidAt)}?`),
          },
    ),
    ...w.absences.map((x): HistoryRow => ({
      key: 'a' + x.id,
      date: x.date,
      Icon: CalendarX,
      color: '#dc2626',
      title: 'Absent (unpaid)',
      detail: x.note,
      amount: { text: '− ' + tk(dayRate(w.salary)), cls: 'text-red-600' },
      onDelete: () => act(() => mobileApiClient.delete(`/api/employee-absences/${x.id}`), `Remove the absence on ${fmtDate(x.date)}? That day will be paid.`, 'Remove absence'),
    })),
    ...w.work.map((e): HistoryRow => ({
      key: 'w' + e.id,
      date: e.date,
      Icon: Hammer,
      color: '#0369a1',
      title: `Worked ${e.days === 0.5 ? 'half a day' : `${e.days} day${e.days === 1 ? '' : 's'}`} × ${tk(e.rate)}`,
      detail: e.note,
      amount: { text: '+ ' + tk(e.days * e.rate), cls: 'text-slate-900' },
      onEdit: () => setModal({ kind: 'work', entry: e }),
      onDelete: () => act(() => mobileApiClient.delete(`/api/work-entries/${e.id}`), `Delete this work from ${fmtDate(e.date)}?`),
    })),
    ...w.rates.map((r, i): HistoryRow => ({
      key: 'r' + r.id,
      date: r.from,
      Icon: i === w.rates.length - 1 ? CalendarDays : TrendingUp,
      color: '#6d28d9',
      title: i === w.rates.length - 1 ? 'Started work' : 'Pay changed',
      detail: r.monthlySalary != null ? `Monthly ${tk(r.monthlySalary)} (${tk(dayRate(r.monthlySalary))}/day)` : `Day rate ${tk(r.dailyRate ?? 0)}`,
    })),
    ...(w.leftDate ? [{ key: 'left', date: w.leftDate, Icon: LogOut, color: '#475569', title: 'Left work' } as HistoryRow] : []),
  ].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());

  const btn = 'flex-row items-center justify-center gap-1.5 rounded-xl px-4 py-2.5';

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ title: w.name }} />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {error ? (
          <View className="rounded-xl border border-red-100 bg-red-50 p-3">
            <Text className="text-xs font-medium text-red-700">{error}</Text>
          </View>
        ) : null}

        {/* Who and what */}
        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-start gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
              <Text className="text-lg font-bold text-white">{w.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-lg font-bold text-slate-900">{w.name}</Text>
                <Text
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    left ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {left ? 'Left' : 'Working'}
                </Text>
              </View>
              <Text className="text-xs text-slate-500">
                {w.role ? `${w.role} · ` : ''}
                {payLabel(w)}
              </Text>
              <Text className="mt-1 text-xs text-slate-600">
                Started {w.joinDate ? fmtDate(w.joinDate) : '—'}
                {w.leftDate ? ` · Left ${fmtDate(w.leftDate)}` : ''}
              </Text>
              {w.phone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${w.phone}`)} className="mt-1 flex-row items-center gap-1 self-start">
                  <Phone size={12} color="#475569" />
                  <Text className="text-xs text-slate-600">{w.phone}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Pressable onPress={() => setModal({ kind: 'pay', payment: null })} className={`${btn} flex-1 bg-emerald-700`}>
              <Wallet size={16} color="white" />
              <Text className="text-sm font-semibold text-white">Pay money</Text>
            </Pressable>
            {!left ? (
              daily ? (
                <Pressable onPress={() => setModal({ kind: 'work', entry: null })} className={`${btn} flex-1 bg-slate-900`}>
                  <Hammer size={16} color="white" />
                  <Text className="text-sm font-semibold text-white">Add work</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setModal({ kind: 'absent' })} className={`${btn} flex-1 border border-slate-200 bg-white`}>
                  <CalendarX size={16} color="#334155" />
                  <Text className="text-sm font-semibold text-slate-700">Mark absent</Text>
                </Pressable>
              )
            ) : null}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Pressable onPress={() => setModal({ kind: 'edit' })} className={`${btn} border border-slate-200 bg-white`}>
              <Edit3 size={16} color="#334155" />
              <Text className="text-sm font-semibold text-slate-700">Edit</Text>
            </Pressable>
            {left ? (
              <Pressable
                disabled={busy}
                onPress={() =>
                  act(
                    () => mobileApiClient.post(`/api/employees/${w.id}/leave`, { leftDate: '' }, 'Failed to save'),
                    `Mark ${w.name} as working again? The days since they left will be paid too; mark them absent if they did not work.`,
                    'Yes, working again',
                  )
                }
                className={`${btn} border border-slate-200 bg-white`}
              >
                <Undo2 size={16} color="#334155" />
                <Text className="text-sm font-semibold text-slate-700">Came back</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setModal({ kind: 'leave' })} className={`${btn} border border-slate-200 bg-white`}>
                <LogOut size={16} color="#334155" />
                <Text className="text-sm font-semibold text-slate-700">Left work</Text>
              </Pressable>
            )}
            {w.payments.length === 0 && w.work.length === 0 ? (
              <Pressable disabled={busy} onPress={deleteWorker} className={`${btn} border border-red-200 bg-red-50`}>
                <Trash2 size={16} color="#dc2626" />
                <Text className="text-sm font-semibold text-red-600">Delete</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Balance */}
        <View className={`rounded-2xl border bg-white p-4 ${a.balance > 0.004 ? 'border-red-200' : a.balance < -0.004 ? 'border-amber-200' : 'border-emerald-200'}`}>
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Balance now</Text>
          <Text className={`mt-1 text-2xl font-extrabold ${bal.text}`}>{bal.label}</Text>
          <Text className="mt-1 text-sm text-slate-600">
            {a.balance > 0.004
              ? `${w.name} has earned ${tk(a.balance)} more than you paid.`
              : a.balance < -0.004
                ? `You paid ${tk(-a.balance)} more than ${w.name} has earned so far.`
                : 'Everything earned has been paid.'}
          </Text>
          <View className="mt-3 flex-row gap-3 border-t border-slate-100 pt-3">
            <View className="flex-1">
              <Text className="text-xs text-slate-500">Earned</Text>
              <Text className="text-sm font-bold text-slate-900">{tk(a.earned)}</Text>
              <Text className="text-[11px] text-slate-500">
                {a.daysWorked} day{a.daysWorked === 1 ? '' : 's'}
                {a.daysAbsent ? ` · ${a.daysAbsent} absent` : ''}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-500">Paid</Text>
              <Text className="text-sm font-bold text-slate-900">{tk(a.paid)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-500">Written off</Text>
              <Text className="text-sm font-bold text-slate-900">{tk(a.writtenOff)}</Text>
            </View>
          </View>
          {a.balance < -0.004 ? (
            <View className="mt-3 gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Text className="text-sm text-amber-900">
                {left
                  ? `${w.name} left owing ${tk(-a.balance)}. If it will not be paid back, write it off: it counts as a loss.`
                  : `${w.name} has an advance of ${tk(-a.balance)}. It is taken from future pay.`}
              </Text>
              {/* Same as web: write-off is only for a worker who left owing money; a working advance comes off future pay. */}
              {left ? (
                <Pressable
                  disabled={busy}
                  onPress={() => act(() => mobileApiClient.post(`/api/employees/${w.id}/writeoff`, {}, 'Failed to write off'), `Write off ${tk(-a.balance)} as a loss?`, 'Write off')}
                  className={`${btn} self-start bg-amber-600`}
                >
                  <Ban size={16} color="white" />
                  <Text className="text-sm font-semibold text-white">Write off {tk(-a.balance)}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {left && a.balance > 0.004 ? (
            <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <Text className="text-sm text-red-900">Final settlement: pay {w.name} {tk(a.balance)} to close the account.</Text>
            </View>
          ) : null}
        </View>

        {/* Month by month */}
        <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <View className="border-b border-slate-100 p-4">
            <Text className="text-base font-bold text-slate-900">Month by month</Text>
            <Text className="text-xs text-slate-500">{daily ? 'Days worked × rate.' : `Every day counts at ${tk(dayRate(w.salary))} except absent days.`}</Text>
          </View>
          {w.months.length === 0 ? (
            <Text className="p-6 text-center text-sm text-slate-500">Nothing yet.</Text>
          ) : (
            w.months.map((m, i) => {
              const mb = balanceInfo(m.closing);
              return (
                <View key={m.month} className={`gap-1 px-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-slate-900">{monthLabel(m.month)}</Text>
                    <Text className={`text-xs font-semibold ${mb.text}`}>{mb.label}</Text>
                  </View>
                  <Text className="text-xs text-slate-600">
                    {m.daysWorked} day{m.daysWorked === 1 ? '' : 's'}
                    {!daily && m.daysAbsent ? ` · ${m.daysAbsent} absent` : ''} · Earned {tk(m.earned)} · Paid {tk(m.paid)}
                    {m.writtenOff > 0 ? ` · ${tk(m.writtenOff)} written off` : ''}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* History */}
        <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Text className="border-b border-slate-100 p-4 text-base font-bold text-slate-900">History</Text>
          {history.map((h, i) => (
            <View key={h.key} className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
              <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${h.color}1a` }}>
                <h.Icon size={16} color={h.color} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900">{h.title}</Text>
                <Text className="text-[11px] text-slate-500">
                  {fmtDate(h.date)}
                  {h.detail ? ` · ${h.detail}` : ''}
                </Text>
              </View>
              {h.amount ? <Text className={`text-sm font-bold ${h.amount.cls}`}>{h.amount.text}</Text> : null}
              {h.onEdit ? <IconButton icon={Edit3} onPress={h.onEdit} /> : null}
              {h.onDelete ? <IconButton icon={Trash2} variant="danger" onPress={h.onDelete} /> : null}
            </View>
          ))}
          <Text className="border-t border-slate-100 p-4 text-xs text-slate-500">
            Money given on any day lowers the balance; you do not have to pay by month.
          </Text>
        </View>
      </ScrollView>

      {modal?.kind === 'pay' ? <WorkerPaymentModal worker={w} payment={modal.payment} onClose={() => setModal(null)} onSaved={done} /> : null}
      {modal?.kind === 'absent' ? <AbsenceModal worker={w} onClose={() => setModal(null)} onSaved={done} /> : null}
      {modal?.kind === 'work' ? <WorkModal worker={w} entry={modal.entry} onClose={() => setModal(null)} onSaved={done} /> : null}
      {modal?.kind === 'edit' ? <WorkerFormModal worker={w} onClose={() => setModal(null)} onSaved={done} /> : null}
      {modal?.kind === 'leave' ? <LeaveModal worker={w} onClose={() => setModal(null)} onSaved={done} /> : null}
    </View>
  );
}
