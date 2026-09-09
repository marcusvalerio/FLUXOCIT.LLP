import { cmToPx, pxToCm } from '../../../shared/lib/units'

interface RulersProps {
  camera: { x: number; y: number; zoom: number }
  scalePxPerMeter: number
  envWidthM: number
  envHeightM: number
  containerWidth: number
  containerHeight: number
}

export const RULER_SIZE = 24

/** Espaçamento dos traços rotulados (m). Menos marcas quando afastado, mais quando aproximado. */
function pickStepM(zoom: number): number {
  if (zoom < 0.35) return 5
  if (zoom < 0.8) return 2
  if (zoom < 2.5) return 1
  return 0.5
}

/** Subdivisões sem rótulo entre dois traços principais — dão a leitura fina da régua sem poluir. */
const MINOR_TICKS_PER_STEP = 5

function buildTicks(
  fromM: number,
  toM: number,
  stepM: number,
  limitM: number,
  toScreen: (m: number) => number,
) {
  const minorStepM = stepM / MINOR_TICKS_PER_STEP
  const start = Math.max(0, Math.floor(fromM / stepM) * stepM)
  const end = Math.min(limitM, Math.ceil(toM / stepM) * stepM)

  const major: { m: number; pos: number }[] = []
  const minor: { key: string; pos: number }[] = []

  for (let m = start; m <= end + 1e-6; m += stepM) {
    const rounded = Math.round(m * 100) / 100
    major.push({ m: rounded, pos: toScreen(rounded) })
    for (let i = 1; i < MINOR_TICKS_PER_STEP; i++) {
      const sub = Math.round((m + minorStepM * i) * 1000) / 1000
      if (sub > limitM + 1e-6 || sub > end + 1e-6) break
      minor.push({ key: `${rounded}-${i}`, pos: toScreen(sub) })
    }
  }

  return { major, minor }
}

/**
 * Réguas nas bordas superior e esquerda da prancheta, em metros reais. Duas hierarquias de
 * traço (principal com rótulo, secundário sem) e números tabulares em Supreme: a leitura da
 * escala acompanha zoom e pan sem competir visualmente com o desenho.
 */
export function Rulers({
  camera,
  scalePxPerMeter,
  envWidthM,
  envHeightM,
  containerWidth,
  containerHeight,
}: RulersProps) {
  const stepM = pickStepM(camera.zoom)

  const worldLeftM = pxToCm(-camera.x / camera.zoom, scalePxPerMeter) / 100
  const worldRightM = pxToCm((containerWidth - camera.x) / camera.zoom, scalePxPerMeter) / 100
  const worldTopM = pxToCm(-camera.y / camera.zoom, scalePxPerMeter) / 100
  const worldBottomM = pxToCm((containerHeight - camera.y) / camera.zoom, scalePxPerMeter) / 100

  const horizontal = buildTicks(worldLeftM, worldRightM, stepM, envWidthM, (m) =>
    camera.x + cmToPx(m * 100, scalePxPerMeter) * camera.zoom,
  )
  const vertical = buildTicks(worldTopM, worldBottomM, stepM, envHeightM, (m) =>
    camera.y + cmToPx(m * 100, scalePxPerMeter) * camera.zoom,
  )

  return (
    <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
      {/* Régua horizontal */}
      <div
        className="absolute top-0 bg-surface/92 border-b border-border overflow-hidden backdrop-blur-[2px]"
        style={{ left: RULER_SIZE, right: 0, height: RULER_SIZE }}
      >
        {horizontal.minor.map(({ key, pos }) => (
          <div
            key={key}
            className="absolute bottom-0 w-px h-1.5 bg-text-disabled/45"
            style={{ left: pos - RULER_SIZE }}
          />
        ))}
        {horizontal.major.map(({ m, pos }) => (
          <div key={m} className="absolute bottom-0 top-0" style={{ left: pos - RULER_SIZE }}>
            <div className="absolute bottom-0 w-px h-2.5 bg-text-secondary/70" />
            <span className="absolute top-[3px] left-1 font-heading text-[10px] leading-none tracking-tight text-text-secondary tabular-nums whitespace-nowrap">
              {m}
            </span>
          </div>
        ))}
      </div>

      {/* Régua vertical */}
      <div
        className="absolute left-0 bg-surface/92 border-r border-border overflow-hidden backdrop-blur-[2px]"
        style={{ top: RULER_SIZE, bottom: 0, width: RULER_SIZE }}
      >
        {vertical.minor.map(({ key, pos }) => (
          <div
            key={key}
            className="absolute right-0 h-px w-1.5 bg-text-disabled/45"
            style={{ top: pos - RULER_SIZE }}
          />
        ))}
        {vertical.major.map(({ m, pos }) => (
          <div key={m} className="absolute left-0 right-0" style={{ top: pos - RULER_SIZE }}>
            <div className="absolute right-0 h-px w-2.5 bg-text-secondary/70" />
            <span
              className="absolute left-[3px] font-heading text-[10px] leading-none tracking-tight text-text-secondary tabular-nums whitespace-nowrap origin-top-left"
              style={{ transform: 'rotate(-90deg) translate(-100%, 0)' }}
            >
              {m}
            </span>
          </div>
        ))}
      </div>

      {/* Canto: unidade das duas réguas */}
      <div
        className="absolute top-0 left-0 bg-surface border-b border-r border-border flex items-center justify-center"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      >
        <span className="font-heading text-[9px] font-medium leading-none text-text-disabled">m</span>
      </div>
    </div>
  )
}
