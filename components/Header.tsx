import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'

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
    fullName = profile?.full_name || user.email || 'Usuario'
  }

  return (
    <header className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-30 flex items-center justify-between">
      <div className="md:hidden w-8" />
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-700 font-semibold text-sm">
            {fullName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-slate-700 hidden sm:block">{fullName}</span>
        <form action={signout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition px-2 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut size={16} />
            <span className="hidden sm:block">Salir</span>
          </button>
        </form>
      </div>
    </header>
  )
}
