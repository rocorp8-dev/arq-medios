'use client'

import { RefreshCw, AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-100">Algo salió mal</h2>
      <p className="text-sm text-slate-500 text-center max-w-md">
        Ocurrió un error inesperado. Intenta recargar la página.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        <RefreshCw size={16} />
        Reintentar
      </button>
    </div>
  )
}
