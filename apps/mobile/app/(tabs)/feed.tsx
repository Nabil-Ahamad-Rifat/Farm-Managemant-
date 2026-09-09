import { Wheat } from 'lucide-react-native';
import { ScreenPlaceholder } from '@/src/components/ScreenPlaceholder';

export default function FeedScreen() {
  return (
    <ScreenPlaceholder
      icon={Wheat}
      title="Feed Inventory"
      description="Feed batches, stock levels, and usage tracking are coming in Phase 5."
    />
  );
}
