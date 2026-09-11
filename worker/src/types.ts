export interface Env {
  DB: D1Database
  FRONTEND_ORIGIN: string
  EMAIL_FROM_NAME: string
  EMAIL_FROM_ADDRESS: string
  /** Optional — when unset, email sending falls back to logging (see email.ts). */
  RESEND_API_KEY?: string
}

export interface UserRow {
  id: string
  email: string
  password_hash: string
  must_change_password: number
  created_at: string
  updated_at: string
}

export interface ProjectRow {
  id: string
  user_id: string
  name: string
  description: string | null
  status: string
  scale_px_per_meter: number
  grid_step_m: number
  width_m: number | null
  height_m: number | null
  layout_objects: string
  flow_nodes: string
  flow_connections: string
  version: number
  created_at: string
  updated_at: string
}

export interface SessionUser {
  id: string
  email: string
  mustChangePassword: boolean
}

export type ProjectRole = 'owner' | 'editor'

export interface ProjectMemberRow {
  project_id: string
  user_id: string
  role: ProjectRole
  created_at: string
}
