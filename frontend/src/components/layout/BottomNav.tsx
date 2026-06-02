import { useRouter } from 'next/router';
import Link from 'next/link';
import { Home, Users, CalendarDays, Calendar, Settings, UserCheck, List } from 'lucide-react';
import type { StaffRole } from '@/types';

const DOCTOR_TABS = [
  { href: '/home/',         icon: Home,         label: 'Home' },
  { href: '/patients/',     icon: Users,        label: 'Patients' },
  { href: '/appointments/', icon: CalendarDays, label: 'Today' },
  { href: '/calendar/',     icon: Calendar,     label: 'Calendar' },
  { href: '/settings/',     icon: Settings,     label: 'Settings' },
];

const RECEPTIONIST_TABS = [
  { href: '/check-in/',     icon: UserCheck,    label: 'Check-in' },
  { href: '/queue/',        icon: List,         label: 'Queue' },
  { href: '/patients/',     icon: Users,        label: 'Patients' },
  { href: '/appointments/', icon: CalendarDays, label: 'Schedule' },
  { href: '/settings/',     icon: Settings,     label: 'Settings' },
];

export default function BottomNav({ role }: { role?: StaffRole | null }) {
  const router = useRouter();
  const tabs = role === 'receptionist' ? RECEPTIONIST_TABS : DOCTOR_TABS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(0,0,0,0.10)',
        boxShadow: '0 -1px 0 rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch h-[58px]">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = router.pathname === href || router.pathname.startsWith(href.replace(/\/$/, ''));
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors press-effect"
              style={{ color: active ? '#1C1C1E' : '#AEAEB2' }}
            >
              <Icon
                className="w-[26px] h-[26px]"
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span style={{
                fontSize: 10.5,
                fontWeight: active ? 600 : 500,
                letterSpacing: '0.01em',
              }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
