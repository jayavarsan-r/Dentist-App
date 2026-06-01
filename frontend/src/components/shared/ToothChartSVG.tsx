import type { ToothData } from '@/types';

interface ToothChartProps {
  toothData: ToothData[];
  onToothClick: (toothNum: string) => void;
  highlightedTooth?: string;
  compact?: boolean;
}

// FDI layout, displayed left→right
const UPPER = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

type ToothStatus = 'healthy' | 'completed' | 'in_progress' | 'upcoming' | 'needs_attention';

// Spec section 8.2 status colours
const STATUS_FILL: Record<ToothStatus, { fill: string; stroke: string; text: string }> = {
  healthy:         { fill: '#E8E5E1', stroke: '#D4D0CB', text: '#78716C' },
  completed:       { fill: '#C8D9C8', stroke: '#5F7A61', text: '#1C1917' },
  in_progress:     { fill: '#5F7A61', stroke: '#49614B', text: '#FFFFFF' },
  upcoming:        { fill: '#FEF3C7', stroke: '#FDE68A', text: '#1C1917' },
  needs_attention: { fill: '#FEE2E2', stroke: '#FCA5A5', text: '#1C1917' },
};

const HIGHLIGHT = { fill: '#49614B', stroke: '#1C1917', text: '#FFFFFF' };

function statusFor(td?: ToothData): ToothStatus {
  if (!td) return 'healthy';
  switch (td.overallStatus) {
    case 'treated': return 'completed';
    case 'pending': return 'upcoming';
    case 'treated_pending': return 'in_progress';
    default: return 'healthy';
  }
}

function category(toothNum: string): 'incisor' | 'canine' | 'premolar' | 'molar' | 'wisdom' {
  const pos = parseInt(toothNum.slice(-1), 10);
  if (pos <= 2) return 'incisor';
  if (pos === 3) return 'canine';
  if (pos <= 5) return 'premolar';
  if (pos <= 7) return 'molar';
  return 'wisdom';
}

const WIDTHS: Record<string, number> = { incisor: 13, canine: 14, premolar: 16, molar: 20, wisdom: 18 };

// Hand-crafted crown path centred at (cx, cy)
function crownPath(cat: string, cx: number, cy: number, w: number, h: number): string {
  const hw = w / 2;
  const top = cy - h / 2;
  const bot = cy + h / 2;
  const r = Math.min(4, w / 3);
  switch (cat) {
    case 'incisor':
      return `M ${cx - hw} ${top + r} Q ${cx - hw} ${top} ${cx - hw + r} ${top} L ${cx + hw - r} ${top} Q ${cx + hw} ${top} ${cx + hw} ${top + r} L ${cx + hw} ${bot - 2} Q ${cx} ${bot + 2} ${cx - hw} ${bot - 2} Z`;
    case 'canine':
      return `M ${cx - hw} ${top + r} Q ${cx - hw} ${top} ${cx - hw + r} ${top} L ${cx + hw - r} ${top} Q ${cx + hw} ${top} ${cx + hw} ${top + r} L ${cx + hw} ${bot - 6} L ${cx} ${bot + 3} L ${cx - hw} ${bot - 6} Z`;
    case 'premolar':
      return `M ${cx - hw} ${top + r} Q ${cx - hw} ${top} ${cx - hw + r} ${top} L ${cx + hw - r} ${top} Q ${cx + hw} ${top} ${cx + hw} ${top + r} L ${cx + hw} ${bot - 3} Q ${cx + hw / 2} ${bot + 2} ${cx} ${bot - 2} Q ${cx - hw / 2} ${bot + 2} ${cx - hw} ${bot - 3} Z`;
    default: // molar + wisdom: cusped top + bottom
      return `M ${cx - hw} ${top + 3} Q ${cx - hw} ${top} ${cx - hw + r} ${top} Q ${cx - hw / 2} ${top - 2} ${cx} ${top} Q ${cx + hw / 2} ${top - 2} ${cx + hw - r} ${top} Q ${cx + hw} ${top} ${cx + hw} ${top + 3} L ${cx + hw} ${bot - 3} Q ${cx + hw / 2} ${bot + 2} ${cx} ${bot - 2} Q ${cx - hw / 2} ${bot + 2} ${cx - hw} ${bot - 3} Z`;
  }
}

function Jaw({
  order, isUpper, dataMap, onToothClick, highlighted, compact,
}: {
  order: string[];
  isUpper: boolean;
  dataMap: Map<string, ToothData>;
  onToothClick: (n: string) => void;
  highlighted?: string;
  compact?: boolean;
}) {
  const pitch = compact ? 15 : 20;
  const pad = 10;
  const h = compact ? 24 : 34;
  const amp = compact ? 5 : 9;
  const rowH = h + (compact ? 18 : 24);
  const baseY = rowH / 2;
  const width = order.length * pitch + pad * 2;

  return (
    <svg viewBox={`0 0 ${width} ${rowH}`} width="100%" className="select-none" style={{ touchAction: 'manipulation' }}>
      {order.map((num, i) => {
        const cx = pad + i * pitch + pitch / 2;
        const t = (i - (order.length - 1) / 2) / ((order.length - 1) / 2);
        const arch = amp * (t * t);
        const cy = isUpper ? baseY + arch : baseY - arch;
        const cat = category(num);
        const w = (WIDTHS[cat] || 16) * (compact ? 0.72 : 1);
        const isHi = highlighted === num;
        const c = isHi ? HIGHLIGHT : STATUS_FILL[statusFor(dataMap.get(num))];
        const labelY = isUpper ? cy + h / 2 + (compact ? 8 : 10) : cy - h / 2 - (compact ? 4 : 5);
        return (
          <g
            key={num}
            onClick={() => onToothClick(num)}
            style={{ cursor: 'pointer', transformOrigin: `${cx}px ${cy}px`, transition: 'transform 120ms' }}
            className="tooth-g"
          >
            <path
              d={crownPath(cat, cx, cy, w, h)}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            {!compact && (
              <text x={cx} y={labelY} textAnchor="middle" fontSize={7} fontWeight={600} fill="#A8A29E">
                {num}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ToothChartSVG({ toothData, onToothClick, highlightedTooth, compact }: ToothChartProps) {
  const dataMap = new Map<string, ToothData>();
  toothData.forEach((td) => dataMap.set(td.toothNumber, td));

  return (
    <div className="select-none">
      <style>{`.tooth-g:active { transform: scale(1.1); }`}</style>

      {!compact && (
        <div className="flex flex-wrap gap-3 mb-3 justify-center">
          <Legend fill="#C8D9C8" stroke="#5F7A61" label="Treated" />
          <Legend fill="#FEF3C7" stroke="#FDE68A" label="Scheduled" />
          <Legend fill="#5F7A61" stroke="#49614B" label="In progress" />
          <Legend fill="#E8E5E1" stroke="#D4D0CB" label="Healthy" />
        </div>
      )}

      <Jaw order={UPPER} isUpper dataMap={dataMap} onToothClick={onToothClick} highlighted={highlightedTooth} compact={compact} />
      <div className={compact ? 'h-1' : 'h-2'} />
      <Jaw order={LOWER} isUpper={false} dataMap={dataMap} onToothClick={onToothClick} highlighted={highlightedTooth} compact={compact} />
    </div>
  );
}

function Legend({ fill, stroke, label }: { fill: string; stroke: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-3 h-3 rounded-[2px]" style={{ background: fill, border: `1px solid ${stroke}` }} />
      <span className="text-[10px] text-text-secondary">{label}</span>
    </div>
  );
}
