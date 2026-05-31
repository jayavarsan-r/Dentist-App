import { useState } from 'react';
import { useRouter } from 'next/router';
import { Stethoscope } from 'lucide-react';
import AppButton from '@/components/shared/AppButton';
import { AppTextField } from '@/components/shared/AppTextField';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { setPendingPhone } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.sendOtp(phone);
      setPendingPhone(phone);
      router.push('/otp/');
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      {/* Top hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div
          className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-5"
          style={{ background: 'linear-gradient(135deg, #1B70F8, #0891B2)' }}
        >
          <Stethoscope className="w-11 h-11 text-white" />
        </div>
        <h1 className="text-[28px] font-bold text-text-primary tracking-tight mb-1.5">DentAI</h1>
        <p className="text-sm text-text-secondary text-center">Smart dental practice management</p>
      </div>

      {/* Bottom card */}
      <div
        className="bg-app-surface px-7 pt-8 pb-8"
        style={{ borderRadius: '28px 28px 0 0' }}
      >
        <h2 className="text-[22px] font-bold text-text-primary mb-1">Welcome back 👋</h2>
        <p className="text-sm text-text-secondary mb-8">Login to continue to your practice</p>

        <p className="text-sm font-medium text-text-primary mb-2">Mobile Number</p>
        <div className="flex gap-2 mb-6">
          <div className="h-[52px] px-4 flex items-center bg-white border-[1.5px] border-app-border rounded-md text-base font-medium text-text-secondary whitespace-nowrap">
            +91
          </div>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter mobile number"
            className="flex-1 h-[52px] bg-white border-[1.5px] border-app-border rounded-md px-4 text-base text-text-primary placeholder:text-text-disabled focus:border-primary focus:bg-primary-subtle transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>

        {error && <p className="text-sm text-error mb-4">{error}</p>}

        <AppButton onClick={handleSend} isLoading={loading}>
          Send OTP
        </AppButton>

        <p className="text-xs text-text-disabled text-center mt-4">
          By continuing, you agree to our{' '}
          <span className="text-text-link">Terms</span> &amp;{' '}
          <span className="text-text-link">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
