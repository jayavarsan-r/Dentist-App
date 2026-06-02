import { useEffect } from 'react';
import { useRouter } from 'next/router';
import BottomNav from './BottomNav';
import { useAuthStore } from '@/store/authStore';

const PUBLIC_ROUTES = ['/login/', '/otp/', '/onboarding/'];
const SHELL_ROUTES = [
  '/home/', '/patients/', '/appointments/', '/calendar/', '/settings/',
  '/reception/', '/check-in/', '/queue/',
];

interface LayoutProps { children: React.ReactNode; }

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { isAuthenticated, hydrate, role } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  const path = router.pathname.endsWith('/') ? router.pathname : router.pathname + '/';
  const isPublic      = PUBLIC_ROUTES.some(r => path.startsWith(r));
  const showBottomNav = SHELL_ROUTES.some(r => path.startsWith(r));

  useEffect(() => {
    if (!isAuthenticated && !isPublic) router.replace('/login/');
  }, [isAuthenticated, isPublic, router]);

  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto relative">
      <main className={showBottomNav ? 'pb-[80px]' : ''}>{children}</main>
      {showBottomNav && <BottomNav role={role} />}
    </div>
  );
}
