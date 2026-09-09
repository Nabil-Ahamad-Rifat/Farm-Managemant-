import { BadgeCheck } from 'lucide-react-native';
import { ScreenPlaceholder } from '@/src/components/ScreenPlaceholder';

export default function CowsScreen() {
  return (
    <ScreenPlaceholder
      icon={BadgeCheck}
      title="Herd Management"
      description="Cattle inventory, breeds, and health status tracking are coming in Phase 5."
    />
  );
}
