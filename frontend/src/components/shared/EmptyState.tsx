import { LucideIcon } from 'lucide-react';
import AppButton from './AppButton';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ icon: Icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-20 h-20 bg-app-surface-variant rounded-2xl flex items-center justify-center mb-5">
        <Icon className="w-[42px] h-[42px] text-text-disabled" />
      </div>
      <h3 className="text-lg font-semibold text-text-secondary mb-2">{title}</h3>
      {subtitle && <p className="text-sm text-text-disabled max-w-[240px] mb-6">{subtitle}</p>}
      {ctaLabel && onCta && (
        <AppButton onClick={onCta} fullWidth={false} size="md" className="px-8">
          {ctaLabel}
        </AppButton>
      )}
    </div>
  );
}
