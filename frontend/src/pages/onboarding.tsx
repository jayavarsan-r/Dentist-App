import { useState } from 'react';
import { useRouter } from 'next/router';
import { Building2, Users, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import AppButton from '@/components/shared/AppButton';
import { clinicAuthApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Dentist, StaffMember, Clinic } from '@/types';

type Screen = 'choice' | 'create' | 'join-code' | 'join-role';

export default function OnboardingPage() {
  const router = useRouter();
  const { setAuth, dentist } = useAuthStore();

  const [screen, setScreen] = useState<Screen>('choice');
  const [clinicName, setClinicName] = useState('');
  const [yourName, setYourName] = useState(dentist?.name || '');
  const [city, setCity] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinRole, setJoinRole] = useState<'doctor' | 'receptionist'>('doctor');
  const [foundClinic, setFoundClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!clinicName.trim() || !yourName.trim()) { setError('Clinic name and your name are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await clinicAuthApi.createClinic({ clinicName, yourName, city, phone: dentist?.phone });
      const { token, dentist: d, staff, clinic } = res.data;
      setAuth(token, d as Dentist, staff as StaffMember, clinic as Clinic);
      router.replace('/home/');
    } catch (e: any) { setError(e.message || 'Failed to create clinic'); }
    finally { setLoading(false); }
  };

  const handleLookup = async () => {
    if (joinCode.trim().length < 4) { setError('Enter your clinic join code'); return; }
    setLoading(true); setError('');
    try {
      const res = await clinicAuthApi.lookupClinic(joinCode.trim());
      setFoundClinic(res.data.clinic);
      setScreen('join-role');
    } catch (e: any) { setError(e.message || 'Clinic not found'); }
    finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!yourName.trim()) { setError('Enter your name'); return; }
    setLoading(true); setError('');
    try {
      const res = await clinicAuthApi.joinClinic({ joinCode: joinCode.trim(), yourName, role: joinRole });
      const { token, dentist: d, staff, clinic } = res.data;
      setAuth(token, d as Dentist, staff as StaffMember, clinic as Clinic);
      router.replace(joinRole === 'receptionist' ? '/reception/' : '/home/');
    } catch (e: any) { setError(e.message || 'Failed to join clinic'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        {screen !== 'choice' && (
          <button onClick={() => { setScreen('choice'); setError(''); setFoundClinic(null); }} className="mb-4 text-[#007AFF] flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        <div className="w-12 h-12 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-[28px] font-bold text-text-primary tracking-tight">
          {screen === 'choice'    ? 'Welcome to DentAI'    :
           screen === 'create'    ? 'Create your clinic'   :
           screen === 'join-code' ? 'Join a clinic'        :
           'Almost there'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {screen === 'choice'    ? 'Set up your clinic or join an existing one' :
           screen === 'create'    ? 'Your clinic data will be linked to this account' :
           screen === 'join-code' ? 'Enter the join code from your clinic owner' :
           `Joining ${foundClinic?.name || ''}`}
        </p>
      </div>

      <div className="px-5 flex-1">
        {/* ── CHOICE ── */}
        {screen === 'choice' && (
          <div className="space-y-3">
            <button
              onClick={() => setScreen('create')}
              className="w-full bg-surface rounded-2xl p-5 flex items-center gap-4 text-left press-effect"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-[#1C1C1E] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[17px] font-semibold text-text-primary">Create new clinic</p>
                <p className="text-sm text-text-secondary mt-0.5">I'm the clinic owner / first doctor</p>
              </div>
              <ArrowRight className="w-5 h-5 text-text-disabled" />
            </button>

            <button
              onClick={() => setScreen('join-code')}
              className="w-full bg-surface rounded-2xl p-5 flex items-center gap-4 text-left press-effect"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-[17px] font-semibold text-text-primary">Join existing clinic</p>
                <p className="text-sm text-text-secondary mt-0.5">I have a join code from my clinic</p>
              </div>
              <ArrowRight className="w-5 h-5 text-text-disabled" />
            </button>
          </div>
        )}

        {/* ── CREATE ── */}
        {screen === 'create' && (
          <div className="space-y-4">
            <Field label="Clinic name" value={clinicName} onChange={setClinicName} placeholder="e.g. Smile Dental Clinic" />
            <Field label="Your name" value={yourName} onChange={setYourName} placeholder="Dr. Firstname Lastname" />
            <Field label="City (optional)" value={city} onChange={setCity} placeholder="e.g. Chennai" />
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="pt-2">
              <AppButton onClick={handleCreate} isLoading={loading}>Create Clinic</AppButton>
            </div>
          </div>
        )}

        {/* ── JOIN CODE ── */}
        {screen === 'join-code' && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">Join Code</label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="e.g. X7P2K9"
                className="w-full h-[52px] text-center text-[22px] font-bold tracking-[0.2em] bg-surface border border-border rounded-xl focus:outline-none focus:border-[#1C1C1E]"
                autoCapitalize="characters"
              />
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <AppButton onClick={handleLookup} isLoading={loading}>Find Clinic</AppButton>
          </div>
        )}

        {/* ── JOIN ROLE ── */}
        {screen === 'join-role' && foundClinic && (
          <div className="space-y-4">
            <div className="bg-surface rounded-2xl p-4 flex items-center gap-3 mb-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div className="w-10 h-10 rounded-xl bg-success-light flex items-center justify-center">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-text-primary">{foundClinic.name}</p>
                {foundClinic.city && <p className="text-xs text-text-secondary">{foundClinic.city} · {foundClinic.display_id}</p>}
              </div>
            </div>

            <Field label="Your name" value={yourName} onChange={setYourName} placeholder="Enter your full name" />

            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">Your role</label>
              <div className="grid grid-cols-2 gap-3">
                {(['doctor', 'receptionist'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setJoinRole(r)}
                    className="h-[52px] rounded-xl font-semibold text-[15px] transition-all press-effect"
                    style={{
                      background: joinRole === r ? '#1C1C1E' : '#fff',
                      color: joinRole === r ? '#fff' : '#6E6E73',
                      border: joinRole === r ? 'none' : '1px solid #D1D1D6',
                    }}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-error">{error}</p>}
            <AppButton onClick={handleJoin} isLoading={loading}>Join Clinic</AppButton>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">{label}</label>
      <input
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-[52px] bg-surface border border-border rounded-xl px-4 text-[17px] text-text-primary focus:outline-none focus:border-[#1C1C1E] placeholder:text-text-disabled"
      />
    </div>
  );
}
