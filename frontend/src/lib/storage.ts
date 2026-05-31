import { TOKEN_KEY, DENTIST_KEY } from './constants';
import type { Dentist } from '@/types';

export const storage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
  getDentist(): Dentist | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(DENTIST_KEY);
    return data ? JSON.parse(data) : null;
  },
  setDentist(dentist: Dentist): void {
    localStorage.setItem(DENTIST_KEY, JSON.stringify(dentist));
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DENTIST_KEY);
  },
};
