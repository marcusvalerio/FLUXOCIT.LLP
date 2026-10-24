import { Circle, Line, Rect, Text } from 'react-konva'
import type { ObjectRenderProps } from '../types'

const RED = '#DC2626'
const YELLOW = '#FACC15'
const GREEN = '#16A34A'
const WHITE = '#FFFFFF'

/** Extintor: a demarcação de piso usual (quadrado vermelho com borda amarela) com o cilindro do
 * extintor ao centro, visto de cima. */
export function FireExtinguisher({ widthPx, lengthPx }: ObjectRenderProps) {
  const r = Math.min(widthPx, lengthPx) * 0.22
  return (
    <>
      <Rect width={widthPx} height={lengthPx} fill={RED} stroke={YELLOW} strokeWidth={Math.max(2, Math.min(widthPx, lengthPx) * 0.1)} />
      <Circle x={widthPx / 2} y={lengthPx / 2} radius={r} fill={WHITE} stroke="#7F1D1D" strokeWidth={1.5} />
      <Circle x={widthPx / 2} y={lengthPx / 2} radius={r * 0.4} fill="#111827" />
    </>
  )
}

/** Hidrante (abrigo de mangueira): caixa vermelha com o "H" de hidrante. */
export function FireHydrant({ widthPx, lengthPx }: ObjectRenderProps) {
  const size = Math.min(widthPx, lengthPx) * 0.7
  return (
    <>
      <Rect width={widthPx} height={lengthPx} fill={RED} stroke="#7F1D1D" strokeWidth={2} cornerRadius={2} />
      <Text text="H" width={widthPx} height={lengthPx} align="center" verticalAlign="middle" fontSize={size} fontStyle="bold" fill={WHITE} />
    </>
  )
}

/** Placa de saída de emergência: verde com seta branca apontando o sentido da rota de fuga. */
export function EmergencyExit({ widthPx, lengthPx }: ObjectRenderProps) {
  const cy = lengthPx / 2
  const pad = widthPx * 0.15
  return (
    <>
      <Rect width={widthPx} height={lengthPx} fill={GREEN} stroke="#14532D" strokeWidth={1.5} cornerRadius={2} />
      <Line points={[pad, cy, widthPx - pad, cy]} stroke={WHITE} strokeWidth={Math.max(2, lengthPx * 0.15)} lineCap="round" />
      <Line
        points={[widthPx - pad - lengthPx * 0.3, cy - lengthPx * 0.28, widthPx - pad, cy, widthPx - pad - lengthPx * 0.3, cy + lengthPx * 0.28]}
        stroke={WHITE}
        strokeWidth={Math.max(2, lengthPx * 0.15)}
        lineCap="round"
        lineJoin="round"
      />
    </>
  )
}

/** Luminária de emergência: corpo branco com a lente amarela. */
export function EmergencyLight({ widthPx, lengthPx }: ObjectRenderProps) {
  return (
    <>
      <Rect width={widthPx} height={lengthPx} fill={WHITE} stroke="#475569" strokeWidth={1.5} cornerRadius={2} />
      <Rect x={widthPx * 0.15} y={lengthPx * 0.25} width={widthPx * 0.7} height={lengthPx * 0.5} fill={YELLOW} cornerRadius={1} />
    </>
  )
}

/** Lava-olhos / chuveiro de emergência: verde com a cruz branca de primeiros socorros. */
export function Eyewash({ widthPx, lengthPx }: ObjectRenderProps) {
  const s = Math.min(widthPx, lengthPx)
  const arm = s * 0.18
  const len = s * 0.6
  return (
    <>
      <Rect width={widthPx} height={lengthPx} fill={GREEN} stroke="#14532D" strokeWidth={2} cornerRadius={3} />
      <Rect x={(widthPx - arm) / 2} y={(lengthPx - len) / 2} width={arm} height={len} fill={WHITE} />
      <Rect x={(widthPx - len) / 2} y={(lengthPx - arm) / 2} width={len} height={arm} fill={WHITE} />
    </>
  )
}
