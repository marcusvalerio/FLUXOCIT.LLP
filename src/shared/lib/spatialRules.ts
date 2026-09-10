import { getBoundingBox } from './geometry'
import { AREA_TYPES, CIRCULATION_TYPES, MOBILE_EQUIPMENT_TYPES } from './logisticsTypes'
import type { LayoutObject } from '../../types/layout'

/** Racks/corridors claim a fixed storage footprint — unlike walls (which meet at corners) or
 * docks (which sit deliberately on a wall), any overlap between two of these is a real
 * planning error. Scoped narrowly to avoid false positives elsewhere in the layout. */
const OVERLAP_CHECKED_TYPES = new Set(['rack', 'corridor'])

/** Ignore near-zero AABB overlap from objects placed edge-to-edge (snap can leave a hairline
 * float-precision sliver that isn't a real conflict). */
const TOLERANCE_CM = 5

/**
 * Returns the ids of storage objects (rack/corridor) whose bounding box overlaps another
 * storage object's by more than a small tolerance. See docs/BUSINESS_RULES.md § Regras espaciais.
 */
export function findStorageOverlaps(objects: LayoutObject[]): Set<string> {
  const candidates = objects.filter((o) => OVERLAP_CHECKED_TYPES.has(o.objectType))
  const boxes = candidates.map((o) => ({ obj: o, box: getBoundingBox(o) }))
  const overlapping = new Set<string>()

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].box
      const b = boxes[j].box
      const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)
      const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY)
      if (overlapX > TOLERANCE_CM && overlapY > TOLERANCE_CM) {
        overlapping.add(boxes[i].obj.id)
        overlapping.add(boxes[j].obj.id)
      }
    }
  }

  return overlapping
}

export type BoundsStatus = 'inside' | 'partial' | 'outside'

/**
 * Whether an object's bounding box (rotation-aware) sits fully inside the environment, straddles
 * its edge, or is entirely off it. Used to warn the user without blocking the placement — objects
 * can legitimately be mid-drag or awaiting a bigger environment.
 */
export function getBoundsStatus(obj: LayoutObject, envWidthCm: number, envHeightCm: number): BoundsStatus {
  const box = getBoundingBox(obj)
  const fullyOutside = box.maxX <= 0 || box.minX >= envWidthCm || box.maxY <= 0 || box.minY >= envHeightCm
  if (fullyOutside) return 'outside'
  const fullyInside = box.minX >= 0 && box.maxX <= envWidthCm && box.minY >= 0 && box.maxY <= envHeightCm
  return fullyInside ? 'inside' : 'partial'
}

/** Footprint categories counted toward occupancy — zones (area) and routes (flow) are markers,
 * not physical footprint, so they're excluded. */
const OCCUPANCY_CATEGORIES = new Set(['structure', 'storage', 'equipment', 'pallet'])

/**
 * Approximate percentage of the environment's floor area covered by solid objects (bounding
 * box sum — objects that overlap, e.g. a pallet inside a rack, are double-counted, so this is
 * a directional estimate rather than an exact figure). Returns 0 for an environment with no area.
 */
export function computeOccupancyPercent(objects: LayoutObject[], envWidthCm: number, envHeightCm: number): number {
  const envArea = envWidthCm * envHeightCm
  if (envArea <= 0) return 0
  const occupiedArea = objects
    .filter((o) => OCCUPANCY_CATEGORIES.has(o.category))
    .reduce((sum, o) => sum + o.width * o.length, 0)
  return (occupiedArea / envArea) * 100
}

// --- Corredor inteligente + regras espaciais expandidas (Fase 8) ---

/** Recommended minimum corridor width per traffic type, in cm — general logistics reference
 * figures (not a certified standard), used only to flag a corridor for review. Never blocks
 * placement. See docs/BUSINESS_RULES.md § Regras espaciais (Fase 8). */
export const CORRIDOR_MIN_WIDTH_CM: Record<string, number> = {
  pedestrian: 90,
  picking: 90,
  mixed: 200,
  pallets: 250,
  forklift: 320,
}
const DEFAULT_CORRIDOR_MIN_WIDTH_CM = 150

/** Looks up the recommended minimum width for a corridor's `corridorType` property, falling back
 * to a generic figure for an unset/unrecognized type. */
export function getRecommendedCorridorWidthCm(corridorType: unknown): number {
  return CORRIDOR_MIN_WIDTH_CM[String(corridorType)] ?? DEFAULT_CORRIDOR_MIN_WIDTH_CM
}

export type RuleSeverity = 'warning' | 'critical'

export interface SpatialViolation {
  /** Stable id for the violation itself (not an object id) — lets a UI list key/dedupe entries. */
  id: string
  code:
    | 'out-of-bounds'
    | 'storage-overlap'
    | 'corridor-blocked'
    | 'corridor-narrow'
    | 'equipment-structure-conflict'
    | 'area-overlap'
    | 'dock-blocked'
  severity: RuleSeverity
  objectIds: string[]
  message: string
}

/** Only rigid, impassable structure — doors/gates/docks are deliberate openings equipment must
 * pass through, so they're excluded to avoid false positives. */
const RIGID_STRUCTURE_TYPES = new Set(['wall', 'column'])

/** Storage/structure footprints that count as "invading" a corridor if their box overlaps it. */
const CORRIDOR_INTRUSION_CATEGORIES = new Set(['storage', 'structure', 'equipment'])

/** A generic Portuguese label per object type, used as the "type" half of a rule message
 * subject (e.g. "Doca" in "Doca D02 está bloqueada..."). */
const GENERIC_TYPE_LABELS: Record<string, string> = {
  rack: 'Porta-paletes',
  'drive-in': 'Drive-in',
  'push-back': 'Push-back',
  'flow-rack': 'Flow rack',
  cantilever: 'Cantilever',
  shelf: 'Estante',
  'storage-block': 'Bloco de armazenagem',
  corridor: 'Corredor',
  wall: 'Parede',
  column: 'Coluna',
  dock: 'Doca',
  forklift: 'Empilhadeira',
  'pallet-jack': 'Paleteira',
  'reach-truck': 'Reach truck',
  tug: 'Rebocador',
  'order-picker': 'Order picker',
  'platform-cart': 'Carrinho de carga',
  area: 'Área',
  'area-picking': 'Área de picking',
  'area-staging': 'Área de staging',
  'area-inspection': 'Área de conferência',
  'area-shipping': 'Área de expedição',
  'area-receiving': 'Área de recebimento',
}

/** The object's warehouse address/code if set, else its free-text name, else empty. */
function addressSuffix(o: LayoutObject): string {
  const code = o.properties.code
  if (typeof code === 'string' && code.trim()) return code.trim()
  if (o.name?.trim()) return o.name.trim()
  return ''
}

/** A short, human-readable label for an object in a rule message — "Tipo Código" when an
 * address/name is set (e.g. "Doca D02", matching the brief's own examples), or just the generic
 * type label otherwise (e.g. "Doca"). */
function labelFor(o: LayoutObject): string {
  const typeLabel = GENERIC_TYPE_LABELS[o.objectType] ?? o.objectType
  const addr = addressSuffix(o)
  return addr ? `${typeLabel} ${addr}` : typeLabel
}

function overlapAreaCm2(a: LayoutObject, b: LayoutObject): number {
  const boxA = getBoundingBox(a)
  const boxB = getBoundingBox(b)
  const overlapX = Math.min(boxA.maxX, boxB.maxX) - Math.max(boxA.minX, boxB.minX)
  const overlapY = Math.min(boxA.maxY, boxB.maxY) - Math.max(boxA.minY, boxB.minY)
  if (overlapX > TOLERANCE_CM && overlapY > TOLERANCE_CM) return overlapX * overlapY
  return 0
}

/** "Objetos fora da área": objects whose footprint straddles or sits entirely off the
 * environment — reuses getBoundsStatus, one violation per affected object. */
export function findOutOfBoundsViolations(
  objects: LayoutObject[],
  envWidthCm: number,
  envHeightCm: number,
): SpatialViolation[] {
  const violations: SpatialViolation[] = []
  for (const o of objects) {
    const status = getBoundsStatus(o, envWidthCm, envHeightCm)
    if (status === 'inside') continue
    const label = labelFor(o)
    violations.push({
      id: `out-of-bounds:${o.id}`,
      code: 'out-of-bounds',
      severity: status === 'outside' ? 'critical' : 'warning',
      objectIds: [o.id],
      message:
        status === 'outside'
          ? `${label} está totalmente fora dos limites do ambiente.`
          : `${label} está parcialmente fora dos limites do ambiente.`,
    })
  }
  return violations
}

/** "Sobreposição de estruturas de armazenagem": wraps findStorageOverlaps with a readable
 * message per overlapping pair. */
export function findStorageOverlapViolations(objects: LayoutObject[]): SpatialViolation[] {
  const candidates = objects.filter((o) => OVERLAP_CHECKED_TYPES.has(o.objectType))
  const violations: SpatialViolation[] = []
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i]
      const b = candidates[j]
      if (overlapAreaCm2(a, b) <= 0) continue
      violations.push({
        id: `storage-overlap:${a.id}:${b.id}`,
        code: 'storage-overlap',
        severity: 'critical',
        objectIds: [a.id, b.id],
        message: `${labelFor(a)} está sobreposto a ${labelFor(b)}.`,
      })
    }
  }
  return violations
}

/** "Bloqueio de corredor": any storage/structure/equipment footprint invading a corridor's
 * bounding box — e.g. "Porta-paletes invade o corredor C03." */
export function findBlockedCorridors(objects: LayoutObject[]): SpatialViolation[] {
  const corridors = objects.filter((o) => o.objectType === 'corridor')
  const intruders = objects.filter(
    (o) => o.objectType !== 'corridor' && CORRIDOR_INTRUSION_CATEGORIES.has(o.category) && !CIRCULATION_TYPES.has(o.objectType),
  )
  const violations: SpatialViolation[] = []
  for (const corridor of corridors) {
    const corridorAddr = addressSuffix(corridor)
    for (const intruder of intruders) {
      if (overlapAreaCm2(corridor, intruder) <= 0) continue
      violations.push({
        id: `corridor-blocked:${corridor.id}:${intruder.id}`,
        code: 'corridor-blocked',
        severity: 'critical',
        objectIds: [corridor.id, intruder.id],
        message: `${labelFor(intruder)} invade o corredor${corridorAddr ? ' ' + corridorAddr : ''}.`,
      })
    }
  }
  return violations
}

/** "Corredor muito estreito": corridor width (its shorter side — the traversable dimension)
 * below the recommendation for its declared `corridorType`. */
export function findNarrowCorridors(objects: LayoutObject[]): SpatialViolation[] {
  const violations: SpatialViolation[] = []
  for (const o of objects) {
    if (o.objectType !== 'corridor') continue
    const widthCm = Math.min(o.width, o.length)
    const recommendedCm = getRecommendedCorridorWidthCm(o.properties.corridorType)
    if (widthCm >= recommendedCm) continue
    const corridorAddr = addressSuffix(o)
    violations.push({
      id: `corridor-narrow:${o.id}`,
      code: 'corridor-narrow',
      severity: 'warning',
      objectIds: [o.id],
      message: `Largura do corredor${corridorAddr ? ' ' + corridorAddr : ''} está abaixo da recomendação (${Math.round(widthCm)} cm, mínimo sugerido ${recommendedCm} cm).`,
    })
  }
  return violations
}

/** "Conflito entre equipamento e estrutura": mobile equipment (forklift, reach truck, tug, …)
 * whose footprint overlaps a rigid structure (wall/column) it couldn't physically pass through. */
export function findEquipmentStructureConflicts(objects: LayoutObject[]): SpatialViolation[] {
  const equipment = objects.filter((o) => MOBILE_EQUIPMENT_TYPES.has(o.objectType))
  const structures = objects.filter((o) => RIGID_STRUCTURE_TYPES.has(o.objectType))
  const violations: SpatialViolation[] = []
  for (const eq of equipment) {
    for (const st of structures) {
      if (overlapAreaCm2(eq, st) <= 0) continue
      violations.push({
        id: `equipment-structure-conflict:${eq.id}:${st.id}`,
        code: 'equipment-structure-conflict',
        severity: 'critical',
        objectIds: [eq.id, st.id],
        message: `${labelFor(eq)} está em conflito com ${labelFor(st)}.`,
      })
    }
  }
  return violations
}

/** "Área operacional sobreposta": two logistics zones (Área, Área de picking/staging/
 * conferência/expedição/recebimento, …) whose footprints overlap. */
export function findOverlappingOperationalAreas(objects: LayoutObject[]): SpatialViolation[] {
  const areas = objects.filter((o) => AREA_TYPES.has(o.objectType) || o.category === 'area')
  const violations: SpatialViolation[] = []
  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      const a = areas[i]
      const b = areas[j]
      if (overlapAreaCm2(a, b) <= 0) continue
      violations.push({
        id: `area-overlap:${a.id}:${b.id}`,
        code: 'area-overlap',
        severity: 'warning',
        objectIds: [a.id, b.id],
        message: `${labelFor(a)} sobrepõe ${labelFor(b)}.`,
      })
    }
  }
  return violations
}

/** "Doca obstruída": a dock partly or mostly covered by another object's footprint — e.g.
 * "Doca D02 está parcialmente bloqueada." Severity escalates to critical once the obstruction
 * covers most of the dock's own area. */
export function findBlockedDocks(objects: LayoutObject[]): SpatialViolation[] {
  const docks = objects.filter((o) => o.objectType === 'dock')
  const others = objects.filter((o) => o.objectType !== 'dock')
  const violations: SpatialViolation[] = []
  for (const dock of docks) {
    const dockArea = dock.width * dock.length
    for (const other of others) {
      const overlap = overlapAreaCm2(dock, other)
      if (overlap <= 0) continue
      const coverage = dockArea > 0 ? overlap / dockArea : 0
      const blocked = coverage >= 0.6
      violations.push({
        id: `dock-blocked:${dock.id}:${other.id}`,
        code: 'dock-blocked',
        severity: blocked ? 'critical' : 'warning',
        objectIds: [dock.id, other.id],
        message: blocked
          ? `${labelFor(dock)} está bloqueada por ${labelFor(other)}.`
          : `${labelFor(dock)} está parcialmente bloqueada por ${labelFor(other)}.`,
      })
    }
  }
  return violations
}

/**
 * Aggregates every spatial rule into one list of human-readable violations — the source of
 * truth for both canvas highlighting and the alert panel (Fase 8 § Painel de análise). See
 * docs/BUSINESS_RULES.md § Regras espaciais.
 */
export function computeSpatialViolations(
  objects: LayoutObject[],
  envWidthCm: number,
  envHeightCm: number,
): SpatialViolation[] {
  return [
    ...findOutOfBoundsViolations(objects, envWidthCm, envHeightCm),
    ...findStorageOverlapViolations(objects),
    ...findBlockedCorridors(objects),
    ...findNarrowCorridors(objects),
    ...findEquipmentStructureConflicts(objects),
    ...findOverlappingOperationalAreas(objects),
    ...findBlockedDocks(objects),
  ]
}
