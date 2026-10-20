import { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

// value/onChange use 'YYYY-MM-DD' strings, matching web's <input type="date">
// value format, so the same string goes straight into an API request body.
export function DateField({
  label,
  value,
  onChange,
  maxDate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxDate?: Date;
}) {
  const [show, setShow] = useState(false);
  const dateValue = value ? new Date(`${value}T00:00:00`) : new Date();

  function handleChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    // Android's picker is a one-shot native dialog that dismisses itself;
    // iOS's inline picker stays open until the user taps elsewhere.
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      // The picker works in local time (value is local midnight), so read the
      // local calendar day — toISOString() would give the previous day east of UTC.
      const pad = (n: number) => String(n).padStart(2, '0');
      onChange(`${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`);
    }
  }

  return (
    <View>
      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
        className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5"
      >
        <Calendar size={14} color="#94a3b8" />
        <Text className="text-sm text-slate-900">{value || 'Select date'}</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={maxDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}
