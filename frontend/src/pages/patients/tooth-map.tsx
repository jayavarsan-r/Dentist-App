import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { ArrowLeft, IndianRupee, ChevronRight } from 'lucide-react';
import { patientsApi } from '@/lib/api';
import ToothChart from '@/components/shared/ToothChart';
import ToothDetailSheet from '@/components/shared/ToothDetailSheet';
import EmptyState from '@/components/shared/EmptyState';
import type { ToothHistoryResponse, ToothData } from '@/types';
import { Map } from 'lucide-react';

export default function ToothMapPage() {
  const router = useRouter();
  const { id, name } = router.query as { id: string; name: string };
  const [selectedTooth, setSelectedTooth] = useState<ToothData | null>(null);

  const { data, isLoading } = useQuery<ToothHistoryResponse>({
    queryKey: ['toothHistory', id],
    queryFn: () => patientsApi.toothHistory(id).then((r) => r.data),
    enabled: !!id,
  });

  const handleToothClick = (toothNum: string) => {
    if (!data) return;
    const td = data.toothMap.find((t) => t.toothNumber === toothNum);
    if (td) setSelectedTooth(td);
  };

  const treatedCount = data?.toothMap.filter(
    (t) => t.overallStatus === 'treated' || t.overallStatus === 'treated_pending'
  ).length ?? 0;

  const scheduledCount = data?.toothMap.filter(
    (t) => t.overallStatus === 'pending' || t.overallStatus === 'treated_pending'
  ).length ?? 0;

  return (
    <div className="min-h-screen bg-app-bg">
      {/* AppBar */}
      <div className="bg-app-surface border-b border-app-border px-5 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-text-primary">Tooth Map</h1>
            {name && <p className="text-xs text-text-secondary truncate">{name}</p>}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 pb-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex gap-3 mb-5">
              <div className="flex-1 bg-blue-100 rounded-xl px-4 py-3">
                <p className="text-xl font-bold text-blue-700">{treatedCount}</p>
                <p className="text-xs text-blue-600">Treated</p>
              </div>
              <div className="flex-1 bg-amber-100 rounded-xl px-4 py-3">
                <p className="text-xl font-bold text-amber-700">{scheduledCount}</p>
                <p className="text-xs text-amber-600">Scheduled</p>
              </div>
              <div className="flex-1 bg-success-light rounded-xl px-4 py-3">
                <p className="text-xl font-bold text-success">
                  ₹{(data?.totalBilled ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-success/80">Total Billed</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-app-surface rounded-xl border border-app-border shadow-card p-5 mb-5">
              <p className="text-xs font-semibold text-text-secondary mb-4 text-center tracking-wide uppercase">
                Tap any tooth for details
              </p>
              <ToothChart
                toothData={data?.toothMap ?? []}
                onToothClick={handleToothClick}
                highlightedTooth={selectedTooth?.toothNumber}
              />
            </div>

            {/* Treated teeth list */}
            {data && data.toothMap.length > 0 ? (
              <>
                <p className="text-[11px] font-semibold text-text-secondary tracking-widest uppercase mb-3">
                  Teeth with Records ({data.toothMap.length})
                </p>
                <div className="space-y-2">
                  {data.toothMap.map((tooth) => (
                    <button
                      key={tooth.toothNumber}
                      onClick={() => setSelectedTooth(tooth)}
                      className="w-full bg-app-surface rounded-xl border border-app-border shadow-card px-4 py-3.5 flex items-center gap-4 text-left press-effect"
                    >
                      {/* Tooth number circle */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tooth.overallStatus === 'treated' ? 'bg-blue-100' :
                        tooth.overallStatus === 'pending' ? 'bg-amber-100' : 'bg-teal-100'
                      }`}>
                        <span className={`text-sm font-bold ${
                          tooth.overallStatus === 'treated' ? 'text-blue-700' :
                          tooth.overallStatus === 'pending' ? 'text-amber-700' : 'text-teal-700'
                        }`}>{tooth.toothNumber}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary">Tooth {tooth.toothNumber}</p>
                          <StatusDot status={tooth.overallStatus} />
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {tooth.completedProcedures.length} procedure{tooth.completedProcedures.length !== 1 ? 's' : ''}
                          {tooth.completedProcedures[0] && ` • ${tooth.completedProcedures[0].procedure}`}
                        </p>
                        {tooth.lastProcedureDate && (
                          <p className="text-[10px] text-text-disabled mt-0.5">
                            Last: {new Date(tooth.lastProcedureDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {tooth.totalCost > 0 && (
                          <span className="text-sm font-bold text-success">
                            ₹{tooth.totalCost.toLocaleString('en-IN')}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-text-disabled" />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                icon={Map}
                title="No tooth records yet"
                subtitle="Record visits with tooth numbers to see them here"
              />
            )}
          </>
        )}
      </div>

      <ToothDetailSheet tooth={selectedTooth} onClose={() => setSelectedTooth(null)} />
    </div>
  );
}

function StatusDot({ status }: { status: ToothData['overallStatus'] }) {
  const configs = {
    treated: { label: 'Treated', bg: 'bg-blue-500' },
    pending: { label: 'Scheduled', bg: 'bg-amber-500' },
    treated_pending: { label: 'Treated + Scheduled', bg: 'bg-teal-500' },
  };
  const cfg = configs[status];
  return (
    <span className={`w-1.5 h-1.5 rounded-full ${cfg.bg} flex-shrink-0`} />
  );
}
