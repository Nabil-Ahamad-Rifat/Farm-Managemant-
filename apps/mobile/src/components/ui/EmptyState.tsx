import { View, Text } from 'react-native';

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center py-10">
      <Text className="text-sm text-slate-500">{message}</Text>
    </View>
  );
}
