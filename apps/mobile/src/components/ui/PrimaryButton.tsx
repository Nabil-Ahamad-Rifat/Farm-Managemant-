import { Pressable, Text, ActivityIndicator } from 'react-native';

export function PrimaryButton({
  label,
  loading,
  onPress,
  variant = 'primary',
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className={`items-center rounded-xl px-4 py-3 disabled:opacity-50 ${
        variant === 'danger' ? 'bg-red-600' : 'bg-slate-900'
      }`}
    >
      {loading ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">{label}</Text>}
    </Pressable>
  );
}
