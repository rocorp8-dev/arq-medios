'use client'

import { useState } from 'react'
import { format, nextMonday } from 'date-fns'
import { es } from 'date-fns/locale'
import JSZip from 'jszip'
import { Sparkles, X, ChevronDown, ChevronUp, ExternalLink, CheckCircle2, Clock, AlertCircle, Send, Download, Image as ImageIcon } from 'lucide-react'
import NextImage from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Campaign } from '@/types/database'

interface Scenario { id: string; name: string }

interface SlideBody {
  slide_number?: number
  title?: string
  body?: string
  design_notes?: string
  image_url?: string
  image_prompt?: string
}

interface ContentDay {
  day: number
  angle: string
  title: string
  description: string
  date: string
  contentId: string
  generated?: boolean
  generating?: boolean
  error?: boolean
  body?: SlideBody[]
}


const statusBadge: Record<string, string> = {
  active: 'bg-emerald-900/50 text-emerald-400 border-emerald-800',
  paused: 'bg-amber-900/50 text-amber-400 border-amber-800',
  completed: 'bg-blue-900/50 text-blue-400 border-blue-800',
}
const statusLabel: Record<string, string> = {
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
}

interface Props {
  initialCampaigns: Campaign[]
  scenarios: Scenario[]
  userId: string
}

const defaultStartDate = () => {
  const monday = nextMonday(new Date())
  return monday.toISOString().split('T')[0]
}

export default function CampaignsClient({ initialCampaigns, scenarios, userId }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [campaignDays, setCampaignDays] = useState<Record<string, ContentDay[]>>({})
  const [loadingDays, setLoadingDays] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    keyword: '',
    campaignName: '',
    startDate: defaultStartDate(),
    scenarioId: scenarios[0]?.id ?? '',
  })

  // Send campaign state
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendResults, setSendResults] = useState<Record<string, Array<'pending' | 'sending' | 'ok' | 'error'>>>({})

  // Preview modal
  const [previewDay, setPreviewDay] = useState<ContentDay | null>(null)
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0)

  // Generation progress
  const [genState, setGenState] = useState<'idle' | 'planning' | 'generating' | 'done' | 'error'>('idle')
  const [genProgress, setGenProgress] = useState(0) // 0-7
  const [genDays, setGenDays] = useState<ContentDay[]>([])
  const [genCampaignId, setGenCampaignId] = useState<string | null>(null)

  const supabase = createClient()

  function openModal() {
    setForm({ keyword: '', campaignName: '', startDate: defaultStartDate(), scenarioId: scenarios[0]?.id ?? '' })
    setGenState('idle')
    setGenDays([])
    setGenProgress(0)
    setGenCampaignId(null)
    setShowModal(true)
  }

  function closeModal() {
    if (genState === 'generating') return // prevent close while generating
    if (genState === 'done' && genCampaignId) {
      // Refresh campaigns list
      supabase.from('campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setCampaigns(data) })
    }
    setShowModal(false)
    setGenState('idle')
  }

  // Auto-generate campaign name from keyword
  function handleKeywordChange(value: string) {
    const autoName = value.trim() ? `Semana ${format(new Date(form.startDate + 'T12:00:00'), 'dd MMM', { locale: es })} — ${value.trim()}` : ''
    setForm(f => ({ ...f, keyword: value, campaignName: autoName }))
  }

  function handleStartDateChange(value: string) {
    const autoName = form.keyword.trim() ? `Semana ${format(new Date(value + 'T12:00:00'), 'dd MMM', { locale: es })} — ${form.keyword.trim()}` : ''
    setForm(f => ({ ...f, startDate: value, campaignName: autoName }))
  }

  async function handleGenerate() {
    if (!form.keyword || !form.campaignName || !form.startDate) return

    setGenState('planning')
    setGenProgress(0)
    setGenDays([])

    try {
      // Step 1: Create plan (campaign + 7 draft records)
      const planRes = await fetch('/api/campaign/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: form.keyword,
          campaignName: form.campaignName,
          startDate: form.startDate,
          scenarioId: form.scenarioId || null,
        }),
      })

      if (!planRes.ok) {
        const err = await planRes.json().catch(() => ({}))
        console.error('Plan error:', err)
        setGenState('error')
        return
      }

      const { campaignId, days } = await planRes.json()
      setGenCampaignId(campaignId)
      setGenState('generating')

      // Step 2: Generate each carousel sequentially
      const updatedDays: ContentDay[] = days.map((d: ContentDay) => ({ ...d, generating: false, generated: false, error: false }))
      setGenDays(updatedDays)

      for (let i = 0; i < days.length; i++) {
        const day = days[i]
        setGenDays(prev => prev.map((d, idx) => idx === i ? { ...d, generating: true } : d))
        setGenProgress(i)

        try {
          const genRes = await fetch('/api/campaign/generate-day', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentId: day.contentId,
              title: day.title,
              description: day.description,
            }),
          })

          if (genRes.ok) {
            const dayData = await genRes.json()
            const prompts = ((dayData.body as SlideBody[]) || []).map(s => s.image_prompt).filter(Boolean)
            // Eliminamos la llamada auto a Banana desde aquí para no sobrecargar el robot ni lanzar "Lote en ejecución"
            // El usuario generará las imágenes entrando a la edición de contenido, lo cual es mucho más seguro.
            setGenDays(prev => prev.map((d, idx) => idx === i ? { ...d, generating: false, generated: true } : d))
          } else {
            setGenDays(prev => prev.map((d, idx) => idx === i ? { ...d, generating: false, error: true } : d))
          }
        } catch {
          setGenDays(prev => prev.map((d, idx) => idx === i ? { ...d, generating: false, error: true } : d))
        }

        setGenProgress(i + 1)
      }

      setGenState('done')

      // Refresh campaigns
      const { data } = await supabase.from('campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (data) setCampaigns(data)
      setCampaignDays(prev => ({ ...prev, [campaignId]: updatedDays }))

    } catch (err) {
      console.error('Generation error:', err)
      setGenState('error')
    }
  }

  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function handleDownloadCampaign(campaign: Campaign) {
    if (downloadingId) return
    setDownloadingId(campaign.id)

    try {
      const { data: items } = await supabase
        .from('content')
        .select('id, title, scheduled_at, body')
        .eq('campaign_id', campaign.id)
        .order('scheduled_at', { ascending: true })

      if (!items || items.length === 0) { setDownloadingId(null); return }

      const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
      const sep = '─'.repeat(50)
      const zip = new JSZip()
      const folderName = campaign.name.replace(/[^a-z0-9áéíóúñ\s]/gi, '').trim()

      // Build texto completo
      const lines: string[] = [
        `CAMPAÑA: ${campaign.name}`,
        campaign.topic_keyword ? `Tema: ${campaign.topic_keyword}` : '',
        campaign.start_date && campaign.end_date
          ? `Semana: ${format(new Date(campaign.start_date + 'T12:00:00'), 'dd MMM', { locale: es })} — ${format(new Date(campaign.end_date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}`
          : '',
        '═'.repeat(50),
        '',
      ].filter(Boolean)

      // Descargar imágenes en paralelo por día
      await Promise.all(items.map(async (item, i) => {
        const date = item.scheduled_at ? new Date(item.scheduled_at) : null
        const dayName = date ? DIAS[date.getDay() === 0 ? 6 : date.getDay() - 1] : `Dia${i + 1}`
        const dateStr = date ? format(date, 'dd MMM', { locale: es }) : ''
        const dayFolder = `${folderName}/Dia${i + 1}-${dayName}`
        const slides = Array.isArray(item.body) ? item.body : []

        // Texto del día
        lines.push(`DÍA ${i + 1} — ${dayName.toUpperCase()}${dateStr ? ` ${dateStr}` : ''}`)
        lines.push(`Título: ${item.title}`)
        lines.push('')

        if (slides.length === 0) {
          lines.push('  (Sin contenido generado)')
        } else {
          slides.forEach((slide: { slide_number?: number; title?: string; body?: string; image_url?: string }, si: number) => {
            lines.push(`  SLIDE ${slide.slide_number ?? si + 1}`)
            if (slide.title) lines.push(`  ${slide.title}`)
            if (slide.body)  lines.push(`  ${slide.body}`)
            lines.push('')
          })
        }
        lines.push(sep)
        lines.push('')

        // Imágenes del día
        await Promise.all(slides.map(async (slide: { image_url?: string; slide_number?: number }, si: number) => {
          const imgUrl = slide.image_url
          if (!imgUrl || imgUrl.startsWith('data:')) return
          try {
            const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(imgUrl)}`)
            if (!res.ok) return
            const blob = await res.blob()
            const ext = blob.type.includes('png') ? 'png' : 'jpg'
            zip.file(`${dayFolder}/slide-${slide.slide_number ?? si + 1}.${ext}`, blob)
          } catch { /* imagen no disponible */ }
        }))
      }))

      // Agregar texto al zip
      zip.file(`${folderName}/contenido.txt`, lines.join('\n'))

      // Generar y descargar zip
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${folderName}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
    }

    setDownloadingId(null)
  }

  async function handleSendCampaign(campaign: Campaign) {
    const days = campaignDays[campaign.id]
    if (!days || days.length === 0 || sendingId) return

    setSendingId(campaign.id)
    setSendResults(prev => ({
      ...prev,
      [campaign.id]: days.map(() => 'pending' as const),
    }))

    for (let i = 0; i < days.length; i++) {
      const day = days[i]

      setSendResults(prev => ({
        ...prev,
        [campaign.id]: prev[campaign.id].map((r, idx) => idx === i ? 'sending' : r),
      }))

      try {
        const res = await fetch('/api/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: day.contentId,
            scenarioId: campaign.scenario_id || null,
            webhookUrl: null,
            customCaption: null,
          }),
        })

        setSendResults(prev => ({
          ...prev,
          [campaign.id]: prev[campaign.id].map((r, idx) => idx === i ? (res.ok ? 'ok' : 'error') : r),
        }))
      } catch {
        setSendResults(prev => ({
          ...prev,
          [campaign.id]: prev[campaign.id].map((r, idx) => idx === i ? 'error' : r),
        }))
      }
    }

    setSendingId(null)
  }

  async function toggleExpand(campaign: Campaign) {
    if (expandedId === campaign.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(campaign.id)
    if (campaignDays[campaign.id]) return

    setLoadingDays(campaign.id)
    const { data } = await supabase
      .from('content')
      .select('id, title, scheduled_at, status, body')
      .eq('campaign_id', campaign.id)
      .order('scheduled_at', { ascending: true })

    if (data) {
      const days: ContentDay[] = data.map((item, i) => ({
        day: i + 1,
        angle: '',
        title: item.title,
        description: '',
        date: item.scheduled_at,
        contentId: item.id,
        generated: Array.isArray(item.body) && item.body.length > 0,
        body: Array.isArray(item.body) ? item.body : [],
      }))
      setCampaignDays(prev => ({ ...prev, [campaign.id]: days }))
    }
    setLoadingDays(null)
  }

  const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Campañas Semanales</h1>
          <p className="text-slate-500 text-sm mt-1">{campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-indigo-700 transition"
        >
          <Sparkles size={15} /> Generar Campaña
        </button>
      </div>

      {/* Campaign Cards */}
      {campaigns.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-[#222] rounded-2xl">
          <Sparkles size={40} className="mx-auto mb-4 text-indigo-500/40" />
          <p className="text-slate-400 font-medium">No hay campañas aún</p>
          <p className="text-slate-600 text-sm mt-1">Genera tu primera campaña semanal con IA</p>
          <button onClick={openModal} className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            Generar Campaña
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const isExpanded = expandedId === c.id
            const days = campaignDays[c.id]
            const isLoading = loadingDays === c.id

            return (
              <div key={c.id} className="bg-[#111]/80 backdrop-blur-md rounded-xl border border-[#2a2a2a] overflow-hidden">
                {/* Card Header */}
                <button
                  onClick={() => toggleExpand(c)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-white/[0.02] transition text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-slate-200 truncate">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusBadge[c.status]}`}>
                        {statusLabel[c.status]}
                      </span>
                      {c.topic_keyword && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {c.topic_keyword}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                      {c.start_date && c.end_date
                        ? `${format(new Date(c.start_date + 'T12:00:00'), 'dd MMM', { locale: es })} — ${format(new Date(c.end_date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}`
                        : format(new Date(c.created_at), 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                  <div className="text-slate-500 shrink-0">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Expanded 7-day Timeline */}
                {isExpanded && (
                  <div className="border-t border-[#1a1a1a] px-5 py-4">
                    {isLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div key={i} className="rounded-lg bg-[#0d0d0d] border border-[#222] overflow-hidden animate-pulse">
                            <div className="w-full aspect-[4/5] bg-[#1a1a1a]" />
                            <div className="p-2.5 space-y-1.5">
                              <div className="h-2 bg-[#1a1a1a] rounded w-8" />
                              <div className="h-2 bg-[#1a1a1a] rounded w-full" />
                              <div className="h-2 bg-[#1a1a1a] rounded w-3/4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : days && days.length > 0 ? (
                      <div className="space-y-3">
                        {/* 7-day grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                          {days.map((day, idx) => {
                            const result = sendResults[c.id]?.[idx]
                            const thumb = day.body?.find(s => s.image_url && !s.image_url.startsWith('data:'))?.image_url
                            return (
                              <div
                                key={day.contentId}
                                onClick={() => { setPreviewDay(day); setPreviewSlideIndex(0) }}
                                className="group flex flex-col rounded-lg bg-[#0d0d0d] border border-[#222] hover:border-indigo-500/40 hover:bg-[#151520] transition cursor-pointer overflow-hidden"
                              >
                                {/* Thumbnail */}
                                {thumb ? (
                                  <div className="relative w-full aspect-[4/5] bg-[#0a0a0a]">
                                    <NextImage src={thumb} alt={day.title} fill className="object-cover" sizes="160px" />
                                  </div>
                                ) : (
                                  <div className="w-full aspect-[4/5] bg-[#0a0a0a] flex items-center justify-center">
                                    <ImageIcon size={20} className="text-slate-700" />
                                  </div>
                                )}
                                {/* Info */}
                                <div className="p-2.5 flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{DAYS_ES[idx % 7]}</span>
                                    {result === 'ok' ? (
                                      <CheckCircle2 size={13} className="text-emerald-400" />
                                    ) : result === 'sending' ? (
                                      <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                    ) : result === 'error' ? (
                                      <AlertCircle size={13} className="text-red-400" />
                                    ) : day.generated ? (
                                      <CheckCircle2 size={13} className="text-emerald-500/50" />
                                    ) : (
                                      <Clock size={13} className="text-slate-600" />
                                    )}
                                  </div>
                                  {day.date && (
                                    <span className="text-xs text-slate-600">
                                      {format(new Date(day.date), 'dd MMM', { locale: es })}
                                    </span>
                                  )}
                                  <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-tight">{day.title}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Send bar */}
                        {(() => {
                          const results = sendResults[c.id]
                          const isSending = sendingId === c.id
                          const sentCount = results?.filter(r => r === 'ok').length ?? 0
                          const isDone = results && !isSending && results.every(r => r === 'ok' || r === 'error')
                          const hasError = results?.some(r => r === 'error')

                          return (
                            <div className="flex items-center justify-between pt-1">
                              {isDone ? (
                                <p className={`text-xs font-medium ${hasError ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {hasError
                                    ? `⚠️ ${sentCount}/${days.length} enviados — algunos fallaron`
                                    : `✅ ${sentCount} posts enviados a Make.com`}
                                </p>
                              ) : isSending ? (
                                <p className="text-xs text-slate-400">
                                  Enviando día {(results?.filter(r => r === 'ok' || r === 'sending').length ?? 0)}/{days.length}...
                                </p>
                              ) : (
                                <p className="text-xs text-slate-600">
                                  {days.filter(d => d.generated).length}/{days.length} posts listos
                                </p>
                              )}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={e => { e.stopPropagation(); handleDownloadCampaign(c) }}
                                  disabled={isSending || !!downloadingId}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1a1a1a] border border-[#333] text-slate-300 rounded-lg hover:bg-[#222] transition disabled:opacity-50"
                                >
                                  {downloadingId === c.id
                                    ? <><div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" /> Descargando...</>
                                    : <><Download size={12} /> Descargar .zip</>}
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); handleSendCampaign(c) }}
                                  disabled={isSending || !!sendingId}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSending
                                    ? <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
                                    : <><Send size={12} /> Enviar semana</>}
                                </button>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm text-center py-4">No hay posts en esta campaña</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewDay && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewDay(null)}
        >
          <div
            className="bg-[#111] rounded-2xl border border-[#2a2a2a] w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{DAYS_ES[(previewDay.day - 1) % 7]}</p>
                <h3 className="text-sm font-bold text-slate-100 truncate">{previewDay.title}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <a
                  href={`/content/${previewDay.contentId}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/10 transition"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={11} /> Editar
                </a>
                <button onClick={() => setPreviewDay(null)} className="p-1.5 text-slate-500 hover:text-slate-300 transition">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Slide content */}
            {previewDay.body && previewDay.body.length > 0 ? (() => {
              const slide = previewDay.body![previewSlideIndex]
              const imgUrl = slide.image_url && !slide.image_url.startsWith('data:') ? slide.image_url : null
              return (
                <div className="p-4 space-y-3">
                  {imgUrl ? (
                    <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-[#0a0a0a]">
                      <NextImage src={imgUrl} alt={slide.title || ''} fill className="object-cover" sizes="340px" />
                      <a
                        href={imgUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-black/80 transition"
                        onClick={e => e.stopPropagation()}
                      >
                        <Download size={13} />
                      </a>
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/5] rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] flex flex-col items-center justify-center gap-2 text-slate-600">
                      <ImageIcon size={32} />
                      <p className="text-xs">Imagen pendiente de Banana</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    {slide.title && <p className="text-sm font-bold text-slate-100">{slide.title}</p>}
                    {slide.body && <p className="text-xs text-slate-400 leading-relaxed">{slide.body}</p>}
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setPreviewSlideIndex(i => Math.max(0, i - 1))}
                      disabled={previewSlideIndex === 0}
                      className="px-3 py-1.5 text-xs text-slate-400 bg-[#1a1a1a] border border-[#333] rounded-lg hover:bg-[#222] disabled:opacity-30 transition"
                    >
                      ← Anterior
                    </button>
                    <span className="text-xs text-slate-500">{previewSlideIndex + 1} / {previewDay.body!.length}</span>
                    <button
                      onClick={() => setPreviewSlideIndex(i => Math.min(previewDay.body!.length - 1, i + 1))}
                      disabled={previewSlideIndex === previewDay.body!.length - 1}
                      className="px-3 py-1.5 text-xs text-slate-400 bg-[#1a1a1a] border border-[#333] rounded-lg hover:bg-[#222] disabled:opacity-30 transition"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )
            })() : (
              <div className="p-8 text-center text-slate-500 text-sm">No hay slides generados aún</div>
            )}
          </div>
        </div>
      )}

      {/* Generation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] rounded-2xl border border-[#2a2a2a] p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-400" />
                <h2 className="text-lg font-bold text-slate-100">Generar Campaña Semanal</h2>
              </div>
              {genState !== 'generating' && (
                <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Form — only shown when idle or error */}
            {(genState === 'idle' || genState === 'error') && (
              <div className="space-y-4">
                {genState === 'error' && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    <AlertCircle size={15} />
                    Ocurrió un error. Intenta de nuevo.
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Tema o keyword *</label>
                  <input
                    type="text"
                    placeholder="ej. bienes raíces Baja California"
                    value={form.keyword}
                    onChange={e => handleKeywordChange(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre de la campaña</label>
                  <input
                    type="text"
                    value={form.campaignName}
                    onChange={e => setForm(f => ({ ...f, campaignName: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Fecha de inicio</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                {scenarios.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Fábrica de publicación</label>
                    <select
                      value={form.scenarioId}
                      onChange={e => setForm(f => ({ ...f, scenarioId: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                      <option value="">Sin fábrica</option>
                      {scenarios.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={closeModal} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-[#1a1a1a] border border-[#333] rounded-lg hover:bg-[#222] transition">
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={!form.keyword || !form.campaignName || !form.startDate}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    <Sparkles size={15} /> Generar 7 días
                  </button>
                </div>
              </div>
            )}

            {/* Planning state */}
            {genState === 'planning' && (
              <div className="py-6 text-center space-y-3">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-slate-300 font-medium">Creando parrilla con IA...</p>
                <p className="text-slate-500 text-sm">Diseñando 7 ángulos únicos para tu tema</p>
              </div>
            )}

            {/* Generating state */}
            {(genState === 'generating' || genState === 'done') && genDays.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-300 font-medium text-sm">
                    {genState === 'done' ? '✅ Campaña generada' : `Generando día ${genProgress}/7...`}
                  </p>
                  <span className="text-xs text-slate-500">{genProgress}/7</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 mb-4">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${(genProgress / 7) * 100}%` }}
                  />
                </div>

                {/* Day list */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {genDays.map((day, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a]">
                      <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                        {day.generated ? (
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        ) : day.generating ? (
                          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        ) : day.error ? (
                          <AlertCircle size={18} className="text-red-400" />
                        ) : (
                          <Clock size={16} className="text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-300 truncate">{day.title}</p>
                        <p className="text-xs text-slate-600">{day.angle}</p>
                      </div>
                      {day.date && (
                        <span className="text-xs text-slate-600 shrink-0">
                          {format(new Date(day.date), 'EEE dd', { locale: es })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {genState === 'done' && (
                  <div className="pt-2">
                    <button
                      onClick={closeModal}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
                    >
                      <CheckCircle2 size={15} /> Ver campaña
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
