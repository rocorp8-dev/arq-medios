'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Send, CheckCircle, Eye, Pencil, Layers, Video, Instagram, Facebook, Palette, Upload, Plus, History, RefreshCw, Star, Trash2, X, Image as ImageIcon, ZoomIn, Download, Check, Zap } from 'lucide-react'
import { useEffect, useCallback, useMemo, memo } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import type { Content, CarouselSlide, ReelSection } from '@/types/database'

const slideLabels: Record<number, string> = {
  1: 'Gancho', 2: 'Problema', 3: 'Problema', 4: 'Solución', 5: 'Solución',
  6: 'Solución', 7: 'Solución', 8: 'Revelación', 9: 'Revelación', 10: 'CTA',
}

const slideColors: Record<string, string> = {
  'Gancho': 'from-red-600 to-orange-600',
  'Problema': 'from-amber-600 to-yellow-600',
  'Solución': 'from-blue-600 to-indigo-600',
  'Revelación': 'from-purple-600 to-fuchsia-600',
  'CTA': 'from-emerald-600 to-teal-600',
}

const reelLabels: Record<string, { label: string; color: string; previewColor: string }> = {
  gancho: { label: 'Gancho', color: 'border-red-500/30 bg-red-500/5', previewColor: 'from-red-600 to-rose-700' },
  problema: { label: 'Problema Invisible', color: 'border-amber-500/30 bg-amber-500/5', previewColor: 'from-amber-600 to-orange-700' },
  evidencia: { label: 'Evidencia', color: 'border-blue-500/30 bg-blue-500/5', previewColor: 'from-blue-600 to-cyan-700' },
  solucion: { label: 'Solución', color: 'border-emerald-500/30 bg-emerald-500/5', previewColor: 'from-emerald-600 to-green-700' },
  cta: { label: 'Call to Action', color: 'border-purple-500/30 bg-purple-500/5', previewColor: 'from-purple-600 to-fuchsia-700' },
}

const statusBadge: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300', review: 'bg-amber-900/50 text-amber-400',
  approved: 'bg-blue-900/50 text-blue-400', published: 'bg-emerald-900/50 text-emerald-400',
}
const statusOptions = [
  { value: 'draft', label: 'Borrador' }, { value: 'review', label: 'Revisión' },
  { value: 'approved', label: 'Aprobado' }, { value: 'published', label: 'Publicado' },
]

interface Scenario {
  id: string
  name: string
  webhook_url: string
  channels: string[]
}

interface Props { content: Content; initialScenarios: Scenario[]; userId: string }

export default function ContentEditor({ content: initial, initialScenarios, userId }: Props) {
  const [content, setContent] = useState(initial)
  const [body, setBody] = useState<CarouselSlide[] | ReelSection[]>(
    Array.isArray(initial.body) ? initial.body : []
  )
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sent, setSent] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview' | 'media'>('preview')
  const [mediaTab, setMediaTab] = useState<'generated' | 'uploads' | 'combined' | 'videos' | 'favorites'>('generated')
  const [selectedUrls, setSelectedUrls] = useState<string[]>([])
  const [mediaList, setMediaList] = useState<any[]>([])
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [combining, setCombining] = useState(false)
  const [videoGenerating, setVideoGenerating] = useState(false)
  const [videoPrompt, setVideoPrompt] = useState('')
  const [combinePrompt, setCombinePrompt] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [useInSlideUrl, setUseInSlideUrl] = useState<string | null>(null)
  const [showSlideSelector, setShowSlideSelector] = useState(false)

  // Automation Factories State
  const [scenarios] = useState<Scenario[]>(initialScenarios)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(initialScenarios[0]?.id || '')

  // Editable caption — pre-filled with auto-generated text, user can customize before sending
  const defaultCaption = useMemo(() => {
    if (initial.type === 'carousel') {
      const slides = (Array.isArray(initial.body) ? initial.body : []) as CarouselSlide[]
      return `${initial.title}\n\n${slides.map(s => `📌 Slide ${s.slide_number}: ${s.title}`).join('\n')}\n\n💾 Guarda este post\n📩 Comparte con alguien que lo necesite\n\n#contentmarketing #socialmedia #marketingdigital`
    }
    return `${initial.title}\n\n💬 ¿Te identificas? Comenta abajo\n📩 Comparte con alguien que lo necesite\n\n#reels #contentcreator #marketingdigital`
  }, [initial])
  const [customCaption, setCustomCaption] = useState(defaultCaption)

  const supabase = createClient()

  useEffect(() => {
    if (tab === 'media' && !mediaLoaded) fetchMedia()
  }, [tab])

  async function fetchMedia() {
    const res = await fetch('/api/media')
    if (res.ok) {
      setMediaList(await res.json())
      setMediaLoaded(true)
    }
  }

  async function handleSave() {
    setSaving(true)
    const { data } = await supabase.from('content').update({
      title: content.title, body, status: content.status, platform: content.platform,
    }).eq('id', content.id).select().single()
    if (data) { setContent(data as Content); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    setSaving(false)
  }

  async function handleSendWebhook() {
    const selectedScenario = scenarios.find(s => s.id === selectedScenarioId)

    if (!selectedScenario?.webhook_url) {
      alert('Por favor, selecciona o configura una Fábrica de Contenido primero.')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          scenarioId: selectedScenario.id,
          webhookUrl: selectedScenario.webhook_url,
          customCaption: customCaption.trim() || undefined // Override del caption editado por el usuario
        }),
      })
      const data = await res.json()
      if (data.success) { setSent(true); setTimeout(() => setSent(false), 3000) }
      else {
        alert('Error: ' + (data.error ?? 'Unknown'))
      }
    } catch { alert('Error de conexión') }
    setSending(false)
  }


  function updateSlide(i: number, field: keyof CarouselSlide, value: string) {
    const slides = [...body] as CarouselSlide[]
    slides[i] = { ...slides[i], [field]: value }
    setBody(slides)
  }

  function updateReelSection(i: number, value: string) {
    const sections = [...body] as ReelSection[]
    sections[i] = { ...sections[i], text: value }
    setBody(sections)
  }

  function toggleSelection(url: string) {
    setSelectedUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    )
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const uid = userId
    if (!uid) { alert('Error: No se pudo identificar al usuario. Recarga la página.'); setUploading(false); return }
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${uid}/${fileName}`

    try {
      const { data, error } = await supabase.storage.from('media').upload(filePath, file)
      if (error) {
        console.error('Supabase Storage Error:', error)
        throw error
      }
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path)

      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: publicUrl, name: file.name, type: 'upload' })
      })
      if (res.ok) fetchMedia()
      else {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar en base de datos')
      }
    } catch (err) {
      alert('Error al subir: ' + (err as any).message + '\nVerifica que el bucket "media" tenga políticas de INSERT en Supabase.')
    } finally {
      setUploading(false)
    }
  }

  async function handleCombine() {
    if (selectedUrls.length < 1) return
    setCombining(true)
    try {
      const res = await fetch('/api/combine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls: selectedUrls, instruction: combinePrompt })
      })
      if (res.ok) {
        fetchMedia()
        setSelectedUrls([])
        setCombinePrompt('')
        setMediaTab('combined')
      } else {
        alert('Error al combinar imágenes')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setCombining(false)
    }
  }

  async function handleDownload(url: string, fileName?: string) {
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = fileName || 'imagen.png'
      link.click()
    } catch (e) {
      alert('Error al descargar la imagen')
    }
  }

  async function handleReplaceSlide(url: string, index: number) {
    if (content.type !== 'carousel') return
    const slides = [...body] as CarouselSlide[]
    slides[index] = { ...slides[index], image_url: url }
    setBody(slides)

    // Auto-save
    setSaving(true)
    const { data } = await supabase.from('content').update({ body: slides }).eq('id', content.id).select().single()
    if (data) setContent(data as Content)
    setSaving(false)

    setShowSlideSelector(false)
    setUseInSlideUrl(null)
    setTab('preview') // Switch to preview to see the change
  }

  async function handleGenerateVideo() {
    if (!videoPrompt) return
    setVideoGenerating(true)
    try {
      const res = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: videoPrompt })
      })
      if (res.ok) {
        const data = await res.json()
        alert('Generación de video iniciada (Request ID: ' + data.request_id + '). Aparecerá en tu galería en unos segundos.')
        setVideoPrompt('')
        fetchMedia()
      } else {
        alert('Error al generar video')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setVideoGenerating(false)
    }
  }

  async function toggleFavorite(mediaId: string, current: boolean) {
    const res = await fetch('/api/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mediaId, favorite: !current })
    })
    if (res.ok) {
      setMediaList(prev => prev.map(m => m.id === mediaId ? { ...m, favorite: !current } : m))
    }
  }

  async function handleDelete(mediaId: string) {
    if (!confirm('¿Seguro que quieres eliminar esta imagen?')) return
    const res = await fetch(`/api/media?id=${mediaId}`, { method: 'DELETE' })
    if (res.ok) {
      setMediaList(prev => prev.filter(m => m.id !== mediaId))
    }
  }

  async function handleRegenerateImage(index: number, prompt: string) {
    const slides = [...body] as CarouselSlide[]
    const originalUrl = slides[index].image_url
    slides[index] = { ...slides[index], image_url: '' } // Clear while loading
    setBody(slides)

    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      if (data.url) {
        const newSlides = [...body] as CarouselSlide[]
        newSlides[index] = { ...newSlides[index], image_url: data.url }
        setBody(newSlides)
      } else {
        const newSlides = [...body] as CarouselSlide[]
        newSlides[index] = { ...newSlides[index], image_url: originalUrl }
        setBody(newSlides)
        alert('Error al regenerar')
      }
    } catch {
      alert('Error de conexión')
      const newSlides = [...body] as CarouselSlide[]
      newSlides[index] = { ...newSlides[index], image_url: originalUrl }
      setBody(newSlides)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/content" className="p-2 text-slate-500 hover:text-slate-300 hover:bg-[#1a1a1a] rounded-lg transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <input type="text" value={content.title}
              onChange={e => setContent(c => ({ ...c, title: e.target.value }))}
              className="text-2xl font-bold text-slate-100 bg-transparent border-0 outline-none focus:ring-0 p-0 w-full" />
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${content.type === 'carousel' ? 'bg-purple-900/50 text-purple-400' : 'bg-pink-900/50 text-pink-400'}`}>
                {content.type === 'carousel' ? 'Carrusel' : 'Reel'}
              </span>
              <select value={content.status} onChange={e => setContent(c => ({ ...c, status: e.target.value as Content['status'] }))}
                className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer bg-transparent ${statusBadge[content.status]}`}>
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={content.platform} onChange={e => setContent(c => ({ ...c, platform: e.target.value as Content['platform'] }))}
                className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-slate-400 border-0 cursor-pointer">
                <option value="both">Instagram + Facebook</option>
                <option value="instagram">Solo Instagram</option>
                <option value="facebook">Solo Facebook</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
          </button>
          {scenarios.length > 0 ? (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#1a1a1a] border border-white/5 rounded-xl px-3 py-1.5 gap-2 shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fábrica:</span>
                  <select
                    value={selectedScenarioId}
                    onChange={(e) => setSelectedScenarioId(e.target.value)}
                    className="bg-transparent text-slate-200 text-xs font-bold outline-none cursor-pointer pr-1"
                  >
                    {scenarios.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleSendWebhook} disabled={sending}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                  {sent ? <CheckCircle size={18} /> : <Zap size={18} />}
                  {sending ? 'Despachando...' : sent ? '¡Enviado a Fábrica!' : '🚀 Enviar a Fábrica'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-medium font-mono">
                Destino: <span className="text-slate-400 font-bold capitalize">{scenarios.find(s => s.id === selectedScenarioId)?.channels.join(' + ') || 'Redes'}</span>
              </p>
            </div>
          ) : (
            <Link
              href="/automations"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Zap size={18} />
              Configurar Fábrica
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#111] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        <button onClick={() => setTab('preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <Eye size={16} /> Vista Previa
        </button>
        <button onClick={() => setTab('edit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <Pencil size={16} /> Editar
        </button>
        <button onClick={() => setTab('media')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'media' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <ImageIcon size={16} /> Media Dashboard
        </button>
      </div>

      {/* COMBINE FLOATING BAR */}
      {selectedUrls.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a]/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 w-full max-w-2xl px-6">
          <div className="flex -space-x-3 overflow-hidden">
            {selectedUrls.map((url, i) => (
              <div key={i} className="h-10 w-10 rounded-full border-2 border-[#1a1a1a] overflow-hidden bg-[#222] relative">
                <NextImage src={url} alt="" fill className="object-cover" sizes="40px" />
              </div>
            ))}
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {selectedUrls.length} seleccionadas
            </span>
            <input
              type="text"
              placeholder="¿Cómo quieres combinarlas? Ej: Ponme en Budapest..."
              value={combinePrompt}
              onChange={e => setCombinePrompt(e.target.value)}
              className="w-full bg-black/40 border-0 outline-none text-sm text-slate-200 p-0 placeholder:text-slate-600 focus:ring-0"
            />
          </div>
          <button
            disabled={combining}
            onClick={handleCombine}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
          >
            {combining ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Combinar
          </button>
          <button onClick={() => setSelectedUrls([])} className="p-2 text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
      )}

      {/* PREVIEW TAB */}
      {tab === 'preview' && content.type === 'carousel' && (
        <div className="space-y-6">
          {/* Platform header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-purple-400">
              <Layers size={22} />
              <h3 className="text-lg font-bold text-slate-100">Carrusel — {(body as CarouselSlide[]).length} Slides</h3>
            </div>
            <div className="flex gap-2 ml-auto">
              {(content.platform === 'both' || content.platform === 'instagram') && <Instagram size={18} className="text-pink-400" />}
              {(content.platform === 'both' || content.platform === 'facebook') && <Facebook size={18} className="text-blue-400" />}
            </div>
          </div>

          {/* Carousel slides preview */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {(body as CarouselSlide[]).map((slide, i) => {
              const label = slideLabels[slide.slide_number] ?? 'Contenido'
              const gradient = slideColors[label] ?? 'from-slate-600 to-slate-700'
              return (
                <div key={i} className="relative group">
                  <div className={`aspect-[4/5] rounded-2xl ${slide.image_url ? '' : 'bg-gradient-to-br ' + gradient} p-4 flex flex-col justify-between overflow-hidden shadow-lg relative`}>
                    {slide.image_url && (
                      <NextImage src={slide.image_url} alt={slide.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 20vw" />
                    )}
                    {slide.image_url && <div className="absolute inset-0 bg-black/40" />}

                    <div className="relative z-10 flex flex-col h-full justify-between">
                      {/* Slide number */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{label}</span>
                        <span className="text-xs font-bold text-white/70">{slide.slide_number}/10</span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 flex flex-col justify-center py-2">
                        <h4 className="text-sm font-extrabold text-white leading-tight mb-1.5 drop-shadow-md">{slide.title}</h4>
                        <p className="text-[11px] text-white/90 leading-relaxed line-clamp-4 drop-shadow-md">{slide.body}</p>
                      </div>
                      {/* Design notes indicator */}
                      {slide.design_notes && (
                        <div className="flex items-center gap-1 text-white/70">
                          <Palette size={10} />
                          <span className="text-[9px] truncate">{slide.design_notes}</span>
                        </div>
                      )}
                    </div>
                    {/* Decorative elements only if no image */}
                    {!slide.image_url && (
                      <>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Caption editable */}
          <div className="bg-[#111]/80 backdrop-blur-md border border-[#2a2a2a] rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-300">Caption para publicación:</h4>
              <button
                onClick={() => setCustomCaption(defaultCaption)}
                className="text-[11px] text-slate-500 hover:text-indigo-400 transition-colors"
              >
                Restaurar original
              </button>
            </div>
            <textarea
              value={customCaption}
              onChange={e => setCustomCaption(e.target.value)}
              rows={8}
              className="w-full bg-[#0a0a0a] border border-[#222] focus:border-indigo-500/50 rounded-lg p-4 text-sm text-slate-300 leading-relaxed resize-y outline-none transition-colors font-mono"
              placeholder="Escribe tu caption personalizado aquí..."
            />
            <p className="text-[11px] text-slate-600 mt-1">{customCaption.length} caracteres · Edita antes de enviar a la Fábrica</p>
          </div>
        </div>
      )}

      {tab === 'preview' && content.type === 'reel' && (
        <div className="space-y-6">
          {/* Platform header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-pink-400">
              <Video size={22} />
              <h3 className="text-lg font-bold text-slate-100">Guion de Reel — El Problema Invisible</h3>
            </div>
            <div className="flex gap-2 ml-auto">
              {(content.platform === 'both' || content.platform === 'instagram') && <Instagram size={18} className="text-pink-400" />}
              {(content.platform === 'both' || content.platform === 'facebook') && <Facebook size={18} className="text-blue-400" />}
            </div>
          </div>

          {/* Reel phone mockup */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Phone preview */}
            <div className="w-full max-w-[320px] mx-auto lg:mx-0">
              <div className="bg-[#000] rounded-[2rem] border-4 border-[#222] p-2 shadow-2xl">
                <div className="bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0a0a0a] rounded-[1.5rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-5 pt-3 pb-2">
                    <span className="text-[10px] text-white/50 font-medium">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-1.5 bg-white/30 rounded-full" />
                      <div className="w-3 h-1.5 bg-white/30 rounded-full" />
                      <div className="w-5 h-2.5 bg-white/30 rounded" />
                    </div>
                  </div>

                  {/* Reel content */}
                  <div className="px-4 py-3 space-y-4 min-h-[480px] flex flex-col justify-center">
                    {(body as ReelSection[]).map((section, i) => {
                      const meta = reelLabels[section.section]
                      if (!meta) return null
                      return (
                        <div key={i} className="relative">
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b ${meta.previewColor}`} />
                          <div className="pl-4">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{meta.label}</span>
                            <p className="text-xs text-white/90 leading-relaxed mt-1">{section.text}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Bottom bar */}
                  <div className="flex items-center justify-around py-3 border-t border-white/5">
                    <div className="w-6 h-6 bg-white/10 rounded-full" />
                    <div className="w-6 h-6 bg-white/10 rounded-full" />
                    <div className="w-6 h-6 bg-white/10 rounded-full" />
                    <div className="w-6 h-6 bg-white/10 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Script breakdown */}
            <div className="flex-1 space-y-3">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Desglose del guion:</h4>
              {(body as ReelSection[]).map((section, i) => {
                const meta = reelLabels[section.section]
                if (!meta) return null
                return (
                  <div key={i} className={`bg-gradient-to-r ${meta.previewColor} bg-opacity-10 rounded-xl p-4 border border-white/5`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-white/60 uppercase tracking-wider bg-black/20 px-2 py-1 rounded">{meta.label}</span>
                      <span className="text-[10px] text-white/30">Sección {i + 1} de {(body as ReelSection[]).length}</span>
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed">{section.text}</p>
                  </div>
                )
              })}

              {/* Caption editable */}
              <div className="bg-[#111]/80 backdrop-blur-md border border-[#2a2a2a] rounded-xl p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-300">Caption para publicación:</h4>
                  <button
                    onClick={() => setCustomCaption(defaultCaption)}
                    className="text-[11px] text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    Restaurar original
                  </button>
                </div>
                <textarea
                  value={customCaption}
                  onChange={e => setCustomCaption(e.target.value)}
                  rows={7}
                  className="w-full bg-[#0a0a0a] border border-[#222] focus:border-indigo-500/50 rounded-lg p-3 text-xs text-slate-300 leading-relaxed resize-y outline-none transition-colors font-mono"
                  placeholder="Escribe tu caption personalizado aquí..."
                />
                <p className="text-[11px] text-slate-600 mt-1">{customCaption.length} caracteres</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TAB */}
      {tab === 'edit' && content.type === 'carousel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(body as CarouselSlide[]).map((slide, i) => (
            <div key={i} className="bg-[#111]/80 backdrop-blur-md rounded-xl border border-[#2a2a2a] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">SLIDE {slide.slide_number}</span>
                <span className="text-xs text-slate-600">{slideLabels[slide.slide_number] ?? ''}</span>
              </div>
              <input type="text" value={slide.title} onChange={e => updateSlide(i, 'title', e.target.value)}
                className="w-full text-sm font-semibold text-slate-200 bg-transparent border-0 border-b border-[#2a2a2a] pb-2 mb-2 outline-none focus:border-indigo-500"
                placeholder="Título del slide" />
              <textarea value={slide.body} onChange={e => updateSlide(i, 'body', e.target.value)} rows={3}
                className="w-full text-sm text-slate-300 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Contenido del slide" />
              <input type="text" value={slide.design_notes} onChange={e => updateSlide(i, 'design_notes', e.target.value)}
                className="w-full text-xs text-slate-500 bg-transparent border-0 border-t border-[#1a1a1a] pt-2 mt-2 outline-none focus:text-slate-300"
                placeholder="Notas de diseño..." />
              <input type="text" value={slide.image_prompt || ''} onChange={e => updateSlide(i, 'image_prompt', e.target.value)}
                className="w-full text-[10px] text-indigo-400 bg-[#161616]/50 rounded mt-2 px-2 py-1 outline-none border border-transparent focus:border-indigo-500/30"
                placeholder="Prompt de imagen (Nano Banana 2)..." />
              <div className="mt-2 flex items-center gap-2 transition">
                {slide.image_url ? (
                  <>
                    <div className="h-14 w-14 rounded-lg bg-[#222] overflow-hidden border border-[#333] shadow-inner relative">
                      <NextImage src={slide.image_url} alt="Min" fill className="object-cover" sizes="56px" />
                    </div>
                    <button
                      onClick={() => handleRegenerateImage(i, slide.image_prompt || '')}
                      className="p-2 rounded-lg bg-[#222] text-indigo-400 hover:bg-[#333] transition flex items-center gap-2 text-xs font-bold"
                    >
                      <RefreshCw size={14} /> Regenerar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRegenerateImage(i, slide.image_prompt || '')}
                    className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition flex items-center gap-2 text-xs font-bold"
                  >
                    <Plus size={14} /> Generar Imagen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'edit' && content.type === 'reel' && (
        <div className="space-y-4">
          {(body as ReelSection[]).map((section, i) => {
            const meta = reelLabels[section.section] ?? { label: section.section, color: 'border-slate-500/30 bg-slate-500/5' }
            return (
              <div key={i} className={`rounded-xl border-2 ${meta.color} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-slate-200">{meta.label}</span>
                </div>
                <textarea value={section.text} onChange={e => updateReelSection(i, e.target.value)} rows={3}
                  className="w-full text-sm text-slate-300 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder={`Escribe el ${meta.label.toLowerCase()}...`} />
              </div>
            )
          })}
        </div>
      )}

      {/* MEDIA DASHBOARD TAB */}
      {tab === 'media' && (
        <div className="space-y-6 pb-20">
          {/* Dashboard Header */}
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-1 w-full flex overflow-x-auto no-scrollbar">
            <button onClick={() => setMediaTab('generated')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${mediaTab === 'generated' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <ImageIcon size={16} /> Generated <span className="text-[10px] opacity-60 ml-1">{(body as CarouselSlide[]).filter(s => s.image_url).length}</span>
            </button>
            <button onClick={() => setMediaTab('uploads')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${mediaTab === 'uploads' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <Upload size={16} /> Uploads <span className="text-[10px] opacity-60 ml-1">{mediaList.filter(m => m.type === 'upload').length}</span>
            </button>
            <button onClick={() => setMediaTab('combined')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${mediaTab === 'combined' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <RefreshCw size={16} /> Combined <span className="text-[10px] opacity-60 ml-1">{mediaList.filter(m => m.type === 'combined').length}</span>
            </button>
            <button onClick={() => setMediaTab('videos')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${mediaTab === 'videos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <Video size={16} /> Videos <span className="text-[10px] opacity-60 ml-1">{mediaList.filter(m => m.type === 'video').length}</span>
            </button>
            <button onClick={() => setMediaTab('favorites')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${mediaTab === 'favorites' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <Star size={16} /> Favorites
            </button>
          </div>

          {/* Upload Dropzone */}
          {mediaTab === 'uploads' && (
            <label className="block bg-[#111] border-2 border-dashed border-[#2a2a2a] hover:border-indigo-500/50 rounded-2xl p-10 text-center cursor-pointer transition group relative overflow-hidden">
              {uploading && <div className="absolute inset-0 bg-[#111]/80 flex items-center justify-center z-10"><RefreshCw className="animate-spin text-indigo-500" /></div>}
              <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" disabled={uploading} />
              <div className="bg-indigo-500/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
                <Upload className="text-indigo-400" />
              </div>
              <h4 className="text-slate-100 font-bold mb-1">Subir imagen</h4>
              <p className="text-xs text-slate-500">Haz click o arrastra una imagen aquí (PNG, JPG, WEBP)</p>
            </label>
          )}

          {/* Video Generation Dropzone */}
          {mediaTab === 'videos' && (
            <div className="bg-[#111] border-2 border-indigo-500/20 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 group transition duration-500">
              <div className="bg-indigo-500/10 h-20 w-20 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                <Video className="text-indigo-400" size={32} />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <h4 className="text-slate-100 font-bold text-lg">Video Hub (fal.ai)</h4>
                <p className="text-sm text-slate-500 max-w-md">Describe una escena cinematográfica de 5 segundos. Usamos Hailuo 02 por defecto para máxima calidad.</p>
                <div className="flex gap-2 mt-4 p-1 bg-[#0a0a0a] rounded-xl border border-[#2a2a2a] focus-within:border-indigo-500/50 transition duration-300">
                  <input
                    type="text"
                    placeholder="Ej: Un arquitecto futurista diseñando en VR con hologramas indigos..."
                    value={videoPrompt}
                    onChange={e => setVideoPrompt(e.target.value)}
                    className="flex-1 bg-transparent border-0 outline-none text-slate-200 px-4 py-2 text-sm focus:ring-0"
                  />
                  <button
                    disabled={videoGenerating || !videoPrompt}
                    onClick={handleGenerateVideo}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {videoGenerating ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
                    {videoGenerating ? 'Generando...' : 'Generar Video'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Media Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mediaTab === 'generated' && (body as CarouselSlide[]).filter(s => s.image_url).map((slide, i) => (
              <MediaCard
                key={i}
                url={slide.image_url!}
                selected={selectedUrls.includes(slide.image_url!)}
                onToggle={() => toggleSelection(slide.image_url!)}
              />
            ))}
            {(mediaTab === 'uploads' || mediaTab === 'combined' || mediaTab === 'videos' || mediaTab === 'favorites') && mediaList.filter(m => (mediaTab === 'favorites' ? m.favorite : (m.type === mediaTab.slice(0, -1) || m.type === mediaTab))).map((media, i) => (
              <MediaCard
                key={media.id}
                url={media.url}
                type={media.type}
                favorite={media.favorite}
                selected={selectedUrls.includes(media.url)}
                onToggle={() => toggleSelection(media.url)}
                onFavorite={() => toggleFavorite(media.id, media.favorite)}
                onDelete={() => handleDelete(media.id)}
                onZoom={() => setLightboxUrl(media.url)}
                onDownload={() => handleDownload(media.url, media.name)}
                onUse={content.type === 'carousel' ? () => { setUseInSlideUrl(media.url); setShowSlideSelector(true); } : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300">
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-20"
          >
            <X size={24} />
          </button>
          <div className="relative w-full h-full flex items-center justify-center">
            <NextImage
              src={lightboxUrl}
              alt="Detail"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}

      {/* Slide Selector Modal */}
      {showSlideSelector && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-[#111] border border-[#2a2a2a] w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
              <Layers className="text-indigo-500" /> Usar en Carrusel
            </h3>
            <p className="text-sm text-slate-400 mb-8">Selecciona en qué slide deseas colocar esta imagen.</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {Array.from({ length: 10 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleReplaceSlide(useInSlideUrl!, i)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-[#2a2a2a] hover:border-indigo-500/50 hover:bg-indigo-500/10 transition group text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-indigo-400 transition">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{slideLabels[i + 1]}</p>
                    <p className="text-[10px] text-slate-500">Slide {i + 1}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setShowSlideSelector(false); setUseInSlideUrl(null); }}
              className="w-full py-4 text-sm font-bold text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MediaCard({ url, selected, type, favorite, onToggle, onFavorite, onDelete, onZoom, onDownload, onUse }: {
  url: string,
  selected: boolean,
  type?: 'upload' | 'combined' | 'generated' | 'video',
  favorite?: boolean,
  onToggle: () => void,
  onFavorite?: () => void,
  onDelete?: () => void,
  onZoom?: () => void,
  onDownload?: () => void,
  onUse?: () => void
}) {
  return (
    <div
      onClick={onToggle}
      className={`bg-slate-900/40 group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 ${selected ? 'border-indigo-500 scale-95 ring-4 ring-indigo-500/20' : 'border-transparent hover:border-slate-700 hover:scale-[1.02]'}`}
    >
      {type === 'video' ? (
        <video src={url} className="w-full h-full object-cover" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
      ) : (
        <NextImage src={url} alt="" fill className={type === 'upload' ? 'object-contain p-2' : 'object-cover'} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw" />
      )}

      {/* Selection Overlay */}
      {selected && (
        <div className="absolute inset-0 bg-indigo-600/20 pointer-events-none flex items-center justify-center">
          <div className="bg-white rounded-full p-1.5 text-indigo-600 shadow-xl scale-125">
            <CheckCircle size={16} />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onZoom && (
          <button
            onClick={(e) => { e.stopPropagation(); onZoom(); }}
            className="p-2 rounded-lg bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition shadow-lg"
          >
            <ZoomIn size={14} />
          </button>
        )}
        {onUse && (
          <button
            onClick={(e) => { e.stopPropagation(); onUse(); }}
            className="p-2 rounded-lg bg-indigo-600/90 text-white backdrop-blur-md hover:bg-indigo-600 transition shadow-lg"
            title="Usar en Carrusel"
          >
            <Layers size={14} />
          </button>
        )}
        {onDownload && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-2 rounded-lg bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition shadow-lg"
          >
            <Download size={14} />
          </button>
        )}
        {onFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            className={`p-2 rounded-lg backdrop-blur-md transition shadow-lg ${favorite ? 'bg-indigo-600 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
          >
            <Star size={14} fill={favorite ? "currentColor" : "none"} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 rounded-lg bg-red-600/80 text-white backdrop-blur-md hover:bg-red-600 transition shadow-lg"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {!selected && (
        <div className="absolute top-2 left-2 h-5 w-5 rounded-md border border-white/20 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  )
}

