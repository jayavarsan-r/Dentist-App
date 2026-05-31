import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Building2, MapPin, Phone, Clock, Bell, Database, Info, HelpCircle, LogOut, ChevronRight, Edit2
} from 'lucide-react';
import PatientAvatar from '@/components/shared/PatientAvatar';
import AppButton from '@/components/shared/AppButton';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const router = useRouter();
  const { dentist, logout } = useAuthStore();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    if (!confirm('Are you sure you want to logout?')) return;
    logout();
    router.replace('/login/');
  };

  const clinicItems = [
    { icon: <Building2 className="w-5 h-5 text-primary" />, label: 'Clinic Name', value: dentist?.clinic_name || 'Not set' },
    { icon: <MapPin className="w-5 h-5 text-primary" />, label: 'Address', value: 'Edit' },
    { icon: <Phone className="w-5 h-5 text-primary" />, label: 'Contact', value: dentist?.phone || '—' },
    { icon: <Clock className="w-5 h-5 text-primary" />, label: 'Working Hours', value: '9 AM – 7 PM' },
  ];

  const appItems = [
    { icon: <Info className="w-5 h-5 text-primary" />, label: 'About DentAI', value: '' },
    { icon: <HelpCircle className="w-5 h-5 text-primary" />, label: 'Help & Support', value: '' },
    { icon: <Database className="w-5 h-5 text-primary" />, label: 'Backup Data', value: '' },
  ];

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="bg-app-surface border-b border-app-border px-5 pt-12 pb-4">
        <h1 className="text-[22px] font-bold text-text-primary">Settings</h1>
      </div>

      <div className="px-5 py-5 pb-10 space-y-5">
        {/* Profile Card */}
        <div className="bg-app-surface rounded-lg border border-app-border shadow-card p-5">
          <div className="flex items-center gap-4">
            <PatientAvatar name={dentist?.name || 'Dr'} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-text-primary">Dr. {dentist?.name || 'Set up your profile'}</p>
              <p className="text-sm text-text-secondary truncate">{dentist?.clinic_name || 'Your clinic'}</p>
              <p className="text-xs text-text-secondary">{dentist?.phone}</p>
            </div>
          </div>
          <div className="h-px bg-app-divider my-4" />
          <AppButton variant="secondary" onClick={() => {}}>
            <div className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </div>
          </AppButton>
        </div>

        {/* Clinic */}
        <div>
          <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase px-1 mb-2">Clinic</p>
          <div className="bg-app-surface rounded-md border border-app-border overflow-hidden">
            {clinicItems.map((item, i) => (
              <div key={item.label}>
                {i > 0 && <div className="h-px bg-app-divider" />}
                <button className="w-full flex items-center gap-3 px-4 py-3 press-effect">
                  <div className="w-9 h-9 bg-primary-surface rounded-md flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <span className="flex-1 text-sm text-text-primary text-left">{item.label}</span>
                  <span className="text-xs text-text-secondary mr-1">{item.value}</span>
                  <ChevronRight className="w-4 h-4 text-text-disabled" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* App Settings */}
        <div>
          <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase px-1 mb-2">App</p>
          <div className="bg-app-surface rounded-md border border-app-border overflow-hidden">
            {/* Notifications toggle */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 bg-primary-surface rounded-md flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <span className="flex-1 text-sm text-text-primary">Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-app-border rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
            <div className="h-px bg-app-divider" />
            {appItems.map((item, i) => (
              <div key={item.label}>
                {i > 0 && <div className="h-px bg-app-divider" />}
                <button className="w-full flex items-center gap-3 px-4 py-3 press-effect">
                  <div className="w-9 h-9 bg-primary-surface rounded-md flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <span className="flex-1 text-sm text-text-primary text-left">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-text-disabled" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="bg-app-surface rounded-md border border-error-border overflow-hidden">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 press-effect">
            <div className="w-9 h-9 bg-error-light rounded-md flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-error" />
            </div>
            <span className="flex-1 text-sm font-medium text-error text-left">Logout</span>
          </button>
        </div>

        <p className="text-xs text-text-disabled text-center">DentAI v1.0.0 • Built for dentists</p>
      </div>
    </div>
  );
}
