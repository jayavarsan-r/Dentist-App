import type { ToothData } from '@/types';

interface ToothChartProps {
  toothData: ToothData[];
  onToothClick: (toothNum: string) => void;
  highlightedTooth?: string;
  compact?: boolean;
}

// FDI layout: each entry is [toothNumber, position]
// Upper jaw displayed left→right: Q1 (18→11) | midline | Q2 (21→28)
// Lower jaw displayed left→right: Q4 (48→41) | midline | Q3 (31→38)

const UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11']; // Q1
const UPPER_LEFT  = ['21', '22', '23', '24', '25', '26', '27', '28']; // Q2
const LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41']; // Q4
const LOWER_LEFT  = ['31', '32', '33', '34', '35', '36', '37', '38']; // Q3

function getToothWidth(toothNum: string, compact: boolean): string {
  const pos = parseInt(toothNum.slice(-1)); // last digit = position in quadrant
  if (compact) {
    if (pos >= 6) return 'w-5';
    if (pos >= 4) return 'w-4';
    return 'w-3.5';
  }
  if (pos >= 6) return 'w-6';
  if (pos >= 4) return 'w-5';
  return 'w-4';
}

function getToothColor(toothNum: string, toothDataMap: Map<string, ToothData>, highlighted?: string): {
  bg: string; border: string; text: string;
} {
  if (highlighted === toothNum) {
    return { bg: 'bg-primary', border: 'border-primary', text: 'text-white' };
  }
  const data = toothDataMap.get(toothNum);
  if (!data) return { bg: 'bg-app-surface-variant', border: 'border-app-border', text: 'text-text-disabled' };

  switch (data.overallStatus) {
    case 'treated':
      return { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' };
    case 'pending':
      return { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700' };
    case 'treated_pending':
      return { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-700' };
    default:
      return { bg: 'bg-app-surface-variant', border: 'border-app-border', text: 'text-text-disabled' };
  }
}

function ToothBox({
  num,
  toothDataMap,
  onClick,
  highlighted,
  compact,
}: {
  num: string;
  toothDataMap: Map<string, ToothData>;
  onClick: (n: string) => void;
  highlighted?: string;
  compact?: boolean;
}) {
  const widthClass = getToothWidth(num, !!compact);
  const heightClass = compact ? 'h-5' : 'h-7';
  const { bg, border, text } = getToothColor(num, toothDataMap, highlighted);
  const fontSize = compact ? 'text-[7px]' : 'text-[8px]';

  return (
    <button
      onClick={() => onClick(num)}
      className={`${widthClass} ${heightClass} rounded-[3px] border ${bg} ${border} flex items-center justify-center mx-px transition-all active:scale-90`}
      title={`Tooth ${num}`}
    >
      <span className={`${fontSize} font-bold ${text} leading-none`}>{num}</span>
    </button>
  );
}

function ArchRow({
  left,
  right,
  toothDataMap,
  onClick,
  highlighted,
  compact,
  label,
}: {
  left: string[];
  right: string[];
  toothDataMap: Map<string, ToothData>;
  onClick: (n: string) => void;
  highlighted?: string;
  compact?: boolean;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-center">
      {/* Left quadrant (visually on the left = patient's right) */}
      <div className="flex items-center">
        {left.map((n) => (
          <ToothBox key={n} num={n} toothDataMap={toothDataMap} onClick={onClick} highlighted={highlighted} compact={compact} />
        ))}
      </div>

      {/* Midline */}
      <div className={`${compact ? 'h-5' : 'h-7'} w-px bg-app-border mx-1 flex-shrink-0`} />

      {/* Right quadrant */}
      <div className="flex items-center">
        {right.map((n) => (
          <ToothBox key={n} num={n} toothDataMap={toothDataMap} onClick={onClick} highlighted={highlighted} compact={compact} />
        ))}
      </div>
    </div>
  );
}

export default function ToothChart({ toothData, onToothClick, highlightedTooth, compact }: ToothChartProps) {
  const toothDataMap = new Map<string, ToothData>();
  toothData.forEach((td) => toothDataMap.set(td.toothNumber, td));

  return (
    <div className="select-none">
      {/* Legend */}
      {!compact && (
        <div className="flex flex-wrap gap-3 mb-3 justify-center">
          <LegendItem color="bg-blue-100 border-blue-400" label="Treated" />
          <LegendItem color="bg-amber-100 border-amber-400" label="Scheduled" />
          <LegendItem color="bg-teal-100 border-teal-400" label="Both" />
          <LegendItem color="bg-app-surface-variant border-app-border" label="Healthy" />
        </div>
      )}

      {/* Quadrant labels */}
      {!compact && (
        <div className="flex justify-between px-2 mb-0.5">
          <span className="text-[9px] text-text-disabled font-medium">UR (Q1)</span>
          <span className="text-[9px] text-text-disabled font-medium">UL (Q2)</span>
        </div>
      )}

      {/* Upper jaw */}
      <ArchRow
        left={UPPER_RIGHT}
        right={UPPER_LEFT}
        toothDataMap={toothDataMap}
        onClick={onToothClick}
        highlighted={highlightedTooth}
        compact={compact}
      />

      {/* Gap between arches */}
      <div className={compact ? 'my-1' : 'my-1.5'} />

      {/* Lower jaw */}
      <ArchRow
        left={LOWER_RIGHT}
        right={LOWER_LEFT}
        toothDataMap={toothDataMap}
        onClick={onToothClick}
        highlighted={highlightedTooth}
        compact={compact}
      />

      {/* Quadrant labels */}
      {!compact && (
        <div className="flex justify-between px-2 mt-0.5">
          <span className="text-[9px] text-text-disabled font-medium">LR (Q4)</span>
          <span className="text-[9px] text-text-disabled font-medium">LL (Q3)</span>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-3 h-3 rounded-[2px] border ${color}`} />
      <span className="text-[10px] text-text-secondary">{label}</span>
    </div>
  );
}
