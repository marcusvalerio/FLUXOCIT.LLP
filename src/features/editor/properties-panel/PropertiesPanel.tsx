import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Copy,
  RotateCcw,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { OBJECT_CATALOG, getObjectDescription } from '../objects/catalog'
import { ObjectThumbnail } from '../objects/ObjectThumbnail'
import { useEditorStore } from '../state/useEditorStore'
import { cmToM, mToCm } from '../../../shared/lib/units'
import { NumberField } from '../../../shared/ui/NumberField'
import { IconButton } from '../../../shared/ui/IconButton'
import type { BoundsStatus } from '../../../shared/lib/spatialRules'
import type { LayoutObject } from '../../../types/layout'

interface PropertiesPanelProps {
  object: LayoutObject
  hasOverlap?: boolean
  boundsStatus?: BoundsStatus
}

const BOUNDS_WARNING_TEXT: Partial<Record<BoundsStatus, string>> = {
  partial: 'Parcialmente fora do ambiente — parte do objeto ultrapassa o limite.',
  outside: 'Totalmente fora do ambiente — o objeto está fora dos limites definidos.',
}

export function PropertiesPanel({ object, hasOverlap, boundsStatus }: PropertiesPanelProps) {
  const setProperty = useEditorStore((s) => s.setProperty)
  const deleteObject = useEditorStore((s) => s.deleteObject)
  const duplicateObject = useEditorStore((s) => s.duplicateObject)
  const rotateObject = useEditorStore((s) => s.rotateObject)
  const bringSelectedToFront = useEditorStore((s) => s.bringSelectedToFront)
  const sendSelectedToBack = useEditorStore((s) => s.sendSelectedToBack)
  const bringSelectedForward = useEditorStore((s) => s.bringSelectedForward)
  const sendSelectedBackward = useEditorStore((s) => s.sendSelectedBackward)
  const [textDrafts, setTextDrafts] = useState<Record<string, string>>({})

  const def = OBJECT_CATALOG[object.objectType]
  const boundsWarning = boundsStatus ? BOUNDS_WARNING_TEXT[boundsStatus] : undefined
  const textDraftSource = def.propertyFields
    .filter((field) => field.kind === 'text')
    .map((field) => field.key === 'name' ? object.name ?? '' : String(object.properties[field.key] ?? ''))
    .join('\u001f')

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const field of def.propertyFields) {
      if (field.kind !== 'text') continue
      next[field.key] = field.key === 'name' ? (object.name ?? '') : String(object.properties[field.key] ?? '')
    }
    setTextDrafts(next)
  }, [object.id, object.objectType, textDraftSource])

  function commitTextField(key: string) {
    const value = textDrafts[key] ?? ''
    const current = key === 'name' ? (object.name ?? '') : String(object.properties[key] ?? '')
    if (value === current) return
    setProperty(object.id, key, value)
  }

  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      {hasOverlap && (
        <div className="flex items-start gap-2 rounded-md bg-danger/10 text-danger text-sm p-2.5">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span className="min-w-0 break-words">Sobreposto com outro porta-paletes ou corredor — ajuste a posição.</span>
        </div>
      )}
      {boundsWarning && (
        <div className="flex items-start gap-2 rounded-md bg-warning/10 text-warning text-sm p-2.5">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span className="min-w-0 break-words">{boundsWarning}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-alt/70 md:flex">
            <ObjectThumbnail objectType={object.objectType} width={36} height={36} />
          </span>
          <span className="min-w-0">
            <h2 className="font-heading text-base font-semibold text-text-primary truncate">{def.label}</h2>
            <p className="truncate text-[11px] leading-tight text-text-secondary">
              {getObjectDescription(object.objectType)}
            </p>
          </span>
        </div>
        <div className="flex flex-wrap justify-end gap-1 shrink-0 max-w-full">
          <IconButton label="Girar -90°" onClick={() => rotateObject(object.id, -90)}>
            <RotateCcw size={18} />
          </IconButton>
          <IconButton label="Girar +90°" onClick={() => rotateObject(object.id, 90)}>
            <RotateCw size={18} />
          </IconButton>
          <IconButton label="Duplicar" onClick={() => duplicateObject(object.id)}>
            <Copy size={18} />
          </IconButton>
          <IconButton label="Excluir" onClick={() => deleteObject(object.id)}>
            <Trash2 size={18} className="text-danger" />
          </IconButton>
        </div>
      </div>

      <div className="min-w-0">
        <p className="mb-2 font-heading text-[11px] font-semibold uppercase tracking-wide text-text-disabled">
          Camadas
        </p>
        <div className="grid grid-cols-4 gap-1">
          <IconButton label="Trazer para frente" onClick={bringSelectedToFront}>
            <ChevronsUp size={18} />
          </IconButton>
          <IconButton label="Avançar uma camada" onClick={bringSelectedForward}>
            <ChevronUp size={18} />
          </IconButton>
          <IconButton label="Recuar uma camada" onClick={sendSelectedBackward}>
            <ChevronDown size={18} />
          </IconButton>
          <IconButton label="Enviar para trás" onClick={sendSelectedToBack}>
            <ChevronsDown size={18} />
          </IconButton>
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <p className="font-heading text-[11px] font-semibold uppercase tracking-wide text-text-disabled">
          Propriedades
        </p>
        {def.propertyFields.map((field) => {
          if (field.kind === 'text') {
            const value = textDrafts[field.key] ?? ''
            return (
              <label key={field.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)] items-center gap-2 text-sm min-w-0">
                <span className="min-w-0 break-words text-text-secondary">{field.label}</span>
                <input
                  type="text"
                  value={value}
                  placeholder={def.label}
                  onChange={(e) => setTextDrafts((current) => ({ ...current, [field.key]: e.target.value }))}
                  onBlur={() => commitTextField(field.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                  className="w-full min-w-0 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-base text-text-primary placeholder:text-text-disabled transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 md:text-sm"
                />
              </label>
            )
          }
          if (field.kind === 'number-m') {
            const raw = (object as unknown as Record<string, number>)[field.key]
            return <NumberField key={field.key} label={field.label} unit="m" step={field.step ?? 0.1} min={field.min} value={cmToM(raw)} onCommit={(v) => setProperty(object.id, field.key, mToCm(v))} />
          }
          if (field.kind === 'number-deg') {
            return <NumberField key={field.key} label={field.label} unit="°" step={field.step ?? 15} value={object.rotationDeg} onCommit={(v) => setProperty(object.id, field.key, ((v % 360) + 360) % 360)} />
          }
          if (field.kind === 'number-plain') {
            const raw = Number(object.properties[field.key] ?? 0)
            return <NumberField key={field.key} label={field.label} unit={field.unit ?? ''} step={field.step ?? 1} min={field.min} value={raw} onCommit={(v) => setProperty(object.id, field.key, v)} />
          }
          if (field.kind === 'select') {
            const value = String(object.properties[field.key] ?? field.options?.[0]?.value ?? '')
            return (
              <label key={field.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)] items-center gap-2 text-sm min-w-0">
                <span className="min-w-0 break-words text-text-secondary">{field.label}</span>
                <select value={value} onChange={(e) => setProperty(object.id, field.key, e.target.value)} className="w-full min-w-0 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {field.options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
            )
          }
          if (field.kind === 'info') {
            return <div key={field.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-sm min-w-0"><span className="min-w-0 break-words text-text-secondary">{field.label}</span><span className="min-w-0 text-right text-text-primary font-medium break-words">{field.compute?.(object)}</span></div>
          }
          return null
        })}
      </div>
    </div>
  )
}
