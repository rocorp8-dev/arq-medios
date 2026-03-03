'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Webhook, Lightbulb, FileText, BarChart3, Menu, X, Rocket, Sparkles, Megaphone } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { label: 'Dashboard', icon: BarChart3, href: '/' },
  { label: 'Topics', icon: Lightbulb, href: '/topics' },
  { label: 'Content', icon: FileText, href: '/content' },
  { label: 'Campaigns', icon: Megaphone, href: '/campaigns' },
  { label: 'Automatización', icon: Sparkles, href: '/automations' },
  { label: 'Webhooks', icon: Webhook, href: '/webhooks' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#111111]/80 backdrop-blur-xl border-r border-[#222]">
      <div className="p-6 border-b border-[#222]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
            <Rocket size={20} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-100 text-lg tracking-tight">Arq Medios</span>
            <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase">Content Automation</span>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={clsx(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden",
                isActive
                  ? "text-indigo-300 bg-indigo-500/10 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <Icon size={18} className={clsx("relative z-10 transition-colors", isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400")} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 m-4 border border-indigo-500/20 bg-indigo-500/5 rounded-xl text-center">
        <Sparkles size={16} className="text-indigo-400 mx-auto mb-2" />
        <p className="text-xs text-slate-400 font-medium leading-relaxed">
          Automatización de contenido viral con <span className="text-indigo-400">Make.com</span> + <span className="text-fuchsia-400">Groq AI</span>
        </p>
      </div>
    </div>
  )

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-[#111] border border-[#333] rounded-xl p-2.5 shadow-xl text-slate-200"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      <div
        className={clsx(
          "md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Mobile sidebar */}
      <div
        className={clsx(
          "md:hidden fixed top-0 left-0 h-full w-[280px] z-50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex fixed top-0 left-0 h-full w-[280px] z-10">
        <NavContent />
      </div>
    </>
  )
}
