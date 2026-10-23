import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useEditorStore } from '../state/useEditorStore'
import { Button } from '../../../shared/ui/Button'

/** Página estática do visualizador (public/simulations). Fica fora do bundle do app: o editor
 * continua 2D e o Three.js só é carregado quando a aba 3D é aberta. */
const VIEWER_URL = '/simulations/projeto-3d.html'
/** Mesma chave lida pelo visualizador quando aberto em outra aba. */
const STORAGE_KEY = 'argus:3d-project'

/**
 * Aba 3D: visualização somente leitura do projeto aberto (Layout + Fluxo). O projeto é enviado
 * ao iframe por postMessage a cada alteração, então o 3D acompanha o que é editado nas outras
 * abas sem recarregar.
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
      if (e.source === iframeRef.current?.contentWindow && e.data?.type === 'argus:ready') setViewerReady(true)
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
