import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Plus, Search, Edit3, Trash2, Banknote } from 'lucide-react-native';
import type { Employee } from '@farm/shared-types';
import { totalActiveMonthlySalary, formatCurrency } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { generateIdempotencyKey } from '@/src/lib/idempotency';
import { useCrudList } from '@/src/hooks/useCrudList';
import { FormModal, TextField, ChipGroup, DateField, PrimaryButton, IconButton, EmptyState, StatCard, useConfirm } from '@/src/components/ui';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' },
];

const now = new Date();
const emptyForm = { name: '', role: '', email: '', phone: '', salary: '', joinDate: '', status: 'active' };
const emptySalaryForm = { amount: '', periodMonth: String(now.getMonth() + 1), periodYear: String(now.getFullYear()), note: '' };

export default function EmployeesScreen() {
  const { items: employees, loading, refreshing, refresh, reload } = useCrudList<Employee>('/api/employees');
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [salaryOpen, setSalaryOpen] = useState(false);
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null);
  const [salaryForm, setSalaryForm] = useState(emptySalaryForm);
  const [salaryError, setSalaryError] = useState('');

  const [createKey, setCreateKey] = useState(generateIdempotencyKey);
  const [salaryKey, setSalaryKey] = useState(generateIdempotencyKey);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setCreateKey(generateIdempotencyKey());
    setModalOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      name: emp.name,
      role: emp.role,
      email: emp.email || '',
      phone: emp.phone || '',
      salary: String(emp.salary ?? 0),
      joinDate: emp.joinDate ? new Date(emp.joinDate).toISOString().slice(0, 10) : '',
      status: emp.status || 'active',
    });
    setError('');
    setModalOpen(true);
  }

  function openSalary(emp: Employee) {
    setSalaryEmployee(emp);
    setSalaryForm({ ...emptySalaryForm, amount: String(emp.salary ?? 0) });
    setSalaryError('');
    setSalaryKey(generateIdempotencyKey());
    setSalaryOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.role.trim()) {
      setError('Full name and role are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await mobileApiClient.put(`/api/employees/${editing.id}`, form, 'Failed to save employee');
      } else {
        await mobileApiClient.post('/api/employees', form, 'Failed to save employee', { idempotencyKey: createKey });
      }
      setModalOpen(false);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSalarySubmit() {
    if (!salaryEmployee) return;
    setSaving(true);
    setSalaryError('');
    try {
      await mobileApiClient.post(`/api/employees/${salaryEmployee.id}/salary`, salaryForm, 'Failed to record salary payment', {
        idempotencyKey: salaryKey,
      });
      setSalaryOpen(false);
      await reload();
    } catch (err) {
      setSalaryError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp: Employee) {
    if (!(await confirm(`Delete employee ${emp.name}?`))) return;
    try {
      await mobileApiClient.delete(`/api/employees/${emp.id}`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchesSearch = emp.name.toLowerCase().includes(q) || emp.role.toLowerCase().includes(q) || (emp.email?.toLowerCase().includes(q) ?? false);
    const empStatus = emp.status || 'active';
    const matchesStatus = statusFilter === 'all' || empStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMonthlySalary = totalActiveMonthlySalary(filtered);

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
        <StatCard label="Monthly Labour Cost" value={formatCurrency(totalMonthlySalary)} icon={Banknote} color="#4338ca" />
        <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search employees by name or role..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm text-slate-900"
          />
        </View>
        <ChipGroup options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
      </View>

      {error ? (
        <View className="mx-4 mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
          <Text className="text-xs font-medium text-red-700">{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<EmptyState message="No employees found." />}
        renderItem={({ item }) => (
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">{item.name}</Text>
                <Text className="text-xs text-slate-500">{item.role}</Text>
                <Text className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(item.salary ?? 0)}</Text>
                <Text className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">{(item.status || 'active').replace('_', ' ')}</Text>
              </View>
              <View className="flex-row gap-2">
                <IconButton icon={Banknote} onPress={() => openSalary(item)} />
                <IconButton icon={Edit3} onPress={() => openEdit(item)} />
                <IconButton icon={Trash2} variant="danger" onPress={() => handleDelete(item)} />
              </View>
            </View>
          </View>
        )}
      />

      <Pressable
        onPress={openCreate}
        className="absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 shadow-lg"
      >
        <Plus size={18} color="white" />
        <Text className="font-semibold text-white">Add Employee</Text>
      </Pressable>

      <FormModal visible={modalOpen} title={editing ? 'Edit Employee' : 'Add New Employee'} onClose={() => setModalOpen(false)}>
        {error ? (
          <View className="rounded-xl border border-red-100 bg-red-50 p-3">
            <Text className="text-xs font-medium text-red-700">{error}</Text>
          </View>
        ) : null}
        <TextField label="Full Name" placeholder="e.g. Karim Hossain" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <TextField label="Role / Job Title" placeholder="e.g. Farm Supervisor" value={form.role} onChangeText={(v) => setForm({ ...form, role: v })} />
        <TextField label="Monthly Salary (৳)" placeholder="e.g. 12000" keyboardType="decimal-pad" value={form.salary} onChangeText={(v) => setForm({ ...form, salary: v })} />
        <DateField label="Join Date" value={form.joinDate} onChange={(v) => setForm({ ...form, joinDate: v })} maxDate={new Date()} />
        <ChipGroup
          label="Status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'on_leave', label: 'On Leave' },
            { value: 'terminated', label: 'Terminated' },
          ]}
          value={form.status}
          onChange={(v) => setForm({ ...form, status: v })}
        />
        <TextField label="Phone Number" placeholder="e.g. 01711-123456" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
        <TextField label="Email Address (Optional)" placeholder="e.g. karim@farm.com" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} />
        <PrimaryButton label="Save Employee" loading={saving} onPress={handleSubmit} />
      </FormModal>

      <FormModal
        visible={salaryOpen}
        title="Record Salary Payment"
        subtitle={salaryEmployee ? `${salaryEmployee.name} — ${salaryEmployee.role}` : undefined}
        onClose={() => setSalaryOpen(false)}
      >
        {salaryEmployee ? (
          <View className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <Text className="text-xs text-indigo-700">
              Contracted monthly salary: <Text className="font-bold">{formatCurrency(salaryEmployee.salary ?? 0)}</Text>
            </Text>
          </View>
        ) : null}
        {salaryError ? (
          <View className="rounded-xl border border-red-100 bg-red-50 p-3">
            <Text className="text-xs font-medium text-red-700">{salaryError}</Text>
          </View>
        ) : null}
        <TextField label="Amount Paid (৳)" keyboardType="decimal-pad" value={salaryForm.amount} onChangeText={(v) => setSalaryForm({ ...salaryForm, amount: v })} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField label="Month (1-12)" keyboardType="number-pad" value={salaryForm.periodMonth} onChangeText={(v) => setSalaryForm({ ...salaryForm, periodMonth: v })} />
          </View>
          <View className="flex-1">
            <TextField label="Year" keyboardType="number-pad" value={salaryForm.periodYear} onChangeText={(v) => setSalaryForm({ ...salaryForm, periodYear: v })} />
          </View>
        </View>
        <TextField label="Note (Optional)" placeholder="e.g. July 2026 salary" value={salaryForm.note} onChangeText={(v) => setSalaryForm({ ...salaryForm, note: v })} />
        <PrimaryButton label="Record Payment" loading={saving} onPress={handleSalarySubmit} />
      </FormModal>
    </View>
  );
}
