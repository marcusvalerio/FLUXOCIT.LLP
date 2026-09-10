import { useEffect, useMemo, useState } from 'react'
import { analyzeProject, type Insight } from '../../../shared/lib/intelligence'
import { useEditorStore } from '../state/useEditorStore'

/** Espera o gesto terminar antes de reanalisar: durante um arraste `objects` muda a cada quadro,
 * e análise por quadro é a forma mais rápida de deixar o canvas travado. */
const DEBOUNCE_MS = 350

/**
 * Insights do projeto, recalculados fora do caminho crítico da interação.
 *
 * `enabled` desliga o cálculo quando o painel não está visível — quem está desenhando não paga
 * pela análise que não está olhando.
 */
export function useProjectInsights(enabled: boolean): Insight[] {
  const objects = useEditorStore((s) => s.objects)
  const flowNodes = useEditorStore((s) => s.flowNodes)
  const flowConnections = useEditorStore((s) => s.flowConnections)
  const envWidthM = useEditorStore((s) => s.envWidthM)
  const envHeightM = useEditorStore((s) => s.envHeightM)

  const [snapshot, setSnapshot] = useState({ objects, flowNodes, flowConnections, envWidthM, envHeightM })

  useEffect(() => {
    if (!enabled) return
    const timer = setTimeout(() => {
      setSnapshot({ objects, flowNodes, flowConnections, envWidthM, envHeightM })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [enabled, objects, flowNodes, flowConnections, envWidthM, envHeightM])

  return useMemo(() => (enabled ? analyzeProject(snapshot) : []), [enabled, snapshot])
}
