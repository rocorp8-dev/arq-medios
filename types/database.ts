export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  created_at: string
}

export interface Topic {
  id: string
  user_id: string
  title: string
  description: string | null
  status: 'draft' | 'ready' | 'used'
  category: string | null
  created_at: string
}

export interface CarouselSlide {
  slide_number: number
  title: string
  body: string
  design_notes: string
  image_url?: string
  image_prompt?: string
}

export interface ReelSection {
  section: 'gancho' | 'problema' | 'evidencia' | 'solucion' | 'cta'
  label: string
  text: string
}

export interface Content {
  id: string
  user_id: string
  topic_id: string | null
  type: 'carousel' | 'reel'
  title: string
  body: CarouselSlide[] | ReelSection[]
  status: 'draft' | 'review' | 'approved' | 'published'
  platform: 'instagram' | 'facebook' | 'both'
  campaign_id: string | null
  scheduled_at: string | null
  published_at: string | null
  created_at: string
}

export interface Campaign {
  id: string
  user_id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'completed'
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface WebhookLog {
  id: string
  user_id: string
  content_id: string | null
  webhook_url: string
  status: 'sent' | 'failed' | 'delivered'
  response_data: Record<string, unknown> | null
  sent_at: string
}

export interface WebhookConfig {
  id: string
  user_id: string
  make_webhook_url: string | null
  created_at: string
  updated_at: string
}

export interface Media {
  id: string
  user_id: string
  url: string
  name: string
  type: 'upload' | 'combined' | 'generated' | 'video'
  prompt: string | null
  favorite: boolean
  created_at: string
}

export interface AICost {
  id: string
  user_id: string
  model_used: string
  type: 'text' | 'image' | 'video'
  duration_seconds: number | null
  total_cost_usd: number
  metadata: Record<string, unknown> | null
  created_at: string
}
