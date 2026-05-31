import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { storage } from '@/lib/storage';

export default function IndexPage() {
  const router = useRouter();
  useEffect(() => {
    const token = storage.getToken();
    router.replace(token ? '/home/' : '/login/');
  }, [router]);
  return null;
}
