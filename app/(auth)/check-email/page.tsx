import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
          <span className="text-white font-bold text-xl">A</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Revisa tu email</h2>
          <p className="text-slate-600 text-sm mb-6">
            Te enviamos un enlace de verificación. Por favor revisa tu bandeja de entrada.
          </p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-blue-700 transition"
          >
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  )
}
