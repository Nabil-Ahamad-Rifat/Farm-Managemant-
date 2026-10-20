import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { Stack, useLocalSearchParams } from 'expo-router';
import { HandCoins, Plus, ShoppingBag, Wallet, AlertCircle, Phone, Edit3, Trash2 } from 'lucide-react-native';
import type { CustomerDetail, Payment, Sale } from '@farm/shared-types';
import { customerMonths } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { useSaleOptions } from '@/src/hooks/useSaleOptions';
import { tk, fmtDate, paymentMethodLabel } from '@/src/lib/format';
import { IconButton, StatCard, useConfirm } from '@/src/components/ui';
import { StatusPill, TypeBadge } from '@/src/components/StatusPill';
import { PaymentModal } from '@/src/components/PaymentModal';
import { SaleFormModal } from '@/src/components/SaleFormModal';
import { groupByMonth, MonthHeading } from '@/src/components/MonthSection';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ payment: Payment | null } | null>(null);
  const [saleModal, setSaleModal] = useState<{ sale: Sale | null } | null>(null);
  const options = useSaleOptions();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      setCustomer(await mobileApiClient.get<CustomerDetail>(`/api/customers/${id}`, 'Failed to load customer'));
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

  const months = useMemo(
    () =>
      customer
        ? customerMonths(
            customer.sales.map((s) => ({ partyId: customer.id, amount: s.amount, date: s.createdAt, saleType: s.saleType, quantity: s.quantity })),
            customer.payments.map((p) => ({ partyId: customer.id, amount: p.amount, date: p.paidAt })),
          )
        : [],
    [customer],
  );

  async function remove(kind: 'sale' | 'payment', itemId: string, label: string) {
    if (!(await confirm(`Delete ${label}?`))) return;
    try {
      await mobileApiClient.delete(kind === 'sale' ? `/api/sales/${itemId}` : `/api/payments/${itemId}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!customer) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        {error ? <Text className="text-sm text-red-700">{error}</Text> : <ActivityIndicator />}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ title: customer.name }} />
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
        <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-slate-900">{customer.name}</Text>
            <TypeBadge type={customer.type} />
          </View>
          {customer.phone ? (
            <View className="flex-row items-center gap-1">
              <Phone size={12} color="#64748b" />
              <Text className="text-xs text-slate-600">{customer.phone}</Text>
            </View>
          ) : null}
          <View className="mt-1 flex-row gap-2">
            <Pressable onPress={() => setPaymentModal({ payment: null })} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5">
              <HandCoins size={16} color="white" />
              <Text className="text-sm font-semibold text-white">Collect</Text>
            </Pressable>
            <Pressable onPress={() => setSaleModal({ sale: null })} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5">
              <Plus size={16} color="white" />
              <Text className="text-sm font-semibold text-white">New sale</Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row gap-3">
          <StatCard label="Bought" value={tk(customer.totalSold)} icon={ShoppingBag} color="#475569" />
          <StatCard label="Paid" value={tk(customer.totalPaid)} icon={Wallet} color="#059669" />
        </View>
        <StatCard
          label={customer.advance > 0 ? 'Advance (credit)' : 'Still due'}
          value={tk(customer.advance > 0 ? customer.advance : customer.totalDue)}
          icon={AlertCircle}
          color={customer.totalDue > 0 ? '#dc2626' : '#059669'}
        />

        {error ? <Text className="text-xs text-red-700">{error}</Text> : null}

        <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-base font-bold text-slate-900">History</Text>
            <Text className="text-[11px] text-slate-500">Payments clear oldest sales first</Text>
          </View>
          {customer.history.length === 0 ? (
            <Text className="px-4 py-8 text-center text-sm text-slate-500">No sales or payments yet.</Text>
          ) : (
            groupByMonth(customer.history).map(({ month, entries }) => (
              <View key={month}>
                <MonthHeading month={month} summary={months.find((m) => m.month === month)} />
                {entries.map((e) =>
                  e.kind === 'sale' ? (
                    <View key={`s-${e.sale.id}`} className="flex-row items-start gap-3 border-b border-slate-100 px-4 py-3">
                      <View className="flex-1 gap-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-semibold text-slate-900">
                            Sold {e.sale.saleType === 'milk' ? 'milk' : e.sale.saleType === 'cow_sale' ? 'cow' : 'other'}
                          </Text>
                          <StatusPill status={e.sale.status} />
                        </View>
                        <Text className="text-[11px] text-slate-500">
                          {fmtDate(e.sale.createdAt)}
                          {e.sale.quantity != null && e.sale.unitPrice != null
                            ? ` · ${e.sale.quantity}${e.sale.saleType === 'milk' ? ' L' : ''} × ${tk(e.sale.unitPrice)}`
                            : ''}
                        </Text>
                      </View>
                      <Text className="text-sm font-bold text-slate-900">{tk(e.sale.amount)}</Text>
                      <IconButton icon={Edit3} onPress={() => setSaleModal({ sale: e.sale })} />
                      <IconButton icon={Trash2} variant="danger" onPress={() => remove('sale', e.sale.id, `the ${tk(e.sale.amount)} sale`)} />
                    </View>
                  ) : (
                    <View key={`p-${e.payment.id}`} className="flex-row items-start gap-3 border-b border-slate-100 bg-emerald-50/40 px-4 py-3">
                      <View className="flex-1 gap-1">
                        <Text className="text-sm font-semibold text-slate-900">Received · {paymentMethodLabel(e.payment.method)}</Text>
                        <Text className="text-[11px] text-slate-500">
                          {fmtDate(e.payment.paidAt)}
                          {e.payment.note ? ` · ${e.payment.note}` : ''}
                        </Text>
                      </View>
                      <Text className="text-sm font-bold text-emerald-700">+{tk(e.payment.amount)}</Text>
                      <IconButton icon={Edit3} onPress={() => setPaymentModal({ payment: e.payment })} />
                      <IconButton icon={Trash2} variant="danger" onPress={() => remove('payment', e.payment.id, `the ${tk(e.payment.amount)} payment`)} />
                    </View>
                  ),
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <PaymentModal
        party={paymentModal ? customer : null}
        mode="collect"
        payment={paymentModal?.payment}
        onClose={() => setPaymentModal(null)}
        onSaved={async () => {
          setPaymentModal(null);
          await load();
        }}
      />
      <SaleFormModal
        open={!!saleModal}
        sale={saleModal?.sale}
        customers={[]}
        activeCows={options.activeCows}
        defaultMilkPrice={options.defaultMilkPrice}
        presetCustomer={{ id: customer.id, name: customer.name, lastMilkPrice: customer.lastMilkPrice }}
        onClose={() => setSaleModal(null)}
        onSaved={async () => {
          setSaleModal(null);
          await load();
        }}
      />
    </View>
  );
}
