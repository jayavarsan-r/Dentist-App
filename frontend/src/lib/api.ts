import axios from 'axios';
import { BASE_URL } from './constants';
import { storage } from './storage';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      storage.clear();
      if (typeof window !== 'undefined') window.location.href = '/login/';
    }
    const message = err.response?.data?.error || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;

// Auth
export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; clinic_name?: string; phone?: string }) =>
    api.put('/auth/profile', data),
};

// Patients
export const patientsApi = {
  list: (q?: string) => api.get('/patients', { params: { q } }),
  create: (data: object) => api.post('/patients', data),
  getById: (id: string) => api.get(`/patients/${id}`),
  update: (id: string, data: object) => api.put(`/patients/${id}`, data),
  remove: (id: string) => api.delete(`/patients/${id}`),
};

// Visits
export const visitsApi = {
  list: (patientId?: string) => api.get('/visits', { params: { patientId } }),
  create: (data: object) => api.post('/visits', data),
  update: (id: string, data: object) => api.put(`/visits/${id}`, data),
};

// Appointments
export const appointmentsApi = {
  list: (date?: string) => api.get('/appointments', { params: { date } }),
  today: () => api.get('/appointments/today'),
  upcoming: () => api.get('/appointments/upcoming'),
  bookedSlots: (date: string) => api.get('/appointments/booked-slots', { params: { date } }),
  create: (data: object) => api.post('/appointments', data),
  update: (id: string, data: object) => api.put(`/appointments/${id}`, data),
};

// AI
export const aiApi = {
  transcribe: (audioBlob: Blob, ext?: string) => {
    const form = new FormData();
    const resolvedExt = ext || (
      audioBlob.type.includes('ogg') ? 'ogg' :
      audioBlob.type.includes('mp4') || audioBlob.type.includes('mpeg') ? 'mp4' :
      'webm'
    );
    // Include MIME type explicitly in the filename so multer/Sarvam can detect format
    form.append('audio', audioBlob, `recording.${resolvedExt}`);
    return api.post('/ai/transcribe', form);
  },
  generateNote: (transcript: string) => api.post('/ai/generate-note', { transcript }),
};

// Analytics
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
};
