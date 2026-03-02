export default function ContentDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg" />
        <div>
          <div className="h-7 w-64 bg-[#1a1a1a] rounded-lg" />
          <div className="h-4 w-32 bg-[#1a1a1a] rounded mt-2" />
        </div>
      </div>
      <div className="h-12 w-80 bg-[#111] border border-[#2a2a2a] rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="aspect-[4/5] bg-[#111] border border-[#2a2a2a] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
