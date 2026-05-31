import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Phone, Stethoscope, AlertTriangle } from 'lucide-react';
import AppButton from '@/components/shared/AppButton';
import { AppTextField } from '@/components/shared/AppTextField';
import { patientsApi } from '@/lib/api';

const GENDERS = ['Male', 'Female', 'Other'];

export default function AddPatientPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', phone: '', age: '', gender: '',
    medical_conditions: '', allergies: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Patient name is required';
    if (!/^\d{10}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit phone';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await patientsApi.create({
        name: form.name.trim(),
        phone: form.phone,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender.toLowerCase() || null,
        medical_conditions: form.medical_conditions || null,
        allergies: form.allergies || null,
      });
      qc.invalidateQueries({ queryKey: ['patients'] });
      router.back();
    } catch (e: any) {
      setErrors({ global: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg">
      {/* AppBar */}
      <div className="bg-app-surface border-b border-app-border px-5 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">New Patient</h1>
        </div>
      </div>

      <div className="px-5 py-5 pb-36 space-y-4">
        {/* Basic Info */}
        <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase">Basic Information</p>

        <AppTextField
          label="Patient Name *"
          hint="Full name"
          prefixIcon={<User className="w-5 h-5" />}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <AppTextField
              label="+91 Phone *"
              hint="Mobile number"
              prefixIcon={<Phone className="w-5 h-5" />}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              error={errors.phone}
            />
          </div>
          <div className="w-24">
            <AppTextField
              label="Age"
              hint="Age"
              type="number"
              inputMode="numeric"
              value={form.age}
              onChange={(e) => set('age', e.target.value)}
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <p className="text-sm font-medium text-text-primary mb-2">Gender</p>
          <div className="flex gap-2.5">
            {GENDERS.map((g) => (
              <button
                key={g}
                onClick={() => set('gender', g)}
                className={`flex-1 h-11 rounded-full text-sm font-medium transition-colors ${
                  form.gender === g
                    ? 'bg-primary text-white'
                    : 'bg-app-surface-variant text-text-secondary border border-app-border'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Medical Info */}
        <div className="pt-2">
          <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase">Medical Information</p>
          <p className="text-xs text-text-disabled mt-0.5 mb-4">Optional — helps with treatment planning</p>

          <AppTextField
            label="Medical Conditions"
            hint="e.g. Diabetes, Hypertension, Blood pressure"
            prefixIcon={<Stethoscope className="w-5 h-5" />}
            textarea
            rows={2}
            value={form.medical_conditions}
            onChange={(e: any) => set('medical_conditions', e.target.value)}
          />

          <div className="mt-4">
            <AppTextField
              label="Known Allergies"
              hint="e.g. Penicillin, Latex, Ibuprofen"
              prefixIcon={<AlertTriangle className="w-5 h-5" />}
              textarea
              rows={2}
              value={form.allergies}
              onChange={(e: any) => set('allergies', e.target.value)}
            />
            {form.allergies && (
              <div className="mt-2 flex items-center gap-2 bg-error-light border border-error-border rounded-md px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />
                <span className="text-xs text-error">⚠ Allergy recorded</span>
              </div>
            )}
          </div>
        </div>

        {errors.global && <p className="text-sm text-error">{errors.global}</p>}
      </div>

      {/* Sticky Bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-app-surface border-t border-app-border px-5 py-4 pb-6">
        <AppButton onClick={handleSave} isLoading={loading}>Save Patient</AppButton>
        <p className="text-xs text-text-disabled text-center mt-2">* Required fields</p>
      </div>
    </div>
  );
}
