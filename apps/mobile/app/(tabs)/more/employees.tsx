import { Users } from 'lucide-react-native';
import { ScreenPlaceholder } from '@/src/components/ScreenPlaceholder';

export default function EmployeesScreen() {
  return (
    <ScreenPlaceholder
      icon={Users}
      title="Employees"
      description="Staff records and salary payments are coming in Phase 5."
    />
  );
}
