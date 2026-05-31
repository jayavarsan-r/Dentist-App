import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { SlidersHorizontal, Plus, UserSearch } from 'lucide-react';
import { patientsApi } from '@/lib/api';
import PatientAvatar from '@/components/shared/PatientAvatar';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { PatientListShimmer } from '@/components/shared/LoadingShimmer';
import { SearchField } from '@/components/shared/AppTextField';
import { timeAgo } from '@/lib/utils';
import type { Patient } from '@/types';

const FILTERS = ['All', "Today's", 'Follow-ups'];

export default function PatientListPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery<{ patients: Patient[] }>({
    queryKey: ['patients', debouncedSearch],
    queryFn: () => patientsApi.list(debouncedSearch || undefined).then((r) => r.data),
  });

  const patients = data?.patients ?? [];
  const today = new Date().toISOString().split('T')[0];

  const filtered = patients.filter((p) => {
    if (filter === "Today's") {
      return p.appointments?.some((a) => a.appointment_date === today);
    }
    if (filter === 'Follow-ups') {
      return p.visits?.some((v) => v.follow_up_date && !v.follow_up_done && v.follow_up_date <= today);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-app-bg">
      {/* AppBar */}
      <div className="bg-app-surface border-b border-app-border px-5 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[22px] font-bold text-text-primary">Patients</h1>
          <button className="p-2 text-text-secondary">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
        <SearchField hint="Search by name or phone number..." value={search} onChange={setSearch} />

        {/* Filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 h-9 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-app-surface-variant text-text-secondary border border-app-border'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-app-surface">
        {isLoading ? (
          <PatientListShimmer />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={UserSearch}
            title="No patients found"
            subtitle="Try a different search, or add a new patient"
            ctaLabel="Add Patient"
            onCta={() => router.push('/patients/add/')}
          />
        ) : (
          filtered.map((patient, i) => {
            const lastVisit = patient.visits?.sort((a, b) => b.visit_date.localeCompare(a.visit_date))[0];
            return (
              <div key={patient.id}>
                {i > 0 && <div className="h-px bg-app-divider mx-5" />}
                <button
                  onClick={() => router.push(`/patients/${patient.id}/`)}
                  className="w-full flex items-center gap-3.5 px-5 py-4 hover:bg-app-surface-variant transition-colors"
                >
                  <PatientAvatar name={patient.name} size="md" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-text-primary truncate">{patient.name}</p>
                    <p className="text-xs text-text-secondary truncate">
                      {lastVisit ? `Last visit: ${timeAgo(lastVisit.visit_date)}` : patient.phone}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {lastVisit && <StatusBadge status={lastVisit.status} />}
                    <span className="text-text-disabled text-lg">›</span>
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={() => router.push('/patients/add/')}
        className="fixed bottom-20 right-5 flex items-center gap-2 bg-primary text-white px-5 py-3.5 rounded-2xl shadow-primary press-effect"
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm font-semibold">Add Patient</span>
      </button>
    </div>
  );
}
