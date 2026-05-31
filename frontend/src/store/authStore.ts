import { create } from 'zustand';
import type { Dentist } from '@/types';
import { storage } from '@/lib/storage';

interface AuthState {
  token: string | null;
  dentist: Dentist | null;
  pendingPhone: string;
  isAuthenticated: boolean;
  setAuth: (token: string, dentist: Dentist) => void;
  setPendingPhone: (phone: string) => void;
  updateDentist: (dentist: Dentist) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  dentist: null,
  pendingPhone: '',
  isAuthenticated: false,

  hydrate: () => {
    const token = storage.getToken();
    const dentist = storage.getDentist();
    set({ token, dentist, isAuthenticated: !!token });
  },

  setAuth: (token, dentist) => {
    storage.setToken(token);
    storage.setDentist(dentist);
    set({ token, dentist, isAuthenticated: true });
  },

  setPendingPhone: (phone) => set({ pendingPhone: phone }),

  updateDentist: (dentist) => {
    storage.setDentist(dentist);
    set({ dentist });
  },

  logout: () => {
    storage.clear();
    set({ token: null, dentist: null, isAuthenticated: false });
  },
}));
