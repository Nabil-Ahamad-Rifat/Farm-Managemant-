import { Pressable } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export function IconButton({
  icon: Icon,
  color = '#64748b',
  onPress,
  variant = 'default',
}: {
  icon: LucideIcon;
  color?: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <Pressable onPress={onPress} className={`rounded-lg p-2 ${variant === 'danger' ? 'bg-red-50' : 'bg-slate-100'}`}>
      <Icon size={16} color={variant === 'danger' ? '#dc2626' : color} />
    </Pressable>
  );
}
