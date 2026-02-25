'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Home, Folder, CheckSquare, Users, Zap, Menu, X } from 'lucide-react'

const navItems = [
  { label: 'Inicio', icon: Home, href: '/' },
  { label: 'Projects', icon: Folder, href: '/projects' },
  { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
  { label: 'Team members', icon: Users, href: '/team-members' },
  { label: 'Sprints', icon: Zap, href: '/sprints' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const NavContent = () => (
    <>
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base">A</span>
          </div>
          <span className="font-bold text-slate-900 text-lg">Arq Medios</span>
        </div>
      </div>
      <nav className="p-4 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-500'} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-slate-200 rounded-lg p-2 shadow-sm"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <NavContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 flex-col">
        <NavContent />
      </div>
    </>
  )
}
