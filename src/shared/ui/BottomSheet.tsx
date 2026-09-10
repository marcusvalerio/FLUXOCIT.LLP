import type { PropsWithChildren } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  title: string
  onClose: () => void
  /**
   * When true (default), a full-screen backdrop captures the close tap — used for
   * the object library, which should be modal. The properties sheet passes false so
   * the canvas underneath stays interactive (the user can still drag/select objects
   * while it's open); it's dismissed via the explicit close button or by deselecting
   * on the canvas instead. See docs/UX.md § 2.2.
   *
   * Both variants stop above the fixed bottom action bar (see EditorPage's footer)
   * so its undo/redo/insert controls stay reachable while a sheet is open.
   */
  modal?: boolean
  /**
   * When true, only the drag-handle/title bar renders — the field content is hidden and the
   * sheet's footprint shrinks to a thin strip, so it can never sit on top of the object the
   * user is about to touch. Tapping the bar (not the close button) calls onToggleCollapsed.
   * See docs/UX.md § 2.2 "painel sai do caminho" — the mobile properties-panel touch fix.
   */
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

export function BottomSheet({
  title,
  onClose,
  modal = true,
  collapsed = false,
  onToggleCollapsed,
  children,
}: PropsWithChildren<BottomSheetProps>) {
  return (
    <div
      className={`fixed inset-x-0 top-0 bottom-16 z-30 flex flex-col justify-end md:hidden ${modal ? '' : 'pointer-events-none'}`}
      role="dialog"
      aria-label={title}
    >
      {modal && <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/30 animate-fade-in" />}
      <div className="relative bg-surface rounded-t-xl border-t border-border shadow-lg max-h-full min-h-0 flex flex-col pointer-events-auto animate-sheet-in">
        <div
          role={onToggleCollapsed ? 'button' : undefined}
          tabIndex={onToggleCollapsed ? 0 : undefined}
          onClick={onToggleCollapsed}
          onKeyDown={(e) => {
            if (onToggleCollapsed && (e.key === 'Enter' || e.key === ' ')) onToggleCollapsed()
          }}
          className="flex items-center justify-between px-4 py-3 border-b border-border text-left"
        >
          <div className="mx-auto absolute left-1/2 -translate-x-1/2 -top-2 w-10 h-1 rounded-full bg-border" />
          <h2 className="font-heading text-base font-semibold text-text-primary truncate">{title}</h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="w-9 h-9 shrink-0 flex items-center justify-center text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>
        <div
          className={`min-h-0 flex-1 overflow-hidden p-4 transition-[grid-template-rows,opacity] duration-200 ease-out grid ${
            collapsed ? 'grid-rows-[0fr] opacity-0 !p-0' : 'grid-rows-[1fr] opacity-100'
          }`}
        >
          <div className="min-h-0 min-w-0 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  )
}
