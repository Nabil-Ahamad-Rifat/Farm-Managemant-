import { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import type { Cow, Sale } from '@farm/shared-types';
import { calculateSaleAmount } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { generateIdempotencyKey } from '@/src/lib/idempotency';
import { PAYMENT_METHODS, tk, todayStr, toDay } from '@/src/lib/format';
import { FormModal, TextField, ChipGroup, DateField, SelectField, PrimaryButton } from '@/src/components/ui';
import { PartyPickerField, type PartyChoice, type PickerParty } from '@/src/components/PartyPickerField';

const PRODUCTS = [
  { value: 'milk', label: 'Milk' },
  { value: 'cow_sale', label: 'Cow' },
  { value: 'other', label: 'Other' },
];
const PAY_MODES = [
  { value: 'full', label: 'Fully paid' },
  { value: 'partial', label: 'Partly paid' },
  { value: 'credit', label: 'On credit (baki)' },
];

/**
 * Record or edit a sale. Opens when `open` is true. New milk sales start at
 * the customer's last milk price, or the farm's default price.
 */
export function SaleFormModal({
  open,
  sale,
  customers,
  activeCows,
  defaultMilkPrice,
  presetCustomer,
  onClose,
  onSaved,
}: {
  open: boolean;
  sale?: Sale | null;
  customers: PickerParty[];
  activeCows: Pick<Cow, 'id' | 'name' | 'tagNumber'>[];
  defaultMilkPrice: number;
  /** Opened from a customer's page: the customer is fixed. */
  presetCustomer?: PickerParty;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!sale;
  const [customer, setCustomer] = useState<PartyChoice>(null);
  const [form, setForm] = useState({
    saleType: 'milk',
    quantity: '',
    unitPrice: '',
    amount: '',
    payMode: 'full',
    paidNow: '',
    paymentMethod: 'cash',
    saleDate: todayStr(),
    cowId: '',
    notes: '',
  });
  const [priceTouched, setPriceTouched] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState(generateIdempotencyKey);

  const lastPriceOf = (choice: PartyChoice) => {
    if (choice?.kind !== 'existing') return null;
    const known = presetCustomer?.id === choice.id ? presetCustomer : customers.find((c) => c.id === choice.id);
    return known?.lastMilkPrice ?? null;
  };
  const suggestedPrice = (choice: PartyChoice) => String(lastPriceOf(choice) ?? defaultMilkPrice);

  // Reset each time the form opens.
  useEffect(() => {
    if (!open) return;
    const initial: PartyChoice = presetCustomer
      ? { kind: 'existing', id: presetCustomer.id, name: presetCustomer.name }
      : sale?.customer
        ? { kind: 'existing', id: sale.customer.id, name: sale.customer.name }
        : sale
          ? { kind: 'new', name: sale.customerName }
          : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomer(initial);
    setForm({
      saleType: sale ? (PRODUCTS.some((p) => p.value === sale.saleType) ? sale.saleType : 'other') : 'milk',
      quantity: sale?.quantity?.toString() ?? '',
      unitPrice: sale ? sale.unitPrice?.toString() ?? '' : suggestedPrice(initial),
      amount: sale ? String(sale.amount) : '',
      payMode: 'full',
      paidNow: '',
      paymentMethod: 'cash',
      saleDate: sale ? toDay(sale.createdAt) : todayStr(),
      cowId: sale?.cowId ?? '',
      notes: sale?.notes ?? '',
    });
    setPriceTouched(false);
    setError('');
    setKey(generateIdempotencyKey());
    // Only re-run when the form opens or switches sale; the rest is read fresh then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sale]);

  const prefilling = !editing && !priceTouched && form.saleType === 'milk';
  const auto = calculateSaleAmount(form.quantity, form.unitPrice);
  const total = auto ?? (parseFloat(form.amount) || 0);
  const paidNow = form.payMode === 'full' ? total : form.payMode === 'credit' ? 0 : parseFloat(form.paidNow) || 0;
  const due = Math.max(0, total - paidNow);

  const cowOptions = useMemo(() => {
    const list = [...activeCows];
    if (sale?.cow && !list.some((c) => c.id === sale.cow!.id)) list.unshift(sale.cow);
    return list.map((c) => ({ value: c.id, label: c.name, sublabel: c.tagNumber }));
  }, [activeCows, sale]);

  function chooseCustomer(choice: PartyChoice) {
    setCustomer(choice);
    if (prefilling) setForm((f) => ({ ...f, unitPrice: suggestedPrice(choice) }));
  }

  function chooseProduct(saleType: string) {
    if (editing || priceTouched) return setForm((f) => ({ ...f, saleType }));
    // The milk price doesn't apply to a cow or other product.
    setForm((f) => ({ ...f, saleType, unitPrice: saleType === 'milk' ? suggestedPrice(customer) : '' }));
  }

  async function save() {
    setError('');
    if (!customer) return setError('Please choose or add a customer.');
    if (!(total > 0)) return setError('Enter the quantity and price, or the total amount.');
    if (!editing && paidNow > total) return setError('Paid now cannot be more than the total.');

    const payload = {
      ...(customer.kind === 'existing' ? { customerId: customer.id } : { customerName: customer.name, customerType: 'new' }),
      saleType: form.saleType,
      quantity: form.quantity || undefined,
      unitPrice: form.unitPrice || undefined,
      amount: total,
      saleDate: form.saleDate,
      cowId: form.saleType === 'cow_sale' ? form.cowId || undefined : undefined,
      notes: form.notes,
      ...(editing ? {} : { paidNow, paymentMethod: form.paymentMethod }),
    };
    setSaving(true);
    try {
      if (editing) await mobileApiClient.put(`/api/sales/${sale!.id}`, payload, 'Failed to save sale');
      else await mobileApiClient.post('/api/sales', payload, 'Failed to save sale', { idempotencyKey: key });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={open} title={editing ? 'Edit sale' : 'Record a sale'} onClose={onClose}>
      {error ? (
        <View className="rounded-xl border border-red-100 bg-red-50 p-3">
          <Text className="text-xs font-medium text-red-700">{error}</Text>
        </View>
      ) : null}
      {presetCustomer ? (
        <View>
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Customer</Text>
          <Text className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900">{presetCustomer.name}</Text>
        </View>
      ) : (
        <PartyPickerField label="Customer" noun="customer" parties={customers} value={customer} onChange={chooseCustomer} />
      )}
      <ChipGroup label="What was sold" options={PRODUCTS} value={form.saleType} onChange={chooseProduct} />
      {form.saleType === 'cow_sale' ? (
        <SelectField label="Which cow" placeholder="Not linked" value={form.cowId} options={cowOptions} onChange={(v) => setForm({ ...form, cowId: v })} />
      ) : null}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField
            label={form.saleType === 'milk' ? 'Quantity (L)' : 'Quantity'}
            keyboardType="decimal-pad"
            placeholder="e.g. 10"
            value={form.quantity}
            onChangeText={(v) => setForm({ ...form, quantity: v })}
          />
        </View>
        <View className="flex-1">
          <TextField
            label={form.saleType === 'milk' ? 'Price per L (৳)' : 'Unit price (৳)'}
            keyboardType="decimal-pad"
            value={form.unitPrice}
            onChangeText={(v) => {
              setPriceTouched(true);
              setForm({ ...form, unitPrice: v });
            }}
          />
          {prefilling ? (
            <Text className="mt-1 text-[11px] text-slate-500">
              {lastPriceOf(customer) != null ? 'Last price for this customer' : 'Default price (Settings)'}
            </Text>
          ) : null}
        </View>
      </View>
      <TextField
        label={auto !== null ? `Total (= ${tk(auto)})` : 'Total (৳)'}
        keyboardType="decimal-pad"
        editable={auto === null}
        value={auto !== null ? auto.toFixed(2) : form.amount}
        onChangeText={(v) => setForm({ ...form, amount: v })}
      />
      {!editing ? (
        <View className="gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <ChipGroup label="Payment" options={PAY_MODES} value={form.payMode} onChange={(v) => setForm({ ...form, payMode: v })} />
          {form.payMode === 'partial' ? (
            <TextField label="Paid now (৳)" keyboardType="decimal-pad" value={form.paidNow} onChangeText={(v) => setForm({ ...form, paidNow: v })} />
          ) : null}
          {form.payMode !== 'credit' ? (
            <ChipGroup label="Paid by" options={PAYMENT_METHODS} value={form.paymentMethod} onChange={(v) => setForm({ ...form, paymentMethod: v })} />
          ) : null}
          <Text className={`text-sm font-semibold ${due > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {due > 0 ? `${tk(due)} will be added to this customer's due` : 'Fully paid'}
          </Text>
        </View>
      ) : (
        <Text className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          To change payments, open the customer from Customers & Dues.
        </Text>
      )}
      <DateField label="Date" value={form.saleDate} onChange={(v) => setForm({ ...form, saleDate: v })} maxDate={new Date()} />
      <TextField label="Note (optional)" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} />
      <PrimaryButton label={editing ? 'Save changes' : 'Save sale'} loading={saving} onPress={save} />
    </FormModal>
  );
}
