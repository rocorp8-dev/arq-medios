export default function TopicsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 bg-[#1a1a1a] rounded-lg" />
          <div className="h-4 w-40 bg-[#1a1a1a] rounded mt-2" />
        </div>
        <div className="h-10 w-32 bg-[#1a1a1a] rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-40 bg-[#111] border border-[#2a2a2a] rounded-xl" />
        ))}
      </div>
    </div>
  )
}
