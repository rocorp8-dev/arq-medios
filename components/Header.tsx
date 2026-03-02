import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/actions/auth'
import { LogOut, Bell, Search } from 'lucide-react'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let fullName = 'Usuario'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    fullName = profile?.full_name || user.email || 'Creador Viral'
  }

  return (
    <header className="sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-[#222] px-6 py-4 z-30 flex items-center justify-between shadow-xl">
      <div className="md:hidden w-8" />

      <div className="flex-1 max-w-xl hidden lg:flex items-center gap-3 relative">
        <span className="absolute left-4 text-slate-500">
          <Search size={18} />
        </span>
        <input
          type="text"
          placeholder="Buscar prompts, temas de campaña..."
          className="w-full bg-[#111111] border border-[#222] text-slate-300 rounded-full pl-11 pr-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
        />
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <button className="text-slate-400 hover:text-indigo-400 transition-colors hidden sm:block">
          <Bell size={20} />
        </button>

        <div className="w-px h-6 bg-[#222] hidden sm:block" />

        <div className="flex items-center gap-3 bg-[#111] border border-[#222] pl-2 pr-4 py-1.5 rounded-full">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 rounded-full flex items-center justify-center p-0.5">
            <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-xs">
                {fullName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <span className="text-sm font-medium text-slate-300 hidden sm:block tracking-wide">{fullName}</span>
          <form action={signout}>
            <button
              type="submit"
              className="ml-2 flex items-center text-slate-500 hover:text-red-400 transition p-1.5 rounded-full hover:bg-black"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
