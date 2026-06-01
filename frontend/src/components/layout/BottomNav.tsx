import { useRouter } from 'next/router';
import Link from 'next/link';
import { Home, Users, CalendarDays, Calendar, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/home/', icon: Home, label: 'Home' },
  { href: '/patients/', icon: Users, label: 'Patients' },
  { href: '/appointments/', icon: CalendarDays, label: 'Today' },
  { href: '/calendar/', icon: Calendar, label: 'Calendar' },
  { href: '/settings/', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const router = useRouter();

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-surface border-t border-border shadow-nav z-50">
      <div className="flex items-stretch h-[64px] max-w-lg mx-auto">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = router.pathname === href || router.pathname.startsWith(href.replace(/\/$/, ''));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
                active ? 'text-accent' : 'text-text-disabled'
              )}
            >
              <Icon className={cn('w-6 h-6', active ? 'fill-accent-light/30' : '')} strokeWidth={active ? 2.5 : 1.8} />
              <span className={cn('text-[11px] font-medium tracking-wide', active ? 'font-semibold' : '')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
