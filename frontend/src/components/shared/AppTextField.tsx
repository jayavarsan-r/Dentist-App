import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { InputHTMLAttributes, useState, forwardRef } from 'react';

interface AppTextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  prefixIcon?: React.ReactNode;
  error?: string;
  textarea?: boolean;
  rows?: number;
}

const AppTextField = forwardRef<HTMLInputElement, AppTextFieldProps>(({
  label,
  hint,
  prefixIcon,
  error,
  className,
  textarea,
  rows = 3,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
        </label>
      )}
      <div className={cn('relative flex items-center', textarea && 'items-start')}>
        {prefixIcon && (
          <div className={cn('absolute left-4 text-text-secondary', textarea ? 'top-4' : '')}>
            {prefixIcon}
          </div>
        )}
        {textarea ? (
          <textarea
            rows={rows}
            placeholder={hint}
            className={cn(
              'w-full bg-white border-[1.5px] border-app-border rounded-md px-4 py-3.5 text-base text-text-primary placeholder:text-text-disabled focus:border-primary focus:bg-primary-subtle transition-colors resize-none',
              prefixIcon && 'pl-11',
              error && 'border-error',
              className
            )}
            {...(props as any)}
          />
        ) : (
          <input
            ref={ref}
            placeholder={hint}
            className={cn(
              'w-full h-[52px] bg-white border-[1.5px] border-app-border rounded-md px-4 text-base text-text-primary placeholder:text-text-disabled focus:border-primary focus:bg-primary-subtle transition-colors',
              prefixIcon && 'pl-11',
              error && 'border-error',
              className
            )}
            {...props}
          />
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
});
AppTextField.displayName = 'AppTextField';
export { AppTextField };

interface SearchFieldProps {
  hint?: string;
  value: string;
  onChange: (val: string) => void;
}

export function SearchField({ hint = 'Search...', value, onChange }: SearchFieldProps) {
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-4 w-5 h-5 text-text-secondary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        className="w-full h-12 bg-app-surface-variant border-none rounded-full pl-11 pr-10 text-base text-text-primary placeholder:text-text-disabled focus:ring-[1.5px] focus:ring-primary transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-4 text-text-disabled hover:text-text-secondary"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default AppTextField;
