import { create } from 'zustand';
import type { Dentist, StaffMember, Clinic, StaffRole } from '@/types';
import { storage } from '@/lib/storage';

const STAFF_KEY  = 'staff_data';
const CLINIC_KEY = 'clinic_data';

interface AuthState {
  token:           string | null;
  dentist:         Dentist | null;
  staff:           StaffMember | null;
  clinic:          Clinic | null;
  role:            StaffRole | null;
  pendingPhone:    string;
  isAuthenticated: boolean;

  setAuth:         (token: string, dentist: Dentist, staff?: StaffMember | null, clinic?: Clinic | null) => void;
  setPendingPhone: (phone: string) => void;
  updateDentist:   (dentist: Dentist) => void;
  updateClinic:    (clinic: Clinic) => void;
  logout:          () => void;
  hydrate:         () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token:           null,
  dentist:         null,
  staff:           null,
  clinic:          null,
  role:            null,
  pendingPhone:    '',
  isAuthenticated: false,

  hydrate: () => {
    const token   = storage.getToken();
    const dentist = storage.getDentist();
    const staff   = (() => { try { const d = localStorage.getItem(STAFF_KEY);  return d ? JSON.parse(d) : null; } catch { return null; } })();
    const clinic  = (() => { try { const d = localStorage.getItem(CLINIC_KEY); return d ? JSON.parse(d) : null; } catch { return null; } })();
    set({ token, dentist, staff, clinic, role: staff?.role || null, isAuthenticated: !!token });
  },

  setAuth: (token, dentist, staff = null, clinic = null) => {
    storage.setToken(token);
    storage.setDentist(dentist);
    if (staff)  localStorage.setItem(STAFF_KEY,  JSON.stringify(staff));
    if (clinic) localStorage.setItem(CLINIC_KEY, JSON.stringify(clinic));
    set({ token, dentist, staff, clinic, role: staff?.role || null, isAuthenticated: true });
  },

  setPendingPhone: (phone) => set({ pendingPhone: phone }),

  updateDentist: (dentist) => {
    storage.setDentist(dentist);
    set({ dentist });
  },

  updateClinic: (clinic) => {
    localStorage.setItem(CLINIC_KEY, JSON.stringify(clinic));
    set({ clinic });
  },

  logout: () => {
    storage.clear();
    localStorage.removeItem(STAFF_KEY);
    localStorage.removeItem(CLINIC_KEY);
    set({ token: null, dentist: null, staff: null, clinic: null, role: null, isAuthenticated: false });
  },
}));
