export default function ContentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-32 bg-[#1a1a1a] rounded-lg" />
        <div className="h-4 w-48 bg-[#1a1a1a] rounded mt-2" />
      </div>
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl">
        <div className="p-4 border-b border-[#2a2a2a] flex gap-3">
          <div className="flex-1 h-10 bg-[#0a0a0a] rounded-lg" />
          <div className="w-36 h-10 bg-[#0a0a0a] rounded-lg" />
          <div className="w-36 h-10 bg-[#0a0a0a] rounded-lg" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-[#0a0a0a] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
