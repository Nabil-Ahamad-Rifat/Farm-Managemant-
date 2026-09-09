import { Coins } from 'lucide-react-native';
import { ScreenPlaceholder } from '@/src/components/ScreenPlaceholder';

export default function IncomeScreen() {
  return (
    <ScreenPlaceholder
      icon={Coins}
      title="Other Income"
      description="Subsidies, grants, and other income records are coming in Phase 5."
    />
  );
}
