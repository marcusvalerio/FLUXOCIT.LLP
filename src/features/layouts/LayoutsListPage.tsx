import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, LayoutGrid, LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import { layoutRepository } from '../../shared/data/repository'
import { isAccountModeEnabled } from '../../shared/data/authMode'
import { useAuthStore } from '../auth/state/useAuthStore'
import { DEFAULT_ENV_HEIGHT_M, DEFAULT_ENV_WIDTH_M } from '../editor/state/useEditorStore'
import { Button } from '../../shared/ui/Button'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { Panel } from '../../shared/ui/Panel'
import { IconButton } from '../../shared/ui/IconButton'
import { ThemeToggle } from '../../shared/ui/ThemeToggle'
import { BrandMark } from '../../shared/ui/BrandMark'
import type { LayoutSummary } from '../../types/layout'

/** Ambiente de projetos — a porta de entrada do app. Abre sem conta e sem sessão: os projetos
 * ficam neste dispositivo (LocalLayoutRepository, via a facade shared/data/repository). */
export function LayoutsListPage() {
  const navigate = useNavigate()
  const accountMode = isAccountModeEnabled()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [layouts, setLayouts] = useState<LayoutSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newWidthM, setNewWidthM] = useState(String(DEFAULT_ENV_WIDTH_M))
  const [newHeightM, setNewHeightM] = useState(String(DEFAULT_ENV_HEIGHT_M))
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setLoadError(null)
    try {
      setLayouts(await layoutRepository.listLayouts())
    } catch {
      setLoadError(
        accountMode
          ? 'Não foi possível carregar seus projetos. Verifique sua conexão e tente novamente.'
          : 'Não foi possível carregar seus projetos neste dispositivo. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleCreate() {
    const name = newName.trim() || 'Novo projeto'
    const widthM = Math.max(1, Number.parseFloat(newWidthM.replace(',', '.')) || DEFAULT_ENV_WIDTH_M)
    const heightM = Math.max(1, Number.parseFloat(newHeightM.replace(',', '.')) || DEFAULT_ENV_HEIGHT_M)
    const layout = await layoutRepository.createLayout({
      name,
      description: newDescription.trim() || undefined,
      widthM,
      heightM,
    })
    navigate(`/editor/${layout.id}`)
  }

  function startRename(layout: LayoutSummary) {
    setRenamingId(layout.id)
    setRenameValue(layout.name)
  }

  async function commitRename(id: string) {
    const name = renameValue.trim()
    setRenamingId(null)
    if (!name) return
    setBusyId(id)
    try {
      await layoutRepository.renameLayout(id, name)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function handleDuplicate(id: string) {
    setBusyId(id)
    try {
      await layoutRepository.duplicateLayout(id)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(null)
    setBusyId(id)
    try {
      await layoutRepository.deleteLayout(id)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 shrink-0 items-center gap-2.5">
            <BrandMark size={26} title={null} className="text-text-primary" />
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold leading-tight text-text-primary">
                ARGUS<span className="text-primary">.LLP</span>
              </h1>
              <p className="hidden text-[11px] leading-tight text-text-secondary sm:block">
                Logistics Planning &amp; Intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {/* Identidade da conta só existe no modo multiusuário — no modo local não há sessão
                para exibir nem de onde sair. Ver shared/data/authMode. */}
            {accountMode && user && (
              <span className="hidden truncate text-xs text-text-secondary sm:inline">{user.email}</span>
            )}
            <ThemeToggle />
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={18} />
              <span className="hidden sm:inline">Novo projeto</span>
            </Button>
            {accountMode && (
              <IconButton label="Sair da conta" onClick={handleLogout}>
                <LogOut size={18} />
              </IconButton>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">Meus projetos</h2>

        {creating && (
          <Panel className="p-4 mb-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">Nome do projeto</label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ex.: CD São Paulo — Galpão 1"
              className="w-full rounded-md border border-border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 mb-3"
            />
            <label className="block text-sm font-medium text-text-secondary mb-2">Descrição (opcional)</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ex.: Layout do galpão principal, turno 1"
              className="w-full rounded-md border border-border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 mb-3"
            />
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Dimensões do ambiente (largura × comprimento, em metros)
            </label>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                inputMode="decimal"
                value={newWidthM}
                onChange={(e) => setNewWidthM(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                aria-label="Largura do ambiente em metros"
                className="w-24 rounded-md border border-border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-text-secondary">m ×</span>
              <input
                type="text"
                inputMode="decimal"
                value={newHeightM}
                onChange={(e) => setNewHeightM(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                aria-label="Comprimento do ambiente em metros"
                className="w-24 rounded-md border border-border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-text-secondary">m</span>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleCreate}>
                Criar
              </Button>
              <Button variant="secondary" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
            </div>
          </Panel>
        )}

        {loadError && (
          <Panel className="p-4 mb-4 border-danger/40">
            <p className="text-sm text-danger mb-3">{loadError}</p>
            <Button variant="secondary" onClick={refresh}>
              Tentar novamente
            </Button>
          </Panel>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/3] rounded-lg bg-surface-alt animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !loadError && layouts.length === 0 && !creating && (
          <Panel className="p-10 flex flex-col items-center text-center gap-3">
            <LayoutGrid size={40} className="text-text-disabled" />
            <p className="text-text-secondary">Nenhum projeto criado ainda.</p>
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={18} />
              Criar novo projeto
            </Button>
          </Panel>
        )}

        {!loading && !loadError && layouts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {layouts.map((layout) => (
              <Panel key={layout.id} className={`p-4 flex flex-col gap-3 ${busyId === layout.id ? 'opacity-60' : ''}`}>
                <button
                  onClick={() => navigate(`/editor/${layout.id}`)}
                  className="text-left flex-1"
                  disabled={busyId === layout.id}
                >
                  <div className="aspect-video rounded-md bg-surface-alt border border-border mb-3 flex items-center justify-center">
                    <LayoutGrid size={28} className="text-text-disabled" />
                  </div>
                  {renamingId === layout.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(layout.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onBlur={() => commitRename(layout.id)}
                      className="w-full rounded border border-primary/50 px-1.5 py-0.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  ) : (
                    <p className="font-medium text-text-primary truncate">{layout.name}</p>
                  )}
                  {layout.description && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{layout.description}</p>
                  )}
                  <p className="text-xs text-text-secondary mt-1">
                    Atualizado em {new Date(layout.updatedAt).toLocaleDateString('pt-BR')}
                  </p>
                </button>
                <div className="flex justify-end gap-1">
                  <IconButton
                    label="Renomear"
                    onClick={(e) => {
                      e.stopPropagation()
                      startRename(layout)
                    }}
                    disabled={busyId === layout.id}
                  >
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton
                    label="Duplicar"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDuplicate(layout.id)
                    }}
                    disabled={busyId === layout.id}
                  >
                    <Copy size={16} />
                  </IconButton>
                  <IconButton
                    label="Excluir projeto"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDeleteId(layout.id)
                    }}
                    disabled={busyId === layout.id}
                  >
                    <Trash2 size={16} className="text-danger" />
                  </IconButton>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </main>

      {pendingDeleteId && (
        <ConfirmDialog
          title="Excluir projeto"
          message="Esta ação não pode ser desfeita. O layout, o fluxo e todas as propriedades deste projeto serão excluídos permanentemente."
          confirmLabel="Excluir"
          onConfirm={() => handleDelete(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  )
}
