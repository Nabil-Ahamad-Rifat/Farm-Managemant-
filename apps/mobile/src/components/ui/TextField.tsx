import { View, Text, TextInput, type TextInputProps } from 'react-native';

export function TextField({
  label,
  ...inputProps
}: TextInputProps & { label: string }) {
  return (
    <View>
      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</Text>
      <TextInput
        placeholderTextColor="#94a3b8"
        className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900"
        {...inputProps}
      />
    </View>
  );
}
