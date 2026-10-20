import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Wallet, Plus, ShoppingBag, AlertCircle, Phone, MapPin, Edit3, Trash2 } from 'lucide-react-native';
import type { FeedBatch, SupplierDetail, SupplierPayment } from '@farm/shared-types';
import { mobileApiClient } from '@/src/lib/apiClient';
import { tk, fmtDate, paymentMethodLabel } from '@/src/lib/format';
import { IconButton, StatCard, useConfirm } from '@/src/components/ui';
import { StatusPill } from '@/src/components/StatusPill';
import { PaymentModal } from '@/src/components/PaymentModal';
import { FeedPurchaseModal } from '@/src/components/FeedPurchaseModal';

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ payment: SupplierPayment | null } | null>(null);
  const [purchaseModal, setPurchaseModal] = useState<{ batch: FeedBatch | null } | null>(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      setSupplier(await mobileApiClient.get<SupplierDetail>(`/api/suppliers/${id}`, 'Failed to load supplier'));
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

  async function remove(path: string, label: string) {
    if (!(await confirm(`Delete ${label}?`))) return;
    try {
      await mobileApiClient.delete(path);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!supplier) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        {error ? <Text className="text-sm text-red-700">{error}</Text> : <ActivityIndicator />}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ title: supplier.name }} />
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
          <Text className="text-lg font-bold text-slate-900">{supplier.name}</Text>
          {supplier.phone ? (
            <View className="flex-row items-center gap-1">
              <Phone size={12} color="#64748b" />
              <Text className="text-xs text-slate-600">{supplier.phone}</Text>
            </View>
          ) : null}
          {supplier.address ? (
            <View className="flex-row items-center gap-1">
              <MapPin size={12} color="#64748b" />
              <Text className="text-xs text-slate-600">{supplier.address}</Text>
            </View>
          ) : null}
          <View className="mt-1 flex-row gap-2">
            <Pressable onPress={() => setPaymentModal({ payment: null })} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5">
              <Wallet size={16} color="white" />
              <Text className="text-sm font-semibold text-white">Pay supplier</Text>
            </Pressable>
            <Pressable onPress={() => setPurchaseModal({ batch: null })} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5">
              <Plus size={16} color="white" />
              <Text className="text-sm font-semibold text-white">New purchase</Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row gap-3">
          <StatCard label="Bought" value={tk(supplier.totalBought)} icon={ShoppingBag} color="#475569" />
          <StatCard label="Paid" value={tk(supplier.totalPaid)} icon={Wallet} color="#059669" />
        </View>
        <StatCard
          label={supplier.advance > 0 ? 'Advance paid' : 'You still owe'}
          value={tk(supplier.advance > 0 ? supplier.advance : supplier.totalDue)}
          icon={AlertCircle}
          color={supplier.totalDue > 0 ? '#dc2626' : '#059669'}
        />

        {error ? <Text className="text-xs text-red-700">{error}</Text> : null}

        <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-base font-bold text-slate-900">History</Text>
            <Text className="text-[11px] text-slate-500">Payments clear oldest purchases first</Text>
          </View>
          {supplier.history.length === 0 ? (
            <Text className="px-4 py-8 text-center text-sm text-slate-500">No purchases or payments yet.</Text>
          ) : (
            supplier.history.map((e) =>
              e.kind === 'purchase' ? (
                <View key={`b-${e.purchase.id}`} className="flex-row items-start gap-3 border-t border-slate-100 px-4 py-3">
                  <View className="flex-1 gap-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-semibold text-slate-900">Bought {e.purchase.name}</Text>
                      <StatusPill status={e.purchase.payStatus ?? 'pending'} />
                    </View>
                    <Text className="text-[11px] text-slate-500">
                      {fmtDate(e.purchase.purchasedAt ?? e.purchase.createdAt)} · {e.purchase.quantity} kg × {tk(e.purchase.unitPrice)}
                      {e.purchase.schedule ? ` · ${e.purchase.schedule.coverDays} days · ${tk(e.purchase.schedule.perDayCost)}/day` : ''}
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-slate-900">{tk(e.purchase.quantity * e.purchase.unitPrice)}</Text>
                  <IconButton icon={Edit3} onPress={() => setPurchaseModal({ batch: e.purchase })} />
                  <IconButton icon={Trash2} variant="danger" onPress={() => remove(`/api/feed/${e.purchase.id}`, `the ${e.purchase.name} purchase`)} />
                </View>
              ) : (
                <View key={`p-${e.payment.id}`} className="flex-row items-start gap-3 border-t border-slate-100 bg-amber-50/40 px-4 py-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-sm font-semibold text-slate-900">Paid · {paymentMethodLabel(e.payment.method)}</Text>
                    <Text className="text-[11px] text-slate-500">
                      {fmtDate(e.payment.paidAt)}
                      {e.payment.note ? ` · ${e.payment.note}` : ''}
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-amber-800">−{tk(e.payment.amount)}</Text>
                  <IconButton icon={Edit3} onPress={() => setPaymentModal({ payment: e.payment })} />
                  <IconButton icon={Trash2} variant="danger" onPress={() => remove(`/api/supplier-payments/${e.payment.id}`, `the ${tk(e.payment.amount)} payment`)} />
                </View>
              ),
            )
          )}
        </View>
      </ScrollView>

      <PaymentModal
        party={paymentModal ? supplier : null}
        mode="pay"
        payment={paymentModal?.payment}
        onClose={() => setPaymentModal(null)}
        onSaved={async () => {
          setPaymentModal(null);
          await load();
        }}
      />
      <FeedPurchaseModal
        open={!!purchaseModal}
        batch={purchaseModal?.batch}
        suppliers={[]}
        presetSupplier={{ id: supplier.id, name: supplier.name }}
        onClose={() => setPurchaseModal(null)}
        onSaved={async () => {
          setPurchaseModal(null);
          await load();
        }}
      />
    </View>
  );
}
