import { View } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { AlertTriangle } from 'lucide-react-native';

// Shown when /api/meta/version reports this build is below forceUpdateBelow
// (see src/lib/version.ts). There's no in-app update mechanism here on
// purpose — the fix is always "go update from the store", which the app
// itself can't do for you.
export function UpdateRequiredScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-slate-950 px-8">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
        <AlertTriangle size={28} color="#f59e0b" />
      </View>
      <Text className="text-lg font-bold text-white">Update Required</Text>
      <Text className="text-center text-sm text-slate-400">
        This version of Farm Manager is no longer supported. Please update the app from the App Store or Google Play to continue.
      </Text>
    </View>
  );
}
