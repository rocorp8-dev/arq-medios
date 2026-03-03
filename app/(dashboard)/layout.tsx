import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-200 font-sans selection:bg-indigo-500/30">
      <Sidebar />
      <div className="md:ml-[280px]">
        <Header />
        <main className="min-h-[calc(100vh-73px)] p-6 lg:p-10 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/[0.06] rounded-full blur-[80px] -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-fuchsia-500/[0.06] rounded-full blur-[80px] -z-10 pointer-events-none" />

          {children}
        </main>
      </div>
    </div>
  )
}
