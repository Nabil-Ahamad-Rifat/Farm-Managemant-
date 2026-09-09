import { DollarSign } from 'lucide-react-native';
import { ScreenPlaceholder } from '@/src/components/ScreenPlaceholder';

export default function SalesScreen() {
  return (
    <ScreenPlaceholder
      icon={DollarSign}
      title="Sales & Revenue"
      description="Recording sales, linking livestock, and revenue totals are coming in Phase 5."
    />
  );
}
