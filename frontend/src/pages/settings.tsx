import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, Copy, Check, Bell, Info, HelpCircle, LogOut, ChevronRight, Users
} from 'lucide-react';
import PatientAvatar from '@/components/shared/PatientAvatar';
import { useAuthStore } from '@/store/authStore';
import { clinicApi, staffApi } from '@/lib/api';
import type { Clinic, StaffMember } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const { dentist, staff, clinic: cachedClinic, logout } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: clinicData } = useQuery<{ clinic: Clinic }>({
    queryKey: ['clinic'],
    queryFn: () => clinicApi.get().then((r) => r.data),
  });

  const { data: staffData } = useQuery<{ staff: StaffMember[] }>({
    queryKey: ['staff'],
    queryFn: () => staffApi.list().then((r) => r.data),
  });

  const clinic = clinicData?.clinic || cachedClinic;
  const staffList = staffData?.staff ?? [];
  const doctors = staffList.filter((s) => s.role === 'doctor');
  const receptionists = staffList.filter((s) => s.role === 'receptionist');

  const displayName = staff?.name || dentist?.name || '';
  const displayPhone = staff?.phone || dentist?.phone || '';
  const displayRole = staff?.role ? (staff.role === 'doctor' ? 'Doctor' : 'Receptionist') : 'Staff';

  const copyJoinCode = () => {
    if (!clinic?.join_code) return;
    navigator.clipboard.writeText(clinic.join_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handleLogout = () => {
    if (!confirm('Are you sure you want to logout?')) return;
    logout();
    router.replace('/login/');
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4">
        <h1 className="text-[22px] font-bold text-text-primary">Settings</h1>
      </div>

      <div className="px-5 py-5 pb-10 space-y-5">
        {/* Profile Card */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-4">
            <PatientAvatar name={displayName || 'Me'} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-text-primary">{displayName || 'Set up your profile'}</p>
              <p className="text-sm text-text-secondary">{displayRole}</p>
              <p className="text-xs text-text-secondary">{displayPhone}</p>
            </div>
          </div>
        </div>

        {/* Clinic Card */}
        {clinic && (
          <div>
            <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase px-1 mb-2">Clinic</p>
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
              {/* Clinic name + ID */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 bg-accent-light rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{clinic.name}</p>
                  <p className="text-xs text-text-secondary">{clinic.display_id}</p>
                </div>
              </div>

              <div className="h-px bg-divider" />

              {/* Join Code */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 bg-accent-light rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-0.5">Clinic Join Code</p>
                  <p className="text-xl font-bold text-accent tracking-widest font-mono">{clinic.join_code}</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">Share with staff to join this clinic</p>
                </div>
                <button
                  onClick={copyJoinCode}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-accent-light border border-accent/20 press-effect flex-shrink-0"
                >
                  {codeCopied
                    ? <Check className="w-4 h-4 text-success" />
                    : <Copy className="w-4 h-4 text-accent" />
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff List */}
        {staffList.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase px-1 mb-2">Staff</p>
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
              {doctors.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-surface-subtle">
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Doctors ({doctors.length})</p>
                  </div>
                  {doctors.map((s, i) => (
                    <div key={s.id}>
                      {i > 0 && <div className="h-px bg-divider mx-4" />}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <PatientAvatar name={s.name || 'Dr'} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{s.name || 'Unnamed'}</p>
                          <p className="text-xs text-text-secondary">{s.phone}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          s.status === 'active' ? 'bg-success-light text-success' : 'bg-surface-muted text-text-secondary'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {doctors.length > 0 && receptionists.length > 0 && <div className="h-px bg-divider" />}
              {receptionists.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-surface-subtle">
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Receptionists ({receptionists.length})</p>
                  </div>
                  {receptionists.map((s, i) => (
                    <div key={s.id}>
                      {i > 0 && <div className="h-px bg-divider mx-4" />}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <PatientAvatar name={s.name || 'RC'} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{s.name || 'Unnamed'}</p>
                          <p className="text-xs text-text-secondary">{s.phone}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          s.status === 'active' ? 'bg-success-light text-success' : 'bg-surface-muted text-text-secondary'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* App Settings */}
        <div>
          <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase px-1 mb-2">App</p>
          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 bg-surface-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-text-secondary" />
              </div>
              <span className="flex-1 text-sm text-text-primary">Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
            <div className="h-px bg-divider" />
            <button className="w-full flex items-center gap-3 px-4 py-3 press-effect">
              <div className="w-9 h-9 bg-surface-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-text-secondary" />
              </div>
              <span className="flex-1 text-sm text-text-primary text-left">About DentAI</span>
              <ChevronRight className="w-4 h-4 text-text-disabled" />
            </button>
            <div className="h-px bg-divider" />
            <button className="w-full flex items-center gap-3 px-4 py-3 press-effect">
              <div className="w-9 h-9 bg-surface-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-5 h-5 text-text-secondary" />
              </div>
              <span className="flex-1 text-sm text-text-primary text-left">Help &amp; Support</span>
              <ChevronRight className="w-4 h-4 text-text-disabled" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-surface rounded-xl border border-error/30 overflow-hidden shadow-sm">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 press-effect">
            <div className="w-9 h-9 bg-error-light rounded-lg flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-error" />
            </div>
            <span className="flex-1 text-sm font-medium text-error text-left">Logout</span>
          </button>
        </div>

        <p className="text-xs text-text-disabled text-center">DentAI v3.0 · Dental Clinic OS</p>
      </div>
    </div>
  );
}
