import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PatientAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
  className?: string;
}

const sizes = {
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-sm',
  lg: 'w-[68px] h-[68px] text-xl',
};

export default function PatientAvatar({ name, size = 'md', light = false, className }: PatientAvatarProps) {
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
      sizes[size],
      light ? 'bg-white/10 text-white' : 'bg-accent-light text-accent',
      className
    )}>
      {getInitials(name)}
    </div>
  );
}
