import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { mobileApiClient } from '@/src/lib/apiClient';
import { generateIdempotencyKey } from '@/src/lib/idempotency';
import { PAYMENT_METHODS, tk, todayStr, toDay } from '@/src/lib/format';
import { FormModal, TextField, ChipGroup, DateField, PrimaryButton } from '@/src/components/ui';

/** Wording and endpoints for money in from a customer vs out to a supplier. */
const MODES = {
  collect: {
    title: 'Collect payment',
    owes: 'owes',
    amountLabel: 'Amount received (৳)',
    create: (id: string) => `/api/customers/${id}/payments`,
    update: (id: string) => `/api/payments/${id}`,
  },
  pay: {
    title: 'Pay supplier',
    owes: 'you owe',
    amountLabel: 'Amount paid (৳)',
    create: (id: string) => `/api/suppliers/${id}/payments`,
    update: (id: string) => `/api/supplier-payments/${id}`,
  },
} as const;

export type PaymentMode = keyof typeof MODES;

export interface EditablePayment {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  paidAt: Date | string;
}

/** Record (or edit) a payment from a customer or to a supplier. Opens when `party` is set. */
export function PaymentModal({
  party,
  mode,
  payment,
  onClose,
  onSaved,
}: {
  party: { id: string; name: string; totalDue: number } | null;
  mode: PaymentMode;
  payment?: EditablePayment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const copy = MODES[mode];
  const editing = !!payment;
  const [form, setForm] = useState({ amount: '', method: 'cash', paidAt: todayStr(), note: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState(generateIdempotencyKey);

  // Reset whenever the modal opens for a party or payment.
  useEffect(() => {
    if (!party) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      amount: payment ? String(payment.amount) : party.totalDue > 0 ? String(party.totalDue) : '',
      method: payment?.method ?? 'cash',
      paidAt: payment ? toDay(payment.paidAt) : todayStr(),
      note: payment?.note ?? '',
    });
    setError('');
    setKey(generateIdempotencyKey());
  }, [party, payment]);

  if (!party) return null;
  const amount = parseFloat(form.amount) || 0;
  const dueBefore = party.totalDue + (editing ? payment!.amount : 0);
  const after = dueBefore - amount;

  async function save() {
    setError('');
    if (!(amount > 0)) return setError('Enter the amount.');
    setSaving(true);
    try {
      if (editing) await mobileApiClient.put(copy.update(payment!.id), form, 'Failed to save payment');
      else await mobileApiClient.post(copy.create(party!.id), form, 'Failed to save payment', { idempotencyKey: key });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible title={editing ? 'Edit payment' : copy.title} subtitle={`${party.name} · ${copy.owes} ${tk(party.totalDue)}`} onClose={onClose}>
      {error ? (
        <View className="rounded-xl border border-red-100 bg-red-50 p-3">
          <Text className="text-xs font-medium text-red-700">{error}</Text>
        </View>
      ) : null}
      <View>
        <TextField label={copy.amountLabel} keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} />
        {!editing && dueBefore > 0 ? (
          <Pressable onPress={() => setForm({ ...form, amount: String(dueBefore) })} className="mt-2 self-start rounded-lg border border-slate-200 px-3 py-1.5">
            <Text className="text-xs font-semibold text-slate-600">Full due {tk(dueBefore)}</Text>
          </Pressable>
        ) : null}
        <Text className={`mt-2 text-sm font-semibold ${after > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
          {after > 0 ? `Still due after this: ${tk(after)}` : after < 0 ? `Fully cleared, ${tk(-after)} kept as advance` : 'Fully cleared'}
        </Text>
      </View>
      <ChipGroup label="Paid by" options={PAYMENT_METHODS} value={form.method} onChange={(v) => setForm({ ...form, method: v })} />
      <DateField label="Date" value={form.paidAt} onChange={(v) => setForm({ ...form, paidAt: v })} maxDate={new Date()} />
      <TextField label="Note (optional)" value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} />
      <PrimaryButton label={editing ? 'Save changes' : 'Save payment'} loading={saving} onPress={save} />
    </FormModal>
  );
}
