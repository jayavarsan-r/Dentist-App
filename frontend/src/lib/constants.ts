// For Android emulator: 10.0.2.2 maps to localhost
// For physical device on same WiFi: use your machine's LAN IP e.g. 192.168.1.5
// After deploying to Render: use https://your-app.onrender.com
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.2.2:3000/api';

export const TOKEN_KEY = 'auth_token';
export const DENTIST_KEY = 'dentist_data';

export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00',
];

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}
