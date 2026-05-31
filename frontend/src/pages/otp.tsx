import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import AppButton from '@/components/shared/AppButton';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Dentist } from '@/types';

export default function OtpPage() {
  const router = useRouter();
  const { pendingPhone, setAuth } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!pendingPhone) router.replace('/login/');
  }, [pendingPhone, router]);

  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (next.every((d) => d) && val) {
      verify(next.join(''));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const verify = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyOtp(pendingPhone, code);
      const { token, dentist } = res.data;
      setAuth(token, dentist as Dentist);
      router.replace('/home/');
    } catch (e: any) {
      setError(e.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await authApi.sendOtp(pendingPhone);
      setCountdown(30);
      setOtp(['', '', '', '', '', '']);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-surface px-6 py-4">
      <button onClick={() => router.back()} className="p-2 -ml-2 text-text-primary">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex flex-col items-center mt-10">
        <div className="w-16 h-16 bg-primary-surface rounded-2xl flex items-center justify-center mb-5">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-[22px] font-bold text-text-primary text-center mb-2">Verify your number</h2>
        <p className="text-sm text-text-secondary text-center">
          Code sent to +91 {pendingPhone}
        </p>
      </div>

      <div className="flex justify-center gap-3 mt-10">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-12 h-14 text-center text-[22px] font-semibold rounded-md transition-all border-2 bg-app-surface-variant focus:outline-none ${
              digit ? 'border-primary bg-primary-surface' : 'border-app-border'
            } focus:border-primary focus:bg-primary-subtle`}
          />
        ))}
      </div>

      {error && <p className="text-center text-sm text-error mt-4">{error}</p>}

      <div className="mt-8">
        <AppButton
          onClick={() => verify(otp.join(''))}
          isLoading={loading}
          disabled={otp.some((d) => !d)}
        >
          Verify OTP
        </AppButton>
      </div>

      <div className="flex justify-center items-center gap-1 mt-6">
        <span className="text-xs text-text-secondary">Didn&apos;t receive it?</span>
        {countdown > 0 ? (
          <span className="text-xs text-text-disabled">Resend ({countdown}s)</span>
        ) : (
          <button onClick={resend} disabled={resending} className="text-xs font-semibold text-primary">
            Resend OTP
          </button>
        )}
      </div>
    </div>
  );
}
