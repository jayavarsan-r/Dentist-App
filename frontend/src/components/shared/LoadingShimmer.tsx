export function PatientListShimmer() {
  return (
    <div className="bg-surface">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 px-5 py-4 border-b border-divider">
          <div className="shimmer w-11 h-11 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <div className="shimmer h-4 w-40 rounded mb-2" />
            <div className="shimmer h-3 w-28 rounded" />
          </div>
          <div className="shimmer h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function StatCardShimmer() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="shimmer h-[88px] rounded-lg" />
      ))}
    </div>
  );
}

export function ProfileShimmer() {
  return (
    <div className="p-5">
      <div className="flex gap-4 mb-6">
        <div className="shimmer w-[68px] h-[68px] rounded-full" />
        <div className="flex-1">
          <div className="shimmer h-6 w-40 rounded mb-2" />
          <div className="shimmer h-4 w-28 rounded" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="shimmer h-20 rounded-md mb-3" />
      ))}
    </div>
  );
}
