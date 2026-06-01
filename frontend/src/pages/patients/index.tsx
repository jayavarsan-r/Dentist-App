import { useState, useEffect, useMemo, useRef } from 'react';
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
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

export default function PatientListPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Home search shortcut passes ?focus=1 to auto-focus the search field
  const autoFocus = router.query.focus === '1';

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

  // Group alphabetically by first letter of name (non A–Z → '#')
  const grouped = useMemo(() => {
    const letterOf = (name: string) => {
      const c = (name.trim()[0] || '#').toUpperCase();
      return /[A-Z]/.test(c) ? c : '#';
    };
    const sorted = [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    const map: Record<string, Patient[]> = {};
    for (const p of sorted) {
      const l = letterOf(p.name);
      (map[l] ??= []).push(p);
    }
    return map;
  }, [filtered]);

  const presentLetters = ALPHABET.filter((l) => grouped[l]?.length);

  const jumpTo = (letter: string) => {
    const el = sectionRefs.current[letter];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveLetter(letter);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* AppBar */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-text-primary">Patients</h1>
          <button className="p-2 text-text-secondary">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
        <SearchField hint="Search by name or phone number..." value={search} onChange={setSearch} autoFocus={autoFocus} />

        {/* Filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 h-9 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-accent text-white'
                  : 'bg-surface-muted text-text-secondary border border-border'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List + A–Z index */}
      <div className="relative">
        <div className="bg-surface">
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
            presentLetters.map((letter) => (
              <div key={letter} ref={(el) => { sectionRefs.current[letter] = el; }}>
                {/* Section header */}
                <div className="text-xs font-semibold text-text-secondary uppercase px-5 py-2 bg-surface-subtle sticky top-[124px] z-[5]">
                  {letter}
                </div>
                {grouped[letter].map((patient, i) => {
                  const lastVisit = patient.visits?.sort((a, b) => b.visit_date.localeCompare(a.visit_date))[0];
                  return (
                    <div key={patient.id}>
                      {i > 0 && <div className="h-px bg-divider mx-5" />}
                      <button
                        onClick={() => router.push(`/patients/${patient.id}/`)}
                        className="w-full flex items-center gap-3.5 px-5 py-4 hover:bg-accent-subtle transition-colors"
                      >
                        <PatientAvatar name={patient.name} size="md" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-text-primary truncate">{patient.name}</p>
                          <p className="text-xs text-text-secondary truncate">
                            {lastVisit ? `Last: ${timeAgo(lastVisit.visit_date)}` : patient.phone}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {lastVisit && <StatusBadge status={lastVisit.status} />}
                          <span className="text-text-disabled text-lg">›</span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* A–Z index strip */}
        {!isLoading && presentLetters.length > 1 && (
          <div className="fixed right-0.5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 py-2">
            {presentLetters.map((letter) => (
              <button
                key={letter}
                onClick={() => jumpTo(letter)}
                className={`w-4 text-[10px] leading-tight font-medium ${
                  activeLetter === letter ? 'text-accent font-bold' : 'text-text-disabled'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push('/patients/add/')}
        className="fixed bottom-20 right-5 flex items-center gap-2 bg-accent text-white px-5 py-3.5 rounded-2xl shadow-primary press-effect z-20"
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm font-semibold">Add Patient</span>
      </button>
    </div>
  );
}
