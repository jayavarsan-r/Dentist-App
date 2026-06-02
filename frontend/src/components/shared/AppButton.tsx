import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes } from 'react';

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'lg' | 'md' | 'sm';
  isLoading?: boolean;
  fullWidth?: boolean;
  color?: string;
}

export default function AppButton({
  variant = 'primary',
  size = 'lg',
  isLoading = false,
  fullWidth = true,
  children,
  className,
  disabled,
  color,
  ...props
}: AppButtonProps) {
  const base = 'press-effect inline-flex items-center justify-center font-semibold rounded-[14px] transition-all focus:outline-none select-none';

  const variants = {
    primary: 'bg-[#1C1C1E] text-white shadow-primary-sm hover:bg-black disabled:opacity-40',
    secondary: 'bg-white text-[#1C1C1E] border border-[#D1D1D6] shadow-card hover:bg-surface-subtle disabled:opacity-40',
    ghost: 'bg-transparent text-[#007AFF] font-semibold hover:opacity-80 disabled:opacity-40',
    danger: 'bg-error-light text-error border border-error-border hover:opacity-90 disabled:opacity-50',
  };

  const sizes = {
    lg: 'h-[52px] px-6 text-[17px]',
    md: 'h-[44px] px-5 text-[15px]',
    sm: 'h-[36px] px-4 text-[13px]',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : children}
    </button>
  );
}
