export default function CampaignsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-36 bg-[#1a1a1a] rounded-lg" />
          <div className="h-4 w-48 bg-[#1a1a1a] rounded mt-2" />
        </div>
        <div className="h-10 w-36 bg-[#1a1a1a] rounded-lg" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-[#111] border border-[#2a2a2a] rounded-xl" />
        ))}
      </div>
    </div>
  )
}
