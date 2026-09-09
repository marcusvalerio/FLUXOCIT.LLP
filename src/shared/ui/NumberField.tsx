import { useEffect, useState } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  unit: string
  step?: number
  min?: number
  onCommit: (value: number) => void
}

export function NumberField({ label, value, unit, step = 1, min, onCommit }: NumberFieldProps) {
  const [text, setText] = useState(() => value.toString())

  useEffect(() => {
    setText(value.toString())
  }, [value])

  function handleBlur() {
    const parsed = Number.parseFloat(text.replace(',', '.'))
    if (Number.isNaN(parsed)) {
      setText(value.toString())
      return
    }
    const clamped = min !== undefined ? Math.max(min, parsed) : parsed
    onCommit(clamped)
    setText(clamped.toString())
  }

  return (
    <label className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)] items-center gap-2 text-sm min-w-0">
      <span className="min-w-0 break-words text-text-secondary">{label}</span>
      <span className="flex min-w-0 items-center gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          step={step}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className="w-full min-w-0 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-base tabular-nums text-text-primary placeholder:text-text-disabled transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 md:text-sm"
        />
        {unit && <span className="w-5 shrink-0 text-text-secondary">{unit}</span>}
      </span>
    </label>
  )
}
