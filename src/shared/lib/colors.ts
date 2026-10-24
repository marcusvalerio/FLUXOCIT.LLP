import type { ObjectCategory } from '../../types/layout'

/** Mirrors docs/DESIGN_SYSTEM.md § 2.2 and § 2.3. */
export const CATEGORY_COLORS: Record<ObjectCategory, string> = {
  structure: '#3F4753',
  storage: '#B45309',
  pallet: '#8B5E34',
  equipment: '#2563EB',
  area: '#0D9488',
  flow: '#7C3AED',
  safety: '#DC2626',
  other: '#64748B',
}

export const AREA_TYPE_COLORS: Record<string, string> = {
  receiving: '#0D9488',
  shipping: '#2563EB',
  picking: '#7C3AED',
  staging: '#D97706',
  quarantine: '#DC2626',
  returns: '#DB2777',
  storage: '#B45309',
  circulation: '#64748B',
  administrative: '#0EA5E9',
  custom: '#334155',
}

export const AREA_TYPE_LABELS: Record<string, string> = {
  receiving: 'Recebimento',
  shipping: 'Expedição',
  picking: 'Picking',
  staging: 'Staging',
  quarantine: 'Quarentena',
  returns: 'Devolução',
  storage: 'Armazenagem',
  circulation: 'Circulação',
  administrative: 'Administrativa',
  custom: 'Personalizada',
}
