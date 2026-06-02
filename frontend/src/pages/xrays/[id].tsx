import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { xraysApi } from '@/lib/api';
import EmptyState from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import type { XRay } from '@/types';

const XRAY_TYPES = ['OPG', 'RVG', 'CBCT', 'Photo', 'Other'] as const;

export default function XRayPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id: patientId, patientName } = router.query as { id: string; patientName?: string };

  const [filter, setFilter] = useState<string>('All');
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [xrayType, setXrayType] = useState<string>('OPG');
  const [toothNumber, setToothNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedXray, setSelectedXray] = useState<{ url: string; xray: XRay } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useQuery<{ xrays: XRay[] }>({
    queryKey: ['xrays', patientId],
    queryFn: () => xraysApi.listForPatient(patientId).then(r => r.data),
    enabled: !!patientId,
  });

  const xrays = data?.xrays || [];
  const filtered = filter === 'All' ? xrays : xrays.filter(x => x.xray_type === filter);

  const uploadFile = async (file: File) => {
    if (!file || !patientId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId);
      formData.append('xrayType', xrayType);
      if (toothNumber) formData.append('toothNumber', toothNumber);
      if (notes) formData.append('notes', notes);
      await xraysApi.upload(formData);
      await refetch();
      qc.invalidateQueries({ queryKey: ['patient', patientId] });
      setShowUploadSheet(false);
      setToothNumber(''); setNotes('');
    } catch (e: any) {
      alert(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const openSignedUrl = async (xray: XRay) => {
    try {
      const res = await xraysApi.getSignedUrl(xray.id);
      setSelectedXray({ url: res.data.url, xray });
    } catch { alert('Failed to load image'); }
  };

  const handleDelete = async (xray: XRay) => {
    if (!confirm(`Delete this ${xray.xray_type}?`)) return;
    try {
      await xraysApi.delete(xray.id);
      await refetch();
      qc.invalidateQueries({ queryKey: ['patient', patientId] });
    } catch (e: any) { alert(e.message || 'Delete failed'); }
  };

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-text-primary">X-Rays &amp; Photos</h1>
        <button onClick={() => setShowUploadSheet(true)} className="p-2 text-accent">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : xrays.length === 0 ? (
        <div className="px-5 py-8">
          <EmptyState
            icon={ImageIcon}
            title="No X-rays uploaded"
            subtitle="Upload OPG, RVG, CBCT or treatment photos"
            ctaLabel="Upload First X-ray"
            onCta={() => setShowUploadSheet(true)}
          />
        </div>
      ) : (
        <>
          {/* Filter Chips */}
          <div className="bg-surface border-b border-border px-5 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['All', ...XRAY_TYPES].map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold border transition-colors ${
                    filter === t ? 'bg-accent-light border-accent text-accent' : 'bg-surface border-border text-text-secondary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-2.5 p-4">
            {filtered.map(xray => (
              <button key={xray.id} onClick={() => openSignedUrl(xray)} className="bg-surface border border-border rounded-xl overflow-hidden text-left shadow-card">
                <div className="h-28 bg-surface-muted flex items-center justify-center relative">
                  <ImageIcon className="w-8 h-8 text-text-disabled" />
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(xray); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-error-light rounded-full flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3 text-error" />
                  </button>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] font-semibold bg-accent-light text-accent px-1.5 py-0.5 rounded-full">{xray.xray_type}</span>
                  <p className="text-[11px] text-text-secondary mt-1">{formatDate(xray.date_taken)}</p>
                  {xray.tooth_number && <p className="text-[11px] text-accent font-medium">Tooth {xray.tooth_number}</p>}
                  {xray.notes && <p className="text-[11px] text-text-disabled truncate">{xray.notes}</p>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowUploadSheet(true)}
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-accent shadow-primary flex items-center justify-center press-effect z-10"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Upload Sheet */}
      {showUploadSheet && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => !uploading && setShowUploadSheet(false)}>
          <div className="bg-surface rounded-t-2xl w-full max-w-lg mx-auto p-6 pb-10 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Upload X-Ray or Photo</h3>
              {!uploading && <button onClick={() => setShowUploadSheet(false)}><X className="w-5 h-5 text-text-secondary" /></button>}
            </div>

            <div>
              <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-2">Type</p>
              <div className="flex flex-wrap gap-2">
                {XRAY_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setXrayType(t)}
                    className={`px-3 h-8 rounded-full text-xs font-semibold border transition-colors ${
                      xrayType === t ? 'bg-accent-light border-accent text-accent' : 'bg-surface-muted border-border text-text-secondary'
                    }`}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-1 block">Tooth Number (optional)</label>
              <input
                type="text" value={toothNumber} onChange={e => setToothNumber(e.target.value)}
                placeholder="e.g. 26"
                className="w-full h-10 bg-surface-muted border border-border rounded-xl px-3 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-1 block">Notes (optional)</label>
              <input
                type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Observations"
                className="w-full h-10 bg-surface-muted border border-border rounded-xl px-3 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-12 bg-accent text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 press-effect shadow-primary-sm disabled:opacity-50"
            >
              {uploading ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '📁 Choose from Gallery'}
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-12 bg-accent-light border border-accent text-accent rounded-xl text-sm font-semibold flex items-center justify-center gap-2 press-effect disabled:opacity-50"
            >
              📷 Take Photo
            </button>
          </div>
        </div>
      )}

      {/* Full-screen Image Viewer */}
      {selectedXray && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 pt-12 pb-4">
            <button onClick={() => setSelectedXray(null)} className="p-1 text-white/70">
              <X className="w-6 h-6" />
            </button>
            <span className="text-sm font-medium text-white">{selectedXray.xray.xray_type} — {formatDate(selectedXray.xray.date_taken)}</span>
            <button onClick={() => handleDelete(selectedXray.xray).then(() => setSelectedXray(null))} className="p-1 text-error">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={selectedXray.url} alt="X-ray" className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
          {(selectedXray.xray.notes || selectedXray.xray.tooth_number) && (
            <div className="px-5 py-4 bg-white/10">
              {selectedXray.xray.tooth_number && <p className="text-sm text-white font-medium">Tooth {selectedXray.xray.tooth_number}</p>}
              {selectedXray.xray.notes && <p className="text-sm text-white/70">{selectedXray.xray.notes}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
