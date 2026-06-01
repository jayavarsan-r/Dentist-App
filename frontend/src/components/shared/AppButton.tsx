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
  const base = 'press-effect inline-flex items-center justify-center font-semibold rounded-md transition-colors focus:outline-none select-none';

  const variants = {
    primary: 'bg-accent text-white shadow-primary-sm hover:bg-accent-dark disabled:opacity-50',
    secondary: 'bg-accent-light text-accent border-[1.5px] border-accent hover:bg-accent-subtle disabled:opacity-50',
    ghost: `bg-transparent font-semibold hover:opacity-80 disabled:opacity-40`,
    danger: 'bg-error-light text-error border-[1.5px] border-error hover:opacity-90 disabled:opacity-50',
  };

  const sizes = {
    lg: 'h-[52px] px-6 text-base',
    md: 'h-[44px] px-5 text-sm',
    sm: 'h-[36px] px-4 text-sm',
  };

  const ghostColor = color ? `text-[${color}]` : 'text-accent';

  return (
    <button
      className={cn(
        base,
        variants[variant],
        sizes[size],
        variant === 'ghost' && ghostColor,
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-[18px] h-[18px] animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}
