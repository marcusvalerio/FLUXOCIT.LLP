import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useEditorStore } from '../state/useEditorStore'
import { Button } from '../../../shared/ui/Button'
import { applyEditFrom3D, type EditMessage } from './applyEdit'

/** Página estática do visualizador (public/simulations). Fica fora do bundle do app: o editor
 * continua 2D e o Three.js só é carregado quando a aba 3D é aberta. */
const VIEWER_URL = '/simulations/projeto-3d.html'
/** Mesma chave lida pelo visualizador quando aberto em outra aba. */
const STORAGE_KEY = 'argus:3d-project'

/**
 * Aba 3D: o projeto aberto (Layout + Fluxo) em 3D. O projeto é enviado ao iframe por postMessage
 * a cada alteração; edições feitas no 3D voltam como mensagens `argus:edit` e são aplicadas pelo
 * store — o editor continua sendo a única fonte de verdade.
 */
export function Sim3DView() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [viewerReady, setViewerReady] = useState(false)

  const layoutName = useEditorStore((s) => s.layoutName)
  const envWidthM = useEditorStore((s) => s.envWidthM)
  const envHeightM = useEditorStore((s) => s.envHeightM)
  const objects = useEditorStore((s) => s.objects)
  const flowNodes = useEditorStore((s) => s.flowNodes)
  const flowConnections = useEditorStore((s) => s.flowConnections)

  const project = useMemo(
    () => ({ name: layoutName, widthM: envWidthM, heightM: envHeightM, objects, flowNodes, flowConnections }),
    [layoutName, envWidthM, envHeightM, objects, flowNodes, flowConnections],
  )

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow || e.origin !== window.location.origin) return
      if (e.data?.type === 'argus:ready') setViewerReady(true)
      else if (e.data?.type === 'argus:edit') applyEditFrom3D(e.data as EditMessage)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
    } catch {
      // Sem armazenamento (modo privado/cota): a aba continua funcionando via postMessage.
    }
    if (viewerReady) iframeRef.current?.contentWindow?.postMessage({ type: 'argus:project', project }, window.location.origin)
  }, [project, viewerReady])

  // Seleção feita no 2D (ou criada por duplicar/adicionar) aparece selecionada no 3D.
  const selectedId = useEditorStore((s) => (s.selectedIds.length === 1 ? s.selectedIds[0] : null))
  useEffect(() => {
    if (viewerReady) iframeRef.current?.contentWindow?.postMessage({ type: 'argus:selection', id: selectedId }, window.location.origin)
  }, [selectedId, viewerReady, project])

  return (
    <div className="absolute inset-0 bg-[#0f172a]">
      <iframe
        ref={iframeRef}
        src={VIEWER_URL}
        title="Visualização 3D do projeto"
        className="h-full w-full border-0"
        allow="fullscreen"
      />
      <div className="absolute bottom-3 left-3 hidden sm:block">
        <Button variant="secondary" size="sm" className="shadow-sm" onClick={() => window.open(VIEWER_URL, '_blank', 'noopener')}>
          <ExternalLink size={16} />
          Abrir em nova aba
        </Button>
      </div>
    </div>
  )
}
