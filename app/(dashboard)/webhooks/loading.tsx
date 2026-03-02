export default function WebhooksLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-32 bg-[#1a1a1a] rounded-lg" />
        <div className="h-4 w-56 bg-[#1a1a1a] rounded mt-2" />
      </div>
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
        <div className="h-5 w-40 bg-[#1a1a1a] rounded" />
        <div className="h-10 bg-[#0a0a0a] rounded-lg" />
        <div className="h-10 w-24 bg-[#1a1a1a] rounded-lg" />
      </div>
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-[#0a0a0a] rounded-lg" />
        ))}
      </div>
    </div>
  )
}
