import { useEffect, useState } from 'react'
import { Trash2, UserPlus, X } from 'lucide-react'
import { BottomSheet } from '../../shared/ui/BottomSheet'
import { Button } from '../../shared/ui/Button'
import { Panel } from '../../shared/ui/Panel'
import { IconButton } from '../../shared/ui/IconButton'
import { listCollaborators, inviteCollaborator, removeCollaborator, type Collaborator } from '../../shared/data/sharingApi'

interface SharePanelProps {
  projectId: string
  projectName: string
  onClose: () => void
}

const ROLE_LABEL: Record<Collaborator['role'], string> = {
  owner: 'Proprietário',
  editor: 'Editor',
}

/**
 * Body shared by both the mobile (BottomSheet) and desktop (dialog) shells below — see
 * docs/ARCHITECTURE.md § Compartilhamento. Only the owner can reach this component at all (see
 * EditorPage/LayoutsListPage, which gate the "Compartilhar" entry point on `role === 'owner'`),
 * so every action here assumes owner privileges; the Worker still re-checks independently.
 */
function ShareContent({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[] | null>(null)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listCollaborators(projectId)
      .then((list) => {
        if (!cancelled) setCollaborators(list)
      })
      .catch(() => {
        if (!cancelled) setCollaborators([])
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  async function handleInvite() {
    const trimmed = email.trim()
    if (!trimmed) return
    setInviting(true)
    setInviteError(null)
    try {
      const result = await inviteCollaborator(projectId, trimmed)
      if (result.ok) {
        setCollaborators((prev) => [...(prev ?? []), result.member])
        setEmail('')
      } else {
        setInviteError(result.error)
      }
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(userId: string) {
    setRemovingUserId(userId)
    try {
      await removeCollaborator(projectId, userId)
      setCollaborators((prev) => (prev ?? []).filter((m) => m.userId !== userId))
    } finally {
      setRemovingUserId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Projeto</p>
        <p className="font-heading text-base font-semibold text-text-primary truncate">{projectName}</p>
      </div>

      <div>
        <label htmlFor="share-invite-email" className="block text-sm font-medium text-text-secondary mb-2">
          Convidar por e-mail
        </label>
        <div className="flex gap-2">
          <input
            id="share-invite-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            placeholder="nome@empresa.com"
            className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button variant="primary" onClick={handleInvite} disabled={inviting || !email.trim()}>
            <UserPlus size={16} />
            Convidar
          </Button>
        </div>
        {inviteError && <p className="mt-2 text-xs text-danger">{inviteError}</p>}
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-2">Colaboradores</p>
        {collaborators === null && <p className="text-sm text-text-secondary">Carregando…</p>}
        {collaborators !== null && (
          <ul className="space-y-1">
            {collaborators.map((member) => (
              <li key={member.userId} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-surface-alt">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-primary">{member.email}</p>
                  <p className="text-xs text-text-secondary">{ROLE_LABEL[member.role]}</p>
                </div>
                {member.role === 'editor' && (
                  <IconButton
                    label="Remover colaborador"
                    size="sm"
                    disabled={removingUserId === member.userId}
                    onClick={() => handleRemove(member.userId)}
                  >
                    <Trash2 size={16} className="text-danger" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Mobile shell reuses BottomSheet as-is (modal, systemic scroll fix included for free) — desktop
 * gets a small centered dialog matching ConfirmDialog's pattern instead of a full-screen sheet. */
export function SharePanel({ projectId, projectName, onClose }: SharePanelProps) {
  return (
    <>
      <div className="md:hidden">
        <BottomSheet title="Compartilhar projeto" onClose={onClose}>
          <ShareContent projectId={projectId} projectName={projectName} />
        </BottomSheet>
      </div>

      <div
        className="fixed inset-0 z-50 hidden items-center justify-center bg-black/40 p-4 md:flex"
        onClick={onClose}
        role="presentation"
      >
        <Panel className="max-h-[85vh] w-full max-w-md overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-text-primary">Compartilhar projeto</h2>
            <IconButton label="Fechar" size="sm" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </div>
          <ShareContent projectId={projectId} projectName={projectName} />
        </Panel>
      </div>
    </>
  )
}
