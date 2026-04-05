export default function TrendsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-[#1a1a1a] rounded-lg" />
          <div className="h-4 w-64 bg-[#1a1a1a] rounded mt-2" />
        </div>
      </div>
      {/* Keyword pills skeleton */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-24 bg-[#1a1a1a] rounded-full" />
        ))}
      </div>
      {/* Article cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-[#111] border border-[#2a2a2a] rounded-xl" />
        ))}
      </div>
    </div>
  )
}
