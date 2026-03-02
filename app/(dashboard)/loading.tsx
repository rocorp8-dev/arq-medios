export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-40 bg-[#1a1a1a] rounded-lg" />
        <div className="h-4 w-64 bg-[#1a1a1a] rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5 space-y-3">
            <div className="h-5 w-5 bg-[#1a1a1a] rounded" />
            <div className="h-8 w-16 bg-[#1a1a1a] rounded" />
            <div className="h-4 w-24 bg-[#1a1a1a] rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111] border border-[#2a2a2a] rounded-xl p-6 h-64" />
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 h-64" />
      </div>
    </div>
  )
}
