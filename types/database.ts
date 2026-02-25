export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  status: 'planning' | 'active' | 'completed' | 'on_hold'
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  notes: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

export interface Sprint {
  id: string
  user_id: string
  name: string
  description: string | null
  status: 'planning' | 'active' | 'completed' | 'on_hold'
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
}

export interface Client {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}
