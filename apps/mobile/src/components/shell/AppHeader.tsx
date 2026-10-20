import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSession } from '@/src/context/AuthContext';
import { colors } from '@/src/theme';
import { FarmBadge } from './Brand';

/**
 * The navy top bar on every signed-in screen, like the web's phone top bar:
 * the farm badge, plus a back arrow on screens opened from another screen.
 * Page titles live in the page itself (PageHeader), as on the web.
 */
export function AppHeader({ back }: { back?: boolean }) {
  const insets = useSafeAreaInsets();
  const { farmName } = useSession();
  return (
    <View className="bg-navy-900" style={{ paddingTop: insets.top }}>
      <View className="h-14 flex-row items-center gap-2 px-4">
        {back ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="-ml-2 h-11 w-11 items-center justify-center rounded-control"
          >
            <ArrowLeft size={20} color={colors.white} />
          </Pressable>
        ) : null}
        <FarmBadge name={farmName} />
      </View>
    </View>
  );
}
