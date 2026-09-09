import { PackageOpen } from 'lucide-react-native';
import { ScreenPlaceholder } from '@/src/components/ScreenPlaceholder';

export default function ExpensesScreen() {
  return (
    <ScreenPlaceholder
      icon={PackageOpen}
      title="Other Expenses"
      description="Vet fees, equipment, and miscellaneous costs are coming in Phase 5."
    />
  );
}
